/**
 * 合盘（互盘相位）本地计算 — 基于双方 natal chart.placements / lons
 */

const ASPECT_DEFS = [
  { angle: 0, name: "合相", orb: 8, nature: "soft", weight: 10 },
  { angle: 60, name: "六分相", orb: 4, nature: "soft", weight: 6 },
  { angle: 90, name: "刑相", orb: 6, nature: "hard", weight: 8 },
  { angle: 120, name: "拱相", orb: 6, nature: "soft", weight: 8 },
  { angle: 180, name: "冲相", orb: 8, nature: "hard", weight: 9 }
];

const KEY_BODIES = ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星", "上升"];

const DIM_RULES = {
  沟通: { bodies: ["水星", "月亮", "太阳"], softBoost: 1.2, hardBoost: 1.1 },
  缘分: { bodies: ["太阳", "月亮", "上升", "木星"], softBoost: 1.3, hardBoost: 0.9 },
  愉悦: { bodies: ["金星", "木星", "月亮"], softBoost: 1.25, hardBoost: 1.0 },
  激情: { bodies: ["火星", "金星", "太阳"], softBoost: 1.2, hardBoost: 1.15 },
  亲密: { bodies: ["月亮", "金星", "土星"], softBoost: 1.2, hardBoost: 1.1 },
  吸引: { bodies: ["金星", "火星", "太阳", "上升"], softBoost: 1.3, hardBoost: 1.05 }
};

const DIM_LABELS = {
  沟通: [
    [80, "心有灵犀"], [65, "聊得来"], [50, "需要耐心"], [35, "略有隔阂"], [0, "鸡同鸭讲"]
  ],
  缘分: [
    [80, "前缘深厚"], [65, "一见如故"], [50, "缘分尚可"], [35, "淡淡的缘"], [0, "擦肩而过"]
  ],
  愉悦: [
    [80, "相处轻松"], [65, "挺有意思"], [50, "平淡安稳"], [35, "略显乏味"], [0, "提不起劲"]
  ],
  激情: [
    [80, "火花四溅"], [65, "热度不错"], [50, "温温吞吞"], [35, "兴趣缺缺"], [0, "激情冷淡"]
  ],
  亲密: [
    [80, "亲密无间"], [65, "容易靠近"], [50, "若即若离"], [35, "保持距离"], [0, "难以交心"]
  ],
  吸引: [
    [80, "强烈吸引"], [65, "怦然心动"], [50, "有点意思"], [35, "平平无奇"], [0, "几乎无感"]
  ]
};

const STAGE_LABELS = {
  初识: [[70, "相处和谐，略有好感"], [55, "客气友好，慢慢熟悉"], [40, "略显拘谨，需要时间"], [0, "第一印象偏远"]],
  交往中: [[70, "互动自然，愿意靠近"], [55, "表面和谐，内心保持距离"], [40, "忽冷忽热，节奏不稳"], [0, "越走越别扭"]],
  长期交往: [[70, "能走得长远"], [55, "客客气气，保持距离"], [40, "需要经营才稳"], [0, "长期易累"]],
  内心感受: [[70, "心里有对方"], [55, "忽冷忽热，态度随心"], [40, "安全感不足"], [0, "难以交付真心"]]
};

const RELATION_TYPES = [
  { id: "lover", name: "恋人", bodies: ["金星", "火星", "月亮", "太阳"] },
  { id: "past", name: "前世情人", bodies: ["月亮", "太阳", "上升", "金星"] },
  { id: "friend", name: "朋友", bodies: ["水星", "木星", "太阳"] },
  { id: "colleague", name: "同事", bodies: ["土星", "水星", "火星", "木星"] },
  { id: "mentor", name: "亦师亦友", bodies: ["土星", "木星", "太阳"] },
  { id: "family", name: "亲缘长幼", bodies: ["月亮", "土星", "太阳", "上升"] }
];

