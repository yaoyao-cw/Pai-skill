# 自媒体

内容生产、分发、账号运营相关 skill。

## Skills

| 目录 | 用途 | 来源 |
| --- | --- | --- |
| `Easel/` | OpenClaw 自媒体 skill 包（优先 `skills/openclaw`） | [ZJU-REAL/Easel](https://github.com/ZJU-REAL/Easel) |
| `yichen-jianying-edit/` | 匹配版剪映上无界面生成/修改原生草稿，或按明确要求导出原生 MP4 | [mcncarl/yichen-skills](https://github.com/mcncarl/yichen-skills/tree/main/yichen-jianying-edit) |
| `cy-carousel/` | AI 科技类小红书图文轮播（封面＋10 页，真实素材 + 手排） | [chengyi-ai/cy-carousel-skill](https://github.com/chengyi-ai/cy-carousel-skill) |
| `openzine/` | PDF 或图片文件夹转可翻页 3D 电子书（独立 HTML，离线可用） | [JosssphZhou/openzine](https://github.com/JosssphZhou/openzine) |
| `cinetty/` | 一份 project.yaml 生成在终端播放的架构动画（6 个成品模板；需 Python 3.12+、Make） | [JosssphZhou/cinetty](https://github.com/JosssphZhou/cinetty) |

## 安装

把需要的子 skill 拷到 agent skills 路径，例如：

```bash
cp -R 自媒体/Easel/skills/openclaw/card-xiaohongshu ~/.grok/skills/card-xiaohongshu
cp -R 自媒体/yichen-jianying-edit ~/.grok/skills/yichen-jianying-edit
cp -R 自媒体/cy-carousel ~/.grok/skills/cy-carousel
cp -R 自媒体/openzine ~/.grok/skills/openzine
cp -R 自媒体/cinetty ~/.grok/skills/cinetty
```
