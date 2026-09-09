# bookmark-digest

![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue)
![License MIT](https://img.shields.io/badge/license-MIT-green)

把 X 收藏夹变成 Agent Inbox。

你只负责看到内容时点一次收藏。后面由 Agent 读取、判断、去重、路由到真实消费者；只有 durable receipt 通过本地契约校验后，才允许进入 processed，再选择性取消收藏。

[English](README.md)

## 你得到什么

- 通过本地已登录 Chrome/Chromium 的 CDP 读取 X Bookmarks。
- 只提取顶层收藏，不把引用推文误当成独立收藏。
- 以 tweet ID 生成稳定 candidate ID，作者 URL 退化成 `i/web` 也不影响身份。
- fail-closed：登录、GraphQL、schema、响应读取或 target cleanup 不确定时直接报错，不冒充“收藏夹为空”。
- receipt artifact gate：`commit` 必须校验一份持久 JSON 回执。
- processed-only unbookmark：只匹配顶层 tweet，点击后再逐条打开目标 tweet 做 fresh detail-page 回读验证。
- `--dry-run` 可以在真实账号 mutation 前预览。

## 工作原理

2026 年 2 月的 v1 本质是批量稍后读。v2 把原语换成：**Bookmark = human-to-agent task ingress。**

```text
收藏
 ↓
collect（只读 + 源健康）
 ↓
分析 / 去重 / 路由
 ↓
下游消费者写 accepted receipt artifact
 ↓
commit 校验 receipt + tweet identity
 ↓
unbookmark-processed --dry-run
 ↓
取消收藏 + fresh per-tweet detail 验证
```

分析、路由、回执、源健康、mutation 或读回验证任一失败，都不能声称完成。

## 安装与设置

要求：Python 3.10+、macOS/Linux、开启 remote debugging 的 Chrome/Chromium、该专用 profile 已登录 X，以及 `websocket-client`。

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

macOS：

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.bookmark-digest-chrome"
```

Linux（浏览器命令名按发行版调整）：

```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.bookmark-digest-chrome"
```

只需在这个浏览器里手动登录一次 X。不要把 Cookie、session token 或 profile 提交到仓库。

## 快速开始

### 1. 读取收藏

```bash
python3 bookmark_digest.py collect --count 20
```

成功输出包含 `health: "ok"`、candidate ID、`processed_pending_removal`、`complete`、`truncated` 和 `inbox_empty`。只有源健康、GraphQL 分页被证明完整、没有未处理/待删除项且结果未截断时，`inbox_empty` 才会是 `true`。

### 2. 让消费者产生持久回执

格式见 `receipt.example.json`：

```json
{
  "schema_version": "bookmark-digest.receipt.v1",
  "status": "accepted",
  "source_url": "https://x.com/example/status/123",
  "consumer": "research",
  "receipt_id": "research-123"
}
```

工具会验证 schema、accepted 状态、consumer/receipt ID 非空，以及两边 tweet ID 完全一致。这是对本地回执契约的校验，不是对第三方服务的密码学证明。

### 3. 写入 processed

```bash
python3 bookmark_digest.py commit \
  --url https://x.com/example/status/123 \
  --consumer research \
  --receipt-file ./receipt.json
```

工具会把 accepted receipt 复制到 state 同目录的私有 `receipts/` 存储。state v2.3 除 receipt ID/SHA-256 外，还保存由独立私有 `.gate-key` 生成的 HMAC；mutation 前会重新校验 stored receipt 与 HMAC。只同步手改 state+receipt、但没有 gate key，不能授权 mutation。能写 state 目录和 `.gate-key` 的本机操作者属于信任边界——这是防误改/局部伪造，不是对抗机器所有者。

### 4. 先 dry-run

```bash
python3 bookmark_digest.py unbookmark-processed --dry-run
```

### 5. 取消已处理收藏

只有明确允许修改 X 收藏状态后才运行：

```bash
python3 bookmark_digest.py unbookmark-processed
```

“按钮点到了”不算成功。DOM 确认后，命令会新开只读 CDP target 逐条访问目标 tweet，要求该 primary tweet 显示 `bookmark` 而不是 `removeBookmark`；部分失败或无法证明时返回非 0。

## Consumer 怎么接

v0.2 不强绑 Notion、Linear、Slack、MCP 或某个 Agent 框架。任何下游只要能输出上述 receipt contract 就可以接。Agent 需要先真实判断这条收藏是 `no_action`、研究、内容、产品还是其他 disposition，再决定是否接受回执。

仓库包含 scheduler-safe runner：

```bash
python3 scheduler_runner.py --consumer-command "python3 consumer.example.py"
```

runner 会先只读抓取；健康空 inbox 直接静默退出；用非阻塞本地文件锁避免定时任务和手工运行重叠；有内容时生成权限 `0600` 的临时 inbox JSON 交给 consumer。consumer 返回的每一份 receipt 都必须解析为本轮实际抓到的 tweet ID，整批预校验通过后才进入 `commit`。正常结束会删除临时 inbox；若进程被强杀，可能留下权限仍为 `0600` 的本地文件，需要后续清理。账号 mutation 默认关闭；显式开启后，也只会自动取消**本轮刚刚成功 commit 的 tweet IDs**，不会顺手清历史 processed 队列。`consumer.example.py` 故意不消费任何条目，也不会生成 accepted receipt，避免示例配置误删收藏。

审计完自己的 consumer 后，如果明确需要 Inbox Zero，可以显式开启：

```bash
BOOKMARK_DIGEST_AUTO_UNBOOKMARK=1 \
python3 scheduler_runner.py --consumer-command "/path/to/your-consumer"
```

macOS 可用 `install_launchd.py` 生成 `~/Library/LaunchAgents/*.plist`，默认每 2 小时运行。安装器会验证 launchd 使用的是 Python 3.10+，并检查 consumer executable 存在且具备执行权限；它只生成 plist，不会偷偷加载，是否启用仍由本机操作者明确决定。

## 隐私与安全

- 不把 Cookie、token 或 X 密码写入 processed state。
- 仓库不包含浏览器 profile。
- state 默认在 `~/.local/state/bookmark-digest/`，文件权限为 `0600`。
- 推荐专用 Chrome profile，不直接使用日常主浏览器。
- `collect` 会把收藏正文和元数据输出到 stdout；终端录屏、Agent 日志、CI artifact 也可能因此包含敏感收藏内容。
- scheduler 会在内存中捕获 consumer 输出，但不会把原始 consumer stderr 持久化；launchd 日志只保留有限状态/结果元数据，仍应按本地运维数据保护。
- `unbookmark-processed` 会改变账号可见状态；没有明确授权就保持关闭。

## 验证

私有工作流已于 2026-08-29 用真实账号跑通。公开候选另外覆盖：严格 X URL 身份、stored receipt 重新校验、quoted status 排除、processed authorization、GraphQL errors/schema failure 和假成功防护；真实只读 detail canary 也验证了当前 X DOM 能对未收藏目标返回 `bookmark`。

```bash
python3 -m unittest -v test_bookmark_digest.py
```

安全 live smoke：

```bash
python3 bookmark_digest.py collect --count 5
python3 bookmark_digest.py unbookmark-processed --dry-run --count 5
```

## 排障

**出现 `SourceHealthError` 而不是空数组**：这是设计行为。检查 CDP 浏览器、X 登录态和收藏页；X Web GraphQL/DOM 改版也会触发 fail-closed。

**`commit` 报 `ReceiptError`**：检查 `schema_version`、`status: "accepted"`、`consumer`、`receipt_id`，以及 `source_url` 与 `--url` 是否为同一 tweet。

**unbookmark 返回 `verified: false` 或 exit code 3**：fresh detail-page readback 无法证明目标已取消收藏。保留待重试，不能记 Done。

**收藏很多**：当前分页依赖浏览器滚动触发 X Web 请求；末页仍有 Bottom cursor 时会标记 `complete: false`。`--count` 上限 200。只有完整 collection 才能可信地报告 `inbox_empty: true`；receipt-gated mutation 则按 exact tweet detail page 独立验证，不依赖整个收藏列表翻到底。

**退出码**：`0` = 读取/commit/dry-run/已验证 mutation 成功；`2` = source、receipt、schema、completeness 或其他受控 CLI 失败；`3` = 已尝试 mutation 但无法完整验证。

## 已知限制

- 依赖 X 私有 Web GraphQL 和 DOM，改版可能失效。
- 必须有本地已登录 Chrome/Chromium CDP。
- 分页依赖浏览器滚动，不是直接 cursor/public API client。
- 暂不自动转写视频或完整展开 X Article。
- receipt artifact + 本地 gate HMAC 证明本地 contract/完整性边界满足；不代表第三方消费者具备密码学可信度，也不对抗本机所有者。
- 取消收藏使用页面 `removeBookmark` 控件，不是官方公开 API。

## Roadmap

- Consumer adapter / receipt verifier 插件化。
- Article / 视频富化。
- 更丰富的 scheduler 可观测性、重试和 backoff。
- 更稳的 browser/profile discovery。
- 在不暴露用户凭证的前提下探索 direct cursor pagination。

## 作者

[Leo / runesleo](https://github.com/runesleo?utm_source=github&utm_medium=referral&utm_content=bookmark-digest)，更多项目见 [Leo Labs](https://leolabs.me/?utm_source=github&utm_medium=referral&utm_content=bookmark-digest)。

## License

MIT
