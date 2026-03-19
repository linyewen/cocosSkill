# AI × Cocos Creator 游戏开发规范

本文件是 AI 独立创作 Cocos Creator 游戏的设计哲学与工程规范。
适用于所有 Cocos Creator 项目。目标：AI 能从策划案+美术资源直接输出可运行的完整游戏。

---

## 一、设计哲学

编程是艺术。每个类、每个预制体、每个场景都应该结构清晰、逻辑自洽、美观有序。
不偷懒，不过度工程，恰到好处。

---

## 二、节点架构原则

### 2.1 根节点 = 逻辑锚点，子节点 = 视觉表现

这是最核心的设计原则。根节点只承载逻辑（脚本、碰撞体），视觉元素（Sprite、Label）永远放子节点。

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

原因：
- 受击闪白、缩放动画只作用于 icon，不影响碰撞体
- 换装/换皮只改子节点，根节点逻辑不变
- 多层视觉（阴影、特效、血条）可以自由叠加

唯一例外：纯静态装饰节点（无脚本、无动画、无碰撞），可以 Sprite 直接挂根节点。

### 2.2 预制体三种类型

创建任何预制体前，先判断它属于哪种类型——类型决定根节点设计、适配策略和子节点结构：

| 类型 | 判断标准 | 根节点设计 | 适配策略 |
|------|---------|-----------|---------|
| **全屏页面** | 覆盖整个屏幕，模态交互，打断游戏流程 | Widget 四边=0 + 脚本 | 必须 Widget 适配 |
| **嵌入式组件** | 局部区域展示，是更大 UI 的一部分 | UITransform=自身大小 + 脚本 | 按需（Widget锚定或跟随对象） |
| **游戏对象** | 存在于游戏世界，有碰撞和生命周期 | 脚本 + 碰撞体 | 不需要，在世界坐标移动 |

**全屏页面标准结构**（卡牌选择、结算、飞机选择等）：
```
XxxView (Widget四边=0 + 脚本)
├── mask (Sprite半透明 + BlockInputEvents)   ← 遮罩，阻止穿透
└── content (UIOpacity + Layout)              ← 内容容器，缓动目标
    ├── Item实例 或 instantiate(itemPrefab)
    └── ...
```

**游戏对象标准结构**（Enemy/Player/Boss/Bullet）：
```
XxxPrefab (脚本 + RigidBody[KINEMATIC] + BoxCollider[isTrigger])
├── shadow (Sprite)
├── icon (Sprite)        ← 主图，可独立做动画
├── shotNode (Node)      ← 射击点
└── effect (Node)        ← 特效容器
```

**嵌入式组件标准结构**（血条、HUD、道具提示）：
```
XxxWidget (UITransform=自身大小 + 脚本)
├── bg (Sprite)
├── bar/icon (Sprite)
└── label (Label)
```

### 2.2.1 适配策略速查

| 场景 | 做法 |
|------|------|
| 全屏页面 | Widget 四边=0 拉满，内容用 Layout 居中 |
| Safe Area（刘海屏） | 内容容器套 SafeArea 组件或手动读 `sys.getSafeAreaRect()` 设 padding |
| HUD 锚定屏幕边缘 | Widget 锚定（如 isAlignTop=true, top=50） |
| 跟随游戏对象 | 每帧 `convertToWorldSpaceAR` 跟随，不用 Widget |
| 游戏对象本身 | 不适配，在世界坐标移动，尺寸由图片+配置表决定 |

### 2.2.2 视觉子节点组件映射

**视觉子节点必须挂对应渲染组件**（批量创建时最易遗漏）：
- icon → UITransform + **Sprite**（主图/动画载体）
- shadow → UITransform + **Sprite**（阴影）
- label → UITransform + **Label**
- target → UITransform + **Sprite**（瞄准标记等）
- 纯逻辑节点（shotNode/effect）→ 只需 UITransform

### 2.3 节点创建决策：谁决定了它的存在？

