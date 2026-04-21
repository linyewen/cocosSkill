# 实体生命周期模式

任何游戏实体（玩家、敌人、子弹、道具、特效、塔、方块……）的标准生命周期设计。适用于所有 Cocos Creator 游戏类型。

## 触发时机

- 创建新的游戏实体脚本时
- 发现 Manager 里在外部操作实体的 tween/sprite/state 时
- 用 `/cocos-create` 或 `/cocos-prefab` 创建实体前，先用此 skill 设计组件接口

## 核心原则

**实体封装自身行为，外部只调方法不操作内部。**

Manager 和 Game 脚本只负责"调度"（何时创建、放在哪、何时销毁），不负责"表演"（怎么动、怎么变、怎么消失）。

## 标准生命周期方法

每个实体组件应该实现以下方法（按需选择，不是全部必须）：

```typescript
export class XxxEntity extends Component {
    /** 初始化：接收配置参数，设置初始状态 */
    init(config: XxxConfig): void { }
    
    /** 入场表现：播放入场动画/音效 */
    show(): void { }
    
    /** 每帧更新：自驱动行为（移动、AI、计时） */
    update(dt: number): void { }
    
    /** 终结表现：死亡/收集/消失的动画 */
    onDie(): void { }
    
    /** 回收前清理：停止 tween、重置状态、准备进池 */
    recycle(): void { }
}
```

### 方法职责对照表

| 方法 | 谁调用 | 做什么 | 不做什么 |
|------|--------|--------|---------|
| `init(config)` | Manager.spawn() | 设属性、设位置、设方向 | 不播动画（等 show） |
| `show()` | Manager.spawn() 之后 | 播入场动画/缩放/渐显 | 不设属性 |
| `update(dt)` | 引擎自动调 | 移动、AI 决策、碰撞响应 | 不访问 Manager |
| `onDie()` | 自身碰撞回调 / Manager 通知 | 播死亡动画、掉落道具事件 | 不直接 destroy |
| `recycle()` | Manager.recycle() | 停 tween、重置 opacity/scale | 不 removeFromParent（池会做） |

## 逻辑 / 视觉分离

### 节点结构

```
XxxPrefab (根节点)
├── 脚本组件 (XxxEntity.ts)     ← 逻辑：行为、碰撞、状态
├── RigidBody2D                  ← 逻辑：物理
├── BoxCollider2D                ← 逻辑：碰撞检测
│
└── icon (子节点)
    └── Sprite                   ← 视觉：贴图、颜色、动画
```

### 为什么分离

- 换贴图（换皮）不影响碰撞体大小和脚本行为
- 做闪白/闪红动画只改 icon 的 Sprite 材质，不影响根节点
- 同一个 Sprite 图可以复用在不同逻辑实体上

```typescript
// ✅ 视觉操作针对 icon 子节点
this.iconNode.getComponent(Sprite).spriteFrame = newFrame;

// ❌ 不要在根节点上挂 Sprite
// 根节点是逻辑容器，不是视觉载体
```

## 实体不上访

实体组件**不应该知道** Manager、Game、或其他实体的存在。

### 通信方式

```typescript
// ❌ 实体直接访问 Manager
class Enemy extends Component {
    onDie() {
        Game.Ins.getEffectManager().playExplode(this.node.position);  // 上访！
        Game.Ins.getGoldManager().dropGold(this.node.position);       // 上访！
    }
}

// ✅ 方案一：回调函数（简单直接）
class Enemy extends Component {
    onDieCallback: (pos: Vec3) => void = null;
    
    onDie() {
        this.playDeathAnimation();  // 自己管自己的动画
        this.onDieCallback?.(this.node.worldPosition);  // 通知外部
    }
}

// Manager 注册回调
const enemy = node.getComponent(Enemy);
enemy.onDieCallback = (pos) => {
    this.effectManager.playExplode(pos);
    this.goldManager.dropGold(pos);
};

// ✅ 方案二：EventBus（多个监听者时）
class Enemy extends Component {
    onDie() {
        this.playDeathAnimation();
        EventBus.emit('entity:enemy_die', {
            position: this.node.worldPosition,
            enemyType: this.type,
            reward: this.reward
        });
    }
}
```

