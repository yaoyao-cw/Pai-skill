# 动态艺术签名

输入名字、一种物体和渐变色，先把物体形态融入字形，再制作两笔独立书写。阅读[独立模块](../skills/dynamic-art-signature/SKILL.md)及其设计、渲染参考；不要套用贴纸的头像轻动效。

现在支持多种字体，也可以自定义。可以指定书体、描述想要的感觉，或提供自己的字稿与字体参考。先看[九种字体方向与自定义方法](../skills/dynamic-art-signature/references/multifont.md)。

默认两笔分开、间隔约1秒；主笔快速，末端渐慢收锋；无底印、无轻震、无回弹。手写质感指提按、粗细与尖锋，不默认金属、粉笔或立体材质。

字体由当前字稿决定怎么动：代理重新检查粗细、连笔、点画和回钩，脚本据此计算起笔、收锋与可选碎片参数。用户可以直接提供字稿，不需要填写组件编号或坐标；详见[字体适配](../skills/dynamic-art-signature/references/font-adaptation.md)。

[九款样例](../examples/dynamic-signatures/README.md) · [风格入口](../styles/dynamic-signatures/STYLE.md)


支持中英文名字。中文默认草书，可按要求切换行书；两字与三字都需保留完整名字及可见意象。三字沿用两段书写节奏，重新设计排布与末字收锋。详见[中文规则](../skills/dynamic-art-signature/references/chinese.md)。

乐器入字时让乐器和字共享笔画。粒子按字意成字时，为每种粒子设计对应的动势和落笔位置。见[两组定稿九宫格与可复现案例](../skills/dynamic-art-signature/references/instrument-semantic.md)。
