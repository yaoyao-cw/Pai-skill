# 强反调试站分层攻坚手册

面对带反调试、DevTools 探针、原生函数校验或时间差检测的站点，建议按**由浅入深、最小暴露面**的四级阶梯推进，而非一上来全开。

---

## 第 1 级：零暴露面纯协议抓包（`stealth`）

```bash
node bin/capture.cjs start -p chrome --window 9222 --mode stealth --url https://target.example/
```

- **发出的 CDP 命令**：仅 `Network.enable`、`DOMStorage.enable`、`Target.setAutoAttach`。
- **绝不触发**：零 `Runtime.enable`、零 `Debugger.enable`、零主世界 JS 注入。
- **可拿数据**：全窗口 HTTP/HTTPS 请求与 16 MiB 正文、ExtraInfo 真实 `Cookie`/`Set-Cookie`、WebSocket 帧、SSE 原生事件、本地存储变化。
- 若页面内含静态 `debugger` 循环干扰手动排查，可直接叠加响应层词法级中和（依旧零 JS 注入）：
  ```bash
  node bin/capture.cjs start -p chrome --window 9222 --mode stealth --strip-script-debugger --url https://target.example/
  ```

---

## 第 2 级：零 JS 注入全量源码采集（强反调试站主力方案）

```bash
node bin/capture.cjs start -p chrome --window 9222 --mode deep --hooks none --async-depth 0 --strip-script-debugger --url https://target.example/
```

适用场景：站点会检测 `fetch`/`XHR`/`WebSocket`/`console` 是否被包过、检测 `Error.stack` 或高频 Promise 异步栈耗时。

- `--hooks none`：不调用 `Page.enable`、`Runtime.addBinding`、`Page.addScriptToEvaluateOnNewDocument`、`Runtime.evaluate`，主世界 **0 字节注入**。
- `--async-depth 0`：跳过 `Debugger.setAsyncCallStackDepth`，消除 Promise/异步链高频性能差特征。
- `--strip-script-debugger`：在网络响应层把真实 `debugger` 语句等长替换为 `void 0  `（后接 `;`）或 `{      }`（无 `;`，免疫 `debugger\n(fn)()` 等 ASI 续行风险），行号、列号与脚本 `.length` 零漂移，字符串/模板字符串/注释/正则/属性名零误伤。
- **仍保留的核心逆向数据**：Page / iframe / WebWorker / ServiceWorker 全部静态与动态 `eval`/blob 源码（去重落盘 `scripts/*.js`）+ CDP 原生请求 `initiator.stack` + `correlate` 源码关联 + `export-har`。

---

## 第 3 级：按需最小面 JS Hook（精准定位加密/WASM）

只挂当前攻坚真正需要的 Hook，其余原生 API 保持 100% 原生引用：

```bash
# 只追踪 WebAssembly 二进制提取与 WebCrypto 加解密，其余 API 零触碰
node bin/capture.cjs start -p chrome --window 9222 --mode deep --hooks wasm,crypto --url https://target.example/

# 只追踪 Cookie 写入与网络请求
node bin/capture.cjs start -p chrome --window 9222 --mode deep --hooks network,cookie --url https://target.example/
```

可选模块列表：`fetch`、`xhr`、`beacon`、`ws`、`sse`、`cookie`、`crypto`、`wasm`、`dom`、`console`（及别名 `network`、`all`、`none`）。

所有已启用的 JS Hook 均默认开启以下隐匿加固：
1. **默认零 `Runtime.enable`**：彻底免疫 `console` 参数 getter 陷阱（`Error.stack` / DOM `.id` / `RegExp.toString` / `Symbol.toStringTag` / 自定义对象 getter）。
2. **匿名包装零 `__bc*` 栈帧**：即使被 Hook 的原生 API 同步抛错，`err.stack` 不泄露任何内部函数名。
3. **闭包 binding + per-run Symbol + `[native code]` Proxy**：`window` 上无残留具名全局对象，`Function.prototype.toString.call(fetch)` 返回原生 `[native code]`。

---

## 第 4 级：`--override` 响应热替换闭环

遇到定制化反调试分支（如定时跳转 `about:blank`、魔改环境检测、混淆签名校验）：

1. 先用第 1/2 级无痕抓出目标 JS 文件（位于 `<runDir>/scripts/` 或 `records.jsonl`）。
2. 参考 [examples/override-rules.example.json](../examples/override-rules.example.json) 写一条局部正则补丁或整文件替换规则。
3. 挂上 `--override` 跑全量 `deep` 畅通采集，修改本地替换脚本后直接刷新页面即时生效：

```bash
node bin/capture.cjs start -p chrome --window 9222 --mode deep --strip-script-debugger --override ./examples/override-rules.example.json --url https://target.example/
```

> 启用 `--override` 或 `--strip-script-debugger` 时会自动关闭磁盘缓存（`Network.setCacheDisabled(true)`）并剥离旧 `Content-Encoding`/`ETag`/`Content-Length` 头，`stop` 时自动恢复缓存并调用 `Fetch.disable`。
