import { PLACES, COUNTRIES } from "./places-data.js";
import { CHINA_PROVINCES, CHINA_REGIONS } from "./china-regions.js";
import {
  bindPickerScroll, fillCol, highlightWheel, readCol, scrollToValue
} from "./picker-common.js";

function citiesFor(country) {
  return Object.keys(PLACES[country] || {}).sort(function (a, b) { return a.localeCompare(b, "zh"); });
}

function citiesForProvince(province) {
  return Object.keys(CHINA_REGIONS[province] || {}).sort(function (a, b) { return a.localeCompare(b, "zh"); });
}

function updatePlaceLayout(wheel, country) {
  const field = wheel.closest(".field");
  const labels = field && field.querySelector(".place-labels");
  const cols = wheel.querySelectorAll(".picker-col");
  const isChina = country === "中国";
  if (cols[2]) cols[2].hidden = !isChina;
  if (labels) {
    labels.classList.toggle("place-labels-cn", isChina);
    const spans = labels.querySelectorAll("span");
    if (spans[0]) spans[0].textContent = "国家";
    if (spans[1]) spans[1].textContent = isChina ? "省份" : "城市";
    if (spans[2]) {
      spans[2].hidden = !isChina;
      spans[2].textContent = "城市";
    }
  }
}

function syncSelection(wheel, country, region, city) {
  const hidden = wheel.querySelector(".place-value");
  let meta = null;
  let label = "";
  if (country === "中国") {
    meta = CHINA_REGIONS[region] && CHINA_REGIONS[region][city];
    label = meta ? "中国·" + region + "·" + city : "";
  } else {
    meta = PLACES[country] && PLACES[country][region];
    label = meta ? country + "·" + region : "";
  }
  if (hidden) hidden.value = label;
  wheel._selection = meta ? {
    country, province: country === "中国" ? region : "", city: country === "中国" ? city : region,
    name: country === "中国" ? city : region, label, ...meta
  } : null;
  try {
    wheel.dispatchEvent(new CustomEvent("place-change", { detail: wheel._selection, bubbles: true }));
  } catch (e) { /* ignore */ }
}

function rebuild(wheel, country, region, city, smooth) {
  const cols = wheel.querySelectorAll(".picker-col");
  const countries = COUNTRIES.slice();
  if (!country || countries.indexOf(country) < 0) country = "中国";
  country = fillCol(cols[0], countries, country);
  updatePlaceLayout(wheel, country);

  if (country === "中国") {
    const provinces = CHINA_PROVINCES.slice();
    if (!region || provinces.indexOf(region) < 0) region = provinces[0];
    region = fillCol(cols[1], provinces, region);
    const cities = citiesForProvince(region);
    if (!city || cities.indexOf(city) < 0) city = cities[0];
    city = fillCol(cols[2], cities, city);
    syncSelection(wheel, country, region, city);
    if (smooth) {
      scrollToValue(cols[0], country, true);
      scrollToValue(cols[1], region, true);
      scrollToValue(cols[2], city, true);
    }
    highlightWheel(wheel);
    return { country, region, city };
  }

  const cities = citiesFor(country);
  if (!region || cities.indexOf(region) < 0) region = cities[0];
  region = fillCol(cols[1], cities, region);
  syncSelection(wheel, country, region, "");
  if (smooth) {
    scrollToValue(cols[0], country, true);
    scrollToValue(cols[1], region, true);
  }
  highlightWheel(wheel);
  return { country, region, city: region };
}

function parsePlaceLabel(label) {
  const raw = String(label || "").trim();
  if (!raw) return null;
  const parts = raw.split("·");
  if (parts.length === 3 && parts[0] === "中国") {
    return { country: "中国", region: parts[1], city: parts[2] };
  }
  if (parts.length >= 2) {
    return { country: parts[0], region: parts.slice(1).join("·"), city: "" };
  }
  for (const country of COUNTRIES) {
    if (country === "中国") {
      for (const prov of CHINA_PROVINCES) {
        const hit = citiesForProvince(prov).find(function (c) { return raw.includes(c); });
        if (hit) return { country: "中国", region: prov, city: hit };
      }
    } else {
      const hit = citiesFor(country).find(function (c) { return raw.includes(c); });
      if (hit) return { country, region: hit, city: "" };
    }
  }
  return null;
}

export function initPlacePicker(wheel, label) {
  if (!wheel || wheel.dataset.ready) return;
  wheel.dataset.ready = "1";
  let country = "中国";
  let region = "广东";
  let city = "广州";
  const parsed = parsePlaceLabel(label);
  if (parsed) {
    country = parsed.country;
    if (country === "中国") {
      region = parsed.region || "广东";
      city = parsed.city || citiesForProvince(region)[0];
    } else {
      region = parsed.region || citiesFor(country)[0];
    }
  }
  rebuild(wheel, country, region, city, false);
  bindPickerScroll(wheel, function () {
    const cols = wheel.querySelectorAll(".picker-col");
    const c = readCol(cols[0]);
    if (!c) return;
    if (c === "中国") {
      const prov = readCol(cols[1]);
      const ci = readCol(cols[2]);
      rebuild(wheel, c, prov, ci, true);
    } else {
      const ci = readCol(cols[1]);
      rebuild(wheel, c, ci, "", true);
    }
  });
}

export function getPlaceValue(wheel) {
  if (!wheel) return null;
  const cols = wheel.querySelectorAll(".picker-col");
  const country = readCol(cols[0]);
  if (!country) return wheel._selection || null;
  if (country === "中国") {
    const region = readCol(cols[1]);
    const city = readCol(cols[2]);
    const meta = CHINA_REGIONS[region] && CHINA_REGIONS[region][city];
    if (!meta) return wheel._selection || null;
    return {
      country, province: region, city, name: city,
      label: "中国·" + region + "·" + city, ...meta
    };
  }
  const city = readCol(cols[1]);
  const meta = PLACES[country] && PLACES[country][city];
  if (!meta) return wheel._selection || null;
  return { country, city, name: city, label: country + "·" + city, ...meta };
}

export function resetPlacePicker(wheel, label) {
  if (!wheel) return;
  let country = "中国";
  let region = "广东";
  let city = "广州";
  const parsed = parsePlaceLabel(label);
  if (parsed) {
    country = parsed.country;
    if (country === "中国") {
      region = parsed.region || "广东";
      city = parsed.city || citiesForProvince(region)[0];
    } else {
      region = parsed.region || citiesFor(country)[0];
    }
  }
  rebuild(wheel, country, region, city, false);
}

export { parsePlaceLabel };
