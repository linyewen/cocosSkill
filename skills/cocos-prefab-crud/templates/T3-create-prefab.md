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
