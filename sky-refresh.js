/**
 * 星象页定时刷新：
 * - 与 launchd 每 3 小时（:30）对齐
 * - 进入新的一天后自动刷新，拉取最新天象 / 相位 / 星座
 * - 切回前台时若跨日或数据超过 3 小时也会刷新
 */
(function () {
  var SLOT_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
  var MAX_MS = 3 * 60 * 60 * 1000;
  var DAY_RETRY_MS = 90 * 1000;
  var TZ = "Asia/Shanghai";
  var timer = null;

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /** 上海时区当前年月日 / 时分秒 */
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
    // en-US hour12:false 可能给出 "24"，归一到 0
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

  /** 页面上的星象数据是否已不是「今天」 */
  function isDataBehindDay() {
    var t = todayYmd();
    var d = dataYmd();
    return !!(t && d && d !== t);
  }

  function reloadFresh() {
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
        // 比 launchd 晚约 45 秒，等 stars-data.js 写完再刷
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

  /**
   * 距离「下一个日历日的 0:30:45（上海）」还有多久。
   * 跨日后等定时任务写出新数据再刷新；若已过 0:30 且数据仍旧，立即短间隔重试。
   */
  function msUntilDayDataReady() {
    var p = shanghaiParts();
    var now = Date.now();
    // 构造「今天 0:30:45」与「明天 0:30:45」的近似：用本地 Date 按上海日历字段拼
    // （机器一般在东八区；与上海差一天边界的极端场景极少）
    var todaySlot = new Date(p.year, p.month - 1, p.day, 0, 30, 45).getTime();
    var tomorrowSlot = new Date(p.year, p.month - 1, p.day + 1, 0, 30, 45).getTime();

    if (isDataBehindDay()) {
      // 已过 0:30 仍旧数据 → 快重试；未到 0:30 → 等到点再刷
      if (now < todaySlot) return Math.max(todaySlot - now, 5000);
      return DAY_RETRY_MS;
    }
    // 数据已是今天：约到明天 0:30:45 再刷
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
    if (isDataBehindDay()) return true;
    if (dataAgeMs() > MAX_MS) return true;
    return false;
  }

  function scheduleNext() {
    if (timer) clearTimeout(timer);
    var wait = Math.min(msUntilNextSlot(), msUntilDayDataReady());
    if (!isFinite(wait) || wait < 5000) wait = 5000;
    if (wait > MAX_MS && !isDataBehindDay()) wait = MAX_MS;
    // 到点一律刷新：对齐 3 小时槽 / 跨日 0:30 数据槽 / 隔日重试
    timer = setTimeout(reloadFresh, wait);
  }

  // 打开时若已是隔日旧数据，稍等再刷（避免与首屏抢）
  if (isDataBehindDay()) {
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
