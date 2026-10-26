# 画风样例

这里按正式编号顺序展示样图与调用示例。完整配方只以根目录 [`STYLES.md`](../STYLES.md) 为准,避免示例页复制配方后发生漂移。

不知道选哪种时，先看 [选型说明](../docs/style-selection.md)；容易混淆的 14/18、3.1/20、19/20，以及三个历史偏差案例，见 [画风对照](../docs/style-comparison.md)。下面保留全部编号定位，图片题材不同，不能当成已执行的同题实验；样例登记也不等于完整视觉审核或用户认可。

原来的 `1`、`1.1`、`1.2` 三套配方已从旧位置删除;原 `2` 起的整数配方整体前移,因此下面的 `1` 是原 `2` 重编号后的新身份。用户认可的家庭蜡笔画风迁入 `3.1 蜡笔童涂-潦草自画版`。

## 1. 极简黑白线条讲解漫画

![极简线条 xkcd 火柴人](https://hand-drawn-images.pages.dev/hand-drawn/examples/01-minimal-line.png)

> 输入示例:「用 1 号画风讲解番茄工作法」

## 2. 蜡笔童涂

![蜡笔童涂](https://hand-drawn-images.pages.dev/hand-drawn/examples/02-crayon.png)

> 输入示例:「用 2 号画风画 OCEAN 主题:小孩戴泳镜潜水、一头大鲸鱼、几条小鱼」

## 3. 吉卜力风

![吉卜力风](https://hand-drawn-images.pages.dev/hand-drawn/examples/03-ghibli.png)

> 输入示例:「用 3 号画风画下雨天打伞的猫」

## 3.1 蜡笔童涂-潦草自画版

![蜡笔童涂-潦草自画版画风锚点](https://hand-drawn-images.pages.dev/hand-drawn/assets/style-3.1/anchor-family.png)

> 输入示例:「用 3.1 画爸爸把零食袋放回柜子,男孩站在旁边看着,不加文字」
>
> 正式生产、连续故事和多页作品必须把 [assets/style-3.1/anchor-family.png](https://hand-drawn-images.pages.dev/hand-drawn/assets/style-3.1/anchor-family.png) 作为纯画风参考随每一张请求传入,并完整执行 `family-crayon-card-v4` 的三次图像操作和独立验收。第三次输出仍是候选，验收报告 pass 才可成为 final；见 [记录与审核说明](../docs/style-3.1-review.md)。

## 4. 小豆人涂鸦信息图

![小豆人涂鸦信息图](https://hand-drawn-images.pages.dev/hand-drawn/examples/04-bean-doodle.png)

## 5. MS Paint 烂涂鸦

![MS Paint 烂涂鸦](https://hand-drawn-images.pages.dev/hand-drawn/examples/05-ms-paint.png)

## 6. 圆珠笔单线涂鸦

![圆珠笔单线涂鸦](https://hand-drawn-images.pages.dev/hand-drawn/examples/06-pen-scribble.png)

## 7. 蜡笔实拍

![蜡笔实拍](https://hand-drawn-images.pages.dev/hand-drawn/examples/07-real-crayon.png)

## 8. 水墨写意

![水墨写意](https://hand-drawn-images.pages.dev/hand-drawn/examples/08-ink-wash.png)

## 9. 复古像素

![复古像素](https://hand-drawn-images.pages.dev/hand-drawn/examples/09-pixel-art.png)

## 10. 情绪叙事淡彩速写

![情绪叙事淡彩速写](https://hand-drawn-images.pages.dev/hand-drawn/examples/10-emo-sketch.png)

## 11. 二维水彩风格

![二维水彩风格](https://hand-drawn-images.pages.dev/hand-drawn/examples/11-retro-concept.png)

## 12. 暖光童画

![暖光童画](https://hand-drawn-images.pages.dev/hand-drawn/examples/12-sunlit-storybook.png)

## 13. 北欧纸雕

![北欧纸雕](https://hand-drawn-images.pages.dev/hand-drawn/examples/13-paper-folk.png)

## 14. 北欧绘本水粉

![北欧绘本水粉](https://hand-drawn-images.pages.dev/hand-drawn/examples/14-nordic-storybook.png)

## 15. 大鼻软偶

![大鼻软偶](https://hand-drawn-images.pages.dev/hand-drawn/examples/15-softnose-vinyl.png)

## 16. 聚光水粉立绘

![聚光水粉立绘](https://hand-drawn-images.pages.dev/hand-drawn/examples/16-gouache-spotlight.png)

## 17. 墨线绘本

![墨线绘本](https://hand-drawn-images.pages.dev/hand-drawn/examples/17-inked-storybook.png)

## 18. 暖色扁平绘本

![暖色扁平绘本](https://hand-drawn-images.pages.dev/hand-drawn/examples/18-warm-flat-storybook.png)

## 19. 圆头红线极简童画

![圆头红线极简童画](https://hand-drawn-images.pages.dev/hand-drawn/assets/style-19/anchor-roundhead-redline.png)

> 输入示例：「用 19 号画风画一只幼象用鼻子提起一盏珊瑚红纸灯笼，不加文字」。正式调用必须携带这张画风参考图，并执行调用包中的验收流程。

## 20. 暖黄墨线情绪小剧场

![暖黄墨线情绪小剧场](https://hand-drawn-images.pages.dev/hand-drawn/assets/style-20/anchor-warm-yellow-ink-story.png)

> 输入示例：「用 20 号画风画两个孩子一起搬一只暖黄色坐垫，不加文字」。正式调用必须携带这张画风参考图，直接生成候选图，再运行机读验收器。

两张图均保留原始字节与 OpenAI C2PA/JUMBF 内容凭证。隐私审计状态为「已审计，未清理」，记录保留在 `assets/style-19/` 与 `assets/style-20/` 下的 `.privacy.json` 和 `.provenance.json`。图片迁移未改变此状态。

## 22. 朱墨写意转绘

![用户指定的朱墨写意骑行效果](https://hand-drawn-images.pages.dev/hand-drawn/assets/style-22/anchor-vermilion-ink-wash.png)

> 输入示例：「用22号把上传照片转为朱墨水墨漫画，保留眼镜、10号球衣、扶车姿态和车架连接」。本图是用户认可的 v1.1.0 原附件，未重新生成；默认输出带画风锚点和美术指导预处理的 JSON，照片通过 `--source-image` 传入。
>
> **已发布并校验**：2026-10-23，此图已迁移到 Cloudflare Pages，匿名下载大小及 SHA-256 与认可附件一致；证据与隐私状态见 [迁入记录](../docs/style-22-review.md)。

## 23. 皮影彩染（v0.1）

![皮影彩染：持扇女伶](https://hand-drawn-images.pages.dev/hand-drawn/examples/23-shadow-puppet.png)

灵感来自：DAAI(@daaihq)

独立全幅皮影：不要求照片输入，成图不展示原片或上下对照。本轮人物、白鹤、提梁茶壶与双层楼阁四类试作经用户确认入库，选持扇女伶作为展示图，不是强制运行锚点。

> 输入示例：「用23号画一只抬足展翅的白鹤，琥珀与橄榄绿彩染，3:4，无字」。通用配方的唯一真源是 STYLES.md 23号；来源与有限验证范围见 [记录](../docs/style-23-review.md)。
