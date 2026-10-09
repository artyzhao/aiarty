/**
 * 本命盘计算（Placidus 分宫）与解读 — 浏览器端 Swiss Ephemeris WASM
 */
import { SwissEphemeris, Planet, HouseSystem } from "./vendor/swisseph/swisseph-browser.js?v=2026082717";
import { PLACES, COUNTRIES } from "./places-data.js";
import { CHINA_REGIONS } from "./china-regions.js";
import { parsePlaceLabel } from "./place-picker.js";

const swe = new SwissEphemeris();
let initPromise = null;

export const STORE_KEY = "diary-natal-profiles";

export const ZODIAC = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];

const PLANET_ZH = {
  Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星",
  Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星",
  Asc: "上升"
};

const PLANET_ENUM = [
  ["太阳", Planet.Sun], ["月亮", Planet.Moon], ["水星", Planet.Mercury], ["金星", Planet.Venus],
  ["火星", Planet.Mars], ["木星", Planet.Jupiter], ["土星", Planet.Saturn],
  ["天王星", Planet.Uranus], ["海王星", Planet.Neptune], ["冥王星", Planet.Pluto]
];

const ASPECT_DEFS = [
  { angle: 0, name: "合相", orb: 8, nature: "融合" },
  { angle: 60, name: "六分相", orb: 4, nature: "顺畅" },
  { angle: 90, name: "刑相", orb: 6, nature: "张力" },
  { angle: 120, name: "拱相", orb: 6, nature: "和谐" },
  { angle: 180, name: "冲相", orb: 8, nature: "对峙" }
];

const SIGN_RULER = {
  白羊: "火星", 金牛: "金星", 双子: "水星", 巨蟹: "月亮", 狮子: "太阳", 处女: "水星",
  天秤: "金星", 天蝎: "火星", 射手: "木星", 摩羯: "土星", 水瓶: "土星", 双鱼: "木星"
};

const SIGN_MOOD = {
  白羊: "主动果断", 金牛: "稳健务实", 双子: "灵活善言", 巨蟹: "细腻顾家", 狮子: "自信外放", 处女: "细致严谨",
  天秤: "讲究和谐", 天蝎: "深沉专注", 射手: "开阔乐观", 摩羯: "务实克制", 水瓶: "独立创新", 双鱼: "温柔感性"
};

const HOUSE_TOPIC = {
  1: "自我气质", 2: "财富资源", 3: "学习沟通", 4: "家庭根基", 5: "恋爱创造", 6: "工作健康",
  7: "伴侣合作", 8: "共享资源", 9: "远行信念", 10: "事业声望", 11: "社群愿景", 12: "内在修复"
};

const HOUSE_CAREER = {
  6: "日常职场节律与技能打磨", 10: "公开成就与社会角色"
};
const HOUSE_WEALTH = {
  2: "个人收入与理财底盘", 8: "共同财务、投资与资源交换"
};
const HOUSE_HEALTH = {
  6: "作息、消化与劳损相关的日常身体维护",
  12: "睡眠、免疫与情绪积压后的恢复"
};
const PLANET_HINT = {
  太阳: "意志与核心目标", 月亮: "情绪安全感", 水星: "思考与表达", 金星: "喜好与关系价值",
  火星: "行动与消耗方式", 木星: "扩张与机遇", 土星: "责任与长期结构"
};

/** 法达主限：日生 / 夜生序列与年数（交点放在周期末，与常见算法一致） */
const FIRDARIA_DAY = [
  ["太阳", 10], ["金星", 8], ["水星", 13], ["月亮", 9], ["土星", 11],
  ["木星", 12], ["火星", 7], ["北交", 3], ["南交", 2]
];
const FIRDARIA_NIGHT = [
  ["月亮", 9], ["土星", 11], ["木星", 12], ["火星", 7],
  ["太阳", 10], ["金星", 8], ["水星", 13], ["北交", 3], ["南交", 2]
];
/** 次限用迦勒底序（七颗古典行星），自当前主限星起，主限年数七等分 */
const FIRDARIA_CHALDEAN = ["土星", "木星", "火星", "太阳", "金星", "水星", "月亮"];
const FIRDARIA_THEME = {
  太阳: "更想被看见、把事情做成，适合亮成绩",
  月亮: "更在意心情和家里是否安稳，宜先照顾自己",
  水星: "脑子忙、话也多，适合学习、沟通和谈事",
  金星: "对人缘和花钱更敏感，感情与合作机会较多",
  火星: "想动手、也容易急，适合开新事但别硬刚",
  木星: "路变宽、易遇贵人，适合试新方向",
  土星: "要扛责任、打地基，慢一点反而稳",
  北交: "常遇到“往哪走”的选择题，宜顺着成长迈一步",
  南交: "适合收尾和放下旧习惯，把力气收回现在"
};

/** @deprecated use PLACES from places-data.js */
export const CITIES = PLACES["中国"] || {};

export function initNatal() {
  if (!initPromise) initPromise = swe.init();
  return initPromise;
}

function norm360(x) {
  x = x % 360;
  return x < 0 ? x + 360 : x;
}

function angSep(a, b) {
  const d = Math.abs(norm360(a) - norm360(b));
  return Math.min(d, 360 - d);
}

export function signOf(lon) {
  const z = Math.floor(norm360(lon) / 30) % 12;
  return { sign: ZODIAC[z], deg: norm360(lon) % 30 };
}

/** 可读的时区说明，供表单提示与结果页展示 */
export function formatTzHint(tz, sampleIso) {
  const id = tz || "UTC";
  const sample = sampleIso ? new Date(sampleIso) : new Date();
  let offset = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: id,
      timeZoneName: "shortOffset",
      hour: "2-digit"
    }).formatToParts(isNaN(sample.getTime()) ? new Date() : sample);
    const hit = parts.find(function (p) { return p.type === "timeZoneName"; });
    if (hit && hit.value) offset = hit.value.replace("GMT", "UTC");
  } catch (e) { /* ignore */ }
  const alias = {
    "Asia/Shanghai": "北京时间",
    "Asia/Urumqi": "乌鲁木齐时间",
    "Asia/Hong_Kong": "香港时间",
    "Asia/Macau": "澳门时间",
    "Asia/Taipei": "台北时间",
    "Asia/Tokyo": "东京时间",
    "America/New_York": "纽约时间",
    "America/Los_Angeles": "洛杉矶时间",
    "Europe/London": "伦敦时间",
    "Europe/Paris": "巴黎时间",
    "Australia/Sydney": "悉尼时间"
  };
  const name = alias[id] || id;
  return offset ? (name + "（" + offset + "）") : name;
}

/**
 * Convert civil wall time in the birth-place timezone `tz` to a UTC Date.
 * 档案里的出生时间是「出生地当地钟点」，必须用该地点的 IANA tz（如 Asia/Shanghai、
 * Asia/Urumqi、America/New_York）换算成 UTC，再交给星历；勿用浏览器用机时区。
 */
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
  // Iterate: guess UTC, see what wall clock that is in tz, nudge until it matches.
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
    const desiredMs = Date.UTC(y, mo - 1, d, h, mi, 0);
    utcMs += desiredMs - asUtcMs;
  }
  return new Date(utcMs);
}

export function resolvePlace(name) {
  const raw = String(name || "").trim();
  if (!raw) return null;
  const parsed = parsePlaceLabel(raw);
  if (parsed) {
    if (parsed.country === "中国" && parsed.region && parsed.city) {
      const meta = CHINA_REGIONS[parsed.region] && CHINA_REGIONS[parsed.region][parsed.city];
      if (meta) {
        return {
          country: "中国",
          province: parsed.region,
          name: parsed.city,
          label: "中国·" + parsed.region + "·" + parsed.city,
          ...meta
        };
      }
    }
    const cityKey = parsed.city || parsed.region;
    const meta = PLACES[parsed.country] && PLACES[parsed.country][cityKey];
    if (meta) {
      return {
        country: parsed.country,
        name: cityKey,
        label: parsed.country + "·" + cityKey,
        ...meta
      };
    }
  }
  for (const country of COUNTRIES) {
    const cities = PLACES[country] || {};
    if (cities[raw]) {
      return { country, name: raw, label: country + "·" + raw, ...cities[raw] };
    }
    const key = Object.keys(cities).find(function (k) { return raw.includes(k) || k.includes(raw); });
    if (key) return { country, name: key, label: country + "·" + key, ...cities[key] };
  }
  return null;
}

function getHouse(lon, cusps) {
  lon = norm360(lon);
  for (let h = 1; h <= 12; h++) {
    const start = norm360(cusps[h]);
    const end = norm360(cusps[h === 12 ? 1 : h + 1]);
    if (start <= end) {
      if (lon >= start && lon < end) return h;
    } else if (lon >= start || lon < end) return h;
  }
  return 1;
}

