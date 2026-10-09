import { replyTree, TREE_MOTIFS } from "./tree-pool.js?v=202609011802";

const LEGACY_KEY = "diary-treehole";
const MAX_ITEMS = 30;

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

function nowStamp() {
  const n = new Date();
  return {
    date: n.getFullYear() + "-" + pad2(n.getMonth() + 1) + "-" + pad2(n.getDate()),
    time: pad2(n.getHours()) + ":" + pad2(n.getMinutes())
  };
}

function treeStorageKey() {
  try {
    if (typeof window.chartHasSavedProfile === "function") {
      const prof = window.chartHasSavedProfile();
      if (prof && prof.id) return "diary-treehole:" + prof.id;
    }
  } catch (e) { /* ignore */ }
  return "diary-treehole:default";
}

function loadTrees() {
  migrateLegacyTrees();
  try {
    return JSON.parse(localStorage.getItem(treeStorageKey()) || "[]");
  } catch (e) {
    return [];
  }
}

function saveTrees(arr) {
  localStorage.setItem(treeStorageKey(), JSON.stringify(arr.slice(0, MAX_ITEMS)));
}

function migrateLegacyTrees() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    if (!Array.isArray(legacy) || !legacy.length) return;
    const key = treeStorageKey();
    const cur = JSON.parse(localStorage.getItem(key) || "[]");
    if (!cur.length) {
      const mapped = legacy.map(function (item) {
        return normalizeLegacyItem(item);
      });
      localStorage.setItem(key, JSON.stringify(mapped.slice(0, MAX_ITEMS)));
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch (e) { /* ignore */ }
}

function normalizeLegacyItem(item) {
  const raw = String(item.t || item.date || "");
  const dm = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  const date = dm ? dm[1] : ((window.STARS_DATA && window.STARS_DATA.date) || nowStamp().date);
  let time = item.time || "";
  if (!time) {
    if (/夜里|夜晚|晚/.test(raw)) time = "21:00";
    else if (/晨|早/.test(raw)) time = "08:00";
    else if (/午/.test(raw)) time = "12:00";
    else time = "20:00";
  }
  return {
    text: item.text || "",
    date: date,
    time: time,
    motif: item.motif || "",
    reply: item.reply || ""
  };
}

function normalizeItem(item) {
  if (!item.date || !item.time) return normalizeLegacyItem(item);
  return item;
}

function displayTreeStamp(item) {
  const n = normalizeItem(item);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(n.date || "");
  const datePart = m ? ((+m[2]) + "月" + (+m[3]) + "日") : (n.date || "");
  const timePart = String(n.time || "").trim();
  return timePart ? (datePart + " " + timePart) : datePart;
}

function pickMotif(item) {
  const legacy = {
    window: "treehole", letter: "bark", lighthouse: "leaf", mountain: "root",
    fire: "moss", bridge: "nest", tide: "dew", star: "galaxy", anchor: "well"
  };
  if (item.motif) return legacy[item.motif] || item.motif;
  const seed = (item.text || "") + "|" + (item.date || "") + "|" + (item.time || "");
  return TREE_MOTIFS[hashStr(seed) % TREE_MOTIFS.length];
}

