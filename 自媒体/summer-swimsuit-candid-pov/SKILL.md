---
name: summer-swimsuit-candid-pov
description: 夏季泳装 × 男友/朋友视角自然抓拍提示词设计。当用户想要一张具有「私人相册感 / 夏季旅行感 / 亲密视角 / 自然抓拍感 / 真实摄影感」的成年人物夏季泳装照片提示词——支持单人、双人、多人；原创/随机人物；人物垫图、多人物垫图、发型/服装/姿势/构图/场景/摄影风格垫图；任意电影、游戏、动漫、漫画、电视剧、小说、特摄、虚拟角色 COS；同作品多角色或跨作品角色联动——就应使用本 skill，即使用户只丢一个角色名、一句「帮我做张泳装照」或几张参考图、没明说「提示词」或「抓拍」。核心是男朋友/伴侣/朋友 POV 的亲密抓拍，不是专业泳装棚拍或商业 COS 宣传照。严格单图（ONE IMAGE，一张画面，但允许多人同框）、人物必须为 21–30 岁成年人。只交付可直接生图的提示词文本，不直接生图。
---

# 夏季泳装 × 男友视角自然抓拍提示词设计

把用户输入转写成**一张**具有强烈「私人相册感 × 夏季旅行感 × 亲密视角 × 自然抓拍感 × 真实摄影感」的**成年人物夏季泳装提示词**。用户拿提示词去任意生图工具出图；本 Skill 只交付提示词，不直接生图。

它不是专业摄影师安排人物做泳装拍摄，而是像**朋友、伴侣或同行者正在一起过夏天，摄影者突然举起相机，刚好记录下一个真实发生的瞬间**。

核心关键词：Boyfriend POV / Partner POV / Friend POV / Companion POV / intimate candid photography / private vacation snapshot / summer memory / spontaneous moment / realistic cosplay photography / analog imperfection / wet summer atmosphere。

## 安全红线（不可协商，违反即拒绝）

在任何输出前先确认以下边界，且把它们视为硬约束：

- **主体必须为 21–30 岁成年人**。凡涉及泳装/Bikini/Swimsuit/泳装 COS，画面主要人物必须明确为成年。禁止儿童、未成年、幼态人物、儿童比例、明显学生年龄、二次元幼女视觉、未成年人泳装化。
- **原作年龄较小、年龄不明确或外观幼态的角色**：自动转成 21–30 岁成年 COS reinterpretation——保留角色最重要的视觉 DNA，但人物必须有明确成年外貌与成年比例。
- **一次只生成一张独立图片**。Single standalone photograph，One image / One frame / One scene / One continuous moment。单图不等于单人：一张画面内允许多个人，但所有人必须真实存在于同一个空间、同一个时间点、同一个连续事件中。
- **参考图人物也必须为成年**：用户上传单图/多图做人物参考时，先判断图中人物是否成年；若为未成年、幼态化或私密/偷窥性质内容，拒绝并说明，不用于生成。
- **只交付提示词，不直接生图。**

## 与相邻 Skill 的边界

- 用户要「把角色放进某张参考画面、复刻该画面构图与风格」，走 `character-in-reference-scene`。
- 用户要「用角色/场景素材编一段连续剧情、拆成一串有联系的画面提示词」，走 `plot-sketch-ninegrid`。
- 用户有完整剧本和镜头表、要「逐镜头翻成绘图提示词」，走 `storyboard-image-prompts`。
- 用户要「一张参考图 → 一张正/侧/背三视图（可带细节特写）」，走 `three-view-detail-sheet`。
- 用户「只给一个角色名或角色参考图 → 一组偷拍感/抓拍感的日常角色摄影提示词（非泳装、服装完整）」，走 `candid-shot-character-photography`。
- 用户要「成年人物夏季泳装、男友/朋友视角亲密抓拍、可多人可 COS、可垫图」，用本 Skill。与 `candid-shot-character-photography` 的区别：本 Skill 限定夏季泳装语境 + 亲密 POV（而非偷拍/遮挡窥视），核心事件是「一起过夏天」，且强调严格的 ONE IMAGE 单图规则。

## 执行状态机

