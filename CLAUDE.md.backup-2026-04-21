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
├── mask (Sprite黑色 + UIOpacity=100 + sizeMode=CUSTOM)   ← 纯视觉，无 BlockInputEvents
└── content (UIOpacity + Layout)
    ├── Item实例
    └── ...
```

**触摸拦截**：不用 `BlockInputEvents`（会吞掉子节点和全局触摸事件）。改为脚本 onLoad 中注册：
```typescript
// 根节点拦截触摸，阻止事件穿透到游戏层
this.node.on(Node.EventType.TOUCH_START, (e) => { e.propagationStopped = true; }, this);
// 如需点击任意位置触发操作（如引导页跳过）：
this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
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

### 3.3.1 Sprite sizeMode 选择

| sizeMode | 值 | 含义 | 何时用 |
|---------|---|------|-------|
| TRIMMED | 1 | 用贴图裁切后的自身尺寸 | **默认**，图标/按钮/角色等不需要手动设大小 |
| CUSTOM | 0 | 跟随 UITransform contentSize | 九宫格拉伸、方块 icon、全屏 mask、需固定尺寸的小图标 |
| RAW | 2 | 用贴图原始尺寸（不裁切） | 极少用 |

**规则：不设置大小的都用 TRIMMED(1)，只有明确需要控制大小才改 CUSTOM(0)。**

### 3.4 适配策略速查

| 场景 | 做法 |
|------|------|
| 全屏页面 | Widget 四边=0 拉满，内容用 Layout 居中 |
| HUD 锚定屏幕边缘 | Widget 锚定 |
| 跟随游戏对象 | 每帧 `convertToWorldSpaceAR` 跟随 |
| 游戏对象本身 | 不适配，在世界坐标移动 |

### 3.6 _layer 规则

| 节点类型 | _layer 值 | 说明 |
|---------|-----------|------|
| Canvas 及所有 UI 子节点 | `1073741824` | DEFAULT 层（project_1 实测验证） |
| Camera 节点 | `1073741824` | 同上 |
| Prefab 中所有节点 | `1073741824` | 和 Scene 中节点一致 |

> ⚠️ 之前写的 `33554432`(UI_2D) 经实测不正确，会导致渲染层级问题。以 project_1 实际可运行文件为准。

### 3.7 Camera 必须是 Canvas 的子节点

Camera 放在 Scene 根级别（和 Canvas 同级）会导致：
- `convertToNodeSpaceAR` 坐标偏移（触摸位置和视觉位置不一致）
- 3D 引擎做 2D 时问题尤为严重

```
✓ 正确：
Scene
└── Canvas
    ├── Camera (z=1000)   ← Canvas 的第一个子节点
    ├── bg
    ├── gridArea
    └── ...

✗ 错误：
Scene
├── Canvas
└── Camera               ← 和 Canvas 同级，坐标系不匹配
```

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
- **新增 @property 必须同步绑定**：代码声明和 JSON 绑定是**原子操作**，写完脚本后必须立刻用 Python 编辑 prefab/scene JSON 绑定 __id__，不能留到后面
- **Prefab @property 绑定流程同 Scene**：按"节点名+组件类型"动态查找 __id__，编辑后 reimport_asset，读回 JSON 验证无 null

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

**`getChildByName` 使用规则**：
- ✗ 禁止用于获取 prefab 内部子节点的组件（应通过 @property + 组件方法）
- ✓ 仅允许用于场景级节点查找（如 `canvas.getChildByName('Camera')`）
- **原因**：getChildByName 让 Manager 依赖 prefab 内部结构（节点命名），破坏封装。编辑器中也无法追踪绑定关系。

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

### 6.1 导入图片后检查 meta

导入图片资源后，必须检查 `.meta` 文件的 `subMetas` 是否包含 `sprite-frame` importer：
```json
"subMetas": {
    "f9941": {
        "importer": "sprite-frame",  ← 必须有这个
        "name": "spriteFrame",
        ...
    }
}
```
缺少 sprite-frame submeta 会导致 Sprite 组件显示全黑。修复：在编辑器中右键资源 → Reimport，或手动添加 submeta。

### 6.2 资源文件命名规则

**导入资源时，所有文件名和文件夹名必须是英文或数字，禁止中文。**

