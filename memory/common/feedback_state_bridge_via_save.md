---
name: 跨 reset 状态桥接：用 SaveManager 暂存而非直接 GameState
description: GameState.reset() 在进 Battle 时清状态，如果外部想带入"特殊装备/奖励"必须通过持久化层桥接
type: feedback
---
**问题**：很多游戏的 `GameState.reset()` 在进 Battle 阶段会清空大部分字段（score / coins / level / 战斗临时状态），包括玩家装备的弹型 / 技能 / buff。

如果外部流程（DEV 面板、结算奖励、关卡首通）**在 reset 之前**改了 GameState 里的装备字段，会被清空导致"装备丢失"。

**反模式**：
```ts
// DEV 面板 / 主菜单等外部流程
private equipWeapon(variant) {
    GameState.getInstance().equipBullet(variant, 99);  // ❌ 会被 reset 清
}

// 玩家点跳关
onGotoLevel() {
    selectMode(LEVEL);
}

// GameEntry 进战斗
startLevel() {
    this.fsm.changePhase(Battle);
    // enterPhase(Battle) 内部: GameState.reset() → 清掉 equipBullet 的成果
}
```

**正确模式：通过 SaveManager 桥接**：

```ts
// SaveManager 加 pending 字段
interface SaveData {
    // ...
    pendingBulletVariant: string;
    pendingBulletAmmo: number;
}

setPendingBullet(variant: string, ammo: number) {
    this._data.pendingBulletVariant = variant;
    this._data.pendingBulletAmmo = ammo;
    this.save();
}

consumePendingBullet() {
    if (!this._data.pendingBulletVariant || this._data.pendingBulletAmmo <= 0) return null;
    const result = { variant: ..., ammo: ... };
    this._data.pendingBulletVariant = '';
    this._data.pendingBulletAmmo = 0;
    this.save();
    return result;
}

// DEV 面板 / 外部流程
equipWeapon(variant) {
    SaveManager.getInstance().setPendingBullet(variant, 99);  // ✅ 持久化暂存
}

// GameEntry 进战斗
startLevel() {
    this.fsm.changePhase(Battle);  // reset 发生
    // reset 后：装备 pending
    const pending = SaveManager.getInstance().consumePendingBullet();
    if (pending) {
        GameState.getInstance().equipBullet(pending.variant, pending.ammo);
    }
}
```

**Why**：
- 持久化层（SaveManager）**活过 GameState.reset()**，成为跨生命周期的数据桥
- 复用同一条"pending"通道：首通解锁奖励、DEV 调试装备、购物奖励… 都用这套机制
- 关卡重试 / 新开一局时 reset 不会破坏带入装备

**踩坑场景（2026-04-20 ProjectDrop）**：
- DEV 面板装备铁丸子 × 99 → 跳关卡 → 装备字段被 `GameState.reset()` 清为 basic → 战斗中还是基础丸子
- 改为通过 `SaveManager.pendingBullet` 桥接后 → 进战场 `startLevel` 末尾 consume → 装备生效
- 同时复用给 Lv5 首通解锁铁丸子赠送 20 发的场景

**How to apply**：
- **任何"跨越 reset 的数据"都走 SaveManager**，不直接写 GameState
- 典型场景：首通奖励、Boss 掉落、商店购买、DEV 调试、签到/广告赠送
- SaveManager 字段起名 `pending*` 表明它是"待消费"的一次性数据
- `consume*()` 方法返回数据同时清空，保证只生效一次

**反例**：不要用 EventBus 传递这种数据。事件在 reset 发生前已经消费完了，起不到桥接作用。
