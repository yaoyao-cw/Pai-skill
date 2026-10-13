# Pai-skill

PAI 的 agent skill 仓库。按领域分目录存放可被 Grok / Claude / 其他 coding agent 加载的 `SKILL.md`。

## 目录

```
设计和UI/
  design-md/                      把品牌判断写成 design.md，约束 CSS primitives，避免通用 SaaS 布局
  holo-card/                      从图片生成可交互全息卡（LerSent001）
  answer-me-with-html/            复杂解释做成一页 HTML（QingYunA；模型写稿，CLI 渲染）
  archify/                        想法或代码库画成可交互架构图（tt-a1i，MIT，v3.0.1）
  jakubkrehel-skills/             界面设计工程技能集合（UI/字体/颜色/无障碍/布局/文案 + review 工作流；jakubkrehel）
  anatomy/                        一句话生成精细可交互等距机械图（物体即解释；SVG + WebGL / 3D；wheresryan22）
  brands-design-md/               品牌 DESIGN.md / tokens 参考库（ricocc，无 SKILL.md）
品牌IP与形象/
  ip-as-logo/                     极简圆角吉祥物方图（s1dashu，MIT）
  personal-ip-image-pack/         授权照片转个人卡通 IP（DoraRabbitYan）
  ip-character-designer/          动漫 IP 全案 / 日系轻漫画（Beatatata，MIT）
  pai-infinite-loop-ip/           Pai 无限循环人设质量锁与出图流程（本仓库）
  ip_illustration_for_yourself/   萌粒风个人 IP 全套（EverettFish）
  avatar-forge-skill/             风格锁定头像 AvatarForge（SeasonXue，MIT）
  Punk-Skill/                     punk-avatar + punk-cover（adrianpunk）
购物/
  taobao-buy/                     淘宝下单与限时抢购：真实鼠标选规格、整点立即购买、验证码与付款交接
知识库管理/
  bookmark-digest/                X 书签 → fail-closed agent inbox（runesleo）
  afu-llm-todo/                   管家阿福 Inbox → Wiki → Todo Card → Calendar（LearnPrompt）
自媒体/
  Easel/                          OpenClaw 自媒体 skill 包（ZJU-REAL）
  yichen-jianying-edit/           剪映无界面草稿生成/修改与可选原生导出（mcncarl/yichen-skills；私有核心另装）
  cy-carousel/                    AI 科技类小红书图文轮播（封面＋10 页，真实素材 + 手排；chengyi-ai）
  openzine/                       PDF 或图片文件夹转 3D 翻页电子书（独立 HTML，离线可用；JosssphZhou）
  handraw-style/                  手绘风格编号画廊与双语提示词 Skill（329 风格 + 165 排版 + 36 单色；yang0）
Skills工具/
  luban/                          鲁班：打磨可传播的 Skill 资产（LearnPrompt）
  kitter/                         Kitter CLI skill 库管理（what1f）
```

## 安装

把某个 skill 目录拷到 agent 的 skills 路径，例如：

```bash
cp -R 设计和UI/design-md ~/.grok/skills/design-md
cp -R 设计和UI/holo-card ~/.grok/skills/holo-card
cp -R 设计和UI/answer-me-with-html ~/.grok/skills/answer-me-with-html
cp -R 设计和UI/archify ~/.grok/skills/archify
cp -R 设计和UI/jakubkrehel-skills ~/.grok/skills/jakubkrehel-skills
cp -R 设计和UI/anatomy ~/.grok/skills/anatomy
cp -R 品牌IP与形象/pai-infinite-loop-ip ~/.grok/skills/pai-infinite-loop-ip
cp -R 品牌IP与形象/avatar-forge-skill ~/.grok/skills/avatar-forge-skill
cp -R 品牌IP与形象/Punk-Skill/skills/punk-avatar ~/.grok/skills/punk-avatar
cp -R 购物/taobao-buy ~/.grok/skills/taobao-buy
cp -R 知识库管理/bookmark-digest ~/.grok/skills/bookmark-digest
cp -R 知识库管理/afu-llm-todo ~/.grok/skills/afu-llm-todo
cp -R 自媒体/yichen-jianying-edit ~/.grok/skills/yichen-jianying-edit
cp -R 自媒体/cy-carousel ~/.grok/skills/cy-carousel
cp -R 自媒体/openzine ~/.grok/skills/openzine
cp -R 自媒体/handraw-style ~/.grok/skills/handraw-style
cp -R Skills工具/luban ~/.grok/skills/luban
cp -R Skills工具/kitter ~/.grok/skills/kitter
```

新开一轮对话后才会被发现。