- 原始素材有中文名 → 复制时重命名为英文短名
- 音效 `发射子弹音效_MP3.mp3` → `shoot.mp3`
- 图片 `提示.png` → `tip.png`
- 文件夹 `子弹/` → `bullet/`
- 原因：中文路径在 `resources.load()`、微信小游戏、跨平台构建中容易出问题

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
| 多模式游戏（经典/生存/养成）| 模式控制器模式 | GameManager 只分发，不含 if(mode) 业务逻辑 |

### 7.1 模式控制器模式（多模式游戏必用）

当游戏有多种模式时，**禁止在 GameManager 中写 `if (gameMode === 'xxx')` 分支**。用接口+独立类隔离：

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

---

## 八、Prefab 必须绑定代码（铁律）

**能 prefab 的必须 prefab，prefab 必须绑定代码。**

每个 prefab 的游戏实体必须有自己的脚本组件，封装自身行为。游戏主脚本只负责调度（instantiate + getComponent().方法()），不在外部直接操作 prefab 内部的 tween/动画/状态。

| 实体类型 | 必须有的脚本 | 脚本封装的行为 |
|---------|------------|-------------|
| 可收集道具 | CollectItem | show() 入场动画、collect() 收集动画+销毁 |
| 子弹/投射物 | Bullet | init(speed, dir) 初始化、update 自动移动、命中时处理 |
| 障碍物 | Obstacle | init(speed) 初始化、update 自动移动、被击碎时动画 |
| 爆炸特效 | Explosion | play() 帧动画/tween 播放完自动销毁 |
| UI 列表项 | XxxItem | setData() 设置显示数据 |

**组件封装原则：** 组件设计了 `play()` / `setData()` 方法，游戏脚本就必须调用这些方法，不能在外部绕过直接操作 tween/spriteFrame/opacity。

**反模式检查**：看到 `instantiate(prefab)` 后紧跟 `tween(node)...` 或 `node.setPosition(...)` 循环更新，立即停下——这些行为应该在 prefab 的组件里。

---

## 九、工作流 Skill 索引

| 做什么 | 调什么 |
|--------|--------|
| 从策划案+美术做完整游戏 | `/new-game` |
| 创建游戏实体/prefab | `/cocos-create` |
| 审查代码质量 | `/cocos-review` |
| 设计场景分层 | `/cocos-layer` |
| 3D引擎做2D避坑 | `/cocos-3d-for-2d` |
| 2.x迁移3.8 | `/cocos-migrate` |
| UI还原设计 | `/ui-design` |
| 3D引擎2D场景搭建 | `/scene-setup` |
| 游戏架构分层 | `/game-architecture` |
| 实体生命周期 | `/entity-lifecycle` |
| 组件JSON参考 | `/cocos-component` |

---

## 十、工程纪律（project_1/2 血泪教训）

### 10.1 验证优先原则

**Skill 文档中的每个技术值必须有实测来源，不能靠推理。**

| ❌ 推理做法 | ✅ 正确做法 |
|------------|-----------|
| "2D 游戏应该用 UI_2D 层" → 写 33554432 | 读 project_1 的 .scene 文件 → 发现是 1073741824 |
| "@property 应该指向节点" → 代码里写节点 __id__ | 读 project_1 的 .scene 文件 → 发现指向组件 __id__ |
| "Camera 和 Canvas 同级应该也行" → 放在 Scene 下 | 读 project_1 的 .scene 文件 → 发现 Camera 是 Canvas 子节点 |

**规则：写任何 JSON 模板前，先 `cat` 一个已验证项目的同类文件，提取真实值。**

### 10.2 生成后自检

生成 scene/prefab JSON 后，必须跑 `/scene-setup` 末尾的 10 项自检清单。不跑自检直接交付 = 未完成。

### 10.3 复用即审查

复制其他项目的脚本不是"拿来就用"，必须做架构审查（见 `/new-game` 3.0 步骤）。project_2 的音效问题就是无脑复制 project_1 导致的。

### 10.4 Skill 修改必须回流

修改了 `~/.claude/skills/` 或 `CLAUDE.md` 后，必须同步回 cocosSkill 仓库并 push。否则下个项目还会踩同样的坑。

**回流流程：**
```
1. 改 ~/.claude/skills/xxx/SKILL.md 或 ~/.claude/CLAUDE.md
2. cp 到 cocosSkill/
3. cd cocosSkill && git add . && git commit && git push
```

