# Pai-skill

PAI 的 agent skill 仓库。按领域分目录存放可被 Grok / Claude / 其他 coding agent 加载的 `SKILL.md`。

## 目录

```
设计和UI/
  design-md/                 把品牌判断写成 design.md，约束 CSS primitives，避免通用 SaaS 布局
品牌IP与形象/
  ip-as-logo/                极简圆角吉祥物方图（s1dashu，MIT）
  personal-ip-image-pack/    授权照片转个人卡通 IP（DoraRabbitYan）
  ip-character-designer/     动漫 IP 全案 / 日系轻漫画（Beatatata，MIT）
  pai-infinite-loop-ip/      Pai 无限循环人设质量锁与出图流程（本仓库）
购物/
  taobao-buy/                淘宝下单与限时抢购：真实鼠标选规格、整点立即购买、验证码与付款交接
```

## 安装

把某个 skill 目录拷到 agent 的 skills 路径，例如：

```bash
cp -R 设计和UI/design-md ~/.grok/skills/design-md
cp -R 品牌IP与形象/pai-infinite-loop-ip ~/.grok/skills/pai-infinite-loop-ip
cp -R 购物/taobao-buy ~/.grok/skills/taobao-buy
```

新开一轮对话后才会被发现。
