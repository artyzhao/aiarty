import { loadStore } from "./natal.js?v=2026082830";
import { computeSynastry, loadCachedSynastry, saveCachedSynastry } from "./synastry.js?v=202609011725";

let leftId = null;
let rightId = null;
let pickMode = "right"; // "right" | "left"
let addingForSynastry = false;

function $(id) { return document.getElementById(id); }

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function formatBirthShort(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return m[1] + "-" + m[2] + "-" + m[3];
}

function placeShort(label) {
  const s = String(label || "");
  const parts = s.split("·");
  if (parts.length >= 3) {
    if (parts[1] === parts[2]) return parts[2];
    return parts[1] + parts[2];
  }
  if (parts.length === 2) return parts[1];
  return s;
}

/** 黄道十二宫符号（按出生日期/星盘太阳） */
const ZODIAC_GLYPH = {
  白羊: "♈", 金牛: "♉", 双子: "♊", 巨蟹: "♋",
  狮子: "♌", 处女: "♍", 天秤: "♎", 天蝎: "♏",
  射手: "♐", 摩羯: "♑", 水瓶: "♒", 双鱼: "♓"
};
// 日期起点：月*100+日，进入该星座的起始日（近似太阳星座）
const ZODIAC_CUTS = [
  [120, "水瓶"], [219, "双鱼"], [321, "白羊"], [420, "金牛"],
  [521, "双子"], [622, "巨蟹"], [723, "狮子"], [823, "处女"],
  [923, "天秤"], [1024, "天蝎"], [1123, "射手"], [1222, "摩羯"]
];

function sunSignFromDate(birthTime) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(birthTime || ""));
  if (!m) return null;
  const md = (+m[2]) * 100 + (+m[3]);
  let sign = "摩羯";
  for (let i = 0; i < ZODIAC_CUTS.length; i++) {
    if (md >= ZODIAC_CUTS[i][0]) sign = ZODIAC_CUTS[i][1];
  }
  return sign;
}

function sunSignOf(profile) {
  const list = profile && profile.chart && profile.chart.placements;
  if (list && list.length) {
    const sun = list.find(function (p) { return p.name === "太阳"; });
    if (sun && sun.sign) return sun.sign;
  }
  return sunSignFromDate(profile && profile.birthTime) || "狮子";
}

function zodiacBgHtml(sign) {
  const g = ZODIAC_GLYPH[sign] || "✦";
  return '<span class="syn-zodiac-bg" aria-hidden="true">' +
    '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
    '<text x="40" y="54" text-anchor="middle" font-size="52" fill="currentColor" ' +
    'font-family="Segoe UI Symbol, Apple Symbols, Noto Sans Symbols, serif">' + g + "</text>" +
    "</svg></span>";
}

function profiles() {
  const store = loadStore();
  return (store.profiles || []).filter(function (p) {
    return p && p.chart && p.chart.placements && p.chart.placements.length;
  });
}

function findProfile(id) {
  return profiles().find(function (p) { return p.id === id; }) || null;
}

function activeProfileId() {
  const store = loadStore();
  if (store.activeId && findProfile(store.activeId)) return store.activeId;
  const list = profiles();
  return list[0] ? list[0].id : null;
}

function renderPersonCard(side, profile) {
  const box = $("syn-" + side);
  if (!box) return;
  if (!profile) {
    box.innerHTML =
      '<button type="button" class="syn-add-slot" data-syn-pick="' + side + '" aria-label="' +
      (side === "left" ? "选择左侧档案" : "选择对方档案") + '">' +
      '<span class="syn-add-plus">+</span><span>选择档案</span></button>';
    const btn = box.querySelector("[data-syn-pick]");
    if (btn) btn.addEventListener("click", function () { openPickSheet(side); });
    return;
  }
  const sign = sunSignOf(profile);
  box.innerHTML =
    '<button type="button" class="syn-person-card" data-syn-side="' + side + '" data-sun-sign="' +
    esc(sign) + '" aria-label="切换' +
    (side === "left" ? "左侧" : "右侧") + '档案">' +
    zodiacBgHtml(sign) +
    '<strong>' + esc(profile.nickname || "未命名") + "</strong>" +
    '<span>' + esc(formatBirthShort(profile.birthTime)) + "</span>" +
    '<span>' + esc(placeShort(profile.birthPlace)) + "</span>" +
    '<em class="syn-switch-hint">点击切换</em>' +
    "</button>";
  const card = box.querySelector(".syn-person-card");
  if (card) {
    card.addEventListener("click", function () { openPickSheet(side); });
  }
}