### 选择依据

| 场景 | 用回调 | 用 EventBus |
|------|--------|------------|
| 只有一个监听者（Manager） | ✅ | 可以但没必要 |
| 多个系统关心同一事件 | ❌ | ✅ |
| 需要传递复杂数据 | ✅（类型安全） | ⚠️（需要定义事件类型） |
| 实体在对象池中频繁复用 | ✅（回收时置 null） | ⚠️（记得 off） |

## BaseUnit 基类模式

对于有血量的实体（玩家、敌人、Boss），提取通用基类：

```typescript
export abstract class BaseUnit extends Component {
    protected hp: number = 0;
    protected maxHp: number = 0;
    protected isDead: boolean = false;
    
    /** 子类必须实现 */
    protected abstract onTakeDamage(damage: number): void;
    protected abstract onDie(): void;
    
    /** 通用伤害处理 */
    takeDamage(damage: number): void {
        if (this.isDead) return;
        
        this.hp -= damage;
        this.onTakeDamage(damage);  // 子类：闪白、伤害数字等
        
        if (this.hp <= 0) {
            this.isDead = true;
            this.onDie();  // 子类：死亡动画、掉落等
        }
    }
    
    /** 通用初始化 */
    initUnit(hp: number): void {
        this.hp = hp;
        this.maxHp = hp;
        this.isDead = false;
    }
    
    /** 回收重置 */
    recycleUnit(): void {
        this.isDead = false;
        this.hp = 0;
    }
}
```

### 使用

```typescript
export class Enemy extends BaseUnit {
    private config: EnemyConfig;
    
    init(config: EnemyConfig) {
        this.config = config;
        this.initUnit(config.hp);
        this.node.setPosition(config.spawnPos);
    }
    
    protected onTakeDamage(damage: number) {
        // 闪白效果
        HighlightManager.flashWhite(this.iconNode);
    }
    
    protected onDie() {
        // 播放死亡动画，完成后通知外部
        this.playDeathAnim(() => {
            this.onDieCallback?.(this.node.worldPosition, this.config.reward);
        });
    }
    
    recycle() {
        this.recycleUnit();
        Tween.stopAllByTarget(this.node);
        this.node.setScale(1, 1, 1);
    }
}
```

## 接口模式消除循环依赖

当不同类型的实体需要互相识别时（如 Boss 和 BossWeapon），用接口解耦：

```typescript
// interfaces/IBoss.ts —— 独立文件，无导入依赖
export interface IBoss {
    readonly hp: number;
    readonly maxHp: number;
    readonly isDead: boolean;
    takeDamage(damage: number): void;
}

// interfaces/IWeapon.ts
export interface IWeapon {
    readonly type: string;
    init(config: any): void;
    update(dt: number): void;
    shoot(): void;
    reset(): void;
}

// Boss101.ts 实现 IBoss —— 不导入 BossWeapon
export class Boss101 extends BaseUnit implements IBoss { ... }

// BossWeapon.ts 使用 IBoss —— 不导入 Boss101
export class BossWeapon extends Component {
    private owner: IBoss;  // 只依赖接口
}
```

## 反模式检查

看到以下代码立即停下：

```typescript
// ❌ Manager 里 tween 实体
const enemy = instantiate(this.enemyPrefab);
tween(enemy).to(0.3, { scale: new Vec3(2, 2, 1) }).start();  // 应该在 Enemy.show() 里

// ❌ Manager 里改实体的 spriteFrame
const bullet = instantiate(this.bulletPrefab);
bullet.getChildByName('icon').getComponent(Sprite).spriteFrame = xxx;  // 应该在 Bullet.init() 里

// ❌ 实体里访问 Manager
class Bullet extends Component {
    update(dt) {
        if (outOfScreen) {
            Game.Ins.getBulletManager().recycle(this.node);  // 上访！
        }
    }
}
// ✅ 应该通过回调
class Bullet extends Component {
    onOutOfScreen: (node: Node) => void = null;
    update(dt) {
        if (outOfScreen) {
            this.onOutOfScreen?.(this.node);
        }
    }
}

// ❌ 外部直接操作实体 opacity/position 循环
// 在 Manager 的 update 里：
for (const gold of this.activeGolds) {
    gold.setPosition(gold.position.x, gold.position.y + speed * dt);  // 应该在 Gold.update() 里
}
```

