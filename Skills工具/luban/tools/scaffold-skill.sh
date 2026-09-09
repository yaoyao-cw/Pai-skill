#!/usr/bin/env bash
# 鲁班开料:新建一个"出生即合规"的 Skill 仓库骨架。
# 用法: scaffold-skill.sh <skill-name> "<一句话定位>" [target-dir]
# 产出: 出生证清单(references/birth-checklist.md)要求的全部必备件占位。
set -euo pipefail

SKILL_NAME="${1:?用法: scaffold-skill.sh <skill-name> \"<一句话定位>\" [target-dir]}"
TAGLINE="${2:?缺第二个参数:一句话定位}"
TARGET="${3:-./${SKILL_NAME}}"
OWNER="${SCAFFOLD_OWNER:-LearnPrompt}"
YEAR="$(date +%Y)"

if [[ -e "$TARGET" && -n "$(ls -A "$TARGET" 2>/dev/null)" ]]; then
  echo "✘ 目标目录已存在且非空: $TARGET(不覆盖,自己确认后清理)" >&2
  exit 1
fi

mkdir -p "$TARGET/skills/$SKILL_NAME/examples" \
         "$TARGET/assets" \
         "$TARGET/.claude-plugin"

# --- SKILL.md ---
cat > "$TARGET/skills/$SKILL_NAME/SKILL.md" <<EOF
---
name: ${SKILL_NAME}
description: |
  ${TAGLINE}
  【TODO:做什么/何时触发,2-3 句】
  触发词包括但不限于:【TODO:5-8 条用户真实会说的话】。
  不要用于:【TODO:负触发,至少 2 条】。
---

# ${SKILL_NAME}

【TODO:工作流正文。建议结构:角色定义 → 前置准备 → 分步流程(每步带输出格式) → 强制停手点 → 反例黑名单 → 验收单】
EOF

# --- README.md(house 模板占位版) ---
cat > "$TARGET/README.md" <<EOF
<div align="center">

# ${SKILL_NAME}

> *「【TODO:一句引语钩子】」*

[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-${SKILL_NAME}-blueviolet)](skills/${SKILL_NAME}/SKILL.md)
[![skills.sh](https://skills.sh/b/${OWNER}/${SKILL_NAME})](https://skills.sh/${OWNER}/${SKILL_NAME})
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**${TAGLINE}**

[看效果](#效果示例) · [安装](#快速开始) · [触发方式](#触发方式) · [安全边界](#安全边界)

</div>

---

![demo](assets/demo.gif)

## 它解决什么问题

【TODO:人感开场,第二人称戳痛点】

## 效果示例

【TODO:真实输入 → 真实输出,禁止虚构样例】

## 快速开始

\`\`\`bash
npx skills add ${OWNER}/${SKILL_NAME}
\`\`\`

装完对 Agent 说:

\`\`\`text
【TODO:装完第一句话】
\`\`\`

## 触发方式

- 【TODO:5-8 条】

## 它和同类有什么不同

【TODO:对比表,讲差异不攻击】

## 安全边界

【TODO:不会做什么、何时停手问用户】

## 验证与测试

【TODO:一条验收 prompt + 合格表现】

## 致谢

【TODO:方法论来源链接放这里,不进 SKILL.md 正文】

## License

[MIT](LICENSE)
EOF

# --- marketplace.json ---
cat > "$TARGET/.claude-plugin/marketplace.json" <<EOF
{
  "name": "${SKILL_NAME}",
  "owner": { "name": "${OWNER}", "url": "https://github.com/${OWNER}" },
  "metadata": { "description": "Marketplace hosting the ${SKILL_NAME} plugin." },
  "plugins": [
    {
      "name": "${SKILL_NAME}",
      "description": "${TAGLINE}",
      "version": "0.1.0",
      "author": { "name": "${OWNER}", "url": "https://github.com/${OWNER}" },
      "source": "./",
      "category": "productivity",
      "homepage": "https://github.com/${OWNER}/${SKILL_NAME}"
    }
  ]
}
EOF

# --- demo.tape(vhs 录制脚本占位,保证 showcase 可复现) ---
cat > "$TARGET/assets/demo.tape" <<'EOF'
Output demo.gif

Set FontSize 16
Set Width 1000
Set Height 700
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms
Set Padding 16

# TODO: 用真实运行回放写这盘带子,不要摆拍。
# 录制: 在本目录执行 `vhs demo.tape`
EOF

# --- LICENSE (MIT) ---
cat > "$TARGET/LICENSE" <<EOF
MIT License

Copyright (c) ${YEAR} ${OWNER}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

echo "✔ 骨架已生成: $TARGET"
echo "  下一步:按出生证清单逐项补 TODO(grep -rn 'TODO' $TARGET)"
echo "  发布前:npx 安装实测 + demo 真实回放录制 + 每个发布动作单独授权"
