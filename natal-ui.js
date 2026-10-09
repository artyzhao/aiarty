import {
  STORE_KEY, computeChart, formatTzHint, generateAnalysis, initNatal, loadStore, resolvePlace, saveStore, uid
} from "./natal.js?v=202609031627";
import { getBirthTimeValue, initBirthPicker, resetBirthPicker } from "./birth-picker.js?v=2026082725";
import { getPlaceValue, initPlacePicker, resetPlacePicker } from "./place-picker.js?v=2026082829";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function formatBirthTime(iso, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  let s = m[1] + "年" + (+m[2]) + "月" + (+m[3]) + "日 " + m[4] + ":" + m[5];
  if (tz) s += " · " + formatTzHint(tz, iso);
  return s;
}

function updateTzHintForForm(form) {
  if (!form) return;
  const hint = form.querySelector(".chart-tz-hint");
  const placeWheel = form.querySelector("[data-place-picker]");
  const place = getPlaceValue(placeWheel);
  if (!hint) return;
  if (place && place.tz) {
    hint.textContent = "按出生地当地时间填写 · " + formatTzHint(place.tz);
  } else {
    hint.textContent = "按出生地当地时间填写（随地点时区换算）";
  }
}

let store = loadStore();
let computing = false;
let editingId = null;
let pendingEditId = null;

function $(id) { return document.getElementById(id); }

function clearSynastryCacheFor(id) {
  try {
    const sid = String(id || "");
    if (!sid) return;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf("diary-synastry") === 0 && k.indexOf(sid) >= 0) keys.push(k);
    }
    keys.forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) { /* ignore */ }
}

function setSubmitLabel(form, text) {
  const btn = form && form.querySelector("button[type=submit]");
  if (btn) btn.textContent = text || "提交";
}

function findValidProfile(data, id) {
  const profiles = (data && data.profiles) || [];
  if (!profiles.length) return null;
  if (id) {
    const hit = profiles.find(function (x) { return x.id === id; });
    if (hit && hit.chart && hit.chart.placements && hit.chart.placements.length) return hit;
  }
  return profiles.find(function (x) {
    return x.chart && x.chart.placements && x.chart.placements.length;
  }) || null;
}

function hasSavedChart(data) {
  data = data || loadStore();
  store = data;
  return !!findValidProfile(data, data.activeId);
}

function updateChartHeader(hasProfile) {
  const title = $("chart-title");
  const sw = $("chart-switch");
  const addBtn = $("chart-add");
  if (!title) return;
  if (!hasProfile) {
    title.textContent = "星盘";
    if (sw) sw.hidden = true;
    if (addBtn) addBtn.hidden = true;
    return;
  }
  const p = activeProfile();
  title.textContent = p && p.nickname ? p.nickname : "星盘";
  if (sw) sw.hidden = store.profiles.length < 1;
  if (addBtn) addBtn.hidden = false;
}

function showChartLoading(show) {
  const el = $("chart-loading");
  const panel = document.querySelector(".chart-form-panel");
  if (el) el.hidden = !show;
  if (panel) panel.style.pointerEvents = show ? "none" : "";
}

function setChartMode(mode) {
  const view = $("view-chart");
  if (view) view.setAttribute("data-mode", mode);
  const fv = $("chart-form-view");
  const rv = $("chart-result-view");
  if (fv) fv.hidden = mode !== "form";
  if (rv) rv.hidden = mode !== "result";
}

function showForm() {
  editingId = null;
  setChartMode("form");
  showChartLoading(false);
  updateChartHeader(false);
  const form = $("chart-form");
  if (form) setSubmitLabel(form, "提交");
  ["chart-birth-time", "chart-birth-place", "chart-overall", "chart-career", "chart-wealth", "chart-love", "chart-health", "chart-year-transit", "chart-year-firdaria"].forEach(function (id) {
    const el = $(id);
    if (el) el.textContent = "";
  });
  fillKeySigns(null);
}

function showResult() {
  setChartMode("result");
  showChartLoading(false);
  updateChartHeader(true);
}

