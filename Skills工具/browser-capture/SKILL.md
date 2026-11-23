---
name: browser-capture
description: 浏览器抓包与全量逆向采集 Skill，支持 BitBrowser（比特浏览器）、AdsPower 以及直连任意 Chrome / Brave / VisibleV8 容器（--provider chrome / --ws-url）。提供 stealth / standard / deep 三档模式（全三档默认零 Runtime.enable、匿名包装零 __bc* 栈帧泄漏），支持 --hooks 模块化开关（含 --mode deep --hooks none 零 JS 注入全量源码/异步栈）、--async-depth 0..64 异步栈深度控制、--strip-script-debugger 响应层词法级去 debugger、--override 本地响应热替换、correlate 源码关联与 export-har 一键导出。
---

# 浏览器持续抓包与全量逆向套件（BitBrowser / AdsPower / Chrome / VisibleV8）

本 skill 在 Windows 使用 Node 原生 fetch/WebSocket（无需 npm），支持管理型指纹浏览器（BitBrowser / AdsPower）与直连型浏览器/容器（Chrome / Chromium / Brave / VisibleV8 Docker），提供 `start / status / new-tab / metrics / memory-sample / heap-snapshot / correlate / export-har / stop`。先读本文件，执行 `run.cmd` 或 `node bin/capture.cjs`。

## 三档采集模式（`--mode` / `-m`）

| 模式 | 别名 | 开启能力 | 反调试暴露度 | 适用场景 |
| --- | --- | --- | --- | --- |
| `stealth` | `silent`, `cdp`, `cdp-only` | 纯 CDP `Network.enable`（HTTP 正文 + WebSocket 帧 + 原生 SSE）+ `DOMStorage.enable` + 按需 `metrics`；**零 `Runtime.enable`、零 `Debugger`、零 JS 注入**；可配 `--strip-script-debugger` / `--override` 做无痕响应层去 `debugger` 与热替换 | **极低（近似无痕）** | 强风控/反调试站；搭配 VisibleV8 Docker 无痕双录 |
| `standard`（默认） | `std`, `default` | `Network` + `DOMStorage` + **隐匿化 JS Hook**（默认 `fetch` / `XHR` / `sendBeacon`，可由 `--hooks` 裁剪）：**不调用 `Runtime.enable`**、binding 捕获进闭包并立即从 `window` 删除、控制器藏在 per-run `Symbol`、原生函数经匿名 `Proxy` + `WeakMap` 伪装返回 `[native code]`（同步抛错 `Error.stack` 零 `__bc*` 内部帧泄漏），跨页经 `Page.frameNavigated` 自动重绑与回放 | **低-中** | 常规协议抓包、需要 JS 侧原始流且躲避主流 CDP/Hook 检测 |
| `deep` | `reverse`, `debug`, `full` | **全量逆向模式（默认同样不调用 `Runtime.enable`！）**：用 **getter-safe `console` + `error`/`unhandledrejection` 监听器**平替控制台与异常捕获（免疫 `Error.stack` / DOM `.id` / `RegExp.toString` / 自定义 getter 反调试陷阱）；Page/iframe 与 **WebWorker/ServiceWorker** 同步开启 `Debugger.enable`（`setSkipAllPauses:true` + `--async-depth` 默认 32 层异步堆栈 + 静态与动态 `eval`/blob 源码按 SHA256 去重落盘）；JS Hook 全附调用堆栈（零 `__bc*` 帧泄漏）并扩展拦截 **`WebAssembly`**（提取 `.wasm` 二进制与导出表）、**`EventSource` + 流式 SSE/NDJSON `response_chunk`**、`WebSocket`、`document.cookie`、`crypto.subtle`、`<script>`/`<iframe>` 注入；支持 **`--hooks none`**（零主世界 JS 注入仍保留全量 CDP Network + Debugger 源码/异步栈）、`--hooks wasm,crypto` 按需精准挂载、`--async-depth 0` 关闭异步栈追踪、`--strip-script-debugger`、`--strip-debugger`、`--with-runtime`、`--override` 及完整内存采样/堆快照 | **低→中（按 `--hooks` 与 `--async-depth` 精细调节，已消除 `Runtime.enable` 与 `__bc*` 栈帧特征）** | 加密签名逆向、强反调试站（`--mode deep --hooks none --async-depth 0 --strip-script-debugger`）、混淆/WASM/Worker 分析、完整调用栈溯源、热替换去反调试、内存排查 |

## 支持的 Provider