function collectAspects(lons) {
  const names = Object.keys(lons);
  const found = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j];
      const sep = angSep(lons[a], lons[b]);
      let best = null;
      ASPECT_DEFS.forEach(function (asp) {
        const delta = Math.abs(sep - asp.angle);
        if (delta <= asp.orb && (!best || delta < best.orbUsed)) {
          best = {
            a, b, aspect: asp.name, nature: asp.nature,
            sep: Math.round(sep * 10) / 10, orbUsed: Math.round(delta * 10) / 10,
            influence: aspectText(a, b, asp.name, asp.nature)
          };
        }
      });
      if (best) found.push(best);
    }
  }
  found.sort(function (x, y) { return x.orbUsed - y.orbUsed; });
  return found;
}

function aspectText(a, b, aspect, nature) {
  const specials = {
    "太阳|月亮|合相": "日月同度，内外一致，生命力与感受同步。",
    "太阳|月亮|冲相": "日月对冲，理性与情绪需互相看见，避免内耗。",
    "太阳|金星|合相": "魅力与自信同频，人缘与审美俱佳。",
    "月亮|金星|合相": "情感细腻，渴望被温柔对待。",
    "金星|火星|合相": "感情与行动同热，吸引力强。",
    "金星|土星|刑相": "感情里易感到责任或距离，宜慢热建立信任。",
    "太阳|土星|合相": "责任感强，对自己要求高，成就来自耐力。",
    "木星|土星|合相": "扩张与收缩并存，宜在规矩里找成长空间。"
  };
  const k = a + "|" + b + "|" + aspect;
  const k2 = b + "|" + a + "|" + aspect;
  if (specials[k]) return specials[k];
  if (specials[k2]) return specials[k2];
  if (nature === "融合") return a + "合" + b + "，两股能量叠在一起，主题被放大。";
  if (nature === "顺畅" || nature === "和谐") return a + "与" + b + aspect + "，能量流通，宜顺势合作。";
  if (nature === "张力") return a + "与" + b + "形成张力，逼你调整节奏与边界。";
  if (nature === "对峙") return a + "与" + b + "形成对冲，需在两端之间找平衡点。";
  return a + "与" + b + aspect + "，值得留意的相位组合。";
}

function houseRulers(cusps) {
  const rulers = [];
  for (let h = 1; h <= 12; h++) {
    const sign = signOf(cusps[h]).sign;
    rulers.push({ house: h, sign: sign, ruler: SIGN_RULER[sign], topic: HOUSE_TOPIC[h] });
  }
  return rulers;
}

function bodyLabel(sign, deg) {
  return sign + "座" + Math.round(deg) + "°";
}

export async function computeChart(input) {
  await initNatal();
  const place = resolvePlace(input.birthPlace);
  if (!place) throw new Error("请选择出生地点的国家与城市。");

  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(input.birthTime || "");
  if (!m) throw new Error("出生时间格式不正确。");

  // 出生时间 ↔ 出生地时区：墙钟时间按 place.tz 解释
  const tz = place.tz || "UTC";
  const utc = zonedTimeToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], tz);
  const jd = swe.dateToJulianDay(utc);
  const houses = swe.calculateHouses(jd, place.lat, place.lon, HouseSystem.Placidus);

  const placements = [];
  const lons = {};

  PLANET_ENUM.forEach(function ([zh, id]) {
    const pos = swe.calculatePosition(jd, id);
    const lon = norm360(pos.longitude);
    const sg = signOf(lon);
    const house = getHouse(lon, houses.cusps);
    const item = {
      name: zh, lon: Math.round(lon * 100) / 100, sign: sg.sign, deg: Math.round(sg.deg * 10) / 10,
      label: bodyLabel(sg.sign, sg.deg), house: house
    };
    placements.push(item);
    lons[zh] = lon;
  });

  const ascLon = norm360(houses.ascendant);
  const ascSg = signOf(ascLon);
  const asc = {
    name: "上升", lon: Math.round(ascLon * 100) / 100, sign: ascSg.sign,
    deg: Math.round(ascSg.deg * 10) / 10, label: bodyLabel(ascSg.sign, ascSg.deg), house: 1
  };
  lons["上升"] = ascLon;

  const mcLon = norm360(houses.mc);
  const mcSg = signOf(mcLon);

  const aspects = collectAspects(lons);
  const rulers = houseRulers(houses.cusps);

  const housePlanets = {};
  for (let h = 1; h <= 12; h++) housePlanets[h] = [];
  placements.forEach(function (p) {
    if (["太阳", "月亮", "金星", "水星", "火星", "木星", "土星"].indexOf(p.name) >= 0) {
      housePlanets[p.house].push(p.name);
    }
  });

  return {
    birthUTC: utc.toISOString(),
    place: place.name,
    lat: place.lat,
    lon: place.lon,
    tz: tz,
    asc, mc: { sign: mcSg.sign, label: bodyLabel(mcSg.sign, mcSg.deg), lon: mcLon },
    placements,
    cusps: houses.cusps.slice(1, 13).map(function (c, i) {
      const sg = signOf(c);
      return { house: i + 1, lon: Math.round(norm360(c) * 100) / 100, sign: sg.sign, label: bodyLabel(sg.sign, sg.deg) };
    }),
    rulers,
    aspects,
    housePlanets,
    lons
  };
}

function findBody(chart, name) {
  if (name === "上升") return chart.asc;
  return chart.placements.find(function (p) { return p.name === name; });
}

function bodiesInHouse(chart, house) {
  return (chart.housePlanets[house] || []).slice();
}

function joinNames(arr) {
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + "和" + arr[1];
  return arr.slice(0, -1).join("、") + "和" + arr[arr.length - 1];
}

/** 同宫多星：一句人话，避免套话重复 */
function describeHouseCluster(chart, house, plainTopic) {
  const names = bodiesInHouse(chart, house);
  if (!names.length) return "";
  if (names.length === 1) {
    return names[0] + "落在第" + house + "宫，" + plainTopic + "会经常被点到。";
  }
  return joinNames(names) + "都在第" + house + "宫，说明这段时间你在「" + plainTopic + "」上会投入更多。";
}

function clipText(s, maxLen) {
  s = String(s || "").trim();
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  const marks = ["。", "！", "？", "；", "，"];
  let best = -1;
  marks.forEach(function (m) {
    const i = cut.lastIndexOf(m);
    if (i > best && i >= 80) best = i;
  });
  if (best >= 80) return s.slice(0, best + 1);
  return cut.replace(/[，、；：]?$/, "") + "。";
}

/**
 * 日生 / 夜生：太阳是否在地平线之上。
 * 以上升点起算，沿黄道 0°–180° 为地下（夜），180°–360° 为地上（日）；
 * 比单靠宫位编号更稳（避免落在宫头附近判错）。
 */
function isDayChart(chart) {
  const sun = findBody(chart, "太阳");
  if (!sun) return true;
  if (chart.asc && chart.asc.lon != null && sun.lon != null) {
    const fromAsc = (sun.lon - chart.asc.lon + 360) % 360;
    return fromAsc >= 180;
  }
  // 兜底：Placidus 下 7–12 宫为地上
  return sun.house >= 7;
}

function yearsBetween(fromDate, toDate) {
  return (toDate.getTime() - fromDate.getTime()) / (365.2425 * 24 * 3600 * 1000);
}

/**
 * 法达：主限按日/夜序列；次限为古典七等分，自主限星起沿迦勒底序。
 * （交点作主限时，次限从土星起排七星。）
 */
function firdariaAtAge(ageYears, isDay) {
  const seq = isDay ? FIRDARIA_DAY : FIRDARIA_NIGHT;
  const cycle = seq.reduce(function (s, x) { return s + x[1]; }, 0);
  let age = ageYears % cycle;
  if (age < 0) age = 0;

  let majorStart = 0;
  let majorIdx = 0;
  for (let i = 0; i < seq.length; i++) {
    const len = seq[i][1];
    if (age < majorStart + len) {
      majorIdx = i;
      break;
    }
    majorStart += len;
  }
  const major = seq[majorIdx];
  const intoMajor = age - majorStart;
  const majorRemain = major[1] - intoMajor;

  const startName = FIRDARIA_CHALDEAN.indexOf(major[0]) >= 0 ? major[0] : "土星";
  const startIdx = FIRDARIA_CHALDEAN.indexOf(startName);
  const minorOrder = [];
  for (let k = 0; k < 7; k++) {
    minorOrder.push(FIRDARIA_CHALDEAN[(startIdx + k) % 7]);
  }
  const span = major[1] / 7;
  let minorName = minorOrder[0];
  let minorRemain = span;
  for (let k = 0; k < 7; k++) {
    if (intoMajor < (k + 1) * span) {
      minorName = minorOrder[k];
      minorRemain = (k + 1) * span - intoMajor;
      break;
    }
  }

  return {
    major: major[0],
    minor: minorName,
    majorRemainYears: Math.max(0, majorRemain),
    minorRemainYears: Math.max(0, minorRemain),
    intoMajorYears: intoMajor
  };
}

