# Cocos 2.x → 3.8 迁移检查

迁移代码时，逐条检查以下陷阱。这些都是实际踩过的坑。

## API 替换

| 2.x | 3.8 |
|-----|-----|
| `cc.resources.load` | `resources.load` from 'cc' |
| `cc.audioEngine` | `AudioSource` 组件 |
| `cc.BoxCollider` | 3D: `BoxCollider` + `RigidBody` |
| `onCollisionEnter` | 3D: `collider.on('onTriggerEnter', cb)` |
| `node.opacity` | `UIOpacity.opacity` |
| `node.width/height` | `UITransform.width/height` |
| `node.zIndex` | `setSiblingIndex()` |
| `node.group = 'xxx'` | `node.group = 'xxx'`（字符串，但碰撞矩阵用数值索引） |
| `convertToWorldSpaceAR` | `UITransform.convertToWorldSpaceAR` |
| `collider.apply()` | 3D 不需要，删除 |

## 3D 物理致命陷阱

1. **RigidBody._type 枚举值不同！**
   - 2D: KINEMATIC=1(?) DYNAMIC=2
   - 3D: DYNAMIC=1, STATIC=2, **KINEMATIC=4**
   - 直接搬 `_type:2` 到 3D = STATIC，两个 STATIC 永远不碰撞

2. **engine.json 物理引擎必须启用**
   - `"physics-cannon": true` 或 `"physics-ammo": true`
   - 全部 false = 无物理引擎 = 碰撞永不触发

3. **Collider API 在 3.8 中不可用**
   - `getGroup()`, `.group`, `.mask` → 全部 undefined
   - 用 `getComponent(ClassName)` 做类型判断，不依赖 group API

4. **BoxCollider Z 轴厚度**
   - 2D 游戏用 3D 物理时 `_size.z` 不能太小，建议 100

## 场景结构迁移（最易出错，必须先做）

场景迁移不是"创建同名节点"，而是**递归还原完整子树**。

### 强制执行流程

1. **导出原版节点树**：逐层列出原版 .fire 场景的完整节点树（含所有子节点、孙节点）
2. **逐节点对照创建**：每个节点必须检查——
   - [ ] 名称一致
   - [ ] 父子关系一致（谁是谁的子节点）
   - [ ] 子节点数量一致（不能少）
   - [ ] contentSize 一致（注意特殊尺寸节点）
   - [ ] Widget 配置一致（有/无、alignFlags、边距值）
   - [ ] 位置一致（特殊定位的节点如 goldLayer Y=-528）
   - [ ] active 状态一致
   - [ ] 渲染顺序（siblingIndex）一致
3. **递归验证**：创建完后，从 Canvas 开始递归对比，**每个有子节点的节点都要展开检查**
4. **数据节点不能跳过**：控制点坐标、路径数据等"看起来不重要"的子节点往往是系统正常运行的关键

### 常见遗漏模式

- ❌ 只创建了第一层子节点，深层子树全部丢失（PathMgr 路径控制点）
- ❌ 节点名称创建了但内部是空的（path 节点没有 p1/c1/c2/p2）
- ❌ 容器节点的子节点被提升到上级（UiLayer 被展平）
- ❌ 特殊尺寸/位置被泛化为默认值（goldLayer 800×106 → 750×1334）
- ❌ Widget 有无被忽略（9个层该有 Widget 的都没加）

## 代码迁移完整性检查

- [ ] 没有 `// Phase X` 或 `// TODO` 空桩
- [ ] 没有 `getComponent('string')` 字符串调用
- [ ] 没有重复的 `import {} from 'cc'`
- [ ] 没有 `collider.apply()` 残留
- [ ] 没有 `node.group === 'string'` 字符串比较
- [ ] 所有 @property 已在 JSON 中绑定