function activeProfile() {
  const p = findValidProfile(store, store.activeId);
  if (p && p.id !== store.activeId) {
    store.activeId = p.id;
    saveStore(store);
  }
  return p;
}

function renderProfileHeader() {
  updateChartHeader(true);
}

function bodyGlyphSvg(name) {
  const common = ' fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  const map = {
    太阳: '<circle cx="12" cy="12" r="4.2" fill="currentColor" opacity="0.9"/>' +
      '<path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6"' + common + "/>",
    月亮: '<path d="M15.2 4.8A7.6 7.6 0 1 0 19 14.5 6.2 6.2 0 0 1 15.2 4.8z" fill="currentColor" opacity="0.92"/>',
    上升: '<path d="M12 20V7M7 11l5-5 5 5"' + common + "/>" +
      '<path d="M5 20h14"' + common + "/>",
    金星: '<circle cx="12" cy="9" r="4.4"' + common + "/>" +
      '<path d="M12 13.4V20M9.2 17h5.6"' + common + "/>",
    水星: '<circle cx="12" cy="11.5" r="3.8"' + common + "/>" +
      '<path d="M12 15.3V20M9.4 17.8h5.2M8.2 6.2c1.2-2 3-3 3.8-3s2.6 1 3.8 3"' + common + "/>",
    火星: '<circle cx="10.2" cy="13.8" r="4.2"' + common + "/>" +
      '<path d="M13.4 10.6l5.2-5.2M14.8 5.4h3.8V9.2"' + common + "/>",
    木星: '<path d="M7.5 7.2h7.2c2.4 0 4 1.5 4 3.6S17 14.4 14.7 14.4H11M11 5.5v13"' + common + "/>",
    土星: '<path d="M8.2 6.5h8.2M12.3 6.5v8.2c0 2.6 2.2 3.8 4.2 3.8M7.5 17.8h6.5"' + common + "/>"
  };
  const inner = map[name] || ('<circle cx="12" cy="12" r="5"' + common + "/>");
  return '<span class="glyph" aria-hidden="true"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    inner + "</svg></span>";
}

function fillKeySigns(chart) {
  const box = $("chart-sign-grid");
  if (!box) return;
  const order = ["太阳", "月亮", "上升", "金星", "水星", "火星", "木星", "土星"];
  if (!chart) {
    box.innerHTML = "";
    return;
  }
  const byName = {};
  (chart.placements || []).forEach(function (p) {
    if (p && p.name) byName[p.name] = p;
  });
  if (chart.asc) byName["上升"] = chart.asc;
  box.innerHTML = order.map(function (name) {
    const body = byName[name];
    const sign = body && body.sign ? body.sign : "—";
    return '<div class="chart-sign-item">' + bodyGlyphSvg(name) +
      '<span class="body">' + esc(name) + "</span>" +
      '<span class="sign">' + esc(sign) + "</span></div>";
  }).join("");
}

function fillAnalysis(analysis) {
  analysis = analysis || {};
  $("chart-overall").textContent = analysis.overall || "";
  $("chart-career").textContent = analysis.career || "";
  $("chart-wealth").textContent = analysis.wealth || "";
  $("chart-love").textContent = analysis.love || "";
  $("chart-health").textContent = analysis.health || "";
  const transitEl = $("chart-year-transit");
  const firEl = $("chart-year-firdaria");
  if (transitEl) transitEl.textContent = analysis.yearTransit || "";
  if (firEl) firEl.textContent = analysis.yearFirdaria || "";
}

async function renderResult(profile) {
  if (!profile || !profile.chart) return showForm();
  showResult();
  try {
    await initNatal();
    const analysis = generateAnalysis(profile.chart, profile);
    profile.analysis = analysis;
    const hit = store.profiles.find(function (x) { return x.id === profile.id; });
    if (hit) hit.analysis = analysis;
    saveStore(store);
    fillAnalysis(analysis);
  } catch (err) {
    console.error("renderResult analysis", err);
    fillAnalysis(profile.analysis || {});
  }
  const timeEl = $("chart-birth-time");
  const placeEl = $("chart-birth-place");
  if (timeEl) {
    const tz = (profile.chart && profile.chart.tz) || profile.birthTz || "";
    timeEl.textContent = formatBirthTime(profile.birthTime, tz);
  }
  if (placeEl) placeEl.textContent = profile.birthPlace || "";
  fillKeySigns(profile.chart);
}

