# 复古科技后期特效 · Seedance 2.5 Skill

把普通创意或参考素材改写成可直接用于 Seedance 2.5 的电影级视频提示词：同一位真人创作者在暖色复古工作室中，通过手势、CRT 显示器和镜头运动，让调色曲线、参数面板与监视器窗口真实进入三维空间。

## 演示

[▶ 查看 11 秒演示视频](assets/post-production-vfx-demo.mp4)

## 这个 Skill 能做什么

- 锁定人物身份、服装、发型与面部特征，避免跨镜头漂移。
- 保持木桌、CRT、键盘、台灯和房间布局的空间连续性。
- 生成鱼眼推进、极近自拍、侧后方环绕、高位俯拍、垂直顶拍等连续镜头。
- 把曲线调色、参数面板、监视器和节点窗口写成具有透视、遮挡、景深、反射与视差的三维实体界面。
- 按时长重新分配镜头节奏，并检查时间线、转场因果、手部结构和最终英雄画面。
- 支持替换人物、产品、房间、时长、旁白和指定屏幕文字。

## 使用方法

在 Codex 中调用：

```text
使用 $sd-2-5-retro-vfx，把我的创意或参考素材改写成复古工作室电影级后期特效视频提示词。
```

也可以直接描述改编目标：

```text
使用 $sd-2-5-retro-vfx，保留 11 秒五段式镜头和暖色复古工作室，
把主角替换为我上传的角色，把 CRT 替换为指定产品，并输出中文生成提示词。
```

默认只输出可复制的提示词，不会自动提交视频生成任务。

## 安装

将本目录复制到 Codex skills 目录：

```bash
mkdir -p ~/.codex/skills
cp -R post-production-skill ~/.codex/skills/sd-2-5-retro-vfx
```

重新打开 Codex 后即可通过 `$sd-2-5-retro-vfx` 调用。

## 文件结构

```text
post-production-skill/
├── SKILL.md                         # Skill 入口与生成规则
├── README.md                        # 项目说明
├── agents/
│   └── openai.yaml                  # Codex 展示信息与默认调用文案
├── assets/
│   └── post-production-vfx-demo.mp4 # 演示视频
└── references/
    ├── master-prompt.md             # 英文完整母版提示词
    ├── master-prompt-zh.md          # 中文完整母版提示词
    └── adaptation-examples.md       # 人物、产品、旁白等改编示例
```

## 默认视觉系统

- 约 11 秒、16:9 横屏、真实电影摄影质感。
- 暖棕、琥珀、奶油白、深木色与黑色，不使用蓝紫赛博朋克风。
- 同一位年轻亚洲男性创作者与同一间 1990 年代风格个人工作室。
- 五段连续结构：多臂创作者 → 极近鱼眼与分屏 → CRT 界面涌现 → 环绕升至顶拍 → 手指操控三维后期界面。
- 快节奏现代电子乐，约 120–135 BPM，镜头、设备和 UI 动作尽量踩点。

## 提示词

- [中文完整母版](references/master-prompt-zh.md)
- [English master prompt](references/master-prompt.md)
- [改编示例](references/adaptation-examples.md)

## 注意事项

- 开场多手臂仅作为短暂合成特效，人物本体必须保持正常结构。
- UI 不是二维 HUD 贴图，必须具有真实空间关系与光学表现。
- 人物、核心道具和空间布局不能在镜头切换时随机变化。
- 禁止平台水印、Logo、无关字幕以及永久性人体畸形。