1. READ：判断输入——人数（未指定默认 1 位成年女性主体）、人物来源（原创/参考图/COS 角色）、各参考图职责（身份/发型/服装/姿势/构图/场景/风格）、可选追加（场景、泳装款式、摄影媒介、原作背景）。
2. ANCHOR：为每个人建立独立的 Identity Anchor（人脸身份）与 Character Anchor（角色 DNA，如存在）；垫图只约束其承担的那一项职责。
3. PICK：随机选择一种场景、一个核心事件、一种摄影媒介、一个焦段、一个机位、一种自然光、一类水元素。
4. DESIGN：按角色人格设计 mid-action 动作与互动反应链；泳装按 Character DNA 独立转译。
5. GENERATE：按「内部生成公式」写出完整、可独立生图的中文（或按需英文）提示词，并附 Negative Guidance。
6. DELIVER：只交付这一张的提示词，不解释铺垫。

## 绝对单图规则（最高优先级）

一次调用只生成一张图片：Single standalone photograph，One image only，One frame only，One scene only，One continuous moment only。

「Single Image」只表示单幅画面，不表示只能一个人。一张图内允许一人、两人、三人、多人，前提是所有人物真实存在于同一个空间、同一个时间点、同一个连续事件中。

严格禁止：collage / contact sheet / photo grid / 九宫格 / 多图拼接 / montage / split screen / storyboard / comic panels / diptych / triptych / multi-panel / film strip / Polaroid collage / moodboard / magazine layout / character sheet / character lineup sheet / 多窗口 / 多联画 / 照片墙 / 一张画面里嵌套其他照片 / 不同时间点同时存在 / 不同地点同时存在 / 分镜式画面。

即使使用 35mm Film 或 90s Vacation Photography，也只能表现「一张真实照片的成像质感」，不能表现成胶卷联系表、照片合集或底片排列。

**Multi-person is allowed. Multi-image composition is forbidden.**

## 人物数量系统

- 数量由用户指令决定；未指定时默认一位成年女性主体。
- 用户指定多人时进入 Multi-Person Mode：两位朋友、两位 COSER、三人旅行小队、多角色组合、动漫角色小队、游戏 Party、闺蜜旅行、伴侣与朋友、多位不同作品角色、多个真人参考人物。
- 多人模式依然是 ONE IMAGE / ONE FRAME / ONE SCENE / ONE MOMENT，绝不做「三个人分别放三个小窗口」。

## 人物来源系统

- **A｜Original Person**：无垫图、无角色要求时，创建现实感强烈的成年人物。气质可随机：清冷、韩系自然、日系松弛、甜酷、阳光运动、成熟御姐、都市轻熟、安静文艺、慵懒度假、邻家感、电影女主角感、自然健康感。
- **B｜Reference Person**：有真人或人物垫图时，优先保持人物身份、脸型、五官结构、眼型、鼻型、嘴型、下颌、发际线、面部比例、人物辨识度；允许环境自然改变发型状态、湿发程度、表情、光照、水珠、汗液、晒红、妆容状态。原则：Same identity, new candid moment。
- **C｜COS Character**：指定角色时进入 Universal COS Mode。

## Universal COS System

支持来自任何媒介的角色：Anime/Manga（动漫、漫画、OVA、动画电影、国产动画、欧美动画）、Games（主机/PC/手机、RPG/JRPG/ARPG/FPS/格斗/开放世界）、Film/TV（电影、电视剧、科幻、奇幻、动作、超级英雄、武侠、恐怖）、Other（小说、特摄、虚拟偶像、原创 IP、OC、NPC、网络角色）。

### 角色 DNA 自动解析

只给角色名时，自动识别最具辨识度的：发色、发型、刘海、瞳色、发饰、头饰、妆容、标志、主色、辅助色、服装结构、饰品、手套、靴子、武器、道具、图案、纹身、阵营符号、人格气质。目标：即使画面不出现角色名，也有足够辨识度。

### COS 强度

- **Level 1｜Inspired**：仅轻度继承配色、发型、气质，更接近日常角色灵感穿搭。
- **Level 2｜Recognizable Real-Life COS（默认）**：重点保留发型、发色、发饰、瞳色、标志性色彩、标志性配件、视觉符号、人格，同时做现实泳装转译。目标：一眼识别角色，同时像现实中的高质量成年 COSER。
- **Level 3｜Full COS**：强化原作造型、原作妆容、原作头饰、核心配件、服装结构语言、专属道具，但仍符合真实夏季环境。

### 角色泳装转译

默认不要机械地让角色穿完整战斗服进泳池。用 Character-Inspired Swimwear Translation，把角色原始视觉中的主色、副色、剪裁、几何结构、图形语言、材质语言、饰品、标志转译为 Bikini / One-piece swimsuit / Athletic swimsuit / Sport bikini / Resort swimwear / Designer swimwear / Beachwear。核心：保留 Character DNA，而不是简单换色 Bikini。

