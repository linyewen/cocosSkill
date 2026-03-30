# AI × Cocos Creator 游戏开发方法论

本文件是 AI 辅助开发 Cocos Creator 游戏的设计哲学与工程规范。
适用于所有 Cocos Creator 项目（3.x）。目标：AI 能从策划案+美术资源直接输出可运行的完整游戏。

---

## 一、核心思想：关注点分离

游戏开发中一切架构决策都围绕一个原则：**不同职责的事物必须独立，互不影响。**

### 1.1 逻辑与视觉分离

一个游戏对象有两个独立身份：**它是什么**（逻辑）和**它看起来像什么**（视觉）。

- 逻辑：脚本行为、碰撞体、血量、状态机
- 视觉：贴图、颜色、动画、粒子特效

为什么分离：改外观（换贴图、做闪白动画）不应该影响碰撞和行为；同一视觉可以复用在不同逻辑上。

**做法：逻辑组件（脚本/碰撞体）挂根节点，视觉组件（Sprite/Label）挂 icon 子节点。**

### 1.2 外观与行为分离

- 外观：在编辑器中用可视化方式设定（选贴图、调颜色、调大小、搭节点结构）
- 行为：在代码中用脚本控制（何时创建、放在哪、怎么移动、何时销毁）

编辑器擅长视觉调试，代码擅长逻辑控制。用代码拼凑外观 = 放弃编辑器的优势。

**做法：编辑器/MCP 创建 prefab 定义外观 → 代码 `instantiate(prefab)` 创建实例控制行为。`new Node()` 仅用于无视觉的纯逻辑容器。**

### 1.3 模块化复用

每个独立的游戏实体是一个 prefab（预制体），是最小的可复用单元。

**做法：看得见的实体 → prefab。重复的节点结构 → 提取 prefab。页面(View)管布局和生命周期，子元素(Item)管数据展示且必须有 `setData()` 方法支持复用。**

---

## 二、开发前检查

每次创建游戏对象或编写功能前，回答这四个问题：

```
1. 这个东西的逻辑和视觉分别是什么？→ 分开到不同节点
2. 外观该谁负责？→ 编辑器做 prefab，代码只 instantiate + 控制行为
3. 有没有可复用的部分？→ 提取为独立 prefab
4. 新玩法有没有深度？→ 需要操作层 + 策略层 + 成长层，不是单一机制换皮
```

---

## 三、节点架构原则

### 3.1 根节点 = 逻辑锚点，子节点 = 视觉表现

```
✓ 正确：
EnemyPrefab (UITransform + Enemy脚本 + RigidBody + BoxCollider)
  ├── shadow (Sprite)
  ├── icon (Sprite)        ← 主图，可独立做动画
  ├── shotNode (Node)      ← 射击点
  └── effect (Node)        ← 特效容器

✗ 错误：
EnemyPrefab (UITransform + Sprite + Enemy脚本 + BoxCollider)  ← 视觉和逻辑混在一起
```

唯一例外：纯静态装饰节点（无脚本、无动画、无碰撞），可以 Sprite 直接挂根节点。

### 3.2 预制体三种类型

| 类型 | 判断标准 | 根节点设计 | 适配策略 |
|------|---------|-----------|---------|
| **全屏页面** | 覆盖整个屏幕，模态交互 | Widget 四边=0 + 脚本 | 必须 Widget 适配 |
| **嵌入式组件** | 局部区域展示 | UITransform=自身大小 + 脚本 | 按需 |
| **游戏对象** | 存在于游戏世界，有碰撞和生命周期 | 脚本 + 碰撞体 | 不需要 |

**全屏页面标准结构**（结算、选择等）：
```
XxxView (Widget四边=0 + 脚本)
├── mask (Sprite半透明 + BlockInputEvents)
└── content (UIOpacity + Layout)
    ├── Item实例
    └── ...
```

**游戏对象标准结构**（Enemy/Player/Bullet）：
```
XxxPrefab (脚本 + RigidBody[KINEMATIC] + BoxCollider[isTrigger])
├── shadow (Sprite)
├── icon (Sprite)
├── shotNode (Node)
└── effect (Node)
```

### 3.3 视觉子节点组件映射

视觉子节点必须挂对应渲染组件（批量创建时最易遗漏）：
- icon → UITransform + **Sprite**
- shadow → UITransform + **Sprite**
- label → UITransform + **Label**
- 纯逻辑节点（shotNode/effect）→ 只需 UITransform

### 3.4 适配策略速查

| 场景 | 做法 |
|------|------|
| 全屏页面 | Widget 四边=0 拉满，内容用 Layout 居中 |
| HUD 锚定屏幕边缘 | Widget 锚定 |
| 跟随游戏对象 | 每帧 `convertToWorldSpaceAR` 跟随 |
| 游戏对象本身 | 不适配，在世界坐标移动 |

### 3.5 节点创建决策

**核心原则：能在编辑器里看见的东西，就在编辑器里创建。代码只负责"何时创建"和"怎么动"。**

