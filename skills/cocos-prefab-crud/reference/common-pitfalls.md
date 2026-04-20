# Cocos Prefab/Scene 常见踩坑合集

> 按"触发条件 → 现象 → 根因 → 修法"四段式。每条都来自真实项目踩坑，不是假想。

---

## P1：Python 改 scene 后编辑器保存覆盖磁盘

**触发**：Cocos 打开 → Python 改 scene 或 prefab → Cocos 保存（用户或自动）

**现象**：Python 写入的 @property 绑定丢失变 null

**根因**：Cocos 内存里有 scene 的旧副本（打开时加载的），它不感知磁盘变化。保存时以内存为权威覆盖磁盘。

**修法**：
- 跑 Python 前**必须关闭 Cocos**（`prefab_builder.py::ensure_cocos_closed()` 自动防呆）
- 弹"保存场景？"**永远点取消**
- 追加规则：跑完 Python 再开 Cocos，让它从磁盘读最新

---

## P2：新加 @property 到已有 .ts + Python 写 ref → 保存时变 null

**触发**：
1. 给已有 TS 类加新 `@property(Prefab) xxx: Prefab = null`
2. Python 往 scene/prefab 写这个 field 的 UUID 引用
3. 用户打开 Cocos（TS 还没编译完这个新 field）

**现象**：Cocos 认为"组件上没这个字段"→ 自动 null 掉 + 标场景脏 → 弹保存 → 用户一保存全丢

**根因**：TS 编译 vs scene 加载存在竞态。编译先完，ref 绑定成功；加载先完，ref 被清空。

**修法**（顺序不能错）：
1. 改 TS 加 @property
2. **先启动一次 Cocos 让 TS 编译完**（看控制台 `TypeScript compile succeed`）
3. 完全关闭 Cocos
4. 跑 Python 补 ref
5. 再启动 Cocos → 绑定有值

---

## P3：Python 全生成 prefab 结构 JSON → 看起来 OK 实际缺字段

**触发**：AI / 开发者用 Python 从零生成完整 prefab JSON（根节点 + 层级）

**现象**：prefab 打开可能不报错，但：
- 某些组件字段偷偷是默认值（和手建不一致）
- 子节点引用错乱
- spriteFrame 显示白方块

**根因**：prefab JSON 有一堆隐藏必填字段（`__prefab`、`CompPrefabInfo`、`_id` 等），手写容易漏，Cocos 宽容但会静默错误。

**修法**：
- **红线**：结构（新节点/新层级）必须用编辑器手建，Python 只改已有节点的字段值
- 即使做了也必须**肉眼对比**编辑器里手建的同类 prefab

---

## P4：子节点 UITransform 吞 Touch 事件

**触发**：父节点挂 `Node.EventType.TOUCH_END` 监听，子节点有 Label（带 UITransform）

**现象**：点击父节点区域无响应（子节点 Label 捕获了 touch，没冒泡）

**根因**：Cocos 3.x UI 事件机制：任何带 UITransform 的节点默认拦截 touch，不自动冒泡。

**修法**：
- **推荐**：父节点挂 `cc.Button` 组件，监听 `Button.EventType.CLICK`。Button 会处理事件分发
- 备选：子节点 UITransform 的 raycastTarget 关掉（Cocos 3.8 里没有这个字段，靠 Mask 的 Mesh clip，较 hacky）
- 不要用 `Node.EventType.TOUCH_END` 在多层 UI 上

---

## P5：Sprite 颜色乘算导致图片显示黑色

**触发**：`b.sprite(node, color=(50, 50, 80, 220), sprite_frame_uuid=SOME_SPRITE)`

**现象**：按钮完全是黑色，看不到底图

**根因**：Sprite._color 和 spriteFrame 是**乘算**（multiply blend）。`(50,50,80)` 远离 255 → 原贴图被压暗几乎到黑。

**修法**：
- 想保留原图色彩：`color=(255, 255, 255, 255)` 不 tint
- 想调色：乘算算准（比如 `(200, 200, 240, 255)` 稍偏蓝）

---

## P6：BaseUtil.shakeScreen 把 Camera z 归零 → 全黑

**触发**：`BaseUtil.shakeScreen(0.5, 10)` 用 tween 改 Camera position

**现象**：震屏后屏幕全黑（相机视锥错了）

**根因**：原实现用 `v3(0, 0, 0)` 做 originalPos，相机的 z（通常 1000）被写成 0。2D 正交相机 z=0 等于贴在 UI 上看不到。

**修法**：
- Starter 的 BaseUtil.shakeScreen 已修（保留 origZ）
- 生产级做法参考 ProjectDrop `EffectManager.safeShake` — 加 100ms 节流 + 保留 origZ

---

## P7：对象池未用导致长时间玩卡顿发热

**触发**：高频 spawn/destroy（金币、子弹、方块、FloatText）不走池

**现象**：
- 前 1-2 分钟流畅
- 5 分钟后明显变卡
- 手机发热（连续 GC）

**根因**：每次 `new Node` + `destroy` 给 GC 压力。Lv27 估算 5000+ 次 new/destroy。

**修法**：
- `SafePool.ts` + `safePoolGet / safePoolPut`
- 回池前清空 tween（`Tween.stopAllByTarget(node)`）防残留动画
- 设置合理的 `setScale(1,1,1)` 防上次缩放残留

---

## P8：压缩 UUID 拼错导致"未知组件"

**触发**：手写 prefab JSON 时压缩 UUID 拼错一位

**现象**：Cocos 加载 prefab 报 `Missing component "xxxxx"`

**根因**：压缩 UUID 算法：前 5 hex + 每 3 hex → 2 base64 chars。算错一位整个组件丢失。

**修法**：
- **永远**用 `prefab_builder.compress_uuid()` 算，不手写
- 脚本 uuid 用 `read_script_uuid()` 从 .ts.meta 读，不复制粘贴

---

## P9：pushAllUp 方块被 tween 拉回原位

**触发**：用 `node.setPosition(x, y+300, z)` 把方块推上去，但 `Block.stepDown()` 的 tween 还在跑

**现象**：setPosition 瞬间生效，下一帧 tween 把位置拉回 targetY

**根因**：tween 还活着，每帧都在驱动 position 往 targetY 走；setPosition 被静默覆盖。

**修法**：
```python
Tween.stopAllByTarget(node);  # 先打断 tween
node.setPosition(...);
# 还要 reset 状态：blockManager.stepState = 'PAUSING'
```

---

## P10：新 .ts 文件不重启编辑器 → Play 报未知组件

**触发**：Claude 新建 `assets/Script/ui/NewController.ts`，用户没重启编辑器就 Play

**现象**：Play 时报 `Missing component "NewController"`，组件面板显示红色 "null"

**根因**：Cocos 只在启动时扫一次组件类（.ts.meta 的 uuid → TS class），新文件的类没注册进去。

**修法**：
- 新加 .ts 文件后**必须重启 Cocos Creator**
- 即使 Python 预生成了 .ts.meta，也必须重启
- 验证：重启后 Hierarchy 里的组件面板能拉到新组件类
