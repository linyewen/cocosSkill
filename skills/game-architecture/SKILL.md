# 游戏架构分层设计

开新游戏项目时的架构决策指南。教 Claude 怎么分层、怎么拆类、怎么让模块之间不互相依赖。

## 触发时机

- 用户说"新建游戏项目"、"搭建架构"、"设计代码结构"
- `/project-kickoff` 完成后进入架构设计阶段
- 发现代码出现上帝类、循环依赖、全局状态滥用时

## 核心原则

**依赖只能向下，不能向上，不能平级直接调用。**

## 五层架构

```
┌─────────────────────────────────────────────┐
│                   App 层                     │
│  GameEntry（入口）                            │
│  GameFSM（状态机：菜单→选择→战斗→结算）        │
│  SceneManager（场景切换，如果有多场景）          │
└──────────────────┬──────────────────────────┘
                   │ 调用方法
┌──────────────────┴──────────────────────────┐
│                  Logic 层                    │
│  各 Manager（只管自己那一类实体的生命周期）      │
│  Manager 之间不互相引用，通过 EventBus 通信     │
└──────────────────┬──────────────────────────┘
                   │ init(config) / recycle()
┌──────────────────┴──────────────────────────┐
│                 Entity 层                    │
│  各实体组件（Player/Enemy/Bullet/Item...）    │
│  自驱动行为，不访问 Manager 或 App             │
└──────────────────┬──────────────────────────┘
                   │ 读取
┌──────────────────┴──────────────────────────┐
│                  Data 层                     │
│  ConfigManager（只读配置，从 JSON 加载）        │
│  GameState（运行时可变状态，集中管理，可订阅）   │
└──────────────────┬──────────────────────────┘
                   │ 使用
┌──────────────────┴──────────────────────────┐
│               Infrastructure 层              │
│  EventBus / ResLoader / SafePool /           │
│  SoundManager / MathUtil / AnimationManager  │
└─────────────────────────────────────────────┘

   UI 层（独立侧翼，只监听事件 + 发射事件）
```

### 每层的依赖规则

| 层 | 可以依赖 | 不能依赖 | 对外通信方式 |
|----|---------|---------|-------------|
| **App** | Logic, Data, Infra | Entity 的具体实现 | 调用 Manager 公开方法 |
| **Logic (Manager)** | Entity, Data, Infra | App, 其他 Manager | EventBus 发事件 |
| **Entity** | Data(只读), Infra | App, Logic, 其他 Entity | 回调函数 / EventBus |
| **Data** | Infra | 任何上层 | 被动提供数据 / 变化通知 |
| **Infra** | 无 | 任何上层 | 被调用 |
| **UI** | Infra(EventBus only) | App, Logic, Entity | 只收发事件 |

### 铁律

```
❌ Entity 里写 Game.Ins.getXxxManager()     → Entity 不知道 Manager 的存在
❌ Manager 里写 OtherManager.doSomething()  → Manager 之间通过 EventBus
❌ UI 里写 Game.Ins.toBattle()              → UI 发事件 EventBus.emit('ui:start_battle')
❌ 任何地方写 GameConfig.someRuntimeState = x → 用 GameState 集中管理
✅ App 层监听事件，协调 Manager 之间的交互
✅ Manager 通过构造函数接收依赖（Prefab, Layer, Config）
✅ Entity 通过 init(config) 接收参数，通过回调通知结果
```

## GameFSM 状态机

用状态机替代布尔标记组合。

### 为什么需要

```typescript
// ❌ 布尔标记组合 —— 隐式状态，难以理解和维护
if (gameStart && !isGameOver && !hasItem && canTouch) { ... }
// 这 4 个布尔能组合出 16 种状态，但只有 5 种是合法的

// ✅ 状态机 —— 每个状态的行为明确
if (this.fsm.currentState === GameState.Battle) { ... }
```

### 标准游戏状态流转

```
Loading → Menu → Select → Battle → Settlement
                  ↑                     │
                  └─── Restart ─────────┘
```

### 每个状态的职责

```typescript
interface IGameState {
    onEnter(): void;   // 创建 UI、初始化 Manager、播放音乐
    onUpdate(dt: number): void;  // 转发 update 给活跃的 Manager
    onExit(): void;    // 销毁 UI、回收实体、停止音乐
}
```

