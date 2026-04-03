# 管理器模式

批量管理同类实体的标准范式。适用于任何需要生成、更新、回收同类游戏对象的场景。

## 触发时机

- 需要管理一批同类实体（敌人、子弹、道具、特效、金币……）
- 发现所有逻辑都堆在 Game.ts 里
- 需要对象池化高频创建销毁的对象

## 核心原则

**一类实体一个 Manager，Manager 只管生命周期调度，不管实体内部行为。**

## 管理器标准结构

```typescript
import { Node, Prefab, instantiate, NodePool } from 'cc';
import { safePoolGet, safePoolPut } from '../infra/SafePool';
import { XxxEntity, XxxConfig } from '../entity/XxxEntity';

export class XxxManager {
    private prefab: Prefab;
    private layer: Node;
    private pool: NodePool = new NodePool();
    private activeEntities: Set<Node> = new Set();

    // ① 构造注入 —— 不用全局 Game.Ins
    constructor(prefab: Prefab, layer: Node) {
        this.prefab = prefab;
        this.layer = layer;
    }

    // ② 生成 —— 池取 + 初始化 + 挂载
    spawn(config: XxxConfig): Node {
        let node = safePoolGet(this.pool);
        if (!node) {
            node = instantiate(this.prefab);
        }
        
        node.parent = this.layer;
        node.setPosition(config.spawnPos);
        
        const entity = node.getComponent(XxxEntity);
        entity.init(config);
        entity.onDieCallback = (pos) => this.onEntityDie(node, pos);
        entity.show();
        
        this.activeEntities.add(node);
        return node;
    }

    // ③ 回收 —— 通知实体清理 + 还回池
    recycle(node: Node): void {
        const entity = node.getComponent(XxxEntity);
        entity?.recycle();
        
        this.activeEntities.delete(node);
        safePoolPut(this.pool, node);
    }

    // ④ 每帧更新 —— 时间驱动的生成/检查逻辑
    update(dt: number): void {
        // 子类实现：波次生成、超出屏幕回收等
    }

    // ⑤ 重置 —— 全回收 + 状态归零
    reset(): void {
        for (const node of this.activeEntities) {
            const entity = node.getComponent(XxxEntity);
            entity?.recycle();
            safePoolPut(this.pool, node);
        }
        this.activeEntities.clear();
    }

    // 实体死亡回调
    private onEntityDie(node: Node, pos: Vec3): void {
        this.recycle(node);
        // 可发 EventBus 事件通知其他系统（如掉落道具）
    }
}
```

## 五步生命周期

```
构造(prefab, layer)  →  spawn(config)  →  update(dt)  →  recycle(node)  →  reset()
      ↓                     ↓                  ↓               ↓                ↓
   记住依赖            池取+init+挂载       时间驱动逻辑     清理+还池        全部回收
```

### 每步的规则

| 步骤 | 做什么 | 不做什么 |
|------|--------|---------|
| **构造** | 保存 prefab/layer 引用 | 不创建实体，不初始化池 |
| **spawn** | 池取/实例化 → init → 挂 layer → 注册回调 | 不写 tween/动画（那是实体的事） |
| **update** | 检查时间/条件 → 调 spawn → 检查回收条件 | 不遍历实体改 position（实体自己 update） |
| **recycle** | 通知实体清理 → 从活跃集合移除 → 还回池 | 不 destroy（池化复用） |
| **reset** | 遍历活跃实体全部回收 → 清状态 | 不清池（池保留供下局复用） |

## 对象池模式

### 为什么需要池化

高频创建销毁的对象（子弹、特效、金币）每帧可能创建/销毁几十个，频繁 `instantiate` + `destroy` 会导致：
- GC 抖动（垃圾回收导致掉帧）
- instantiate 本身的开销（深拷贝节点树）

### SafePool 工具

```typescript
// 安全的池操作 —— 解决 Cocos 3.x 池中可能存在已销毁节点的问题

export function safePoolGet(pool: NodePool): Node | null {
    while (pool.size() > 0) {
        const node = pool.get();
        if (node && isValid(node)) return node;
        // 跳过已销毁的节点
    }
    return null;
}

export function safePoolPut(pool: NodePool, node: Node): void {
    if (!node || !isValid(node)) return;
    node.removeFromParent();
    pool.put(node);
}
```

### 什么该池化

| 对象 | 池化？ | 原因 |
|------|--------|------|
| 子弹 | ✅ 必须 | 每秒可能创建 10-50 个 |
| 普通敌人 | ✅ 必须 | 波次生成，频繁出现 |
| 特效/爆炸 | ✅ 必须 | 生命周期极短（0.3-1秒） |
| 金币/道具 | ✅ 必须 | 批量掉落 |
| Boss | ❌ 不必 | 同时只有 1 个，创建不频繁 |
| UI 面板 | ❌ 不必 | 切换不频繁 |
| 玩家 | ❌ 不必 | 只有 1 个 |

## 多池管理器

一个 Manager 管理多种实体变体时，每种一个池：

```typescript
export class EffectManager {
    private pools: Map<string, NodePool> = new Map();
    private prefabs: Map<string, Prefab> = new Map();
    
    constructor(prefabMap: { name: string, prefab: Prefab }[], private layer: Node) {
        for (const { name, prefab } of prefabMap) {
            this.prefabs.set(name, prefab);
            this.pools.set(name, new NodePool());
        }
    }
    
    spawn(type: string, pos: Vec3): Node {
        const pool = this.pools.get(type);
        const prefab = this.prefabs.get(type);
        
        let node = safePoolGet(pool);
        if (!node) node = instantiate(prefab);
        
        node.parent = this.layer;
        node.setPosition(pos);
        return node;
    }
    
    recycle(type: string, node: Node): void {
        const pool = this.pools.get(type);
        safePoolPut(pool, node);
    }
}
```

