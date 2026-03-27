# 创建游戏对象工作流

当需要创建任何新的游戏对象时，先用面向对象思维分析，再动手。

---

## Step 0: 分析 — 这个游戏实体是什么？

用一句话描述它的**逻辑**和**视觉**：

```
[名称]（游戏实体）
  ├── 逻辑：它是什么？有什么行为？
  └── 视觉：它看起来像什么？
```

例：
```
WallBrick（墙砖）
  ├── 逻辑：可破坏的障碍物，被打爆后概率掉落道具
  └── 视觉：灰蓝色的敌机图缩小版

TrackBullet（追踪分裂弹）
  ├── 逻辑：自动追踪最近敌人，命中后分裂
  └── 视觉：橙色小子弹
```

如果说不清"它是什么" → 可能不需要独立实体，考虑复用已有 prefab。
如果"看不见" → 纯逻辑容器，可以 new Node()，不需要 prefab。

## Step 1: 设计 — 逻辑和视觉怎么分离？

**逻辑在根节点，视觉在子节点。** 这是面向对象的单一职责原则在引擎中的体现。

```
XxxPrefab（根节点 = 这个实体的逻辑身份）
  ├── UITransform（空间属性）
  ├── [可选] 脚本组件（行为）
  └── [可选] 碰撞体（物理交互）

  └── icon（子节点 = 这个实体的视觉表现）
      ├── UITransform
      └── Sprite（贴图 + 颜色 + 大小）
```

为什么这样：
- 改外观 → 只改 icon，逻辑不受影响
- 做动画 → 只动 icon（闪白/缩放/旋转），碰撞体不变
- 换皮 → 换 icon 的 spriteFrame，脚本不用改
- 多层视觉 → 加更多子节点（shadow/effect），互不干扰

## Step 2: 创建 — 在编辑器/MCP 中完成外观

**编辑器负责"看起来像什么"，代码负责"怎么动"。**

1. 创建根节点 → layer = UI_2D (33554432)
2. 创建 icon 子节点 → 挂 Sprite → 选贴图 → 调颜色/大小
3. 保存为 prefab

目录：
- 编辑器拖拽引用 → `assets/prefab/模块/`
- 代码动态加载 → `assets/resources/prefab/`

## Step 3: 使用 — 代码只管实例化和行为

```typescript
// 创建实体
const brick = instantiate(this.wallBrickPrefab);
container.addChild(brick);
brick.setPosition(x, y, 0);

// 需要改外观时，通过 icon 子节点
const icon = brick.getChildByName('icon');
icon.getComponent(Sprite).color = new Color(255, 0, 0);
```

## 自检

```
□ 我能用一句话说清它的逻辑和视觉吗？
□ 逻辑和视觉是分开的吗？（改外观不影响行为）
□ 外观是在编辑器设好的，还是代码拼的？
□ 用的是 instantiate(prefab)，还是 new Node()？
```

---

## 错误 vs 正确

| 思维方式 | 做法 | 问题 |
|---------|------|------|
| Web思维 | `new Node()` + `addComponent(Graphics)` + 画圆 | 不是游戏实体，是画图代码 |
| 背步骤 | "Sprite 放子节点" | 换个场景就忘了 |
| **面向对象** | "这个实体的逻辑是X，视觉是Y，所以分开" | **理解了就不会忘** |