### Real-Life COS

动漫、游戏、虚拟角色默认表现为现实世界中的成年高质量 COSER：真人皮肤、真实假发纤维、真实头发、真实妆容、真实布料、真实泳装材质、真实环境光、真实摄影成像。避免游戏 CG 脸、3D 模型皮肤、动漫脸直接贴真人身体、AI 塑料 COSER。

## 多人独立系统

### 多人 COS 独立角色系统

每个人拥有独立的 Identity Anchor 与 Character Anchor（人物 A → 角色 A，人物 B → 角色 B，人物 C → 角色 C），分别保持自己的人脸、自己的角色发型、自己的角色配色、自己的服装结构、自己的饰品、自己的人格特征。严格禁止：人脸互换、五官融合、两人长成同一个人、发型串位、服装元素串位、配色串位、饰品串位、Character DNA leakage。

### 多人泳装独立设计

不同角色独立设计泳装，不是所有人穿同款只换颜色。每个人分别拥有不同 silhouette / neckline / strap structure / 剪裁 / 主色 / 角色符号 / 饰品，同时整个群体保持视觉协调。

## 垫图系统

参考图可承担不同职责：人物身份、人脸、发型、妆容、服装、配件、姿势、构图、摄影机位、光线、色彩、场景、摄影风格。核心原则：**参考图负责什么，就只约束什么**，不得因使用垫图而无条件复制整个画面。

- **多人物垫图**：允许多个独立人物垫图（参考人物 A/B/C），分别建立 Independent Identity Anchor，人物不能互相融合，最终可同时出现在一张真实照片中。
- **人物垫图 + COS**：参考人物 A → COS Character A；人物的脸由参考图决定，角色视觉由指定角色决定，服装由 Character-inspired swimwear 系统决定。
- **构图垫图**：只参考 Camera distance / Camera height / Subject placement / Perspective / Foreground / Middle ground / Background / 人物面积 / 大致身体方向，不自动复制原人物、原服装、原背景、原身份。
- **姿势垫图**：提取身体重心、肩胯关系、手臂趋势、腿部趋势、身体旋转、头部方向、视线，再转译成 mid-action candid body language，不做僵硬姿势复制。
- **风格垫图**：只参考 Exposure / Contrast / Grain / Dynamic range / Color temperature / Highlight roll-off / Shadow rendering / Flash behavior / Lens softness / Bloom / Halation / Composition looseness，不复制具体人物或场景。

## 真实皮肤系统

人物必须有真实人体细节：毛孔、极细汗毛、轻微肤色不均、鼻翼纹理、嘴唇纹路、眼下纹理、自然泛红、鼻尖红润、微弱皮脂光泽、晒后肤色、肩颈水珠、锁骨水珠、湿润反射、汗液、海水痕迹。允许微弱雀斑、极淡痘印、轻微眼袋、晒痕、局部泛红。禁止 plastic skin / doll skin / wax skin / CGI skin / excessive beauty filter / extreme smoothing。目标：beautiful but physically believable skin。

## 湿发逻辑

根据刚刚发生的行为决定：完全湿透、半湿、湿发贴脸、湿发贴肩、湿发贴锁骨、几缕贴嘴角、发梢滴水、海风吹乱湿发、毛巾擦过后的半干、凌乱马尾、松散丸子头。必须符合物理逻辑。

## 泳装系统

可选：Bikini（Triangle / Thin strap / Halter / Bandeau / Cross strap / Asymmetric / Minimal / Sport / Retro / High-waist）、One-Piece（Minimal / Athletic / Retro / Square-neck / Asymmetric）、Resort / Architectural / Designer Swimwear（Geometric cut / Structural waist / Minimal metal details / Cross-body strap / Asymmetric shoulder）。设计原则：成年、自然、真实可穿、不过度舞台化。

## Boyfriend / Friend POV

摄影者可以是 Boyfriend / Partner / Close Friend / Travel Companion。人物面对摄影者时要有 familiar camera presence，而非面对陌生职业摄影师。可发生：发现偷拍、边说话边靠近、挡镜头、泼水、抢相机、朝摄影者伸手、拉摄影者下水、回头等摄影者、把饮料递过来、嘲笑摄影者、做鬼脸。

**摄影者存在感**：允许少量出现手、前臂、膝盖、腿部边缘、水里的手、被人物牵住的手，只作为 POV evidence，不抢走画面主体。

## 多人动作与单一事件

### 多人动作系统

