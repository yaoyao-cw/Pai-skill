# Pai-skill

PAI 的 agent skill 仓库。按领域分目录存放可被 Grok / Claude / 其他 coding agent 加载的 `SKILL.md`。

## 目录

```
设计和UI/
  design-md/          把品牌判断写成 design.md，约束 CSS primitives，避免通用 SaaS 布局
购物/
  taobao-buy/         淘宝下单与限时抢购：真实鼠标选规格、整点立即购买、验证码与付款交接
```

## 安装

把某个 skill 目录拷到 agent 的 skills 路径，例如：

```bash
cp -R 设计和UI/design-md ~/.grok/skills/design-md
cp -R 购物/taobao-buy ~/.grok/skills/taobao-buy
```

或从本仓库安装：

https://github.com/yaoyao-cw/Pai-skill/tree/main/设计和UI/design-md  
https://github.com/yaoyao-cw/Pai-skill/tree/main/购物/taobao-buy

新开一轮对话后才会被发现。