| 状态 | onEnter | onUpdate | onExit |
|------|---------|----------|--------|
| **Loading** | 加载配置、资源 | 显示进度 | — |
| **Menu** | 显示主菜单 UI | 等待输入 | 隐藏菜单 |
| **Select** | 显示选择 UI | 等待选择 | 记录选择结果 |
| **Battle** | 初始化 Manager、生成玩家 | 更新所有 Manager | 回收所有实体 |
| **Settlement** | 显示结算 UI、计算分数 | 等待输入 | 重置游戏状态 |

### 简易实现

```typescript
// 不需要复杂的状态机库，一个 enum + switch 就够
enum GamePhase { Loading, Menu, Select, Battle, Settlement }

class GameEntry extends Component {
    private phase: GamePhase = GamePhase.Loading;
    
    changePhase(next: GamePhase) {
        this.exitPhase(this.phase);
        this.phase = next;
        this.enterPhase(next);
    }
    
    update(dt: number) {
        this.updatePhase(this.phase, dt);
    }
}
```

## App 层拆分

### 替代上帝类

一个 Game.ts 不应该超过 200 行。职责拆分：

| 文件 | 职责 | 行数参考 |
|------|------|---------|
| **GameEntry.ts** | 入口 Component，挂场景根节点，持有所有 @property | 50-100 行 |
| **GameFSM.ts** | 状态机，管理状态切换 | 80-150 行 |
| **ManagerFactory.ts** | 创建和持有所有 Manager 实例 | 50-80 行 |

```typescript
// GameEntry.ts —— 只做连接，不做逻辑
@ccclass('GameEntry')
export class GameEntry extends Component {
    // @property 声明所有 prefab 和 layer 引用
    @property(Prefab) enemyPrefab: Prefab = null;
    @property(Node) enemyLayer: Node = null;
    // ...
    
    start() {
        const managers = ManagerFactory.create(this);  // 用自己的 @property 创建 Manager
        const fsm = new GameFSM(managers);
        fsm.changePhase(GamePhase.Loading);
    }
}
```

## Data 层：Config vs GameState 分离

```typescript
// ❌ 混在一起
class GameConfig {
    static framerate = 20;           // 配置（不变）
    static gameStart = false;        // 运行时状态（会变）
    static uitimateCur = 0;          // 运行时状态（会变）
}

// ✅ 分开
// config.ts —— 只读，从 JSON 加载
class GameConfig {
    readonly framerate: number;
    readonly ultimatePower: number;
    // 构造后不可修改
}

// game-state.ts —— 可变，集中管理，可订阅
class GameState {
    private _score: number = 0;
    private _phase: GamePhase = GamePhase.Loading;
    
    get score() { return this._score; }
    set score(v: number) {
        this._score = v;
        EventBus.emit('state:score_changed', v);  // 变化通知
    }
}
```

## UI 解耦

```typescript
// ❌ UI 直接调用游戏逻辑
class StartMenu extends Component {
    onStartClick() {
        Game.Ins.toBattle();  // 直接耦合
    }
}

// ✅ UI 只发事件
class StartMenu extends Component {
    onStartClick() {
        EventBus.emit('ui:start_battle');  // 不知道谁处理
    }
}

// App 层负责监听和协调
class GameFSM {
    init() {
        EventBus.on('ui:start_battle', () => {
            this.changePhase(GamePhase.Battle);
        });
    }
}
```

## 消除循环依赖

### 问题场景

```
Game.ts → 导入 EnemyManager → 导入 Boss101 → 导入 BossWeapon → 导入 Game.ts
// 循环！只能用字符串绕过：getComponent('Boss101')
```

### 解决方案：接口抽取

```typescript
// interfaces/IBoss.ts —— 放在底层，谁都能导入
export interface IBoss {
    hp: number;
    maxHp: number;
    takeDamage(damage: number): void;
    getWeapons(): IWeapon[];
}

// Boss101.ts —— 实现接口
export class Boss101 extends Component implements IBoss { ... }

// EnemyManager.ts —— 只依赖接口，不依赖具体 Boss 类
import { IBoss } from '../interfaces/IBoss';
const boss = node.getComponent('Boss101') as IBoss;  // 类型安全
```

