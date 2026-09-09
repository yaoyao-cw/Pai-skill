# brands-design-md

> 文档：[English](./README.md) · [中文](./README.zh-CN.md)

一个开源的品牌设计参考库，收录不同品牌的 `DESIGN.md` 设计文档，以及便于浏览和识别品牌视觉形象的预览与截图资源。

本仓库适合设计师、前端开发者和使用 AI 进行界面创作的人：在开始一个页面、组件或产品界面前，先快速了解某个品牌的色彩、字体、排版、间距、圆角、组件和整体视觉气质。


## Preview 示例

下表展示了 public/brands 中随品牌资料收录的三张网站截图封面。点击图片或下方链接，即可打开该品牌对应的 preview.html；页面会以可浏览的方式展示其设计令牌、排版、色彩、组件与整体视觉风格。


![preview](./public/preview.jpg)

| Cal.com | Caldera | Duolingo |
| --- | --- | --- |
| [Preview](./brands/cal/preview.html) | [Preview](./brands/caldera/preview.html) | [Preview](./brands/duolingo/preview.html) |





## 如何使用

1. 在 `brands/` 中选择一个品牌目录。
2. 先查看截图封面和 `preview.html`，快速识别其品牌视觉形象与界面氛围。
3. 阅读 `DESIGN.md`，提取色彩、排版、间距、组件与页面节奏等设计信息。
4. 需要直接落地时，可进一步使用 `tokens.json`、`variables.css` 和 `theme.css` 作为实现参考。

例如：

- [Airbnb](./brands/airbnb/DESIGN.md)
- [Figma](./brands/figma/DESIGN.md)
- [Stripe](./brands/stripe/DESIGN.md)
- [Vercel](./brands/vercel/DESIGN.md)





## **What is DESIGN.md?**

`DESIGN.md` 是一份用 Markdown 编写的“设计上下文文档”。它把一个品牌或产品的公开视觉语言整理成结构化、可阅读、也适合提供给 AI 的参考资料。

一份 `DESIGN.md` 通常包含：

- 品牌的整体视觉方向、主题与设计气质
- 色彩、字体、字号、行高、字距等排版信息
- 间距、圆角、栅格、内容宽度等布局规则
- 按钮、卡片、导航、表单等常见组件的样式描述
- 适合延续的做法，以及应避免破坏品牌风格的做法

它不是品牌官方发布的设计系统，也不替代官方网站或官方设计规范；它的价值在于为创作和实现提供一个快速、结构化的风格起点。

## 目录结构

每个品牌放在独立目录中：

```text
brands/
└── <brand>/
    ├── DESIGN.md             # 品牌设计参考文档
    ├── preview.html          # 可在浏览器中打开的视觉预览
    ├── cover_<domain>.webp   # 品牌网站截图封面
    ├── favicon.*             # 网站图标（部分品牌提供）
    ├── tokens.json           # 结构化设计令牌
    ├── variables.css         # CSS 自定义属性
    └── theme.css             # 可复用的主题样式

registry.json                 # 品牌条目索引与元数据
```

并非每个品牌目录都包含完全相同的资源；以实际文件为准。


## 已收录品牌

当前已收录 **69** 个品牌。点击“打开预览”可在浏览器中查看对应的 `preview.html`。

