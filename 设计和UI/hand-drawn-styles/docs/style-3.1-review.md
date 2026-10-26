# 风格 3.1：独立验收与 v4 迁移

`family-crayon-card-v4` 保留原配方、锚点、两段修正 prompt 和三次图像操作。新增加的第四步只检查证据与审核记录，不生成、编辑图片，也不联网。

## 状态与迁移

| 顺序 | 阶段 | 操作 | 完成后的状态 |
| --- | --- | --- | --- |
| 1 | `base-generation` | generate | `intermediate-only` |
| 2 | `scribble-correction` | edit | `intermediate-only` |
| 3 | `scribble-chaos-correction` | edit | `final-candidate` |
| 4 | `style-contract-check` | validate | 仅报告 `status=pass` 时才给出 `output_status=final` |

旧 `family-crayon-card-v3` 把第三阶段输出直接标为 final。调用端升级时应读取 `operation`：执行三次图像操作后，保存原始调用包、三阶段运行记录和视觉审核记录，再执行验收器。不能假设 workflow 中每一项都调用图像模型，也不能仅把旧包的版本字符串改为 v4。v3 包会被拒绝；应重新取得 v4 正式调用包。

本次不升级外部调用端、已安装副本或历史 benchmark。历史“内部通过，待用户复核”仍是原状态。程序不会生成 `user-approved`；真实用户反馈由调用端单独记录。当前 3.1 专节和 v4 合同约束本流程，不借用其他画风或历史附录放宽白底、涂抹及保留条件。

## 调用与退出码

```bash
python3 scripts/validate_style_3_1_asset.py \
  --bundle /absolute/path/to/run/bundle.json \
  --run-record /absolute/path/to/run/run.json \
  --review /absolute/path/to/run/review.json \
  --output /absolute/path/to/run/report.json
```

- `pass`：文件与记录一致，八项审核全部 pass 且有非空观察说明。退出 0，唯一可给出 final 的结果。
- `pending-review`：缺记录、缺文件、缺阶段、缺审核项、未审核或缺观察说明。退出 2，无 `output_status`。
- `rejected`：审核失败，或 JSON、合同、哈希、顺序、输入链、PNG、审核者及日期格式无效。退出 2，无 `output_status`。

报告分别给出 `workflow_evidence_status` 和 `visual_review_status`，以及审核来源、时间、逐项观察和失败原因。格式错误归为相应部分的 `invalid`。文件写入失败也退出 2。提供 `--output` 时，调用端应使用当前退出码和当前报告，不得复用旧报告推断本次通过。

## 记录格式

### 原始调用包 bundle.json

直接保存渲染器的正式 JSON；包括 `style_id`、`style_contract`、`prompt`、`inputs`、`references`、`workflow` 和 `acceptance_contract`。不得手写或删减合同。SHA-256 计算原文件的全部字节，空格、换行和字段顺序改变都会改变绑定身份。归档后应保持原样。

### 运行记录 run.json

根节点含 `bundle_sha256` 与按顺序排列的三条 `stages`。每条记录包含：

- `stage_id`：正式 workflow 的阶段 ID。
- `prompt_sha256`：实际提交的完整 prompt 的 UTF-8 字节摘要；基础图对照顶层 prompt，两次编辑对照对应阶段 prompt。
- `inputs`：按模型输入顺序排列的 `{ "path": "…", "sha256": "…" }` 文件记录。第一步必须是锚点和全部角色参考；编辑步必须是前一步输出和同一锚点。
- `output`：`{ "path": "…", "sha256": "…" }`。三张阶段输出均须是现有解码器支持的非空 PNG（8-bit、非交错）。

调用包中的路径相对 bundle 文件目录解析，运行记录中的路径相对 run 文件目录解析；两者均支持绝对路径，与执行命令时的 cwd 无关。审核记录只按哈希绑定调用包与候选，不引用其他文件路径。阶段链同时检查解析后的文件路径与文件哈希；换用另一个副本需要如实更新记录。

### 视觉审核 review.json

根节点含：

- `bundle_sha256`、`final_image_sha256`：原始调用包与第三阶段候选的文件摘要。
- `reviewer`：`kind` 为 `human` 或 `agent`，`id` 为可追溯的非空标识。
- `reviewed_at`：带时区的有效 ISO 8601 时间，如 `2026-10-16T12:00:00+08:00`。
- `checks`：以下八项，每项含 `status`（pass / fail / not-reviewed）和非空 `observation`。不设总分，不允许用其他项的通过抵消一项失败。

