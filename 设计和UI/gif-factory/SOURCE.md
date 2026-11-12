# gif-factory — 来源

- Skill: `gif-factory`（GIF 工厂总入口，另含三个子 skill）
- 上游: https://github.com/WoYun520/gif-factory
- 作者: Levi 卧云（@Leviwoyun / WoYun520）
- Commit: 73900423f126389eaacd2c71f30443d32dde7228
- Commit 时间（北京）: 2026-11-12 09:55:52 CST
- 许可证: MIT（LICENSE，Copyright (c) 2026 WoYun520）
- 分类: 设计和UI
- 收录日期（北京）: 2026-11-12
- 排除: `.git`

## 收录依据

- 主推文（GPT image 2.6 大字标题设计 skill 开源，40 种字体与排版风格）: https://x.com/Leviwoyun/status/2120469968060043639
- 发布时间（北京）: 2026-11-11 18:53
- 引用推文（动态签名 skill 2.0：粒子效果 + 乐器）: https://x.com/Leviwoyun/status/2120336583174017065

主推文四张原图保存在 `archive/tweets/`：

| 文件 | 尺寸 |
| --- | --- |
| [HW1rljna4AAnSfB.jpg](archive/tweets/HW1rljna4AAnSfB.jpg) | 2448×2832 |
| [HW1rnLYaQAAF7xH.jpg](archive/tweets/HW1rnLYaQAAF7xH.jpg) | 2448×2832 |
| [HW1rpydaMAA3whD.jpg](archive/tweets/HW1rpydaMAA3whD.jpg) | 2459×2998 |
| [HW1rrDoawAAA5jw.jpg](archive/tweets/HW1rrDoawAAA5jw.jpg) | 2459×2998 |

## 仓库内容

GIF 工厂：根据需求选择表情包、光栅变画卡、动态海报、动态签名、电影片头、动态绘本或品牌短片的做法。一般安装总入口即可；也可单独安装子 skill。

| Skill | 路径 | 说明 |
| --- | --- | --- |
| GIF 工厂总入口 | `SKILL.md` | 按需求分发到各做法 |
| 电影片头 / 大字标题 | `skills/cinematic-title-lettering/` | 40 种字体与排版风格 |
| 动态签名 | `skills/dynamic-art-signature/` | 多种字体和自定义字稿，2.0 含粒子效果与乐器 |
| 动态绘本 | `skills/compact-storybook/` | 插画动作后再翻页，横屏或竖屏 |

## 归档布局

- GitHub `yaoyao-cw/Pai-skill`: 完整上游工作区（不含 `.git`）+ 本 SOURCE.md + 推文原图，位于 `设计和UI/gif-factory/`。
- Drive 185 `Pai/Pai-skill/设计和UI/gif-factory/` 与 Drive 477 `Pai-skill/设计和UI/gif-factory/`: 关键文件散放（`SOURCE.md`、`README.md`、`SKILL.md`、`LICENSE`、`GUIDE.md`、推文原图）+ 完整上游树分卷 zip（`gif-factory-upstream-7390042.zip` 及 `.z01` 起的分卷，单卷不超过 90MB）。合并：`zip -s 0 gif-factory-upstream-7390042.zip --out gif-factory-upstream-7390042-full.zip`。
