const ACCOUNTS_KEY = "diary-auth-accounts";
const SESSION_KEY = "diary-auth-session";
const CODE_KEY = "diary-auth-sms-code";
const AUTH_GATED = {
  oracle: 1, divination: 1, chart: 1, synastry: 1,
  wish: 1, tree: 1
};

let pendingHash = "";
let loginMode = "code"; // code | password
let setupPhone = "";
let codeTimer = null;
let codeLeft = 0;

function $(id) {
  return document.getElementById(id);
}

/** 登录态版本：仅主动提升时才强制重新登录；与页面缓存 PAGE_VER 无关 */
function authVer() {
  return String(window.DIARY_AUTH_VER || "1");
}

function hashStr(s) {
  let h = 2166136261;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

function hashPass(phone, pass) {
  return hashStr(String(phone) + "|" + String(pass) + "|stars-diary");
}

function loadAccounts() {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch (e) {
    return {};
  }
}

function saveAccounts(map) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(map || {}));
}

function getAccount(phone) {
  return loadAccounts()[phone] || null;
}

function upsertAccount(acc) {
  const map = loadAccounts();
  map[acc.phone] = acc;
  saveAccounts(map);
}

function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!s || !s.phone) return null;
    if (s.authVer != null) {
      if (String(s.authVer) !== authVer()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    }
    // 旧会话曾绑 PAGE_VER：迁移到 AUTH_VER，避免改 UI 反复登出
    s.authVer = authVer();
    delete s.version;
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  } catch (e) {
    return null;
  }
}

