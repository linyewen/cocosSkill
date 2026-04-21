# UI 组件 JSON 字典

UITransform / Sprite / Label / Button / Widget / Layout / ProgressBar / BlockInputEvents 的完整 JSON 结构 + 字段陷阱。

---

## UITransform

**每个节点必须有，必须是 `_components` 数组的第一个。**

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

---

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
| `_sizeMode` | `0` = CUSTOM（跟 UITransform.contentSize），`1` = TRIMMED（跟贴图），`2` = RAW | **默认 TRIMMED(1)**，详见 sizeMode 决策表 |
| `_type` | `0` = SIMPLE, `1` = SLICED, `2` = TILED, `3` = FILLED | 九宫格拉伸用 `1`，进度条用 `3` |
| `__expectedType__` | 必须是 `"cc.SpriteFrame"` | 不是 `"cc.Texture2D"` |
| `_color` 乘算 | color 和 spriteFrame 是乘算关系，深色 tint 会压黑贴图 | 想保原色用 `(255, 255, 255, 255)` 不 tint |

### type + sizeMode 组合决策（最常错的点）

两个字段必须**联动判断**，分开想就会错。

**两步决策**：

**Step 1 — 看图要不要拉伸变形，定 `_type`**

| 需求 | `_type` | 典型场景 |
|------|---------|---------|
| 不拉伸，按图本身显示 | `0` SIMPLE | 图标、角色、方块、icon |
| 按九宫格拉伸（边角不变，中间拉伸） | `1` SLICED | 按钮底、面板/弹窗背景、进度条底 |
| 平铺重复 | `2` TILED | 背景纹理（少用） |
| 按百分比填充 | `3` FILLED | 进度条前景 |

**Step 2 — 看节点尺寸要不要固定，定 `_sizeMode`**

| 需求 | `_sizeMode` | 节点尺寸由谁决定 |
|------|-------------|-----------------|
| 跟着图走，不管 UITransform | `1` TRIMMED | 贴图裁切后的原始尺寸 |
| 强制指定尺寸（要拉大/缩小/统一对齐） | `0` CUSTOM | `UITransform._contentSize` |
| 用贴图未裁切的完整尺寸 | `2` RAW | 极少用 |

**联动铁律**：

- `SLICED` / `FILLED` ⇒ **必须** `CUSTOM`（不指定尺寸 = 没法拉伸 = 九宫格白加）
- `SIMPLE` + 原图显示 ⇒ `TRIMMED`（最常见，默认）
- `SIMPLE` + 强制尺寸（比如 64×64 icon 框） ⇒ `CUSTOM`
- `TRIMMED` + `SLICED` 是**坏组合**，有人用九宫格却让它保持原图小尺寸，等于白配置

**组合速查**：

| 场景 | `_type` | `_sizeMode` | `UITransform._contentSize` |
|------|---------|-------------|---------------------------|
| 普通图标 / 方块 icon / 角色 | `0` SIMPLE | `1` TRIMMED | 自动 = 贴图尺寸 |
| 按钮底图（小图拉成按钮大小） | `1` SLICED | `0` CUSTOM | 手填（如 200×80） |
| 面板/弹窗背景（九宫格大面积拉伸）| `1` SLICED | `0` CUSTOM | 手填（如 600×800） |
| 进度条底图（九宫格） | `1` SLICED | `0` CUSTOM | 手填（如 300×20） |
| 进度条前景（按百分比填充）| `3` FILLED | `0` CUSTOM | 手填（同底图）|
| 强制 icon 框统一尺寸（把小图拉大）| `0` SIMPLE | `0` CUSTOM | 手填（如 64×64） |
| 全屏半透明 mask | `0` SIMPLE | `0` CUSTOM | Widget 撑满 |

**怎么一眼判断**：问自己两句话。
1. 这张图是否**九宫格素材**（美术标注了九宫格 / 有中央可拉伸区）？是 → `SLICED`+`CUSTOM`，否 → `SIMPLE`
2. 节点尺寸是否**需要手填**（控件尺寸、固定框、被 Layout 分配）？是 → `CUSTOM`，否 → `TRIMMED`

