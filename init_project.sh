#!/bin/bash
# cocosSkill - 新 Cocos 项目一键初始化脚本
# 用法：
#   bash init_project.sh <project_path>
#
# 效果：
#   - <project_path>/assets/Script/infra/  ← 拷入 11 个运行时基础模块（TS）
#   - <project_path>/scripts/              ← 拷入 Python 工具（prefab_builder + ui_factories）
#   - <project_path>/.claude/commands/     ← 拷入 Cocos 专用 slash commands
#
# 跑完后你在 Cocos Creator 打开 <project_path>，等 TS 编译完即可开工。

set -e

# ==========================================================
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_PATH="${1:-}"

if [ -z "$PROJECT_PATH" ]; then
    echo "用法：bash init_project.sh <project_path>"
    echo "例如：bash init_project.sh D:/minigame/my-new-game"
    exit 1
fi

# 处理 Windows Git Bash 路径风格
PROJECT_PATH="${PROJECT_PATH%/}"

# ==========================================================
# 基础检查
# ==========================================================
if [ ! -d "$PROJECT_PATH" ]; then
    echo "⚠ 目标目录不存在，创建：$PROJECT_PATH"
    mkdir -p "$PROJECT_PATH"
fi

if [ -d "$PROJECT_PATH/assets/Script/infra" ] && [ -n "$(ls -A "$PROJECT_PATH/assets/Script/infra" 2>/dev/null)" ]; then
    echo "⚠ $PROJECT_PATH/assets/Script/infra/ 已有文件"
    read -p "   是否继续并覆盖？[y/N] " answer
    case "$answer" in
        [Yy]*) ;;
        *) echo "已取消"; exit 0 ;;
    esac
fi

# ==========================================================
# 1. lib/*.ts → assets/Script/infra/
# ==========================================================
INFRA_DST="$PROJECT_PATH/assets/Script/infra"
mkdir -p "$INFRA_DST"
cp "$REPO_DIR/lib"/*.ts "$INFRA_DST/"
echo "  ✓ lib/*.ts  →  $INFRA_DST/"
ls "$INFRA_DST" | grep -c '\.ts$' | xargs -I{} echo "    ({} 个 TS 模块)"

# ==========================================================
# 2. scripts/*.py → scripts/
# ==========================================================
SCRIPTS_DST="$PROJECT_PATH/scripts"
mkdir -p "$SCRIPTS_DST"
cp "$REPO_DIR/scripts"/*.py "$SCRIPTS_DST/" 2>/dev/null || true
echo "  ✓ scripts/*.py  →  $SCRIPTS_DST/"

# ==========================================================
# 3. commands/*.md → .claude/commands/ （slash commands）
# ==========================================================
CMD_DST="$PROJECT_PATH/.claude/commands"
if [ -d "$REPO_DIR/commands" ]; then
    mkdir -p "$CMD_DST"
    cp "$REPO_DIR/commands"/*.md "$CMD_DST/" 2>/dev/null || true
    echo "  ✓ commands/*.md  →  $CMD_DST/"
fi

# ==========================================================
# 4. 提示下一步
# ==========================================================
echo ""
echo "========================================"
echo "✅ 项目初始化完成：$PROJECT_PATH"
echo "========================================"
echo ""
echo "下一步："
echo "  1. 用 Cocos Creator 打开 $PROJECT_PATH"
echo "  2. 等 TypeScript 编译完（控制台出现 'TypeScript compile succeed'）"
echo "  3. 开始建场景 + 业务脚本"
echo ""
echo "参考："
echo "  - $REPO_DIR/skills/cocos-prefab-crud/templates/T5-new-project-bootstrap.md"
echo "  - $INFRA_DST/README.md 看不到？下面手动 cp 一下："
echo "      cp $REPO_DIR/lib/README.md $INFRA_DST/README.md"
echo ""