function setSession(session) {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else {
    session.authVer = authVer();
    delete session.version;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  syncAuthChrome();
  window.dispatchEvent(new CustomEvent("diary-auth-change", { detail: getUser() }));
}

function getUser() {
  const s = getSession();
  if (!s) return null;
  const acc = getAccount(s.phone);
  return {
    phone: s.phone,
    account: s.phone,
    nickname: (acc && acc.nickname) || s.nickname || "星友",
    loggedAt: s.loggedAt
  };
}

function isLoggedIn() {
  return !!getUser();
}

function isAuthGated(hashName) {
  const name = String(hashName || "").replace(/^#/, "");
  if (AUTH_GATED[name]) return true;
  if (name.indexOf("div-video-") === 0) return true;
  if (name.indexOf("div-card") === 0) return true;
  return false;
}

function maskPhone(phone) {
  const s = String(phone || "");
  if (/^1\d{10}$/.test(s)) return s.slice(0, 3) + "****" + s.slice(7);
  return s;
}

function showError(msg) {
  const err = $("login-error");
  if (!err) return;
  if (!msg) {
    err.hidden = true;
    err.textContent = "";
    return;
  }
  err.hidden = false;
  err.textContent = msg;
}

function showTip(msg) {
  const tip = $("login-tip");
  if (!tip) return;
  if (!msg) {
    tip.hidden = true;
    tip.textContent = "";
    return;
  }
  tip.hidden = false;
  tip.textContent = msg;
}

function syncAuthChrome() {
  const user = getUser();
  const btn = $("auth-entry");
  if (btn) {
    btn.setAttribute("aria-label", user ? "个人中心" : "登录");
    btn.classList.toggle("is-in", !!user);
  }
  const nick = $("profile-nick");
  const account = $("profile-account");
  if (nick) nick.textContent = user ? (user.nickname || "星友") : "";
  if (account) account.textContent = user ? maskPhone(user.phone) : "";
}

function openLogin(nextHash) {
  pendingHash = nextHash ? String(nextHash).replace(/^#/, "") : "";
  showError("");
  showTip("");
  setupPhone = "";
  setLoginStep("auth");
  setLoginMode(loginMode || "code");
  if (location.hash.replace(/^#/, "") === "login") {
    showLoginViewOnly();
    return;
  }
  location.hash = "login";
}

function showLoginViewOnly() {
  document.querySelectorAll(".view").forEach(function (v) { v.hidden = true; });
  const view = $("view-login");
  if (view) view.hidden = false;
  window.scrollTo(0, 0);
  syncAuthChrome();
}

function openProfile() {
  if (!isLoggedIn()) {
    openLogin("");
    return;
  }
  location.hash = "profile";
}

function guardRoute(hashName) {
  const name = String(hashName || "").replace(/^#/, "") || "home";
  if (name === "login") return { ok: true, name: "login" };
  if (name === "profile") {
    if (!isLoggedIn()) {
      openLogin("profile");
      return { ok: false, name: "login" };
    }
    return { ok: true, name: "profile" };
  }
  if (isAuthGated(name) && !isLoggedIn()) {
    openLogin(name);
    return { ok: false, name: "login" };
  }
  return { ok: true, name: name };
}

function finishLogin(phone, nickname) {
  const acc = getAccount(phone);
  setSession({
    phone: phone,
    nickname: nickname || (acc && acc.nickname) || ("星友" + String(phone).slice(-4)),
    loggedAt: Date.now(),
    authVer: authVer()
  });
  const next = pendingHash;
  pendingHash = "";
  setupPhone = "";
  setLoginStep("auth");
  if (next && next !== "login" && next !== "profile") location.hash = next;
  else location.hash = "profile";
}

function setLoginMode(mode) {
  loginMode = mode === "password" ? "password" : "code";
  document.querySelectorAll(".login-tab").forEach(function (tab) {
    tab.classList.toggle("active", tab.getAttribute("data-login-mode") === loginMode);
  });
  const codeBox = $("login-code-fields");
  const passBox = $("login-pass-fields");
  if (codeBox) codeBox.hidden = loginMode !== "code";
  if (passBox) passBox.hidden = loginMode !== "password";
  const submit = $("login-submit");
  if (submit) submit.textContent = loginMode === "code" ? "验证并继续" : "登录";
  showError("");
}

function setLoginStep(step) {
  const authBox = $("login-auth-step");
  const setupBox = $("login-setup-step");
  if (authBox) authBox.hidden = step !== "auth";
  if (setupBox) setupBox.hidden = step !== "setup";
  const title = $("login-view-title");
  if (title) title.textContent = step === "setup" ? "完善资料" : "登录";
}

function validPhone(phone) {
  return /^1\d{10}$/.test(String(phone || "").trim());
}

function readPhone() {
  const el = $("login-phone");
  return el ? el.value.trim() : "";
}

function savePendingCode(phone, code) {
  sessionStorage.setItem(CODE_KEY, JSON.stringify({
    phone: phone,
    code: code,
    exp: Date.now() + 5 * 60 * 1000
  }));
}

function readPendingCode() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(CODE_KEY) || "null");
    if (!raw || !raw.phone || !raw.code) return null;
    if (Date.now() > Number(raw.exp || 0)) {
      sessionStorage.removeItem(CODE_KEY);
      return null;
    }
    return raw;
  } catch (e) {
    return null;
  }
}

function clearPendingCode() {
  sessionStorage.removeItem(CODE_KEY);
}

function updateCodeBtn() {
  const btn = $("login-send-code");
  if (!btn) return;
  if (codeLeft > 0) {
    btn.disabled = true;
    btn.textContent = codeLeft + "s 后重发";
  } else {
    btn.disabled = false;
    btn.textContent = "获取验证码";
  }
}

function startCodeCountdown(sec) {
  codeLeft = sec || 60;
  updateCodeBtn();
  if (codeTimer) clearInterval(codeTimer);
  codeTimer = setInterval(function () {
    codeLeft -= 1;
    if (codeLeft <= 0) {
      clearInterval(codeTimer);
      codeTimer = null;
      codeLeft = 0;
    }
    updateCodeBtn();
  }, 1000);
}

function sendCode() {
  const phone = readPhone();
  if (!validPhone(phone)) {
    showError("请输入正确的 11 位手机号");
    return;
  }
  if (codeLeft > 0) return;
  const code = String(100000 + Math.floor(Math.random() * 900000));
  savePendingCode(phone, code);
  startCodeCountdown(60);
  showError("");
  showTip("演示验证码：" + code + "（5 分钟内有效，正式环境将发短信）");
}

function onAuthSubmit(e) {
  if (e) e.preventDefault();
  const phone = readPhone();
  if (!validPhone(phone)) {
    showError("请输入正确的 11 位手机号");
    return;
  }
  if (loginMode === "password") {
    const passEl = $("login-password");
    const password = passEl ? passEl.value : "";
    if (!password || password.length < 4) {
      showError("请输入至少 4 位密码");
      return;
    }
    const acc = getAccount(phone);
    if (!acc || !acc.passHash) {
      showError("该手机号尚未注册，请先用验证码登录并设置密码");
      return;
    }
    if (acc.passHash !== hashPass(phone, password)) {
      showError("手机号或密码不正确");
      return;
    }
    showError("");
    finishLogin(phone, acc.nickname);
    return;
  }

  const codeEl = $("login-code");
  const code = codeEl ? codeEl.value.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    showError("请输入 6 位验证码");
    return;
  }
  const pending = readPendingCode();
  if (!pending || pending.phone !== phone || pending.code !== code) {
    showError("验证码错误或已过期，请重新获取");
    return;
  }
  clearPendingCode();
  showError("");
  showTip("");
  const acc = getAccount(phone);
  if (acc && acc.passHash) {
    finishLogin(phone, acc.nickname);
    return;
  }
  setupPhone = phone;
  const nickEl = $("setup-nickname");
  const passEl = $("setup-password");
  const pass2El = $("setup-password2");
  if (nickEl) nickEl.value = (acc && acc.nickname) || "";
  if (passEl) passEl.value = "";
  if (pass2El) pass2El.value = "";
  setLoginStep("setup");
}

function onSetupSubmit(e) {
  if (e) e.preventDefault();
  const phone = setupPhone || readPhone();
  if (!validPhone(phone)) {
    showError("手机号无效，请返回重试");
    setLoginStep("auth");
    return;
  }
  const nickEl = $("setup-nickname");
  const passEl = $("setup-password");
  const pass2El = $("setup-password2");
  const nickname = nickEl ? nickEl.value.trim() : "";
  const password = passEl ? passEl.value : "";
  const password2 = pass2El ? pass2El.value : "";
  if (!nickname || nickname.length < 2) {
    showError("请设置至少 2 个字的用户名");
    return;
  }
  if (!password || password.length < 4) {
    showError("密码至少 4 位");
    return;
  }
  if (password !== password2) {
    showError("两次输入的密码不一致");
    return;
  }
  upsertAccount({
    phone: phone,
    nickname: nickname,
    passHash: hashPass(phone, password),
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  showError("");
  finishLogin(phone, nickname);
}

function onLogout() {
  setSession(null);
  location.hash = "home";
}

function bind() {
  syncAuthChrome();
  const entry = $("auth-entry");
  if (entry) {
    entry.addEventListener("click", function () {
      if (isLoggedIn()) openProfile();
      else openLogin("");
    });
  }
  document.querySelectorAll(".login-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      setLoginMode(tab.getAttribute("data-login-mode"));
    });
  });
  const send = $("login-send-code");
  if (send) send.addEventListener("click", sendCode);
  const form = $("login-form");
  if (form) form.addEventListener("submit", onAuthSubmit);
  const setupForm = $("login-setup-form");
  if (setupForm) setupForm.addEventListener("submit", onSetupSubmit);
  const setupBack = $("setup-back");
  if (setupBack) {
    setupBack.addEventListener("click", function () {
      setupPhone = "";
      setLoginStep("auth");
      showError("");
    });
  }
  const logout = $("profile-logout");
  if (logout) logout.addEventListener("click", onLogout);
  const goHome = $("login-cancel");
  if (goHome) {
    goHome.addEventListener("click", function () {
      pendingHash = "";
      location.hash = "home";
    });
  }
  setLoginMode("code");
  setLoginStep("auth");
  updateCodeBtn();
}

window.AuthUI = {
  getUser, isLoggedIn, isAuthGated, guardRoute, openLogin, openProfile,
  syncAuthChrome, bind, authVer
};

bind();
window.dispatchEvent(new Event("auth-ui-ready"));
