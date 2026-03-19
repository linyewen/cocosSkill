# 游戏分层设计

分析或创建游戏的节点层级结构。每一层必须明确坐标系归属。

## 核心原则

**每层只有两种可能：适配屏幕大小 或 适配地图大小。没有"不适配"。**

## 屏幕适配层（UITransform = 屏幕大小）

这些层的子节点使用屏幕坐标定位。层本身锚定在 Canvas 上，不随地图移动。

| 层 | 职责 | 子节点定位方式 |
|----|------|-------------|
| BgLayer | 背景铺满屏幕 | 瓦片铺满可视区域 |
| planeLayer | 玩家飞机 | 屏幕坐标（玩家在屏幕下方） |
| enemyLayer | 普通敌机 | 屏幕坐标（从屏幕外飞入） |
| bulletLayer | 所有子弹 | 屏幕坐标（射击点→方向移动） |
| effectLayer | 爆炸/伤害数字 | 屏幕坐标（转换自其他层的世界坐标） |
| goldLayer | 金币掉落 | 屏幕坐标 |
| itemLayer | 可拾取道具 | 屏幕坐标 |
| UI层 | 血条/按钮/弹窗 | Widget 锚定屏幕边缘/居中 |

## 地图适配层（UITransform = 地图大小）

这些层的子节点使用地图坐标定位，层本身随地图滚动。

| 层 | 职责 | 子节点定位方式 |
|----|------|-------------|
| Node_Map | 地图容器 | 地图坐标（随背景滚动） |
| moveLayer | 固定炮台/障碍 | 地图坐标（随背景滚动） |

## 跨层坐标转换

不同坐标系的层之间传递位置时：
```typescript
// 源层 → 世界坐标 → 目标层
const worldPos = sourceNode.getComponent(UITransform).convertToWorldSpaceAR(v3(0,0,0));
const localPos = targetLayer.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
```

**禁止直接使用 `node.position`（本地坐标）传给另一个层。**

## 渲染顺序（从下到上）

背景 < 地图物体 < 敌人 < 子弹 < 金币 < 玩家 < 特效 < UI

Canvas 的子节点顺序决定渲染层级，越靠后越在上面。
