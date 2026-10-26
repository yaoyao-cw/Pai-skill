# 002：为全部画风提供有来源的选择依据

> 已获用户批准并在隔离 worktree 完成，审查通过。21 项资料已逐条人工核对；74 项针对性测试由执行者与主审分别运行通过，独立安装包 verified。工作区与验收结果见 [总计划](README.md)。

## 状态与目标

- 根目录：`/Users/liulei/projects/hand-drawn-styles`；基线 `4132988`，2026-10-16。
- 优先级 P1；工作量中；风险低至中；类别 direction／使用体验；依赖 001 的最终合同术语。
- 目标：把适用场景、限制和证据整理为机器可读的选择依据，让用户能缩小候选；不代替用户决定，不影响配方输出。

## 当前证据

`PROTOCOL.md:17`：未指定画风时展示全部菜单并等待选择。`scripts/render_prompt.py:264` 的 `list_styles()` 只返回以下字段：

```python
"style_id": style_id,
"name": name,
"aliases": ...,
"parameters": ...,
"references": references,
```

现有 `test_menu_contains_all_styles_and_declared_parameters` 验证 21 项和编号顺序。`STYLES.md:423` 已解释 14／18 的差异，`:488` 已说明 20 的动作与道具限制；资料可以提炼，不必重新发明画风规则。

项目用 Python 标准库、JSON、类型标注，CLI 失败退出 2。遵循既有 `list_styles()` 的编号顺序，保留全部别名和参数语义。

## 范围

允许修改 `scripts/render_prompt.py`、`scripts/check_skill.py`、`scripts/test_render_prompt.py`、`scripts/test_installation.py`、`PROTOCOL.md`、`SKILL.md`、`README.md`，新建 `catalog/style-guidance.json`、`scripts/test_style_guidance.py`、`docs/style-selection.md`；可更新本计划与总计划状态。

不得改配方、锚点、既有生成／验收合同、`--list` 响应结构、显式指定画风的路由。无推荐模型、Embedding、依赖安装、数据库、网站、外部服务调用或用户行为采集。不提交或推送。

漂移检查：`git diff --stat 4132988..HEAD -- scripts PROTOCOL.md SKILL.md README.md catalog docs`，并检查 `git status --short`。001 的已批准变化是预期依赖，应读取后合并本项，不回退为旧代码。

## 数据与接口设计

`catalog/style-guidance.json` 使用 `schema_version: 1` 与按 style_id 索引的 `styles`。每种画风包含：

- `suitable_for`：适用任务列表，作为编辑建议，不声称做过用户实验。
- `selection_cues`：用于识别差别的简短说明，必须有配方章节来源；不写新生成指令。
- `limitations`：限制列表，区分配方明确禁止与选型建议，记录依据。
- `related_styles`：相近 style_id 与区别；不能引用已删除编号。
- `evidence`：来源文档、适用范围、结论类型。类型仅为 `documented-example`、`internal-reviewed`、`user-approved`、`not-recorded`；某张锚点获认可不代表所有场景都获认可。

名称、别名、参数、参考图 URL 和生成合同继续来自原有真源，不在选型文件重抄一份。缺少可靠验证记录时填 `not-recorded`，禁止从 README 的“已验证”推广成“稳定通过所有场景”。历史 `benchmarks/style-19/` 实际属于当前 18，必须按文档解释绑定，不能按目录名猜编号。

新增只读查询 `python3 -B scripts/render_prompt.py --catalog`，返回原有列表字段加 `guidance`。保留 `--list` 完全不变；`--catalog` 不加载图片、不下载、不生成。`--catalog` 与 `--list` 或生成参数混用时给出明确错误，避免静默忽略参数。

选型文件加载只在查询、安装检查及打包检查中触发；普通显式 `--style` 调用不应因选型文件故障失效。完整安装包仍要求该文件有效。

证据中的仓库文档路径用于维护者定位；轻量包不增加整套 benchmarks。`docs/style-selection.md` 提供随包可读的摘要，仓库详细证据可用文档链接查看；安装检查区分“运行必需文件”与“外部证据指针”，不得把未打包的研发文件误报为运行缺失。

## 执行步骤与验收