| 决策来源 | 做法 | 例子 |
|---------|------|------|
| 设计时已知 | prefab/scene 中定义 | 敌机、UI面板、子弹 |
| 运行时数量变化，样式已知 | `instantiate(prefab)` | 生成敌人、弹幕 |
| 运行时才确定是否存在 | 条件后 `instantiate` | 道具特效 |
| 纯程序化，无法预定义 | `new Node()` | 调试点、程序化网格 |

---

## 四、Prefab 优先原则

**默认用 prefab，除非 prefab 让开发者难受才不用。**

1. **有视觉的对象 → prefab** —— UI面板、游戏实体、弹窗、结算页面
2. **代码只管行为** —— `instantiate()` + `setData()` + 动画控制
3. **MCP 没开 → 提醒用户开 MCP** —— 不要用 `new Node()` + `addComponent()` 绕过
4. **评估标准** —— "用 prefab 是否让开发者难受？" 不难受就用 prefab
5. **仅有的例外** —— 纯逻辑容器（无视觉）、临时调试标记、一次性几何绘制

### 反模式

```typescript
// ❌ 用代码拼 UI 外观
const node = new Node('Title');
node.addComponent(UITransform);
const label = node.addComponent(Label);
label.fontSize = 72;
label.color = new Color(255, 215, 0);

// ✅ 正确做法
const panel = instantiate(this.settlementPrefab);
panel.getComponent(SettlementUI).setData(stats);
this.node.addChild(panel);
```

### @property 哲学

- 引用的节点/组件必须在编辑器中创建并绑定，代码中**直接使用**
- **不做空判断，不做 fallback**，运行时缺失就报错暴露问题
- **不用 getChildByName 做 fallback**
- **新增 @property 必须同步绑定**：代码声明和 JSON 绑定是**原子操作**

---

## 五、组件设计模式

### 5.1 组件获取决策

```typescript
// ★ 最优：@property 编辑器连线
@property(Sprite) icon: Sprite = null;

// ● 次优：getComponent 运行时查询一次并缓存
onLoad() { this.sprite = this.getComponent(Sprite); }

// ▲ 条件性：addComponent 运行时才需要
activateShield() { this.node.addComponent(CircleCollider2D); }

// ✗ 禁止：每帧 getComponent
update() { this.getComponent(Sprite).color = ...; }
```

### 5.2 页面与子元素分离（View / Item 原则）

**页面（View）职责**：管生命周期、布局、动画、流程。不关心子元素长什么样。
**子元素（Item）职责**：管数据展示，通过 `setData(data)` 刷新自己。不关心自己在哪个页面里。

Item 必须有 `setData()` 方法 —— 对象池回收再取出不走 onLoad，只调 setData。

同一个 Item 可出现在不同 View 里 —— 竖屏3选1、横向滚动、九宫格。

### 5.3 脚本 vs 普通类

| 场景 | 做法 | 原因 |
|------|------|------|
| 需要 onLoad/update/onDestroy | 继承 `Component` | Enemy、Player、UI控制器 |
| 纯数据/纯逻辑 | 普通 class | Config、AI、状态机 |
| 全局单例，需要节点引用 | Component 挂场景节点 | SoundManager |
| 全局单例，无节点依赖 | 普通 class 静态单例 | EventDispatcher |

### 5.4 碰撞类型判断

碰撞矩阵做粗过滤，代码用 `getComponent` 做精确识别。不依赖 `collider.group` / `getGroup()` 等 API。

```typescript
// ✓ 正确：组件判断，类型安全
const projectile = event.otherCollider.node.getComponent(Projectile);
if (projectile) this.takeDamage(projectile.damage);

// ✗ 错误：依赖 group API
if (event.otherCollider.getGroup() === 4) { ... }
```

### 5.5 生命周期规范

- 所有 Component 子类必须实现 `onLoad()`
- 碰撞回调在 `onLoad` 中注册，`onDestroy` 中注销
- 抽象基类必须实现所有生命周期空方法，确保子类 `super.xxx()` 安全
- **不在 start() 中做业务初始化**，业务逻辑由外部调用触发（View 的 `show()`、Item 的 `setData()`）

---

## 六、资源管理

| 目录 | 用途 | 加载方式 |
|------|------|---------|
| `textures/` | 静态资源 | 编辑器拖拽，@property 引用 |
| `resources/` | 动态资源 | `resources.load()` |

两者不混用。

---

## 七、快速决策表

| 场景 | 做法 | 原因 |
|------|------|------|
| 创建可见对象 | `instantiate(prefab)` | 编辑器管外观，代码管行为 |
| 绑定组件 | @property > getComponent > addComponent | 优先编辑器连线 |
| 需要生命周期 | 继承 Component | onLoad/update/onDestroy |
| 纯数据/逻辑 | 普通 class | 不需要节点和生命周期 |
| 碰撞识别 | getComponent(类) | 类型安全 |
| MCP/编辑器不可用 | 提醒用户开启，不绕过 | 不用代码替代编辑器 |

---

## 八、交互规则

- 回复使用中文
- UI 设计前先读取效果图，精确还原布局参数
- 迁移/重构组件时，必须清理旧节点上的旧绑定（全链路检查）