核心原则：**能在编辑器里看见的东西，就在编辑器里创建。代码只负责"何时创建"和"怎么动"，不负责"长什么样"。**

| 决策来源 | 做法 | 例子 |
|---------|------|------|
| **设计时已知** — 美术/策划确定了样式 | prefab/scene 中定义 | 敌机、Boss、UI面板、子弹 |
| **运行时已知数量，样式已知** | `instantiate(prefab)` | 一波生成5个敌人、弹幕发射 |
| **运行时才知道要不要有** | 条件判断后 `instantiate` 或 `addComponent` | 拾取道具后出现护盾特效 |
| **纯程序化生成，无法预定义** | `new Node()` | 贝塞尔调试点、程序化网格顶点 |

`new Node()` 不是"禁止"，而是**最后手段** — 只在没有任何预定义模板能描述它的时候使用。

其他规则：
- 节点含超过 1 个子节点时，必须做成预制体
- 新增节点/Layer 时，必须同步在 scene 或 prefab JSON 中创建并绑定到 `@property`

### 2.4 组件获取决策：getComponent vs addComponent vs @property

```typescript
// ★ 最优：@property 直接绑定 — 编辑器连线，零查询成本，类型安全
@property(Sprite)
icon: Sprite = null;

// ● 次优：getComponent — 组件在 prefab 中已存在，运行时查询一次并缓存
private sprite: Sprite;
onLoad() { this.sprite = this.getComponent(Sprite); }

// ▲ 条件性：addComponent — 运行时才需要，设计时不确定要不要
activateShield() {
    const collider = this.node.addComponent(CircleCollider2D);
    collider.radius = 100;
}

// ✗ 禁止：每帧 getComponent
update() { this.getComponent(Sprite).color = ...; }  // 反复查询，性能浪费
```

判断标准：90% 情况都需要 → 放 prefab 里用 @property 或 getComponent。少数场景才触发 → addComponent。

### 2.5 脚本 vs 普通类：需不需要生命周期？

| 场景 | 做法 | 原因 |
|------|------|------|
| 需要 onLoad/update/onDestroy | 继承 `Component`，挂节点 | Enemy、Player、UI控制器 |
| 纯数据/纯逻辑，无生命周期 | 普通 class，直接 `new` | BulletConfig、BossAI、状态机 |
| 全局单例，需要节点引用 | `Component` 挂场景节点 | SoundManager（需要 AudioSource） |
| 全局单例，无节点依赖 | 普通 class 静态单例 | EventDispatcher、MathUtil |

---

## 三、预制体设计规范

### 3.1 创建流程

1. **分析依赖**：先分析脚本的所有依赖（@property 显式依赖 + getComponent/children 隐式依赖）
2. **先叶后父**：先创建最小的叶子预制体，再创建引用它的父预制体
3. **一步到位**：创建 .ts + .meta → 立即算压缩 UUID → 构建 prefab JSON（含 __type__ + @property 绑定），不分两步
4. **验证完整性**：确认所有 @property 已绑定、容器节点有子节点、隐式组件已挂载

### 3.2 @property 哲学

- 引用的节点/组件必须在编辑器中创建并绑定，代码中**直接使用**
- **不做空判断，不做 fallback**，运行时缺失就报错暴露问题
- **不用 getChildByName 做 fallback** — 既然用了 @property 就信任绑定
- 子预制体已绑定的资源，父级**不重复 @property 引用**
- 纯逻辑组件直接挂同节点，用 `@property(ComponentType)` 绑定，不创建多余节点
- **新增 @property 必须同步绑定**：在代码中新增 `@property` 后，必须**立即**在 scene/prefab JSON 中写入对应的 `__uuid__` 或 `__id__` 绑定。代码声明和 JSON 绑定是**原子操作**，不能分步完成，否则运行时为 null

### 3.3 文件组织

- 按功能模块分文件夹：`Prefab/Bullet/`、`Prefab/Enemy/`、`Prefab/UI/`
- 命名约定：Item 结尾 = 单元素（CardItem），View 结尾 = 容器/页面（CardView）
- JSON 中 fileId 必须全局唯一，格式：`{节点名驼峰}{组件类型}`

