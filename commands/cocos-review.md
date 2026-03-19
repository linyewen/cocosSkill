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

## 生命周期
- [ ] 回调函数体是否完整实现（不能是注释掉的代码或空桩）
- [ ] 碰撞注册在 onLoad，注销在 onDestroy
- [ ] 子类覆盖生命周期是否调用了 super

## 坐标系统
- [ ] 跨层传递位置是否经过世界坐标中转（convertToWorldSpaceAR → convertToNodeSpaceAR）
- [ ] `view.getVisibleSize()` 用于边界判断时是否除以 2（屏幕原点在中心）
- [ ] 每个 Layer 是否明确了坐标系归属（屏幕适配 or 地图适配）

## 碰撞系统（3D 物理）
- [ ] 碰撞类型判断用 `getComponent(ClassName)` 不用 `getGroup()`
- [ ] RigidBody `_type=4`（KINEMATIC），不是 2（STATIC）
- [ ] BoxCollider `_size.z >= 100`（2D 游戏用 3D 物理时）
- [ ] `engine.json` 中 `physics-cannon: true` 已启用

## @property
- [ ] 新增 @property 是否同步在 scene/prefab JSON 中绑定（原子操作）
- [ ] 没有用 `getChildByName` 做 @property 的 fallback