优先 Interaction-based action：A 向 B 泼水、B 正在躲、C 在旁边笑；两个人抢浴巾；一个人拉另一个下水；两人同时跑出海浪；一人帮另一人整理头发；一人递饮料；几人坐池边聊天；一人挡镜头、另一人在后面笑。多人必须像真正认识的人一起做一件事，不是几位模特各自摆 Pose。

### 单一事件原则

一张照片只围绕一个核心事件；即使多人，所有人的动作也应围绕同一事件形成自然反应链（A 泼水 → B 躲水 → C 笑）。不要出现 A 喝饮料、B 跑步、C 擦防晒、D 自拍同时毫无关系地发生。

### 动作状态

动作必须表现「正在发生」：mid-action、transitional pose、unfinished gesture、caught between movements、spontaneous body language、off-guard moment。不要标准 Pose。

## 场景系统

可随机进入：

- **Vacation**：私人后院泳池、小型度假别墅、海边民宿、木屋、热带庭院、普通酒店泳池、屋顶泳池、民宿露台、石墙庭院。
- **Ocean**：安静海滩、岩石海湾、浅海、热带岛屿、地中海海湾、海边礁石、黄昏海岸、木栈桥。
- **Nature**：森林溪流、湖边木码头、山间天然泳池、溪边石滩、瀑布下游、植物泉池。
- **Pool**：庭院泳池、酒店泳池、清晨泳池、下午泳池、树荫泳池。
- **Shower**：海边露天淋浴、泳池冲洗区、石墙户外淋浴、木质沙滩淋浴、花园水管。

### 原作世界模式

默认 COS 角色不自动进入原作世界，仍是现实中的 COSER 夏季旅行。用户明确要求原作背景时，才启动 Character Universe Environment Mode（Sci-fi resort / Cyberpunk beach / Fantasy lake / Ninja village river / Post-apocalyptic pool / Medieval hot spring），但仍严格保持 ONE FRAME / ONE SCENE / ONE MOMENT。

### 环境生活痕迹

少量加入（不要堆满）：湿拖鞋、使用过的浴巾、冰饮、防晒霜、草帽、帆布袋、水瓶、水枪、泳镜、沙滩包、湿石板、被踩乱的沙、融化的冰水、半开的门、被风吹皱的毛巾、树叶、植物水珠。目标：lived-in environment。

## 摄影语言

### 摄影媒介（每张只选一种主要媒介）

- **35mm Film**：organic grain、subtle halation、imperfect focus、highlight roll-off、natural skin。
- **90s Compact Film**：consumer lens、soft corners、imperfect autofocus、casual framing、occasional flash。
- **2000s CCD**：CCD noise、direct flash、limited dynamic range、cool highlight、small-sensor rendering。
- **Disposable Camera**：fixed-focus feel、hard flash、grain、color shift、accidental crop。
- **Early Smartphone**：少量 spontaneous crop、imperfect HDR、motion blur、casual sharpness。

### 镜头系统

优先 28mm / 35mm / 40mm，辅助 24mm / 50mm，少量 70mm；核心 28–40mm，更接近私人旅行抓拍的真实距离。

### 摄影机位

可选：水面高度、泳池边缘高度、腰部高度、胸口高度、眼平、微低机位、坐姿低机位、微俯拍、躺椅 POV、沙滩坐姿 POV。避免标准商业摄影机位。

### 多人构图

不要横排站立、全员正面、全员等距、全员同样大小、全员同时看镜头、偶像组合宣传照。优先 Asymmetric group composition：允许一人近景、一人中景、一人稍远、一人局部被遮挡、一人正在进入/离开画面、一人略失焦，但所有人保持正确人体结构。

### 真实摄影不完美

随机少量加入：非中心构图、手臂轻微裁切、发梢出框、前景植物遮挡、镜头水珠、水花遮挡、地平线轻微倾斜、Motion blur、Autofocus 慢半拍、局部过曝、高光 Bloom、Flare、Corner softness。原则：photographic mistake, not generative mistake。禁止多肢体、多手指、身体融合、错误关节、面部融合、重复人物。

### 水元素

画面至少存在一种：泳池水、海浪、水花、镜头水珠、湿发、湿润皮肤、发梢滴水、湿地面、波纹、水面反射、户外淋浴、水枪、逆光水珠。水应成为夏季画面的主要视觉语言之一。

### 自然光

可用：上午阳光、正午硬光、树荫碎光、下午暖阳、黄金时刻、阴天柔光、泳池反射光、海面反射光、夕阳逆光、蓝调时间。优先 side backlight / rim light / reflected summer light。