function firdariaNextYear(birthDate, now, isDay) {
  const ageNow = yearsBetween(birthDate, now);
  const ageNext = ageNow + 1;
  const cur = firdariaAtAge(ageNow, isDay);
  const samples = [];
  for (let m = 0; m <= 12; m++) {
    samples.push(firdariaAtAge(ageNow + m / 12, isDay));
  }
  let switchNote = "";
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].major !== samples[0].major) {
      switchNote = "大概" + i + "个月后，主限会换成" + samples[i].major + "，整段感觉会变一变。";
      break;
    }
    if (!switchNote && samples[i].minor !== samples[0].minor) {
      switchNote = "这一年里，次限会从" + samples[0].minor + "换成" + samples[i].minor + "，小事上的重点也会跟着换。";
    }
  }
  const end = firdariaAtAge(ageNext, isDay);
  return { current: cur, end: end, switchNote: switchNote, isDay: isDay };
}

function transitSnapshot(jd, natalLons, natalCusps) {
  const jup = swe.calculatePosition(jd, Planet.Jupiter);
  const sat = swe.calculatePosition(jd, Planet.Saturn);
  const mar = swe.calculatePosition(jd, Planet.Mars);
  const hits = [];
  const jHouse = getHouse(jup.longitude, natalCusps);
  const sHouse = getHouse(sat.longitude, natalCusps);
  hits.push("木星行经本命第" + jHouse + "宫（" + HOUSE_TOPIC[jHouse] + "）");
  hits.push("土星行经本命第" + sHouse + "宫（" + HOUSE_TOPIC[sHouse] + "）");

  ["太阳", "月亮", "上升", "金星", "火星"].forEach(function (key) {
    if (natalLons[key] == null) return;
    const jSep = angSep(jup.longitude, natalLons[key]);
    const sSep = angSep(sat.longitude, natalLons[key]);
    const mSep = angSep(mar.longitude, natalLons[key]);
    if (jSep <= 6) hits.push("木星靠近本命" + key + "，这边更容易有机会");
    else if (Math.abs(jSep - 120) <= 5) hits.push("木星拱本命" + key + "，推进会顺一些");
    if (sSep <= 5) hits.push("土星压在本命" + key + "上，宜把规矩立清楚");
    else if (Math.abs(sSep - 90) <= 4 || Math.abs(sSep - 180) <= 5) {
      hits.push("土星挑战本命" + key + "，压力大但也在逼你长大");
    }
    if (mSep <= 4) hits.push("火星点燃本命" + key + "，想动手，也容易急");
  });
  return hits.slice(0, 4);
}

function yearOutlook(chart, birthUTC) {
  const baseJd = swe.dateToJulianDay(new Date());
  const cusps = [0];
  chart.cusps.forEach(function (c) { cusps.push(c.lon); });
  const quarters = [];
  const labels = ["今起约一季内", "第二季", "第三季", "第四季"];
  for (let q = 0; q < 4; q++) {
    const jd = baseJd + (q + 0.5) * 91.25;
    const hits = transitSnapshot(jd, chart.lons, cusps);
    quarters.push({ label: labels[q], hits: hits });
  }
  const jupNow = swe.calculatePosition(baseJd, Planet.Jupiter);
  const satNow = swe.calculatePosition(baseJd, Planet.Saturn);
  const jHouse = getHouse(jupNow.longitude, cusps);
  const sHouse = getHouse(satNow.longitude, cusps);

  const birth = birthUTC ? new Date(birthUTC) : new Date();
  const fir = firdariaNextYear(birth, new Date(), isDayChart(chart));
  return { quarters, jupiterHouse: jHouse, saturnHouse: sHouse, firdaria: fir };
}

const SIGN_EXALT = {
  白羊: "太阳", 金牛: "月亮", 巨蟹: "木星", 处女: "水星",
  天秤: "土星", 摩羯: "火星", 双鱼: "金星"
};

const WEALTH_SOURCE = {
  1: "自我经营、个人品牌与直接出手",
  2: "本职收入、储蓄与可掌控的资源",
  3: "信息差、写作沟通、短途奔波与技能变现",
  4: "家庭支持、房产置业或老家资源",
  5: "创作、投机、表演才华与兴趣变现",
  6: "日常工作、服务技能与稳定薪资",
  7: "伴侣、客户、合作与一对一关系",
  8: "投资、遗产、共同账户与他人资源",
  9: "远行、学历、出版、跨文化与开阔视野",
  10: "事业成就、职位声望与公开成绩",
  11: "朋友圈、社团、团队分红与人脉机会",
  12: "幕后、疗愈、隐秘渠道或需要独处的工作"
};

const MONEY_ATTITUDE = {
  白羊: "花钱偏干脆，看准了就出手，不太喜欢拖泥带水",
  金牛: "更看重踏实与质感，愿意为舒服和长期价值付钱",
  双子: "钱用在学习、社交和新鲜体验上更开心，也容易花样多",
  巨蟹: "安全感优先，存钱常为家人和情绪底盘服务",
  狮子: "舍得在体面、兴趣和让自己出彩的地方花钱",
  处女: "精打细算，爱记账和优化，讨厌浪费",
  天秤: "为关系和美感买单更容易，也在意公平对等",
  天蝎: "对钱很有掌控欲，要么深藏要么下重注，不喜欢含糊",
  射手: "钱更像自由度，愿意为成长、旅行和眼界买单",
  摩羯: "偏谨慎务实，先求稳再谈享受，长期规划感强",
  水瓶: "花钱偏理性，也容易投向理念、科技或与众不同的事",
  双鱼: "钱跟感觉绑在一起，心软时容易松，也需要边界"
};

function houseRulerName(chart, house) {
  const r = chart.rulers && chart.rulers[house - 1];
  return r ? r.ruler : null;
}

function houseSign(chart, house) {
  const c = chart.cusps && chart.cusps[house - 1];
  return c ? c.sign : null;
}

function aspectsInvolving(chart, name) {
  return (chart.aspects || []).filter(function (a) {
    return a.a === name || a.b === name;
  });
}

function otherOfAspect(asp, name) {
  return asp.a === name ? asp.b : asp.a;
}

/** 接纳：A 落在 B 守护（或擢升）的星座 */
function isReception(aBody, bBody) {
  if (!aBody || !bBody) return false;
  const ruler = SIGN_RULER[aBody.sign];
  const exalt = SIGN_EXALT[aBody.sign];
  return ruler === bBody.name || exalt === bBody.name;
}

function findMutualReceptions(chart) {
  const names = ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星"];
  const pairs = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = findBody(chart, names[i]);
      const b = findBody(chart, names[j]);
      if (!a || !b) continue;
      if (isReception(a, b) && isReception(b, a)) {
        pairs.push([a.name, b.name]);
      }
    }
  }
  return pairs;
}

function softNature(nature) {
  return nature === "顺畅" || nature === "和谐" || nature === "融合";
}

function hardNature(nature) {
  return nature === "张力" || nature === "对峙";
}

/**
 * 财富解读：二/八宫、宫主飞星、财星相位、接纳互容
 * → 整体财运、财富来源、金钱态度
 */
