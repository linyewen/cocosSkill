# Cocos Creator 开发操作规范

> 面向 **用 Claude Code / 其他 AI** 辅助开发 Cocos Creator 3.8.x 游戏的**操作规范**。新项目拿到 `https://github.com/linyewen/cocosSkill` 后照本文执行即可上手。

---

## 🚀 0 秒上手

### 第一次（新机器 / 新同事）

```bash
git clone https://github.com/linyewen/cocosSkill.git ~/cocosSkill
cd ~/cocosSkill
bash install.sh        # 同步 skills / memory / CLAUDE.md 到 ~/.claude/
```

### 初始化新 Cocos 项目

```bash
bash ~/cocosSkill/init_project.sh D:/minigame/my-new-game
# 自动把 lib/*.ts → assets/Script/infra/
# 自动把 scripts/*.py → scripts/
# 自动把 commands/*.md → .claude/commands/
```

### 告诉 AI 你要做什么

给 AI 发这段 prompt（新 Claude Code / GPT / Gemini 都行）：
```
我用 cocosSkill starter 初始化了新项目 D:/minigame/xxx。
请读 ~/cocosSkill/OPERATIONS_GUIDE.md 熟悉操作规范，
然后我要做 <你的需求>。
```

---

## ⛔ 关键规范：改 prefab / scene 必读

### 规范 1 — Python 跑之前必须关 Cocos Creator

**原因**：Cocos 内存里的 scene ≠ 磁盘文件。Python 改了磁盘，Cocos 不知情；下次保存会用内存版覆盖 = 你 Python 写入的绑定**全丢**。

**防呆**：`scripts/prefab_builder.py` 自带 `ensure_cocos_closed()`，检测到 CocosCreator.exe 进程会退出。

```bash
# 正确顺序：
# 1. 完全关闭 Cocos（任务管理器看无 CocosCreator.exe）
# 2. python scripts/gen_prefabs.py
# 3. 重开 Cocos → Inspector 验 @property 绑定
```

### 规范 2 — "保存场景？"弹窗一定点取消

**触发场景**：Cocos 打开时检测到内存 ≠ 磁盘（因为 Python 刚改过磁盘）

**后果**：点"保存" = 把 Cocos 内存里**被清理过的 null 字段**写回磁盘 → 绑定全丢

**正确应对**：
1. 看到保存弹窗 → **点取消 / 不保存**
2. 关闭 Cocos
3. 重新打开 → 从磁盘重读干净状态

### 规范 3 — 新 @property + Python 写 ref 的协调流程

**最容易翻车的场景**：
- TS 里新加 `@property(Prefab) xxx`
- Python 往 scene 写该字段的 UUID
- Cocos 打开时 TS 还没编译完 → 看到"未知字段" → 清成 null → 弹保存 → 用户保存 → **绑定丢失**

**正确 5 步**：
1. Claude 改 TS 加 `@property` 字段
2. **先启动 Cocos 一次**，等控制台 `TypeScript compile succeed`（让它知道这个字段）
3. **完全关闭 Cocos**
4. 跑 `python scripts/gen_prefabs.py`
5. 重新启动 Cocos → Inspector 里 @property 槽位有值

### 规范 4 — 编辑器刷新矩阵

| 档位 | 触发 | 用户操作 |
|:---:|---|---|
| 🟢 | 只改 `.ts` 脚本内容（**不新增 @property**）| 无操作，Ctrl+S 即可 Play |
| 🟡 | Python 改已有 `.prefab` 字段值 | 关该 prefab 文档 → 重新打开 |
| 🔴 | Python 改 `.scene` 字段值 | 关 scene → 重开（或切场景再切回）|
| ⛔ | 新建 `.ts` + `.ts.meta`；**或给已有 `.ts` 加新 `@property` 后 Python 写 ref** | 整个编辑器重启 + 按规范 3 的 5 步走 |

---

## 🏗️ 架构规范

### 规范 5 — Fact / Rule / Guard 三层防御

