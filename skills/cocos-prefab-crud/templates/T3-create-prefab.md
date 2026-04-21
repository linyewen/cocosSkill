# T3: 新建完整 prefab

**适用场景**：从零做一个新 prefab（主菜单 / 结算 / 商店 / 道具栏等）。

**分工**：**编辑器建结构** → Python 补脚本组件 + @property + 静态 SpriteFrame。

**刷新档位**：🟡（新 prefab 文件），若同时新建脚本 `.ts.meta` 则升 ⛔

---

## 为什么不能 Python 从零生成

见 T2 的"为什么不能 Python 硬加"部分。T3 是 T2 的极端版——整个 prefab 都是"新加的东西"，Python 硬写出错概率翻倍。

**历史教训**：ProjectDrop Session 4 曾用 Python 全生成 3 个 prefab（`MainMenuPrefab` / `LevelSelectPrefab` / `LevelSettlementPrefab`），commit `4b2e33b`。后续发现 @property 需要编辑器重启才能生效，隐含结构性问题。

---

## 标准流程

### 第 1 步：Claude 写清完整设计说明

```
【新 prefab 名】CheckInPrefab
【全屏遮罩？】是（Widget _alignFlags=45）
【根尺寸】600 × 1167（和 design 一致）
【根组件】UITransform + Widget + CheckInController 脚本
【层级结构】
  root
  ├─ mask          (全屏半透明黑, Sprite 灰色 200)
  └─ content       (空容器)
     ├─ title      (Label "每日签到", y=400)
     ├─ dayGrid    (7 个签到格子容器, y=100)
     │  ├─ day1    (Sprite + Label "+10")
     │  ├─ day2    ...
     │  └─ day7    (高亮格, Sprite 金色)
     ├─ rewardLabel(Label "连续签到: 0 天", y=-200)
     └─ closeBtn   (Sprite + Button, y=-400)
【脚本 @property 绑定】
  - dayNodes: [day1, day2, ..., day7] 的 Node 数组
  - rewardLabel: rewardLabel Node
  - closeBtn: closeBtn 的 Button 组件
【静态资源】
  - 背景 bg sprite 用现有 bg.png
  - 按钮底图用 retry_btn.png
  - 签到格子底图用 block/1_1.png（后续你给专用图再换）
```

### 第 2 步：用户在编辑器操作

1. `assets/prefabs/` 右键 → 创建 Prefab（空）
2. 按说明建层级结构（Cocos 节点模板库里 Button/Label/Sprite 拖进去很快）
3. 给根节点加 Widget（align 45），UITransform 设 600×1167
4. 把脚本（如果 `.ts` 已存在且 `.ts.meta` 也生成好了）拖到根节点作为组件
5. Ctrl+S 保存
6. 如果脚本是新的，先保存 prefab（组件位先空着），走完后面再加

### 第 3 步：Claude 用 Python 补绑定

和 T1 同样套路：`find_id_by_name.py` 扫节点 → `patch_property.py` 填 `{"__id__": N}` 或 `{"__uuid__": "..."}`。

### 第 4 步：交付给用户

```
【刷新档位】🟡（若涉及新 .ts.meta 则 ⛔）
【用户操作】
  1. 关闭 CheckInPrefab 文档
  2. 重新打开
  3. 如果有 ⛔，先整个重启 Cocos 编辑器
【验收清单】
1. 视觉：所有节点在位置，文字正确，Sprite 有图
2. @property 面板：dayNodes 数组显示 7 项，全部非 null；
   rewardLabel 绑到正确 Label；closeBtn 绑到 Button 组件
3. Play：点 closeBtn 能关闭；签到逻辑生效
```

### 第 5 步：把新 prefab 的 UUID 接入使用它的地方

如果这个 prefab 要作为 `@property(Prefab)` 挂到其他脚本的字段（比如 GameEntry.checkInPrefab），走 T4 patch scene 或用 Python patch 对应 prefab。

---

## 如果新 prefab 要关联新脚本

这是 T3 + 脚本新建组合题，**升 ⛔ 档**：

1. Write 新 `.ts` 文件到 `assets/Script/ui/` 或 `assets/Script/xxx/`
2. **不** Python 预生成 `.ts.meta`（让 Cocos 启动时生成）
3. 通知用户：**重启 Cocos 编辑器**（⛔）
4. 重启后用户在编辑器里建 prefab 并把脚本拖上去
5. 回到 T3 第 3 步，Python 补 @property

如果你急着验证 prefab 结构可以先不加脚本，建空 prefab 骨架，后续再加脚本。拆成两步更稳。

---

## 常见坑

### 坑 1：全屏 prefab 忘了 Widget

**现象**：不同屏幕比例下 UI 铺不满 / 不居中。

**规避**：说明里强调根节点必加 Widget，`_alignFlags=45`（上下左右全对齐）。

### 坑 2：anchor 点不是 (0.5, 0.5)

**现象**：节点位置 _lpos 算不对，UI 偏移。

**规避**：UITransform 默认 anchor 就是 (0.5, 0.5)，保持不动。有特殊需求（如左上对齐）才改。

### 坑 3：Sprite `_sizeMode` 没选对

**现象**：九宫格按钮被拉伸变形。

**规避**：九宫格资源 `_sizeMode=1`（CUSTOM），普通图 `_sizeMode=0`。**绝对不要用 `setScale()` 改按钮大小**（踩过的坑，见 `feedback_cocos_ui.md`）。

### 坑 4：prefab 嵌套引用导致循环

**现象**：A prefab 的字段指向 B prefab，B 又指向 A，编辑器可能死循环。

**规避**：新 prefab 设计时画一下引用方向图，强制单向依赖。

