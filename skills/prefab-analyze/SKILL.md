---
name: prefab-analyze
description: 创建 prefab 之前，从代码推导出完整的节点结构、组件依赖和绑定关系。适用于 Cocos Creator、Laya、Unity 等挂靠式引擎。
user-invocable: true
allowed-tools: Read, Grep, Glob, Agent, Bash
argument-hint: "[脚本路径或类名]"
---

# Prefab 蓝图推导

在创建任何 prefab 之前，必须先从代码推导出完整蓝图。`@property` 是挂靠式引擎的绑定指令，代码声明的就是 prefab 必须提供的。

## 触发时机

- 要新建一个 Prefab（自己写、MCP 创建、Python 生成 JSON 都适用）
- 要修改既有 Prefab 的结构前，需要对比代码和 JSON 的差异
- 审查他人 prefab 发现绑定错误，要定位是 JSON 错还是代码错
- 代码重构后（`@property` 增删），要更新 prefab
- `new-game` skill 的 Phase 2/3 进入实现阶段前必跑一次

## 核心理念

代码是**真相之源**。`@property` 声明的是**契约**——这个脚本运行，prefab 必须提供这些东西。顺序不能反过来：先拍脑袋画 prefab 再写脚本 → 绑定错位、漏挂组件，调一整天。

---

## 执行步骤

### 第一步：收集显式依赖（@property）

读取目标脚本 `$ARGUMENTS`，列出所有 `@property` 声明：

```
| 属性名        | 类型          | 是否数组 | 绑定目标          | 代码中怎么用       |
|--------------|---------------|---------|-------------------|-------------------|
| shadow       | Sprite        | 否      | Sprite 组件        | shadow.color = ... |
| icon         | Node          | 否      | 节点              | icon.active = true |
| bulletPrefab | Prefab        | 否      | 外部 Prefab 资源   | instantiate(...)   |
| slots        | [Node]        | 是      | 5 个节点          | forEach 遍历       |
| iconFrames   | [SpriteFrame] | 是      | 资源数组          | iconFrames[id]     |
```

规则：

- `@property(Node)` → prefab 中必须有对应节点；JSON 里值是**节点** `__id__`
- `@property(Sprite/Label/Button/自定义脚本)` → 对应节点必须挂该组件；JSON 里值是**组件** `__id__`（最常踩的坑）
- `@property(Prefab)` → 必须绑定预制体 UUID（另一个 prefab 资源）
- `@property(SpriteFrame)` → `@f9941` 后缀的图片子资源
- `@property([T])` 数组类型 + 代码中有遍历（forEach/for/map/数组下标访问）→ **数组一定非空**，必须绑定元素
- `@property({ type: ... })` 高级声明，按泛型参数处理

### 第二步：收集隐式依赖（getComponent / getChildByName）

搜索脚本中所有隐式依赖：

```typescript
// 模式1: getComponent → 该节点必须挂对应组件
this.icon.getComponent(Sprite)        → icon 节点必须有 Sprite
this.node.getComponent(BoxCollider2D) → 根节点必须有 BoxCollider2D
this.node.getComponent(UITransform)   → 根节点必须有 UITransform（几乎永远有）

// 模式2: getChildByName → 必须有对应名称的子节点
this.node.getChildByName('shotNode')  → 必须有名为 shotNode 的子节点
this.node.getChildByName('label')     → 必须有名为 label 的子节点

// 模式3: children 索引访问 → 必须有足够多的子节点
this.node.children[0]                 → 至少有 1 个子节点
this.node.children.length             → 动态长度，可能运行时添加

// 模式4: addComponent → 运行时加的组件，prefab 中不需要预挂
this.node.addComponent(UIOpacity)     → 不在 prefab 中体现

// 模式5: find() / find 配合路径 → 跨节点查找
find('Canvas/ItemBar/slot0', this.node) → 要存在这个路径
```

**关键判断**：

- 结果**直接调用方法/属性**（不判空）→ 设计上保证存在，**必须预挂**
- 结果有 `if (x)` 判空 → 可选组件，按场景决定
- `?.` 可选链也算判空，不是强依赖

### 第三步：追溯继承链

如果脚本继承了基类（如 `extends BaseUnit`、`extends BaseUI`），递归分析基类的 @property 和 getComponent：

```
子类依赖 = 子类自身依赖 + 基类依赖 + 基类的基类依赖 + ...
```

常见基类隐式依赖：

- `BaseUnit` 基类注册碰撞回调 → 根节点必须有 Collider2D + RigidBody2D
- `BaseUI` 基类 getComponent(Widget) → 根节点必须有 Widget
- `BaseButton` 基类 getComponent(Button) → 根节点必须有 Button
- `onLoad` 内的 EventBus 订阅 → 不影响 prefab 结构

也要扫 mixin / decorator 定义的隐式依赖。

### 第四步：识别动态创建部分

有些节点是**运行时**通过 `instantiate(prefab)` 创建并 addChild 的，**不应**在本 prefab 里预挂：

```typescript
// ❌ 错误：bulletPrefab 是 @property(Prefab)，代码里 instantiate 它
// prefab 里不需要预建 bullet 节点
this.bulletPool.create(this.bulletPrefab)

// ✅ 正确识别：本 prefab 只需要挂 bulletPrefab 引用（UUID），节点不预建
```

典型动态创建模式：

- `instantiate(xxxPrefab)` + `addChild` → 不预建
- `new Node(...)` + `addComponent` → 不预建（但要确认不是红线，见 `cocos-ui-skill`）
- 对象池获取 → 不预建
- `this.createXxx()` 之类的工厂方法 → 不预建

### 第五步：输出 Prefab 蓝图

汇总后输出完整的节点树：