function buildWealthAnalysis(chart) {
  const venus = findBody(chart, "金星");
  const jupiter = findBody(chart, "木星");
  const saturn = findBody(chart, "土星");
  const mars = findBody(chart, "火星");

  const h2Sign = houseSign(chart, 2) || "金牛";
  const h8Sign = houseSign(chart, 8) || "天蝎";
  const r2 = houseRulerName(chart, 2);
  const r8 = houseRulerName(chart, 8);
  const r2b = r2 ? findBody(chart, r2) : null;
  const r8b = r8 ? findBody(chart, r8) : null;
  const in2 = bodiesInHouse(chart, 2);
  const in8 = bodiesInHouse(chart, 8);

  // —— 整体财运：飞星落点 + 相位软硬 + 落宫星 ——
  let soft = 0;
  let hard = 0;
  function tallyPlanet(name) {
    aspectsInvolving(chart, name).forEach(function (asp) {
      const other = otherOfAspect(asp, name);
      // 与财相关星/宫主的相位更重要
      const wealthRelated = ["金星", "木星", "土星", r2, r8].indexOf(other) >= 0 ||
        (findBody(chart, other) && (findBody(chart, other).house === 2 || findBody(chart, other).house === 8));
      if (!wealthRelated && name !== r2 && name !== "金星" && name !== "木星") return;
      if (softNature(asp.nature)) soft += 1;
      if (hardNature(asp.nature)) hard += 1;
    });
  }
  ["金星", "木星", r2].filter(Boolean).forEach(tallyPlanet);

  if (in2.indexOf("木星") >= 0 || in2.indexOf("金星") >= 0) soft += 2;
  if (in2.indexOf("土星") >= 0 || in2.indexOf("火星") >= 0) hard += 1;
  if (in8.indexOf("木星") >= 0 || in8.indexOf("金星") >= 0) soft += 1;
  if (r2b && (r2b.house === 2 || r2b.house === 10 || r2b.house === 11)) soft += 1;
  if (r2b && (r2b.house === 12 || r2b.house === 8) && hard === 0) soft += 0; // 中性

  // —— 开场：按二宫星座 / 宫主飞星 / 落星总结，不用三档套话 ——
  const wealthLead = [];
  wealthLead.push("二宫在" + h2Sign + "，钱袋脾气偏" + (SIGN_MOOD[h2Sign] || "务实"));
  if (r2b) {
    wealthLead.push("二宫主" + r2 + "飞入第" + r2b.house + "宫（" + HOUSE_TOPIC[r2b.house] + "），进账松紧常跟这里连在一起");
  } else if (r2) {
    wealthLead.push("二宫主是" + r2 + "，赚钱留钱的节奏跟它很像");
  }
  if (in2.length) {
    wealthLead.push("二宫有" + joinNames(in2) + "坐守，自己挣钱存钱的主题会被直接点亮");
  } else if (in8.length) {
    wealthLead.push("八宫有" + joinNames(in8) + "，共同财务或投资议题更醒目");
  }
  if (venus) {
    wealthLead.push("金星在" + venus.sign + "第" + venus.house + "宫，花钱更听「" +
      (WEALTH_SOURCE[venus.house] || HOUSE_TOPIC[venus.house]) + "」的话");
  }
  let wealthTone;
  if (soft >= hard + 2) wealthTone = "盘面上开源线索多于卡住的点，适合主动经营";
  else if (hard >= soft + 2) wealthTone = "盘面上更宜先稳住再求增长，别急着扩张";
  else wealthTone = "开源与节流都要自己盯着节奏";
  let overall = wealthLead.join("；") + "——" + wealthTone + "。";

  // —— 财富主要来自哪里（飞星优先，辅以八宫/落星）——
  const sources = [];
  if (r2b) sources.push(WEALTH_SOURCE[r2b.house] || HOUSE_TOPIC[r2b.house]);
  if (r8b && (!r2b || r8b.house !== r2b.house)) {
    sources.push("额外一截来自" + (WEALTH_SOURCE[r8b.house] || HOUSE_TOPIC[r8b.house]) + "（八宫主飞星）");
  }
  if (jupiter && jupiter.house !== (r2b && r2b.house)) {
    if (jupiter.house === 2 || jupiter.house === 8 || jupiter.house === 10 || jupiter.house === 11) {
      sources.push("木星在第" + jupiter.house + "宫，放大「" + (WEALTH_SOURCE[jupiter.house] || HOUSE_TOPIC[jupiter.house]) + "」这类进账");
    }
  }
  if (in2.length) sources.push("二宫有" + joinNames(in2) + "坐镇，自己挣钱存钱的主题会被点亮");
  if (in8.length && !in2.length) sources.push("八宫有" + joinNames(in8) + "，共同财务或投资议题更醒目");

  let sourceText = "财富主要来自" + (sources[0] || "本职与可掌控资源");
  if (sources.length > 1) sourceText += "；也留意" + sources[1].replace(/^额外一截来自/, "");
  sourceText += "。";

  // —— 金钱态度：二宫星座细说 + 土星/火星/木星语气（金星落点已在开场）——
  let attitude = MONEY_ATTITUDE[h2Sign] || MONEY_ATTITUDE["金牛"];
  if (!/[。！？]$/.test(attitude)) attitude += "。";
  if (saturn && (saturn.house === 2 || aspectsInvolving(chart, "土星").some(function (a) {
    const o = otherOfAspect(a, "土星");
    return o === "金星" || o === r2;
  }))) {
    attitude += "土星掺一脚时，你会更谨慎，甚至偏抠或延后享受。";
  } else if (mars && (mars.house === 2 || (r2 === "火星"))) {
    attitude += "火星语气偏强时，消费和赚钱都容易一阵一阵的，宜设上限。";
  } else if (jupiter && jupiter.house === 2) {
    attitude += "木星坐二宫，出手偏大方，记得给储蓄留规矩。";
  }

  // —— 接纳 / 互容（与财相关时点出来）——
  const mutuals = findMutualReceptions(chart);
  const wealthMutuals = mutuals.filter(function (pair) {
    return pair.indexOf("金星") >= 0 || pair.indexOf("木星") >= 0 ||
      pair.indexOf(r2) >= 0 || pair.indexOf(r8) >= 0;
  });
  let linkText = "";
  if (wealthMutuals.length) {
    const p = wealthMutuals[0];
    linkText = p[0] + "与" + p[1] + "互容，两边资源能互相借力，财路上的帮手更实在。";
  } else if (venus && r2b && r2 && r2 !== "金星" && isReception(venus, r2b) && isReception(r2b, venus)) {
    linkText = "金星与二宫主互有接纳，喜好和进账方式不容易打架。";
  } else if (venus && r2b && r2 && isReception(r2b, venus)) {
    linkText = "二宫主落在金星能照顾的位置，赚钱节奏更容易顺着你的喜好走。";
  } else if (r2b && jupiter && isReception(r2b, jupiter)) {
    linkText = "二宫主被木星接纳，扩张机会更容易落到钱袋上。";
  }

  // —— 关键相位一句 ——
  let aspectNote = "";
  const focus = r2 || "金星";
  const focusAsps = aspectsInvolving(chart, focus).concat(
    focus !== "金星" ? aspectsInvolving(chart, "金星") : []
  );
  const ranked = focusAsps.filter(function (a, i, arr) {
    const key = [a.a, a.b, a.aspect].sort().join("|");
    return arr.findIndex(function (x) {
      return [x.a, x.b, x.aspect].sort().join("|") === key;
    }) === i;
  }).sort(function (a, b) { return a.orbUsed - b.orbUsed; });
  if (ranked.length) {
    const top = ranked[0];
    if (hardNature(top.nature)) {
      aspectNote = top.a + top.aspect + top.b + "带来张力，理财上宜设规则、少冲动。";
    } else if (softNature(top.nature)) {
      aspectNote = top.a + top.aspect + top.b + "偏顺，合作或顺势进账更自然。";
    }
  }

  let text = overall + sourceText + "对金钱的态度：" + attitude;
  if (linkText) text += linkText;
  if (aspectNote && text.length < 220) text += aspectNote;
  return text;
}

const CAREER_BY_SIGN = {
  白羊: "适合开创、带队、销售冲刺或需要决断力的一线岗位",
  金牛: "适合金融理财、地产餐饮、设计美学或靠耐心积累的实业",
  双子: "适合媒体写作、教育培训、商务对接、资讯与多线程协作",
  巨蟹: "适合照护服务、家政餐饮、心理辅导、地产或与家庭相关的行业",
  狮子: "适合表演创意、品牌管理、教育带人、需要被看见的舞台型工作",
  处女: "适合分析研究、医疗健康、编辑质检、运营优化与精细服务",
  天秤: "适合法律咨询、公关设计、人力资源、商务谈判与审美相关岗位",
  天蝎: "适合调研风控、医疗心理、投资并购、技术深挖或危机处理",
  射手: "适合教育出版、跨境贸易、旅行文化、律所顾问或视野开阔的岗位",
  摩羯: "适合管理行政、工程建筑、政务机构、长线专业与层级清晰的组织",
  水瓶: "适合科技互联网、社会创新、研究发明、自由职业或非常规路径",
  双鱼: "适合艺术疗愈、影像音乐、慈善公益、灵感型创意与幕后支持"
};

const CAREER_BY_HOUSE = {
  1: "个人品牌、独立从业或需要强自我驱动的角色",
  2: "财务、产品、销售变现或资源经营类工作",
  3: "写作传播、培训销售、短途商务与技能教学",
  4: "不动产、家庭事业、本地深耕或后方支持型岗位",
  5: "创意娱乐、教育带娃、内容创作与投机型项目",
  6: "专业技术、医疗健康、行政运营与日常服务岗",
  7: "咨询顾问、客户成功、合伙经营与一对一服务",
  8: "金融投资、保险税务、调研风控与资源整合",
  9: "高等教育、出版传媒、跨境业务与理念传播",
  10: "管理领导、公众角色、体制内晋升与行业权威路径",
  11: "互联网社群、团队协作、公益组织与平台型事业",
  12: "幕后研发、疗愈艺术、机构内部支持或需要独处的专业"
};

/**
 * 事业解读：十/六宫、中天、宫主飞星、相位、接纳互容
 * → 适合方向、整体事业运势
 */
