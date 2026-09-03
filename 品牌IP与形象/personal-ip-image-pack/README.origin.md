# 个人 IP 图像包

把 1–2 张本人或已获授权的人物照片，转化为一套**可确认、可复用、可持续扩展**的个人卡通 IP 资产。

它不是只生成一张头像的提示词合集，而是一套面向 Codex 的完整工作流：先选择风格、确认照片与使用范围，再建立并冻结人物原型；之后所有头像、表情、动作、换装或场景资产都基于同一个人物版本扩展，并通过角色设定、交付清单和验收记录保持长期一致。

[直接查看 6 种风格模板](STYLE_LIBRARY.md) · [查看完整 Skill 工作流](SKILL.md) · [直接查看交付模板](#直接查看交付模板)

## 它解决什么问题

普通的“照片转卡通”往往只解决一张图：下一次换一个动作、表情或场景，人物就可能变脸、换发型或改变穿搭。

`personal-ip-image-pack` 把人物特征和可变内容分开管理：

- **人物身份锁定**：固定脸型、发型、眼镜、标志性服装、配色和比例。
- **按需扩展**：只改变本轮指定的表情、姿势、手势或必要道具。
- **先确认再批量**：人物原型未确认前，不生成整套贴纸或动作图。
- **版本可回退**：人物版本与交付版本分别记录，修改和回退都有依据。
- **结果可验收**：每张独立资产都记录尺寸、背景、透明通道和 QA 状态。

它适合小红书博主、内容创作者、自由职业者和个人品牌，用来制作头像、表情贴纸、动作素材、换装角色、封面人物或轻量场景卡。

## 它会交付什么

根据所选风格和本次需求，你可以获得：

- 一张经过确认的人物原型；
- 独立的头像、表情贴纸、动作、换装或场景 PNG；
- 可选的整套预览拼图；
- 锁定人物特征的角色设定文件；
- 记录尺寸、透明通道、版本和校验值的交付清单；
- AI 发布检查与用户验收记录。

每个贴纸或动作都是独立源文件。预览拼图只用于查看，不会替代可直接使用的 PNG。

## 快速开始

### 方法一：让 Codex 帮你安装

把下面这段话发送给能够访问本地文件的 Codex：

> 请将这个仓库安装为 Codex Skill，并确认 `personal-ip-image-pack` 可以使用：
>
> https://github.com/DoraRabbitYan/personal-ip-image-pack

### 方法二：手动安装

把仓库克隆到 Codex 的 skills 目录。下面使用默认的 `~/.codex` 路径；如果你设置了 `CODEX_HOME`，请改用其中的 `skills` 目录。

macOS / Linux：

```bash
git clone https://github.com/DoraRabbitYan/personal-ip-image-pack.git ~/.codex/skills/personal-ip-image-pack
```

Windows PowerShell：

```powershell
git clone https://github.com/DoraRabbitYan/personal-ip-image-pack.git "$env:USERPROFILE\.codex\skills\personal-ip-image-pack"
```

安装完成后，在 Codex 的下一条消息中显式调用 `$personal-ip-image-pack`。如果当前任务没有发现新 Skill，再重新打开任务。

本地交付工具需要 Python 3.10 或更高版本；图片尺寸与透明通道校验还需要 Pillow：

```text
python -m pip install Pillow
```

## 第一次使用

上传 1 张清晰的正脸或四分之三侧脸照片；如需校正发型、穿搭或配饰，可再补 1 张辅助照片。然后发送：

```text
使用 $personal-ip-image-pack。
我已确认有权使用上传的照片。
请先让我选择 IP 风格，再根据照片建立一个可长期复用的人物原型。
我的主要用途是：小红书头像和表情贴纸。
在我确认原型之前，请不要批量生成套图。
```

Skill 会按下面的顺序推进：

`选择风格 → 确认授权与照片可用性 → 建立并确认人物原型 → 扩展独立资产 → QA 与版本化交付`

## 六种风格

| 编码 | 风格 | 最适合 | 不建议 |
| --- | --- | --- | --- |
| `IP-01` | 简笔涂鸦头像 | 头像、半身表情贴纸 | 全身、换装、场景 |
| `IP-02` | 清透扁平肖像 | 头像、半身贴纸、封面卡 | 换装 |
| `IP-03` | 粉蜡笔撞色肖像 | 头像、表情贴纸、全身动作贴纸 | 换装 |
| `IP-04` | 彩铅换装小人 | 全身立绘、换装、全身贴纸、头像裁切 | 场景 |
| `IP-05` | 治愈手帐小剧场 | 单人贴纸、微场景卡、连续场景 | 换装 |
| `IP-06` | 粗线撞色漫画 | 头像、半身贴纸、海报封面卡 | 换装、场景 |

[打开完整的风格选择模板](STYLE_LIBRARY.md)，可以查看每种风格的视觉特征、能力范围和可直接复制的使用指令。

仓库还包含一个[交互式 HTML 风格库](assets/style-library/index.html)。GitHub 不会直接运行仓库中的 HTML；克隆或[下载仓库 ZIP](https://github.com/DoraRabbitYan/personal-ip-image-pack/archive/refs/heads/main.zip) 后，在本地打开 `assets/style-library/index.html` 即可使用。

## 直接查看交付模板

这些模板会被复制到每个私有交付包中，再根据实际任务填写。点击文件名即可在 GitHub 中直接查看：

- [输入简报 `input-brief.yaml`](assets/templates/input-brief.yaml)：记录肖像授权、照片状态、风格、用途和本次范围。
- [角色设定 `character-spec.yaml`](assets/templates/character-spec.yaml)：锁定人物特征、视觉规则和允许修改的变量。
- [交付清单 `delivery-manifest.json`](assets/templates/delivery-manifest.json)：记录每项资产的版本、尺寸、透明通道、校验值和 QA 状态。
- [验收记录 `acceptance-qa.md`](assets/templates/acceptance-qa.md)：用于发布前检查、失败修复和用户确认。

完整的目录、版本和发布门槛见[个人 IP 稳定交付契约](references/delivery-contract.md)。

## 隐私、肖像与素材权利

- 只使用本人照片，或已经获得适当授权的人物照片。
- 不要上传证件、住址、联系方式等敏感信息。
- Skill 规定不得把用户原始照片复制进 Skill 仓库或默认交付包。
- 不从照片推断年龄、种族、健康、宗教、性取向等未由用户提供的敏感属性。
- 内置风格参考图只有在[素材权利台账](references/style-asset-rights.yaml)标记为 `cleared` 时，才能传入图像生成工具；当前六组内置参考图均为 `pending_clearance`，因此只能使用文字风格规范。
- 风格参考只用于提取视觉语言，不复制参考人物、文字、签名、水印或可识别作品元素。

## 仓库导航

- [`SKILL.md`](SKILL.md)：Skill 入口、阶段流程和关键约束。
- [`references/style-specs.yaml`](references/style-specs.yaml)：六种风格、能力范围与风格 QA 的唯一事实来源。
- [`references/generation-prompts.md`](references/generation-prompts.md)：原型和资产扩展的提示词结构。
- [`references/asset-forms.yaml`](references/asset-forms.yaml)：各类资产的画幅、格式和安全边距。
- [`assets/templates/`](assets/templates/)：交付契约模板。
- [`scripts/init_delivery_package.py`](scripts/init_delivery_package.py)：创建不会覆盖旧文件的交付包骨架。
- [`scripts/validate_delivery.py`](scripts/validate_delivery.py)：校验清单引用的文件、格式、尺寸、透明通道、哈希和部分发布字段。

## 本地交付工具

以下命令均从仓库根目录运行。创建一个新的私有交付包：

```text
python scripts/init_delivery_package.py <character-id> --output-root outputs
```

填写模板并放入实际资产后，执行发布前校验。把 `rN` 替换为实际发布号；如果校验的就是默认 `r1`，可以省略 `--manifest` 参数：

```text
python scripts/validate_delivery.py <delivery-root> --manifest contracts/delivery-manifest-rN.json --ready
```

脚本只验证可机器检查的清单和文件字段。照片可用性、人物原型确认、风格能力匹配、素材权利状态和预览拼图来源仍需按 [`SKILL.md`](SKILL.md) 与[交付契约](references/delivery-contract.md)人工确认。

默认输出目录 `outputs/` 已被 Git 忽略。不要把用户原始照片提交到本仓库。
