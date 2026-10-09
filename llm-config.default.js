/**
 * 公网默认配置（提交到仓库）。
 * 本地若存在 llm-config.js（已 gitignore），会覆盖本文件。
 *
 * GitHub Pages 为纯静态站，无服务端 Key：树洞/许愿走本地规则回复。
 * 若日后部署了 llm_proxy，在此填写公网代理地址，例如：
 *   endpoint: "https://your-proxy.example.com"
 */
window.DIARY_LLM = {
  enabled: true,
  // 不设 endpoint / useSameOrigin → 前端自动用本地规则，不请求外网
  timeoutMs: 20000
};