任何"第二次会踩的坑"都要三层都建：

| 层 | 位置 | 作用 |
|---|---|---|
| **Fact** | `memory/common/feedback_*.md` | "这件事发生过" |
| **Rule** | `skills/*/SKILL.md` + 本文件 | "以后遇到同类情况怎么做" |
| **Guard** | 代码防呆 / 脚本检查 | "即使忘了规则，程序也不让错发生" |

**例子**：Cocos 保存弹窗坑 = `feedback_cocos_save_prompt.md` + `OPERATIONS_GUIDE.md 规范 2` + `prefab_builder.ensure_cocos_closed()`

只做一层（比如只记 memory）下次还会翻车。

### 规范 6 — UI 残留防治（双层防线）

**问题**：多个全屏 UI（主菜单/结算/暂停/DEV/库存/签到...）挂 popupLayer，某些路径重复 instantiate 但没销毁旧的 → UI 层层堆叠。

**防线 1 — `GameEntry.clearPopupLayer()` 在切换前清场**：
```ts
private clearPopupLayer(): void {
    if (!this.popupLayer) return;
    for (const child of [...this.popupLayer.children]) {
        if (child && child.isValid) child.destroy();
    }
}

// 所有切场景点调用：
startLevel()     { this.clearPopupLayer(); /* spawn UIs */ }
startEndless()   { this.clearPopupLayer(); /* spawn UIs */ }
showMainMenu()   { this.clearPopupLayer(); instantiate(mainMenu); }
onSettlement()   { this.clearPopupLayer(); instantiate(settlement); }
```

**防线 2 — Controller 监听 `MODE_SELECTED` 自销毁**：
```ts
start() {
    EventBus.getInstance().on(GameEvents.MODE_SELECTED, this.onDestroySelf, this);
}
private onDestroySelf() {
    if (this.node && this.node.isValid) this.node.destroy();
}
onDestroy() {
    EventBus.getInstance().off(GameEvents.MODE_SELECTED, this.onDestroySelf, this);
}
```

**两层互相兜底**，任何路径都不残留。

### 规范 7 — 跨 reset 状态桥接（用 SaveManager 暂存）

**问题**：`GameState.reset()` 进 Battle 时清空状态。如果外部流程（DEV 面板 / 首通奖励 / 商店购买）在 reset 之前改了 GameState 的字段，会被清。

**错**：
```ts
// DEV 面板
GameState.getInstance().equipBullet(variant, 99);  // ❌ reset 会清
selectMode(LEVEL);  // 进 Battle 后 reset 清掉装备
```

**对**（通过 `SaveManager.pendingX` 桥接）：
```ts
// DEV 面板或其他外部流程
SaveManager.getInstance().setPendingBullet(variant, 99);  // ✅ 持久化
selectMode(LEVEL);

// GameEntry.startLevel 末尾 consume：
this.fsm.changePhase(Battle);  // reset 发生
const pending = SaveManager.getInstance().consumePendingBullet();
if (pending) GameState.getInstance().equipBullet(pending.variant, pending.ammo);
```

**同一条 pending 通道复用多种场景**：首通解锁、DEV 调试、商店购买、广告奖励。

### 规范 8 — DEV 调试工具 visibility

Demo / 开发阶段的调试入口用 **真实可见按钮**，禁止长按 / 快捷键 / 隐藏手势。

```ts
// GameConfig.ts
static readonly DEV_INFINITE_ITEMS: boolean = true;  // 测试期开

// MainMenu 的 DEV 面板按钮在 start() 判断：
if (this.devPanelBtn && !GameConfig.DEV_INFINITE_ITEMS) {
    this.devPanelBtn.node.active = false;  // 正式版自动隐藏
}
```

正式版打包前**必改** `DEV_INFINITE_ITEMS = false`。

### 规范 9 — UI 预制缓存（高频切换场景）