### 坑 5：Sprite 没绑 spriteFrame = 整个不渲染（黑屏元凶）

**现象**：场景看起来正常但 Play 后一片黑 / 某节点"看不见但点得到"。检查发现 Sprite 的 `_spriteFrame: null`，代码靠运行时 `resources.load(...)` 去 set。

**原因**：Cocos 3.x 的 Sprite 必须有 spriteFrame 才渲染——即使 `_color.a=255`、`contentSize` 正确，没 spriteFrame 就不生成绘制批次。`resources.load` 是异步的，load 失败时静默，没 spriteFrame 就永远黑。这等于把正确性押在异步 I/O 上，违反 CLAUDE.md §5.1「引用的节点/组件必须在编辑器中创建并绑定，代码中直接使用」。

**规避**：**所有 Sprite 的 spriteFrame 必须在 prefab / scene 里直接绑定**。如果一个 Sprite 预期被帧动画刷新（比如 Coin/Player），也要绑首帧作为初始图。代码里**不要用 `resources.load` 为 Sprite 补图**——那是绕过编辑器的 fallback，出问题时 silent fail 让你查到怀疑人生。

**自检**：
```bash
# prefab/scene 里搜有无 _spriteFrame: null
grep -n '"_spriteFrame": null' assets/**/*.prefab assets/**/*.scene
```
任何 Sprite 都不该留 null，除非故意要"透明占位"。

### 坑 7：脚本 + Sprite 同挂根节点（违反 CLAUDE.md §3.1）

**现象**：prefab 的根节点同时挂着自定义脚本（`Coin` / `Energy` / `Explosion` / `Finish`）和 `cc.Sprite`（做视觉）。功能上不会 crash，但维护混乱：
- 脚本改动可能影响视觉（改 contentSize 影响 Sprite 尺寸）
- 视觉换图时，可能动到脚本挂接的 @property
- Prefab-analyze / 查找逻辑入口时，要区分"这个 Sprite 是业务还是装饰"

违反 CLAUDE.md §3.1「根节点 = 逻辑锚点，子节点 = 视觉表现」。

**正确模板**：
```
root Node (UITransform + 自定义脚本，无 Sprite)
└── icon Node (UITransform + Sprite 预绑首帧)
```

**脚本侧约定**：
```ts
@property(Node) icon: Node = null!;

onEnable() {
    const target = this.icon || this.node;  // 防御：老 prefab 没 icon 时降级
    AnimationManager.instance?.play(target, DIR, count, fps, loop);
}

collect() {
    // tween 作用 root，子节点 icon 跟随缩放
    tween(this.node).to(0.15, { scale: new Vec3(1.6, 1.6, 1) }).start();
}
```

**何时可以例外**：纯静态装饰节点（无脚本、无动画、无碰撞）可以 Sprite 直接挂根节点——比如 TileA/TileB 这种背景瓦片。

**自检**：
```bash
# 查所有 prefab 是否有 Sprite 和自定义 script 挂根节点
# (懒人版：看根节点的 _components 数量，> 2 且含 cc.Sprite 就要审查)
```

**Finish 特殊**：Finish 线本身是"两个视觉子"的容器（banner 横幅 + label "FINISH" 文字），脚本只是位置锚点。所以根只留 UITransform + Finish 脚本，banner 和 label 都是平级子节点。

### 坑 6：MCP `prefab_create_prefab` 会丢掉所有视觉字段

**现象**：MCP 先在场景搭好节点 + 设好 spriteFrame + color + sizeMode + contentSize + 子节点 position，然后 `prefab_create_prefab`——打开生成的 .prefab，**发现 spriteFrame 变 null、color 回白、sizeMode=1、contentSize=100×100、子节点 position=0,0,0**。等于 MCP 只序列化了节点结构和组件种类，视觉属性全部重置成默认值。

**原因**：MCP 的 prefab_create_prefab 内部走的是"引擎序列化"路径，它当前实现把这些字段当成"运行时 override"而非"prefab 默认值"，序列化时全丢。和 `set_component_property` 在场景上下文的行为不对齐。

**规避**：MCP 只用来**生成节点骨架**（层级、组件种类、脚本 attach），视觉属性**转完 prefab 后必须直接改 JSON 补回**：
- `_spriteFrame` → 填 `{"__uuid__": "xxxx@f9941", "__expectedType__": "cc.SpriteFrame"}`
- `_sizeMode` → 0 (CUSTOM) 或 1 (TRIMMED)
- `_color` → `{"__type__": "cc.Color", "r":..., "g":..., "b":..., "a":...}`
- `_contentSize` → `{"__type__": "cc.Size", "width": W, "height": H}`
- 子节点 `_lpos` → `{"__type__": "cc.Vec3", "x": X, "y": Y, "z": 0}`

改完必须 `reimport_asset` + 编辑器关闭打开该 prefab 文档验证（🟡 档）。

**更彻底的做法**：既然 MCP 转 prefab 这一步都要重写，不如直接写 .prefab JSON（参考 `reference/prefab-json-format.md`），跳过 MCP。但结构复杂（嵌套多层子节点）时还是 MCP 建骨架比较快。

---

## 快速模板（用户可复制）

**全屏弹窗 prefab 骨架**：
```
root (UITransform 600×1167, Widget align=45, <你的脚本>)
├─ mask (UITransform 600×1167, Sprite 黑色 a=180)
└─ content (空容器，放你的内容)
    ├─ title
    ├─ ...
    └─ closeBtn / 各种交互
```

**HUD 子面板 prefab 骨架**（不全屏）：
```
root (UITransform 指定尺寸, 无 Widget, <你的脚本>)
├─ bg (Sprite 底图)
└─ (各种子节点)
```