async function submitProfile(form, isModal) {
  if (computing) return;
  const nickname = form.nickname.value.trim();
  const genderEl = form.querySelector('input[name="gender"]:checked');
  const gender = genderEl ? genderEl.value : "";
  const wheel = form.querySelector("[data-birth-picker]");
  const birthTime = getBirthTimeValue(wheel);
  const placeWheel = form.querySelector("[data-place-picker]");
  const place = getPlaceValue(placeWheel);
  const birthPlace = place ? place.label : "";
  const birthCountry = place ? place.country : "";
  if (!nickname) { alert("请填写昵称"); return; }
  if (!gender) { alert("请选择性别"); return; }
  if (!birthTime) { alert("请选择出生时间"); return; }
  if (!birthPlace) { alert("请选择出生地点"); return; }
  if (!resolvePlace(birthPlace)) {
    alert("出生地点无效，请重新选择国家与城市。");
    return;
  }
  const birthTz = place.tz || (resolvePlace(birthPlace) || {}).tz || "";

  computing = true;
  const btn = form.querySelector("button[type=submit]");
  if (btn) btn.disabled = true;
  if (!isModal) showChartLoading(true);

  try {
    await initNatal();
    const chart = await computeChart({ birthTime, birthPlace });
    const analysis = generateAnalysis(chart, { nickname, gender });
    const forSynastry = !!(openAddProfileModal._opts && openAddProfileModal._opts.forSynastry);
    const prevActive = store.activeId;

    if (editingId && !isModal) {
      const idx = store.profiles.findIndex(function (x) { return x.id === editingId; });
      if (idx < 0) {
        editingId = null;
        throw new Error("要编辑的档案不存在");
      }
      const old = store.profiles[idx];
      const profile = {
        id: old.id,
        nickname: nickname,
        gender: gender,
        birthTime: birthTime,
        birthPlace: birthPlace,
        birthCountry: birthCountry,
        birthTz: chart.tz || birthTz,
        chart: chart,
        analysis: analysis,
        updatedAt: new Date().toISOString()
      };
      store.profiles[idx] = profile;
      store.activeId = profile.id;
      saveStore(store);
      clearSynastryCacheFor(profile.id);
      editingId = null;
      setSubmitLabel(form, "提交");
      if (window.SynastryUI && window.SynastryUI.onProfileUpdated) {
        window.SynastryUI.onProfileUpdated(profile);
      }
      renderResult(profile);
      return;
    }

    const profile = {
      id: uid(), nickname, gender, birthTime, birthPlace, birthCountry,
      birthTz: chart.tz || birthTz,
      chart, analysis, updatedAt: new Date().toISOString()
    };
    store.profiles.unshift(profile);
    if (forSynastry && prevActive) store.activeId = prevActive;
    else store.activeId = profile.id;
    saveStore(store);
    if (isModal) closeModal("chart-modal");
    openAddProfileModal._opts = {};
    if (forSynastry && window.SynastryUI && window.SynastryUI.onProfileAdded) {
      window.SynastryUI.onProfileAdded(profile);
      form.reset();
      const male = form.querySelector('input[name="gender"][value="男"]');
      if (male) male.checked = true;
      resetBirthPicker(wheel);
      resetPlacePicker(placeWheel);
      return;
    }
    renderResult(profile);
    form.reset();
    const male = form.querySelector('input[name="gender"][value="男"]');
    if (male) male.checked = true;
    resetBirthPicker(wheel);
    resetPlacePicker(placeWheel);
  } catch (err) {
    alert(err.message || "计算失败，请稍后重试。");
  } finally {
    computing = false;
    if (!isModal) showChartLoading(false);
    if (btn) btn.disabled = false;
  }
}

function closeModal(id) { $(id).hidden = true; }
function openModal(id) { $(id).hidden = false; }