## 两种架构选择

### A. 普通类 Manager（推荐，大多数情况）

```typescript
// 不继承 Component，由 App 层手动管理
export class EnemyManager {
    constructor(prefab: Prefab, layer: Node) { }
    update(dt: number) { }
    reset() { }
}

// App 层
class GameEntry extends Component {
    private enemyManager: EnemyManager;
    
    start() {
        this.enemyManager = new EnemyManager(this.enemyPrefab, this.enemyLayer);
    }
    update(dt: number) {
        this.enemyManager.update(dt);
    }
}
```

**优点：** 不依赖引擎生命周期，可测试，无 Component 开销
**适用：** 实体管理、游戏逻辑、数据处理

### B. Component Manager（需要编辑器绑定时）

```typescript
// 继承 Component，通过 @property 在编辑器中绑定
@ccclass('UIManager')
export class UIManager extends Component {
    @property(Node) startButton: Node = null;
    @property(Node) settingsPanel: Node = null;
    
    onEnable() {
        this.startButton.on('click', this.onStartClick, this);
    }
}

// 场景中挂载，App 层通过 @property 引用
@ccclass('GameEntry')
export class GameEntry extends Component {
    @property(UIManager) uiManager: UIManager = null;
}
```

**优点：** 可在编辑器中可视化配置 UI 元素
**适用：** UI 管理、需要直接绑定场景节点的组件

### 选择依据

| 条件 | 用普通类 | 用 Component |
|------|---------|-------------|
| 管理游戏实体（敌人、子弹……） | ✅ | |
| 需要编辑器中绑定 UI 节点 | | ✅ |
| 需要 onLoad/start 生命周期 | | ✅ |
| 需要单元测试 | ✅ | |
| 需要在多个场景间复用 | ✅ | |

## Manager 间通信

```typescript
// ❌ Manager 直接调用 Manager
class EnemyManager {
    private goldManager: GoldManager;  // 耦合！
    
    onEnemyDie(pos: Vec3) {
        this.goldManager.dropGold(pos);  // 直接调用
    }
}

// ✅ 通过 EventBus 解耦
class EnemyManager {
    onEnemyDie(pos: Vec3) {
        EventBus.emit('enemy:die', { position: pos, reward: 10 });
    }
}

class GoldManager {
    constructor() {
        EventBus.on('enemy:die', (data) => {
            this.dropGold(data.position, data.reward);
        });
    }
}
```

## App 层协调模式

```typescript
// App 层持有所有 Manager，负责协调
class ManagerFactory {
    static create(entry: GameEntry) {
        const managers = {
            enemy: new EnemyManager(entry.enemyPrefab, entry.enemyLayer),
            bullet: new BulletManager(entry.bulletPrefab, entry.bulletLayer),
            effect: new EffectManager(entry.effectPrefabs, entry.effectLayer),
            gold: new GoldManager(entry.goldPrefab, entry.goldLayer),
        };
        return managers;
    }
}

// GameFSM 的 Battle 状态
class BattleState implements IGameState {
    constructor(private managers: ManagerMap) {}
    
    onEnter() {
        // 启动所有 Manager
    }
    
    onUpdate(dt: number) {
        this.managers.enemy.update(dt);
        this.managers.bullet.update(dt);
        this.managers.effect.update(dt);
        this.managers.gold.update(dt);
    }
    
    onExit() {
        // 重置所有 Manager
        Object.values(this.managers).forEach(m => m.reset());
    }
}
```

## 反模式检查

| 看到 | 问题 | 改成 |
|------|------|------|
| Manager 构造函数 10+ 参数 | 职责太多，该拆分 | 每类实体一个 Manager |
| Manager 里有 tween/Sprite 操作 | 越界操作实体内部 | 调实体的方法 |
| Manager 里直接 `destroy(node)` | 跳过池化 | `safePoolPut` |
| Manager 访问 `Game.Ins` | 上访 App 层 | 构造注入依赖 |
| Manager 访问其他 Manager | 平级直接调用 | EventBus |
| update() 里遍历改 position | Manager 替实体干活 | 实体自己 update |
| reset() 里用 `destroy` 清实体 | 浪费池 | 全部 recycle 回池 |

## 不同游戏类型的 Manager 示例

| 游戏类型 | Manager | 管什么 | spawn 条件 |
|---------|---------|--------|-----------|
| 射击 | EnemyManager | 波次敌人 | 时间触发 |
| 射击 | BulletManager | 玩家/敌人子弹 | 武器射击时 |
| 塔防 | WaveManager | 进攻波次 | 倒计时/上一波清完 |
| 塔防 | TowerManager | 防御塔 | 玩家放置 |
| RPG | MonsterManager | 区域怪物 | 进入区域 / 刷新时间 |
| 消除 | TileManager | 棋盘方块 | 消除后补充 |
| 跑酷 | ObstacleManager | 障碍物 | 距离触发 |
| 卡牌 | HandManager | 手牌 | 抽牌时 |

Manager 名字和 spawn 条件不同，但 `spawn → update → recycle → reset` 的骨架相同。