| 序号 | 品牌 | 网站地址 | Preview |
| ---: | --- | --- | --- |
| 1 | Airbnb | [官网](https://www.airbnb.com/) | [打开预览](./brands/airbnb/preview.html) |
| 2 | Airtable | [官网](https://www.airtable.com/) | [打开预览](./brands/airtable/preview.html) |
| 3 | Apple | [官网](https://www.apple.com/) | [打开预览](./brands/apple/preview.html) |
| 4 | Binance | [官网](https://www.binance.com/) | [打开预览](./brands/binance/preview.html) |
| 5 | BMW | [官网](https://www.bmw.com/) | [打开预览](./brands/bmw/preview.html) |
| 6 | BMW-M | [官网](https://www.bmw-m.com/) | [打开预览](./brands/bmw-m/preview.html) |
| 7 | Bugatti | [官网](https://www.bugatti.com/) | [打开预览](./brands/bugatti/preview.html) |
| 8 | Cal.com | [官网](https://cal.com/) | [打开预览](./brands/cal/preview.html) |
| 9 | Caldera | [官网](https://caldera.xyz/) | [打开预览](./brands/caldera/preview.html) |
| 10 | Claude | [官网](https://claude.ai/) | [打开预览](./brands/claude/preview.html) |
| 11 | Clay | [官网](https://www.clay.com/) | [打开预览](./brands/clay/preview.html) |
| 12 | ClickHouse | [官网](https://clickhouse.com/) | [打开预览](./brands/clickhouse/preview.html) |
| 13 | Cohere | [官网](https://cohere.com/) | [打开预览](./brands/cohere/preview.html) |
| 14 | Composio | [官网](https://composio.dev/) | [打开预览](./brands/composio/preview.html) |
| 15 | Cursor | [官网](https://www.cursor.com/) | [打开预览](./brands/cursor/preview.html) |
| 16 | Duolingo | [官网](https://www.duolingo.com/) | [打开预览](./brands/duolingo/preview.html) |
| 17 | ElevenLabs | [官网](https://elevenlabs.io/) | [打开预览](./brands/elevenlabs/preview.html) |
| 18 | Expo | [官网](https://expo.dev/) | [打开预览](./brands/expo/preview.html) |
| 19 | Figma | [官网](https://www.figma.com/) | [打开预览](./brands/figma/preview.html) |
| 20 | Framer | [官网](https://www.framer.com/) | [打开预览](./brands/framer/preview.html) |
| 21 | HashiCorp | [官网](https://www.hashicorp.com/) | [打开预览](./brands/hashicorp/preview.html) |
| 22 | IBM | [官网](https://www.ibm.com/) | [打开预览](./brands/ibm/preview.html) |
| 23 | Intercom | [官网](https://www.intercom.com/) | [打开预览](./brands/intercom/preview.html) |
| 24 | Kraken | [官网](https://www.kraken.com/) | [打开预览](./brands/kraken/preview.html) |
| 25 | Lamborghini | [官网](https://www.lamborghini.com/) | [打开预览](./brands/lamborghini/preview.html) |
| 26 | Linear | [官网](https://linear.app/) | [打开预览](./brands/linear.app/preview.html) |
| 27 | Lovable | [官网](https://lovable.dev/) | [打开预览](./brands/lovable/preview.html) |
| 28 | Mastercard | [官网](https://www.mastercard.com/) | [打开预览](./brands/mastercard/preview.html) |
| 29 | Mintlify | [官网](https://www.mintlify.com/) | [打开预览](./brands/mintlify/preview.html) |
| 30 | Mistral-AI | [官网](https://mistral.ai/) | [打开预览](./brands/mistral.ai/preview.html) |
| 31 | MongoDB | [官网](https://www.mongodb.com/) | [打开预览](./brands/mongodb/preview.html) |
| 32 | Nike | [官网](https://www.nike.com/) | [打开预览](./brands/nike/preview.html) |
| 33 | Notion | [官网](https://www.notion.com/) | [打开预览](./brands/notion/preview.html) |
| 34 | NVIDIA | [官网](https://www.nvidia.com/) | [打开预览](./brands/nvidia/preview.html) |
| 35 | Ollama | [官网](https://ollama.com/) | [打开预览](./brands/ollama/preview.html) |
| 36 | OpenCode | [官网](https://opencode.ai/) | [打开预览](./brands/opencode.ai/preview.html) |
| 37 | Pinterest | [官网](https://www.pinterest.com/) | [打开预览](./brands/pinterest/preview.html) |
| 38 | PlayStation | [官网](https://www.playstation.com/) | [打开预览](./brands/playstation/preview.html) |
| 39 | PostHog | [官网](https://posthog.com/) | [打开预览](./brands/posthog/preview.html) |
| 40 | Raycast | [官网](https://www.raycast.com/) | [打开预览](./brands/raycast/preview.html) |
| 41 | Renault | [官网](https://www.renault.com/) | [打开预览](./brands/renault/preview.html) |
| 42 | Replicate | [官网](https://replicate.com/) | [打开预览](./brands/replicate/preview.html) |
| 43 | Resend | [官网](https://resend.com/) | [打开预览](./brands/resend/preview.html) |
| 44 | Revolut | [官网](https://www.revolut.com/) | [打开预览](./brands/revolut/preview.html) |
| 45 | Runway | [官网](https://runwayml.com/) | [打开预览](./brands/runwayml/preview.html) |
| 46 | Sanity | [官网](https://www.sanity.io/) | [打开预览](./brands/sanity/preview.html) |
| 47 | Sentri-Inspired | [官网](https://sentry.io/) | [打开预览](./brands/sentry/preview.html) |
| 48 | Shopifi-Inspired | [官网](https://www.shopify.com/) | [打开预览](./brands/shopify/preview.html) |
| 49 | Slacc-Inspired | [官网](https://slack.com/) | [打开预览](./brands/slack/preview.html) |
| 50 | Spacex-Inspired | [官网](https://www.spacex.com/) | [打开预览](./brands/spacex/preview.html) |
| 51 | Spotify | [官网](https://www.spotify.com/) | [打开预览](./brands/spotify/preview.html) |
| 52 | Starbucks | [官网](https://www.starbucks.com/) | [打开预览](./brands/starbucks/preview.html) |
| 53 | Stripi-Inspired | [官网](https://stripe.com/) | [打开预览](./brands/stripe/preview.html) |
| 54 | Supabaze-Inspired | [官网](https://supabase.com/) | [打开预览](./brands/supabase/preview.html) |
| 55 | Superhumon-Inspired | [官网](https://superhuman.com/) | [打开预览](./brands/superhuman/preview.html) |
| 56 | Tesla | [官网](https://www.tesla.com/) | [打开预览](./brands/tesla/preview.html) |
| 57 | The Verge | [官网](https://www.theverge.com/) | [打开预览](./brands/theverge/preview.html) |
| 58 | Together-AI-Inspired | [官网](https://www.together.ai/) | [打开预览](./brands/together.ai/preview.html) |
| 59 | Uber-Inspired | [官网](https://www.uber.com/) | [打开预览](./brands/uber/preview.html) |
| 60 | Vercel | [官网](https://vercel.com/) | [打开预览](./brands/vercel/preview.html) |
| 61 | Vercel Dark | [官网](https://vercel.com/) | [打开预览](./brands/vercel-dark/preview.html) |
| 62 | Vodafone-Inspired | [官网](https://www.vodafone.com/) | [打开预览](./brands/vodafone/preview.html) |
| 63 | Voltagent-Inspired | [官网](https://voltagent.dev/) | [打开预览](./brands/voltagent/preview.html) |
| 64 | Warp-Inspired | [官网](https://www.warp.dev/) | [打开预览](./brands/warp/preview.html) |
| 65 | Webflow-Inspired | [官网](https://webflow.com/) | [打开预览](./brands/webflow/preview.html) |
| 66 | Wired-Inspired | [官网](https://www.wired.com/) | [打开预览](./brands/wired/preview.html) |
| 67 | Wise-Inspired | [官网](https://wise.com/) | [打开预览](./brands/wise/preview.html) |
| 68 | SpaceXAI | [官网](https://x.ai/) | [打开预览](./brands/x.ai/preview.html) |
| 69 | Zapier-Inspired | [官网](https://zapier.com/) | [打开预览](./brands/zapier/preview.html) |

## Preview 与 Screenshot

为了让资料库不只是文字说明，我为品牌制作并整理了两类视觉辅助内容：

- `preview.html`：将提炼出的视觉规则组织成可直接打开查看的页面预览，便于快速感受颜色、字体、层级、组件和整体风格。
- `cover_<domain>.webp`：对应品牌网站的截图封面，用于快速识别品牌视觉形象，并与设计文档、预览效果对照查看。

这两类资源的目标是降低查找和比较成本：无需先通读长文档，也能迅速判断某一品牌是否适合作为当前设计任务的参考。



## 文档来源与制作说明

本仓库中的品牌设计文档、预览页面、截图封面和相关资源均由我自行生成和整理，根据品牌设计做了校正。

在整理与生成过程中，不限于参考了以下公开设计资源：

- [getdesign.md](https://getdesign.md/)
- [Refero Styles](https://styles.refero.design/)

同时，各品牌的公开官方网站是理解和验证其当前视觉表现的重要参考。这里的内容是基于公开信息的非官方整理，不代表任何品牌的官方设计规范、授权或背书。


## 免责声明

品牌名称、商标及相关视觉资产归各自权利人所有。本仓库仅供学习、研究与设计参考使用；所有内容均为非官方整理，不构成授权、合作或隶属关系。
