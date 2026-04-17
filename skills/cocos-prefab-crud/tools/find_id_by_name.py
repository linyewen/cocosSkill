"""在 prefab/scene JSON 里按节点 _name 定位 __id__

用法:
    python find_id_by_name.py <prefab_or_scene_path> <_name>
    python find_id_by_name.py assets/prefabs/MainMenuPrefab.prefab btnLevel

输出:
    [Node] btnLevel at __id__ 8
      └─ cc.UITransform @ __id__ 9
      └─ cc.Sprite      @ __id__ 10
      └─ cc.Button      @ __id__ 11
      └─ cc.CompPrefabInfo @ __id__ ...

可选:
    --component <type>    只列某类型组件 (如 cc.Button)
    --all                 列出所有匹配的节点（默认第一个）
"""
import sys
import json
from pathlib import Path


def find_node_by_name(data, name, only_first=True):
    """返回所有匹配 _name 的 node 的 __id__ 列表"""
    results = []
    for i, obj in enumerate(data):
        if not isinstance(obj, dict):
            continue
        if obj.get('__type__') == 'cc.Node' and obj.get('_name') == name:
            results.append(i)
            if only_first:
                break
    return results


def list_components(data, node_id, filter_type=None):
    """列出节点下所有组件 __id__"""
    node = data[node_id]
    comps = []
    for c in node.get('_components', []):
        cid = c['__id__']
        ctype = data[cid].get('__type__', '')
        if filter_type is None or ctype == filter_type:
            comps.append((cid, ctype))
    return comps


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    path = Path(sys.argv[1])
    target_name = sys.argv[2]
    filter_type = None
    all_match = False

    for arg in sys.argv[3:]:
        if arg == '--all':
            all_match = True
        elif arg.startswith('--component'):
            if '=' in arg:
                filter_type = arg.split('=', 1)[1]
            else:
                idx = sys.argv.index(arg)
                filter_type = sys.argv[idx + 1]

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    node_ids = find_node_by_name(data, target_name, only_first=not all_match)
    if not node_ids:
        print(f'[NOT FOUND] node named "{target_name}" in {path}')
        sys.exit(2)

    for nid in node_ids:
        print(f'[Node] {target_name} at __id__ {nid}')
        comps = list_components(data, nid, filter_type)
        for cid, ctype in comps:
            print(f'  └─ {ctype:30s} @ __id__ {cid}')
        # 子节点
        children = data[nid].get('_children', [])
        if children:
            print(f'  _children: {[c["__id__"] for c in children]}')


if __name__ == '__main__':
    main()
