# 限时开售演练

把占位符换成真实值后再跑。

```
商品链接：https://item.taobao.com/item.htm?id=<ITEM_ID>
目标 SKU：<SKU_TEXT>
排除规格：<FORBIDDEN 或「无」>
数量：1
价格区间：¥<MIN>–¥<MAX>
开售：当天 <HH:MM> Asia/Shanghai
```

步骤：

1. 开售前 5–10 分钟只开一个标签进商品页，确认已登录。
2. 真实鼠标点选目标 SKU，确认价格在区间内。
3. console 粘贴 `scripts/taobao-snipe.js`（先改顶部 CONFIG），或加载 `scripts/extension`。
4. 开售整点用真实鼠标点「立即购买」，再「提交订单」。
5. 待付款交给用户用手机淘宝/支付宝付。验证码约 10 秒解不了就交电脑。

不要：多标签、开售前点立即购买、点加入购物车、下占位价、买排除规格。