function buildCareerAnalysis(chart) {
  const sun = findBody(chart, "太阳");
  const saturn = findBody(chart, "土星");
  const jupiter = findBody(chart, "木星");
  const mars = findBody(chart, "火星");
  const mercury = findBody(chart, "水星");

  const mcSign = (chart.mc && chart.mc.sign) || "摩羯";
  const h6Sign = houseSign(chart, 6) || "处女";
  const r10 = houseRulerName(chart, 10);
  const r6 = houseRulerName(chart, 6);
  const r10b = r10 ? findBody(chart, r10) : null;
  const r6b = r6 ? findBody(chart, r6) : null;
  const in10 = bodiesInHouse(chart, 10);
  const in6 = bodiesInHouse(chart, 6);

  // —— 整体事业运势 ——
  let soft = 0;
  let hard = 0;
  function tally(name) {
    if (!name) return;
    aspectsInvolving(chart, name).forEach(function (asp) {
      const other = otherOfAspect(asp, name);
      const related = ["太阳", "土星", "木星", "火星", r10, r6].indexOf(other) >= 0 ||
        (findBody(chart, other) && (findBody(chart, other).house === 10 || findBody(chart, other).house === 6));
      if (!related && name !== r10 && name !== "太阳" && name !== "土星") return;
      if (softNature(asp.nature)) soft += 1;
      if (hardNature(asp.nature)) hard += 1;
    });
  }
  ["太阳", "土星", "木星", r10].forEach(tally);

  if (in10.indexOf("太阳") >= 0 || in10.indexOf("木星") >= 0) soft += 2;
  if (in10.indexOf("土星") >= 0 || in10.indexOf("火星") >= 0) hard += 1;
  if (in6.indexOf("水星") >= 0 || in6.indexOf("木星") >= 0) soft += 1;
  if (r10b && (r10b.house === 10 || r10b.house === 1 || r10b.house === 11 || r10b.house === 9)) soft += 1;
  if (r10b && (r10b.house === 12 || r10b.house === 4)) hard += 0; // 偏内敛，不算大坏

  // —— 开场：中天 / 十宫主飞星 / 落星，按盘总结 ——
  const careerLead = [];
  careerLead.push("中天在" + mcSign + "，公开成就的底色偏" + (SIGN_MOOD[mcSign] || "务实"));
  if (r10b) {
    careerLead.push("十宫主" + r10 + "飞入第" + r10b.house + "宫（" + HOUSE_TOPIC[r10b.house] + "），事业起伏常跟这里连在一起");
  } else if (r10) {
    careerLead.push("十宫主是" + r10 + "，成就路径带着它的脾气");
  }
  if (in10.length) {
    careerLead.push("十宫有" + joinNames(in10) + "坐守，公开成绩主题会被点亮");
  } else if (in6.length) {
    careerLead.push("六宫有" + joinNames(in6) + "，日常技能与岗位更关键");
  }
  if (sun) {
    careerLead.push("太阳在" + sun.sign + "第" + sun.house + "宫，干劲多半使在「" +
      (CAREER_BY_HOUSE[sun.house] || HOUSE_TOPIC[sun.house]) + "」上");
  }
  let careerTone;
  if (soft >= hard + 2) careerTone = "盘面上较容易被看见，也较能借到时机";
  else if (hard >= soft + 2) careerTone = "盘面上节奏偏慢，更适合先把专业打扎实";
  else careerTone = "有机会也有门槛，选对赛道并坚持够久更关键";
  let fortune = careerLead.join("；") + "——" + careerTone + "。";

  // —— 适合的事业方向：中天 + 十宫主飞星 + 六宫/太阳 ——
  const dirs = [];
  dirs.push(CAREER_BY_SIGN[mcSign] || CAREER_BY_SIGN["摩羯"]);
  if (r10b) {
    const fly = CAREER_BY_HOUSE[r10b.house];
    if (fly && dirs.indexOf(fly) < 0) dirs.push("突破口更靠近" + fly);
  }
  if (r6b && (!r10b || r6b.house !== r10b.house)) {
    dirs.push("日常本事可落在" + (CAREER_BY_HOUSE[r6b.house] || HOUSE_TOPIC[r6b.house]));
  }
  if (sun && sun.house !== 10 && sun.house !== (r10b && r10b.house)) {
    if ([1, 5, 6, 9, 10, 11].indexOf(sun.house) >= 0) {
      dirs.push("太阳在第" + sun.house + "宫，做「" + (CAREER_BY_HOUSE[sun.house] || HOUSE_TOPIC[sun.house]) + "」更有劲");
    }
  }
  if (in10.length) dirs.push("十宫有" + joinNames(in10) + "，公开成就主题会被点亮");
  if (in6.length && !in10.length) dirs.push("六宫有" + joinNames(in6) + "，技能与日常岗位更关键");

  let direction = "适合方向：" + dirs[0];
  if (dirs.length > 1) direction += "；其次，" + dirs[1].replace(/^突破口更靠近/, "可往").replace(/^日常本事可落在/, "日常可做");
  if (dirs.length > 2 && direction.length < 160) {
    const third = dirs[2];
    if (third.indexOf("太阳") === 0 || third.indexOf("十宫") === 0 || third.indexOf("六宫") === 0) {
      direction += "。" + third;
    }
  }
  if (!/[。！？]$/.test(direction)) direction += "。";
  // 六宫星座补一句工作风格
  direction += "做事风格偏" + SIGN_MOOD[h6Sign] + "（六宫在" + h6Sign + "）。";

  // —— 接纳 / 互容 ——
  const mutuals = findMutualReceptions(chart);
  const careerMutuals = mutuals.filter(function (pair) {
    return pair.indexOf("太阳") >= 0 || pair.indexOf("土星") >= 0 ||
      pair.indexOf("火星") >= 0 || pair.indexOf(r10) >= 0 || pair.indexOf(r6) >= 0;
  });
  let linkText = "";
  if (careerMutuals.length) {
    const p = careerMutuals[0];
    linkText = p[0] + "与" + p[1] + "互容，事业上两股力量能互相借力，贵人或搭档更实在。";
  } else if (sun && r10b && r10 && r10 !== "太阳" && isReception(sun, r10b) && isReception(r10b, sun)) {
    linkText = "太阳与十宫主互有接纳，意志和成就路径不容易拧巴。";
  } else if (r10b && saturn && isReception(r10b, saturn)) {
    linkText = "十宫主被土星接纳，靠纪律与年限堆出来的成就更稳。";
  } else if (r10b && jupiter && isReception(r10b, jupiter)) {
    linkText = "十宫主被木星接纳，扩张与机遇更容易落到事业上。";
  }

  // —— 关键相位 ——
  let aspectNote = "";
  const focus = r10 || "太阳";
  const focusAsps = aspectsInvolving(chart, focus).concat(
    focus !== "太阳" ? aspectsInvolving(chart, "太阳") : [],
    saturn ? aspectsInvolving(chart, "土星") : []
  );
  const ranked = focusAsps.filter(function (a, i, arr) {
    const key = [a.a, a.b, a.aspect].sort().join("|");
    return arr.findIndex(function (x) {
      return [x.a, x.b, x.aspect].sort().join("|") === key;
    }) === i;
  }).sort(function (a, b) { return a.orbUsed - b.orbUsed; });
  if (ranked.length) {
    const top = ranked[0];
    if (hardNature(top.nature)) {
      aspectNote = top.a + top.aspect + top.b + "带来张力，升迁路上宜耐得住磨、少硬刚。";
    } else if (softNature(top.nature)) {
      aspectNote = top.a + top.aspect + top.b + "偏顺，合作、曝光或顺势推进更自然。";
    }
  }

  if (saturn && !aspectNote) {
    aspectNote = "土星在第" + saturn.house + "宫，想做久还得靠耐心把基础打牢。";
  } else if (mars && mars.house === 10 && !aspectNote) {
    aspectNote = "火星坐十宫，行动力强，宜选能出手的赛道，也要注意别急躁树敌。";
  } else if (mercury && mercury.house === 10 && !aspectNote) {
    aspectNote = "水星坐十宫，靠脑子、表达和信息差更容易出头。";
  }

  let text = fortune + direction;
  if (linkText) text += linkText;
  if (aspectNote && text.length < 260) text += aspectNote;
  return text;
}

const PARTNER_LOOK = {
  白羊: "气场利落、五官鲜明，行动感强，看起来有冲劲",
  金牛: "轮廓偏柔和或有质感，气质稳，观感舒服耐看",
  双子: "神情灵活、眼神会说话，看起来机灵、年轻感足",
  巨蟹: "面容偏圆润温柔，表情有保护欲，亲近感强",
  狮子: "存在感强，发型或穿搭容易抓眼，偏明亮自信",
  处女: "干净清爽、细节讲究，气质克制，看起来很利落",
  天秤: "五官匀称、仪态讲究，偏有礼貌的美感",
  天蝎: "眼神深、气场有磁性，不张扬但让人难忘",
  射手: "身材偏高挑开朗，笑容大方，带着户外或旅行感",
  摩羯: "骨骼感清晰、表情沉稳，看起来可靠、偏成熟",
  水瓶: "五官或穿搭有辨识度，气质独立，不走寻常路",
  双鱼: "眼神柔、轮廓偏梦幻，情绪感强，易让人想靠近"
};

