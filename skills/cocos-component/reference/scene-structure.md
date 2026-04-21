# Scene 骨架组件 JSON 字典

PrefabInfo / Scene 骨架 / Camera / Canvas / AudioSource 完整模板。

---

## PrefabInfo

根节点的 PrefabInfo（在所有组件之后）：

```json
{
  "__type__": "cc.PrefabInfo",
  "root": { "__id__": 1 },
  "asset": { "__id__": 0 },
  "fileId": "rootNode"
}
```

子节点的 PrefabInfo：

```json
{
  "__type__": "cc.PrefabInfo",
  "root": { "__id__": 1 },
  "asset": { "__id__": 0 },
  "fileId": "iconNode"
}
```

- `root` 始终指向根节点（`__id__: 1`）
- `asset` 始终指向 Prefab 对象（`__id__: 0`）
- `fileId` 在整个 prefab 内唯一

---

## Scene 完整骨架模板

```json
[
  { "__type__": "cc.SceneAsset", "_name": "GameScene", "scene": { "__id__": 1 } },
  {
    "__type__": "cc.Scene", "_name": "GameScene",
    "_parent": null,
    "_children": [{ "__id__": 2 }],
    "_active": true, "_components": [],
    "_prefab": null,
    "_lpos": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
    "_lrot": { "__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1 },
    "_lscale": { "__type__": "cc.Vec3", "x": 1, "y": 1, "z": 1 },
    "_mobility": 0, "_layer": 1073741824,
    "_euler": { "__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0 },
    "autoReleaseAssets": false,
    "_globals": { "__id__": N },
    "_id": "场景UUID"
  },
  // [2] Canvas 节点（Camera 必须是 Canvas 的子节点！）...
  // [3] Camera 节点（Canvas 的第一个子节点）...
  // [4] cc.Camera 组件 ...
  // ... 游戏节点（都是 Canvas 的子节点）...
  // [N] cc.SceneGlobals + 8 个子对象（见下方）
  // ⚠️ Scene 只有一个子节点 Canvas，Camera 在 Canvas 内部
]
```

### cc.SceneGlobals 标准模板（直接复制，不需要改）

```json
{ "__type__": "cc.SceneGlobals",
  "ambient": {"__id__": "N+1"}, "shadows": {"__id__": "N+2"},
  "_skybox": {"__id__": "N+3"}, "fog": {"__id__": "N+4"},
  "octree": {"__id__": "N+5"}, "skin": {"__id__": "N+6"},
  "lightProbeInfo": {"__id__": "N+7"}, "postSettings": {"__id__": "N+8"},
  "bakedWithStationaryMainLight": false, "bakedWithHighpLightmap": false
},
{ "__type__": "cc.AmbientInfo",
  "_skyColorHDR": {"__type__":"cc.Vec4","x":0,"y":0,"z":0,"w":0.520833125},
  "_skyColor": {"__type__":"cc.Vec4","x":0,"y":0,"z":0,"w":0.520833125},
  "_skyIllumHDR": 20000, "_skyIllum": 20000,
  "_groundAlbedoHDR": {"__type__":"cc.Vec4","x":0,"y":0,"z":0,"w":0},
  "_groundAlbedo": {"__type__":"cc.Vec4","x":0,"y":0,"z":0,"w":0},
  "_skyColorLDR": {"__type__":"cc.Vec4","x":0.2,"y":0.5,"z":0.8,"w":1},
  "_skyIllumLDR": 20000,
  "_groundAlbedoLDR": {"__type__":"cc.Vec4","x":0.2,"y":0.2,"z":0.2,"w":1}
},
{ "__type__": "cc.ShadowsInfo", "_enabled": false, "_type": 0 },
{ "__type__": "cc.SkyboxInfo", "_enabled": false, "_envmapHDR": null, "_envmapLDR": null, "_rotationAngle": 0 },
{ "__type__": "cc.FogInfo", "_enabled": false, "_fogDensity": 0.3, "_fogStart": 0.5, "_fogEnd": 300 },
{ "__type__": "cc.OctreeInfo", "_enabled": false, "_minPos": {"__type__":"cc.Vec3","x":-1024,"y":-1024,"z":-1024}, "_maxPos": {"__type__":"cc.Vec3","x":1024,"y":1024,"z":1024}, "_depth": 8 },
{ "__type__": "cc.SkinInfo", "_enabled": false },
{ "__type__": "cc.LightProbeInfo", "_giScale": 1, "_giSamples": 1024, "_bounces": 2 },
{ "__type__": "cc.PostSettingsInfo", "_toneMappingType": 0 }
```

