/**
 * 公网 LLM 客户端：请求代理 /api/reply；失败则交给本地 fallbackFn。
 * 配置来源（优先级从高到低）：
 *   1. window.DIARY_LLM = { endpoint, enabled }
 *   2. 同域相对路径 /api/reply（Nginx 反代时）
 *   3. 默认关闭远程（仅本地规则）——避免未部署代理时一直超时
 */
(function (root) {
  var DEFAULT_TIMEOUT_MS = 20000;

  function cfg() {
    var c = root.DIARY_LLM || {};
    return {
      enabled: c.enabled !== false && !!(c.endpoint || c.useSameOrigin),
      endpoint: String(c.endpoint || "").replace(/\/$/, ""),
      useSameOrigin: !!c.useSameOrigin,
      timeoutMs: Number(c.timeoutMs) || DEFAULT_TIMEOUT_MS
    };
  }

  function replyUrl(c) {
    if (c.endpoint) return c.endpoint + "/api/reply";
    if (c.useSameOrigin) return "/api/reply";
    return "";
  }

  /**
   * @param {"tree"|"wish"} kind
   * @param {string} text
   * @param {function(string):string} fallbackFn
   * @returns {Promise<{reply:string, source:string}>}
   */
  function askReply(kind, text, fallbackFn) {
    var local = function () {
      var r = "";
      try { r = fallbackFn(text); } catch (e) { r = ""; }
      return { reply: r || "", source: "local" };
    };

    var c = cfg();
    var url = replyUrl(c);
    if (!c.enabled || !url) {
      return Promise.resolve(local());
    }

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) try { ctrl.abort(); } catch (e) { /* ignore */ }
    }, c.timeoutMs);

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: kind, text: String(text || "").slice(0, 500) }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) {
        return res.json().then(function (j) {
          return { ok: res.ok, j: j || {} };
        }).catch(function () {
          return { ok: false, j: {} };
        });
      })
      .then(function (pack) {
        clearTimeout(timer);
        var reply = pack.j && pack.j.reply ? String(pack.j.reply).trim() : "";
        if (pack.ok && reply) {
          return { reply: reply, source: pack.j.source || "llm" };
        }
        return local();
      })
      .catch(function () {
        clearTimeout(timer);
        return local();
      });
  }

  root.DiaryLLM = { askReply: askReply, cfg: cfg };
})(typeof window !== "undefined" ? window : globalThis);
