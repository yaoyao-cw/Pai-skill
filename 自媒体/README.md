# 自媒体

内容生产、分发、账号运营相关 skill。

## Skills

| 目录 | 用途 | 来源 |
| --- | --- | --- |
| `Easel/` | OpenClaw 自媒体 skill 包（优先 `skills/openclaw`） | [ZJU-REAL/Easel](https://github.com/ZJU-REAL/Easel) |
| `yichen-jianying-edit/` | 匹配版剪映上无界面生成/修改原生草稿，或按明确要求导出原生 MP4 | [mcncarl/yichen-skills](https://github.com/mcncarl/yichen-skills/tree/main/yichen-jianying-edit) |
| `cy-carousel/` | AI 科技类小红书图文轮播（封面＋10 页，真实素材 + 手排） | [chengyi-ai/cy-carousel-skill](https://github.com/chengyi-ai/cy-carousel-skill) |
| `openzine/` | PDF 或图片文件夹转可翻页 3D 电子书（独立 HTML，离线可用） | [JosssphZhou/openzine](https://github.com/JosssphZhou/openzine) |
| `live-panel-skill/` | 一份 JSON 生成动态架构图：终端风常驻动画或浅色动态信息图，导出 H.264 mp4 或实时网页 | [ythx-101/live-panel-skill](https://github.com/ythx-101/live-panel-skill) |

## 安装

把需要的子 skill 拷到 agent skills 路径，例如：

```bash
cp -R 自媒体/Easel/skills/openclaw/card-xiaohongshu ~/.grok/skills/card-xiaohongshu
cp -R 自媒体/yichen-jianying-edit ~/.grok/skills/yichen-jianying-edit
cp -R 自媒体/cy-carousel ~/.grok/skills/cy-carousel
cp -R 自媒体/openzine ~/.grok/skills/openzine
cp -R 自媒体/live-panel-skill ~/.grok/skills/live-panel-skill
```
