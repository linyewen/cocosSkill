# Cocos Creator Claude Skills

AI × Cocos Creator 游戏开发的 Claude Code Skills、Commands 和通用代码库。

让 Claude 像一个熟悉 Cocos Creator 的老手一样写代码，而不是因为资料少而乱写。

## 快速开始

### 首次安装（新电脑 / 新同事）

```bash
git clone https://github.com/linyewen/cocosSkill.git ~/cocosSkill
cd ~/cocosSkill && bash install.sh
```

完成后 **开一个新的 Claude Code 窗口**，所有 skill 自动生效。

### 更新 skill

```bash
cd ~/cocosSkill && git pull && bash install.sh
```

### 新项目初始化

```bash
# 1. 复制 commands 到项目（按需调用的检查清单）
cp ~/cocosSkill/commands/* your-project/.claude/commands/

# 2. 复制 lib 通用代码到项目（可直接复用的基础设施）
mkdir -p your-project/assets/Script/infra
cp ~/cocosSkill/lib/*.ts your-project/assets/Script/infra/

# 3. 如果项目没有 CLAUDE.md，复制全局规范
cp ~/cocosSkill/CLAUDE.md your-project/CLAUDE.md
```

### 安装后怎么用

在 Claude Code 对话中直接调用 skill 名称即可：

```
你：用 /game-architecture 帮我设计这个塔防游戏的架构
你：用 /entity-lifecycle 帮我创建一个敌人实体
你：用 /cocos-component 我需要创建一个带 Button 的 prefab
你：/cocos-review 检查一下代码
```

---

## Skills 一览

### 方法论类（指导怎么思考和设计）

| Skill | 什么时候用 |
|-------|-----------|
| **game-architecture** | 开新项目，设计代码架构（5层分层 + 状态机 + 依赖规则） |
| **entity-lifecycle** | 创建游戏实体，设计组件接口（init → show → update → onDie → recycle） |
| **manager-pattern** | 需要批量管理同类对象（对象池 + 时间驱动 + 回收重置） |
| **feature-design** | 实现新功能前，分析调用链和职责划分 |
| **project-kickoff** | 项目启动，理解需求 → 设计 → 再动手 |
| **new-game** | 从策划案到可玩游戏的完整流程 |

### 工具类（提供具体参考数据）

| Skill | 什么时候用 |
|-------|-----------|
| **cocos-component** | 手写/MCP 创建 prefab 时查组件 JSON 结构和踩坑点 |
| **prefab-analyze** | 从代码反推 prefab 应该怎么搭 |
| **ui-design** | 还原 UI 设计稿 |
| **cocos-replicate** | 2.x → 3.x 项目复刻 |

## Commands 一览

复制到项目 `.claude/commands/` 后用 `/command名` 调用：

| Command | 什么时候用 |
|---------|-----------|
| **cocos-3d-for-2d** | 3D 引擎做 2D 游戏的避坑清单 |
| **cocos-create** | 创建游戏实体（逻辑/视觉分离） |
| **cocos-layer** | 设计游戏场景分层 |
| **cocos-migrate** | Cocos 2.x → 3.8 迁移 |
| **cocos-review** | 代码审查 |

## lib/ 通用代码库

复制到项目 `assets/Script/infra/` 后代码中直接 import：

| 文件 | 功能 |
|------|------|
| **EventBus.ts** | 发布/订阅事件总线，模块间解耦通信 |
| **SafePool.ts** | NodePool 安全存取，防止已销毁节点崩溃 |
| **ResLoader.ts** | SpriteFrame 加载，自动兜底 3.x 路径格式 |
| **SoundManager.ts** | 音乐/音效播放、音量控制 |
| **AnimationManager.ts** | 序列帧动画播放，自动缓存 |
| **MathUtil.ts** | 随机数、距离、贝塞尔曲线等数学工具 |
| **Bezier.ts** | 可视化贝塞尔曲线编辑 + 沿线运动 |
| **HighlightManager.ts** | 受击闪白/闪红材质切换 |
| **BaseUtil.ts** | 深拷贝、版本比较、灰度、震屏、坐标转换 |

详细用法见 [lib/README.md](lib/README.md)。

## 目录结构

```
cocosSkill/
├── install.sh                             # 一键安装脚本
├── CLAUDE.md                              # 全局开发铁律
├── README.md                              # 本文件
├── skills/                                # Skills（全局 ~/.claude/skills/）
│   ├── game-architecture/SKILL.md
│   ├── entity-lifecycle/SKILL.md
│   ├── manager-pattern/SKILL.md
│   ├── cocos-component/SKILL.md
│   ├── cocos-replicate/SKILL.md
│   ├── feature-design/SKILL.md
│   ├── new-game/SKILL.md
│   ├── prefab-analyze/SKILL.md
│   ├── project-kickoff/SKILL.md
│   └── ui-design/SKILL.md
├── commands/                              # Commands（项目 .claude/commands/）
│   ├── cocos-3d-for-2d.md
│   ├── cocos-create.md
│   ├── cocos-layer.md
│   ├── cocos-migrate.md
│   └── cocos-review.md
└── lib/                                   # 通用代码库（项目 assets/Script/infra/）
    ├── README.md
    ├── EventBus.ts
    ├── SafePool.ts
    ├── ResLoader.ts
    ├── SoundManager.ts
    ├── AnimationManager.ts
    ├── MathUtil.ts
    ├── Bezier.ts
    ├── HighlightManager.ts
    └── BaseUtil.ts
```
