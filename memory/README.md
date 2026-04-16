# Memory 通用经验库

存放跨项目通用的 Claude Code memory 文件。

## 目录结构

- `common/` — 通用 memory（Cocos Creator 开发通用经验）
  - `MEMORY.md` — 索引文件
  - `feedback_*.md` — 各条经验记录

## 安装

`install.sh` 会自动同步 `common/` 下的文件到 `~/.claude/memory/`。

新项目如需使用，也可手动复制：
```bash
cp ~/cocosSkill/memory/common/*.md ~/.claude/projects/<项目路径>/memory/
```

## 新增经验

在项目开发中积累的通用经验（非项目特定），应回流到此目录：
```bash
cp ~/.claude/projects/<项目路径>/memory/feedback_xxx.md ~/cocosSkill/memory/common/
# 更新 MEMORY.md 索引
cd ~/cocosSkill && git add . && git commit -m "memory: add xxx" && git push
```
