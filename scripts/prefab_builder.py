"""
通用 Cocos 3.8 Prefab/Scene 构造器

⚠️ 跑脚本前必须关闭 Cocos Creator。否则编辑器内存里的旧 scene 保存时会覆盖
   Python 写入的绑定。本模块自带 _ensure_cocos_closed() 检测。

用法示例（另一个脚本）：
    from prefab_builder import PrefabBuilder, read_script_uuid, write_prefab

    def build_settings_popup():
        b = PrefabBuilder("SettingsPopup")
        root = b.node("SettingsPopup", None)
        b.ui_transform(root, 600, 800)
        # ... 按需加子节点
        b.attach_prefab_info(root, is_root=True)
        return b.build()

    if __name__ == '__main__':
        write_prefab('assets/prefabs/SettingsPopup.prefab', build_settings_popup())
"""
import json
import os
import subprocess
import sys
import uuid as uuid_mod
from pathlib import Path


# =================== 防呆 + 基础工具 ===================

def ensure_cocos_closed():
    """Windows: 检测 CocosCreator.exe 正在运行就退出"""
    if sys.platform != 'win32':
        return
    try:
        out = subprocess.check_output(['tasklist'], text=True, errors='ignore')
    except Exception:
        return
    if 'CocosCreator.exe' in out:
        print('❌ 检测到 Cocos Creator 正在运行！')
        print('   请先完全退出 Cocos（任务管理器确认没有 CocosCreator.exe）再跑脚本。')
        sys.exit(1)


BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def compress_uuid(uuid_str):
    """完整 UUID → Cocos 3.x 压缩 UUID（脚本组件 __type__ 用）"""
    u = uuid_str.replace('-', '')
    result = u[:5]
    rest = u[5:]
    for i in range(0, len(rest), 3):
        chunk = int(rest[i:i + 3], 16)
        result += BASE64_CHARS[(chunk >> 6) & 63]
        result += BASE64_CHARS[chunk & 63]
    return result


def read_script_uuid(script_path):
    """从 .ts.meta 读 uuid；若缺失则生成一份新的 meta（Cocos 会接受）"""
    meta = script_path + '.meta'
    if not os.path.exists(meta):
        new_meta = {
            "ver": "4.0.24",
            "importer": "typescript",
            "imported": True,
            "uuid": str(uuid_mod.uuid4()),
            "files": [],
            "subMetas": {},
            "userData": {}
        }
        with open(meta, 'w', encoding='utf-8') as f:
            json.dump(new_meta, f, indent=2, ensure_ascii=False)
        print(f'[builder] created meta: {meta}')
    with open(meta, 'r', encoding='utf-8') as f:
        return json.load(f)['uuid']


def new_file_id():
    return compress_uuid(str(uuid_mod.uuid4()))[:22]


def find_component(b, node_id, ctype):
    """按类型名找节点下某组件 id"""
    comps = b.objects[node_id]["_components"]
    for c in comps:
        cid = c["__id__"]
        if b.objects[cid]["__type__"] == ctype:
            return cid
    return None


# =================== PrefabBuilder 核心类 ===================

