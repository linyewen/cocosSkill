# 创建游戏对象工作流

当需要创建任何新的游戏对象时（敌人变种、道具、特效标记、UI元素等），**必须**按以下流程执行，不能跳步。

---

## Step 0: 判断 — 需要 prefab 吗？

```
这个东西在游戏画面中看得见吗？
  → 是 → 必须 prefab（继续 Step 1）
  → 否（纯逻辑容器）→ 可以 new Node()，流程结束
```

## Step 1: 设计节点结构

**根节点 = 逻辑，子节点 = 视觉。没有例外。**

```
简单游戏对象：
XxxPrefab (UITransform [+ 脚本])
  └── icon (UITransform + Sprite)

复杂游戏对象：
XxxPrefab (UITransform + 脚本 + RigidBody + Collider)
  ├── icon (Sprite)        ← 主视觉
  ├── shadow (Sprite)      ← 可选
  └── effect (Node)        ← 特效容器
```

决策：
- 需要脚本控制？→ 根节点挂脚本
- 需要碰撞？→ 根节点挂 RigidBody + Collider
- 有多层视觉？→ 每层一个子节点（icon/shadow/effect）
- 只有一个视觉？→ 一个 icon 子节点就够

## Step 2: 在编辑器/MCP 中创建

1. **创建根节点** → layer = UI_2D (33554432)
2. **创建 icon 子节点** → 挂 Sprite → 设 spriteFrame + color + sizeMode
3. **调整根节点** scale/UITransform contentSize
4. **保存为 prefab** → 放在合适的目录

目录规则：
- 编辑器拖拽引用 → `assets/prefab/功能模块/`
- 代码动态加载 → `assets/resources/prefab/`

## Step 3: 代码中使用

```typescript
// 方式A：@property 绑定（推荐，编辑器拖拽）
@property(Prefab)
wallBrickPrefab: Prefab = null;

// 方式B：resources 动态加载
resources.load('prefab/WallBrickPrefab', Prefab, (err, prefab) => { ... });

// 创建实例
const node = instantiate(this.wallBrickPrefab);
node.layer = 33554432;  // UI_2D
parentContainer.addChild(node);
node.setPosition(x, y, 0);

// 运行时改视觉（如需要）
const icon = node.getChildByName('icon');
const sprite = icon.getComponent(Sprite);
sprite.spriteFrame = newFrame;
sprite.color = new Color(255, 0, 0);
```

## Step 4: 自检

```
□ Sprite 在 icon 子节点，不在根节点
□ layer = 33554432 (UI_2D)
□ spriteFrame 已设置（不是 null）
□ 视觉在编辑器中设好，代码只管 instantiate + 行为
□ 多次创建的对象用 instantiate，不是反复 new Node
```

---

## 常见错误 → 正确做法

| 错误 | 正确 |
|------|------|
| `new Node()` + `addComponent(Sprite)` | 编辑器建 prefab → `instantiate()` |
| `addComponent(Graphics)` + `circle()` 画圆 | Sprite + 圆形贴图/已有贴图 tint |
| Sprite 直接挂根节点 | Sprite 挂 icon 子节点 |
| 代码设 spriteFrame + color + size | 编辑器/MCP 预设好，代码只定位 |
| `createMarker(x,y,r,g,b)` 万能函数 | 每种对象一个专属 prefab |
