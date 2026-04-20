---
name: cocosSkill starter 自动初始化流程
description: 用户给 cocosSkill repo URL + 新项目路径时，Claude 直接自动跑 clone+install+init_project，不让用户手敲命令
type: feedback
---
**规则**：当用户说"这是我的新项目路径 X"或者"克隆一下 cocosSkill 到这里 Y"这类话，Claude 应该**自动**执行下面流程，不要逐步让用户手敲命令。

**触发条件识别**：用户提到以下任一组合 →
- 给了 `https://github.com/linyewen/cocosSkill.git`（或类似 starter URL）
- 给了新项目目录路径（如 `D:/minigame/new-game`）
- 问"怎么初始化"、"怎么用 starter"、"能不能一键"等

**Claude 的标准动作**：

```bash
# 1. 如果 ~/cocosSkill 不存在 → clone
[ ! -d ~/cocosSkill ] && git clone https://github.com/linyewen/cocosSkill.git ~/cocosSkill

# 2. 如果已存在 → pull 最新
cd ~/cocosSkill && git pull

# 3. 全局安装（skills + memory + CLAUDE.md 到 ~/.claude/）
bash install.sh

# 4. 如果用户给了新项目路径 → 一键初始化
bash init_project.sh <new-project-path>
```

**Why**：用户明确说过 "我下次会给你地址，你应该有个我 clone skill 的时候就都弄下来的操作，而不是让我自己操作"（2026-04-19）。手动 cp 命令链长易错，自动脚本 + 自动触发比让用户照抄可靠。

**How to apply**：
- 识别到触发条件 → **直接跑**，不问"要不要执行"这种基础确认问题
- 只在真正需要用户判断的时候确认（如目标目录已有内容会被覆盖、是否需要新项目路径等）
- 跑完告诉用户下一步是什么（启动 Cocos / 写业务脚本）
- 如果 Cocos 在跑，`init_project.sh` 不受影响（它只是 cp 文件），但下一步用 `scripts/prefab_builder.py` 前要关 Cocos
