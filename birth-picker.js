import {
  bindPickerScroll, fillCol, highlightWheel, readCol, scrollToValue
} from "./picker-common.js";

const BIRTH_MIN_Y = 1920;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function nowParts() {
  const n = new Date();
  return { y: n.getFullYear(), mo: n.getMonth() + 1, d: n.getDate(), h: n.getHours(), mi: n.getMinutes() };
}

function daysInMonth(y, mo) {
  return new Date(y, mo, 0).getDate();
}

function parseISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
}

function clampParts(y, mo, d, h, mi) {
  const max = nowParts();
  y = Math.max(BIRTH_MIN_Y, Math.min(max.y, y));
  mo = Math.max(1, Math.min(12, mo));
  if (y === max.y) mo = Math.min(mo, max.mo);
  const dim = daysInMonth(y, mo);
  d = Math.max(1, Math.min(dim, d));
  if (y === max.y && mo === max.mo) d = Math.min(d, max.d);
  h = Math.max(0, Math.min(23, h));
  if (y === max.y && mo === max.mo && d === max.d) h = Math.min(h, max.h);
  mi = Math.max(0, Math.min(59, mi));
  if (y === max.y && mo === max.mo && d === max.d && h === max.h) mi = Math.min(mi, max.mi);
  return { y, mo, d, h, mi };
}

function partsToISO(p) {
  return p.y + "-" + pad2(p.mo) + "-" + pad2(p.d) + "T" + pad2(p.h) + ":" + pad2(p.mi);
}

function labelFor(part, v) {
  if (part === "year") return v + "年";
  if (part === "month") return v + "月";
  if (part === "day") return v + "日";
  if (part === "hour") return pad2(v) + "时";
  return pad2(v) + "分";
}

function rangeFor(part, p) {
  const max = nowParts();
  if (part === "year") {
    const out = [];
    for (let y = BIRTH_MIN_Y; y <= max.y; y++) out.push(String(y));
    return out;
  }
  if (part === "month") {
    const hi = p.y === max.y ? max.mo : 12;
    const out = [];
    for (let m = 1; m <= hi; m++) out.push(String(m));
    return out;
  }
  if (part === "day") {
    let hi = daysInMonth(p.y, p.mo);
    if (p.y === max.y && p.mo === max.mo) hi = Math.min(hi, max.d);
    const out = [];
    for (let d = 1; d <= hi; d++) out.push(String(d));
    return out;
  }
  if (part === "hour") {
    let hi = 23;
    if (p.y === max.y && p.mo === max.mo && p.d === max.d) hi = max.h;
    const out = [];
    for (let h = 0; h <= hi; h++) out.push(String(h));
    return out;
  }
  let hi = 59;
  if (p.y === max.y && p.mo === max.mo && p.d === max.d && p.h === max.h) hi = max.mi;
  const out = [];
  for (let mi = 0; mi <= hi; mi++) out.push(String(mi));
  return out;
}

function syncHidden(wheel, p) {
  const hidden = wheel.querySelector(".birth-time-value");
  if (hidden) hidden.value = partsToISO(p);
}

function readParts(wheel) {
  const cols = wheel.querySelectorAll(".picker-col");
  const y = +readCol(cols[0]);
  const mo = +readCol(cols[1]);
  const d = +readCol(cols[2]);
  const h = +readCol(cols[3]);
  const mi = +readCol(cols[4]);
  if ([y, mo, d, h, mi].some(function (v) { return Number.isNaN(v); })) return null;
  return clampParts(y, mo, d, h, mi);
}

function rebuild(wheel, p, smooth) {
  const cols = wheel.querySelectorAll(".picker-col");
  const parts = ["year", "month", "day", "hour", "minute"];
  const keys = ["y", "mo", "d", "h", "mi"];
  p = clampParts(p.y, p.mo, p.d, p.h, p.mi);
  parts.forEach(function (part, i) {
    const vals = rangeFor(part, p).map(String);
    const cur = String(p[keys[i]]);
    p[keys[i]] = +fillCol(cols[i], vals, cur, function (v) { return labelFor(part, +v); });
  });
  p = clampParts(p.y, p.mo, p.d, p.h, p.mi);
  syncHidden(wheel, p);
  if (smooth) {
    parts.forEach(function (part, i) {
      scrollToValue(cols[i], String(p[keys[i]]), true);
    });
  }
  highlightWheel(wheel);
  return p;
}

export function initBirthPicker(wheel, iso) {
  if (!wheel || wheel.dataset.ready) return;
  wheel.dataset.ready = "1";
  let p = parseISO(iso) || { y: 1990, mo: 6, d: 15, h: 12, mi: 0 };
  p = clampParts(p.y, p.mo, p.d, p.h, p.mi);
  rebuild(wheel, p, false);
  bindPickerScroll(wheel, function () {
    const cur = readParts(wheel);
    if (!cur) return;
    wheel._parts = rebuild(wheel, cur, true);
  });
  wheel._parts = p;
}

export function getBirthTimeValue(wheel) {
  if (!wheel) return "";
  const p = readParts(wheel) || wheel._parts;
  return p ? partsToISO(p) : "";
}

export function resetBirthPicker(wheel, iso) {
  if (!wheel) return;
  let p = parseISO(iso) || { y: 1990, mo: 6, d: 15, h: 12, mi: 0 };
  p = clampParts(p.y, p.mo, p.d, p.h, p.mi);
  wheel._parts = rebuild(wheel, p, false);
}
