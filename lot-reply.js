/**
 * 求签：在固定签文基础上，按问题语境生成对应回复（本地拼装，无需联网）。
 */
(function (root) {
  function hashStr(s) {
    var h = 2166136261;
    var str = String(s || "");
    for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function pick(arr, h) {
    var n = arr.length;
    if (!n) return "";
    return arr[(h >>> 0) % n];
  }

  function clipQ(q, n) {
    var t = String(q || "").replace(/[\r\n]+/g, " ").trim();
    t = t.replace(/[？?！!。．…～~]+$/g, "");
    if (t.length > (n || 18)) t = t.slice(0, n || 18).replace(/[，,、\s]+$/, "") + "…";
    return t || "你问的这件事";
  }

  /** 签运基调 */
  function lotTone(rank) {
    var r = String(rank || "");
    if (r.indexOf("上上") >= 0) return "great";
    if (r.indexOf("上吉") >= 0) return "good";
    if (r.indexOf("中吉") >= 0 || r.indexOf("小吉") >= 0) return "ok";
    if (r.indexOf("下平") >= 0) return "pause";
    return "wait"; // 中平
  }

  /** 问题主题 */
  var THEMES = [
    { id: "love", re: /爱|恋|喜欢|暧昧|复合|分手|对象|男友|女友|他|她|TA|表白|结婚|感情|关系|冷战|追|错过/i },
    { id: "work", re: /工作|职场|老板|同事|升职|加薪|项目|面试|跳槽|辞职|裁|offer|学业|考试|考研|论文|作业|学习/i },
    { id: "money", re: /钱|财|收入|理财|投资|房|买|卖|欠|还贷|彩票|中奖|赚钱|亏/i },
    { id: "health", re: /身体|健康|病|睡|失眠|累|痛|医|手术|怀孕|减肥/i },
    { id: "family", re: /家|父母|爸|妈|亲戚|孩子|孩子|婆|公|结婚彩礼|催婚/i },
    { id: "move", re: /搬家|出国|旅行|离开|去|走|换城市|定居/i },
    { id: "self", re: /自己|选择|人生|方向|意义|迷茫|未来|改变|开始|放弃/i }
  ];

  function detectTheme(q) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].re.test(q)) return THEMES[i].id;
    }
    return "general";
  }

  /**
   * 提问类型：yesno / continue / when / how / outcome / open
   */
  function detectAsk(q) {
    var bare = String(q || "").replace(/[？?！!。．…～~\s]+$/g, "");
    if (/还(要|能)?不要|要不要|该不该|能不能|可不可以|行不行|会不会|是否|有没有|是不是|值不值|离不离|分不分|合不合|成不成|爱不爱|喜不喜欢/.test(q)) {
      if (/继续|坚持|等|留下|回头|复合|追/.test(q)) return "continue";
      return "yesno";
    }
    // 「他还爱我吗 / 能成吗」类是非问
    if (/[吗么]$/.test(bare) && /爱|喜欢|成|行|值|会|能|该|要|成功|分手|复合|跳槽|留下/.test(q)) {
      if (/继续|坚持|等下去|留下/.test(q)) return "continue";
      return "yesno";
    }
    if (/什么时候|何时|多久|等到|还要等多|几号|哪天/.test(q)) return "when";
    if (/怎么|如何|怎样|怎样做|怎么办|如何是好/.test(q)) return "how";
    if (/结果|会怎样|结局|前景|希望|成功率|成吗/.test(q)) return "outcome";
    return "open";
  }

  /** 各主题 × 运势 的针对性短答 */
  var ANSWERS = {
    love: {
      great: [
        "你问的感情事，这支签偏亮：值得靠近，也适合把真心说清楚。",
        "感情上有回应的可能，主动一点会更好；别憋着，轻轻开口就行。"
      ],
      good: [
        "方向大体对，但别催结果。把话说软一点、慢一点，关系会松动。",
        "有转机，但要给对方空间。先稳住自己，再决定要不要往前迈。"
      ],
      ok: [
        "可以试，但别一次押上全部。先观察、小步靠近，看对方是否接得住。",
        "有希望，关键在细节：态度、沟通、边界。把一件小事做好，比急着定终身更重要。"
      ],
      wait: [
        "眼下不宜硬推。先把现状看清，情绪稳了再决定要不要继续。",
        "暂时别下结论。先休息、先想清楚自己要什么，比逼对方回应更有用。"
      ],
      pause: [
        "这段先收一收更合适。保护力气，换个节奏或换个问法，反而更安。",
        "暂时不宜加码。先把自己照顾好，关系该不该继续，等心静一点再定。"
      ]
    },
    work: {
      great: [
        "你问的工作/学业，签意偏顺：适合主动出手，小步推进会有反馈。",
        "有机会，别只在心里盘。递一份简历、说一句想法，好运更容易跟着来。"
      ],
      good: [
        "大方向没错，但还要一点耐心。把准备做足，比急着要结果更稳。",
        "会有回音，先把材料、话说清楚；不必催，节奏对了结果会跟上来。"
      ],
      ok: [
        "可以推进，但留后路。别一次赌上全部，拆成小目标更稳妥。",
        "事可成，成在细节。把眼前这一步做好，答案就藏在过程里。"
      ],
      wait: [
        "眼下不宜硬闯。先摸清情况，再决定要不要动；静一静不等于没路。",
        "先别加码。把现状看明白，休息也好、观望也好，比盲目推进强。"
      ],
      pause: [
        "暂时收手更合适。保护精力，等条件转顺再动身，改道也可以。"
      ]
    },
    money: {
      great: ["钱财事这支签偏顺，适合稳妥推进，别贪大，小步更稳。"],
      good: ["有改善空间，但别冲动。先把账目和风险看清，再出手。"],
      ok: ["可以试，但留退路。别把全部压在一次机会上。"],
      wait: ["眼下宜观望，不宜加码。先稳住手头，再看下一步。"],
      pause: ["暂时不宜推进。先保本、保现金流，换节奏再谈也不迟。"]
    },
    health: {
      great: ["身体相关这支签偏安：按医嘱、规律作息，主动照顾自己会更好。"],
      good: ["整体可向好，但要耐心。休息和调整比硬扛更重要。"],
      ok: ["有改善空间，关键在日常细节：睡够、吃稳、少熬。"],
      wait: ["先别硬撑。把身体状况看清楚，必要时就医，比自己扛着强。"],
      pause: ["先收回节奏。休息是首要，等状态回升再谈其他计划。"]
    },
    family: {
      great: ["家事这支签偏和：适合把话说开，真心沟通会有回响。"],
      good: ["方向对了，把语气放软一点，慢慢谈比硬碰更有效。"],
      ok: ["可以沟通，但别一次摊开全部。先从一件小事谈起。"],
      wait: ["眼下不宜硬谈。先稳住自己，看清彼此边界再开口。"],
      pause: ["暂时收一收更安。先保护自己的节奏，改个说法或换个时机再谈。"]
    },
    move: {
      great: ["关于走或留，这支签偏亮：主动迈一小步，会比空想更清楚。"],
      good: ["方向大体对，但别仓促。准备充分再动，耐心一点更好。"],
      ok: ["可以试，但留退路。小范围先试水，比一次定生死稳。"],
      wait: ["眼下不宜硬闯。先把现实条件列清，再决定动或不动。"],
      pause: ["暂时按兵不动更合适。保护力气，换个时机或换条路也可以。"]
    },
    self: {
      great: ["关于你自己的选择，这支签鼓励你迈一小步：心里已有光，行动会更实。"],
      good: ["你方向大致对，别急着一次想通。耐心一点，答案会更清楚。"],
      ok: ["可以试探，但别一次押上全部自我。小步验证，更踏实。"],
      wait: ["先别逼自己立刻定论。休息一下、把问题放亮处看，会更清楚。"],
      pause: ["暂时收回手。先养力气，换个问法或节奏，仍然可以走得安。"]
    },
    general: {
      great: ["就你问的这件事，签意偏顺：宜主动迈一小步，好运更容易跟上。"],
      good: ["方向对了，还差一点耐心。先把话说清楚、事做扎实，再看结果。"],
      ok: ["可以推进，但留退路。小步前进，比一次赌上全部更好。"],
      wait: ["眼下不宜加码。先看清现状，静候比硬闯更合适。"],
      pause: ["暂时收回手更安。保护力气，换节奏或换问法，仍然可喜。"]
    }
  };

  /** 针对提问类型的收束句 */
  var ASK_CLOSER = {
    yesno: {
      great: ["结论偏「可以」：去做，但带着清醒。", "答案偏肯定：值得一试。"],
      good: ["偏「可以，但慢一点」：先准备，再行动。", "不是硬否，也不是立刻冲；稳着来更顺。"],
      ok: ["偏「可以试」：试可以，梭哈不行。", "有机会，但别一次定生死。"],
      wait: ["偏「先别急着定」：再等等、再看看。", "眼下更像「再观望」，不是彻底没戏。"],
      pause: ["偏「暂时先搁」：现在推进不合适。", "答案更接近「先停一停，再另寻路」。"]
    },
    continue: {
      great: ["继续可以，而且适合你主动一点。"],
      good: ["可以继续，但别催；把话说软、把心放稳。"],
      ok: ["能继续试，但边走边看，留退路。"],
      wait: ["先别硬撑着继续；停一停看清，再决定要不要往下走。"],
      pause: ["这段宜先收，不必硬撑。改道或换节奏更安。"]
    },
    when: {
      great: ["时机偏近：近几天主动一点，比干等更有用。"],
      good: ["还要一点耐心，催也催不来；把准备做好，时机会跟着到。"],
      ok: ["不会一夜到齐，但细节推进会缩短等待。"],
      wait: ["现在还不是催的时候；先安住，等局面松动。"],
      pause: ["先别卡在「什么时候」；把力气收回来，时机另算。"]
    },
    how: {
      great: ["做法：主动迈一小步，把心意说明白。"],
      good: ["做法：把话说软、把事做细，耐心跟进。"],
      ok: ["做法：拆成小事，一步一步验证。"],
      wait: ["做法：先停、先看、先休息，再动手。"],
      pause: ["做法：先收手、护力气，换条路再试。"]
    },
    outcome: {
      great: ["前景偏亮，努力会有回音。"],
      good: ["前景可期，但要耐心，急不来。"],
      ok: ["前景有戏，关键看你怎么走细节。"],
      wait: ["前景暂不明，硬判没必要；先稳住。"],
      pause: ["眼前这条路不顺，改道仍可能有好结果。"]
    },
    open: {
      great: ["签鼓励你往前走一小步。"],
      good: ["签提醒你：对了方向，再加耐心。"],
      ok: ["签提醒你：可试，但留余地。"],
      wait: ["签提醒你：先看清，再决定动不动。"],
      pause: ["签提醒你：先收回手，换节奏更安。"]
    }
  };

  function replyLot(question, lot) {
    var q = String(question || "").trim() || "今晚想问的事";
    var rank = (lot && lot.rank) || "中平";
    var title = (lot && lot.title) || "今日签";
    var base = (lot && lot.text) || "";
    var tone = lotTone(rank);
    var theme = detectTheme(q);
    var ask = detectAsk(q);
    var h = hashStr(q + "|" + rank + "|" + title);
    var shortQ = clipQ(q, 20);

    var themePool = (ANSWERS[theme] || ANSWERS.general)[tone] || ANSWERS.general.wait;
    var askPool = (ASK_CLOSER[ask] || ASK_CLOSER.open)[tone] || ASK_CLOSER.open.wait;
    var main = pick(themePool, h);
    var closer = pick(askPool, (h >>> 3));
    var lead = pick([
      "你问「" + shortQ + "」——",
      "关于「" + shortQ + "」：",
      "针对你问的「" + shortQ + "」，"
    ], (h >>> 5));

    var reply = lead + main + closer;
    if (reply.length > 110) {
      reply = lead + main;
    }
    return {
      question: q,
      shortQuestion: shortQ,
      rank: rank,
      title: title,
      lotText: base,
      tone: tone,
      theme: theme,
      reply: reply
    };
  }

  root.LotReply = { replyLot: replyLot, lotTone: lotTone };
})(typeof globalThis !== "undefined" ? globalThis : this);