### 10.5 Scene JSON 编辑与编辑器同步

**绝对不要在编辑器打开场景时直接编辑 scene.scene / prefab JSON 文件。**

Cocos Creator 编辑器在内存中维护场景状态。当编辑器保存（Ctrl+S 或自动保存）时，会用内存中的状态覆盖磁盘文件。

**正确流程：**
```
MCP save_scene → 编辑 JSON → MCP open_scene 重新加载 → 不再 save_scene
```

- 尽量用 MCP API（set_node_property、attach_script 等）替代直接编辑 JSON
- @property 绑定如果 MCP API 不支持，编辑 JSON 后**必须立即 open_scene 重新加载**
- **open_scene 后不能再 save_scene**，否则编辑器内存中的 None 会覆盖绑定
- 编辑 JSON 前提醒用户不要在编辑器中按 Ctrl+S
- **__id__ 索引禁止硬编码**，必须按"节点名 + 组件类型"动态查找（见 10.6-B）

### 10.5.1 MCP update_prefab 会丢失 spriteFrame（ProjectDrop Session 2 教训）

MCP `set_component_property` 设置 spriteFrame 后，`update_prefab` 会重新序列化 prefab JSON。编辑器序列化时可能把 spriteFrame 覆盖为 null（和 @property 被覆盖是同一个原因）。

```
✗ 错误流程：MCP set_component_property(spriteFrame) → update_prefab → 以为成功（实际 JSON 里是 null）
✓ 正确流程：直接用 Python 编辑 prefab JSON 的 _spriteFrame 字段写入 __uuid__ → reimport_asset
```

**静态贴图（不会运行时变化的）必须直接写入 prefab JSON**，格式：
```json
"_spriteFrame": {
    "__uuid__": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@f9941",
    "__expectedType__": "cc.SpriteFrame"
}
```

**动态贴图（运行时根据状态变化的）用 resources.load()**，如结算页的胜利/失败图标。

### 10.5.2 全屏页面 Prefab 必须设 Widget _alignFlags=45

全屏页面（引导、结算、弹窗）的根节点 Widget `_alignFlags` 必须设为 45（上下左右四边=0）。Python 编辑 JSON 时同步设置 `_left/_right/_top/_bottom` 为 0。

**ProjectDrop 教训**：两个全屏 prefab 的 _alignFlags=0（无适配），运行时不跟随屏幕尺寸。

### 10.6 Prefab/Scene 绑定铁律（ProjectDrop 血泪教训）

**每一步操作后必须验证结果，不信任 API 返回值。**

#### A. Prefab 挂脚本：直接编辑 JSON，不用 MCP 实例化→更新回

MCP `attach_script` + `update_prefab` 流程不可靠——脚本可能挂到实例但没回写到 prefab 文件。

```
✗ 错误流程：instantiate prefab → attach_script → update_prefab → 以为成功
✓ 正确流程：直接用 Python 编辑 prefab JSON，添加脚本组件对象 + 更新根节点 _components 引用
```

编辑后必须 `reimport_asset` 让编辑器重新导入。
验证：`get_components` 检查实例化后的节点是否有脚本。

#### B. Scene @property 绑定：__id__ 必须动态查找，禁止硬编码

编辑器每次 save_scene 会重新序列化，组件 `__id__` 索引会因新增/删除组件而偏移。

```
✗ 错误：data[55]['scoreLabel'] = {'__id__': 29}  ← 硬编码，下次 save 就错
✓ 正确：find_comp_on_node(find_node_id('ScoreLabel'), 'cc.Label')  ← 按名称+类型动态查找
```

#### C. 编辑 JSON 后不能再 save_scene

编辑器内存中自定义脚本的 @property 是 None（编辑器无法解析压缩 UUID 的脚本引用）。
save_scene 会用 None 覆盖 JSON 中写入的正确绑定。

```
正确顺序：
1. MCP save_scene（让编辑器先写出最新结构）
2. Python 编辑 JSON（动态查找 __id__ 写入绑定）
3. MCP open_scene（重新加载修改后的文件）
4. 不再 save_scene！提醒用户不要 Ctrl+S
```

#### D. 每步操作后必须验证