---

## cc.Camera 完整模板

```json
{
  "__type__": "cc.Camera",
  "node": { "__id__": 3 },
  "_enabled": true, "__prefab": null,
  "_projection": 0,
  "_priority": 0,
  "_fov": 45,
  "_fovAxis": 0,
  "_orthoHeight": 580,
  "_near": 0,
  "_far": 2000,
  "_color": { "__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 255 },
  "_depth": 1,
  "_stencil": 0,
  "_clearFlags": 7,
  "_rect": { "__type__": "cc.Rect", "x": 0, "y": 0, "width": 1, "height": 1 },
  "_aperture": 19,
  "_shutter": 7,
  "_iso": 0,
  "_screenScale": 1,
  "_visibility": 1108344832,
  "_targetTexture": null,
  "_postProcess": null,
  "_usePostProcess": false,
  "_cameraType": -1,
  "_trackingType": 0,
  "_id": ""
}
```

### Camera 关键字段说明

| 字段 | 值 | 说明 |
|------|-----|------|
| `_projection` | `0` | **0=ORTHO（正交）**，1=PERSPECTIVE（透视）。2D 游戏必须用 0 |
| `_orthoHeight` | designH/2 | 设计高度的一半。600×1160 → 580 |
| `_near` | `0` | 近裁剪面 |
| `_far` | `2000` | 远裁剪面，必须 > Camera 的 z 值 |
| `_clearFlags` | `7` | 7=全清除(COLOR+DEPTH+STENCIL)，6=不清颜色，14=不清模板 |
| `_visibility` | `1108344832` | 层渲染掩码，一般不改 |
| Camera 节点 z | `1000` | 必须 > 0 才能看到 2D 内容 |

**Camera 必须是 Canvas 的子节点**（详见 `scene-setup` skill）。

---

## cc.Canvas 组件

```json
{
  "__type__": "cc.Canvas",
  "node": { "__id__": 2 },
  "_enabled": true, "__prefab": null,
  "_cameraComponent": { "__id__": 4 },
  "_alignCanvasWithScreen": true,
  "_id": ""
}
```

**关键**：`_cameraComponent` 必须指向 `cc.Camera` 组件的 `__id__`，否则黑屏。

---

## cc.AudioSource

```json
{
  "__type__": "cc.AudioSource",
  "node": { "__id__": N },
  "_enabled": true, "__prefab": null,
  "_clip": null,
  "_loop": false,
  "_playOnAwake": false,
  "_volume": 1,
  "_id": ""
}
```

AudioClip 引用格式：
```json
"_clip": {
  "__uuid__": "87e5f91a-4420-40fb-818d-3fe2581e2b7b",
  "__expectedType__": "cc.AudioClip"
}
```

---

## Prefab vs Scene 的区别

| 特征 | Prefab | Scene |
|------|--------|-------|
| 根对象 `__type__` | `cc.Prefab` | `cc.SceneAsset` |
| 根节点 `__type__` | `cc.Node` | `cc.Scene` |
| `_prefab` 字段 | 有值（指向 PrefabInfo） | `null` |
| `__prefab` 字段 | 组件上有（CompPrefabInfo） | 组件上没有 |
| 节点的 `_layer` | `1073741824`（实测） | `1073741824` |
| 额外字段 | — | `_globals`、`autoReleaseAssets` |
