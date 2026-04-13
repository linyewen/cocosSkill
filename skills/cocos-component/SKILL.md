# Cocos Component JSON 参考手册

手写或通过 MCP 创建 prefab/scene 时的组件字典。包含每种组件的正确 JSON 结构和常见陷阱。

## 触发时机

- 手动编写 prefab JSON 文件时
- 通过 MCP 创建/修改 prefab 或 scene 时
- 遇到组件属性不生效、显示异常、碰撞不触发等问题时

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

### __id__ 索引规则

- JSON 数组的下标就是 `__id__`
- `_children: [{"__id__": 11}]` → 第 11 个元素是子节点
- `_components: [{"__id__": 2}]` → 第 2 个元素是组件
- `_prefab: {"__id__": 10}` → 第 10 个元素是 PrefabInfo
- `__prefab: {"__id__": 3}` → 第 3 个元素是 CompPrefabInfo

**陷阱：增删任何元素后，所有 __id__ 必须重新计算！**

### 节点+组件的排列顺序

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

## CompPrefabInfo

每个组件后面**必须**跟一个：

```json
{
  "__type__": "cc.CompPrefabInfo",
  "fileId": "ut0"
}
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

## UITransform

**每个节点必须有，必须是 _components 数组的第一个。**

```json
{
  "__type__": "cc.UITransform",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
  "node": { "__id__": 1 },
  "_enabled": true,
  "__prefab": { "__id__": 3 },
  "_contentSize": {
    "__type__": "cc.Size",
    "width": 100,
    "height": 100
  },
  "_anchorPoint": {
    "__type__": "cc.Vec2",
    "x": 0.5,
    "y": 0.5
  },
  "_id": ""
}
```

### 常见陷阱

- `_contentSize` 设为 `(0, 0)` → 点击区域为零，Button 点不到
- `_anchorPoint` 影响定位基准：`(0.5, 0.5)` = 中心，`(0, 0)` = 左下角
- 忘记加 UITransform → 节点没有尺寸概念，Layout 无法计算

## Sprite

```json
{
  "__type__": "cc.Sprite",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
  "node": { "__id__": 11 },
  "_enabled": true,
  "__prefab": { "__id__": 13 },
  "_customMaterial": null,
  "_srcBlendFactor": 2,
  "_dstBlendFactor": 4,
  "_color": {
    "__type__": "cc.Color",
    "r": 255, "g": 255, "b": 255, "a": 255
  },
  "_spriteFrame": {
    "__uuid__": "cb1af3a9-924d-4ed6-b9b9-8daaf11be8fa@f9941",
    "__expectedType__": "cc.SpriteFrame"
  },
  "_type": 0,
  "_fillType": 0,
  "_sizeMode": 0,
  "_fillCenter": { "__type__": "cc.Vec2", "x": 0, "y": 0 },
  "_fillStart": 0,
  "_fillRange": 0,
  "_isTrimmedMode": true,
  "_useGrayscale": false,
  "_atlas": null,
  "_id": ""
}
```

### 常见陷阱

| 字段 | 陷阱 | 正确做法 |
|------|------|---------|
| `_spriteFrame` | UUID 格式必须是 `{uuid}@{subAssetId}` | 不是裸 UUID，`@f9941` 是 spriteFrame 子资源后缀 |
| `_spriteFrame` | 新建图片的 `.meta` 必须设 `type: sprite-frame` | 否则当作 texture 加载，Sprite 拿不到 |
| `_spriteFrame` | 设为 `null` 不会报错但不显示 | 用于代码运行时动态设置的情况 |
| `_sizeMode` | `0` = CUSTOM（手动设尺寸），`1` = TRIMMED（跟图走），`2` = RAW | 默认用 `0`，配合 UITransform 的 contentSize |
| `_type` | `0` = SIMPLE, `1` = SLICED, `2` = TILED, `3` = FILLED | 九宫格拉伸用 `1`，进度条用 `3` |
| `__expectedType__` | 必须是 `"cc.SpriteFrame"` | 不是 `"cc.Texture2D"` |

### SpriteFrame UUID 获取方式

```
图片文件: textures/enemy/enemy01.png
图片 UUID: cb1af3a9-924d-4ed6-b9b9-8daaf11be8fa  (在 .meta 文件中)
SpriteFrame UUID: cb1af3a9-924d-4ed6-b9b9-8daaf11be8fa@f9941  (加 @f9941 后缀)
```

`@f9941` 是 Cocos 3.x 中 SpriteFrame 子资源的固定后缀标识。

## Label

```json
{
  "__type__": "cc.Label",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
  "node": { "__id__": 20 },
  "_enabled": true,
  "__prefab": null,
  "_customMaterial": null,
  "_srcBlendFactor": 2,
  "_dstBlendFactor": 4,
  "_color": {
    "__type__": "cc.Color",
    "r": 255, "g": 255, "b": 255, "a": 255
  },
  "_string": "Hello",
  "_horizontalAlign": 1,
  "_verticalAlign": 1,
  "_actualFontSize": 24,
  "_fontSize": 24,
  "_fontFamily": "Arial",
  "_lineHeight": 24,
  "_overflow": 0,
  "_enableWrapText": true,
  "_font": null,
  "_isSystemFontUsed": true,
  "_spacingX": 0,
  "_isItalic": false,
  "_isBold": false,
  "_isUnderline": false,
  "_underlineHeight": 2,
  "_cacheMode": 0,
  "_enableOutline": false,
  "_outlineColor": { "__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 255 },
  "_outlineWidth": 2,
  "_enableShadow": false,
  "_shadowColor": { "__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 255 },
  "_shadowOffset": { "__type__": "cc.Vec2", "x": 2, "y": 2 },
  "_shadowBlur": 2,
  "_id": ""
}
```

### 常见陷阱

| 字段 | 陷阱 | 正确做法 |
|------|------|---------|
| `_actualFontSize` | 必须和 `_fontSize` 一致 | 不一致会导致显示异常 |
| `_lineHeight` | 通常等于 `_fontSize` | 设为 0 会导致文字重叠 |
| `_overflow` | `0`=NONE, `1`=CLAMP, `2`=SHRINK, `3`=RESIZE_HEIGHT | 固定区域文字用 `2`(自动缩小) |
| `_horizontalAlign` | `0`=LEFT, `1`=CENTER, `2`=RIGHT | — |
| `_verticalAlign` | `0`=TOP, `1`=CENTER, `2`=BOTTOM | — |
| `_cacheMode` | `0`=NONE, `1`=BITMAP, `2`=CHAR | 频繁变化的数字用 `2` |
| `_string` | 空字符串 `""` 是合法的 | 代码中用 `label.string = ""` 清空 |
| `_enableOutline` | 描边效果，需配合 `_outlineColor` 和 `_outlineWidth` | 字体太小时描边会糊 |

## Button + ClickEvent

```json
{
  "__type__": "cc.Button",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
  "node": { "__id__": 15 },
  "_enabled": true,
  "__prefab": null,
  "clickEvents": [
    { "__id__": 25 }
  ],
  "_interactable": true,
  "_transition": 2,
  "_normalColor": { "__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255 },
  "_hoverColor":  { "__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255 },
  "_pressedColor": { "__type__": "cc.Color", "r": 211, "g": 211, "b": 211, "a": 255 },
  "_disabledColor": { "__type__": "cc.Color", "r": 124, "g": 124, "b": 124, "a": 255 },
  "_normalSprite": null,
  "_hoverSprite": null,
  "_pressedSprite": null,
  "_disabledSprite": null,
  "_duration": 0.1,
  "_zoomScale": 1.2,
  "_target": null,
  "_id": ""
}
```

### ClickEvent 对象

```json
{
  "__type__": "cc.ClickEvent",
  "target": { "__id__": 1 },
  "component": "CardPrefab",
  "_componentId": "b7d29e/gzJPKrClOb8VTmTq",
  "handler": "onStartClick",
  "customEventData": ""
}
```

### 常见陷阱

| 字段 | 陷阱 | 正确做法 |
|------|------|---------|
| `_transition` | `0`=NONE, `1`=COLOR, `2`=SCALE, `3`=SPRITE | 手游常用 `2`(缩放反馈) |
| `_zoomScale` | 只在 `_transition=2` 时生效 | 通常 `1.1`~`1.2` |
| `clickEvents` | 数组中每个元素是 `__id__` 引用，不是内联对象 | ClickEvent 是独立的数组元素 |
| `_componentId` | **必须是压缩 UUID** | 用 `node tools/cc-uuid.js --uuid <uuid>` 获取 |
| `component` | 类名字符串，不是文件名 | `"CardPrefab"` 不是 `"CardPrefab.ts"` |
| `handler` | 方法名字符串 | 该方法必须在 component 类中声明为 public |
| `target` | 挂载 component 的节点的 `__id__` | 不是按钮节点自身（除非脚本也挂在按钮上） |
| UITransform | 按钮节点的 contentSize 决定点击区域 | contentSize 为 0 则点不到 |

### 脚本压缩 UUID 算法（实测逆向验证，6 组数据 100% 匹配）

Prefab/Scene JSON 中自定义脚本的 `__type__` 字段使用 Cocos 专有的压缩 UUID 格式，**不是标准 base64**。

#### 算法步骤

```
输入: 完整 UUID（从 .ts.meta 的 "uuid" 字段获取）
      如 c22cebec-ee74-4e88-a4f6-71edbf2e67c4

1. 去掉短横线 → 32位十六进制: c22cebecee744e88a4f671edbf2e67c4
2. 前5位保持不变 → c22ce
3. 后27位当作大整数 → int("becee744e88a4f671edbf2e67c4", 16)
4. 大整数转 base64（字符表: A-Za-z0-9+/，大端序高位在前）→ vs7nROiKT2ce2/LmfE
5. 拼接 → c22cevs7nROiKT2ce2/LmfE（23字符）
```

#### Python 工具函数

```python
BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

def compress_uuid(uuid_str: str) -> str:
    """Cocos Creator 脚本压缩 UUID（用于 prefab/scene JSON 的 __type__ 字段）"""
    clean = uuid_str.replace('-', '')
    prefix = clean[:5]
    val = int(clean[5:], 16)
    result = []
    while val > 0:
        result.append(BASE64_KEYS[val % 64])
        val //= 64
    result.reverse()
    return prefix + ''.join(result)

# 用法：读 .ts.meta 的 uuid，算出 prefab 中应填的 __type__
# uuid = "c22cebec-ee74-4e88-a4f6-71edbf2e67c4"  → "c22cevs7nROiKT2ce2/LmfE"
```

#### 获取压缩 UUID 的方式（按优先级）

| 方式 | 适用场景 | 操作 |
|------|---------|------|
| 1. 从已有 prefab 读取 | 脚本已挂载到某个 prefab | 读 prefab JSON 找 `__type__` 非 `cc.` 的条目 |
| 2. 用上面的算法计算 | 已知 .ts.meta 中的 UUID | `compress_uuid(meta_uuid)` |
| 3. 从 library 读取 | 编辑器已编译 | 读 `.assets-data.json` 的 `dependScripts` |

> ⚠️ **铁律**: 绝不用标准 `base64.b64encode()`，必须用上面的大整数 base64 算法。标准 base64 得到的结果完全不同，会导致 "Script missing" 错误。

## Widget

```json
{
  "__type__": "cc.Widget",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
  "node": { "__id__": 1 },
  "_enabled": true,
  "__prefab": { "__id__": 5 },
  "alignMode": 1,
  "_target": null,
  "_alignFlags": 45,
  "_left": 0,
  "_right": 0,
  "_top": 0,
  "_bottom": 0,
  "_verticalCenter": 0,
  "_horizontalCenter": 0,
  "_isAbsLeft": true,
  "_isAbsRight": true,
  "_isAbsTop": true,
  "_isAbsBottom": true,
  "_isAbsHorizontalCenter": true,
  "_isAbsVerticalCenter": true,
  "_originalWidth": 0,
  "_originalHeight": 0,
  "_id": ""
}
```

### _alignFlags 位运算

```
TOP    = 1   (0b00000001)
MID_V  = 2   (0b00000010)  垂直居中
BOT    = 4   (0b00000100)
LEFT   = 8   (0b00001000)
MID_H  = 16  (0b00010000)  水平居中
RIGHT  = 32  (0b00100000)
```

| 布局需求 | _alignFlags | 计算 |
|---------|-------------|------|
| 全屏拉伸 | `45` | TOP(1) + BOT(4) + LEFT(8) + RIGHT(32) = 45 |
| 顶部居中 | `17` | TOP(1) + MID_H(16) = 17 |
| 底部左对齐 | `12` | BOT(4) + LEFT(8) = 12 |
| 正中央 | `18` | MID_V(2) + MID_H(16) = 18 |
| 左右拉伸+顶部 | `41` | TOP(1) + LEFT(8) + RIGHT(32) = 41 |

### 常见陷阱

- `alignMode`: `0` = ONCE（只在初始化时对齐一次），`1` = ON_WINDOW_RESIZE（窗口变化时重新对齐），`2` = ALWAYS
- `_isAbs*`: `true` 表示距离是像素绝对值，`false` 表示是百分比（0-1）
- `_target`: `null` 表示相对父节点对齐，否则相对指定节点

## RigidBody2D

```json
{
  "__type__": "cc.RigidBody2D",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
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

## BoxCollider2D / CircleCollider2D

### BoxCollider2D

```json
{
  "__type__": "cc.BoxCollider2D",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
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

### CircleCollider2D

```json
{
  "__type__": "cc.CircleCollider2D",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
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

### 常见陷阱

| 字段 | 陷阱 | 正确做法 |
|------|------|---------|
| `sensor` | `true` = 触发器（只检测，不物理碰撞） | 游戏中几乎都用 `true` |
| `sensor` | `false` = 物理碰撞（会弹开、推动） | 除非要做物理模拟 |
| `_group` | 碰撞组编号，和 RigidBody2D 的 `_group` 必须一致 | 见碰撞组配置 |
| `_size` | 碰撞体大小，不自动跟随 Sprite | 手动设置匹配视觉大小 |
| `_offset` | 碰撞体偏移 | 通常 `(0, 0)` |

### 碰撞组配置

```
Player:  _group = 0   (或 1 << 0)
Bullet:  _group = 4   (1 << 2)
Enemy:   _group = 8   (1 << 3)
```

碰撞矩阵需要在项目设置中配置哪些组之间可以碰撞。

## Layout

```json
{
  "__type__": "cc.Layout",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
  "node": { "__id__": 20 },
  "_enabled": true,
  "__prefab": { "__id__": 22 },
  "_layoutSize": { "__type__": "cc.Size", "width": 547, "height": 340 },
  "_resize": 1,
  "_N$layoutType": 1,
  "_N$cellSize": { "__type__": "cc.Size", "width": 40, "height": 40 },
  "_N$startAxis": 0,
  "_N$paddingLeft": 0,
  "_N$paddingRight": 0,
  "_N$paddingTop": 0,
  "_N$paddingBottom": 0,
  "_N$spacingX": 20,
  "_N$spacingY": 0,
  "_N$verticalDirection": 1,
  "_N$horizontalDirection": 0,
  "_N$affectedByScale": true,
  "_id": ""
}
```

### 常见陷阱

| 字段 | 值 | 含义 |
|------|-----|------|
| `_N$layoutType` | `0` | HORIZONTAL（水平排列） |
| `_N$layoutType` | `1` | VERTICAL（垂直排列） |
| `_N$layoutType` | `2` | GRID（网格排列） |
| `_resize` | `0` | NONE（不调整容器大小） |
| `_resize` | `1` | CONTAINER（容器适应内容） |
| `_resize` | `2` | CHILDREN（内容适应容器） |

- `_N$spacingX` / `_N$spacingY`: 子元素间距
- Layout 节点的 UITransform contentSize 被 Layout 管理，手动设置会被覆盖
- 动态添加/删除子节点后需要调用 `layout.updateLayout()` 刷新

## PrefabInfo

根节点的 PrefabInfo（在所有组件之后）：

```json
{
  "__type__": "cc.PrefabInfo",
  "root": { "__id__": 1 },
  "asset": { "__id__": 0 },
  "fileId": "rootNode"
}
```

子节点的 PrefabInfo：

```json
{
  "__type__": "cc.PrefabInfo",
  "root": { "__id__": 1 },
  "asset": { "__id__": 0 },
  "fileId": "iconNode"
}
```

- `root` 始终指向根节点（`__id__: 1`）
- `asset` 始终指向 Prefab 对象（`__id__: 0`）
- `fileId` 在整个 prefab 内唯一

## 自定义脚本组件

```json
{
  "__type__": "d96f8WGQb5Ha4h2DeoRzYcq",
  "_name": "",
  "_objFlags": 0,
  "node": { "__id__": 1 },
  "_enabled": true,
  "__editorExtras__": {},
  "__prefab": { "__id__": 9 },
  "shadow": { "__id__": 14 },
  "icon": { "__id__": 19 },
  "shotNode": { "__id__": 37 },
  "_id": ""
}
```

### 常见陷阱

| 字段 | 陷阱 | 正确做法 |
|------|------|---------|
| `__type__` | 压缩 UUID 或完整 UUID，不是类名 | MCP attach_script 获取压缩格式，或从 .meta 读完整 UUID |
| `@property(Node)` | 值是 `{"__id__": N}` | N 是目标**节点**在数组中的下标 |
| `@property(Component)` | 值是 `{"__id__": N}` | **N 是目标组件在数组中的下标（不是节点！）** |
| `@property(Prefab)` | 值是 `{"__uuid__": "...", "__expectedType__": "cc.Prefab"}` | UUID 指向另一个 prefab 资源 |
| `@property(SpriteFrame)` | 值是 `{"__uuid__": "...@f9941", "__expectedType__": "cc.SpriteFrame"}` | 注意 @f9941 后缀 |
| 数组类型的 @property | 值是 `[{"__id__": N1}, {"__id__": N2}]` | Node 数组指节点，Component 数组指组件 |

## Prefab vs Scene 的区别

| 特征 | Prefab | Scene |
|------|--------|-------|
| 根对象 `__type__` | `cc.Prefab` | `cc.SceneAsset` |
| 根节点 `__type__` | `cc.Node` | `cc.Scene` |
| `_prefab` 字段 | 有值（指向 PrefabInfo） | `null` |
| `__prefab` 字段 | 组件上有（CompPrefabInfo） | 组件上没有 |
| 节点的 `_layer` | `1073741824`（实测） | `1073741824` |
| 额外字段 | — | `_globals`、`autoReleaseAssets` |

## 新资源创建后的必要步骤

1. 手动创建 `.prefab` / `.png` 文件 + `.meta` 文件
2. `.meta` 中图片必须设置 `"type": "sprite-frame"`
3. **必须在编辑器中刷新资源**（右键 → 重新导入）
4. 刷新前引用该资源的 UUID 会返回 `null`
5. **不要用 `new Node()` 作为刷新前的临时方案** —— 在 JSON 中预先写好结构，刷新后自动生效

## 实战踩坑补充（2026-04 project_1 项目）

### 自定义脚本 __type__ 的三种格式

| 格式 | 示例 | 是否正确 |
|------|------|---------|
| 类名 | `"Block"` | ❌ 报 Missing class: Block |
| 完整 UUID | `"911d1e2b-20ab-4210-9891-2fcabf83bc65"` | ❌ 报 Missing class: 911d1e2b-... |
| **压缩 UUID** | `"911d14rIKtCEJiRL8q/g7xl"` | ✅ 唯一正确格式 |

### 获取压缩 UUID 的方法

**方法 1：MCP attach_script 的返回值**
```
attach_script 返回: "Available components: cc.UITransform, 911d14rIKtCEJiRL8q/g7xl"
                                                          ^^^^^^^^^^^^^^^^^^^^^^^^
                                                          这就是压缩 UUID
```

**方法 2：Python 计算**
```python
import base64, uuid

def compress_uuid(full_uuid: str) -> str:
    """将完整 UUID 转为 Cocos 压缩格式"""
    hex_str = full_uuid.replace('-', '')
    raw = bytes.fromhex(hex_str)
    b64 = base64.b64encode(raw).decode('ascii')
    # 去掉末尾的 ==，替换 + 为 -（不需要，Cocos 保留 + 和 /）
    return b64.rstrip('=')

# 示例
print(compress_uuid("911d1e2b-20ab-4210-9891-2fcabf83bc65"))
# 输出: kR0eKyCrQhCYkS/Kv4O8ZQ
```

**方法 3：从 temp/programming/ 编译产物中读取**

### MCP 工具已知限制

| MCP 操作 | 问题 | 解决方案 |
|---------|------|---------|
| `create_prefab` | 不保存之前 `set_component_property` 的修改 | 直接用 Python 编辑 prefab JSON |
| `attach_script` | 返回 "not found" 但实际已挂载 | 看返回的 Available components 确认 |
| `set_component_property` 数组类型 | 无 `spriteFrameArray` propertyType | 直接编辑场景/prefab JSON 文件 |
| `find_asset_by_name` | 不返回 spriteFrame 子资源 | 用 `imageUuid@f9941` 格式拼接 |

### 图片 .meta 批量转换

新导入的图片默认 `type: texture`，没有 SpriteFrame 子资源。需要：

1. 修改 `.meta` 文件：`userData.type` 从 `"texture"` 改为 `"sprite-frame"`
2. 删除 `userData.redirect` 字段
3. 添加 `f9941` 子资源到 `subMetas`
4. 在编辑器中刷新资源（refresh + reimport）

Python 批量脚本参见 scene-setup skill。

### _layer 值规则（project_1 实测验证，修正旧版错误）

| 节点类型 | _layer 值 | 说明 |
|---------|-----------|------|
| Scene 中 Canvas 及所有 UI 子节点 | `1073741824` | DEFAULT 层 |
| Scene 中 Camera 节点 | `1073741824` | 同上 |
| Prefab 中所有节点 | `1073741824` | 同上 |

> ⚠️ 旧版写的 `33554432`(UI_2D) 经 project_1 和 project_2 实测均不正确。统一用 `1073741824`。

## Scene 完整骨架模板

```json
[
  { "__type__": "cc.SceneAsset", "_name": "GameScene", "scene": { "__id__": 1 } },
  {
    "__type__": "cc.Scene", "_name": "GameScene",
    "_parent": null,
    "_children": [{ "__id__": 2 }],
    "_active": true, "_components": [],
    "_prefab": null,
    "_lpos": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
    "_lrot": { "__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1 },
    "_lscale": { "__type__": "cc.Vec3", "x": 1, "y": 1, "z": 1 },
    "_mobility": 0, "_layer": 1073741824,
    "_euler": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
    "autoReleaseAssets": false,
    "_globals": { "__id__": N },
    "_id": "场景UUID"
  },
  // [2] Canvas 节点（Camera 必须是 Canvas 的子节点！）...
  // [3] Camera 节点（Canvas 的第一个子节点）...
  // [4] cc.Camera 组件 ...
  // ... 游戏节点（都是 Canvas 的子节点）...
  // [N] cc.SceneGlobals + 8个子对象（见下方）
  // ⚠️ Scene 只有一个子节点 Canvas，Camera 在 Canvas 内部
]
```

### cc.SceneGlobals 标准模板（直接复制，不需要改）

```json
{ "__type__": "cc.SceneGlobals",
  "ambient": {"__id__": "N+1"}, "shadows": {"__id__": "N+2"},
  "_skybox": {"__id__": "N+3"}, "fog": {"__id__": "N+4"},
  "octree": {"__id__": "N+5"}, "skin": {"__id__": "N+6"},
  "lightProbeInfo": {"__id__": "N+7"}, "postSettings": {"__id__": "N+8"},
  "bakedWithStationaryMainLight": false, "bakedWithHighpLightmap": false
},
{ "__type__": "cc.AmbientInfo",
  "_skyColorHDR": {"__type__":"cc.Vec4","x":0,"y":0,"z":0,"w":0.520833125},
  "_skyColor": {"__type__":"cc.Vec4","x":0,"y":0,"z":0,"w":0.520833125},
  "_skyIllumHDR": 20000, "_skyIllum": 20000,
  "_groundAlbedoHDR": {"__type__":"cc.Vec4","x":0,"y":0,"z":0,"w":0},
  "_groundAlbedo": {"__type__":"cc.Vec4","x":0,"y":0,"z":0,"w":0},
  "_skyColorLDR": {"__type__":"cc.Vec4","x":0.2,"y":0.5,"z":0.8,"w":1},
  "_skyIllumLDR": 20000,
  "_groundAlbedoLDR": {"__type__":"cc.Vec4","x":0.2,"y":0.2,"z":0.2,"w":1}
},
{ "__type__": "cc.ShadowsInfo", "_enabled": false, "_type": 0 },
{ "__type__": "cc.SkyboxInfo", "_enabled": false, "_envmapHDR": null, "_envmapLDR": null, "_rotationAngle": 0 },
{ "__type__": "cc.FogInfo", "_enabled": false, "_fogDensity": 0.3, "_fogStart": 0.5, "_fogEnd": 300 },
{ "__type__": "cc.OctreeInfo", "_enabled": false, "_minPos": {"__type__":"cc.Vec3","x":-1024,"y":-1024,"z":-1024}, "_maxPos": {"__type__":"cc.Vec3","x":1024,"y":1024,"z":1024}, "_depth": 8 },
{ "__type__": "cc.SkinInfo", "_enabled": false },
{ "__type__": "cc.LightProbeInfo", "_giScale": 1, "_giSamples": 1024, "_bounces": 2 },
{ "__type__": "cc.PostSettingsInfo", "_toneMappingType": 0 }
```

## cc.Camera 完整模板

```json
{
  "__type__": "cc.Camera",
  "_name": "", "_objFlags": 0, "__editorExtras__": {},
  "node": { "__id__": 3 },
  "_enabled": true, "__prefab": null,
  "_projection": 0,
  "_priority": 0,
  "_fov": 45,
  "_fovAxis": 0,
  "_orthoHeight": 580,
  "_near": 0,
  "_far": 2000,
  "_color": { "__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 255 },
  "_depth": 1,
  "_stencil": 0,
  "_clearFlags": 7,
  "_rect": { "__type__": "cc.Rect", "x": 0, "y": 0, "width": 1, "height": 1 },
  "_aperture": 19,
  "_shutter": 7,
  "_iso": 0,
  "_screenScale": 1,
  "_visibility": 1108344832,
  "_targetTexture": null,
  "_postProcess": null,
  "_usePostProcess": false,
  "_cameraType": -1,
  "_trackingType": 0,
  "_id": ""
}
```

### Camera 关键字段说明

| 字段 | 值 | 说明 |
|------|-----|------|
| `_projection` | `0` | **0=ORTHO（正交）**，1=PERSPECTIVE（透视）。2D 游戏必须用 0 |
| `_orthoHeight` | designH/2 | 设计高度的一半。600×1160 → 580 |
| `_near` | `0` | 近裁剪面 |
| `_far` | `2000` | 远裁剪面，必须 > Camera 的 z 值 |
| `_clearFlags` | `7` | 7=全清除(COLOR+DEPTH+STENCIL)，6=不清颜色，14=不清模板 |
| `_visibility` | `1108344832` | 层渲染掩码，一般不改 |
| Camera 节点 z | `1000` | 必须 > 0 才能看到 2D 内容 |

## cc.Canvas 组件

```json
{
  "__type__": "cc.Canvas",
  "_name": "", "_objFlags": 0, "__editorExtras__": {},
  "node": { "__id__": 2 },
  "_enabled": true, "__prefab": null,
  "_cameraComponent": { "__id__": 4 },
  "_alignCanvasWithScreen": true,
  "_id": ""
}
```

**关键：`_cameraComponent` 必须指向 cc.Camera 组件的 `__id__`，否则黑屏。**

## cc.ProgressBar 完整结构

ProgressBar 需要父节点 + Bar 子节点配合：

```
ProgressBar (UITransform + Sprite背景 + cc.ProgressBar)
└── Bar (UITransform + Sprite填充)
```

### 父节点的 ProgressBar 组件

```json
{
  "__type__": "cc.ProgressBar",
  "_name": "", "_objFlags": 0, "__editorExtras__": {},
  "node": { "__id__": N },
  "_enabled": true, "__prefab": null,
  "_barSprite": { "__id__": BAR_SPRITE_ID },
  "_mode": 0,
  "_totalLength": 300,
  "_progress": 1,
  "_reverse": false,
  "_id": ""
}
```

### Bar 子节点关键设置

| 属性 | 值 | 原因 |
|------|-----|------|
| UITransform.anchorPoint | `(0, 0.5)` | **必须左对齐**，进度从左往右增长 |
| position.x | `-totalLength/2` | 和父节点左边缘对齐 |
| Sprite._type | `1` (SLICED) | 九宫格拉伸不变形 |
| Sprite._sizeMode | `0` (CUSTOM) | ProgressBar 控制宽度 |

### 常见陷阱

| 问题 | 原因 | 修复 |
|------|------|------|
| 进度条不动 | Bar Sprite._type=3(FILLED) | 改为 0(SIMPLE) 或 1(SLICED) |
| 进度条方向反 | _reverse 或 anchor 设错 | anchor.x=0, _reverse=false |
| 进度条超出背景 | _totalLength ≠ 父节点宽度 | 保持一致 |

## cc.AudioSource

```json
{
  "__type__": "cc.AudioSource",
  "_name": "", "_objFlags": 0, "__editorExtras__": {},
  "node": { "__id__": N },
  "_enabled": true, "__prefab": null,
  "_clip": null,
  "_loop": false,
  "_playOnAwake": false,
  "_volume": 1,
  "_id": ""
}
```

AudioClip 引用格式：
```json
"_clip": {
  "__uuid__": "87e5f91a-4420-40fb-818d-3fe2581e2b7b",
  "__expectedType__": "cc.AudioClip"
}
```

## cc.BlockInputEvents

最简组件，用于模态弹窗阻断底层输入：

```json
{
  "__type__": "cc.BlockInputEvents",
  "_name": "", "_objFlags": 0, "__editorExtras__": {},
  "node": { "__id__": N },
  "_enabled": true, "__prefab": null,
  "_id": ""
}
```

## @property 绑定全变体速查

| TypeScript 声明 | JSON 格式 | 说明 |
|----------------|-----------|------|
| `@property(Node)` | `{"__id__": N}` | N = 目标**节点**在数组中的下标 |
| `@property(Label)` | `{"__id__": N}` | **N 是 cc.Label 组件的下标**（不是节点！） |
| `@property(Sprite)` | `{"__id__": N}` | **N 是 cc.Sprite 组件的下标** |
| `@property(ProgressBar)` | `{"__id__": N}` | **N 是 cc.ProgressBar 组件的下标** |
| `@property(自定义脚本)` | `{"__id__": N}` | **N 是脚本组件的下标**（如 GridManager） |
| `@property(Prefab)` | `{"__uuid__":"...","__expectedType__":"cc.Prefab"}` | 外部资源用 UUID |
| `@property(SpriteFrame)` | `{"__uuid__":"...@f9941","__expectedType__":"cc.SpriteFrame"}` | 注意 @f9941 |
| `@property(AudioClip)` | `{"__uuid__":"...","__expectedType__":"cc.AudioClip"}` | 无子资源后缀 |
| `@property(cc.TTFFont)` | `{"__uuid__":"...","__expectedType__":"cc.TTFFont"}` | 自定义字体 |
| `@property([Node])` | `[{"__id__":N1},{"__id__":N2}]` | 数组，每个 N 是节点下标 |
| `@property([SpriteFrame])` | `[{"__uuid__":"..@f9941",...},...]` | 数组 |
| `@property(number)` | `42` 或 `3.14` | 直接值 |
| `@property(string)` | `"hello"` | 直接值 |
| `@property(boolean)` | `true` / `false` | 直接值 |

**⚠️ 关键规则（project_1 实测验证）：**
- **`@property(Component类型)` 的值是该组件的 __id__，不是节点的 __id__！**
- **`@property(Node)` 的值才是节点的 __id__**
- 示例：`@property(Label) timerLabel` → `{"__id__": 30}` 其中 `[30]` 是 `cc.Label` 组件
- 示例：`@property(Node) fxLayer` → `{"__id__": 38}` 其中 `[38]` 是 `cc.Node` 节点

## 实战使用模式（从三个真实项目统计）

### Label 实战模式

| 特征 | 最常用值 | 说明 |
|------|---------|------|
| _lineHeight | = _fontSize | 1:1 比例，不要设为 0 |
| _enableOutline | true, width=3-4 | 描边常用，阴影几乎不用 |
| _overflow | 0 (NONE) | 固定区域用 2(SHRINK) |
| _cacheMode | 0 (NONE) | 频繁更新数字可用 2(CHAR) |
| _horizontalAlign | 1 (CENTER) | 数字/分数居中，文本左对齐(0) |
| _verticalAlign | 1 (CENTER) | 几乎100%都是居中 |
| 自定义字体 | `_isSystemFontUsed: false` | 配合 `_font: {"__uuid__":"...","__expectedType__":"cc.TTFFont"}` |

### Layout 实战模式

| 特征 | 最常用值 | 说明 |
|------|---------|------|
| _layoutType | 1 (VERTICAL) | 其次 2(GRID)，很少用 0(HORIZONTAL) |
| _resizeMode | 1 (CONTAINER) | 容器适应内容大小 |
| _spacingX/_spacingY | 0-20px | 常见间距 |
| _constraint | 0 (NONE) | GRID 用 2(FIXED_COL)+_constraintNum=列数 |
| _paddingLeft/Right/Top/Bottom | 0 | 紧凑布局为主 |

### Widget 实战模式

| _alignFlags | 含义 | 使用频率 |
|-------------|------|---------|
| `45` | 全屏拉伸 | ★★★★★ 最常用 |
| `17` | 左上角锚定 | ★★★ |
| `0` | 无对齐 | ★★ |
| 其他 | 特殊定位 | ★ |

全部使用绝对像素（_isAbs=true），无人用百分比模式。

### Sprite 实战模式

| _type | 名称 | 使用场景 |
|-------|------|---------|
| 0 | SIMPLE | 普通图片（99%的情况） |
| 1 | SLICED | 按钮背景、面板背景（九宫格拉伸） |
| 3 | FILLED | 仅用于进度条 |
| 2 | TILED | 几乎不用 |

_sizeMode=0 (CUSTOM) 最安全，配合 UITransform 手动设尺寸。

## 快速排查清单

| 现象 | 检查 |
|------|------|
| Sprite 不显示 | `_spriteFrame` 是否有 `@f9941` 后缀？`.meta` 是否设了 sprite-frame 类型？ |
| Button 点不到 | UITransform 的 `_contentSize` 是否为 0？ |
| 碰撞不触发 | `enabledContactListener` 是否为 true？`_group` 是否配对？`sensor` 设对了吗？ |
| Label 不显示 | `_string` 是否为空？`_color` 的 alpha 是否为 0？ |
| Widget 布局错 | `_alignFlags` 位运算是否正确？`alignMode` 是否为 1？ |
| 物体往下掉 | `gravityScale` 是否为 0？ |
| 节点不出现 | `_active` 是否为 true？`_layer` 是否正确（1073741824）？ |
| __id__ 报错 | 增删元素后是否重算了所有 __id__？ |
| 自定义脚本无效 | `__type__` 用的是压缩 UUID 吗？是否刷新了编辑器？ |
