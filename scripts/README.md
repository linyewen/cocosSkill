# Cocos Creator Python 工具库

从实际项目沉淀的开发时工具。新项目 `cp scripts/*.py your-project/scripts/` 即可用。

## 文件清单

| 文件 | 用途 |
|---|---|
| `prefab_builder.py` | `PrefabBuilder` 类 — Cocos 3.8 prefab/scene JSON 构造器 + UUID 处理 + Cocos 进程防呆 |
| `ui_factories.py` | `make_button` / `make_popup_root` / `make_label` / `make_card` / `make_mask` — 高频 UI 模式 |

## 最小可用例子

```python
# your-project/scripts/gen_prefabs.py
import sys
sys.path.insert(0, '.')
from scripts.prefab_builder import (
    PrefabBuilder, ensure_cocos_closed, read_script_uuid, write_prefab,
)
from scripts.ui_factories import make_popup_root, make_button, make_label

ensure_cocos_closed()  # 防呆：Cocos 在跑就退出

def build_settings_popup():
    b = PrefabBuilder("SettingsPopup")
    parts = make_popup_root(b, "SettingsPopup")
    root, content = parts["root"], parts["content"]

    make_label(b, content, "设置", 0, 400, font_size=54)
    close_btn = make_button(b, content, "关闭", 0, -300)

    script_uuid = read_script_uuid("assets/Script/ui/SettingsController.ts")
    b.script(root, script_uuid, {"closeBtn": close_btn["button"]})
    b.attach_prefab_info(root, is_root=True)
    return b.build()

if __name__ == '__main__':
    write_prefab('assets/prefabs/SettingsPopup.prefab', build_settings_popup())
```

## 红线（跑脚本前必读）

1. **必须关闭 Cocos Creator 再跑**（`prefab_builder.ensure_cocos_closed()` 会自动检测并退出）
2. **不用 Python 生成 prefab 结构**（新节点/新层级）— 只改已有节点的字段值，结构走编辑器
3. **新加 `@property` 字段后**，顺序必须是：启动 Cocos 编译 TS → 关 Cocos → 跑 Python → 开 Cocos

详见 `skills/cocos-prefab-crud/reference/refresh-matrix.md` 和 `common-pitfalls.md`。

## `ui_factories.py` 函数一览

| 函数 | 生成 | 返回 |
|---|---|---|
| `make_button(b, parent, text, x, y, ...)` | sprite 底 + cc.Button + Label 子节点 | `{node, button, label, labelNode}` |
| `make_label(b, parent, text, x, y, ...)` | 独立 Label 节点 | `{node, label}` |
| `make_mask(b, parent, color, ...)` | 全屏遮罩（Sprite）| `mask_id` |
| `make_popup_root(b, name, ...)` | 弹窗骨架（root + mask + content）| `{root, mask, content}` |
| `make_list_item(b, parent, name, x, y, ...)` | 可点击列表行（Sprite + Button）| `{node, button}` |
| `make_card(b, parent, x, y, ...)` | 卡片（sprite + 名字 + 数字角标）| `{node, name, count, button}` |

## 如果遇到问题

- **"绑定变 null"** → 见 `skills/cocos-prefab-crud/reference/common-pitfalls.md` P1-P2
- **"按钮点不动"** → P4
- **"按钮变黑"** → P5
- **"震屏后黑屏"** → P6
- **所有 10 个踩坑** → `reference/common-pitfalls.md` 完整清单
