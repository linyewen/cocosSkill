# Cocos Creator 3.x 通用代码库

从实际项目中提炼的基础设施代码，适用于任何 Cocos Creator 3.x 游戏。

## 使用方式

将需要的文件复制到你项目的 `assets/Script/infra/`（或 `assets/Script/util/`）目录下即可。

## 文件清单

| 文件 | 功能 | 依赖 |
|------|------|------|
| **EventBus.ts** | 发布/订阅事件总线 | 无（纯 TypeScript） |
| **SafePool.ts** | NodePool 安全存取，跳过已销毁节点 | cc.NodePool |
| **ResLoader.ts** | SpriteFrame 加载，自动兜底 `/spriteFrame` 路径 | cc.resources |
| **SoundManager.ts** | 音乐/音效管理，音量控制，开关 | cc.AudioSource |
| **AnimationManager.ts** | 序列帧动画播放，自动缓存 | cc.Sprite, cc.resources |
| **MathUtil.ts** | 数学工具：随机数、距离、贝塞尔曲线 | cc.Vec2 |
| **Bezier.ts** | 可视化贝塞尔曲线路径编辑 + 运行时沿线移动 | cc.Graphics, cc.tween |
| **HighlightManager.ts** | 受击闪白/闪红材质切换效果 | cc.Material, cc.Sprite |
| **BaseUtil.ts** | 通用工具：深拷贝、版本比较、灰度、**震屏（已修 z 归零黑屏 bug）**、坐标转换 | cc 基础模块 |
| **DateUtil.ts** | 日期工具：跨日判断（签到）、mm:ss 格式化、秒数到下次刷新时间 | 无（纯 TypeScript） |
| **ConfigLoader.ts** | 配置表加载：resources/config/\*.json 批量加载 + 按主键索引 + 过滤 | cc.resources, cc.JsonAsset |

## 各文件说明

### EventBus.ts
```typescript
EventBus.getInstance().on('enemy:die', this.onEnemyDie, this);
EventBus.getInstance().emit('enemy:die', { position, reward });
EventBus.getInstance().offTarget(this);  // onDestroy 时清理
```

### SafePool.ts
```typescript
import { safePoolGet, safePoolPut } from './SafePool';

let node = safePoolGet(this.pool) || instantiate(this.prefab);
// ... 使用完毕
safePoolPut(this.pool, node);  // 自动 removeFromParent
```

### ResLoader.ts
```typescript
import { loadSpriteFrame } from './ResLoader';

loadSpriteFrame('textures/icon', (err, frame) => {
    if (frame) sprite.spriteFrame = frame;
});
```

### SoundManager.ts
```typescript
SoundManager.getInstance().init(audioNode);  // 初始化（audioNode 需有 AudioSource）
SoundManager.getInstance().playMusic('bgm');
SoundManager.getInstance().playSound('click');
```
音频文件放在 `resources/sound/` 目录下。路径前缀可在文件中修改 `SOUND_DIR` 常量。

### AnimationManager.ts
```typescript
// 场景中挂载组件后：
AnimationManager.instance.play(targetNode, 'effects/explode', 8, 15, false, () => {
    console.log('动画播放完毕');
});
```
帧图片放在 `resources/` 下的子目录中，按名称排序（frame_01, frame_02...）。

### MathUtil.ts
```typescript
MathUtil.getRandomInt(0, 100);           // [0, 100) 随机整数
MathUtil.getDistance(v2(0,0), v2(3,4));   // 5
MathUtil.getCubicBezierPoint(0.5, p0, p1, p2, p3);  // 曲线中点
```

### Bezier.ts
编辑器中挂载后可视化编辑曲线，运行时：
```typescript
bezierComp.startMove(targetNode, 2.0, () => { /* 到达终点 */ });
```

### HighlightManager.ts
需在编辑器中绑定 3 种材质（默认、闪白、闪红）：
```typescript
HighlightManager.applyEffect(sprite, 1);  // 闪白
HighlightManager.clearEffect(sprite);      // 恢复
```

### BaseUtil.ts
```typescript
BaseUtil.deepCopy(obj);                    // 深拷贝
BaseUtil.versionCompare('1.2.3', '1.3.0'); // 版本比较
BaseUtil.setAllRenderGray(node, true);     // 灰度
BaseUtil.shakeScreen(0.3, 10);             // 屏幕震动（已修 z 归零黑屏）
BaseUtil.convertToNodeSpace(target, source); // 坐标转换（2.x兼容）
```

### DateUtil.ts
```typescript
// 签到跨日判断
if (DateUtil.todayStr() === save.checkInLastDate) return;
if (DateUtil.yesterdayStr() === save.checkInLastDate) save.day++;
else save.day = 1;

// 倒计时格式化
label.string = DateUtil.formatMMSS(120);   // "02:00"

// 距离下次 00:00 还有多少秒
const secUntilReset = DateUtil.secondsUntil(0, 0);
```

### ConfigLoader.ts
```typescript
// 批量加载 resources/config/levels.json + items.json + enemies.json
await ConfigLoader.getInstance().loadAll(['levels', 'items', 'enemies']);

// 按主键查
const lv = ConfigLoader.getInstance().getById<LevelDef>('levels', 5);

// 条件过滤
const bossLevels = ConfigLoader.getInstance().filter<LevelDef>('levels',
    l => l.template === 'BOSS');
```
JSON 配置文件放 `assets/resources/config/xxx.json`，格式可以是数组 `[{id:1},{id:2}]` 或对象 `{"1":{id:1}, "2":{id:2}}`。
