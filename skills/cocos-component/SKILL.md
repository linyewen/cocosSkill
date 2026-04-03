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

### 压缩 UUID 获取

```bash
# 方法1：工具脚本
node tools/cc-uuid.js --uuid xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 方法2：从编译产物中读取
# temp/programming/... 编译后的 .js 文件中包含压缩后的类 ID
```

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
| `__type__` | 压缩 UUID，不是类名 | `node tools/cc-uuid.js --uuid <uuid>` 获取 |
| `@property(Node)` 引用 | 值是 `{"__id__": N}` 指向同 prefab 内的节点 | N 是目标节点在数组中的下标 |
| `@property(Prefab)` 引用 | 值是 `{"__uuid__": "...", "__expectedType__": "cc.Prefab"}` | UUID 指向另一个 prefab 资源 |
| `@property(SpriteFrame)` | 值是 `{"__uuid__": "...@f9941", "__expectedType__": "cc.SpriteFrame"}` | 注意 @f9941 后缀 |
| 数组类型的 @property | 值是 `[{"__id__": N1}, {"__id__": N2}]` | 每个元素独立引用 |

## Prefab vs Scene 的区别

| 特征 | Prefab | Scene |
|------|--------|-------|
| 根对象 `__type__` | `cc.Prefab` | `cc.SceneAsset` |
| 根节点 `__type__` | `cc.Node` | `cc.Scene` |
| `_prefab` 字段 | 有值（指向 PrefabInfo） | `null` |
| `__prefab` 字段 | 组件上有（CompPrefabInfo） | 组件上没有 |
| 节点的 `_layer` | `33554432`（UI_2D） | `1073741824` |
| 额外字段 | — | `_globals`、`autoReleaseAssets` |

## 新资源创建后的必要步骤

1. 手动创建 `.prefab` / `.png` 文件 + `.meta` 文件
2. `.meta` 中图片必须设置 `"type": "sprite-frame"`
3. **必须在编辑器中刷新资源**（右键 → 重新导入）
4. 刷新前引用该资源的 UUID 会返回 `null`
5. **不要用 `new Node()` 作为刷新前的临时方案** —— 在 JSON 中预先写好结构，刷新后自动生效

## 快速排查清单

| 现象 | 检查 |
|------|------|
| Sprite 不显示 | `_spriteFrame` 是否有 `@f9941` 后缀？`.meta` 是否设了 sprite-frame 类型？ |
| Button 点不到 | UITransform 的 `_contentSize` 是否为 0？ |
| 碰撞不触发 | `enabledContactListener` 是否为 true？`_group` 是否配对？`sensor` 设对了吗？ |
| Label 不显示 | `_string` 是否为空？`_color` 的 alpha 是否为 0？ |
| Widget 布局错 | `_alignFlags` 位运算是否正确？`alignMode` 是否为 1？ |
| 物体往下掉 | `gravityScale` 是否为 0？ |
| 节点不出现 | `_active` 是否为 true？`_layer` 是否正确（33554432 = UI_2D）？ |
| __id__ 报错 | 增删元素后是否重算了所有 __id__？ |
| 自定义脚本无效 | `__type__` 用的是压缩 UUID 吗？是否刷新了编辑器？ |
