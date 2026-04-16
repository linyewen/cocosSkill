---
name: feedback_image_meta_spriteframe
description: 导入图片资源后必须确认 meta 文件包含 sprite-frame 子资源，否则 Sprite 无法使用
type: feedback
originSessionId: 8af28539-eb6a-4f76-88f9-a7ac85950c7c
---
导入图片到 resources/ 或 textures/ 后，必须检查 .meta 文件是否包含 sprite-frame 子资源。

**Why:** ProjectDrop 中全部 56 张图片的 meta 只有 texture 子资源没有 sprite-frame，导致 AnimationManager.loadDir 返回 0 帧、Sprite 无法显示、画面全黑。这是 scene-setup skill 第 9 条坑。

**How to apply:** 
1. 导入图片后立即检查：`cat xxx.png.meta | grep sprite-frame`
2. 如果没有，用 Python 批量添加 f9941 子资源
3. 或者在编辑器中选中图片 → Inspector → Type 改为 sprite-frame
4. 添加后必须 refresh_assets 让编辑器重新导入
