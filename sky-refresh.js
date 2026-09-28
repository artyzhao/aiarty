/**
 * 星象页定时刷新：
 * - 与 launchd 每 3 小时（:30）对齐
 * - 进入新的一天后自动刷新，拉取最新天象 / 相位 / 星座
 * - 切回前台时若跨日或数据超过 3 小时也会刷新
 *
 * 公网（GitHub Pages）注意：若线上数据停更，绝不能无限整页重载，
 * 否则会卡住浏览器；落后数据只重试有限次（计数存在 sessionStorage）。
 */
(function () {
  var SLOT_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
  var MAX_MS = 3 * 60 * 60 * 1000;
  var DAY_RETRY_MS = 90 * 1000;
  var TZ = "Asia/Shanghai";
  var MAX_BEHIND_RELOADS = 2;
  var STORE_KEY = "sky-refresh-behind";
  var timer = null;

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function isLocalPreview() {
    var h = location.hostname;
    return h === "127.0.0.1" || h === "localhost";
  }

  function shanghaiParts(date) {
    var d = date || new Date();
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(d);
    var map = {};
    parts.forEach(function (p) {
      if (p.type !== "literal") map[p.type] = p.value;
    });
    var hour = Number(map.hour);
    if (hour === 24) hour = 0;
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: hour,
      minute: Number(map.minute),
      second: Number(map.second)
    };
  }

  function todayYmd() {
    var p = shanghaiParts();
    return p.year + "-" + pad2(p.month) + "-" + pad2(p.day);
  }

  function dataYmd() {
    var d = window.STARS_DATA;
    return d && d.date ? String(d.date).slice(0, 10) : "";
  }

  function isDataBehindDay() {
    var t = todayYmd();
    var d = dataYmd();
    return !!(t && d && d !== t);
  }

  function readBehindCount() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return 0;
      var obj = JSON.parse(raw);
      if (!obj || obj.day !== todayYmd()) return 0;
      return Number(obj.n) || 0;
    } catch (e) {
      return 0;
    }
  }

  function writeBehindCount(n) {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ day: todayYmd(), n: n }));
    } catch (e) { /* ignore */ }
  }

  function clearBehindCount() {
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  }

  function behindExhausted() {
    return !isLocalPreview() && readBehindCount() >= MAX_BEHIND_RELOADS;
  }

  function reloadFresh() {
    if (isDataBehindDay()) {
      var n = readBehindCount() + 1;
      writeBehindCount(n);
      if (!isLocalPreview() && n > MAX_BEHIND_RELOADS) {
        scheduleNext(true);
        return;
      }
    } else {
      clearBehindCount();
    }
    var u = new URL(location.href);
    u.searchParams.set("r", String(Date.now()));
    location.replace(u.pathname + u.search + u.hash);
  }

  function msUntilNextSlot() {
    var now = Date.now();
    var base = new Date();
    var best = Infinity;
    for (var day = 0; day < 2; day++) {
      for (var i = 0; i < SLOT_HOURS.length; i++) {
        var t = new Date(
          base.getFullYear(), base.getMonth(), base.getDate() + day,
          SLOT_HOURS[i], 30, 45
        ).getTime();
        var wait = t - now;
        if (wait > 15000 && wait < best) best = wait;
      }
    }
    if (!isFinite(best) || best > MAX_MS) return MAX_MS;
    return best;
  }

  function msUntilDayDataReady() {
    var p = shanghaiParts();
    var now = Date.now();
    var todaySlot = new Date(p.year, p.month - 1, p.day, 0, 30, 45).getTime();
    var tomorrowSlot = new Date(p.year, p.month - 1, p.day + 1, 0, 30, 45).getTime();

    if (isDataBehindDay()) {
      if (behindExhausted()) return Math.min(msUntilNextSlot(), MAX_MS);
      if (now < todaySlot) return Math.max(todaySlot - now, 5000);
      return DAY_RETRY_MS;
    }
    var wait = tomorrowSlot - now;
    if (wait < 15000) wait = DAY_RETRY_MS;
    return wait;
  }

  function dataAgeMs() {
    var d = window.STARS_DATA;
    if (!d || !d.updatedAt) return 0;
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(d.updatedAt));
    if (!m) return 0;
    return Date.now() - new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
  }

  function shouldReloadNow() {
    if (isDataBehindDay()) {
      if (behindExhausted()) return false;
      return true;
    }
    if (dataAgeMs() > MAX_MS) return true;
    return false;
  }

  function scheduleNext(stoppedBehind) {
    if (timer) clearTimeout(timer);
    var wait = Math.min(msUntilNextSlot(), msUntilDayDataReady());
    if (!isFinite(wait) || wait < 5000) wait = 5000;
    if (wait > MAX_MS && !isDataBehindDay()) wait = MAX_MS;
    if (stoppedBehind) wait = Math.max(wait, MAX_MS);
    timer = setTimeout(reloadFresh, wait);
  }

  if (isDataBehindDay() && !behindExhausted()) {
    setTimeout(reloadFresh, 2500);
  }

  scheduleNext();

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    if (shouldReloadNow()) reloadFresh();
    else scheduleNext();
  });

  window.addEventListener("pageshow", function (e) {
    if (e.persisted && shouldReloadNow()) reloadFresh();
  });
})();
