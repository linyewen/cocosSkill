# 创建游戏实体

## 思考：这个实体是什么？

先用一句话描述逻辑和视觉，再动手：

```
[名称]（游戏实体）
  ├── 逻辑：它是什么？有什么行为？
  └── 视觉：它看起来像什么？
```

说不清"它是什么" → 可能不需要独立实体，复用已有 prefab。
"看不见" → 纯逻辑容器，不需要 prefab。

## 设计：关注点分离

逻辑和视觉是两个独立关注点，映射到节点：

```
XxxPrefab（逻辑身份：脚本、碰撞体）
  └── icon（视觉表现：Sprite、动画）
```

改外观不影响行为，做动画不影响碰撞，换皮不改脚本。

## 创建：编辑器管外观

1. 编辑器/MCP 创建节点 → layer = UI_2D
2. 添加 icon 子节点 → Sprite + 贴图 + 颜色
3. 保存为 prefab（静态引用放 prefab/，动态加载放 resources/prefab/）

## 使用：代码管行为

```typescript
const entity = instantiate(prefab);  // 创建
container.addChild(entity);           // 放入世界
entity.setPosition(x, y, 0);         // 定位
// 改外观通过 icon 子节点
entity.getChildByName('icon').getComponent(Sprite).color = color;
```

## 检查

```
□ 能说清逻辑和视觉分别是什么
□ 逻辑和视觉在不同节点
□ 外观在编辑器设好，不是代码画的
□ 用 instantiate(prefab)，不是 new Node()
```
