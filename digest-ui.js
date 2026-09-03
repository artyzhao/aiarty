(function () {
  var I18N = {
    zh: {
      title: "每日精选",
      navAstro: "占星",
      navInvest: "投资",
      navAi: "AI",
      navWork: "工作",
      latestKicker: "最新",
      latest: "今日更新",
      astroLead: "当日天文学 / 占星学星象，及订阅栏目",
      investLead: "长期资金、周期与个人理财",
      aiLead: "研究访谈、工程现场与中国观察",
      workLead: "宏观现场、利率与信用",
      diary: "星星日记",
      calendar: "星星日历",
      astroSky: "天文学 · 今夜可见",
      signs: "占星 · 日月金水火星座",
      aspects: "主要相位与影响",
      influence: "对你的影响",
      mood: "心情",
      wealth: "财富",
      work: "工作",
      love: "感情",
      podcast: "播客",
      article: "文章",
      emptyFeed: "暂无条目",
      emptyAstro: "暂无天文学条目，请先运行 python3 fetch_stars.py",
      emptyAspect: "今日无主要相位入界。",
      failPrefix: "未能读取：",
      noData: "尚未生成订阅数据。在项目目录运行 python3 fetch_digest.py",
      footer: "摘要来自各栏目公开 RSS / 作者页，点标题阅读原文。本页独立于 A 股观察与星星日历。",
      sub: "订阅",
      sky: "星象",
      needFetch: "打开本页前请先拉取订阅",
      today: "今天",
      yesterday: "昨天",
      moonFallback: "月相",
      updating: "正在拉取最新…",
      updatedOk: "已更新",
      updateFail: "仍显示上次数据",
      weekday: ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
    },
    en: {
      title: "Daily Brief",
      navAstro: "Astrology",
      navInvest: "Investing",
      navAi: "AI",
      navWork: "Work",
      latestKicker: "Latest",
      latest: "Today's Updates",
      astroLead: "Today's sky, aspects, and subscribed shows",
      investLead: "Long-term capital, cycles, and personal finance",
      aiLead: "Research interviews, engineering, and China",
      workLead: "Markets, rates, and the real economy",
      diary: "Star Diary",
      calendar: "Star Calendar",
      astroSky: "Astronomy · Visible tonight",
      signs: "Signs · Sun, Moon, Mercury, Venus, Mars",
      aspects: "Key aspects and effects",
      influence: "What it means for you",
      mood: "Mood",
      wealth: "Wealth",
      work: "Work",
      love: "Love",
      podcast: "Podcast",
      article: "Article",
      emptyFeed: "No items",
      emptyAstro: "No astronomy items. Run python3 fetch_stars.py first.",
      emptyAspect: "No major aspects in orb today.",
      failPrefix: "Could not load: ",
      noData: "No feed data yet. Run python3 fetch_digest.py",
      footer: "Titles and excerpts come from public RSS / author pages. Open the original for the full piece.",
      sub: "Feeds",
      sky: "Sky",
      needFetch: "Fetch feeds before opening this page",
      today: "Today",
      yesterday: "Yesterday",
      moonFallback: "Moon",
      updating: "Updating…",
      updatedOk: "Updated",
      updateFail: "Showing last saved data",
      weekday: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    }
  };
  var PLANET_EN = {
    "太阳": "Sun", "月亮": "Moon", "水星": "Mercury", "金星": "Venus", "火星": "Mars",
    "木星": "Jupiter", "土星": "Saturn", "天王星": "Uranus", "海王星": "Neptune", "冥王星": "Pluto"
  };
  var SIGN_EN = {
    "白羊": "Aries", "金牛": "Taurus", "双子": "Gemini", "巨蟹": "Cancer",
    "狮子": "Leo", "处女": "Virgo", "天秤": "Libra", "天蝎": "Scorpio",
    "射手": "Sagittarius", "摩羯": "Capricorn", "水瓶": "Aquarius", "双鱼": "Pisces"
  };
  var ASPECT_EN = {
    "合相": "Conjunction", "六分相": "Sextile", "刑相": "Square",
    "拱相": "Trine", "冲相": "Opposition"
  };
  var MOON_EN = {
    "新月": "New Moon", "娥眉月": "Waxing Crescent", "上弦月": "First Quarter",
    "盈凸月": "Waxing Gibbous", "满月": "Full Moon", "亏凸月": "Waning Gibbous",
    "下弦月": "Last Quarter", "残月": "Waning Crescent"
  };
  var MONTH_EN = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  var lang = "zh";
  try {
    var saved = localStorage.getItem("digest-lang");
    if (saved === "en" || saved === "zh") lang = saved;
  } catch (e) { /* ignore */ }

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || (I18N.zh[key] || key);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shanghaiParts(date) {
    var d = date || new Date();
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(d);
    var map = {};
    parts.forEach(function (p) { if (p.type !== "literal") map[p.type] = p.value; });
    var hour = Number(map.hour); if (hour === 24) hour = 0;
    return { y: Number(map.year), m: Number(map.month), d: Number(map.day), h: hour, min: Number(map.minute) };
  }
  function ymd(p) { return p.y + "-" + String(p.m).padStart(2, "0") + "-" + String(p.d).padStart(2, "0"); }
  function addDays(p, n) {
    var dt = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  function dateLabel(ts) {
    if (!ts) return "";
    var p = shanghaiParts(new Date(ts * 1000));
    var today = shanghaiParts();
    var yest = addDays(today, -1);
    var hh = String(p.h).padStart(2, "0") + ":" + String(p.min).padStart(2, "0");
    if (ymd(p) === ymd(today)) return t("today") + " " + hh;
    if (ymd(p) === ymd(yest)) return t("yesterday");
    if (lang === "en") return MONTH_EN[p.m - 1].slice(0, 3) + " " + p.d;
    return p.m + "月" + p.d + "日";
  }
  function isFresh(ts, hours) {
    if (!ts) return false;
    return (Date.now() / 1000 - ts) <= (hours || 36) * 3600;
  }
  function fmtDuration(min) {
    min = Number(min) || 0;
    if (!min) return "";
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (lang === "en") {
      if (h && m) return h + "h " + m + "m";
      if (h) return h + "h";
      return m + " min";
    }
    if (h && m) return h + " 小时 " + m + " 分钟";
    if (h) return h + " 小时";
    return m + " 分钟";
  }
  function itemTitle(item) {
    if (lang === "zh") return item.titleZh || item.title || "";
    return item.title || item.titleZh || "";
  }
  function itemSummary(item) {
    if (lang === "zh") return item.summaryZh || item.summary || "";
    return item.summary || item.summaryZh || "";
  }
  function secName(sec) {
    if (lang === "en") return sec.nameEn || sec.name || "";
    return sec.name || sec.nameEn || "";
  }

  function paintMoon(el, frac, waxing) {
    if (!el) return;
    var k = Math.max(0, Math.min(1, Number(frac) || 0));
    var r = 28, cx = 32, cy = 32;
    var uid = "m" + Math.random().toString(36).slice(2, 8);
    var svg = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs>';
    svg += '<clipPath id="' + uid + 'clip"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/></clipPath></defs>';
    var lit = "#d8d8d8", dark = "#2a2a2a", clip = "url(#" + uid + "clip)";
    if (k < 0.02) svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + dark + '"/>';
    else if (k > 0.98) svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + lit + '"/>';
    else {
      var offset = (2 * k - 1) * r;
      if (!waxing) offset = -offset;
      if (k >= 0.5) {
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + lit + '"/>';
        svg += '<g clip-path="' + clip + '"><circle cx="' + (cx - offset) + '" cy="' + cy + '" r="' + r + '" fill="' + dark + '"/></g>';
      } else {
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + dark + '"/>';
        svg += '<g clip-path="' + clip + '"><circle cx="' + (cx + offset) + '" cy="' + cy + '" r="' + r + '" fill="' + lit + '"/></g>';
      }
    }
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#111" stroke-width="1.2"/></svg>';
    el.innerHTML = svg;
  }

  function signLabel(b) {
    if (lang !== "en") return b.label || ((b.sign || "") + "座");
    var en = SIGN_EN[b.sign] || "";
    var label = b.label || "";
    if (en && label) return label.replace(/[\u4e00-\u9fff]+座/, en + " ").replace(/\s+/g, " ").trim();
    return en || label;
  }
  function planetName(name) {
    if (lang !== "en") return name;
    return PLANET_EN[name] || name;
  }
  function aspectName(name) {
    if (lang !== "en") return name;
    return ASPECT_EN[name] || name;
  }
  function moonPhaseText(phase) {
    if (lang !== "en") return phase || t("moonFallback");
    return MOON_EN[phase] || (window.DIGEST_DATA && window.DIGEST_DATA.astroEn && window.DIGEST_DATA.astroEn.moonPhase) || phase || t("moonFallback");
  }

  var stars = {};
  var diary = {};
  var digest = null;
  var moonPainted = false;

  function bindData() {
    stars = window.STARS_DATA || {};
    diary = stars.diary || {};
    digest = window.DIGEST_DATA || null;
  }

  function renderStaticCopy() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll(".lang-switch button").forEach(function (btn) {
      btn.classList.toggle("is-on", btn.getAttribute("data-lang") === lang);
    });

    var today = shanghaiParts();
    var dateSrc = (stars.date || (digest && digest.date) || ymd(today)).split("-");
    var y = Number(dateSrc[0]);
    var m = Number(dateSrc[1]);
    var d = Number(dateSrc[2]);
    var weekdayIdx = (new Date(y, m - 1, d).getDay() + 6) % 7;
    var weekdays = I18N[lang].weekday;
    if (lang === "en") {
      document.getElementById("date-line").textContent =
        weekdays[weekdayIdx] + ", " + MONTH_EN[m - 1] + " " + d + ", " + y;
    } else {
      document.getElementById("date-line").textContent =
        y + "年" + m + "月" + d + "日  " + (stars.weekday || (digest && digest.weekday) || weekdays[weekdayIdx]);
    }
    var updatedBits = [];
    if (digest && digest.fetchedAt) updatedBits.push(t("sub") + " " + digest.fetchedAt);
    if (stars.updatedAt) updatedBits.push(t("sky") + " " + stars.updatedAt);
    document.getElementById("updated").textContent = updatedBits.join(" · ") || t("needFetch");
  }

  function renderAstro() {
    var astroEn = (digest && digest.astroEn) || {};
    var phase = stars.moonPhase || t("moonFallback");
    document.getElementById("moon-title").textContent =
      moonPhaseText(phase) + (stars.moonIllumination ? " · " + stars.moonIllumination : "");
    var moonLineZh = (diary.mod1 && diary.mod1.line) || stars.advice || "";
    document.getElementById("moon-sub").textContent =
      lang === "en" ? (astroEn.moonLine || moonLineZh) : moonLineZh;
    var blessingZh = diary.blessing || stars.advice || "";
    document.getElementById("blessing").textContent =
      lang === "en" ? (astroEn.blessing || blessingZh) : (blessingZh || t("moonFallback"));
    if (!moonPainted) {
      paintMoon(document.getElementById("moon-disc"), stars.moonFraction, stars.waxing);
      moonPainted = true;
    }

    var astroEl = document.getElementById("astro-sky");
    astroEl.innerHTML = "";
    var astro = diary.astronomy || [];
    if (!astro.length && stars.sky) {
      astro = stars.sky.map(function (x) { return { title: x.title, caption: x.caption }; });
    }
    var astroShow = lang === "en" && astroEn.astronomy && astroEn.astronomy.length ? astroEn.astronomy : astro;
    astroShow.slice(0, 8).forEach(function (item) {
      var row = document.createElement("div");
      row.className = "astro-item";
      row.innerHTML = "<strong>" + esc(item.title) + "</strong> <span>" + esc(item.caption || item.detail || "") + "</span>";
      astroEl.appendChild(row);
    });
    if (!astroShow.length) {
      astroEl.innerHTML = '<p class="empty">' + esc(t("emptyAstro")) + "</p>";
    }

    var chips = document.getElementById("sign-chips");
    chips.innerHTML = "";
    var signsSrc = diary.personalSigns || stars.bodies || [];
    if (lang === "en" && astroEn.signs && astroEn.signs.length) {
      astroEn.signs.forEach(function (b) {
        var el = document.createElement("span");
        el.className = "chip";
        el.innerHTML = "<b>" + esc(b.name) + "</b>" + esc(b.label || "");
        chips.appendChild(el);
      });
    } else {
      signsSrc.slice(0, 5).forEach(function (b) {
        var el = document.createElement("span");
        el.className = "chip";
        el.innerHTML = "<b>" + esc(planetName(b.name)) + "</b>" + esc(signLabel(b));
        chips.appendChild(el);
      });
    }

    var aspectBox = document.getElementById("aspect-mini");
    aspectBox.innerHTML = "";
    var aspects = diary.personalAspects || stars.aspects || [];
    var aspectShow = lang === "en" && astroEn.aspects && astroEn.aspects.length ? astroEn.aspects : aspects;
    if (!aspectShow.length) {
      aspectBox.innerHTML = '<p class="empty">' + esc(t("emptyAspect")) + "</p>";
    } else {
      aspectShow.slice(0, 6).forEach(function (a) {
        var el = document.createElement("div");
        el.className = "aspect-mini";
        var ends = a.endsIn ? " · " + a.endsIn : "";
        el.innerHTML =
          '<div class="pair"><strong>' + esc(planetName(a.a)) + " · " + esc(planetName(a.b)) + "</strong>" +
          '<span class="badge ' + esc(a.tone || "blend") + '">' + esc(aspectName(a.aspect)) + "</span></div>" +
          "<span>" + esc(a.influence || "") + esc(ends) + "</span>";
        aspectBox.appendChild(el);
      });
    }

    var inf = stars.influence || {};
    var infEn = astroEn.influence || {};
    var infGrid = document.getElementById("inf-grid");
    infGrid.innerHTML = "";
    [
      ["mood", inf.mood],
      ["wealth", inf.wealth],
      ["work", inf.work],
      ["love", inf.love]
    ].forEach(function (pair) {
      var card = document.createElement("div");
      card.className = "inf-card";
      var val = lang === "en" ? (infEn[pair[0]] || pair[1] || "—") : (pair[1] || "—");
      card.innerHTML = '<div class="label">' + t(pair[0]) + "</div><p>" + esc(val) + "</p>";
      infGrid.appendChild(card);
    });
  }

  function renderFeed(feed) {
    var col = document.createElement("article");
    col.className = "feed-col";
    var h = document.createElement("h3");
    h.innerHTML = '<a href="' + esc(feed.home) + '" target="_blank" rel="noopener">' + esc(feed.name) + "</a>";
    col.appendChild(h);
    var k = document.createElement("p");
    k.className = "feed-kind";
    k.textContent = feed.kind === "podcast" ? t("podcast") : t("article");
    col.appendChild(k);
    if (!feed.ok && feed.error) {
      var err = document.createElement("p");
      err.className = "fail";
      err.textContent = t("failPrefix") + feed.error;
      col.appendChild(err);
    }
    if (!feed.items || !feed.items.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = t("emptyFeed");
      col.appendChild(empty);
      return col;
    }
    feed.items.forEach(function (item) {
      var a = document.createElement("a");
      a.className = "entry";
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener";
      var meta = [];
      if (isFresh(item.ts)) meta.push('<span class="dot-new">NEW</span>');
      var when = dateLabel(item.ts);
      if (when) meta.push(esc(when));
      meta.push(esc(item.kind === "podcast" ? t("podcast") : t("article")));
      var dur = fmtDuration(item.durationMin);
      if (dur) meta.push(esc(dur));
      var sum = itemSummary(item);
      a.innerHTML =
        '<div class="meta">' + meta.join(" · ") + "</div>" +
        '<span class="ttl">' + esc(itemTitle(item)) + "</span>" +
        (sum ? '<p class="sum">' + esc(sum) + "</p>" : "");
      col.appendChild(a);
    });
    return col;
  }

  function renderFeeds() {
    ["astrology", "invest", "ai", "work"].forEach(function (id) {
      var host = document.getElementById("feeds-" + id);
      if (host) host.innerHTML = "";
    });
    var list = document.getElementById("fresh-list");
    list.innerHTML = "";
    document.getElementById("fresh-box").hidden = true;

    if (!digest || !digest.sections) {
      document.getElementById("foot-note").textContent = t("noData");
      return;
    }
    var freshHours = digest.freshHours || 36;
    var fresh = [];
    digest.sections.forEach(function (sec) {
      var host = document.getElementById("feeds-" + sec.id);
      if (!host) return;
      (sec.feeds || []).forEach(function (feed) {
        host.appendChild(renderFeed(feed));
        (feed.items || []).forEach(function (item) {
          if (isFresh(item.ts, freshHours)) {
            fresh.push({
              name: secName(sec),
              title: itemTitle(item),
              url: item.url,
              ts: item.ts
            });
          }
        });
      });
    });
    fresh.sort(function (a, b) { return b.ts - a.ts; });
    if (fresh.length) {
      document.getElementById("fresh-box").hidden = false;
      fresh.slice(0, 12).forEach(function (row) {
        var a = document.createElement("a");
        a.className = "fresh-row";
        a.href = row.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.innerHTML =
          '<span class="tag">' + esc(row.name) + "</span>" +
          '<span class="when">' + esc(dateLabel(row.ts)) + "</span>" +
          '<span class="ttl">' + esc(row.title) + "</span>";
        list.appendChild(a);
      });
    }
    document.getElementById("foot-note").textContent = t("footer");
  }

  function applyLang() {
    bindData();
    renderStaticCopy();
    renderAstro();
    renderFeeds();
  }

  function setLive(kind, text) {
    var el = document.getElementById("live-status");
    if (!el) return;
    el.className = "live-status" + (kind ? " is-" + kind : "");
    el.textContent = text || "";
  }

  function paintFresh() {
    moonPainted = false;
    applyLang();
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function fallbackStaticRefresh() {
    var stamp = Date.now();
    return Promise.all([
      loadScript("stars-data.js?t=" + stamp),
      loadScript("digest-data.js?t=" + stamp)
    ]).then(paintFresh);
  }

  function liveRefresh() {
    setLive("", t("updating"));
    fetch("/api/digest?t=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("http");
        return res.json();
      })
      .then(function (payload) {
        if (!payload || !payload.ok || !payload.digest) throw new Error("bad");
        window.DIGEST_DATA = payload.digest;
        if (payload.stars && Object.keys(payload.stars).length) {
          window.STARS_DATA = payload.stars;
        }
        paintFresh();
        var at = payload.digest.fetchedAt || "";
        setLive("idle", t("updatedOk") + (at ? " " + at : ""));
      })
      .catch(function () {
        fallbackStaticRefresh()
          .then(function () {
            var at = (window.DIGEST_DATA && window.DIGEST_DATA.fetchedAt) || "";
            setLive("idle", t("updatedOk") + (at ? " " + at : ""));
          })
          .catch(function () { setLive("err", t("updateFail")); });
      });
  }

  document.querySelectorAll(".lang-switch button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      lang = btn.getAttribute("data-lang") === "en" ? "en" : "zh";
      try { localStorage.setItem("digest-lang", lang); } catch (e) { /* ignore */ }
      applyLang();
    });
  });

  applyLang();
  liveRefresh();
})();