### 文件组织建议

```
Script/
├── interfaces/          # 接口定义（最底层，无依赖）
│   ├── IBoss.ts
│   ├── IWeapon.ts
│   └── IEntity.ts
├── infra/               # 基础设施（只依赖 cc）
│   ├── EventBus.ts
│   ├── ResLoader.ts
│   └── SafePool.ts
├── data/                # 数据层（依赖 infra）
│   ├── ConfigManager.ts
│   └── GameState.ts
├── entity/              # 实体（依赖 data, infra, interfaces）
│   ├── Player.ts
│   ├── Enemy.ts
│   └── Bullet.ts
├── manager/             # 管理器（依赖 entity, data, infra）
│   ├── EnemyManager.ts
│   └── ItemManager.ts
├── ui/                  # UI（只依赖 infra 的 EventBus）
│   ├── StartMenu.ts
│   └── SettlementUI.ts
└── app/                 # App 层（依赖 manager, data, infra）
    ├── GameEntry.ts
    ├── GameFSM.ts
    └── ManagerFactory.ts
```

## 反模式检查清单

开发过程中如果出现以下代码，立即停下来重构：

| 看到 | 说明 | 应该改成 |
|------|------|---------|
| `Game.Ins.xxx` 在 Entity 里 | Entity 上访 App 层 | 通过 init() 注入或回调 |
| `Game.Ins.xxx` 在 UI 里 | UI 耦合游戏逻辑 | EventBus 发事件 |
| `ManagerA.xxx` 在 ManagerB 里 | Manager 平级直接调用 | EventBus 通信 |
| `static gameStart = false` | 全局可变状态 | GameState 集中管理 |
| 一个文件超过 300 行 | 可能是上帝类 | 拆分职责 |
| `getComponent('ClassName')` 字符串 | 循环依赖的绕过 | 抽接口 + as 断言 |
| 4+ 个布尔标记控制流程 | 隐式状态机 | 显式 GameFSM |
| `import` 出现循环警告 | 架构分层有问题 | 检查依赖方向 |

## 适用范围

此架构适用于**任何类型**的 Cocos Creator 游戏：
- 射击游戏：EnemyManager, BulletManager, WeaponManager
- 塔防游戏：TowerManager, WaveManager, PathManager
- RPG：CharacterManager, QuestManager, InventoryManager
- 消除游戏：BoardManager, TileManager, ComboManager
- 跑酷游戏：ObstacleManager, CoinManager, PowerUpManager

Manager 的名字变了，但架构模式不变。

---

## 模式控制器模式（来自 CLAUDE.md 7.1 迁入）

当游戏有多种模式时（经典/生存/养成/无尽/闯关...），**禁止在 GameManager 中写 `if (gameMode === 'xxx')` 分支**。用接口 + 独立类隔离：

```typescript
// 接口定义模式行为
interface IGameMode {
    init(ctx: GameContext): void;
    start(): void;
    update(dt: number): void;
    onBlockDestroyed(data): void;
    onCannonLapDone(data): void;
    destroy(): void;
}

// GameManager 只做模式分发（唯一的 if 判断）
const mode = gameMode === 'survival' ? new SurvivalMode() : new ClassicMode();
mode.init(ctx);

// 每种模式是独立文件
// mode/ClassicMode.ts — 关卡加载/全清胜利/托盘满失败
// mode/SurvivalMode.ts — 波次调度/元素生长/升级系统
```

**好处**：加新模式只需新建文件，不影响已有模式。共享组件（PixelGrid/BeltSystem/Cannon）提供能力，模式控制器决定策略。

### ProjectDrop 参考实现

`GameMode` 枚举 + `ModeController.selectMode` + `GameEntry.onModeSelected` 分叉：
- `GameMode.PLAYABLE` → `startPlayable()`
- `GameMode.LEVEL` → `startLevel(levelNo)`
- `GameMode.ENDLESS` → `startEndless()`

每种模式的差异（是否 spawn ItemBar / BulletShop / 是否允许带道具 / 结算 prefab 是哪个）都在各自 `start*()` 里处理，GameEntry 只做分发。
