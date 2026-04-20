---
name: Sprite 颜色与 SpriteFrame 是乘算关系
description: Sprite._color 和 spriteFrame 是 multiply blend，调深色 tint 会把贴图压到近黑
type: feedback
---
Cocos Sprite 的 `_color` 和 `_spriteFrame` 是**乘算**（multiply blend）关系，不是替换。

**Why**：`(50, 50, 80)` 远离 255 → 原贴图被按比例压暗到几乎全黑。曾经在 ProjectDrop 道具栏槽位用 `color=(50,50,80,220)` + 橙色 BTN 贴图，结果显示"全黑按钮"点不动。

**How to apply**：
- 想保留贴图原色：`color=(255, 255, 255, 255)` 不 tint
- 想整体调暗/调色：按比例算（比如 `(200, 200, 240)` 稍偏蓝、不压暗）
- 透明度用 `color[3]`（alpha）或 `UIOpacity` 组件，不要用 `color=(x,x,x,100)` 这种低 alpha 乘 255 贴图会发黑
- Label 颜色同理，深色字配白底贴图会清晰，白色字配白底就看不见