| 操作 | 验证方式 |
|------|---------|
| attach_script | 读 prefab JSON 检查是否有自定义脚本 __type__ |
| prefab_update | 读 prefab JSON 检查根节点 _components 是否引用脚本 |
| JSON 绑定 @property | 读回 JSON 检查无 None 值 |
| open_scene 后 | get_components 确认编辑器加载了正确的绑定 |

**原则：API 说成功 ≠ 真成功。文件里有 ≠ 编辑器认。验证到能跑为止。**

#### E. 调用 infra 工具前先确认参数类型和 3D 引擎兼容性

AnimationManager.play() 接收 Node，不接收 Sprite。
调用前读一下函数签名，不要凭印象传参。

**BaseUtil.shakeScreen() 在 3D 引擎做 2D 时会导致黑屏！**
原因：硬编码 `originalPos = v3(0, 0, 0)`，但 Camera 在 z=1000。震完后 Camera 被设到 z=0 → 什么都渲染不出。
**正确做法**：不用 BaseUtil.shakeScreen，自己写安全版：先读 Camera 真实 position.z，震动只在 XY 平面，复位时保持原始 z 值。

#### F. 禁止代码拼 UI 外观

```
✗ 错误：new Node('mask') → addComponent(UITransform) → addComponent(Sprite) → 设颜色/大小
✓ 正确：编辑器/MCP 创建节点结构 → prefab 中设好外观 → 代码只控制 show/hide/动画/事件
```

CLAUDE.md 第四节已有此规则，但 ProjectDrop 中多次违反。**MCP 不可用时提醒用户开 MCP，不用 new Node() 绕过。**

#### G. 九宫格 Sprite 用 contentSize 不用 scale

九宫格（Sliced）模式的 Sprite 调整大小必须用 `UITransform.setContentSize(width, height)`，不能用 `node.setScale()`。Scale 会把九宫格的边角也拉伸变形，contentSize 才能正确保持边角不变形。

碰撞检测时读 contentSize 而非 scale：
```typescript
const ut = node.getComponent(UITransform);
const halfW = ut.contentSize.width / 2;
```

### 10.7 Sub-Agent 委托必须携带规范

委托 sub-agent 创建场景/prefab/节点时，prompt 中**必须包含本文件中对应的具体规则**，不能只给"创建这些节点"。

Sub-agent 看不到 CLAUDE.md。如果 prompt 里只写了节点名和组件列表，agent 会用默认值创建，导致 Widget _alignFlags=0、Layout 缺失、节点堆叠 (0,0)。

**实施清单：**
1. 创建场景 → prompt 包含适配策略表（3.4 节：哪些层 Widget 45，哪些不要）
2. 创建 prefab → prompt 包含节点架构原则（3.1 节：根节点=逻辑，子节点=视觉）
3. 创建全屏页面 → prompt 包含 content + Layout 规则（3.2 节）
4. 创建完成后 → 必须验证关键属性值（_alignFlags、_contentSize、position）

---

## 十一、交互规则

- 回复使用中文
- UI 设计前先读取效果图，精确还原布局参数
- 迁移/重构组件时，必须清理旧节点上的旧绑定（全链路检查）
- **上下文过长时必须主动提醒用户**：当对话轮次多、上下文积累大量代码/JSON/调试信息时，AI 必须主动提醒用户切换新窗口。提醒时机宁早不晚。切换前写好 `docs/next_session_prompt.md` 供新窗口恢复上下文。判断标准：
  - 已经进行了 5+ 轮复杂改动（涉及多文件编辑）
  - 开始感觉到需要重新读文件来回忆之前做了什么
  - 发现自己漏掉了 skill 调用或 CLAUDE.md 规则

---

## 十二、Skills 安装检查

如果当前环境没有 Cocos Creator 相关 skill（如 game-architecture、entity-lifecycle 等），说明 cocosSkill 工具链尚未安装。请先执行以下命令安装：

```bash
git clone https://github.com/linyewen/cocosSkill.git ~/cocosSkill && cd ~/cocosSkill && bash install.sh
```

安装完成后需要**重新打开 Claude Code 窗口**才能使 skill 生效。

新项目还需要额外初始化：
```bash
# 复制 commands（按需调用的检查清单）
cp ~/cocosSkill/commands/* .claude/commands/

# 复制 lib 通用代码（基础设施代码库）
mkdir -p assets/Script/infra
cp ~/cocosSkill/lib/*.ts assets/Script/infra/
```
