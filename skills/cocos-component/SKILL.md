---
name: cocos-component
description: Cocos Creator 3.8.x 组件 JSON 字典。手写或通过 MCP 创建 prefab/scene 时查字段结构、陷阱、压缩 UUID 算法。细分到 reference/ 子文件按需加载。
---

# Cocos Component JSON 参考手册

主 SKILL.md 只装核心速查；每类组件详细字段在 `reference/` 子文件里。

## 触发时机

- 手动编写 prefab JSON 文件时
- 通过 MCP 创建/修改 prefab 或 scene 时
- 遇到组件属性不生效、显示异常、碰撞不触发等问题时

## reference/ 子文件导航

| 子文件 | 装什么 |
|---|---|
| [`reference/ui-components.md`](reference/ui-components.md) | UITransform / Sprite / Label / Button / Widget / Layout / ProgressBar / BlockInputEvents 完整 JSON + 字段陷阱 |
| [`reference/physics.md`](reference/physics.md) | RigidBody2D / BoxCollider2D / CircleCollider2D + 碰撞组 |
| [`reference/scene-structure.md`](reference/scene-structure.md) | Scene 骨架 / PrefabInfo / Camera / Canvas / AudioSource / SceneGlobals |
| [`reference/scripts-and-patterns.md`](reference/scripts-and-patterns.md) | 自定义脚本组件 / 压缩 UUID 算法 / MCP 限制 / _layer 值 / @property 全变体速查 |

---

## Prefab 文件总体结构

```json
[
  { "__type__": "cc.Prefab", "data": { "__id__": 1 } },     // [0] 根对象
  { "__type__": "cc.Node", "_components": [...], "_prefab": {...} },  // [1] 根节点
  { "__type__": "cc.UITransform", ... },                     // [2] 第一个组件
  { "__type__": "cc.CompPrefabInfo", "fileId": "ut0" },      // [3] 组件的 prefab 信息
  // ... 更多组件，每个组件后跟一个 CompPrefabInfo
  { "__type__": "cc.PrefabInfo", "root": {"__id__": 1}, "asset": {"__id__": 0}, "fileId": "rootNode" },
  // ... 子节点及其组件
]
```

### `__id__` 索引规则

- JSON 数组的下标就是 `__id__`
- `_children: [{"__id__": 11}]` → 第 11 个元素是子节点
- `_components: [{"__id__": 2}]` → 第 2 个元素是组件
- `_prefab: {"__id__": 10}` → 第 10 个元素是 PrefabInfo
- `__prefab: {"__id__": 3}` → 第 3 个元素是 CompPrefabInfo

**陷阱：增删任何元素后，所有 `__id__` 必须重新计算！**

### 节点 + 组件的排列顺序

```
Node
├── UITransform         ← 必须第一个
├── CompPrefabInfo      ← UITransform 的
├── 其他组件1           ← BoxCollider2D / Sprite / Label / ...
├── CompPrefabInfo      ← 组件1 的
├── 其他组件2
├── CompPrefabInfo      ← 组件2 的
├── 自定义脚本组件
├── CompPrefabInfo      ← 脚本的
└── PrefabInfo          ← 节点的（只有根节点有，子节点也有各自的）
```

---

## CompPrefabInfo

每个组件后面**必须**跟一个：

```json
{ "__type__": "cc.CompPrefabInfo", "fileId": "ut0" }
```

### fileId 命名约定

| 前缀 | 含义 | 示例 |
|------|------|------|
| `ut` | UITransform | `ut0` |
| `col` | Collider | `col1` |
| `rb` | RigidBody | `rb2` |
| `cp` | 自定义脚本组件 | `cp3` |
| `sp` | Sprite | `sp1` |
| `lb` | Label | `lb1` |
| `btn` | Button | `btn1` |
| `wg` | Widget | `wg1` |
| `ly` | Layout | `ly1` |

数字递增，在整个 prefab 内唯一即可。

---

## @property 绑定速查（核心规则）

**⚠️ 最常踩的坑**：`@property(Component 类型)` 的值是**组件的 `__id__`**，不是节点的！

