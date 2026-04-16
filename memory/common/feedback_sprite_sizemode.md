---
name: Sprite sizeMode 使用规范
description: Sprite 大小模式选择规则 — 默认用 TRIMMED(1)，只有特殊需求才用 CUSTOM(0)
type: feedback
originSessionId: 49b75e5b-0ffd-448e-94a1-6a67cf3819f9
---
Sprite `_sizeMode` 选择规则：

- **TRIMMED (1)** — 默认模式。Sprite 使用贴图自身裁切后的尺寸，不需要手动设 contentSize。大多数情况用这个。
- **CUSTOM (0)** — 自定义大小。Sprite 跟随 UITransform 的 contentSize，适用于需要拉伸/缩放的场景（九宫格、动态尺寸方块、全屏遮罩等）。
- **RAW (2)** — 原始大小。使用贴图原始尺寸（不裁切）。

**Why:** 用户反馈 — 不用设置大小的图片（图标、按钮贴图等）保持 TRIMMED(1) 让贴图自己决定尺寸，只有明确需要控制大小的（如方块 icon、mask 遮罩、金币图标）才改 CUSTOM(0)。

**How to apply:**
- 创建 Sprite 节点时默认 `_sizeMode: 1`（不用改）
- 只在这些场景改为 `_sizeMode: 0`：九宫格拉伸、方块 icon（需跟随 contentSize）、全屏 mask 遮罩、需要固定尺寸显示的小图标
- 不要对 tipText、handAnim、downloadBtn 等贴图改 sizeMode
