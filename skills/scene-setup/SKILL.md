# 3D 引擎 2D 游戏场景创建标准流程

> 适用于 Cocos Creator 3.8.x 3D 项目做 2D 游戏。从三个游戏（叠叠高、闪避、接金币）的实战错误中总结。

## 踩坑清单（每条都是真实错误）

| # | 错误 | 后果 | 正确做法 |
|---|------|------|---------|
| 1 | Camera 创建为 2DNode 或放在 Scene 根级别 | Z 轴被忽略/坐标偏移 | Camera 必须是 **3DNode**，且必须是 **Canvas 的子节点**（不能和 Canvas 同级），z=1000 |
| 2 | Camera 没设正交投影 | 透视投影下 2D UI 变形 | projection=**0** (ORTHO), orthoHeight=designH/2。注意枚举：ORTHO=0, PERSPECTIVE=1，别写反！ |
| 3 | Canvas._cameraComponent 没绑 Camera | 黑屏，什么都渲染不出 | 通过场景文件 `__id__` 绑定 |
| 4 | Canvas Widget alignFlags=0 | Canvas 不适配屏幕 | alignFlags=45（上下左右全适配） |
| 5 | Layer 节点没加 Widget | 子节点不跟随屏幕 | BgLayer/UILayer/GuideLayer/PopupLayer 都要 Widget flags=45 |
| 6 | 坐标硬编码 600×1167 | 不同屏幕比例下位置错 | 运行时从 Canvas UITransform 获取 |
| 7 | 触摸坐标手动换算 | 不同设备位置偏移 | 用 UITransform.convertToNodeSpaceAR |
| 8 | Sprite sizeMode=TRIMMED | 占位图 38px 导致节点看不到 | 始终 sizeMode=0 (CUSTOM) |
| 9 | 图片 .meta type=texture | 没有 SpriteFrame，Sprite 无法使用 | 改为 type=sprite-frame，添加 f9941 子资源 |
| 10 | prefab 中 Sprite._spriteFrame=null | 运行时看不到任何图片 | 创建 prefab 后检查并绑定 spriteFrame |
| 11 | 所有 Label 文字是 "Label" | 编辑器预览全是 Label 占位符 | 创建后立即设置实际文字和字号 |
| 12 | ResultPanel 子节点全在 (0,0) | 标题/分数/按钮全部重叠 | TitleLabel y=100, SubtitleLabel y=40, RestartBtn y=-40, DownloadBtn y=-110 |
| 13 | 引导文字在 (0,0) | 看不到引导 | TipLabel y=-100, Finger y=-200, Mask 600×1167 全屏 |
| 14 | HUD 节点贴着顶边 | 被刘海/状态栏遮挡 | Y=500（距顶约 83px） |
| 15 | 自定义脚本挂在 prefab 上 | 编辑器序列化 __type__ 格式不稳定，反复报 Script missing | prefab 只放外观（Sprite），行为在代码中 tween 控制 |
| 16 | MCP set_component_property 后 create_prefab | 属性没保存到 prefab | 用 python3 直接改 prefab JSON |
| 17 | 首次点击既关引导又触发游戏 | 玩家没反应时间 | 延迟 0.8s 后才注册游戏触摸监听 |
| 18 | onGameStart 没重置视觉状态 | 重玩时 icon 还是上一局的大小/颜色 | 重置：scale(1,1,1) + color(white) + active(true) + removeAllChildren |

---

## 标准流程（7 步）

### 第 1 步：创建 Canvas + Camera

```
Canvas: 2DNode, 挂 cc.Canvas + cc.Widget(alignFlags=45)
Camera: 3DNode, 挂 cc.Camera
```

Camera 配置（通过改场景 JSON）：
- `_lpos`: `{x: designW/2, y: designH/2, z: 1000}`
- `_projection`: **0** (正交/ORTHO，注意 0=ORTHO，1=PERSPECTIVE，别写反！)
- `_orthoHeight`: designH/2
- `_far`: 2000
- Canvas `_cameraComponent`: `{__id__: Camera组件索引}`

### 第 2 步：创建层级 + Widget

```
Canvas
├── BgLayer    (Sprite bg.png + Widget flags=45)
├── GameLayer  (无Widget，可能需要移动)
├── UILayer    (Widget flags=45)
├── GuideLayer (Widget flags=45)
└── PopupLayer (Widget flags=45)
```

BgLayer 的 Sprite：sizeMode=0, contentSize=designW×designH, spriteFrame=bg.png

### 第 3 步：创建游戏节点 + Prefab

- GameLayer 下：PlayerNode（icon 子节点 + 实际飞机素材）、容器节点
- 创建游戏专用 prefab（金币、敌机、方块等）
- **每个 prefab 必须绑定自己的脚本组件**（封装自身行为：移动/动画/销毁）
- 结构：根节点（UITransform + 脚本组件） + icon 子节点（Sprite 视觉）
- 游戏主脚本只调 `getComponent(XxxScript).init()/play()/collect()`，不在外部写 tween

### 第 4 步：创建 UI 节点

UILayer 下实例化通用 prefab + 创建自定义 Label：
```
UILayer
├── CountdownBar prefab (0, 500)
├── ScoreLabel prefab   (-220, 500)
├── 自定义Label1        (220, 500)   ← 右上角
├── 自定义Label2        (-220, 460)  ← 左侧第二行
├── 自定义Label3        (0, 460)     ← 中间第二行
└── 自定义Label4        (0, -480)    ← 底部提示
```