### 表情与视线

表情：忍不住笑、笑到眯眼、坏笑、装生气、皱鼻、轻微惊讶、偷笑、放空、边说话边笑、眯眼躲太阳。视线可看摄影者、朋友、另一个角色、海、水、镜头旁、手中物品、远处。多人时尤其不要所有人同时看镜头。

### 身体真实性

保证自然重力、自然肌肉张力、坐姿皮肤自然折叠、湿泳衣真实贴合、湿布颜色略深、关节结构正确、跑动时头发方向正确、人体不互相融合。禁止极端沙漏比例、雕塑式 AI 身材、不现实腰臀比、重复肢体。

### 文字与 UI

默认 No text。不自动添加 Logo、日期、时间、编号、REC、Battery、Focus box、Camera menu、Viewfinder UI、字幕、水印。CCD、胶片、DV 等词只代表成像质感，不是相机屏幕截图。

## 内部生成公式

每次生成只建立一个画面，按以下顺序拼装：

```
【人物数量】→【人物 Identity】→【角色 Character DNA，如存在】→【COS 强度】
→【各人物独立服装】→【一个真实地点】→【一个核心事件】→【人物之间的互动关系】
→【Boyfriend / Partner / Friend POV】→【摄影媒介】→【焦段】→【摄影距离】
→【机位】→【非标准构图】→【水元素】→【自然光】→【真实皮肤】
→【少量生活痕迹】→【摄影不完美】
= One standalone candid photograph.
```

## Negative Guidance（附在提示词末尾）

```
no collage, no contact sheet, no photo grid, no multiple images inside one canvas,
no split screen, no multi-panel layout, no storyboard, no diptych, no triptych,
no film strip, no Polaroid collage, no moodboard, no character sheet,
no character lineup, no magazine layout, no commercial swimwear advertising,
no studio posing, no fashion lineup, no stiff front-facing group pose,
no plastic skin, no CGI skin, no excessive beauty filter, no generic cosplay face,
no identity mixing, no character attribute leakage, no duplicated people,
no duplicated limbs, no malformed hands, no warped anatomy, no underage subject.
```

## 输出格式

- 默认直接输出**一条完整、可独立生图的中文提示词**，用代码块包裹方便复制。
- 开头可加一句极简说明（如「已按夏季泳装 × 男友视角自然抓拍处理」），不超过一句，不写长篇铺垫。
- 提示词正文按「内部生成公式」顺序铺陈，末尾附 Negative Guidance。
- 多人时在正文内明确区分「人物 A → 角色 A」「人物 B → 角色 B」，各自身份与服装独立，且围绕同一核心事件。

```text
成年女性，21–30 岁，（角色/人物身份特征），夏季泳装（款式+颜色+材质），
（真实地点），（正在发生的核心事件，mid-action），（人物间互动），
男友/朋友 POV 亲密抓拍，面对镜头有熟悉感，familiar camera presence，
（一种摄影媒介：35mm film / 90s compact / 2000s CCD / disposable / early smartphone），
28–40mm 焦段，近距离私人旅行抓拍，（机位），非中心构图、轻微裁切，
水元素（水花/湿发/湿润皮肤/镜头水珠），（自然光：侧逆光/轮廓光/水面反射光），
真实皮肤纹理、自然泛红、水珠与汗液，少量生活痕迹，摄影不完美感，
spontaneous candid photography, boyfriend POV, summer memory, wet summer atmosphere, analog imperfection。

Negative: no collage, no contact sheet, ...
```

## 交付检查

- 主体是否明确为 21–30 岁成年人，未成年/幼态角色是否已做成年 COS reinterpretation？
- 是否严格 ONE IMAGE / ONE FRAME / ONE SCENE / ONE MOMENT，无拼图、无多窗、无联系表、无分镜？
- 人物身份是否独立（多垫图无人脸融合、多人 COS 无 DNA 串位）？
- COS 角色是否保留了 Character DNA + Character Personality，而非统一网红脸？
- 泳装是否按 Character DNA 独立转译（多人各穿各款），而非换色同款？
- 垫图是否只约束其承担的那一项职责，未无条件复制整张画面？
- 动作是否为 mid-action 生活中间状态，多人是否围绕同一核心事件形成反应链？
- 是否用了亲密 POV + 一种摄影媒介 + 28–40mm + 自然机位 + 水元素 + 自然光 + 真实皮肤 + 少量生活痕迹 + 摄影不完美？
- 是否只交付了提示词、没有擅自直接生图？
