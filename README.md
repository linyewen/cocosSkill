# Cocos Creator Claude Skills

AI × Cocos Creator 游戏开发的 Claude Code Skills、Commands 和通用代码库。

## 目录结构

```
cocosSkill/
├── CLAUDE.md                              # 全局开发铁律
├── README.md                              # 本文件
├── skills/                                # 方法论指南（~/.claude/skills/）
│   ├── cocos-replicate/SKILL.md           # 2.x → 3.x 复刻方法论
│   ├── feature-design/SKILL.md            # 功能设计分析
│   ├── new-game/SKILL.md                  # 新游戏工厂流程
│   ├── prefab-analyze/SKILL.md            # Prefab 蓝图推导
│   ├── project-kickoff/SKILL.md           # 项目启动流程
│   ├── ui-design/SKILL.md                 # UI 设计流程
│   ├── game-architecture/SKILL.md         # 架构分层设计
│   ├── entity-lifecycle/SKILL.md          # 实体生命周期模式
│   ├── manager-pattern/SKILL.md           # 管理器模式
│   └── cocos-component/SKILL.md           # 组件 JSON 参考手册
├── commands/                              # 操作清单（.claude/commands/）
│   ├── cocos-3d-for-2d.md                 # 3D 引擎做 2D 避坑
│   ├── cocos-create.md                    # 实体创建流程
│   ├── cocos-layer.md                     # 游戏分层设计
│   ├── cocos-migrate.md                   # 2.x → 3.8 迁移
│   └── cocos-review.md                    # 代码审查
└── lib/                                   # 通用代码库
    ├── README.md                          # 使用说明
    ├── EventBus.ts                        # 发布/订阅事件总线
    ├── SafePool.ts                        # NodePool 安全存取
    ├── ResLoader.ts                       # SpriteFrame 加载兼容
    ├── SoundManager.ts                    # 音乐/音效管理
    ├── AnimationManager.ts                # 序列帧动画播放
    ├── MathUtil.ts                        # 数学工具库
    ├── Bezier.ts                          # 贝塞尔曲线路径
    ├── HighlightManager.ts                # 受击闪白/闪红效果
    └── BaseUtil.ts                        # 通用工具函数集
```

## Skills 说明

### 方法论类（指导 Claude 怎么思考）

| Skill | 用途 |
|-------|------|
| **game-architecture** | 游戏架构分层设计：5 层架构 + 状态机 + 依赖规则，防止上帝类和循环依赖 |
| **entity-lifecycle** | 实体生命周期模式：init → show → update → onDie → recycle，实体封装自身行为 |
| **manager-pattern** | 管理器模式：对象池 + 时间驱动生成 + 回收重置，批量管理同类实体 |
| **feature-design** | 功能实现前的调用链分析、职责划分、数据流梳理 |
| **project-kickoff** | 项目启动流程：理解需求 → 设计架构 → 再动手 |
| **new-game** | 从策划案到可玩游戏的完整工厂流程 |

### 工具类（提供具体参考数据）

| Skill | 用途 |
|-------|------|
| **cocos-component** | 组件 JSON 参考手册：UITransform/Sprite/Label/Button/Widget/Collider 的完整结构和陷阱 |
| **prefab-analyze** | 从代码反推 Prefab 节点结构 |
| **ui-design** | UI 设计还原流程 |
| **cocos-replicate** | 2.x → 3.x 项目复刻方法论 |

## Commands 说明

| Command | 用途 |
|---------|------|
| **cocos-3d-for-2d** | 3D 引擎做 2D 游戏的避坑清单 |
| **cocos-create** | 游戏实体创建流程（逻辑/视觉分离） |
| **cocos-layer** | 游戏场景分层设计 |
| **cocos-migrate** | Cocos 2.x → 3.8 迁移指南 |
| **cocos-review** | 代码审查检查清单 |

## lib/ 通用代码库

从实际项目中提炼的 Cocos Creator 3.x 基础设施代码，新项目直接复制使用。详见 [lib/README.md](lib/README.md)。

## 安装方式

### Skills（全局生效）
```bash
cp -r skills/* ~/.claude/skills/
```

### Commands（项目级）
```bash
cp commands/* your-project/.claude/commands/
```

### CLAUDE.md（全局规范）
```bash
cp CLAUDE.md ~/.claude/CLAUDE.md
```

### lib/（项目级）
```bash
cp lib/*.ts your-project/assets/Script/infra/
```
