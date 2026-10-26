# 001：为 3.1 增加独立验收，防止流程完成直接成为 final

> 已获用户批准并在隔离 worktree 完成，审查通过。90 项全量测试通过；主审独立复跑新增 21 项验收测试、21 套调用及打包检查通过。只修改本计划列出的文件，未改变配方和修正 prompt，未进行真实出图或视觉验收。工作区与总验收记录见 [总计划](README.md)。

## 状态与目的

- 基线：`4132988`，2026-10-16；根目录 `/Users/liulei/projects/hand-drawn-styles`。
- 优先级 P0；工作量中；风险中；类别 correctness／验收；依赖：无。
- 目的：保留三阶段生成技术，增加候选到 final 的证据门槛。用户认可与视觉审核分开表达，不默认要求用户每张图确认。

## 当前证据与约定

`scripts/render_prompt.py:564` 为 3.1 写入 `family-crayon-card-v3`；`:583` 定义工作流；`:615` 的最后一次编辑直接写入：

```python
"id": "scribble-chaos-correction",
"operation": "edit",
"required": True,
"output_status": "final",
```

`scripts/test_render_prompt.py:135`、`:147` 相应断言最后阶段及 final。`benchmarks/style-3.1/README.md:66` 写的是“内部通过，待用户复核”；`:67` 记录单次强修正改变衣裙配色的反例。该历史记录不能改写为用户已经接受。

已有 `scripts/validate_style_20_asset.py` 采用标准库、JSON 报告、成功退出 0／拒收或错误退出 2；可沿用 CLI 形式和错误处理方式，不复制其色彩阈值或八维评分。项目运行环境为 Python 3.10+，新增代码沿用类型标注、snake_case 和标准库，不增加第三方依赖。

## 修改范围

允许修改：

- `scripts/render_prompt.py`、`scripts/test_render_prompt.py`。
- 新建 `scripts/validate_style_3_1_asset.py`、`scripts/test_style_3_1_asset.py`。
- `scripts/check_skill.py`、`scripts/test_installation.py`，仅补运行文件登记和验收器安装检查。
- 新建 `docs/style-3.1-review.md`，给出调用方最小记录格式、迁移和示例。
- `AGENTS.md`、`SKILL.md`、`PROTOCOL.md`、`README.md`、`examples/README.md`；`STYLES.md` 仅更新 3.1 配方代码块之外的合同说明。
- `plans/README.md`、本计划，仅更新实施状态与验证证据。

禁止修改：所有画风代码块、两段蜡笔修正 prompt、任何参考图和图片清单、历史 benchmark 原文、19／20 的行为、图床、主机、安装副本及无关文件。不生图、不增加自动重试或额外编辑阶段，不提交或推送。

漂移检查：

```bash
git diff --stat 4132988..HEAD -- scripts AGENTS.md SKILL.md PROTOCOL.md README.md STYLES.md examples/README.md docs
git status --short
```

既有工作区修改需同时核对，不能仅看 HEAD。存在冲突改动时暂停对应文件。

## 目标合同

合同升级为 `family-crayon-card-v4`：三次生成／编辑步骤的顺序、prompt、参考图和保留条件完全不变；第三次输出改为 `final-candidate`，末尾追加 `style-contract-check`，`operation=validate`。`final_output_stage` 指向验收步骤，成功为 final，失败或证据不足均不能成为 final。

新 CLI：

```text
python3 scripts/validate_style_3_1_asset.py --bundle BUNDLE.json --run-record RUN.json --review REVIEW.json [--output REPORT.json]
```

这是待实现接口，不是现有可用命令。只校验记录与文件，不调用图像模型，不重放生成，不联网。

记录格式应保持最小，并在文档中给出完整可运行示例：

| 输入 | 必需内容 | 检查 |
|---|---|---|
| bundle | 原始正式调用包，3.1／v4，原 prompt、输入变量、参考图及工作流 | 合同、完整三次图像操作及验收步骤；原调用包文件 SHA-256 作为绑定身份 |
| run-record | bundle SHA-256；按顺序排列的三条记录：stage_id、prompt_sha256、输入文件及 SHA-256、输出文件及 SHA-256 | 文件存在且哈希一致；编辑输入与前阶段输出相接；每步携带规定锚点；首步保留 bundle 中角色参考 |
| review | bundle SHA-256、final_image_sha256、reviewer.kind（human／agent）、reviewer.id、reviewed_at、逐项结论和观察说明 | 与本次候选绑定；日期格式有效；每项均有 pass／fail／not-reviewed 和非空观察说明 |

所有路径相对其记录文件所在目录解析，支持绝对路径；不依赖当前 shell 目录。不把文件复制到仓库。三张阶段输出均须是现有解码函数可读取的有效 PNG，不能仅凭任意文件的哈希放行。阶段记录中的 prompt hash 必须对照 bundle 对应的实际 prompt 计算；锚点继续核对既有身份。记录不能证明调用方确实按该 prompt 调过模型，报告与文档必须说明这一信任边界。

视觉审核固定八项，全部通过才允许 final；不引入未经校准的总分：

1. `content-preservation`：人物身份、数量、动作、关系、必要物件符合请求，三阶段没有丢失或替换。
2. `face-language`：符合 3.1 的点眼、歪线表情和腮红，人物有差异。
3. `proportions`：成人与儿童差异和形体语言正确。
4. `line-language`：黑线的粗细、压力与不规则性符合现行配方。
5. `scribble-language`：没有以细密、等距、同向斜排线替代蜡笔涂抹。
6. `color-preservation`：编辑保留原有物件配色，填色节奏符合配方，不硬套其他画风色板。
7. `composition-preservation`：保留请求及基础图的构图、画幅、白底和必要留白。
8. `text-and-originality`：标题按请求准确保留或无字，不复制锚点人物、站位和故事内容。