function deleteProfile(id, opts) {
  opts = opts || {};
  store = loadStore();
  const target = store.profiles.find(function (x) { return x.id === id; });
  if (!target) return false;
  store.profiles = store.profiles.filter(function (x) { return x.id !== id; });
  if (store.activeId === id) {
    store.activeId = store.profiles[0] ? store.profiles[0].id : null;
  }
  if (editingId === id) editingId = null;
  saveStore(store);
  clearSynastryCacheFor(id);
  if (window.SynastryUI && window.SynastryUI.onProfileDeleted) {
    window.SynastryUI.onProfileDeleted(id);
  }
  if (opts.fromSynastry) {
    if (location.hash.replace(/^#/, "") === "chart") {
      if (!store.profiles.length) showForm();
      else renderResult(activeProfile());
    }
    return true;
  }
  if (!store.profiles.length) {
    closeModal("chart-switch-modal");
    showForm();
    if (window.syncChartViewInline) window.syncChartViewInline();
    return true;
  }
  renderSwitchList();
  if (location.hash.replace(/^#/, "") === "chart") {
    renderResult(activeProfile());
  }
  return true;
}

function fillEditForm(profile) {
  if (!profile) return;
  editingId = profile.id;
  const form = $("chart-form");
  if (!form) return;
  initPickersIn(document.getElementById("chart-form-view") || form);
  form.nickname.value = profile.nickname || "";
  const g = form.querySelector('input[name="gender"][value="' + (profile.gender || "男") + '"]');
  if (g) g.checked = true;
  else {
    const male = form.querySelector('input[name="gender"][value="男"]');
    if (male) male.checked = true;
  }
  resetBirthPicker(form.querySelector("[data-birth-picker]"), profile.birthTime);
  resetPlacePicker(form.querySelector("[data-place-picker]"), profile.birthPlace);
  updateTzHintForForm(form);
  setSubmitLabel(form, "保存修改");
  setChartMode("form");
  showChartLoading(false);
  const title = $("chart-title");
  if (title) title.textContent = "编辑 · " + (profile.nickname || "档案");
  const sw = $("chart-switch");
  if (sw) sw.hidden = store.profiles.length < 1;
  const addBtn = $("chart-add");
  if (addBtn) addBtn.hidden = false;
  window.scrollTo(0, 0);
}

function editProfile(id) {
  store = loadStore();
  const profile = store.profiles.find(function (x) { return x.id === id; });
  if (!profile) return;
  closeModal("chart-switch-modal");
  if (window.SynastryUI && window.SynastryUI.closePickSheet) {
    window.SynastryUI.closePickSheet();
  }
  if ((location.hash || "").replace(/^#/, "") !== "chart") {
    pendingEditId = id;
    location.hash = "chart";
    return;
  }
  fillEditForm(profile);
}

function renderSwitchList() {
  const box = $("chart-switch-list");
  box.innerHTML = "";
  store.profiles.forEach(function (p) {
    const row = document.createElement("div");
    row.className = "chart-profile-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chart-profile-btn" + (p.id === store.activeId ? " active" : "");
    btn.innerHTML = "<strong>" + esc(p.nickname) + "</strong><span>" + esc(p.birthPlace) + " · " + esc((p.birthTime || "").replace("T", " ")) + "</span>";
    btn.addEventListener("click", function () {
      store.activeId = p.id;
      saveStore(store);
      closeModal("chart-switch-modal");
      renderResult(activeProfile());
    });

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "chart-profile-edit";
    edit.textContent = "编辑";
    edit.setAttribute("aria-label", "编辑" + (p.nickname || "档案"));
    edit.addEventListener("click", function (e) {
      e.stopPropagation();
      editProfile(p.id);
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "chart-profile-del";
    del.textContent = "删除";
    del.setAttribute("aria-label", "删除" + (p.nickname || "档案"));
    del.addEventListener("click", function (e) {
      e.stopPropagation();
      deleteProfile(p.id);
    });

    row.appendChild(btn);
    row.appendChild(edit);
    row.appendChild(del);
    box.appendChild(row);
  });
}

function onChartRoute() {
  store = loadStore();
  if (pendingEditId) {
    const id = pendingEditId;
    pendingEditId = null;
    const profile = store.profiles.find(function (x) { return x.id === id; });
    if (profile) {
      fillEditForm(profile);
      return;
    }
  }
  if (!hasSavedChart(store)) {
    showForm();
  } else {
    renderResult(activeProfile());
  }
  if (window.syncChartViewInline) window.syncChartViewInline();
  window.scrollTo(0, 0);
}

function syncChartViewEarly() {
  if (!hasSavedChart()) showForm();
  else showResult();
}

function initPickersIn(root) {
  (root || document).querySelectorAll("[data-birth-picker]").forEach(function (wheel) {
    if (!wheel.dataset.ready) initBirthPicker(wheel);
  });
  (root || document).querySelectorAll("[data-place-picker]").forEach(function (wheel) {
    if (!wheel.dataset.ready) initPlacePicker(wheel);
    if (!wheel.dataset.tzBound) {
      wheel.dataset.tzBound = "1";
      wheel.addEventListener("place-change", function () {
        const form = wheel.closest("form");
        updateTzHintForForm(form);
      });
    }
  });
  const form = root && root.closest ? (root.matches && root.matches("form") ? root : root.querySelector("form")) : null;
  if (form) updateTzHintForForm(form);
  else if (root && root.id === "chart-form") updateTzHintForForm(root);
  else if (root) {
    const f = root.querySelector && root.querySelector("form");
    if (f) updateTzHintForForm(f);
  }
}

function openAddProfileModal(opts) {
  editingId = null;
  openAddProfileModal._opts = opts || {};
  const form = $("chart-modal-form");
  if (!form) return;
  form.reset();
  setSubmitLabel(form, "提交");
  const male = form.querySelector('input[name="gender"][value="男"]');
  if (male) male.checked = true;
  resetBirthPicker(form.querySelector("[data-birth-picker]"));
  resetPlacePicker(form.querySelector("[data-place-picker]"));
  updateTzHintForForm(form);
  openModal("chart-modal");
  const nick = form.querySelector("[name=nickname]");
  if (nick) nick.focus();
}

function bindForms() {
  initPickersIn(document.getElementById("chart-form-view") || document.getElementById("chart-form"));
  initPickersIn(document.getElementById("chart-modal-form"));
  updateTzHintForForm($("chart-form"));
  updateTzHintForForm($("chart-modal-form"));
  $("chart-form").addEventListener("submit", function (e) {
    e.preventDefault();
    submitProfile(e.target, false);
  });
  $("chart-modal-form").addEventListener("submit", function (e) {
    e.preventDefault();
    submitProfile(e.target, true);
  });
  $("chart-add").addEventListener("click", openAddProfileModal);
  $("chart-switch").addEventListener("click", function () {
    renderSwitchList();
    openModal("chart-switch-modal");
  });
  $("chart-modal-close").addEventListener("click", function () { closeModal("chart-modal"); });
  $("chart-switch-close").addEventListener("click", function () { closeModal("chart-switch-modal"); });
  $("chart-switch-add").addEventListener("click", function () {
    closeModal("chart-switch-modal");
    openAddProfileModal();
  });
  $("chart-modal").addEventListener("click", function (e) {
    if (e.target.id === "chart-modal") closeModal("chart-modal");
  });
  $("chart-switch-modal").addEventListener("click", function (e) {
    if (e.target.id === "chart-switch-modal") closeModal("chart-switch-modal");
  });
}

try {
  bindForms();
} catch (err) {
  console.error("chart bindForms", err);
}
if (window.syncChartViewInline) window.syncChartViewInline();
else showForm();
initNatal().catch(function () { /* lazy retry on submit */ });
window.ChartModule = {
  onChartRoute, syncChartViewEarly, hasSavedChart, openAddProfileModal,
  deleteProfile, editProfile
};
window.dispatchEvent(new Event("chart-module-ready"));
if ((location.hash || "#").replace(/^#/, "") === "chart") onChartRoute();