## 不同游戏类型的实体示例

| 游戏类型 | 实体 | init() 参数 | update() 行为 | onDie() 表现 |
|---------|------|------------|--------------|-------------|
| 射击 | 子弹 | 速度、方向、伤害 | 沿方向移动 | 命中爆炸 |
| 塔防 | 防御塔 | 类型、攻击力、射程 | 寻找目标、开火 | 被摧毁动画 |
| RPG | 怪物 | 属性表、AI类型 | AI 行为树 | 掉落战利品 |
| 消除 | 方块 | 颜色、位置 | 下落/交换动画 | 消除特效 |
| 跑酷 | 障碍物 | 类型、速度 | 向玩家方向移动 | 被击碎 |
| 卡牌 | 卡牌 | 卡牌数据、位置 | 翻转/拖拽 | 打出特效 |

名字和参数不同，但 `init → show → update → onDie → recycle` 的生命周期相同。

---

## 组件获取决策（来自 CLAUDE.md 5.1 迁入）

```typescript
// ★ 最优：@property 编辑器连线
@property(Sprite) icon: Sprite = null;

// ● 次优：getComponent 运行时查询一次并缓存
onLoad() { this.sprite = this.getComponent(Sprite); }

// ▲ 条件性：addComponent 运行时才需要
activateShield() { this.node.addComponent(CircleCollider2D); }

// ✗ 禁止：每帧 getComponent
update() { this.getComponent(Sprite).color = ...; }

// ✗ 禁止：getChildByName 获取子节点组件
const iconNode = node.getChildByName('icon');
const sprite = iconNode.getComponent(Sprite);
sprite.spriteFrame = sf;

// ✓ 正确：组件暴露方法，外部通过方法操作
// 组件内部：
@property(Sprite) icon: Sprite = null;
setIcon(sf: SpriteFrame): void { if (this.icon) this.icon.spriteFrame = sf; }
get iconNode(): Node | null { return this.icon ? this.icon.node : null; }
// 外部调用：
const coin = node.getComponent(Coin);
coin.setIcon(spriteFrame);
```

### `getChildByName` 使用规则

- ✗ 禁止用于获取 prefab 内部子节点的组件（应通过 @property + 组件方法）
- ✓ 仅允许用于场景级节点查找（如 `canvas.getChildByName('Camera')`）
- **原因**：getChildByName 让 Manager 依赖 prefab 内部结构（节点命名），破坏封装。编辑器中也无法追踪绑定关系。

---

## 脚本 vs 普通类（来自 CLAUDE.md 5.3 迁入）

| 场景 | 做法 | 原因 |
|------|------|------|
| 需要 onLoad/update/onDestroy | 继承 `Component` | Enemy、Player、UI 控制器 |
| 纯数据/纯逻辑 | 普通 class | Config、AI、状态机 |
| 全局单例，需要节点引用 | Component 挂场景节点 | SoundManager |
| 全局单例，无节点依赖 | 普通 class 静态单例 | EventDispatcher |

---

## 碰撞类型判断（来自 CLAUDE.md 5.4 迁入）

碰撞矩阵做粗过滤，代码用 `getComponent` 做精确识别。不依赖 `collider.group` / `getGroup()` 等 API。

```typescript
// ✓ 正确：组件判断，类型安全
const projectile = event.otherCollider.node.getComponent(Projectile);
if (projectile) this.takeDamage(projectile.damage);

// ✗ 错误：依赖 group API
if (event.otherCollider.getGroup() === 4) { ... }
```

---

## 生命周期规范（来自 CLAUDE.md 5.5 迁入）

- 所有 Component 子类必须实现 `onLoad()`
- 碰撞回调在 `onLoad` 中注册，`onDestroy` 中注销
- 抽象基类必须实现所有生命周期空方法，确保子类 `super.xxx()` 安全
- **不在 start() 中做业务初始化**，业务逻辑由外部调用触发（View 的 `show()`、Item 的 `setData()`）