const PARTNER_PERSON = {
  白羊: "性格直接干脆，说做就做，讨厌拖泥带水",
  金牛: "性格踏实慢热，重承诺与安全感，不轻易动摇",
  双子: "性格活泼善聊，好奇心重，需要新鲜感与空间",
  巨蟹: "性格顾家敏感，重视情绪联结，护短也黏人",
  狮子: "性格大方要面子，愿意带头，也需要被看见被夸",
  处女: "性格细致挑剔，靠谱务实，爱把事情安排妥当",
  天秤: "性格讲究公平和谐，会协调关系，也在意观感",
  天蝎: "性格深沉专注，占有欲与洞察力强，一旦投入很深",
  射手: "性格乐观开阔，爱自由与理念，不喜被绑太死",
  摩羯: "性格克制负责，目标感强，感情里也像在经营事业",
  水瓶: "性格独立理性，重友情式亲密，需要被尊重空间",
  双鱼: "性格温柔感性，共情强，有时边界模糊需要引导"
};

const PARTNER_MONEY = {
  白羊: "财运上偏敢投敢拼，赚钱靠行动，存钱看心情",
  金牛: "财运上偏稳，会攒、会置办，看重实际资产",
  双子: "财运来路多，也容易散，靠脑子和人脉更赚钱",
  巨蟹: "财运跟安全感绑在一起，愿为家人和保障存钱",
  狮子: "财运上舍得为体面与兴趣花钱，也敢大手笔",
  处女: "财运上精打细算，擅长靠技能和服务稳定进账",
  天秤: "财运常与合作、审美相关，也在意公平分配",
  天蝎: "财运上掌控欲强，可能涉投资、共用资源或隐性收入",
  射手: "财运起伏靠机遇与眼界，愿为成长与远行花钱",
  摩羯: "财运偏长线积累，事业有成后钱袋更稳",
  水瓶: "财运路径不常规，可能靠理念、科技或社群变现",
  双鱼: "财运跟感觉走，心软时易松手，也需边界"
};

const PARTNER_CAREER = {
  白羊: "事业上适合冲锋、带队或开创型角色",
  金牛: "事业上偏实务、审美或靠耐心堆出来的行业",
  双子: "事业上适合沟通、资讯、教育或多线程协作",
  巨蟹: "事业上贴近照护、本地服务或与家庭相关的领域",
  狮子: "事业上需要舞台与主导权，适合被看见的岗位",
  处女: "事业上适合专业技能、分析优化与服务岗",
  天秤: "事业上适合协调、设计、法务公关或成对合作",
  天蝎: "事业上适合深耕研究、风控投资或高强度专业",
  射手: "事业上适合教育、跨境、顾问或理念传播",
  摩羯: "事业上目标清晰，适合管理、工程或层级组织",
  水瓶: "事业上走创新、技术或非常规路径更顺",
  双鱼: "事业上适合创意、疗愈、艺术或幕后支持"
};

/** 七宫主飞入某宫 → 伴侣生活重心/外在条件补充 */
const PARTNER_FLY = {
  1: "对方自我意识强，关系里也像两个独立的人在并肩",
  2: "对方很看重资源与物质安全感，相处常谈实际条件",
  3: "对方话多、爱学习或奔波，日常沟通量会很大",
  4: "对方顾家、有来自家庭或房产的底色",
  5: "对方有孩子缘、创造欲或玩乐浪漫的一面",
  6: "对方忙于工作技能，是务实的上班族气质",
  7: "对方本身也重关系，镜像感强，像「为伴侣而来」",
  8: "对方财务或内心世界较深，可能有共同财产/投资议题",
  9: "对方学历、信念或远行背景突出，眼界开阔",
  10: "对方事业心强、社会角色清晰，成就感很重要",
  11: "对方朋友多、圈子广，或走团队/社群型事业",
  12: "对方内心戏重、需要独处，或带一点神秘/疗愈气质"
};

/**
 * 感情解读：七宫、金星、宫主飞星、相位、接纳互容
 * → 伴侣性格、外貌、财富、事业特征
 */
function buildLoveAnalysis(chart) {
  const venus = findBody(chart, "金星");
  const mars = findBody(chart, "火星");
  const moon = findBody(chart, "月亮");
  const jupiter = findBody(chart, "木星");
  const saturn = findBody(chart, "土星");

  const h7Sign = houseSign(chart, 7) || "天秤";
  const r7 = houseRulerName(chart, 7);
  const r7b = r7 ? findBody(chart, r7) : null;
  const in7 = bodiesInHouse(chart, 7);

  // 伴侣主星座：七宫星座为主，飞星落座加强
  const partnerSign = h7Sign;
  const flySign = r7b ? r7b.sign : null;

  // —— 关系相位软硬（语气收尾用，不作开场套话）——
  let soft = 0;
  let hard = 0;
  function tally(name) {
    if (!name) return;
    aspectsInvolving(chart, name).forEach(function (asp) {
      const other = otherOfAspect(asp, name);
      const related = ["金星", "火星", "月亮", r7].indexOf(other) >= 0 ||
        (findBody(chart, other) && findBody(chart, other).house === 7);
      if (!related && name !== r7 && name !== "金星") return;
      if (softNature(asp.nature)) soft += 1;
      if (hardNature(asp.nature)) hard += 1;
    });
  }
  ["金星", "火星", r7].forEach(tally);

  // —— 开场：七宫 / 宫主飞星 / 落星 / 金星，按盘总结 ——
  const loveLead = [];
  loveLead.push("七宫在" + partnerSign + "，伴侣性格偏" +
    (PARTNER_PERSON[partnerSign] || SIGN_MOOD[partnerSign] || "平和可处"));
  if (flySign && flySign !== partnerSign) {
    loveLead.push("七宫主落在" + flySign + "，又多一层" + (SIGN_MOOD[flySign] || "") + "的味道");
  }
  if (r7b) {
    loveLead.push("七宫主" + r7 + "飞入第" + r7b.house + "宫，相处重心常在「" + HOUSE_TOPIC[r7b.house] + "」");
  } else if (r7) {
    loveLead.push("七宫主是" + r7);
  }
  if (in7.length) {
    loveLead.push("七宫有" + joinNames(in7) + "坐守，对方身上这些星的特质会更明显");
  }
  if (venus) {
    loveLead.push("金星在" + venus.sign + "第" + venus.house + "宫，你的喜好滤镜偏" + SIGN_MOOD[venus.sign]);
  }
  let loveTone;
  if (soft >= hard + 2) loveTone = "盘面上较易遇对味的人，也较能维系";
  else if (hard >= soft + 2) loveTone = "盘面上磨合成本不低，适合慢热、把边界说清";
  else loveTone = "遇得到人，也需要经营";
  const bond = loveLead.join("；") + "——" + loveTone + "。";

  // —— 外貌 ——
  let look = "外貌印象：" + (PARTNER_LOOK[partnerSign] || "整体气质与七宫星座相符");
  if (venus && venus.sign !== partnerSign) {
    look += "；金星在" + venus.sign + "，你也容易被" + SIGN_MOOD[venus.sign] + "的观感吸引";
  }
  if (!/[。！？]$/.test(look)) look += "。";

  // —— 财富 ——
  let moneySign = flySign || partnerSign;
  if (r7b && (r7b.house === 2 || r7b.house === 8)) moneySign = r7b.sign;
  let money = "财富方面：" + (PARTNER_MONEY[moneySign] || PARTNER_MONEY["金牛"]);
  if (r7b && r7b.house === 2) money += "七宫主飞二宫，对方的金钱观会直接影响关系安全感。";
  else if (r7b && r7b.house === 8) money += "七宫主飞八宫，共同财务、投资或资源捆绑议题更醒目。";
  else if (r7b && r7b.house === 10) money += "对方赚钱常跟事业成就绑在一起。";
  if (!/[。！？]$/.test(money)) money += "。";

  // —— 事业 ——
  let careerSign = partnerSign;
  if (r7b && (r7b.house === 10 || r7b.house === 6)) careerSign = r7b.sign;
  else if (flySign) careerSign = flySign;
  let career = "事业方面：" + (PARTNER_CAREER[careerSign] || PARTNER_CAREER["摩羯"]);
  if (r7b) {
    career += PARTNER_FLY[r7b.house] ? "（" + PARTNER_FLY[r7b.house] + "）" : "";
  }
  if (!/[。！？]$/.test(career)) career += "。";

  const mutuals = findMutualReceptions(chart);
  const loveMutuals = mutuals.filter(function (pair) {
    return pair.indexOf("金星") >= 0 || pair.indexOf("月亮") >= 0 ||
      pair.indexOf("火星") >= 0 || pair.indexOf(r7) >= 0;
  });
  let linkText = "";
  if (loveMutuals.length) {
    const p = loveMutuals[0];
    linkText = p[0] + "与" + p[1] + "互容，彼此需求更能对接，关系里的助力更实。";
  } else if (venus && r7b && r7 && r7 !== "金星" && isReception(venus, r7b) && isReception(r7b, venus)) {
    linkText = "金星与七宫主互有接纳，喜好和对象条件不容易打架。";
  } else if (r7b && venus && isReception(r7b, venus)) {
    linkText = "七宫主被金星接纳，对方更容易长成你喜欢的样子。";
  } else if (r7b && moon && isReception(r7b, moon)) {
    linkText = "七宫主被月亮接纳，情感安全感更容易建立。";
  }

  let aspectNote = "";
  const focus = r7 || "金星";
  const focusAsps = aspectsInvolving(chart, focus).concat(
    focus !== "金星" && venus ? aspectsInvolving(chart, "金星") : []
  );
  const ranked = focusAsps.filter(function (a, i, arr) {
    const key = [a.a, a.b, a.aspect].sort().join("|");
    return arr.findIndex(function (x) {
      return [x.a, x.b, x.aspect].sort().join("|") === key;
    }) === i;
  }).sort(function (a, b) { return a.orbUsed - b.orbUsed; });
  if (ranked.length) {
    const top = ranked[0];
    if (hardNature(top.nature)) {
      aspectNote = top.a + top.aspect + top.b + "提醒：相处里宜少猜忌、多把话说开。";
    } else if (softNature(top.nature)) {
      aspectNote = top.a + top.aspect + top.b + "偏顺，吸引与互动来得更自然。";
    }
  }
  if (saturn && (saturn.house === 7 || (r7 === "土星")) && !aspectNote) {
    aspectNote = "土星掺和七宫时，伴侣偏成熟可靠，感情也更像慢慢经营。";
  } else if (jupiter && jupiter.house === 7 && !aspectNote) {
    aspectNote = "木星坐七宫，伴侣偏开阔慷慨，也容易遇贵人型对象。";
  } else if (mars && mars.house === 7 && !aspectNote) {
    aspectNote = "火星坐七宫，吸引有冲劲的人，火花足也易争执，宜控火候。";
  }

  let text = bond + look + money + career;
  if (linkText) text += linkText;
  if (aspectNote && text.length < 300) text += aspectNote;
  return text;
}

