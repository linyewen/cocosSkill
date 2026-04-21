# 物理组件 JSON 字典

RigidBody2D / BoxCollider2D / CircleCollider2D + 碰撞组配置。

---

## RigidBody2D

```json
{
  "__type__": "cc.RigidBody2D",
  "node": { "__id__": 1 },
  "_enabled": true,
  "__prefab": { "__id__": 7 },
  "_type": 1,
  "_mass": 1,
  "gravityScale": 0,
  "enabledContactListener": true,
  "_group": 8,
  "_id": ""
}
```

### 常见陷阱

| 字段 | 陷阱 | 正确做法 |
|------|------|---------|
| `_type` | **不是 0/1/2！** `1`=DYNAMIC, `2`=KINEMATIC, `4`=STATIC | 游戏实体通常用 `1`(DYNAMIC) |
| `gravityScale` | 默认 `1` 会让物体下坠 | 2D 游戏必须设为 `0` |
| `enabledContactListener` | 默认 `false` | 需要碰撞回调必须设为 `true` |
| `_group` | 碰撞组，必须和 Collider 的 `_group` 一致 | 见碰撞组配置 |
| `_type: 4` (STATIC) | 静态物体不触发碰撞回调 | 需要回调用 `1`(DYNAMIC) 或 `2`(KINEMATIC) |

---

## BoxCollider2D

```json
{
  "__type__": "cc.BoxCollider2D",
  "node": { "__id__": 1 },
  "_enabled": true,
  "__prefab": { "__id__": 5 },
  "_size": {
    "__type__": "cc.Size",
    "width": 78,
    "height": 55
  },
  "_offset": {
    "__type__": "cc.Vec2",
    "x": 0,
    "y": 0
  },
  "sensor": true,
  "_group": 8,
  "_id": ""
}
```

---

## CircleCollider2D

```json
{
  "__type__": "cc.CircleCollider2D",
  "node": { "__id__": 1 },
  "_enabled": true,
  "__prefab": { "__id__": 5 },
  "_offset": { "__type__": "cc.Vec2", "x": 0, "y": 0 },
  "_radius": 10,
  "sensor": true,
  "_group": 0,
  "_id": ""
}
```

---

## Collider 常见陷阱

| 字段 | 陷阱 | 正确做法 |
|------|------|---------|
| `sensor` | `true` = 触发器（只检测，不物理碰撞） | **游戏中几乎都用 `true`** |
| `sensor` | `false` = 物理碰撞（会弹开、推动） | 除非要做物理模拟 |
| `_group` | 碰撞组编号，和 RigidBody2D 的 `_group` 必须一致 | 见下方碰撞组配置 |
| `_size` | 碰撞体大小，不自动跟随 Sprite | 手动设置匹配视觉大小 |
| `_offset` | 碰撞体偏移 | 通常 `(0, 0)` |

---

## 碰撞组配置

```
Player:  _group = 0   (或 1 << 0)
Bullet:  _group = 4   (1 << 2)
Enemy:   _group = 8   (1 << 3)
```

碰撞矩阵需要在项目设置中配置哪些组之间可以碰撞。

---

## 碰撞类型判断（代码层面）

**不依赖 `collider.group` / `getGroup()` 等 API**（容易出错）。用 `getComponent` 做精确识别：

```typescript
// ✓ 正确：组件判断，类型安全
const projectile = event.otherCollider.node.getComponent(Projectile);
if (projectile) this.takeDamage(projectile.damage);

// ✗ 错误：依赖 group API
if (event.otherCollider.getGroup() === 4) { ... }
```

> 详细见 `entity-lifecycle` skill。