function openPickSheet(side) {
  pickMode = side || "right";
  const sheet = $("syn-pick-sheet");
  const list = $("syn-pick-list");
  const title = sheet && sheet.querySelector(".lead");
  if (!sheet || !list) return;
  if (title) title.textContent = pickMode === "left" ? "选择左侧档案" : "选择右侧档案";
  const currentId = pickMode === "left" ? leftId : rightId;
  const otherId = pickMode === "left" ? rightId : leftId;
  const items = profiles();
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<p class="wish-empty">还没有档案，请先新增。</p>';
  } else {
    items.forEach(function (p) {
      const row = document.createElement("div");
      row.className = "chart-profile-row";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chart-profile-btn" + (p.id === currentId ? " active" : "");
      let tag = "";
      if (p.id === otherId) tag = " · 将与对侧交换";
      btn.innerHTML = "<strong>" + esc(p.nickname) + "</strong><span>" +
        esc(placeShort(p.birthPlace)) + " · " + esc(formatBirthShort(p.birthTime)) +
        esc(tag) + "</span>";
      btn.addEventListener("click", function () {
        applyPick(p.id);
      });

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "chart-profile-edit";
      edit.textContent = "编辑";
      edit.setAttribute("aria-label", "编辑" + (p.nickname || "档案"));
      edit.addEventListener("click", function (e) {
        e.stopPropagation();
        if (window.ChartModule && window.ChartModule.editProfile) {
          window.ChartModule.editProfile(p.id);
        }
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "chart-profile-del";
      del.textContent = "删除";
      del.setAttribute("aria-label", "删除" + (p.nickname || "档案"));
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        if (window.ChartModule && window.ChartModule.deleteProfile) {
          window.ChartModule.deleteProfile(p.id, { fromSynastry: true });
        }
        openPickSheet(pickMode);
      });

      row.appendChild(btn);
      row.appendChild(edit);
      row.appendChild(del);
      list.appendChild(row);
    });
  }
  sheet.hidden = false;
}

/** 选中档案；若与对侧相同则交换，避免左右同一人 */
function applyPick(id) {
  if (pickMode === "left") {
    if (id === rightId) {
      rightId = leftId;
      leftId = id;
    } else {
      leftId = id;
    }
  } else {
    if (id === leftId) {
      leftId = rightId;
      rightId = id;
    } else {
      rightId = id;
    }
  }
  closePickSheet();
  refresh();
}

function closePickSheet() {
  const sheet = $("syn-pick-sheet");
  if (sheet) sheet.hidden = true;
}

function ringSvg(score) {
  const r = 22, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = (c * pct).toFixed(1);
  const gap = (c - c * pct).toFixed(1);
  return '<svg class="syn-ring" viewBox="0 0 56 56" aria-hidden="true">' +
    '<circle cx="28" cy="28" r="' + r + '" fill="none" stroke="rgba(232,201,138,0.15)" stroke-width="4"/>' +
    '<circle cx="28" cy="28" r="' + r + '" fill="none" stroke="#e8c98a" stroke-width="4" ' +
    'stroke-dasharray="' + dash + ' ' + gap + '" stroke-linecap="round" transform="rotate(-90 28 28)"/>' +
    '<text x="28" y="32" text-anchor="middle" fill="#e8c98a" font-size="14" font-weight="600">' + score + "</text>" +
    "</svg>";
}