const STAGE_SETS = {
  romance: {
    names: ["初识", "交往中", "长期相处", "内心感受"],
    labels: {
      初识: STAGE_LABELS.初识,
      交往中: STAGE_LABELS.交往中,
      长期相处: [
        [70, "适合细水长流"], [55, "可长久往来，但要留空间"],
        [40, "长期需多沟通预期"], [0, "长跑容易耗尽耐心"]
      ],
      内心感受: STAGE_LABELS.内心感受
    }
  },
  peer: {
    names: ["初识", "熟识后", "长期相交", "内心感受"],
    labels: {
      初识: STAGE_LABELS.初识,
      熟识后: [
        [70, "熟了之后更自在"], [55, "表面和谐，仍有分寸"],
        [40, "忽冷忽热，节奏不稳"], [0, "熟识后仍别扭"]
      ],
      长期相交: [
        [70, "能长期共事或相交"], [55, "可维持礼貌往来"],
        [40, "长期相处要靠规则"], [0, "越久越累"]
      ],
      内心感受: STAGE_LABELS.内心感受
    }
  },
  elder: {
    names: ["初识印象", "相处磨合", "长期关系", "心理距离"],
    labels: {
      初识印象: [
        [70, "第一印象稳妥，容易产生信任"], [55, "客气有礼，尚需时间"],
        [40, "略显拘谨或代沟"], [0, "见面就有距离感"]
      ],
      相处磨合: [
        [70, "节奏能磨合，互相尊重"], [55, "表面和谐，边界清晰"],
        [40, "期待落差，需多解释"], [0, "磨合期容易顶牛"]
      ],
      长期关系: [
        [70, "能形成稳定的长幼/指导关系"], [55, "可长期往来，但不宜过度依赖"],
        [40, "需要明确角色与边界"], [0, "长期相处易累"]
      ],
      心理距离: [
        [70, "心里有对方，信任感尚可"], [55, "敬重有余，亲近不足"],
        [40, "安全感或理解不足"], [0, "难以真正交心"]
      ]
    }
  }
};

