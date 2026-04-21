# UI 设计流程

从效果图到场景节点的完整工作流。先理解再动手，先固定再可变。

## 触发时机

任何涉及 UI 创建、修改、布局调整的任务。

## 第一步：阅读素材

1. **看效果图/流程图** — 理解每个 UI 元素的空间关系，不是看"大概长什么样"
2. **看背景图的几何结构** — 凸起/凹陷/翼展/平台都是元素的"停靠位"
3. **清点图片资源** — 逐张看，建立"图片→用途"映射表
4. **看设计分辨率** — 如果和效果图尺寸一致，坐标可以直接用

## 第二步：提取空间关系（不需要量像素）

用文字描述三层信息：

**空间关系** — 谁在谁旁边？谁包围谁？对称还是偏移？
```
例：Fire 被3个 Slot 包围成凸字形
    左右 Slot 对齐，中间 Slot 偏高，Fire 在最下方
```

**比例关系** — 各元素占屏幕/容器的多大？A 是 B 的几分之几？
```
例：仪表盘 600px 宽，3 个 Slot 各占 1/3 = 200px 列宽
    Fire 直径 ≈ 列宽的 90%
    Slot 宽度 ≈ 列宽的 60%
```

**节点层级** — 谁是谁的子节点？bg 和 icon 怎么叠加？
```
例：Slot 根节点（空）
    ├── bg（Sprite, TRIMMED）
    ├── icon（Sprite, TRIMMED）
    └── label（Label, fontSize 从 icon 高度推导）
```

## 第三步：确定尺寸（TRIMMED 是真理）

**核心原则：从固定的东西推导可变的东西。**

1. icon 用 **sizeMode=TRIMMED**，显示原始像素大小 → 这是"基准"
2. label fontSize 从 icon 高度推导：fontSize ≈ icon 高度 × 0.7~0.8
3. 不改 icon 的 scale — scale 影响所有子节点，会打乱比例关系
4. 背景/容器可以用 CUSTOM 模式设 contentSize 来适配目标尺寸

## 第四步：定位

**边角/边缘元素 → Widget 锚定**
- 左上角：Widget isAlignTop=true, isAlignLeft=true, top=15, left=15
- 不写死坐标，自动适配不同屏幕

**居中/游戏区域元素 → 坐标定位**
- 从容器尺寸和比例关系推导坐标
- 例：仪表盘分3层，上层 y=中心+1/3高，中层 y=中心，下层 y=中心-1/3高

**定位后检查**
- 算每个元素的包围盒（center ± size×scale/2）
- 相邻元素间距 < 0 = 重叠
- 子节点总尺寸 > 父节点边距 = 溢出

## 第五步：验证

- [ ] 所有 icon 用了 TRIMMED？
- [ ] label fontSize 和相邻 icon 高度成比例？
- [ ] 边角元素用了 Widget 锚定？
- [ ] 相邻元素没有重叠？
- [ ] 子节点不会溢出屏幕？
- [ ] 和效果图的空间关系一致？

## 反模式（不要做的事）

- ❌ 先改 scale 再调 sizeMode — 应该先定 sizeMode，scale 尽量保持 1
- ❌ 猜坐标数字 — 应该从容器比例推导
- ❌ 改 JSON 文件设 spriteFrame — 编辑器会覆盖，用 MCP
- ❌ 没看效果图就定位 — 先理解空间关系
- ❌ 边角元素写死坐标 — 用 Widget 适配

---

## View / Item 分离原则（来自 CLAUDE.md 5.2 迁入）

**页面（View）职责**：管生命周期、布局、动画、流程。不关心子元素长什么样。
**子元素（Item）职责**：管数据展示，通过 `setData(data)` 刷新自己。不关心自己在哪个页面里。

**Item 必须有 `setData()` 方法** — 对象池回收再取出不走 onLoad，只调 setData。

同一个 Item 可出现在不同 View 里 — 竖屏 3 选 1、横向滚动、九宫格。

```typescript
// ✓ 正确：Item 组件
@ccclass('LevelItem')
export class LevelItem extends Component {
    @property(Label) levelLabel: Label = null;
    @property(Sprite) starIcon: Sprite = null;

    setData(data: { level: number; stars: number }): void {
        this.levelLabel.string = `第 ${data.level} 关`;
        this.starIcon.spriteFrame = getStarSprite(data.stars);
    }
}

// ✓ View 只 instantiate + setData
for (const lvData of this.levels) {
    const item = instantiate(this.levelItemPrefab);
    item.getComponent(LevelItem).setData(lvData);
    this.content.addChild(item);
}
```

---

## 全屏页面标准结构（来自 CLAUDE.md 3.2 迁入）

结算、选择、引导等全屏页面：

```
XxxView (Widget 四边=0 _alignFlags=45 + 脚本)
├── mask (Sprite 黑色 + UIOpacity=100 + sizeMode=CUSTOM)   ← 纯视觉，无 BlockInputEvents
└── content (UIOpacity + Layout)
    ├── Item 实例
    └── ...
```

### 触摸拦截（重要）

**不用 `BlockInputEvents` 组件**（会吞掉子节点和全局触摸事件）。改为脚本 onLoad 中注册：

```typescript
// 根节点拦截触摸，阻止事件穿透到游戏层
this.node.on(Node.EventType.TOUCH_START, (e) => { 
    e.propagationStopped = true; 
}, this);

// 如需点击任意位置触发操作（如引导页跳过）：
this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
```

### 预制体三种类型

| 类型 | 判断标准 | 根节点设计 | 适配策略 |
|------|---------|-----------|---------|
| **全屏页面** | 覆盖整个屏幕，模态交互 | Widget 四边=0 + 脚本 | 必须 Widget 适配 |
| **嵌入式组件** | 局部区域展示 | UITransform=自身大小 + 脚本 | 按需 |
| **游戏对象** | 存在于游戏世界，有碰撞和生命周期 | 脚本 + 碰撞体 | 不需要 |

---

## 多层 UI 点击事件规则

### 子节点会吞 TOUCH_END

Cocos 3.x UI 事件机制：任何带 UITransform 的节点默认拦截 touch，不自动冒泡。

**做法**：

- 想让节点响应点击 → 挂 `cc.Button` 组件 + 监听 `Button.EventType.CLICK`
- 不要用 `Node.EventType.TOUCH_END` 在多层 UI 上

```typescript
// ❌ 错
slot.on(Node.EventType.TOUCH_END, ...);

// ✓ 对
slot.addComponent(Button);  // 或 prefab 里挂好
slot.on(Button.EventType.CLICK, ...);
```

### Button transition 推荐

- `_transition: 3` (SCALE) — 按下缩放反馈，通用性最好
- `_transition: 2` (COLOR) — 按下变色，慎用（颜色乘算容易压黑）
- `_transition: 0` (NONE) — 无反馈，玩家觉得按了没反应，不推荐
