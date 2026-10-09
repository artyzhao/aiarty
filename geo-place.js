/**
 * 地点定位：默认北京；有权限则就近匹配城市，并按当地重算可见星象。
 */
import { CHINA_REGIONS } from "./china-regions.js";
import { PLACES } from "./places-data.js";

export const GEO_STORE_KEY = "diary-geo-place";

export const DEFAULT_PLACE = {
  name: "北京",
  province: "北京",
  country: "中国",
  label: "北京",
  lat: 39.9042,
  lon: 116.4074,
  tz: "Asia/Shanghai",
  source: "default"
};

function haversineKm(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const toR = Math.PI / 180;
  const dLat = (bLat - aLat) * toR;
  const dLon = (bLon - aLon) * toR;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * toR) * Math.cos(bLat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function allCityPoints() {
  const list = [];
  Object.keys(CHINA_REGIONS || {}).forEach(function (prov) {
    const cities = CHINA_REGIONS[prov] || {};
    Object.keys(cities).forEach(function (city) {
      const m = cities[city];
      list.push({
        name: city,
        province: prov,
        country: "中国",
        label: city,
        lat: m.lat,
        lon: m.lon,
        tz: m.tz || "Asia/Shanghai"
      });
    });
  });
  Object.keys(PLACES || {}).forEach(function (country) {
    if (country === "中国") return;
    const cities = PLACES[country] || {};
    Object.keys(cities).forEach(function (city) {
      const m = cities[city];
      list.push({
        name: city,
        province: "",
        country: country,
        label: city,
        lat: m.lat,
        lon: m.lon,
        tz: m.tz || "UTC"
      });
    });
  });
  return list;
}

let CITY_CACHE = null;

export function nearestPlace(lat, lon) {
  if (!CITY_CACHE) CITY_CACHE = allCityPoints();
  let best = null;
  let bestD = Infinity;
  CITY_CACHE.forEach(function (p) {
    const d = haversineKm(lat, lon, p.lat, p.lon);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  });
  if (!best) return { ...DEFAULT_PLACE };
  return {
    ...best,
    lat: best.lat,
    lon: best.lon,
    source: "geo",
    distanceKm: Math.round(bestD)
  };
}

export function loadSavedPlace() {
  try {
    const raw = localStorage.getItem(GEO_STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.lat === "number" && typeof p.lon === "number" && p.name) return p;
  } catch (e) { /* ignore */ }
  return null;
}

export function savePlace(place) {
  try {
    localStorage.setItem(GEO_STORE_KEY, JSON.stringify(place));
  } catch (e) { /* ignore */ }
}

function zonedTimeToUtc(y, mo, d, h, mi, tz) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  let utcMs = Date.UTC(y, mo - 1, d, h, mi, 0);
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(utcMs))
        .filter(function (p) { return p.type !== "literal"; })
        .map(function (p) { return [p.type, p.value]; })
    );
    let hour = +parts.hour;
    if (hour === 24) hour = 0;
    const asUtcMs = Date.UTC(+parts.year, +parts.month - 1, +parts.day, hour, +parts.minute, +parts.second);
    utcMs += Date.UTC(y, mo - 1, d, h, mi, 0) - asUtcMs;
  }
  return new Date(utcMs);
}

function toJulianDay(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let yy = y;
  let mm = m;
  if (mm <= 2) {
    yy -= 1;
    mm += 12;
  }
  const A = Math.floor(yy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + B - 1524.5 + hour / 24;
}

/** Ecliptic lon/lat → altitude & azimuth (deg) for observer. */
export function altAzFromEcliptic(lon, latEcl, jd, obsLat, obsLon) {
  const Deg = Math.PI / 180;
  const eps = (23.439291 - 0.0130042 * ((jd - 2451545) / 36525)) * Deg;
  const lam = lon * Deg;
  const bet = (latEcl || 0) * Deg;
  const sinDec = Math.sin(bet) * Math.cos(eps) + Math.cos(bet) * Math.sin(eps) * Math.sin(lam);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const y = Math.sin(lam) * Math.cos(eps) - Math.tan(bet) * Math.sin(eps);
  const x = Math.cos(lam);
  let ra = Math.atan2(y, x);
  if (ra < 0) ra += 2 * Math.PI;

  const T = (jd - 2451545.0) / 36525;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  gmst = ((gmst % 360) + 360) % 360;
  let lst = ((gmst + obsLon) % 360 + 360) % 360;
  let ha = ((lst - (ra / Deg)) % 360 + 360) % 360;
  if (ha > 180) ha -= 360;
  const haR = ha * Deg;
  const lat = obsLat * Deg;
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(haR);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / Deg;
  const cosAz = (Math.sin(dec) - Math.sin(lat) * Math.sin(alt * Deg)) / (Math.cos(lat) * Math.cos(alt * Deg) + 1e-12);
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) / Deg;
  if (Math.sin(haR) > 0) az = 360 - az;
  return { alt: alt, az: az };
}

function localDateParts(tz) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).filter(function (p) { return p.type !== "literal"; })
      .map(function (p) { return [p.type, p.value]; })
  );
  return { y: +parts.year, mo: +parts.month, d: +parts.day };
}

function sideFromAz(az) {
  if (az >= 45 && az < 135) return "南天";
  if (az >= 135 && az < 225) return "西天";
  if (az >= 225 && az < 315) return "北天";
  return "东天";
}