class PrefabBuilder:
    """
    Cocos 3.8 prefab 的 JSON 构造器。
    用法：
      b = PrefabBuilder("MyPrefab")
      root = b.node("MyPrefab", None)     # root 必须 __id__ == 1
      b.ui_transform(root, 600, 800)
      btn = b.node("btn", root, lpos=(0, 100, 0))
      b.add_child(root, btn)
      b.ui_transform(btn, 200, 80)
      b.sprite(btn, color=(255,255,255,255), sprite_frame_uuid="...")
      b.button(btn)
      lbl_node = b.node("label", btn)
      b.add_child(btn, lbl_node)
      b.ui_transform(lbl_node, 180, 70)
      b.label(lbl_node, "点我", font_size=40, color=(60,30,10,255))
      b.attach_prefab_info(btn)
      b.attach_prefab_info(lbl_node)
      b.attach_prefab_info(root, is_root=True)
      return b.build()

    注意事项：
    - root 节点必须是第一个创建的节点（会检查 __id__ == 1）
    - 每个节点创建完都要 attach_prefab_info() 附加 PrefabInfo
    - Script 组件绑 @property 用 b.script(node_id, script_uuid, {属性名: __id__ 或 __uuid__ dict})
    """

    def __init__(self, root_name):
        self.root_name = root_name
        self.objects = []
        self.prefab_asset_id = 0
        self.objects.append(None)  # asset 占位，build() 时填

    def add(self, obj):
        idx = len(self.objects)
        self.objects.append(obj)
        return idx

    def node(self, name, parent_id, lpos=(0, 0, 0), active=True):
        """创建 Node，返回 __id__"""
        node_idx = len(self.objects)
        self.objects.append({
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_parent": {"__id__": parent_id} if parent_id is not None else None,
            "_children": [],
            "_active": active,
            "_components": [],
            "_prefab": None,
            "_lpos": {"__type__": "cc.Vec3", "x": lpos[0], "y": lpos[1], "z": lpos[2]},
            "_lrot": {"__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1},
            "_lscale": {"__type__": "cc.Vec3", "x": 1, "y": 1, "z": 1},
            "_mobility": 0,
            "_layer": 1073741824,
            "_euler": {"__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0},
            "_id": "",
        })
        return node_idx

    def attach_prefab_info(self, node_id, is_root=False):
        info_id = len(self.objects)
        self.objects.append({
            "__type__": "cc.PrefabInfo",
            "root": {"__id__": 1},
            "asset": {"__id__": 0},
            "fileId": new_file_id(),
            "instance": None,
            "targetOverrides": None,
        })
        self.objects[node_id]["_prefab"] = {"__id__": info_id}
        return info_id

    def comp_prefab_info(self):
        idx = len(self.objects)
        self.objects.append({
            "__type__": "cc.CompPrefabInfo",
            "fileId": new_file_id()[:22],
        })
        return idx

    # ============ 组件生成 ============

    def ui_transform(self, node_id, w, h, anchor=(0.5, 0.5)):
        cid = len(self.objects)
        self.objects.append({
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": {"__id__": cid + 1},
            "_contentSize": {"__type__": "cc.Size", "width": w, "height": h},
            "_anchorPoint": {"__type__": "cc.Vec2", "x": anchor[0], "y": anchor[1]},
            "_id": "",
        })
        self.comp_prefab_info()
        self.objects[node_id]["_components"].append({"__id__": cid})
        return cid

    def sprite(self, node_id, color=(255, 255, 255, 255), sprite_frame_uuid=None, size_mode=0):
        cid = len(self.objects)
        sf = None
        if sprite_frame_uuid:
            sf = {"__uuid__": sprite_frame_uuid, "__expectedType__": "cc.SpriteFrame"}
        self.objects.append({
            "__type__": "cc.Sprite",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": {"__id__": cid + 1},
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": {"__type__": "cc.Color", "r": color[0], "g": color[1], "b": color[2], "a": color[3]},
            "_spriteFrame": sf,
            "_type": 0,
            "_fillType": 0,
            "_sizeMode": size_mode,
            "_fillCenter": {"__type__": "cc.Vec2", "x": 0, "y": 0},
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": True,
            "_useGrayscale": False,
            "_atlas": None,
            "_id": "",
        })
        self.comp_prefab_info()
        self.objects[node_id]["_components"].append({"__id__": cid})
        return cid

    def label(self, node_id, text, font_size=30, color=(255, 255, 255, 255), h_align=1, v_align=1):
        cid = len(self.objects)
        self.objects.append({
            "__type__": "cc.Label",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": {"__id__": cid + 1},
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": {"__type__": "cc.Color", "r": color[0], "g": color[1], "b": color[2], "a": color[3]},
            "_string": text,
            "_horizontalAlign": h_align,
            "_verticalAlign": v_align,
            "_actualFontSize": font_size,
            "_fontSize": font_size,
            "_fontFamily": "Arial",
            "_lineHeight": int(font_size * 1.25),
            "_overflow": 0,
            "_enableWrapText": True,
            "_font": None,
            "_isSystemFontUsed": True,
            "_spacingX": 0,
            "_isItalic": False,
            "_isBold": False,
            "_isUnderline": False,
            "_underlineHeight": 2,
            "_cacheMode": 0,
            "_enableOutline": False,
            "_outlineColor": {"__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 255},
            "_outlineWidth": 2,
            "_enableShadow": False,
            "_shadowColor": {"__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 255},
            "_shadowOffset": {"__type__": "cc.Vec2", "x": 2, "y": 2},
            "_shadowBlur": 2,
            "_id": "",
        })
        self.comp_prefab_info()
        self.objects[node_id]["_components"].append({"__id__": cid})
        return cid

    def button(self, node_id):
        cid = len(self.objects)
        self.objects.append({
            "__type__": "cc.Button",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": {"__id__": cid + 1},
            "clickEvents": [],
            "_interactable": True,
            "_transition": 3,  # SCALE transition，按下缩放反馈
            "_normalColor": {"__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255},
            "_hoverColor": {"__type__": "cc.Color", "r": 211, "g": 211, "b": 211, "a": 255},
            "_pressedColor": {"__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255},
            "_disabledColor": {"__type__": "cc.Color", "r": 124, "g": 124, "b": 124, "a": 255},
            "_normalSprite": None,
            "_hoverSprite": None,
            "_pressedSprite": None,
            "_disabledSprite": None,
            "_duration": 0.1,
            "_zoomScale": 1.1,
            "_target": {"__id__": node_id},
            "_id": "",
        })
        self.comp_prefab_info()
        self.objects[node_id]["_components"].append({"__id__": cid})
        return cid

    def widget(self, node_id, align=45):
        """Widget 屏幕适配；align 是 alignFlags 位掩码。
        常用：
          45 = top+bottom+left+right（全屏铺满）
          9 = left+bottom
          18 = top+right
          5 = left+top
        """
        cid = len(self.objects)
        self.objects.append({
            "__type__": "cc.Widget",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": {"__id__": cid + 1},
            "_alignFlags": align,
            "_target": None,
            "_left": 0, "_right": 0, "_top": 0, "_bottom": 0,
            "_horizontalCenter": 0, "_verticalCenter": 0,
            "_isAbsLeft": True, "_isAbsRight": True, "_isAbsTop": True, "_isAbsBottom": True,
            "_isAbsHorizontalCenter": True, "_isAbsVerticalCenter": True,
            "_originalWidth": 0, "_originalHeight": 0,
            "_alignMode": 2,
            "_lockFlags": 0,
            "_id": "",
        })
        self.comp_prefab_info()
        self.objects[node_id]["_components"].append({"__id__": cid})
        return cid

    def ui_opacity(self, node_id, opacity=255):
        cid = len(self.objects)
        self.objects.append({
            "__type__": "cc.UIOpacity",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": {"__id__": cid + 1},
            "_opacity": opacity,
            "_id": "",
        })
        self.comp_prefab_info()
        self.objects[node_id]["_components"].append({"__id__": cid})
        return cid

    def script(self, node_id, script_uuid, property_bindings):
        """挂自定义 TypeScript 组件，property_bindings: {属性名: __id__ 或 {__uuid__: ...} dict 或 list}"""
        cid = len(self.objects)
        compressed = compress_uuid(script_uuid)
        comp = {
            "__type__": compressed,
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": {"__id__": node_id},
            "_enabled": True,
            "__prefab": {"__id__": cid + 1},
            "_id": "",
        }
        for k, v in property_bindings.items():
            if isinstance(v, int):
                comp[k] = {"__id__": v}  # 同文件引用
            else:
                comp[k] = v  # 已经是 dict / list 结构
        self.objects.append(comp)
        self.comp_prefab_info()
        self.objects[node_id]["_components"].append({"__id__": cid})
        return cid

    def add_child(self, parent_id, child_id):
        self.objects[parent_id]["_children"].append({"__id__": child_id})

    def build(self):
        """装配 prefab asset 到 __id__ 0，root 在 __id__ 1"""
        self.objects[0] = {
            "__type__": "cc.Prefab",
            "_name": self.root_name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {"__id__": 1},
            "optimizationPolicy": 0,
            "persistent": False,
        }
        return self.objects


# =================== 写文件工具 ===================

def write_prefab(path, objects):
    """写 prefab 到 path，同时补 .meta 文件（如没有）"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(objects, f, indent=2, ensure_ascii=False)

    meta_path = str(path) + '.meta'
    if not os.path.exists(meta_path):
        name = path.stem
        meta = {
            "ver": "1.1.50",
            "importer": "prefab",
            "imported": True,
            "uuid": str(uuid_mod.uuid4()),
            "files": [".json"],
            "subMetas": {},
            "userData": {"syncNodeName": name, "hasIcon": False}
        }
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)
    print(f'[builder] {path}')


def read_prefab_uuid(prefab_path):
    """读 prefab.meta 的 uuid，用于 scene 引用"""
    meta = prefab_path + '.meta'
    with open(meta, 'r', encoding='utf-8') as f:
        return json.load(f)['uuid']


def patch_scene_prefab_ref(scene_path, component_type_compressed, field_name, prefab_uuid):
    """把 prefab 的 uuid 注入到 scene 里某个组件的 @property 字段。
    typically 用于 GameEntry 组件引用一堆 prefab。

    返回是否写入成功。"""
    with open(scene_path, 'r', encoding='utf-8') as f:
        scene = json.load(f)

    ref = {"__uuid__": prefab_uuid, "__expectedType__": "cc.Prefab"}
    patched = False
    for obj in scene:
        if isinstance(obj, dict) and obj.get('__type__', '') == component_type_compressed:
            obj[field_name] = ref
            patched = True
            break

    if patched:
        with open(scene_path, 'w', encoding='utf-8') as f:
            json.dump(scene, f, indent=2, ensure_ascii=False)
    return patched