function ageFromBirth(birthTime) {
  if (!birthTime) return null;
  const d = new Date(String(birthTime).replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * 根据性别、年龄差推断合盘语境，避免一律按情侣解读
 * @returns {{ mode: 'romance'|'peer'|'elder', romanticOk: boolean, ageGap: number|null, sameGender: boolean|null, label: string }}
 */
function inferBondContext(profileA, profileB) {
  const ageA = ageFromBirth(profileA && profileA.birthTime);
  const ageB = ageFromBirth(profileB && profileB.birthTime);
  const gA = (profileA && profileA.gender) || "";
  const gB = (profileB && profileB.gender) || "";
  const ageGap = (ageA != null && ageB != null) ? Math.abs(ageA - ageB) : null;
  const sameGender = (gA && gB) ? (gA === gB) : null;

  if (ageGap != null && ageGap >= 18) {
    return {
      mode: "elder",
      romanticOk: false,
      ageGap: ageGap,
      sameGender: sameGender,
      label: "年龄差较大，更宜按长幼、亲缘或师生语境解读"
    };
  }
  if (sameGender === true) {
    return {
      mode: "peer",
      romanticOk: false,
      ageGap: ageGap,
      sameGender: true,
      label: "同性档案，默认按朋友/共事关系解读"
    };
  }
  if (ageGap != null && ageGap >= 12) {
    return {
      mode: "elder",
      romanticOk: false,
      ageGap: ageGap,
      sameGender: sameGender,
      label: "年龄差明显，弱化恋爱取向，偏指导或长幼关系"
    };
  }
  if (sameGender === false && (ageGap == null || ageGap < 12)) {
    return {
      mode: "romance",
      romanticOk: true,
      ageGap: ageGap,
      sameGender: false,
      label: "异性且年龄接近，可参考情感关系，也不排除朋友/共事"
    };
  }
  return {
    mode: "peer",
    romanticOk: false,
    ageGap: ageGap,
    sameGender: sameGender,
    label: "信息不足或关系未定，按一般人际合盘解读"
  };
}

function relationBoost(bond, typeId) {
  if (bond.mode === "elder") {
    if (typeId === "family" || typeId === "mentor") return 1.35;
    if (typeId === "friend" || typeId === "colleague") return 1.15;
    if (typeId === "lover" || typeId === "past") return 0.45;
  }
  if (bond.mode === "peer") {
    if (typeId === "friend" || typeId === "colleague") return 1.25;
    if (typeId === "mentor") return 1.05;
    if (typeId === "family") return 0.7;
    if (typeId === "lover" || typeId === "past") return 0.5;
  }
  // romance-capable: keep romantic types available but don't bury friendship
  if (typeId === "friend" || typeId === "colleague") return 1.05;
  if (typeId === "family") return 0.65;
  return 1;
}

function norm360(x) {
  x = x % 360;
  return x < 0 ? x + 360 : x;
}

function angSep(a, b) {
  const d = Math.abs(norm360(a) - norm360(b));
  return Math.min(d, 360 - d);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function pickLabel(score, rows) {
  for (let i = 0; i < rows.length; i++) {
    if (score >= rows[i][0]) return rows[i][1];
  }
  return rows[rows.length - 1][1];
}

/** 保序去重（忽略空白差异） */
function uniqueTexts(arr) {
  const seen = {};
  const out = [];
  (arr || []).forEach(function (t) {
    const k = String(t || "").replace(/\s+/g, "");
    if (!k || seen[k]) return;
    seen[k] = 1;
    out.push(t);
  });
  return out;
}

function pairKey(a, b) {
  return a < b ? a + "|" + b : b + "|" + a;
}

function bodyLon(chart, name) {
  if (!chart) return null;
  if (chart.lons && chart.lons[name] != null) return chart.lons[name];
  if (name === "上升" && chart.asc) return chart.asc.lon;
  const hit = (chart.placements || []).find(function (p) { return p.name === name; });
  return hit ? hit.lon : null;
}

function collectSynastryAspects(chartA, chartB) {
  const found = [];
  KEY_BODIES.forEach(function (aName) {
    const lonA = bodyLon(chartA, aName);
    if (lonA == null) return;
    KEY_BODIES.forEach(function (bName) {
      const lonB = bodyLon(chartB, bName);
      if (lonB == null) return;
      const sep = angSep(lonA, lonB);
      let best = null;
      ASPECT_DEFS.forEach(function (asp) {
        const delta = Math.abs(sep - asp.angle);
        if (delta <= asp.orb && (!best || delta < best.orbUsed)) {
          best = {
            a: aName, b: bName, aspect: asp.name, nature: asp.nature,
            weight: asp.weight, sep: Math.round(sep * 10) / 10,
            orbUsed: Math.round(delta * 10) / 10
          };
        }
      });
      if (best) found.push(best);
    });
  });
  found.sort(function (x, y) { return x.orbUsed - y.orbUsed; });
  return found;
}

function softHardScores(aspects) {
  let soft = 0, hard = 0;
  aspects.forEach(function (a) {
    const closeness = 1 - a.orbUsed / 8;
    const w = a.weight * (0.55 + 0.45 * closeness);
    if (a.nature === "soft") soft += w;
    else hard += w;
  });
  return { soft: soft, hard: hard };
}

function scoreDimension(aspects, dimKey) {
  const rule = DIM_RULES[dimKey];
  let soft = 0, hard = 0, hits = 0;
  aspects.forEach(function (a) {
    const aIn = rule.bodies.indexOf(a.a) >= 0;
    const bIn = rule.bodies.indexOf(a.b) >= 0;
    if (!aIn && !bIn) return;
    hits += 1;
    const closeness = 1 - a.orbUsed / 8;
    const w = a.weight * (0.5 + 0.5 * closeness) * (aIn && bIn ? 1.25 : 1);
    if (a.nature === "soft") soft += w * rule.softBoost;
    else hard += w * rule.hardBoost;
  });
  // 基础分 + 软相位加分 - 硬相位扣分（硬相位对激情/吸引不完全是坏事）
  let base = 48;
  if (dimKey === "激情" || dimKey === "吸引") {
    base = 42 + soft * 1.15 + hard * 0.55;
  } else if (dimKey === "沟通") {
    base = 50 + soft * 1.4 - hard * 1.35;
  } else {
    base = 48 + soft * 1.25 - hard * 1.0;
  }
  if (!hits) base = 44 + (soft - hard) * 0.25;
  return Math.round(clamp(base, 12, 92));
}

function scoreRelation(aspects, type) {
  let soft = 0, hard = 0;
  aspects.forEach(function (a) {
    const aIn = type.bodies.indexOf(a.a) >= 0;
    const bIn = type.bodies.indexOf(a.b) >= 0;
    if (!aIn && !bIn) return;
    const w = a.weight * (1 - a.orbUsed / 10) * (aIn && bIn ? 1.15 : 0.9);
    if (a.nature === "soft") soft += w;
    else hard += w;
  });
  let score = 38 + soft * 1.6 - hard * 0.55;
  if (type.id === "colleague") score = 36 + soft * 1.35 + hard * 0.35;
  if (type.id === "friend") score = 40 + soft * 1.45 - hard * 0.4;
  return Math.round(clamp(score, 15, 92));
}

function buildFitPoints(aspects, nameA, nameB, bond) {
  const soft = aspects.filter(function (a) { return a.nature === "soft"; }).slice(0, 10);
  const points = [];
  const seenKey = {};
  const romantic = !!(bond && bond.romanticOk);
  soft.forEach(function (a) {
    const key = pairKey(a.a, a.b);
    if (seenKey[key]) return;
    let text = "";
    if ((a.a === "金星" || a.b === "金星") && (a.a === "火星" || a.b === "火星")) {
      text = romantic
        ? "金星与火星" + a.aspect + "：彼此有吸引力，情绪与欲望容易被点燃。"
        : "金星与火星" + a.aspect + "：气场合拍，一起做事或相处时容易被带动。";
    } else if ((a.a === "太阳" || a.b === "太阳") && (a.a === "月亮" || a.b === "月亮")) {
      text = "太阳与月亮" + a.aspect + "：核心意志与情绪感受能互相看见，容易产生「懂我」的感觉。";
    } else if ((a.a === "木星" || a.b === "木星") && (a.a === "土星" || a.b === "土星")) {
      text = "木星与土星" + a.aspect + "：扩张与规矩能互补，共同做事时一方托举、一方把关。";
    } else if ((a.a === "木星" || a.b === "木星") && (a.a === "太阳" || a.b === "太阳")) {
      text = "太阳与木星" + a.aspect + "：在成长、视野或机遇上容易互相照亮。";
    } else if ((a.a === "金星" || a.b === "金星") && (a.a === "木星" || a.b === "木星")) {
      text = "金星与木星" + a.aspect + "：一起分享资源、乐趣时更轻松，物质与情感支持都可能加分。";
    } else if ((a.a === "金星" || a.b === "金星") && (a.a === "月亮" || a.b === "月亮")) {
      text = romantic
        ? "金星与月亮" + a.aspect + "：温柔与喜好同频，亲密时更有被疼爱的感觉。"
        : "金星与月亮" + a.aspect + "：相处氛围偏柔和，彼此更容易感到被接纳。";
    } else if ((a.a === "金星" || a.b === "金星") && (a.a === "太阳" || a.b === "太阳")) {
      text = "太阳与金星" + a.aspect + "：欣赏与被欣赏较顺，面子与好感都容易给到对方。";
    } else if (a.a === "水星" || a.b === "水星") {
      text = "水星相关的" + a.aspect + "（" + a.a + "—" + a.b + "）：沟通频道较顺，聊兴趣或日常时不容易冷场。";
    } else if (a.a === "月亮" || a.b === "月亮") {
      text = romantic
        ? "月亮相关的" + a.aspect + "（" + a.a + "—" + a.b + "）：情绪上愿意靠近，生活节奏合拍时更有安全感。"
        : "月亮相关的" + a.aspect + "（" + a.a + "—" + a.b + "）：情绪上较容易接纳对方，相处氛围更安定。";
    } else if (a.a === "金星" || a.b === "金星") {
      text = "金星相关的" + a.aspect + "（" + a.a + "—" + a.b + "）：喜好与价值感更易同频，相处时少一分刺。";
    } else if (a.a === "木星" || a.b === "木星") {
      text = "木星相关的" + a.aspect + "（" + a.a + "—" + a.b + "）：一起做事或学习时更容易开阔、有贵人感。";
    } else {
      text = a.a + "与" + a.b + "的" + a.aspect + "，让两人在某个主题上更容易同频。";
    }
    if (!text) return;
    seenKey[key] = 1;
    points.push(text);
  });
  if (!points.length) {
    points.push(nameA + "与" + nameB + "之间有可经营的空间，先从共同兴趣与日常节奏试起。");
  }
  return uniqueTexts(points).slice(0, 4);
}

function buildConflictPoints(aspects, bond) {
  const hard = aspects.filter(function (a) { return a.nature === "hard"; }).slice(0, 10);
  const points = [];
  const seenKey = {};
  const romantic = !!(bond && bond.romanticOk);
  hard.forEach(function (a) {
    const key = pairKey(a.a, a.b) + "|" + a.aspect;
    if (seenKey[key]) return;
    let text = "";
    if ((a.a === "金星" || a.b === "金星") && (a.a === "土星" || a.b === "土星")) {
      text = romantic
        ? "金星与土星" + a.aspect + "：感情里易感到责任、距离或不够热情，宜放慢建立信任。"
        : "金星与土星" + a.aspect + "：相处易拘束或责任感过重，宜把期待说清楚。";
    } else if ((a.a === "月亮" || a.b === "月亮") && (a.a === "火星" || a.b === "火星")) {
      text = "月亮与火星" + a.aspect + "：情绪融合有难度，一方想亲近时另一方可能防御。";
    } else if ((a.a === "月亮" || a.b === "月亮") && (a.a === "土星" || a.b === "土星")) {
      text = "月亮与土星" + a.aspect + "：安全感来得慢，亲近时易先竖起边界。";
    } else if ((a.a === "水星" || a.b === "水星") && (a.a === "火星" || a.b === "火星")) {
      text = "水星与火星" + a.aspect + "：一说话就容易带火，争论时宜先复述再回应。";
    } else if ((a.a === "水星" || a.b === "水星") && (a.a === "土星" || a.b === "土星")) {
      text = "水星与土星" + a.aspect + "：表达易显冷或慢半拍，重要事适合写清楚再谈。";
    } else if ((a.a === "水星" || a.b === "水星")) {
      text = "水星相关的" + a.aspect + "（" + a.a + "—" + a.b + "）：表达方式不同，容易鸡同鸭讲。";
    } else if ((a.a === "火星" || a.b === "火星") && (a.a === "土星" || a.b === "土星")) {
      text = "火星与土星" + a.aspect + "：想推进时易被卡住，行动节奏不一致，忌硬刚。";
    } else if ((a.a === "金星" || a.b === "金星") && (a.a === "火星" || a.b === "火星")) {
      text = romantic
        ? "金星与火星" + a.aspect + "：激情与节奏可能拉扯，需坦诚谈需求。"
        : "金星与火星" + a.aspect + "：喜好与节奏容易拉扯，先对齐目标再行动。";
    } else if ((a.a === "太阳" || a.b === "太阳") && (a.a === "土星" || a.b === "土星")) {
      text = "太阳与土星" + a.aspect + "：权威感或自我表达易受压，相处时少用评判语气。";
    } else {
      text = a.a + "与" + a.b + "的" + a.aspect + "带来张力，相处时宜留白、少猜忌。";
    }
    if (!text) return;
    seenKey[key] = 1;
    points.push(text);
  });
  if (!points.length) {
    points.push("硬相位不多，矛盾多来自期待落差；把话说清楚比冷战更有效。");
  }
  return uniqueTexts(points).slice(0, 3);
}

function buildAdvice(dims, softPct, bond) {
  const tips = [];
  const romantic = !!(bond && bond.romanticOk);
  if (bond && bond.mode === "elder") {
    tips.push("年龄或角色差较明显，先尊重边界与辈分感，少用恋爱话术套用。");
  }
  if (bond && bond.sameGender === true) {
    tips.push("更适合从友谊、合作或兴趣同频切入，不必先往情侣关系上定义。");
  }
  if (dims.沟通 < 45) tips.push("沟通先求「听懂」，再求「说服」；重要事用文字确认，少在情绪顶峰拍板。");
  if (dims.亲密 < 45) {
    tips.push(romantic
      ? "亲密感靠稳定小行动积累：定期见面、固定回消息，比一次大浪漫更有效。"
      : "信任感靠稳定小行动积累：准时回应、说到做到，比一次热情表态更有效。");
  }
  if (dims.激情 >= 65 && dims.亲密 < 50) {
    tips.push(romantic
      ? "火花有了，记得补安全感；热度来得快，也要用日常托住。"
      : "互动热度不低，记得补稳定感；热情来得快，也要用规则与节奏托住。");
  }
  if (dims.缘分 >= 60) tips.push("缘分底子不错，别急着定性；先把相处节奏磨顺，关系会自己长出来。");
  if (softPct >= 60) tips.push("整体偏和谐，适合一起做事或慢慢靠近；有分歧时用幽默化解，少翻旧账。");
  else if (tips.length < 3) tips.push("张力不低，适合把规则说在前头：边界、频率、金钱与时间，减少误读。");
  return uniqueTexts(tips).slice(0, 3);
}

function summaryQuote(dims, softPct, bond) {
  const romantic = !!(bond && bond.romanticOk);
  if (bond && bond.mode === "elder") {
    if (softPct >= 60) return "长幼有序时，尊重比亲近更重要；先立信任，再谈深交。";
    return "代际或角色差异在，先对齐期待与边界，关系才稳。";
  }
  if (bond && bond.mode === "peer" && !romantic) {
    if (softPct >= 65 && dims.沟通 >= 55) return "同频处不错，先当可靠的朋友或搭档，再看关系如何生长。";
    if (dims.沟通 < 40) return "要走得近，先学会把话说到对方能听懂的地方。";
    if (softPct < 45) return "张力不低，把合作规则说在前，比强行亲密更管用。";
    return "关系可以走远，关键是双方都愿意慢慢调整节奏。";
  }
  if (softPct >= 65 && dims.亲密 >= 55) {
    return romantic ? "若要长相厮守，先把日常过成互相托举。" : "若要长期相交，先把日常过成互相托举。";
  }
  if (softPct >= 55 && dims.激情 >= 60) {
    return romantic ? "吸引力不缺，差的是把火花落成安全感。" : "互动热度不缺，差的是把热情落成稳定节奏。";
  }
  if (dims.沟通 < 40) {
    return romantic ? "若要走得更近，先学会把话说到对方心里。" : "若要合作顺畅，先学会把话说到对方心里。";
  }
  if (softPct < 45) {
    return romantic ? "张力不低，把提醒当提醒，别当宣战。" : "张力不低，先谈边界与节奏，少做情绪对攻。";
  }
  return "关系可以走远，关键是双方都愿意慢慢调整节奏。";
}

/**
 * @param {object} profileA
 * @param {object} profileB
 */
export function computeSynastry(profileA, profileB) {
  const chartA = profileA && profileA.chart;
  const chartB = profileB && profileB.chart;
  if (!chartA || !chartB) throw new Error("双方星盘不完整，无法合盘。");

  const nameA = profileA.nickname || "甲方";
  const nameB = profileB.nickname || "乙方";
  const bond = inferBondContext(profileA, profileB);
  const aspects = collectSynastryAspects(chartA, chartB);
  const { soft, hard } = softHardScores(aspects);
  const totalW = soft + hard || 1;
  const softPct = Math.round((soft / totalW) * 100);
  const hardPct = 100 - softPct;

  const dims = {};
  Object.keys(DIM_RULES).forEach(function (key) {
    const score = scoreDimension(aspects, key);
    dims[key] = {
      score: score,
      label: pickLabel(score, DIM_LABELS[key])
    };
  });

  const potential = Math.round(clamp(
    40 + soft * 2.1 - hard * 0.7 + (dims.缘分.score + dims.吸引.score) * 0.15,
    60,
    280
  ));
  const percentile = Math.round(clamp(28 + softPct * 0.55 + (potential - 120) * 0.12, 18, 88));

  const relations = RELATION_TYPES.map(function (t) {
    const raw = scoreRelation(aspects, t);
    const score = Math.round(clamp(raw * relationBoost(bond, t.id), 12, 92));
    return { id: t.id, name: t.name, score: score };
  }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);

  const stageSet = STAGE_SETS[bond.mode] || STAGE_SETS.peer;
  const usedStageLabels = {};
  const stages = stageSet.names.map(function (name) {
    let score = 48;
    if (name === "初识" || name === "初识印象") {
      score = Math.round((dims.吸引.score + dims.愉悦.score) / 2);
    } else if (name === "交往中" || name === "熟识后" || name === "相处磨合") {
      score = Math.round((dims.沟通.score + dims.愉悦.score + dims.激情.score) / 3);
    } else if (name === "长期交往" || name === "长期相处" || name === "长期相交" || name === "长期关系") {
      score = Math.round((dims.亲密.score + dims.缘分.score + dims.沟通.score) / 3);
    } else if (name === "内心感受" || name === "心理距离") {
      score = Math.round((dims.亲密.score + dims.缘分.score + (100 - Math.abs(softPct - 50))) / 3);
    }
    score = clamp(score, 20, 92);
    const rows = stageSet.labels[name] || STAGE_LABELS.初识;
    let label = pickLabel(score, rows);
    if (usedStageLabels[label]) {
      const alt = rows.find(function (r) { return r[1] !== label && !usedStageLabels[r[1]]; });
      if (alt) label = alt[1];
      else label = name + "阶段偏「" + label + "」";
    }
    usedStageLabels[label] = 1;
    return { name: name, score: score, label: label };
  });

  const fit = buildFitPoints(aspects, nameA, nameB, bond);
  const conflict = buildConflictPoints(aspects, bond);
  const dimScores = {
    沟通: dims.沟通.score,
    缘分: dims.缘分.score,
    愉悦: dims.愉悦.score,
    激情: dims.激情.score,
    亲密: dims.亲密.score,
    吸引: dims.吸引.score
  };
  const advice = buildAdvice(dimScores, softPct, bond);

  // 评价区再交叉去重：契合/矛盾/建议互不重复
  const usedEval = {};
  function takeUnique(list) {
    return (list || []).filter(function (t) {
      const k = String(t || "").replace(/\s+/g, "");
      if (!k || usedEval[k]) return false;
      usedEval[k] = 1;
      return true;
    });
  }
  const fitU = takeUnique(fit);
  const conflictU = takeUnique(conflict);
  const adviceU = takeUnique(advice);

  return {
    nameA: nameA,
    nameB: nameB,
    idA: profileA.id,
    idB: profileB.id,
    bond: bond,
    potential: potential,
    softPct: softPct,
    hardPct: hardPct,
    percentile: percentile,
    quote: summaryQuote(dimScores, softPct, bond),
    relations: relations,
    stages: stages,
    dimensions: Object.keys(dims).map(function (k) {
      return { name: k, score: dims[k].score, label: dims[k].label };
    }),
    fit: fitU.length ? fitU : fit,
    conflict: conflictU.length ? conflictU : conflict,
    advice: adviceU.length ? adviceU : advice,
    aspectCount: aspects.length,
    topAspects: aspects.slice(0, 8)
  };
}

export function cacheKey(idA, idB) {
  const a = String(idA || "");
  const b = String(idB || "");
  return "diary-synastry-v3:" + (a < b ? a + ":" + b : b + ":" + a);
}

export function loadCachedSynastry(idA, idB) {
  try {
    const raw = JSON.parse(localStorage.getItem(cacheKey(idA, idB)) || "null");
    return raw && raw.result ? raw : null;
  } catch (e) {
    return null;
  }
}

export function saveCachedSynastry(idA, idB, result) {
  try {
    localStorage.setItem(cacheKey(idA, idB), JSON.stringify({
      idA: idA, idB: idB, result: result, savedAt: new Date().toISOString()
    }));
  } catch (e) { /* ignore */ }
}
