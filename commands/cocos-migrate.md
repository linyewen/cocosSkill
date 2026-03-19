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

## 迁移完整性检查

- [ ] 没有 `// Phase X` 或 `// TODO` 空桩
- [ ] 没有 `getComponent('string')` 字符串调用
- [ ] 没有重复的 `import {} from 'cc'`
- [ ] 没有 `collider.apply()` 残留
- [ ] 没有 `node.group === 'string'` 字符串比较
- [ ] 所有 @property 已在 JSON 中绑定