const NAKED_EYE = ["水星", "金星", "火星", "木星", "土星"];

/**
 * 按观测地重写「行星可见」条目，保留月相/逆行/月食等。
 */
export function localizeAstronomy(starsData, place) {
  const diary = (starsData && starsData.diary) || {};
  const bodies = (starsData && starsData.bodies) || [];
  const base = (diary.astronomy || []).filter(function (ev) { return ev.kind !== "planet"; });
  const p = place || DEFAULT_PLACE;
  const parts = localDateParts(p.tz || "Asia/Shanghai");
  const eve = zonedTimeToUtc(parts.y, parts.mo, parts.d, 21, 0, p.tz || "Asia/Shanghai");
  const dawn = zonedTimeToUtc(parts.y, parts.mo, parts.d, 5, 0, p.tz || "Asia/Shanghai");
  const jdEve = toJulianDay(eve);
  const jdDawn = toJulianDay(dawn);

  const planetEvents = [];
  bodies.forEach(function (b) {
    if (NAKED_EYE.indexOf(b.name) < 0) return;
    const eveH = altAzFromEcliptic(b.lon, 0, jdEve, p.lat, p.lon);
    const dawnH = altAzFromEcliptic(b.lon, 0, jdDawn, p.lat, p.lon);
    if (eveH.alt >= 8) {
      const side = sideFromAz(eveH.az);
      planetEvents.push({
        kind: "planet",
        label: "本地可见",
        title: b.name + side + "可见",
        caption: p.name + "今晚约21时，" + b.name + "在" + side + "，高度约" + Math.round(eveH.alt) + "°。",
        detail: "按" + p.name + "（" + p.lat.toFixed(1) + "°N，" + Math.abs(p.lon).toFixed(1) + "°E）估算，受天气与光害影响。"
      });
    } else if (dawnH.alt >= 8) {
      const side = sideFromAz(dawnH.az);
      planetEvents.push({
        kind: "planet",
        label: "本地可见",
        title: b.name + side + "可见",
        caption: p.name + "黎明前，" + b.name + "在" + side + "，高度约" + Math.round(dawnH.alt) + "°。",
        detail: "按" + p.name + "方位估算，清晨东天寻找更合适。"
      });
    }
  });

  const out = base.map(function (ev) {
    if (ev.kind === "moon") {
      return Object.assign({}, ev, {
        detail: p.name + "一带：" + (ev.detail || "日落后向南天寻找月盘。")
      });
    }
    if (ev.kind === "eclipse") {
      return Object.assign({}, ev, {
        caption: p.name + "可见情况随天气与地平线遮挡而变。",
        detail: (ev.detail || "") + " 观测参考地：" + p.name + "。"
      });
    }
    if (ev.kind === "meteor") {
      return Object.assign({}, ev, {
        caption: (ev.caption || "").replace(/北天|南天/, "当地夜空") + "（" + p.name + "）"
      });
    }
    return ev;
  });

  let insertAt = out.findIndex(function (e) { return e.kind === "moon"; });
  insertAt = insertAt < 0 ? 0 : insertAt + 1;
  out.splice.apply(out, [insertAt, 0].concat(planetEvents));
  return out;
}

function geoPromise(options) {
  return new Promise(function (resolve, reject) {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options || {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 30 * 60 * 1000
    });
  });
}

export async function resolvePlace(forceGeo) {
  const saved = loadSavedPlace();
  try {
    const pos = await geoPromise({
      enableHighAccuracy: false,
      timeout: forceGeo ? 12000 : 8000,
      maximumAge: forceGeo ? 0 : 30 * 60 * 1000
    });
    const place = nearestPlace(pos.coords.latitude, pos.coords.longitude);
    place.source = "geo";
    savePlace(place);
    return place;
  } catch (e) {
    if (saved) return saved;
    savePlace(DEFAULT_PLACE);
    return Object.assign({}, DEFAULT_PLACE);
  }
}

export function bootGeoPlace(opts) {
  const options = opts || {};
  const button = options.button || document.getElementById("place-pin");
  const label = options.label || document.getElementById("place-label");
  const onPlace = options.onPlace || function () {};

  function paint(place) {
    if (label) label.textContent = place.name || "北京";
    if (button) {
      button.title = place.source === "geo"
        ? "已定位 · " + (place.label || place.name) + "（点击重新定位）"
        : "默认北京 · 点击获取定位";
      button.dataset.source = place.source || "default";
    }
    onPlace(place);
  }

  async function run(force) {
    if (button) button.classList.add("is-loading");
    try {
      const place = await resolvePlace(!!force);
      paint(place);
    } finally {
      if (button) button.classList.remove("is-loading");
    }
  }

  if (button) {
    button.addEventListener("click", function () { run(true); });
  }

  const saved = loadSavedPlace() || DEFAULT_PLACE;
  paint(saved);
  run(false);

  window.GeoPlace = {
    DEFAULT_PLACE,
    localizeAstronomy,
    resolvePlace,
    nearestPlace,
    getSaved: loadSavedPlace,
    bootGeoPlace
  };
  window.dispatchEvent(new CustomEvent("geo-place-ready"));
}

function autoBoot() {
  if (!document.getElementById("place-pin")) return;
  bootGeoPlace({
    onPlace: function (place) {
      window.dispatchEvent(new CustomEvent("diary-place", { detail: place }));
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoBoot);
} else {
  autoBoot();
}