| Provider (`-p` / `--provider`) | 别名 | `--window` 含义 | 默认本地端点 | 专属参数 |
| --- | --- | --- | --- | --- |
| `bitbrowser` | `bit`, `bb` | UI 序号 `seq`（正整数） | `http://127.0.0.1:54348` | 可选 `--browser-id ID` |
| `adspower` | `ads` | 窗口编号 `serial_number`（正整数） | `http://127.0.0.1:50325` | 不支持 `--browser-id` |
| `chrome` | `chromium`, `cdp`, `direct`, `vv8`, `visiblev8` | 调试端口（默认 `9222`，传 `--ws-url`/`--api-url` 时自动推断） | `http://127.0.0.1:9222` | 支持 `--ws-url ws://127.0.0.1:PORT/devtools/browser/...`；不支持 `--restart` |

不同 provider 的控制锁、状态和输出目录按 `<provider>-window-<N>` 隔离，可并发抓多个浏览器互不干扰。

## 典型工作流与命令

### 1. 日常与全量逆向采集

```powershell
# A) 无痕纯抓包（强风控/反调试站，或挂到 VisibleV8 Docker 容器）
.\run.cmd start -p bitbrowser --window 1030 --mode stealth --url https://example.org/
.\run.cmd start -p vv8 --window 9222 --mode stealth --url https://example.org/

# B) 默认隐匿 Hook 抓包（AdsPower）
.\run.cmd start -p adspower --window 12 --url https://example.org/

# C) 全量深度逆向（默认零 Runtime.enable，含 Worker/WASM/SSE/异步栈 + 可选响应层去 debugger & 响应热替换）
.\run.cmd start -p chrome --window 9222 --mode deep --strip-script-debugger --override .\rules.json --url https://example.org/

# D) 强反调试站极限组合：零主世界 JS 注入 + 关闭异步栈开销 + 响应层词法级去 debugger + 全量 CDP Network/Debugger 源码落盘
.\run.cmd start -p chrome --window 9222 --mode deep --hooks none --async-depth 0 --strip-script-debugger --url https://example.org/

# E) 模块化最小面精准 Hook（例如只抓 WASM 与 WebCrypto，其余原生 API 零触碰）
.\run.cmd start -p chrome --window 9222 --mode deep --hooks wasm,crypto --url https://example.org/

# 如需 Worker 内部 console.log，可显式追加 --with-runtime
.\run.cmd start -p chrome --window 9222 --mode deep --with-runtime --url https://example.org/

# 运行期控制与按需内存采集
.\run.cmd status        -p chrome --window 9222
.\run.cmd new-tab       -p chrome --window 9222 --url https://another.example.org/
.\run.cmd metrics       -p chrome --window 9222
.\run.cmd memory-sample -p chrome --window 9222 --duration 3000
.\run.cmd heap-snapshot -p chrome --window 9222
.\run.cmd stop          -p chrome --window 9222
```

### 2. 抓包后离线关联与 HAR 导出

```powershell
# 自动关联调用栈（含 32 层异步 parent 链）↔ 本地 scripts/*.js 与压缩代码片段，生成 analysis/
.\run.cmd correlate  -p chrome --window 9222
.\run.cmd correlate  --run-dir "<runDir>"

# 一键导出标准 HAR 1.2（含 ExtraInfo Cookie/Set-Cookie、POST、响应体与 WebSocket 帧）
.\run.cmd export-har -p chrome --window 9222
.\run.cmd export-har --run-dir "<runDir>" --out "D:\capture.har"
```

## `--override RULES.json` 热替换规则格式

适用于强反调试攻坚闭环：**先用 `stealth` 无痕抓出 JS → 写一条替换规则去掉检测分支或加探针 → 配 `--override` 跑 `deep` 畅通无阻拿全量源码/异步栈/内存**。三档模式均支持；启用时自动开启 `Network.setCacheDisabled(true)` 防磁盘缓存绕过，自动清理旧 `Content-Encoding`/`ETag`/`Content-Length` 头，并在 `stop` 时恢复缓存与关闭 `Fetch.disable`：

```json
{
  "rules": [
    {
      "name": "patch-antidebug-inline",
      "urlPattern": "*app*.js*",
      "resourceType": "Script",
      "replace": [
        { "match": "debugger;", "with": "/*patched*/" },
        { "regex": "isDevToolsOpen\\s*=\\s*true", "flags": "g", "with": "isDevToolsOpen=false" }
      ]
    },
    {
      "name": "swap-local-file",
      "urlPattern": "https://target.example/static/sign.js*",
      "file": "./patched-sign.js",
      "contentType": "application/javascript; charset=utf-8"
    }
  ]
}
```

- `file` 路径相对规则文件所在目录解析，每次命中时动态读取，刷新页面即可生效无需重启采集器。
- 支持同时使用 `file`/`body` 与 `replace`；未命中或发生错误时自动 `Fetch.continueResponse` 放行，不会卡死页面。

