---
name: prefab-analyze
description: 创建 prefab 之前，从代码推导出完整的节点结构、组件依赖和绑定关系。适用于 Cocos Creator、Laya、Unity 等挂靠式引擎。
user-invocable: true
allowed-tools: Read, Grep, Glob, Agent, Bash
argument-hint: "[脚本路径或类名]"
---

# Prefab 蓝图推导

在创建任何 prefab 之前，必须先从代码推导出完整蓝图。`@property` 是挂靠式引擎的绑定指令，代码声明的就是 prefab 必须提供的。

## 执行步骤

### 第一步：收集显式依赖（@property）

读取目标脚本 `$ARGUMENTS`，列出所有 `@property` 声明：

```
| 属性名 | 类型 | 是否数组 | 绑定目标 |
|--------|------|---------|---------|
```

规则：
- `@property(Node)` → prefab 中必须有对应节点
- `@property(Sprite)` → 节点上必须挂 Sprite 组件
- `@property(Prefab)` → 必须绑定预制体 UUID
- `@property([T])` 数组类型 + 代码中有遍历（forEach/for/map）→ **数组一定非空**，必须绑定元素

### 第二步：收集隐式依赖（getComponent / getChildByName）

搜索脚本中所有隐式依赖：

```typescript
// 模式1: getComponent → 该节点必须挂对应组件
this.icon.getComponent(Sprite)        → icon 节点必须有 Sprite
this.node.getComponent(BoxCollider2D) → 根节点必须有 BoxCollider2D
this.node.getComponent(UITransform)   → 根节点必须有 UITransform

// 模式2: getChildByName → 必须有对应名称的子节点
this.node.getChildByName('shotNode')  → 必须有名为 shotNode 的子节点

// 模式3: children 索引访问 → 必须有足够多的子节点
this.node.children[0]                 → 至少有 1 个子节点
```

**关键判断**：
- 结果**直接调用方法**（不判空）→ 设计上保证存在，**必须预挂**
- 结果有 `if` 判空 → 可选组件，按场景决定

### 第三步：追溯继承链

如果脚本继承了基类（如 `extends BaseUnit`），递归分析基类的 @property 和 getComponent：

```
子类依赖 = 子类自身依赖 + 基类依赖 + 基类的基类依赖...
```

基类中注册的碰撞回调 → 根节点必须有 Collider2D + RigidBody2D

### 第四步：输出 Prefab 蓝图

汇总后输出完整的节点树：

```
PrefabName (UITransform + 脚本 + [碰撞组件])
├── shadow (UITransform + Sprite)          ← @property(Sprite) shadow
├── icon (UITransform + Sprite)            ← @property(Node) icon + getComponent(Sprite)
├── shotNode (UITransform)                 ← @property(Node) shotNode
└── effect (UITransform)                   ← getChildByName('effect')

@property 绑定清单:
- shadow → __id__: shadow 节点的 Sprite 组件索引
- icon → __id__: icon 节点索引
- shotNode → __id__: shotNode 节点索引
- bulletPrefab → __uuid__: 待绑定预制体 UUID

隐式组件清单:
- 根节点: RigidBody2D(Kinematic) + BoxCollider2D(sensor) ← 基类碰撞注册
- icon: Sprite ← loadIcon() 中 getComponent(Sprite)
```

### 第五步：交叉验证

- 每个 `@property` 都有对应的绑定目标？
- 每个 `getComponent` 不判空的组件都已预挂？
- 数组类型 @property 如有遍历，元素数量是否确定？
- 继承链中基类的依赖是否全部覆盖？
- 碰撞组件规则：Enemy/Player/Bullet 必须有，UI/Effect 不需要

确认无遗漏后，再开始构建 prefab JSON。
