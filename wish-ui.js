import { blessWish, WISH_MOTIFS } from "./wish-pool.js?v=202609011802";

const LEGACY_KEY = "diary-wishes";
const MAX_WISHES = 30;

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function todayYmd() {
  const n = new Date();
  return n.getFullYear() + "-" + pad2(n.getMonth() + 1) + "-" + pad2(n.getDate());
}

function wishStorageKey() {
  try {
    if (typeof window.chartHasSavedProfile === "function") {
      const prof = window.chartHasSavedProfile();
      if (prof && prof.id) return "diary-wishes:" + prof.id;
    }
  } catch (e) { /* ignore */ }
  return "diary-wishes:default";
}

function loadWishes() {
  migrateLegacyWishes();
  try {
    return JSON.parse(localStorage.getItem(wishStorageKey()) || "[]");
  } catch (e) {
    return [];
  }
}

function saveWishes(arr) {
  localStorage.setItem(wishStorageKey(), JSON.stringify(arr.slice(0, MAX_WISHES)));
}

function migrateLegacyWishes() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    if (!Array.isArray(legacy) || !legacy.length) return;
    const key = wishStorageKey();
    const cur = JSON.parse(localStorage.getItem(key) || "[]");
    if (!cur.length) {
      localStorage.setItem(key, JSON.stringify(legacy.slice(0, MAX_WISHES)));
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch (e) { /* ignore */ }
}

function normalizeDate(raw) {
  return String(raw || "").replace(/\s*投入\s*$/, "").trim();
}

function displayWishDate(raw) {
  const s = normalizeDate(raw);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return (+m[2]) + "月" + (+m[3]) + "日";
  return s;
}

function pickMotif(item) {
  const legacy = {
    tide: "orbit", seed: "spark", dew: "twinkle", mountain: "north",
    wing: "meteor", fire: "wishstar", bridge: "constellation", sprout: "cluster",
    window: "star", letter: "comet", lighthouse: "moonstar", well: "galaxy"
  };
  if (item.motif) return legacy[item.motif] || item.motif;
  const seed = (item.text || "") + "|" + normalizeDate(item.date || item.t || "");
  return WISH_MOTIFS[hashStr(seed) % WISH_MOTIFS.length];
}

function motifSvg(kind) {
  const map = {
    star: '<polygon points="100,28 108,72 154,72 116,98 130,142 100,114 70,142 84,98 46,72 92,72" fill="currentColor" opacity="0.85"/><circle cx="46" cy="40" r="3" fill="currentColor"/><circle cx="160" cy="48" r="2.4" fill="currentColor"/>',
    spark: '<path d="M100 36v40M80 56h40M86 42l28 28M114 42L86 70" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="56" r="6" fill="currentColor"/>',
    constellation: '<circle cx="56" cy="70" r="4" fill="currentColor"/><circle cx="100" cy="48" r="5" fill="currentColor"/><circle cx="148" cy="78" r="4" fill="currentColor"/><circle cx="120" cy="128" r="3.5" fill="currentColor"/><circle cx="70" cy="120" r="3" fill="currentColor"/><path d="M56 70L100 48L148 78L120 128L70 120Z" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.7"/>',
    galaxy: '<ellipse cx="100" cy="100" rx="70" ry="22" fill="none" stroke="currentColor" stroke-width="1.6" transform="rotate(-18 100 100)"/><ellipse cx="100" cy="100" rx="46" ry="14" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.55" transform="rotate(-18 100 100)"/><circle cx="100" cy="100" r="6" fill="currentColor"/><circle cx="54" cy="78" r="2.2" fill="currentColor"/><circle cx="150" cy="118" r="2" fill="currentColor"/>',
    meteor: '<path d="M48 148L132 52" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M78 128L132 52" stroke="currentColor" stroke-width="1.4" opacity="0.45"/><polygon points="132,52 140,68 148,60 138,48" fill="currentColor" opacity="0.85"/>',
    moonstar: '<path d="M98 66a34 34 0 1 0 0 68 26 26 0 0 1 0-68z" fill="currentColor" opacity="0.45"/><polygon points="148,48 151,58 161,58 153,64 156,74 148,68 140,74 143,64 135,58 145,58" fill="currentColor"/>',
    cluster: '<circle cx="100" cy="92" r="5" fill="currentColor"/><circle cx="78" cy="110" r="3.5" fill="currentColor" opacity="0.8"/><circle cx="122" cy="108" r="3.5" fill="currentColor" opacity="0.8"/><circle cx="88" cy="72" r="3" fill="currentColor" opacity="0.7"/><circle cx="116" cy="74" r="3" fill="currentColor" opacity="0.7"/><circle cx="100" cy="124" r="2.6" fill="currentColor" opacity="0.65"/><circle cx="64" cy="88" r="2" fill="currentColor" opacity="0.5"/><circle cx="136" cy="90" r="2" fill="currentColor" opacity="0.5"/>',
    north: '<path d="M100 34v132M70 70l30-20 30 20M76 150h48" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="100" cy="34" r="5" fill="currentColor"/>',
    wishstar: '<polygon points="100,40 108,70 140,70 114,90 124,122 100,104 76,122 86,90 60,70 92,70" fill="currentColor" opacity="0.8"/><circle cx="100" cy="100" r="48" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.35"/><circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" stroke-width="1" opacity="0.18"/>',
    orbit: '<ellipse cx="100" cy="100" rx="64" ry="28" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="100" cy="100" rx="40" ry="16" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.55"/><circle cx="100" cy="100" r="7" fill="currentColor"/><circle cx="164" cy="100" r="4" fill="currentColor"/>',
    twinkle: '<path d="M100 30v28M86 44h28M90 34l20 20M110 34L90 54" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M148 78v16M140 86h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/><path d="M52 96v14M46 103h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/><circle cx="100" cy="120" r="3" fill="currentColor" opacity="0.6"/>',
    comet: '<path d="M40 140c40-20 70-50 100-90" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M52 132c32-14 58-40 84-74" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4"/><circle cx="148" cy="46" r="10" fill="currentColor" opacity="0.85"/><circle cx="148" cy="46" r="4" fill="currentColor"/>'
  };
  const key = map[kind] ? kind : "star";
  return '<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">' + map[key] + "</svg>";
}

function delIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M9 7l.6 12h4.8L15 7M11 11v5M13 11v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function render() {
  const box = document.getElementById("wish-list");
  if (!box) return;
  const arr = loadWishes();
  box.innerHTML = "";
  if (!arr.length) {
    box.innerHTML = '<p class="wish-empty">池面还安静，等你投下第一颗心愿。</p>';
    return;
  }
  arr.forEach(function (item, idx) {
    const motif = pickMotif(item);
    const dateRaw = item.date || item.t || "";
    const art = document.createElement("article");
    art.className = "wish-card";
    art.dataset.idx = String(idx);
    let html = '<div class="wish-card-bg" aria-hidden="true">' + motifSvg(motif) + "</div>";
    html += '<div class="wish-card-body"><div class="wish-card-row">';
    html += '<p class="wish-card-text">' + esc(item.text) + "</p>";
    html += '<button type="button" class="wish-say-btn">我想和你说</button>';
    html += "</div>";
    if (item.reply) {
      html += '<p class="wish-card-reply">' + esc(item.reply) + "</p>";
    }
    html += "</div>";
    html += '<div class="wish-card-foot">';
    html += '<time class="wish-card-date">' + esc(displayWishDate(dateRaw)) + "</time>";
    html += '<button type="button" class="wish-card-del" aria-label="删除">' + delIcon() + "</button>";
    html += "</div>";
    art.innerHTML = html;
    const btn = art.querySelector(".wish-say-btn");
    if (btn) {
      btn.addEventListener("click", function () { onSay(idx, btn); });
    }
    const del = art.querySelector(".wish-card-del");
    if (del) {
      del.addEventListener("click", function () { removeWish(idx); });
    }
    box.appendChild(art);
  });
}

function removeWish(idx) {
  const arr = loadWishes();
  if (idx < 0 || idx >= arr.length) return;
  arr.splice(idx, 1);
  saveWishes(arr);
  render();
}

function onSay(idx, btn) {
  const arr = loadWishes();
  const item = arr[idx];
  if (!item) return;
  btn.disabled = true;
  btn.textContent = "想想…";
  const text = item.text;
  const finish = function (reply) {
    item.reply = reply;
    item.replyVer = 4;
    item.motif = pickMotif(item);
    saveWishes(arr);
    render();
  };
  const runLocal = function () {
    window.setTimeout(function () {
      finish(blessWish(text));
    }, 320);
  };
  if (window.DiaryLLM && typeof window.DiaryLLM.askReply === "function") {
    window.DiaryLLM.askReply("wish", text, blessWish).then(function (out) {
      finish((out && out.reply) || blessWish(text));
    }).catch(runLocal);
  } else {
    runLocal();
  }
}

function addWish(text) {
  text = String(text || "").trim();
  if (!text) return;
  const arr = loadWishes();
  const date = (window.STARS_DATA && window.STARS_DATA.date) || todayYmd();
  const motif = WISH_MOTIFS[hashStr(text + "|" + date) % WISH_MOTIFS.length];
  arr.unshift({ text: text, date: date, motif: motif, reply: "" });
  saveWishes(arr);
  const input = document.getElementById("wish-input");
  if (input) input.value = "";
  render();
}

window.WishUI = { render, addWish };
window.dispatchEvent(new Event("wish-ui-ready"));
if ((location.hash || "#").replace(/^#/, "") === "wish") render();