---

## 四、组件设计模式

### 4.1 页面与子元素分离（View / Item 原则）

这是 UI 架构的核心原则——**职责边界**，名称不重要，原理重要：

**页面（View 角色）的职责**：
- 管生命周期：何时出现、何时消失
- 管布局：Layout 排列子元素
- 管动画：进出场缓动
- 管流程：pause/resume、事件通知
- **不关心子元素长什么样、数据是什么**

**子元素（Item 角色）的职责**：
- 管数据展示：通过 `setData(data)` 刷新自己（**必须有此方法，这是唯一数据入口**）
- 管交互回调：点击后通知外部
- **不关心自己在哪个页面里、怎么排列**

**为什么 Item 必须有刷新方法**：Item 作为可复用预制体，生命周期是"创建一次 → setData 多次"。对象池回收再取出不走 onLoad，只调 setData。没有这个方法就无法复用。

**同一个 Item 可以出现在不同的 View 里**——竖屏3选1、横向滚动列表、九宫格——Item 不变，变的是 View 的 Layout。

**判断标准**：prefab JSON 里出现重复的节点结构 → 应提取为独立预制体。

**Item 内部也可以嵌套更小的通用组件**，形成组件树：`View → Item → Widget`（如头像、星级条、进度条），每层只做自己的事，每层都可被不同上层复用。

**不在 start() 中做业务初始化** — start 只做引擎初始化，业务逻辑由外部调用触发（View 的 `show()`、Item 的 `setData()`）

### 4.2 生命周期规范

- 所有 Component 子类必须实现 `onLoad()`
- View 类还需 `onEnable()` / `start()` / `onDestroy()`
- 碰撞回调在 `onLoad` 中注册，`onDestroy` 中注销

### 4.3 抽象基类规范

- 抽象基类**必须实现所有生命周期空方法**（onLoad/onEnable/onDisable/onDestroy），确保子类 `super.xxx()` 调用安全
- 碰撞注册统一在基类 `onLoad` 中完成，子类通过实现 `handleCollision` 抽象方法处理碰撞逻辑，不要各自注册
- 子类如需覆盖 `onLoad`，必须调用 `super.onLoad()`

### 4.4 碰撞类型判断规范

碰撞矩阵做**粗过滤**（哪些组能碰），代码用 **`getComponent` 做精确识别**（碰到的具体是什么）。不依赖 `collider.group` / `getGroup()` 等 API（在部分引擎版本中不可用）。

```typescript
// ✓ 正确：组件判断，可靠且类型安全
protected handleCollision(event: ITriggerEvent) {
    const projectile = event.otherCollider.node.getComponent(Projectile);
    if (projectile && this.isVulnerable) {
        this.takeDamage(projectile.damage);
    }
}

// ✗ 错误：依赖 group API，不同引擎版本行为不一致
if (event.otherCollider.getGroup() === 4) { ... }  // 可能 undefined
if (event.otherCollider.node.group === 'bullet') { ... }  // 3D 中 group 是数值
```

---

## 五、资源管理

### 5.1 资源分区

- `textures/` — 静态资源，编辑器拖拽引用，不能 resources.load
- `resources/` — 动态资源，代码中用 `resources.load()` 加载
- 两者不混用

### 5.2 UUID 工作流

- UUID 压缩是 Cocos 自定义算法（23 字符），不是标准 base64（22 字符）
- 创建 .meta 后立即用 `compressUuid()` 算出压缩 UUID，一步完成 prefab 挂载
- 手动创建的 prefab/meta 需要编辑器刷新才能被引用，完成一批后统一提醒用户刷新

---

## 六、交互规则

- 回复使用中文
- UI 设计前先读取效果图，精确还原布局参数（尺寸、间距、颜色、字号）
- 用户可直接发送效果图路径或截图，AI 读取后精确还原
