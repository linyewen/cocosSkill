# Cocos Creator 代码审查

审查当前改动的代码，逐条检查以下规则。只报告违反的条目，不用报告通过的。

## 类型安全
- [ ] `getComponent` 是否都用类引用而非字符串（`getComponent(Bullet)` 不是 `getComponent('Bullet')`）
- [ ] 是否有不必要的 `as any` 类型断言
- [ ] `import` 是否只引入实际使用的符号

## 节点架构
- [ ] 根节点是否只承载逻辑（脚本、碰撞体），视觉元素在子节点
- [ ] 视觉子节点是否挂了对应渲染组件（icon→Sprite, label→Label）
- [ ] `new Node()` 是否是最后手段（优先 prefab/instantiate）

## Prefab 优先（红线）
- [ ] **所有"看得见"的游戏对象**是否都通过 `instantiate(prefab)` 创建，而非 `new Node()` + `addComponent()`
- [ ] 动态生成的可见节点（墙砖/弹幕/残骸/追踪弹/火焰/黑洞/护盾等）是否都有对应的 Prefab
- [ ] Prefab 是否在编辑器/MCP 中设好了视觉（Sprite+贴图+颜色），而不是在代码中用 Graphics 画
- [ ] 代码是否只负责 instantiate + setPosition + 行为逻辑，不负责"长什么样"
- [ ] 有没有 `addComponent(Graphics)` + `circle/rect/fill` 来创建游戏视觉？→ 应改为 Prefab

## 生命周期
- [ ] 回调函数体是否完整实现（不能是注释掉的代码或空桩）
- [ ] 碰撞注册在 onLoad，注销在 onDestroy
- [ ] 子类覆盖生命周期是否调用了 super

## 坐标系统
- [ ] 跨层传递位置是否经过世界坐标中转（convertToWorldSpaceAR → convertToNodeSpaceAR）
- [ ] `view.getVisibleSize()` 用于边界判断时是否除以 2（屏幕原点在中心）
- [ ] 每个 Layer 是否明确了坐标系归属（屏幕适配 or 地图适配）

## 相机与渲染（3D 引擎基础 — 最优先检查）
- [ ] Camera 和 Canvas 的 Z 坐标是否有距离（标准：Camera z=1000, Canvas z=0）
- [ ] Camera near/far 范围是否覆盖 Canvas 所在 Z 平面（near=0 或 1，far≥1000）
- [ ] Camera 节点在独立 Node 上、layer=DEFAULT(0x40000000)，不挂在 Canvas 上
- [ ] Camera visibility 包含 UI_2D(0x2000000)
- [ ] clearFlags 选择合理：纯2D用 DEPTH_ONLY(6)，不需要 SKYBOX
- [ ] **黑屏排查第一步**：画出相机视锥体，确认 Canvas/UI 在视锥体内
- [ ] **修改场景前**：先 diff 已有成功项目的相机配置，不凭假设改

## UI 布局
- [ ] icon 的 sizeMode 是否为 TRIMMED（保持原始像素，不改 scale）
- [ ] label fontSize 是否从相邻 icon 高度推导（≈ icon 高度 × 0.7~0.8）
- [ ] 边角/边缘 UI 是否用 Widget 锚定（不写死坐标）
- [ ] 定位后子节点是否溢出屏幕边界
- [ ] 相邻元素包围盒是否重叠
- [ ] 背景图的几何结构是否作为布局参考

## 碰撞系统（3D 物理）
- [ ] 碰撞类型判断用 `getComponent(ClassName)` 不用 `getGroup()`
- [ ] RigidBody `_type=4`（KINEMATIC），不是 2（STATIC）
- [ ] BoxCollider `_size.z >= 100`（2D 游戏用 3D 物理时）
- [ ] `engine.json` 中 `physics-cannon: true` 已启用

## @property
- [ ] 新增 @property 是否同步在 scene/prefab JSON 中绑定（原子操作）
- [ ] 没有用 `getChildByName` 做 @property 的 fallback

## 修改影响检查（每次改动后必查）
- [ ] **谁引用了被修改的节点？** — grep 该节点的 `__id__`/name，检查所有 scene/prefab/script 中的绑定是否还正确
- [ ] **被修改节点引用了谁？** — 该节点的 @property/__id__ 绑定是否还指向正确目标
- [ ] **运行时依赖链完整吗？** — getChildByName/children[] 等隐式依赖是否仍然成立
- [ ] **从触发到效果走一遍** — 模拟调用链，确认修改后每一步都通