const HEALTH_ZONE = {
  白羊: "头面部、血压与急性炎症，宜少熬夜、控脾气",
  金牛: "喉咙、甲状腺、颈椎与代谢节奏，宜规律饮食",
  双子: "呼吸、肩臂、神经紧张与作息紊乱，宜放慢换气",
  巨蟹: "肠胃、胸腹敏感与情绪性不适，宜暖食、稳情绪",
  狮子: "心脏、背脊与精力透支，宜有氧但别硬撑",
  处女: "消化吸收、肠道与过度焦虑劳损，宜细嚼慢咽、少钻牛角尖",
  天秤: "腰肾、皮肤与平衡感，宜作息对称、少久坐",
  天蝎: "生殖泌尿、排毒代谢与积压性疲劳，宜规律排解压力",
  射手: "髋腿、肝脏负荷与跑动过量，宜拉伸、少暴饮暴食",
  摩羯: "骨骼关节、皮肤屏障与慢性劳损，宜保暖、量力运动",
  水瓶: "小腿踝、循环与神经过敏，宜保暖末梢、规律休息",
  双鱼: "足部、淋巴水肿感与边界模糊导致的疲惫，宜泡脚、早睡"
};

const HEALTH_FLY = {
  1: "身体状况跟自我状态强相关，心情一紧，体能也掉",
  2: "饮食消费与资源安全感会影响体质，乱吃乱花容易反噬",
  3: "奔波、用嗓、短途劳顿较多，肩颈与作息易乱",
  4: "家庭压力或居住环境影响大，回家能否休息很关键",
  5: "玩乐、恋爱或带娃耗能，过兴奋后容易空",
  6: "日常工作节奏直接左右健康，加班最伤",
  7: "关系张力会反映到身体，吵完或委屈后易不舒服",
  8: "压力偏深层，恢复慢，宜重视排毒、睡眠与心理疏通",
  9: "远行、学习负荷或信念焦虑会耗元气，注意节奏",
  10: "事业压力上身，成就感与劳损常一起出现",
  11: "社交应酬、团队节奏影响作息，圈子忙时身体先抗议",
  12: "隐性消耗大，睡眠、免疫与独处恢复特别重要"
};

/**
 * 健康解读：一/六/十二宫、宫主飞星、相位、接纳互容
 * → 整体状况、要注意的问题（养生提示，非医疗诊断）
 */