```
PrefabName (UITransform + 脚本 + [碰撞组件])
├── shadow (UITransform + Sprite)          ← @property(Sprite) shadow
├── icon (UITransform + Sprite)            ← @property(Node) icon + getComponent(Sprite)
├── shotNode (UITransform)                 ← @property(Node) shotNode
└── effect (UITransform)                   ← getChildByName('effect')

@property 绑定清单（prefab JSON 里要填的 __id__ / __uuid__）:
- shadow → __id__: shadow 节点的 Sprite 组件索引（不是节点！）
- icon → __id__: icon 节点索引
- shotNode → __id__: shotNode 节点索引
- bulletPrefab → __uuid__: 待绑定预制体 UUID
- iconFrames → [__uuid__...]: 7 张图的 SpriteFrame UUID（@f9941 后缀）

隐式组件清单（要在对应节点的 _components 里预挂）:
- 根节点: RigidBody2D(Kinematic) + BoxCollider2D(sensor) ← 基类碰撞注册
- icon: Sprite ← loadIcon() 中 getComponent(Sprite)
- 根节点: UITransform + 自定义脚本（__type__ 压缩UUID）

预期尺寸/位置:
- 根节点 UITransform: content_size = ? (从代码或设计稿推断)
- 碰撞体 size: 与视觉尺寸对齐

待确认:
- icon 用哪张 SpriteFrame？(资源清单对不上的时候标记)
- shotNode 的 _lpos 偏移是多少？(代码里看 shotNode.setPosition 或默认 0,0)
```

### 第六步：交叉验证（Checklist）

| 检查点 | 通过条件 |
|-------|---------|
| 每个 `@property` 都有绑定目标？ | 是 |
| 每个 `getComponent` 不判空的组件都已预挂？ | 是 |
| 数组类型 @property 如有遍历，元素数量确定？ | 是 |
| 继承链中基类的依赖全部覆盖？ | 是 |
| 碰撞组件规则：Enemy/Player/Bullet 必须有，UI/Effect 不需要 | 是 |
| 动态创建部分**没有**被误加进 prefab？ | 是 |
| `@property(Component)` 的 `__id__` 指向**组件**不是节点？ | 是 |
| SpriteFrame UUID 带了 `@f9941` 后缀？ | 是 |
| Prefab UUID 没带子资源后缀？ | 是 |

确认无遗漏后，再开始构建 prefab JSON / 走 MCP 流程。

---

## 实战案例：Block.ts 的蓝图推导

假设 `Block.ts` 代码片段如下：

```typescript
@ccclass('Block')
export class Block extends BaseUnit {
    @property(Sprite) shadow: Sprite = null;
    @property(Node) icon: Node = null;
    @property(Label) hpLabel: Label = null;
    @property([SpriteFrame]) typeFrames: SpriteFrame[] = [];

    setType(type: SlimeType) {
        this.icon.getComponent(Sprite).spriteFrame = this.typeFrames[type];
        const fx = this.node.getChildByName('fx');
        fx.active = false;
    }
}
// BaseUnit 中: this.node.getComponent(BoxCollider2D).on('begin-contact', ...)
```

推导出的蓝图：

```
Block (UITransform + BoxCollider2D(sensor) + RigidBody2D(kinematic) + Block脚本)
├── shadow (UITransform + Sprite)           ← @property(Sprite)
├── icon (UITransform + Sprite)             ← @property(Node) + getComponent(Sprite)
├── hpLabel 节点 (UITransform + Label)      ← @property(Label)
└── fx (UITransform)                        ← getChildByName('fx')

绑定:
- shadow: 指向 shadow 节点的 Sprite 组件 __id__
- icon: 指向 icon 节点 __id__（因为类型是 Node）
- hpLabel: 指向 Label 组件 __id__（因为类型是 Label，不是 Node！）
- typeFrames: 7 个 SpriteFrame UUID 的数组
```

最容易错的点：`@property(Label) hpLabel` 绑的是 Label **组件** `__id__`，不是节点。详见 `cocos-component` skill。

---

## 反模式

❌ **先画 prefab 再写脚本**：改到后面发现 @property 和节点对不上
❌ **把 @property(Component) 绑成节点 `__id__`**：运行时 null 引用
❌ **漏挂基类需要的碰撞组件**：碰撞回调永远触发不了
❌ **跳过 getChildByName 的验证**：子节点名字拼错一个字母 → 运行时 null
❌ **误把 instantiate 的目标预挂进 prefab**：prefab 里有死节点，永远不被使用
❌ **直接复制别的 prefab 改字段**：字段对不上、__id__ 错乱，调一天还不如重新推

---

## 与其他 skill 的关系

| skill | 关系 |
|-------|------|
| `cocos-component` | 查 `@property` 具体 JSON 格式、组件字段表 |
| `cocos-prefab-crud` | 推导完蓝图后，按这里的流程去写/改 prefab |
| `new-game` | Phase 2/3 必跑本 skill 为每个核心 prefab 出蓝图 |
| `entity-lifecycle` | 看基类 onLoad/onDestroy 里还有什么隐式依赖 |

---

## 快速排查

| 现象 | 可能原因 |
|------|---------|
| 运行时 `this.xxx.yyy is null` | @property 没绑，或者绑成了错的 `__id__` |
| 绑了但取到 null | Component 类型绑的是节点 `__id__` 而非组件 `__id__` |
| 碰撞不触发 | 漏挂 Collider2D/RigidBody2D，或 `enabledContactListener = false` |
| `getChildByName` 返回 null | 子节点名字拼错或层级错 |
| `typeFrames[id]` 取到 undefined | 数组没填满；或填了但 UUID 带错了子资源后缀 |
| 继承类缺组件 | 第三步漏扫基类 |