function renderReport(result) {
  const box = $("syn-report");
  if (!box) return;
  if (!result) {
    box.innerHTML = '<p class="wish-empty">点击左侧或右侧档案进行选择，双方齐后自动计算合盘。</p>';
    return;
  }

  let html = "";
  html += '<div class="card panel syn-block">';
  html += '<div class="kicker">发展潜力得分</div>';
  html += '<div class="syn-score">' + result.potential + "</div>";
  html += '<div class="syn-bar"><span class="soft" style="width:' + result.softPct + '%"></span>';
  html += '<span class="hard" style="width:' + result.hardPct + '%"></span></div>';
  html += '<div class="syn-bar-labels"><span>' + result.softPct + '% 和谐</span><span>' + result.hardPct + '% 冲突</span></div>';
  html += '<p class="syn-percentile">当前分数超过了 ' + result.percentile + '% 大众关系</p>';
  html += "</div>";

  html += '<div class="card panel syn-block">';
  html += '<div class="kicker">关系总结</div>';
  html += '<p class="syn-quote">「' + esc(result.quote) + "」</p>";
  html += "</div>";

  html += '<div class="card panel syn-block">';
  html += '<div class="kicker">最适合的关系</div>';
  result.relations.forEach(function (r) {
    html += '<div class="syn-rel-row"><div class="syn-rel-top"><strong>' + esc(r.name) +
      "</strong><span>" + r.score + "%</span></div>";
    html += '<div class="syn-rel-track"><i style="width:' + r.score + '%"></i></div></div>';
  });
  html += "</div>";

  html += '<div class="card panel syn-block">';
  html += '<div class="kicker">相处预判</div>';
  result.stages.forEach(function (s) {
    html += '<div class="syn-stage-row">' + ringSvg(s.score) +
      '<div><strong>' + esc(s.name) + "</strong><p>" + esc(s.label) + "</p></div></div>";
  });
  html += "</div>";

  html += '<div class="card panel syn-block">';
  html += '<div class="kicker">关系维度</div>';
  html += '<div class="syn-dims">';
  result.dimensions.forEach(function (d) {
    html += '<div class="syn-dim"><span class="syn-dim-score">' + d.score +
      "</span><strong>" + esc(d.name) + "</strong><span>" + esc(d.label) + "</span></div>";
  });
  html += "</div></div>";

  html += '<div class="card panel syn-block">';
  html += '<div class="kicker">整体关系评价</div>';
  html += '<h4 class="analysis-sub">契合点</h4><ol class="syn-ol">';
  result.fit.forEach(function (t) { html += "<li>" + esc(t) + "</li>"; });
  html += '</ol><h4 class="analysis-sub">矛盾点</h4><ol class="syn-ol">';
  result.conflict.forEach(function (t) { html += "<li>" + esc(t) + "</li>"; });
  html += "</ol></div>";

  html += '<div class="card panel syn-block">';
  html += '<div class="kicker">相处建议</div><ul class="syn-ul">';
  result.advice.forEach(function (t) { html += "<li>" + esc(t) + "</li>"; });
  html += "</ul></div>";

  box.innerHTML = html;
}

function computeAndShow() {
  const a = findProfile(leftId);
  const b = findProfile(rightId);
  if (!a || !b) {
    renderReport(null);
    return;
  }
  const cached = loadCachedSynastry(a.id, b.id);
  if (cached && cached.result) {
    renderReport(cached.result);
    return;
  }
  try {
    const result = computeSynastry(a, b);
    saveCachedSynastry(a.id, b.id, result);
    renderReport(result);
  } catch (err) {
    const box = $("syn-report");
    if (box) box.innerHTML = '<p class="wish-empty">' + esc(err.message || "合盘计算失败") + "</p>";
  }
}

function refresh() {
  renderPersonCard("left", findProfile(leftId));
  renderPersonCard("right", findProfile(rightId));
  const vs = $("syn-vs");
  if (vs) vs.textContent = "VS";
  computeAndShow();
}

function onSynastryRoute() {
  leftId = activeProfileId();
  if (!rightId || rightId === leftId) rightId = null;
  // 若右侧曾选过且仍存在，保留
  if (rightId && !findProfile(rightId)) rightId = null;
  refresh();
}

function openAddFromSynastry() {
  addingForSynastry = true;
  closePickSheet();
  if (window.ChartModule && typeof window.ChartModule.openAddProfileModal === "function") {
    window.ChartModule.openAddProfileModal({ forSynastry: true });
  } else {
    const modal = $("chart-modal");
    if (modal) modal.hidden = false;
  }
}

/** 新增档案成功后，若从合盘进入，填到当前选择侧 */
function onProfileAdded(profile) {
  if (!addingForSynastry || !profile) return;
  addingForSynastry = false;
  applyPick(profile.id);
  if (location.hash.replace(/^#/, "") !== "synastry") {
    location.hash = "synastry";
  }
}

function onProfileDeleted(id) {
  let changed = false;
  if (leftId === id) { leftId = null; changed = true; }
  if (rightId === id) { rightId = null; changed = true; }
  if (changed || (location.hash || "").replace(/^#/, "") === "synastry") refresh();
}

function onProfileUpdated(profile) {
  if (!profile) return;
  if (leftId === profile.id || rightId === profile.id) refresh();
}

function bindSynastryUi() {
  const addTop = $("syn-add");
  if (addTop) addTop.addEventListener("click", openAddFromSynastry);
  const pickAdd = $("syn-pick-add");
  if (pickAdd) pickAdd.addEventListener("click", openAddFromSynastry);
  const pickClose = $("syn-pick-close");
  if (pickClose) pickClose.addEventListener("click", closePickSheet);
  const sheet = $("syn-pick-sheet");
  if (sheet) {
    sheet.addEventListener("click", function (e) {
      if (e.target.id === "syn-pick-sheet") closePickSheet();
    });
  }
}

bindSynastryUi();
window.SynastryUI = {
  onSynastryRoute, onProfileAdded, onProfileDeleted, onProfileUpdated,
  refresh, closePickSheet
};
window.dispatchEvent(new Event("synastry-ui-ready"));
if ((location.hash || "#").replace(/^#/, "") === "synastry") onSynastryRoute();
