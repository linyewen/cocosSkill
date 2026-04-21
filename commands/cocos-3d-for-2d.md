# 3D 引擎做 2D 游戏 — 差异清单

Cocos Creator 3.x 是 3D 引擎。用它做 2D 游戏时，以下每一项都可能成为隐形坑。
新建项目或排查问题时，逐条过一遍。

## 空间关系（最致命，最易忽略）

**3D 引擎里一切都在 3D 空间中。2D 只是"Z 轴上铺平的 3D"。**

- [ ] Camera 在 z=1000 朝 -Z 看，Canvas 在 z=0 → 两者 Z 距离 ≥ 100
- [ ] Camera near=0（或 1），far≥1000 → Canvas 的 Z 在 [camZ-far, camZ-near] 范围内
- [ ] Camera 在**独立节点**（不挂 Canvas 上），layer=DEFAULT(0x40000000)
- [ ] Canvas 节点 layer=UI_2D(0x2000000)
- [ ] **黑屏 = 第一时间画视锥体**，不查参数

## 相机配置

| 属性 | 2D 游戏推荐值 | 为什么 |
|------|-------------|--------|
| projection | ORTHO(0) | 正交投影，无近大远小 |
| orthoHeight | designHeight / 2 | 可视区域高度的一半 |
| clearFlags | DEPTH_ONLY(6) | 背景由 Sprite 铺满，不需要清颜色 |
| visibility | UI_2D + DEFAULT | 0x42000000 |
| near | 0 | 避免近裁面裁掉 Canvas |
| far | ≥ 2000 | 覆盖 Camera 到 Canvas 的距离 |

## 节点层级

```
Scene
├── Camera (独立, layer=DEFAULT, z=1000)
└── Canvas (layer=UI_2D, z=0, alignCanvasWithScreen=true)
    ├── BgLayer (Widget 四边=0)
    ├── GameLayer (Widget 四边=0)
    └── UILayer (Widget 四边=0)
```

## 图片资源

- [ ] resources/ 下的图片 meta `userData.type` 必须是 `"sprite-frame"` 而非 `"texture"`
      否则没有 `@f9941` 子资源，`resources.load("xxx/spriteFrame")` 会失败
- [ ] textures/ 下同理，被 Sprite 引用的图片需要 spriteFrame 子资源

## 物理（3D 物理模拟 2D）

- [ ] RigidBody._type = 4（KINEMATIC），不是 2（STATIC）
- [ ] BoxCollider._size.z ≥ 100（2D 平面在 3D 空间中需要厚度）
- [ ] engine.json 中 physics-cannon 或 physics-ammo 必须启用

## 坐标系

- [ ] 3D 引擎原点在屏幕中心（不是左下角）
- [ ] Canvas 子节点用屏幕坐标，(0,0) = 屏幕中心
- [ ] 跨容器传位置必须经过世界坐标转换

## 排查黑屏的标准流程

1. **画视锥体** — Camera 在哪？看向哪？Canvas 在视锥体内吗？
2. **检查 Z 距离** — Camera z 和 Canvas z 差多少？差 0 = 黑屏
3. **检查 near/far** — Canvas z 在 [camZ-far, camZ-near] 内吗？
4. **检查 layer/visibility** — Camera visibility 包含 UI_2D？
5. **检查资源** — Sprite 有 spriteFrame？图片 meta 是 sprite-frame 类型？
6. **对比成功项目** — diff 能跑的项目的 scene.scene，找差异

---

## 调 infra 工具前先读函数签名（来自 CLAUDE.md 10.6.E 迁入）

**ProjectDrop 血泪**：
- `AnimationManager.play()` 接收 **Node**，不接收 Sprite。凭印象传 Sprite 会报错
- `BaseUtil.shakeScreen()` 原版在 3D 引擎 2D 场景会**黑屏**
  - 原因：硬编码 `originalPos = v3(0, 0, 0)`，但 Camera 在 z=1000。震完后 Camera 被设到 z=0 → 什么都渲染不出
  - `cocosSkill/lib/BaseUtil.ts` 已修（保留 origZ）
  - 生产级做法见 ProjectDrop `EffectManager.safeShake`（100ms 节流 + 保留 z）

**规则**：调任何 infra 工具前，先 `cat` 一下源文件看签名，不要凭印象传参。