所有命令在 `/Users/liulei/projects/hand-drawn-styles` 执行，并设置 `PYTHONDONTWRITEBYTECODE=1`。后续完整调用需要 5 张有效参考图；复用本次实施已校验的 `HAND_DRAWN_IMAGE_CACHE`。若独立执行且没有缓存，用 `mktemp -d /tmp/hand-drawn-selection-cache.XXXXXX` 创建专用目录，设为该变量，再运行 `HAND_DRAWN_OFFLINE=0 python3 -B scripts/hosted_images.py fetch`。预期下载并通过清单校验；当前环境此前有 DNS／HTTP 503 失败记录，尚未证明已恢复。失败时仍可完成目录资料及其离线测试，不能宣称安装验收通过。

1. **整理全部 21 套数据。** 从每种配方及已有例图说明提取信息，验证来源。先人工复核 3.1／10／14／18／20，再覆盖其余画风。缺失证据如实记录。
   - 验证：`python3 -m json.tool catalog/style-guidance.json` → 格式正确；新测试检查编号集合与 `list_styles()` 完全相等、无重复、所有 related_styles 有效。
2. **增加查询与静态校验。** 小函数清晰命名，例如 `load_style_guidance`，不重构整个渲染器。安装检查验证数据格式、来源字段和编号覆盖，运行清单登记 JSON 及必要说明文档。
   - 验证：`PYTHONDONTWRITEBYTECODE=1 HAND_DRAWN_OFFLINE=1 python3 -B scripts/render_prompt.py --catalog` → 21 项有效输出；用空临时缓存执行仍成功且不创建图片。
   - 验证：`PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=scripts python3 -B -m unittest test_style_guidance` → 全通过；这是待新增测试模块。
3. **修改未指定画风时的交互协议。** 需求明确时展示 2–3 项候选，每项写匹配理由和必要限制，等待用户选择；允许查看完整菜单。不足以缩小时展示完整菜单，不编造推荐。显式编号、名称、别名及现有直接映射优先，不重问。
   - 人工核对 `docs/style-selection.md` 的固定情境记录：明确指定 20、只说手绘、指定家庭蜡笔、请求多步骤讲解、请求完整风景却想用极简画风。每项列预期路由与不能做的行为。
   - 这些是协议演练，不能称为自动测试已证明 Agent 必然遵循。格式及参数测试仍由脚本负责。
4. **验证安装与不干扰生成。** 补包内资料测试、损坏选型 JSON 的错误测试、普通生成独立于选型文件的测试。
   - 验证：`PYTHONDONTWRITEBYTECODE=1 HAND_DRAWN_OFFLINE=1 PYTHONPATH=scripts python3 -B -m unittest test_render_prompt test_style_guidance test_installation` → 全通过。
   - 验证：`PYTHONDONTWRITEBYTECODE=1 HAND_DRAWN_OFFLINE=1 python3 -B scripts/build_skill_package.py` → verified、包小于 1 MiB、独立安装后 `--catalog` 和旧命令可用。

## 测试与完成标准

有意义的新增测试包括：遗漏画风、未知编号、错误 related_styles、非法证据类型、无来源的认可声明、JSON 损坏、混合参数拒绝、空图片缓存查询、普通生成不读取选型说明、独立安装目录查询成功。使用临时目录和 unittest，不为文案逐字重复写测试。

测试只能验证结构与来源字段存在，不能验证来源是否真正支持主张；全部 21 项需要人工逐条核对。安装验证缺图时不能用 mock 冒充全量通过。

- 21 项选型资料齐全；明确哪些是建议、哪些有验证记录。
- `--list` 字段及行为不变，显式选择保持现有结果；guidance 不进入 prompt、references 或 workflow。
- `scripts/check_skill.py` 与完整单元测试通过，最终统一验收可与 003 收尾合并，避免无改动重复运行。
- `git diff --check` 通过，范围符合计划，状态附实际结果。

## 停止条件与维护

推荐需要新模型／新服务、必须修改配方或突破明确风格限制、来源之间冲突且无法归因于版本，停止对应条目并报告。不要为了凑齐“已验证”改写历史。

后续新增或删除画风必须同步选型元数据与校验；视觉配方仍只有 `STYLES.md` 一份真源。可以随反馈修正选型建议，但不能用建议覆盖生成合同。
