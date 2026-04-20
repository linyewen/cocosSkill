# T5 · 新项目启动清单

## 适用场景

开启一个全新的 Cocos Creator 3.8 游戏项目。

## 前置假设

用户已 clone `cocosSkill` 仓库（`git clone https://github.com/linyewen/cocosSkill.git`），其中 `lib/` 有 TS 运行时库，`scripts/` 有 Python 工具。

## 步骤（按顺序）

### 1. 从 cocosSkill 复制基础设施到新项目

```bash
# 创建新项目目录（先 Cocos Creator 新建项目然后用命令拷贝）
mkdir -p your-new-game/assets/Script/infra
mkdir -p your-new-game/scripts

# 从 cocosSkill 拷贝
cp cocosSkill/lib/*.ts your-new-game/assets/Script/infra/
cp cocosSkill/scripts/*.py your-new-game/scripts/
```

这时 `your-new-game/` 里有：
- `assets/Script/infra/*.ts` — 11 个运行时基础模块（EventBus/SoundManager/SafePool/DateUtil/ConfigLoader 等）
- `scripts/prefab_builder.py` + `ui_factories.py` — Python 工具

### 2. Cocos Creator 打开 `new-game/`

- 如果是全新 Cocos 项目：`File > Open Project` 选目录，编辑器会生成 `project.json` 等文件
- 如果从 starter 派生且 starter 本身是 Cocos 项目：直接 Open
- 让 Cocos 扫完 assets，控制台出现 `TypeScript compile succeed` 再下一步

### 3. 建 Canvas + 基础分层

**编辑器手建**（不要 Python）：
- 新场景 `assets/scenes/GameScene.scene`
- Canvas 下建：
  - `blockLayer` (Node + UITransform 填满)
  - `bulletLayer`
  - `dropLayer`
  - `effectLayer`
  - `fxLayer`
  - `guideLayer`
  - `popupLayer` (Z 最高，弹窗用)
  - `Player` (你的玩家节点)

### 4. 新建业务脚本（TS）

手动建：
- `assets/Script/app/GameEntry.ts` — 挂 Canvas 根节点
- `assets/Script/app/GameFSM.ts` — 战斗 / 结算 / 引导状态机
- `assets/Script/data/GameState.ts` — 可变状态
- `assets/Script/data/GameEvents.ts` — 事件名常量

参考 ProjectDrop 的同名文件作模板。

### 5. 业务 prefab 生成（Python）

```bash
# 先关 Cocos（prefab_builder 自带防呆）
# 建 scripts/gen_prefabs.py
```

示例 `gen_prefabs.py`：

```python
import sys
sys.path.insert(0, '.')  # 引用本目录下的 prefab_builder 和 ui_factories

from scripts.prefab_builder import PrefabBuilder, ensure_cocos_closed, read_script_uuid, write_prefab, compress_uuid
from scripts.ui_factories import make_popup_root, make_button, make_label

ensure_cocos_closed()

def build_main_menu():
    b = PrefabBuilder("MainMenuPrefab")
    parts = make_popup_root(b, "MainMenuPrefab")
    root, content = parts["root"], parts["content"]

    make_label(b, content, "我的游戏", 0, 400, font_size=60)

    btn1 = make_button(b, content, "开始", 0, 160)
    btn2 = make_button(b, content, "设置", 0, 40)

    script_uuid = read_script_uuid("assets/Script/ui/MainMenuController.ts")
    b.script(root, script_uuid, {
        "startBtn": btn1["button"],
        "settingsBtn": btn2["button"],
    })
    b.attach_prefab_info(root, is_root=True)
    return b.build()

if __name__ == '__main__':
    write_prefab('assets/prefabs/MainMenuPrefab.prefab', build_main_menu())
```

### 6. 重要：按"新 @property 协调流程"绑定

如果 GameEntry.ts 上有 `@property(Prefab) mainMenuPrefab` 这类字段要 Python 补绑定：

1. 先**启动 Cocos** → 等 TS 编译完成
2. **完全关闭 Cocos**
3. 跑 `python scripts/gen_prefabs.py`
4. 重新启动 Cocos → Inspector 里 GameEntry 的 prefab 引用字段应该有值

**顺序搞反的话**：绑定会被 Cocos 清成 null（见 common-pitfalls.md P2）

### 7. 验证清单

- [ ] `temp/tsconfig.cocos.json` 自动生成（说明 Cocos 识别 TS）
- [ ] Console 没有 `Missing component` 错误
- [ ] GameEntry 的 @property 面板无红色 null
- [ ] Play 一次能看到 MainMenu

## 常用 infra 启用时机

| 模块 | 什么时候引入 |
|---|---|
| EventBus | 一开始就用（组件间通信的唯一通道） |
| SafePool | 第一个高频对象出现时（子弹 / 金币 / 方块） |
| SoundManager | 加第一个音效时 |
| DateUtil | 做签到 / 每日任务时 |
| ConfigLoader | 有配置表（超过 10 条数据）时 |
| AnimationManager | 加帧动画时 |
| Bezier | 做抛物线 / 拟物运动时 |
| HighlightManager | 做新手引导时 |

## 反模式（别这样启动项目）

- ❌ 不用 starter 每次从零手建 infra 目录
- ❌ Python 从零生成 GameScene.scene 结构
- ❌ 跳过"关 Cocos 再跑 Python"步骤
- ❌ 等 @property 绑定丢了再补

## 参考

- `cocosSkill/README.md` — 仓库总说明
- `cocosSkill/lib/README.md` — infra 模块用法
- `cocosSkill/skills/cocos-prefab-crud/reference/common-pitfalls.md` — 10 个踩坑合集
- `cocosSkill/skills/cocos-prefab-crud/reference/refresh-matrix.md` — 编辑器刷新矩阵（4 档）