常驻/高频切换的 UI（HUD / 暂停菜单 / 道具栏 / 结算页）**不要每次 instantiate 新节点再 destroy**，改为：
- 首次 instantiate 一次并缓存引用
- 之后 `node.active = true/false` 控制显隐

**性能对比**：instantiate 10 节点 HUD prefab 约 2-5ms / setActive 约 0.01ms。

不适用：一次性特效节点（爆炸 / 浮动文字）— 这类用 `SafePool` 对象池。

---

## 🎨 UI 常见坑

### 坑 1 — Sprite 颜色乘算导致黑色

**现象**：设 `color=(50, 50, 80)` + `spriteFrame` → 按钮显示黑色

**原因**：`_color` 和 `_spriteFrame` 是**乘算**（multiply blend），深色 tint 把贴图压到近黑。

**修法**：
- 保留贴图原色：`color=(255, 255, 255, 255)` 不 tint
- 调色：按比例算（如 `(200, 200, 240)`），不要压暗
- 透明度用 `UIOpacity` 组件，不要用低 alpha

### 坑 2 — 多层 UI 点击要挂 Button 不能用 Node.TOUCH_END

**现象**：父节点挂 `TOUCH_END`，子节点是 Label（带 UITransform），点击无响应

**原因**：Cocos 3.x UI 事件机制：任何带 UITransform 的节点默认拦截 touch，不自动冒泡。

**修法**：挂 `cc.Button` 组件 + `Button.EventType.CLICK`。

```ts
// ❌ 错
slot.on(Node.EventType.TOUCH_END, ...);

// ✅ 对
slot.addComponent(Button);  // 或 prefab 里挂好
slot.on(Button.EventType.CLICK, ...);
```

`ui_factories.make_button()` 自动挂 Button + Label 子节点。

### 坑 3 — shakeScreen 黑屏（已修）

原版 `BaseUtil.shakeScreen` 把 Camera z 归零导致黑屏。cocosSkill lib 里的版本已保留 origZ 修复。生产级参考 `EffectManager.safeShake` 的 100ms 节流实现。

---

## 📦 通用 lib/ 代码（cp 到新项目）

| 文件 | 用途 |
|---|---|
| `EventBus.ts` | 发布/订阅事件总线（跨模块通信唯一通道）|
| `SafePool.ts` | NodePool 安全存取 |
| `ResLoader.ts` | SpriteFrame 加载 |
| `SoundManager.ts` | 音效 / 音乐 |
| `AnimationManager.ts` | 序列帧动画 |
| `MathUtil.ts` | 数学工具（随机/距离/lerp） |
| `Bezier.ts` | 贝塞尔曲线 |
| `HighlightManager.ts` | 受击闪白 / 闪红 |
| `BaseUtil.ts` | 深拷贝/版本比较/灰度/震屏/坐标转换 |
| `DateUtil.ts` | 日期（签到跨日/mm:ss 格式化） |
| `ConfigLoader.ts` | JSON 配置表批量加载 + 主键索引 |

详见 [`lib/README.md`](lib/README.md)。

---

## 🛠️ scripts/ Python 工具

| 文件 | 用途 |
|---|---|
| `prefab_builder.py` | `PrefabBuilder` 类 + 关 Cocos 防呆 + UUID 压缩 + scene patch |
| `ui_factories.py` | `make_button` / `make_popup_root` / `make_label` / `make_mask` / `make_card` / `make_list_item` |

详见 [`scripts/README.md`](scripts/README.md)。

### 快速写新 prefab 生成脚本

```python
import sys
sys.path.insert(0, '.')
from scripts.prefab_builder import (
    PrefabBuilder, ensure_cocos_closed, read_script_uuid, write_prefab,
)
from scripts.ui_factories import make_popup_root, make_button, make_label

ensure_cocos_closed()  # 防呆

def build_my_popup():
    b = PrefabBuilder("MyPopup")
    parts = make_popup_root(b, "MyPopup")
    root, content = parts["root"], parts["content"]

    make_label(b, content, "标题", 0, 400, font_size=50)
    btn = make_button(b, content, "关闭", 0, -300)

    script_uuid = read_script_uuid("assets/Script/ui/MyController.ts")
    b.script(root, script_uuid, {"closeBtn": btn["button"]})
    b.attach_prefab_info(root, is_root=True)
    return b.build()

if __name__ == '__main__':
    write_prefab('assets/prefabs/MyPopup.prefab', build_my_popup())
```