审核者必须实际查看请求、锚点、基础图及两次编辑输出。程序检查记录完整性和一致性，不声称识别了脸、笔触或物件。缺少记录为 `pending-review`；实际审核失败为 `rejected`；只有完整通过为 `pass` 并给出 final。语法错误、哈希不符或阶段链无效退出 2。非 pass 的报告都不得携带 final。

报告同时输出 `workflow_evidence_status`、`visual_review_status`、审核来源及观察说明。不要生成 `user-approved`；真实用户反馈由调用方单独保留，未收到反馈不得推断认可。本计划不实现用户审批服务。

## 执行步骤与验证

所有命令在项目根目录执行。当前基线的 67 项测试曾因缺少参考图缓存出现失败，补取又遇到域名解析错误及另一路 HTTP 503；没有全量通过证据。先执行以下既有命令，或复用本次实施中已完成同等校验的缓存：

```bash
cd /Users/liulei/projects/hand-drawn-styles
export PYTHONDONTWRITEBYTECODE=1
export HAND_DRAWN_IMAGE_CACHE="$(mktemp -d /tmp/hand-drawn-acceptance-cache.XXXXXX)"
HAND_DRAWN_OFFLINE=0 python3 -B scripts/hosted_images.py fetch
HAND_DRAWN_OFFLINE=1 python3 -B -m unittest discover -s scripts -p 'test_*.py'
```

1. **建立基线。** 记录原有测试结果。取各模板和修正 prompt 的摘要，留在临时审查记录中。资源仍不可用时可以写不依赖图片的测试，但不得宣布全量基线通过。
   - 验证：`PYTHONDONTWRITEBYTECODE=1 HAND_DRAWN_OFFLINE=1 python3 -B scripts/check_skill.py` → 有有效缓存时 21 项完整调用通过。
2. **实现审核器与有意义的失败用例。** 参考现有 20 号 CLI 的 JSON／退出码约定；新测试用临时合成文件检查文件链及记录绑定，禁止拿合成数据宣称真实审美通过。
   - 验证：`PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=scripts python3 -B -m unittest test_style_3_1_asset` → 新增正向及下列负向测试全部通过；该命令待新增模块后可用。
3. **升级调用包和调用测试。** 加入 v4、候选状态、验收步骤及审核合同。拒绝用 v3 记录冒充 v4 审核。只改 3.1 分支，不抽象整个工作流系统。
   - 验证：`PYTHONDONTWRITEBYTECODE=1 HAND_DRAWN_OFFLINE=1 PYTHONPATH=scripts python3 -B -m unittest test_render_prompt test_style_3_1_asset` → 全通过；3.1 三次图像操作仍依次存在，只有验收步骤能够给出 final。
4. **同步现行说明与轻量包。** 更新所有当前 v3 调用说明，历史 benchmark 保留原文；在现行文档指向审核说明。运行文件清单包含新脚本及审核说明。
   - 验证：`rg -n 'family-crayon-card-v3|第三阶段输出才是 final|只有第三阶段输出才允许进入 final' AGENTS.md SKILL.md PROTOCOL.md README.md examples/README.md STYLES.md` → 仅允许明确标注的历史／迁移说明。
   - 验证：`PYTHONDONTWRITEBYTECODE=1 HAND_DRAWN_OFFLINE=1 python3 -B scripts/build_skill_package.py` → verified；解压环境中的新验收器 `--help` 可用，旧目录结构保持完整。

## 测试与完成标准

- 新测试覆盖：缺阶段、阶段顺序错误、前后文件断链、任一文件哈希不符、无效 PNG、错误 bundle、错误候选、缺锚点、角色参考丢失、错误 prompt hash、v3 误用、审核缺项、fail、not-reviewed、空说明和畸形 JSON。
- 正向测试验证通过报告仍保留审核来源，不写用户认可；非 pass 退出 2，不返回 final。临时文件隔离，测试不出图、不联网。
- 以既有 `test_style_3_1_json_contains_required_anchor` 和 20 号评分卡绑定测试为范式；更新旧 final 断言，不能删除它以规避验证。
- 在测试中冻结本次基线的 21 套配方及两段修正 prompt 的摘要，验证本改动没有改写它们；后续有意升级配方时才按相应研发流程更新摘要。
- 最终运行：`PYTHONDONTWRITEBYTECODE=1 HAND_DRAWN_OFFLINE=1 python3 -B -m unittest discover -s scripts -p 'test_*.py'`，及 `scripts/check_skill.py`、`scripts/build_skill_package.py`，均退出 0。
- `git diff --check` 无错误；变更仅限上述范围；总计划状态附实际结果。不要把工程验收写成真实样图通过。

## 停止条件与维护

所需源码已漂移、发现已有下游硬编码三阶段且需要改下游仓库、必须修改配方才能实现、必须绕过参考图校验，均停止对应实施并报告。外部图片不可用只阻塞相关测试和最终交付，不阻止独立文档工作。一次合理修复后同一检查仍失败，先记录原因再决定，不连续放宽断言。

v4 是对调用端有影响的合同升级；迁移说明必须写清“3 次图像操作 + 1 次验收”。本仓库不负责升级外部调用端或已安装副本。未来模型／配方变化时要重新做真实样图验证，不能仅更新评分记录。