| TypeScript 声明 | JSON 格式 |
|----------------|-----------|
| `@property(Node)` | `{"__id__": N}` — N = 节点下标 |
| `@property(Button/Label/Sprite/自定义)` | `{"__id__": N}` — **N = 组件下标** |
| `@property(Prefab)` | `{"__uuid__":"...","__expectedType__":"cc.Prefab"}` |
| `@property(SpriteFrame)` | `{"__uuid__":"...@f9941","__expectedType__":"cc.SpriteFrame"}` |
| `@property([Node])` | `[{"__id__":N1},{"__id__":N2}]` |
| 数值/字符串/布尔 | 直接值 `42` / `"hello"` / `true` |

完整变体见 [`reference/scripts-and-patterns.md`](reference/scripts-and-patterns.md)。

---

## 自定义脚本组件 __type__ 压缩 UUID（铁律）

`__type__` 必须用 Cocos 专用压缩 UUID 格式，不是类名、不是完整 UUID、**不是标准 base64**。

### Python 快速算法

```python
BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

def compress_uuid(uuid_str: str) -> str:
    clean = uuid_str.replace('-', '')
    prefix = clean[:5]
    val = int(clean[5:], 16)
    result = []
    while val > 0:
        result.append(BASE64_KEYS[val % 64])
        val //= 64
    result.reverse()
    return prefix + ''.join(result)

# uuid = "c22cebec-ee74-4e88-a4f6-71edbf2e67c4"  → "c22cevs7nROiKT2ce2/LmfE"
```

详细算法解释 + 3 种获取方式见 [`reference/scripts-and-patterns.md`](reference/scripts-and-patterns.md)。

---

## _layer 规则（铁律）

所有节点（Scene / Canvas / Camera / Prefab 内）统一用 `_layer: 1073741824`（DEFAULT 层）。

> ⚠️ 不要用 `33554432`(UI_2D)，实测不正确会导致渲染层级问题。

---

## 新资源创建后的必要步骤

1. 手动创建 `.prefab` / `.png` 文件 + `.meta` 文件
2. `.meta` 中图片必须设置 `"type": "sprite-frame"`
3. **必须在编辑器中刷新资源**（右键 → 重新导入）
4. 刷新前引用该资源的 UUID 会返回 `null`
5. **不要用 `new Node()` 作为刷新前的临时方案** —— 在 JSON 中预先写好结构，刷新后自动生效

---

## 快速排查清单

| 现象 | 检查 |
|------|------|
| Sprite 不显示 | `_spriteFrame` 是否有 `@f9941` 后缀？`.meta` 是否设了 sprite-frame 类型？ |
| Sprite 全黑 | `_color` 深色 tint 会和 spriteFrame 乘算变黑？改 `(255,255,255,255)` |
| Button 点不到 | UITransform 的 `_contentSize` 是否为 0？子节点有无 UITransform 吞了事件？ |
| 碰撞不触发 | `enabledContactListener` 是否为 true？`_group` 是否配对？`sensor` 设对了吗？ |
| Label 不显示 | `_string` 是否为空？`_color` 的 alpha 是否为 0？ |
| Widget 布局错 | `_alignFlags` 位运算是否正确？`alignMode` 是否为 1？ |
| 物体往下掉 | `gravityScale` 是否为 0？ |
| 节点不出现 | `_active` 是否为 true？`_layer` 是否正确（1073741824）？ |
| `__id__` 报错 | 增删元素后是否重算了所有 `__id__`？ |
| 自定义脚本无效 | `__type__` 用的是压缩 UUID 吗？是否刷新了编辑器？ |
| @property 绑成了错的东西 | Component 类型绑的是组件 `__id__` 不是节点 `__id__`！ |
| ProgressBar 不动 | Bar Sprite `_type` 应为 0 或 1，不是 3(FILLED) |

---

## 姊妹 skill

- 写 prefab/scene 的流程纪律 → [`cocos-prefab-crud`](../cocos-prefab-crud/SKILL.md)
- Widget 加不加 / Layer 选哪个 → [`cocos-widget-decision`](../cocos-widget-decision/SKILL.md)
- 场景搭建 7 步 → [`scene-setup`](../scene-setup/SKILL.md)
