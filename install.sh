#!/bin/bash
# cocosSkill 一键安装脚本
# 用法：git clone https://github.com/linyewen/cocosSkill.git && cd cocosSkill && bash install.sh

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$HOME/.claude/skills"
CLAUDE_MD="$HOME/.claude/CLAUDE.md"

# 1. 同步 Skills
mkdir -p "$SKILL_DIR"
for dir in "$REPO_DIR/skills"/*/; do
    name=$(basename "$dir")
    cp -r "$dir" "$SKILL_DIR/$name"
    echo "  ✓ skill: $name"
done

# 2. 同步 CLAUDE.md（如果全局还没有，或用户确认覆盖）
if [ -f "$CLAUDE_MD" ]; then
    echo ""
    echo "  ⚠ ~/.claude/CLAUDE.md 已存在，跳过（如需更新请手动合并）"
else
    cp "$REPO_DIR/CLAUDE.md" "$CLAUDE_MD"
    echo "  ✓ CLAUDE.md → ~/.claude/CLAUDE.md"
fi

# 3. 同步通用 Memory
MEMORY_SRC="$REPO_DIR/memory/common"
if [ -d "$MEMORY_SRC" ]; then
    GLOBAL_MEMORY="$HOME/.claude/memory"
    mkdir -p "$GLOBAL_MEMORY"
    cp "$MEMORY_SRC"/*.md "$GLOBAL_MEMORY/" 2>/dev/null
    echo "  ✓ common memory → $GLOBAL_MEMORY"
fi

echo ""
echo "安装完成！Skills 已同步到 $SKILL_DIR"
echo "lib/ 代码库请手动复制到项目中：cp lib/*.ts your-project/assets/Script/infra/"
echo "commands/ 请手动复制到项目中：cp commands/* your-project/.claude/commands/"