## 常用参数与约束

- `--out PATH`：`start` 时改变 run 输出根目录；`export-har` 时指定输出 `.har` 路径（默认 `<runDir>\capture.har`）。
- `--api-url http://127.0.0.1:PORT`：覆盖 provider 本地 API origin（限 loopback，无 path/query）。
- `--ws-url ws://127.0.0.1:PORT/devtools/browser/...`：仅 `chrome` provider 可用（限 loopback），自动校验 `/json/version`。
- `--hooks LIST|none`：`start` 时模块化按需选择主世界 JS Hook（支持 `none` / `all` / `network` 或逗号组合 `fetch,xhr,beacon,ws,sse,cookie,crypto,wasm,dom,console`）；在 `deep` 模式下传 `--hooks none` 可实现**零 JS 注入**同时保留完整 CDP `Network` + `Debugger` 静态/动态源码落盘与 `initiator.stack`。
- `--async-depth 0..64`：`start --mode deep` 控制 `Debugger.setAsyncCallStackDepth`（默认 `32`；设为 `0` 彻底避免 Promise/异步链高频耗时检测开销）。
- `--strip-script-debugger`：`start` 时（三档模式皆支持，**无需注入任何 JS Hook**）通过 CDP `Fetch.enable` 对 `Script` 响应执行词法级 `debugger` 中和：只替换真实 `debugger` 语句为等长 8 字符（后接 `;` 用 `void 0  `，否则用空块 `{      }` 免疫 ASI 续行风险），不误伤字符串/模板字符串/注释/正则/属性名与方法名，精确保留行号、列号与脚本 `.length`；干净脚本直接 `Fetch.continueResponse` 无损放行。
- `--with-runtime` / `--strip-debugger`：仅 `start --mode deep` 可用（若配合 `--hooks none`，请改用 `--strip-script-debugger`）。
- `--override RULES.json`：仅 `start` 可用（三档模式皆支持，可与 `--strip-script-debugger` 叠加），启动前立即校验 JSON、本地文件与正则合法性。
- `--target TARGET_ID` / `--duration MS` / `--force`：供 `metrics` / `memory-sample` / `heap-snapshot` 使用。

## 输出文件总览

默认根：`%USERPROFILE%\browser-captures`（控制目录 `controllers\<provider>-window-<N>\`，数据目录 `runs\<provider>-window-<N>\<runId>\`）：

- `raw.jsonl`：原始 CDP `Network.*` 事件。
- `records.jsonl`：派生 HTTP 请求/重定向/ExtraInfo/正文（上限 16 MiB）、**WebSocket 帧**（`ws-*`）与 **SSE 事件**（`sse-message`）。
- `storage-events.jsonl`：浏览器原生 `DOMStorage.*`（三档模式均有）。
- `hook-events.jsonl`：`standard`/`deep` 的 JS Hook 记录（`deep` 含 `callStack`、`cookie_set`、`crypto_subtle`、`ws_open`/`ws_send`、`sse_open`/`sse_message`、`response_chunk`、`wasm_module`、`dom_node_added`、`debugger_trap_stripped`）。
- `runtime-events.jsonl`（`deep`）：默认写入 getter-safe `runtime_console` / `runtime_exception` / `runtime_rejection`（不触发反调试 getter）；传入 `--with-runtime` 时写入原生 CDP `Runtime.consoleAPICalled` / `Runtime.exceptionThrown`。
- `scripts.jsonl` + `scripts\<sha256前12位>.js`（`deep`）：Page / iframe / **Worker / ServiceWorker** 全部静态与动态 `eval`/blob 脚本去重落盘。
- `wasm\<sha256前12位>.wasm`（`deep`）：自动提取并去重的原始 `.wasm` 二进制文件。
- `metrics.jsonl` / `snapshots\alloc-*.heapprofile` / `snapshots\heap-*.heapsnapshot`：按需内存指标、分配采样与堆快照。
- `analysis\correlated-timeline.jsonl` + `analysis\summary-index.json`（运行 `correlate` 生成）：调用栈（含 32 层异步 `parent`）↔ 本地 `scripts\*.js` 行列号与压缩代码切片映射。
- `capture.har`（运行 `export-har` 生成）：标准 HAR 1.2。
- `metadata.jsonl` / `coverage.jsonl`（含 `override-applied` 替换记录）/ `summary.json`（含五字段交付状态）。

优雅停机必须使用 `stop`（禁止用 `Stop-Process`）。

## 验证

```bash
npm test
# 或直接运行：
node --test tests/capture.test.cjs tests/repair.test.cjs tests/providers.test.cjs tests/modes.test.cjs tests/reverse-kit.test.cjs tests/worker-e2e.test.cjs
```