function motifSvg(kind) {
  // 简洁叶形：尖椭圆 + 主脉 + 侧脉，线面结合
  function leaf(cx, cy, rot, s, fillOp) {
    return '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + rot + ') scale(' + s + ')">' +
      '<path d="M0 52C-20 30-22 6 0-48C22 6 20 30 0 52Z" fill="currentColor" opacity="' + fillOp + '"/>' +
      '<path d="M0 48V-42" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>' +
      '<path d="M0 6C-10-4-12-16-9-26M0 18C10 8 12-4 9-14M0 30C-8 22-9 12-7 4M0 34C8 26 9 16 7 8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.35"/>' +
      '</g>';
  }
  const leaves3 =
    leaf(100, 88, -18, 1.05, 0.28) +
    leaf(62, 108, -48, 0.78, 0.2) +
    leaf(138, 108, 42, 0.78, 0.2);
  const leaves2 =
    leaf(88, 92, -28, 1.0, 0.26) +
    leaf(128, 102, 32, 0.82, 0.18);
  const leavesScatter =
    leaf(70, 78, -40, 0.72, 0.22) +
    leaf(118, 70, 12, 0.92, 0.26) +
    leaf(148, 118, 50, 0.58, 0.16) +
    leaf(92, 128, -15, 0.55, 0.14);
  const map = {
    treehole: leaves3,
    bark: leaves2,
    leaf: leaves3,
    nest: leavesScatter,
    root: leaves2,
    moss: leavesScatter,
    seed: leaves2,
    sprout: leaves3,
    dew: leavesScatter,
    wing: leaves2,
    well: leaves3,
    galaxy: leavesScatter,
    window: null,
    letter: null,
    lighthouse: null,
    mountain: null,
    fire: null,
    bridge: null,
    tide: null,
    star: null,
    anchor: null
  };
  const key = (kind && map[kind] !== null && map[kind] !== undefined) ? kind : "treehole";
  const inner = map[key] || map.treehole;
  return '<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">' + inner + "</svg>";
}

function delIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M9 7l.6 12h4.8L15 7M11 11v5M13 11v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function render() {
  const box = document.getElementById("tree-list");
  if (!box) return;
  const arr = loadTrees();
  box.innerHTML = "";
  if (!arr.length) {
    box.innerHTML = '<p class="wish-empty">树洞还空着，很安全。</p>';
    return;
  }
  arr.forEach(function (item, idx) {
    item = normalizeItem(item);
    const motif = pickMotif(item);
    const art = document.createElement("article");
    art.className = "wish-card tree-card";
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
    html += '<time class="wish-card-date">' + esc(displayTreeStamp(item)) + "</time>";
    html += '<button type="button" class="wish-card-del" aria-label="删除">' + delIcon() + "</button>";
    html += "</div>";
    art.innerHTML = html;
    const btn = art.querySelector(".wish-say-btn");
    if (btn) btn.addEventListener("click", function () { onSay(idx, btn); });
    const del = art.querySelector(".wish-card-del");
    if (del) del.addEventListener("click", function () { removeTree(idx); });
    box.appendChild(art);
  });
}

function removeTree(idx) {
  const arr = loadTrees();
  if (idx < 0 || idx >= arr.length) return;
  arr.splice(idx, 1);
  saveTrees(arr);
  render();
}

function onSay(idx, btn) {
  const arr = loadTrees();
  const item = arr[idx];
  if (!item) return;
  btn.disabled = true;
  btn.textContent = "想想…";
  const text = item.text;
  const finish = function (reply) {
    item.reply = reply;
    item.replyVer = 4;
    item.motif = pickMotif(normalizeItem(item));
    arr[idx] = normalizeItem(item);
    saveTrees(arr);
    render();
  };
  const runLocal = function () {
    window.setTimeout(function () {
      finish(replyTree(text));
    }, 360);
  };
  if (window.DiaryLLM && typeof window.DiaryLLM.askReply === "function") {
    window.DiaryLLM.askReply("tree", text, replyTree).then(function (out) {
      finish((out && out.reply) || replyTree(text));
    }).catch(runLocal);
  } else {
    runLocal();
  }
}

function addTree(text) {
  text = String(text || "").trim();
  if (!text) return;
  const arr = loadTrees();
  const stamp = nowStamp();
  const motif = TREE_MOTIFS[hashStr(text + "|" + stamp.date + "|" + stamp.time) % TREE_MOTIFS.length];
  arr.unshift({ text: text, date: stamp.date, time: stamp.time, motif: motif, reply: "" });
  saveTrees(arr);
  const input = document.getElementById("tree-input");
  if (input) input.value = "";
  render();
}

window.TreeUI = { render, addTree };
window.dispatchEvent(new Event("tree-ui-ready"));
if ((location.hash || "#").replace(/^#/, "") === "tree") render();