### 视觉子节点组件映射

视觉子节点必须挂对应渲染组件（批量创建时最易遗漏）：
- `icon` → UITransform + **Sprite**
- `shadow` → UITransform + **Sprite**
- `label` → UITransform + **Label**
- 纯逻辑节点（shotNode / effect）→ 只需 UITransform

### SpriteFrame UUID 获取方式

```
图片文件: textures/enemy/enemy01.png
图片 UUID: cb1af3a9-924d-4ed6-b9b9-8daaf11be8fa  (在 .meta 文件中)
SpriteFrame UUID: cb1af3a9-924d-4ed6-b9b9-8daaf11be8fa@f9941  (加 @f9941 后缀)
```

`@f9941` 是 Cocos 3.x 中 SpriteFrame 子资源的固定后缀标识。

---

## Label

```json
{
  "__type__": "cc.Label",
  "node": { "__id__": 20 },
  "_enabled": true,
  "__prefab": null,
  "_customMaterial": null,
  "_srcBlendFactor": 2,
  "_dstBlendFactor": 4,
  "_color": { "__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255 },
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

### 实战模式（三个真实项目统计）

| 特征 | 最常用值 | 说明 |
|------|---------|------|
| `_lineHeight` | = `_fontSize` | 1:1 比例，不要设为 0 |
| `_enableOutline` | true, width=3-4 | 描边常用，阴影几乎不用 |
| `_overflow` | 0 (NONE) | 固定区域用 2(SHRINK) |
| `_cacheMode` | 0 (NONE) | 频繁更新数字可用 2(CHAR) |
| `_horizontalAlign` | 1 (CENTER) | 数字/分数居中，文本左对齐(0) |
| `_verticalAlign` | 1 (CENTER) | 几乎 100% 都是居中 |
| 自定义字体 | `_isSystemFontUsed: false` | 配合 `_font: {"__uuid__":"...","__expectedType__":"cc.TTFFont"}` |

### Label 铁律（必须遵守）

**1. 字号与行高一致**：`_fontSize` 必须 `= _lineHeight`（否则上下错位，多行时尤其明显）

**2. anchorPoint 按场景分两种**：

| 场景 | 父节点 | Label 节点的 anchorPoint |
|------|-------|-------------------------|
| **独立 Label**（单独一段文字） | 任意 | `(0.5, 0.5)` 中心锚定 |
| **Icon + Label 组合（Horizontal Layout）** | 带 `cc.Layout` 的父 Node | `(0, 0.5)` — **x=0** 左侧锚定 |
| **Icon + Label 组合（Vertical Layout）** | 带 `cc.Layout` 的父 Node | `(0.5, 0)` — **y=0** 底部锚定 |

**为什么组合模式要改锚点**：Label 字数变化 → 尺寸变化。anchor = 0.5 时 Label 向两侧/上下**双向扩张**，会挤到相邻 icon 造成位移；anchor 设到 Layout 排列方向的**起始边**（Horizontal 的左 / Vertical 的底）后，Label 只向外侧单向扩张，icon 位置稳定。

**典型组合结构**（血量图标 + 数值）：

```
HpDisplay (UITransform + Layout: horizontal, resizeMode=CONTAINER)
├── iconHeart (UITransform + Sprite, anchor=(0.5, 0.5))
└── labelHp   (UITransform + Label,  anchor=(0, 0.5))
```

父 Node 的 Layout 要求：
- `_type: 1` (HORIZONTAL) 或 `_type: 2` (VERTICAL)
- `_resizeMode: 1` (CONTAINER) — 整体跟随子元素尺寸自适应（最常见）
- 或 `_resizeMode: 2` (CHILDREN) — 外框固定，Layout 分配子元素（固定宽度的卡片槽）

---

## Button + ClickEvent

```json
{
  "__type__": "cc.Button",
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
| `_componentId` | **必须是压缩 UUID** | 详见 `scripts-and-patterns.md` |
| `component` | 类名字符串，不是文件名 | `"CardPrefab"` 不是 `"CardPrefab.ts"` |
| `handler` | 方法名字符串 | 该方法必须在 component 类中声明为 public |
| `target` | 挂载 component 的节点的 `__id__` | 不是按钮节点自身（除非脚本也挂在按钮上） |
| UITransform | 按钮节点的 contentSize 决定点击区域 | contentSize 为 0 则点不到 |

### Button vs TOUCH_END 规则

- 想让节点响应点击 → **挂 `cc.Button` + 监听 `Button.EventType.CLICK`**
- **不要用 `Node.EventType.TOUCH_END`** 在多层 UI 上（子节点 UITransform 会吞事件）

---

## Widget

```json
{
  "__type__": "cc.Widget",
  "node": { "__id__": 1 },
  "_enabled": true,
  "__prefab": { "__id__": 5 },
  "alignMode": 1,
  "_target": null,
  "_alignFlags": 45,
  "_left": 0, "_right": 0, "_top": 0, "_bottom": 0,
  "_verticalCenter": 0,
  "_horizontalCenter": 0,
  "_isAbsLeft": true, "_isAbsRight": true,
  "_isAbsTop": true, "_isAbsBottom": true,
  "_isAbsHorizontalCenter": true, "_isAbsVerticalCenter": true,
  "_originalWidth": 0, "_originalHeight": 0,
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

| 布局需求 | `_alignFlags` | 计算 |
|---------|-------------|------|
| **全屏拉伸** | `45` | TOP(1) + BOT(4) + LEFT(8) + RIGHT(32) = 45 ★最常用 |
| 顶部居中 | `17` | TOP(1) + MID_H(16) = 17 |
| 底部左对齐 | `12` | BOT(4) + LEFT(8) = 12 |
| 正中央 | `18` | MID_V(2) + MID_H(16) = 18 |
| 左右拉伸+顶部 | `41` | TOP(1) + LEFT(8) + RIGHT(32) = 41 |

### 常见陷阱

- `alignMode`: `0` = ONCE（只在初始化时对齐一次），`1` = ON_WINDOW_RESIZE（窗口变化重新对齐），`2` = ALWAYS
- `_isAbs*`: `true` 表示距离是像素绝对值，`false` 表示是百分比（0-1）
- `_target`: `null` 表示相对父节点对齐，否则相对指定节点

> Widget 决策（要不要加 / 加什么 flag）详见 `cocos-widget-decision` skill。

---

## Layout

```json
{
  "__type__": "cc.Layout",
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

### 实战模式

| 特征 | 最常用值 | 说明 |
|------|---------|------|
| `_N$layoutType` | 1 (VERTICAL) | 其次 2(GRID)，很少用 0(HORIZONTAL) |
| `_resize` | 1 (CONTAINER) | 容器适应内容大小 |
| `_N$spacingX/Y` | 0-20px | 常见间距 |
| `_N$paddingLeft/Right/Top/Bottom` | 0 | 紧凑布局为主 |

---

## ProgressBar

ProgressBar 需要父节点 + Bar 子节点配合：

```
ProgressBar (UITransform + Sprite背景 + cc.ProgressBar)
└── Bar (UITransform + Sprite填充)
```

### 父节点的 ProgressBar 组件

```json
{
  "__type__": "cc.ProgressBar",
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
| 进度条方向反 | `_reverse` 或 anchor 设错 | anchor.x=0, `_reverse=false` |
| 进度条超出背景 | `_totalLength` ≠ 父节点宽度 | 保持一致 |

---

## BlockInputEvents

最简组件，用于模态弹窗阻断底层输入：

```json
{
  "__type__": "cc.BlockInputEvents",
  "node": { "__id__": N },
  "_enabled": true, "__prefab": null,
  "_id": ""
}
```

**⚠️ 全屏页面不推荐用**（会吞掉子节点按钮和全局触摸）。改用脚本 `TOUCH_START` 拦截：
```typescript
this.node.on(Node.EventType.TOUCH_START, (e) => { e.propagationStopped = true; }, this);
```