间距规则：
- 第一行 Y=500（距顶 83px）
- 第二行 Y=460（间距 40px）
- 底部提示 Y=-480（距底 83px）
- 左 X=-220, 中 X=0, 右 X=220

### 第 5 步：设置所有文本

**不留任何 "Label" 占位符**。每个 Label 立即设置：
- 实际文字内容
- 字号（标题 36，分数/计时 24-28，按钮 24-28，引导 36）
- 颜色（如需要）

### 第 6 步：Prefab 实例内部绑定

通用 prefab 实例的 @property 必须在场景中重新绑定（不信任 prefab 默认值）：

```
CountdownBar: barBg→子节点, barFill→子节点, timeLabel→子节点Label
ScoreLabel: label→子节点Label
NewbieGuide: mask→Mask, finger→Finger, tipLabel→TipLabel
ResultPanel: mask→Mask, panel→Panel, titleLabel→..., subtitleLabel→..., restartBtn→..., downloadBtn→...
```

ResultPanel 内部布局：
- TitleLabel: (0, 100) "差一点就赢了！" 36号
- SubtitleLabel: (0, 40) "得分: 0" 26号
- RestartBtn: (0, -40) 200×50 "再来一次" 24号
- DownloadBtn: (0, -110) 280×60 "下载完整版" 28号

NewbieGuide 内部布局：
- Mask: (0, 0) 600×1167 全屏半透明
- TipLabel: (0, -100) 引导文字 36号
- Finger: (0, -200) 80×80 手指图标

### 第 7 步：挂脚本 + 验证

1. Canvas 挂游戏主脚本
2. 绑定所有 @property（MCP 或改 JSON）
3. 验证检查清单：

```python
# 用 python3 自动验证场景文件
检查项：
□ Camera z=1000
□ Camera _projection=0 (ORTHO)  ← 重要！0=正交，1=透视，别写反
□ Canvas._cameraComponent 非空且指向 cc.Camera
□ Canvas Widget alignFlags=45
□ 所有 Layer 有 Widget (除 GameLayer)
□ 所有 Sprite sizeMode=0
□ 所有 Sprite _spriteFrame 非 null
□ 所有 Label _string 非 "Label"
□ 所有 Label _fontSize >= 24
□ ResultPanel 子节点 y 不全是 0
□ NewbieGuide 子节点有正确位置和大小
□ 编辑器 console 全级别零日志
```

---

## Python 验证脚本模板

```python
import json
scene_file = 'assets/games/gameXX/XXScene.scene'
with open(scene_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

errors = []

# Camera z
for obj in data:
    if obj.get('_name') == 'Camera' and obj.get('__type__') == 'cc.Node':
        if obj['_lpos']['z'] != 1000:
            errors.append(f"Camera z={obj['_lpos']['z']}, should be 1000")

# Canvas Widget
for obj in data:
    if obj.get('__type__') == 'cc.Widget' and obj.get('node',{}).get('__id__') == 2:
        if obj.get('_alignFlags') != 45:
            errors.append(f"Canvas Widget flags={obj.get('_alignFlags')}, should be 45")

# Labels
for obj in data:
    if obj.get('__type__') == 'cc.Label':
        if obj.get('_string') == 'Label':
            nid = obj.get('node',{}).get('__id__',-1)
            nm = data[nid].get('_name','?') if 0<=nid<len(data) else '?'
            errors.append(f"{nm} has placeholder text 'Label'")
        if obj.get('_fontSize',0) < 24:
            errors.append(f"Label fontSize={obj.get('_fontSize')} too small")

# Sprites
for obj in data:
    if obj.get('__type__') == 'cc.Sprite':
        if obj.get('_sizeMode') == 1:
            errors.append("Sprite sizeMode=TRIMMED, should be CUSTOM")
        if obj.get('_spriteFrame') is None:
            errors.append("Sprite spriteFrame is null")

if errors:
    for e in errors: print(f"ERROR: {e}")
else:
    print("ALL CHECKS PASSED")
```

## 场景生成后自检清单（project_2 实战总结）

每次生成或修改场景 JSON 后，必须逐项检查：

| # | 检查项 | 判断方法 |
|---|--------|---------|
| 1 | Camera 是 Canvas 的**子节点** | Camera._parent.__id__ 指向 Canvas |
| 2 | Canvas 有 Widget(_alignFlags=45) | Canvas._components 包含 cc.Widget |
| 3 | 全屏容器有 Widget | bg/damageContainer/fxLayer/gameOverLayer 都有 cc.Widget |
| 4 | @property(Component) 指向组件 | Label/Sprite/自定义脚本的 __id__ 指向组件，不是节点 |
| 5 | @property(Node) 指向节点 | Node 类型的 __id__ 指向 cc.Node |
| 6 | 所有节点 _layer = 1073741824 | 不是 33554432 |
| 7 | Camera._orthoHeight = designH/2 | 600×1160 → orthoHeight=580 |
| 8 | Canvas._cameraComponent 指向 Camera | __id__ 指向 cc.Camera 组件 |
| 9 | Scene 只有 Canvas 一个子节点 | Camera 不应该在 Scene._children 里 |
| 10 | refresh_assets 后重新 open_scene | 编辑器有缓存，不重新打开看到的是旧的 |