---

## 🎯 新项目启动清单（6 步上手）

1. **clone + install**（上面已讲）
2. **init_project.sh 初始化目标目录**
3. **Cocos Creator 打开目录**，让它扫资源 + 编译 TS
4. **手建场景**：`GameScene.scene` 里 Canvas 下建分层
   - `blockLayer / bulletLayer / dropLayer / effectLayer / fxLayer / guideLayer / popupLayer / Player`
5. **手建业务脚本**：`GameEntry.ts` / `GameFSM.ts` / `GameState.ts` / `GameEvents.ts`（参考 ProjectDrop）
6. **按需做 prefab**：走 Python + 协调流程

详见 [`skills/cocos-prefab-crud/templates/T5-new-project-bootstrap.md`](skills/cocos-prefab-crud/templates/T5-new-project-bootstrap.md)。

---

## 🚨 Claude / AI 会自动遵守的规则（装好 cocosSkill 后）

以下 memory 会在每个 session 自动加载，你**不用每次叮嘱**：

| 规则 | memory 文件 |
|---|---|
| Python 跑前关 Cocos | `feedback_cocos_save_prompt.md` |
| 用户给 URL + 项目路径自动初始化 | `feedback_starter_workflow.md` |
| UI 残留双层防治 | `feedback_ui_residual_clear.md` |
| 跨 reset 状态桥接 | `feedback_state_bridge_via_save.md` |
| Demo 阶段 dev 工具可见化 | `feedback_demo_visibility.md` |
| Sprite 颜色乘算 | `feedback_sprite_color_multiply.md` |
| Button vs TOUCH_END | `feedback_button_vs_touch_end.md` |
| UI 预制缓存（不要每次 instantiate）| `feedback_ui_cache_vs_instantiate.md` |
| Sprite sizeMode 规则 | `feedback_sprite_sizemode.md` |
| 全屏 mask 触摸拦截 | `feedback_fullscreen_mask_design.md` |
| 图片 meta 必须有 sprite-frame | `feedback_image_meta_spriteframe.md` |

---

## 📚 进一步阅读

| 主题 | 文档 |
|---|---|
| 所有 skills 清单 | [`README.md`](README.md) |
| Prefab/Scene 增删改查纪律 | [`skills/cocos-prefab-crud/SKILL.md`](skills/cocos-prefab-crud/SKILL.md) |
| 10 个真实踩坑合集 | [`skills/cocos-prefab-crud/reference/common-pitfalls.md`](skills/cocos-prefab-crud/reference/common-pitfalls.md) |
| 编辑器刷新矩阵详细版 | [`skills/cocos-prefab-crud/reference/refresh-matrix.md`](skills/cocos-prefab-crud/reference/refresh-matrix.md) |
| 5 套 ID 系统 | [`skills/cocos-prefab-crud/reference/id-system.md`](skills/cocos-prefab-crud/reference/id-system.md) |
| 新项目启动模板 | [`skills/cocos-prefab-crud/templates/T5-new-project-bootstrap.md`](skills/cocos-prefab-crud/templates/T5-new-project-bootstrap.md) |

---

## 🔄 本文件维护规则

- 每次新项目踩到**可复用**的坑 → 补 memory 文件 + 在本文件加一节
- 只记通用规则，游戏特定的（某某关卡平衡、某某系统数值）不要写这里
- 改动后 commit 到 cocosSkill repo，下次其他机器 `git pull` 自动获得

---

**最后更新**：2026-04-20 — 来自 ProjectDrop session 的 11 条通用规则沉淀
