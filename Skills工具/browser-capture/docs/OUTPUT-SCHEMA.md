# 输出目录与产物说明

默认数据根路径：`~/browser-captures`（Windows 为 `%USERPROFILE%\browser-captures`），可通过 `--state-root` / `--out` 自定义。

```text
~/browser-captures/
├── controllers/
│   └── <provider>-window-<N>/
│       ├── controller.lock          # 跨窗口互斥锁（含 runId 与 worker PID）
│       ├── activation.json          # 本次启动参数快照
│       ├── status.json              # 实时采集状态（phase / coverageStatus / enabledHooks / asyncStackDepth 等）
│       ├── commands/                # new-tab / metrics / memory-sample / heap-snapshot IPC 通道
│       └── worker-<runId>.log       # 后台 worker 日志
└── runs/
    └── <provider>-window-<N>/
        └── <runId>/
            ├── raw.jsonl            # 原始 CDP Network.* 事件流
            ├── records.jsonl        # 派生 HTTP/HTTPS 请求、重定向、ExtraInfo Cookie、16 MiB 正文、WS 帧、原生 SSE
            ├── storage-events.jsonl # 浏览器原生 DOMStorage (localStorage / sessionStorage) 变更
            ├── hook-events.jsonl    # JS Hook 采集流（fetch/XHR/beacon/ws/sse/response_chunk/cookie/crypto/wasm/dom）
            ├── runtime-events.jsonl # (deep / --hooks console) getter-safe console 日志与未捕获异常/rejection
            ├── scripts.jsonl        # (deep) Page / iframe / Worker / ServiceWorker 全部脚本元信息与去重索引
            ├── scripts/             # (deep) 按 SHA256 前 12 位去重落盘的静态 + 动态 eval/blob JS 源码
            │   └── <sha256_12>.js
            ├── wasm/                # (deep / --hooks wasm) 自动提取并去重的原始 .wasm 二进制文件
            │   └── <sha256_12>.wasm
            ├── metrics.jsonl        # 按需 metrics 命令输出（JSHeap / Nodes / Listeners / Layout 等）
            ├── snapshots/           # 按需 memory-sample (.heapprofile) 与 heap-snapshot (.heapsnapshot)
            ├── analysis/            # 离线 correlate 命令生成的关联索引
            │   ├── correlated-timeline.jsonl
            │   └── summary-index.json
            ├── capture.har          # 离线 export-har 命令生成的标准 HAR 1.2
            ├── metadata.jsonl       # 会话与目标元数据
            ├── coverage.jsonl       # 诊断、覆写命中 (override-applied / script-debugger-stripped) 与覆盖率事件
            └── summary.json         # 停机后的五字段交付状态摘要
```

## 关键产物用途速查

| 文件 | 核心用途 |
| --- | --- |
| `records.jsonl` | 协议分析主源：完整请求头、ExtraInfo 真实 `Cookie`/`Set-Cookie`、响应正文、WebSocket 收发帧（`ws-frame-sent` / `ws-frame-received`）与 SSE（`sse-message`） |
| `hook-events.jsonl` | 算法逆向主源：`crypto.subtle` 加解密入参/出参预览、`document.cookie` 写入栈、流式 SSE/NDJSON 逐块 `response_chunk`、`wasm_module` 导出表与对应 `wasm/*.wasm` 路径 |
| `scripts.jsonl` + `scripts/*.js` | 包含主页面、iframe、WebWorker、ServiceWorker 以及所有动态 `eval` / `new Function` / `blob:` 脚本 |
| `analysis/correlated-timeline.jsonl` | 运行 `correlate` 后生成：每条请求/加密/WS 事件的调用栈（含 32 层异步 `parent` 链）直接映射到本地 `scripts/*.js` 行列号与压缩代码前后文片段 |
| `capture.har` | 运行 `export-har` 后生成：可直接导入 Chrome DevTools、Charles、Fiddler、mitmweb 等工具回放分析 |
| `summary.json` | 校验本次采集是否完整落盘：`streamsClosed`、`dataFlushed`、`cleanupComplete`、`metadataWritten`、`captureStatus` |