function buildHealthAnalysis(chart) {
  const sun = findBody(chart, "太阳");
  const moon = findBody(chart, "月亮");
  const mars = findBody(chart, "火星");
  const saturn = findBody(chart, "土星");
  const jupiter = findBody(chart, "木星");

  const h1Sign = houseSign(chart, 1) || (chart.asc && chart.asc.sign) || "白羊";
  const h6Sign = houseSign(chart, 6) || "处女";
  const h12Sign = houseSign(chart, 12) || "双鱼";
  const r6 = houseRulerName(chart, 6);
  const r12 = houseRulerName(chart, 12);
  const r1 = houseRulerName(chart, 1);
  const r6b = r6 ? findBody(chart, r6) : null;
  const r12b = r12 ? findBody(chart, r12) : null;
  const in6 = bodiesInHouse(chart, 6);
  const in12 = bodiesInHouse(chart, 12);
  const in1 = bodiesInHouse(chart, 1);

  // —— 整体状况 ——
  let soft = 0;
  let hard = 0;
  function tally(name) {
    if (!name) return;
    aspectsInvolving(chart, name).forEach(function (asp) {
      const other = otherOfAspect(asp, name);
      const related = ["太阳", "月亮", "火星", "土星", r6, r12].indexOf(other) >= 0 ||
        (findBody(chart, other) && [1, 6, 12].indexOf(findBody(chart, other).house) >= 0);
      if (!related && name !== r6 && name !== "月亮" && name !== "火星") return;
      if (softNature(asp.nature)) soft += 1;
      if (hardNature(asp.nature)) hard += 1;
    });
  }
  ["太阳", "月亮", "火星", "土星", r6].forEach(tally);

  if (in6.indexOf("木星") >= 0 || in6.indexOf("金星") >= 0) soft += 1;
  if (in6.indexOf("土星") >= 0 || in6.indexOf("火星") >= 0) hard += 1;
  if (in12.indexOf("土星") >= 0 || in12.indexOf("火星") >= 0 || in12.indexOf("月亮") >= 0) hard += 1;
  if (in1.indexOf("太阳") >= 0 || in1.indexOf("木星") >= 0) soft += 1;
  if (r6b && (r6b.house === 6 || r6b.house === 1)) soft += 0;
  if (r6b && (r6b.house === 12 || r6b.house === 8)) hard += 1;

  // —— 开场：六宫 / 上升 / 宫主飞星，按盘总结 ——
  const healthLead = [];
  healthLead.push("六宫在" + h6Sign + "，日常保养节奏偏" + (SIGN_MOOD[h6Sign] || "细致"));
  if (h1Sign) {
    healthLead.push("上升在" + h1Sign + "，体质底色偏" + (SIGN_MOOD[h1Sign] || h1Sign));
  }
  if (r6b) {
    healthLead.push("六宫主" + r6 + "飞入第" + r6b.house + "宫，体能起伏常跟「" + HOUSE_TOPIC[r6b.house] + "」绑在一起");
  } else if (r6) {
    healthLead.push("六宫主是" + r6);
  }
  if (in6.length) {
    healthLead.push("六宫有" + joinNames(in6) + "，工作消耗会更快反映到身上");
  } else if (in12.length) {
    healthLead.push("十二宫有" + joinNames(in12) + "，独处恢复与睡眠格外重要");
  }
  let healthTone;
  if (soft >= hard + 2) healthTone = "盘面上底子尚可，关键是别长期透支";
  else if (hard >= soft + 2) healthTone = "盘面上偏敏感或易积劳，小信号要早理会";
  else healthTone = "规律时稳住，作息一乱就容易报警";
  let overall = healthLead.join("；") + "——" + healthTone + "。";

  // —— 要注意的问题：六宫星座为主，一宫/十二宫与飞星补充 ——
  const notes = [];
  notes.push("日常更需留意" + (HEALTH_ZONE[h6Sign] || HEALTH_ZONE["处女"]));
  if (h1Sign && h1Sign !== h6Sign) {
    const zone = HEALTH_ZONE[h1Sign] || "";
    const shortZone = zone.split("，")[0] || h1Sign;
    notes.push("上升在" + h1Sign + "，体质底色也偏向" + shortZone);
  }
  if (r6b && HEALTH_FLY[r6b.house]) {
    notes.push(HEALTH_FLY[r6b.house]);
  }
  if (h12Sign) {
    notes.push("十二宫在" + h12Sign + "，休息不足时更易出现隐性疲惫或睡眠问题");
  }
  if (in6.length) notes.push("六宫有" + joinNames(in6) + "，工作消耗会更快反映到身上");
  if (in12.length) notes.push("十二宫有" + joinNames(in12) + "，独处恢复与睡眠质量格外重要");

  let watch = "要注意：" + notes[0];
  if (notes.length > 1) watch += "；" + notes[1];
  if (notes.length > 2 && watch.length < 140) watch += "。" + notes[2];
  if (!/[。！？]$/.test(watch)) watch += "。";

  // —— 接纳 / 互容 ——
  const mutuals = findMutualReceptions(chart);
  const healthMutuals = mutuals.filter(function (pair) {
    return pair.indexOf("太阳") >= 0 || pair.indexOf("月亮") >= 0 ||
      pair.indexOf("火星") >= 0 || pair.indexOf("土星") >= 0 ||
      pair.indexOf(r6) >= 0 || pair.indexOf(r1) >= 0;
  });
  let linkText = "";
  if (healthMutuals.length) {
    const p = healthMutuals[0];
    linkText = p[0] + "与" + p[1] + "互容，身心调节有内在接力，调养时两股力量能互相帮衬。";
  } else if (moon && r6b && r6 && r6 !== "月亮" && isReception(moon, r6b) && isReception(r6b, moon)) {
    linkText = "月亮与六宫主互有接纳，情绪管理好了，身体也更容易稳住。";
  } else if (r6b && moon && isReception(r6b, moon)) {
    linkText = "六宫主被月亮接纳，作息与安全感同步时，恢复更快。";
  } else if (r6b && sun && isReception(r6b, sun)) {
    linkText = "六宫主被太阳接纳，有目标、有节奏地运动保养会更有效。";
  }

  // —— 关键相位 / 落宫提醒 ——
  let aspectNote = "";
  const focus = r6 || "月亮";
  const focusAsps = aspectsInvolving(chart, focus).concat(
    mars ? aspectsInvolving(chart, "火星") : [],
    saturn ? aspectsInvolving(chart, "土星") : []
  );
  const ranked = focusAsps.filter(function (a, i, arr) {
    const key = [a.a, a.b, a.aspect].sort().join("|");
    return arr.findIndex(function (x) {
      return [x.a, x.b, x.aspect].sort().join("|") === key;
    }) === i;
  }).sort(function (a, b) { return a.orbUsed - b.orbUsed; });
  if (ranked.length) {
    const top = ranked[0];
    if (hardNature(top.nature)) {
      aspectNote = top.a + top.aspect + top.b + "带来张力，压力大时身体会先报警，宜提前减速。";
    } else if (softNature(top.nature)) {
      aspectNote = top.a + top.aspect + top.b + "偏顺，规律运动与作息更容易坚持。";
    }
  }
  if (mars && (mars.house === 6 || mars.house === 1) && !aspectNote) {
    aspectNote = "火星较旺，与其闷着，不如固定运动把火气用掉。";
  } else if (moon && (moon.house === 6 || moon.house === 12) && !aspectNote) {
    aspectNote = "月亮靠近身体宫，心情一紧，身体也容易跟着紧。";
  } else if (saturn && (saturn.house === 6 || saturn.house === 1 || saturn.house === 12) && !aspectNote) {
    aspectNote = "土星坐身体相关宫，偏慢性节奏，保养要长期做，别指望速效。";
  } else if (jupiter && jupiter.house === 6 && !aspectNote) {
    aspectNote = "木星坐六宫，恢复力可以，但也要防吃太多、动太猛的过犹不及。";
  } else if (!aspectNote) {
    aspectNote = "把睡觉和吃饭节奏稳住，比临时补救更管用。";
  }

  let twelfth = "";
  if (r12b && (!r6b || r12b.house !== r6b.house)) {
    twelfth = "十二宫主飞入第" + r12b.house + "宫，隐性消耗也跟「" + HOUSE_TOPIC[r12b.house] + "」有关。";
  }

  let text = overall + watch;
  if (linkText) text += linkText;
  if (twelfth && text.length < 240) text += twelfth;
  if (aspectNote && text.length < 300) text += aspectNote;
  return text;
}

export function generateAnalysis(chart, profile) {
  const sun = findBody(chart, "太阳");
  const moon = findBody(chart, "月亮");
  const nick = profile.nickname || "你";

  let overall = nick + "的主轴是" + sun.sign + "太阳、" + moon.sign + "月亮、" + chart.asc.sign +
    "上升：别人先看到你" + SIGN_MOOD[chart.asc.sign] + "的一面，心里其实更需要" +
    SIGN_MOOD[moon.sign] + "的感觉，做选择时又常按" + SIGN_MOOD[sun.sign] + "的太阳来定方向。";
  if (sun && sun.house) {
    overall += "太阳在第" + sun.house + "宫，成就感多半来自「" + HOUSE_TOPIC[sun.house] + "」。";
  }

  let career = buildCareerAnalysis(chart);

  let wealth = buildWealthAnalysis(chart);

  let love = buildLoveAnalysis(chart);

  let health = buildHealthAnalysis(chart);

  if (moon && moon.house && overall.length < 100) {
    overall += "月亮在第" + moon.house + "宫，心情也常跟「" + HOUSE_TOPIC[moon.house] + "」绑在一起。";
  }

  const outlook = yearOutlook(chart, chart.birthUTC || (profile && profile.birthTime));
  const fir = outlook.firdaria;
  const q0 = outlook.quarters[0];
  let yearTransit = "这一年木星主要走你的第" + outlook.jupiterHouse + "宫（" +
    HOUSE_TOPIC[outlook.jupiterHouse] + "），这边更容易有机会和帮手；土星走第" +
    outlook.saturnHouse + "宫（" + HOUSE_TOPIC[outlook.saturnHouse] + "），同一主题要你把规矩立好、把底子做实。";
  if (q0 && q0.hits && q0.hits.length) {
    const extra = q0.hits.filter(function (h) {
      return h.indexOf("木星行经") < 0 && h.indexOf("土星行经") < 0;
    }).slice(0, 1);
    if (extra.length) yearTransit += "近一季还可留意：" + extra[0] + "。";
  }

  let yearFirdaria = "你是" + (fir.isDay ? "日生" : "夜生") + "盘，眼下主限是" +
    fir.current.major + "法达（大约还剩" + fir.current.majorRemainYears.toFixed(1) +
    "年），次限是" + fir.current.minor + "。" +
    (FIRDARIA_THEME[fir.current.major] || "") + "；次限则偏" +
    (FIRDARIA_THEME[fir.current.minor] || "细节在换题") + "。";
  if (fir.switchNote) yearFirdaria += fir.switchNote;

  return {
    overall: clipText(overall, 150),
    career: clipText(career, 320),
    wealth: clipText(wealth, 320),
    love: clipText(love, 360),
    health: clipText(health, 320),
    yearTransit: clipText(yearTransit, 160),
    yearFirdaria: clipText(yearFirdaria, 160),
    // 兼容旧字段
    year: clipText(yearTransit + yearFirdaria, 320)
  };
}

export function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return { activeId: raw.activeId || null, profiles: Array.isArray(raw.profiles) ? raw.profiles : [] };
  } catch (e) {
    return { activeId: null, profiles: [] };
  }
}

export function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function uid() {
  return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export function renderWheel(chart, colors) {
  const cx = 160, cy = 160, r = 128;
  const bodies = chart.placements.concat([chart.asc]);
  let svg = '<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(232,201,138,0.28)"/>';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="88" fill="none" stroke="rgba(232,201,138,0.12)"/>';
  ZODIAC.forEach(function (z, i) {
    const a = ((i * 30) - 90) * Math.PI / 180;
    const x = cx + Math.cos(a) * (r - 18);
    const y = cy + Math.sin(a) * (r - 18);
    svg += '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="#a8a095" font-size="9" text-anchor="middle" dominant-baseline="middle">' + z + "</text>";
  });
  chart.cusps.forEach(function (c) {
    const a = ((c.lon || 0) - 90) * Math.PI / 180;
    const x1 = cx + Math.cos(a) * 72;
    const y1 = cy + Math.sin(a) * 72;
    const x2 = cx + Math.cos(a) * r;
    const y2 = cy + Math.sin(a) * r;
    svg += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="rgba(232,201,138,0.15)"/>';
  });
  bodies.forEach(function (b) {
    const a = ((b.lon || 0) - 90) * Math.PI / 180;
    const x = cx + Math.cos(a) * 104;
    const y = cy + Math.sin(a) * 104;
    const color = (colors && colors[b.name]) || "#e8c98a";
    svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5" fill="' + color + '"/>';
  });
  svg += "</svg>";
  return svg;
}
