"""
常见 UI 模式快捷生成函数

建立在 prefab_builder.PrefabBuilder 之上，封装高频 UI 模式：
- make_button: 按钮 = sprite 底 + Button 组件 + label 子节点
- make_label:  独立文字节点
- make_mask:   半透明全屏遮罩（弹窗用）
- make_popup_root: 弹窗标准骨架（mask + content 容器）
- make_list_item: 列表项模板（sprite 背景 + label + 点击事件）
- make_card:   展示卡（图标 + 名字 + 数字角标）

所有函数返回 dict 含相关 id 字段，方便后续绑定。
"""
from prefab_builder import PrefabBuilder, find_component


# =================== 通用 UI 资源占位 ===================

# 常用纯色/图片占位（项目复制时按需替换为自己项目的 uuid）
DEFAULT_BG_UUID = None   # 背景图，None 时纯色
DEFAULT_BTN_UUID = None  # 按钮底图


def make_button(b: PrefabBuilder, parent_id: int, text: str, x: float, y: float,
                w: int = 300, h: int = 90, sprite_uuid: str = None,
                btn_color=(255, 255, 255, 255), text_color=(60, 30, 10, 255),
                font_size: int = 40) -> dict:
    """
    生成按钮节点（sprite 底 + Button + Label 子节点）
    返回: { "node": btn_id, "button": button_comp_id, "label": label_comp_id }
    """
    btn = b.node(f"btn_{text}", parent_id, lpos=(x, y, 0))
    b.add_child(parent_id, btn)
    b.ui_transform(btn, w, h)
    b.sprite(btn, color=btn_color, sprite_frame_uuid=sprite_uuid, size_mode=1)
    b.button(btn)
    b.attach_prefab_info(btn)

    lbl_node = b.node("label", btn)
    b.add_child(btn, lbl_node)
    b.ui_transform(lbl_node, w - 20, h - 20)
    label_comp = b.label(lbl_node, text, font_size=font_size, color=text_color)
    b.attach_prefab_info(lbl_node)

    return {
        "node": btn,
        "button": find_component(b, btn, "cc.Button"),
        "label": label_comp,
        "labelNode": lbl_node,
    }


def make_label(b: PrefabBuilder, parent_id: int, text: str, x: float, y: float,
               w: int = 400, h: int = 50, font_size: int = 32,
               color=(255, 255, 255, 255), h_align: int = 1) -> dict:
    """
    独立 Label 节点
    h_align: 0=left 1=center 2=right
    返回: { "node": node_id, "label": label_comp_id }
    """
    node = b.node("label", parent_id, lpos=(x, y, 0))
    b.add_child(parent_id, node)
    b.ui_transform(node, w, h)
    label_comp = b.label(node, text, font_size=font_size, color=color, h_align=h_align)
    b.attach_prefab_info(node)
    return {"node": node, "label": label_comp}


def make_mask(b: PrefabBuilder, parent_id: int, color=(0, 0, 0, 200),
              sprite_uuid: str = None, canvas_w: int = 600, canvas_h: int = 1167) -> int:
    """
    半透明全屏遮罩（弹窗用，拦截下层点击）
    返回: mask node id
    """
    mask = b.node("mask", parent_id)
    b.add_child(parent_id, mask)
    b.ui_transform(mask, canvas_w, canvas_h)
    b.sprite(mask, color=color, sprite_frame_uuid=sprite_uuid)
    b.attach_prefab_info(mask)
    return mask


def make_popup_root(b: PrefabBuilder, name: str, mask_color=(0, 0, 0, 200),
                    mask_sprite_uuid: str = None,
                    canvas_w: int = 600, canvas_h: int = 1167) -> dict:
    """
    弹窗标准骨架：root + mask + content 容器
    返回: { "root": root_id, "mask": mask_id, "content": content_id }
    """
    root = b.node(name, None)
    assert root == 1, "root 必须是第一个创建的节点（__id__ == 1）"

    mask = make_mask(b, root, color=mask_color, sprite_uuid=mask_sprite_uuid,
                    canvas_w=canvas_w, canvas_h=canvas_h)

    content = b.node("content", root)
    b.add_child(root, content)
    b.attach_prefab_info(content)

    b.ui_transform(root, canvas_w, canvas_h)
    b.widget(root, 45)  # 全屏铺满

    return {"root": root, "mask": mask, "content": content}


def make_list_item(b: PrefabBuilder, parent_id: int, name: str, x: float, y: float,
                   w: int = 500, h: int = 100, sprite_uuid: str = None,
                   bg_color=(50, 50, 80, 220)) -> dict:
    """
    列表项（可点击 row），带 Button 让点击不被子节点吞
    返回: { "node": node_id, "button": button_comp_id }
    """
    item = b.node(name, parent_id, lpos=(x, y, 0))
    b.add_child(parent_id, item)
    b.ui_transform(item, w, h)
    b.sprite(item, color=bg_color, sprite_frame_uuid=sprite_uuid, size_mode=1)
    b.button(item)
    b.attach_prefab_info(item)
    return {
        "node": item,
        "button": find_component(b, item, "cc.Button"),
    }


def make_card(b: PrefabBuilder, parent_id: int, x: float, y: float,
              w: int = 120, h: int = 100, bg_sprite_uuid: str = None,
              bg_color=(255, 255, 255, 255),
              show_button: bool = True) -> dict:
    """
    展示卡片（带名字 + 数字角标），可选 Button 点击
    返回: { "node": node_id, "name": name_label_id, "count": count_label_id, "button": button_id }
    """
    card = b.node("card", parent_id, lpos=(x, y, 0))
    b.add_child(parent_id, card)
    b.ui_transform(card, w, h)
    b.sprite(card, color=bg_color, sprite_frame_uuid=bg_sprite_uuid, size_mode=1)
    btn_comp = None
    if show_button:
        b.button(card)
        btn_comp = find_component(b, card, "cc.Button")
    b.attach_prefab_info(card)

    name_node = b.node("name", card, lpos=(0, h * 0.18, 0))
    b.add_child(card, name_node)
    b.ui_transform(name_node, w - 10, h * 0.4)
    name_comp = b.label(name_node, "—", font_size=int(w * 0.16), color=(60, 30, 10, 255))
    b.attach_prefab_info(name_node)

    count_node = b.node("count", card, lpos=(0, -h * 0.22, 0))
    b.add_child(card, count_node)
    b.ui_transform(count_node, w - 10, h * 0.35)
    count_comp = b.label(count_node, "", font_size=int(w * 0.2), color=(200, 50, 10, 255))
    b.attach_prefab_info(count_node)

    return {
        "node": card,
        "name": name_comp,
        "count": count_comp,
        "button": btn_comp,
    }