| 审核项 | 需要实际观察的内容 |
| --- | --- |
| `content-preservation` | 人物身份、数量、动作、关系与必要物件符合请求，三阶段间未丢失或替换 |
| `face-language` | 点眼、歪线表情、腮红与人物差异符合 3.1 锚点 |
| `proportions` | 成人儿童有差异，形体语言符合锚点 |
| `line-language` | 黑线粗细、压力和不规则性符合锚点 |
| `scribble-language` | 涂抹未退化为细密、等距、同向斜排线 |
| `color-preservation` | 保留已有物件配色与填色节奏，未套用另一套色板 |
| `composition-preservation` | 保留构图、画幅、白底与必要留白 |
| `text-and-originality` | 标题准确或无字，未复制锚点中的人物、站位和故事 |

审核者须实际查看原始请求、锚点、角色参考（如有）、基础图与两次编辑输出，然后填写具体观察；例如指出哪件衣服、哪一个动作在哪一步发生变化。不要用“脚本通过”或“流程已完成”替代视觉观察。

## 完整记录示例

前提：调用端已用原始正式包完成三次图像操作，并将原始包保存为 `bundle.json`，将实际输出保存为 `base.png`、`scribble.png`、`candidate.png`，位于仓库之外的同一运行目录。执行下例前设置 `STYLE_3_1_RUN_DIR` 为该目录的绝对路径，并在 Skill 根目录执行。

下面代码可运行，展示完整记录结构并生成一份**待审核**模板。它根据包与现存文件推导预期记录，不能证明模型实际收到这些输入；正式调用端须在每次真实调用时记录实际 prompt、输入与输出，不能把事后推导的记录当成调用证明。

```python
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

skill_root = Path.cwd()
sys.path.insert(0, str(skill_root / "scripts"))
from render_prompt import STYLE_3_1_REVIEW_DIMENSIONS

run_directory = Path(os.environ["STYLE_3_1_RUN_DIR"]).resolve()
bundle_path = run_directory / "bundle.json"
bundle = json.loads(bundle_path.read_text(encoding="utf-8"))
bundle_sha256 = hashlib.sha256(bundle_path.read_bytes()).hexdigest()


def file_record(path):
    path = path.resolve()
    return {
        "path": os.path.relpath(path, run_directory),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


reference_paths = [(bundle_path.parent / reference["path"]).resolve()
                   for reference in bundle["references"]]
output_paths = [run_directory / name for name in ("base.png", "scribble.png", "candidate.png")]
stages = []
for index, stage in enumerate(bundle["workflow"]["stages"][:3]):
    prompt = bundle["prompt"] if index == 0 else stage["prompt"]
    input_paths = reference_paths if index == 0 else [output_paths[index - 1], reference_paths[0]]
    stages.append({
        "stage_id": stage["id"],
        "prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "inputs": [file_record(path) for path in input_paths],
        "output": file_record(output_paths[index]),
    })

run_record = {"bundle_sha256": bundle_sha256, "stages": stages}
review = {
    "bundle_sha256": bundle_sha256,
    "final_image_sha256": file_record(output_paths[-1])["sha256"],
    "reviewer": {"kind": "human", "id": "replace-with-actual-reviewer"},
    "reviewed_at": datetime.now(timezone.utc).isoformat(),
    "checks": {
        dimension: {"status": "not-reviewed", "observation": "待查看请求、参考与三阶段图片后填写具体观察。"}
        for dimension in STYLE_3_1_REVIEW_DIMENSIONS
    },
}
for name, record in (("run.json", run_record), ("review.json", review)):
    destination = run_directory / name
    with destination.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
```

示例以独占写入创建记录，已有同名文件时停止，避免覆盖已有证据。随后执行前述验收命令，预期为 pending-review / 退出 2。审核者看完全部材料后，替换真实身份、实际审核时间及八项结论与观察，再运行验收；不要批量把 not-reviewed 改成 pass。

## 信任边界与回归范围

哈希能发现文件与声明不一致，不能证明图像模型真正使用了声明的 prompt、参考图，不能证明审核者确实看过图，也不能自动判断审美。报告中的视觉结论来自注明身份的审核者。伪造一致的记录仍可能通过结构检查，因此调用端必须保留可靠执行日志和审核过程。

合成 PNG 用例仅验证证据门槛、失败关闭和路径解析。工程测试通过不代表真实样图通过，更不代表用户认可。今后改变模型、配方、修正 prompt 或参考图，须另做真实视觉回归；本次没有新增出图或自动重试流程。
