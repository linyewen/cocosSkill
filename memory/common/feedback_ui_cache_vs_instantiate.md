---
name: UI 节点用预制缓存 + active 切换，不要每次 instantiate
description: 常驻/高频切换的 UI（HUD / 暂停菜单 / 道具栏 / 结算页）应预制后 active 切换，避免 new/destroy 的 GC 压力和状态丢失
type: feedback
---
**规则**：游戏里出现频率高、结构固定的 UI，**不要每次 instantiate 新节点再 destroy**，改为：
- 首次进入场景时 instantiate 一次并缓存引用
- 之后切换 `node.active = true/false` 控制显隐
- 退出场景时 destroy 统一清理

**适用场景**：
- ✅ HUD（分数/波次/关卡/装备信息）— 整局都在显示
- ✅ 暂停菜单 — 反复开关
- ✅ 道具栏 ItemBar — 每局都用
- ✅ 结算面板 — 胜/败两次结算通常只打开一次，但如果有"再战"要反复用
- ✅ 签到弹窗 — 主菜单反复开关
- ❌ 不适用：一次性特效节点（爆炸/浮动文字）— 这类用对象池

**Why**：
- 每次 `instantiate(prefab)` 都走完整的 Node/Component/Sprite/Label 实例化路径，有 GC 压力
- `destroy()` 触发 TS 组件 onDestroy，事件监听器要重新 on/off 管理，容易漏导致事件泄漏
- 预制节点的 @property 绑定在编辑器时就做好，调试和 hot-reload 更快
- 性能对比：instantiate 一个 10 节点的 HUD prefab 约 2-5ms，setActive 约 0.01ms

**How to apply**：
1. 把常驻 UI 节点放在 Canvas 下（编辑器手建或 Python 一次性生成到 scene）
2. 初始 active=false，GameEntry 按需 setActive(true)
3. Controller 用 `this.node.active = false` 替代 `this.node.destroy()`
4. 如果需要"重置状态"，加 `refresh() / reset()` 方法，显示前调用一次

**反模式**：
- ❌ `instantiate(prefab)` 然后 `destroy()` 来回倒腾
- ❌ 为了省事用 `node.removeFromParent()` + 下次再 addChild（其实 setActive 更简单）

**折中方案**（如果 scene 上不方便放）：
- `GameEntry` 保留 `instance` 字段缓存：首次 `instantiate` 保存到字段；之后 setActive 切换
- 这样 prefab 工作流不变，运行时也是缓存实例化
