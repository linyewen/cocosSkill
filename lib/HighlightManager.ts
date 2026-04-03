import { _decorator, Component, Sprite, Material, Tween } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 受击高亮效果管理器
 *
 * 通过切换 Sprite 材质实现闪白/闪红效果。
 *
 * 使用方式：
 *   1. 在场景中创建一个节点，挂载此组件
 *   2. 在编辑器中将 3 种材质拖入对应属性：
 *      - material: 默认材质（用于恢复，通常是 builtin-sprite）
 *      - material_white: 闪白材质
 *      - material_red: 闪红材质
 *   3. 代码中：
 *      HighlightManager.applyEffect(sprite, 1);  // 闪白
 *      HighlightManager.applyEffect(sprite, 2);  // 闪红
 *      HighlightManager.clearEffect(sprite);      // 恢复
 */
@ccclass('HighlightManager')
export default class HighlightManager extends Component {

    private static tweens: Map<Sprite, Tween<any>> = new Map();
    private static originalMaterials: Map<Sprite, Material> = new Map();
    private static _ins: HighlightManager;

    @property({ type: Material, tooltip: '默认材质（用于恢复）' })
    material: Material = null;

    @property({ type: Material, tooltip: '闪白材质' })
    material_white: Material = null;

    @property({ type: Material, tooltip: '闪红材质' })
    material_red: Material = null;

    protected onLoad(): void {
        HighlightManager._ins = this;
    }

    /**
     * 应用高亮效果
     * @param sprite 目标 Sprite
     * @param type 1 = 闪白，2 = 闪红
     */
    public static applyEffect(sprite: Sprite, type: number = 1): void {
        if (!sprite) return;
        if (!this._ins) {
            console.warn('[HighlightManager] Component not in scene.');
            return;
        }
        if (!this.originalMaterials.has(sprite)) {
            this.originalMaterials.set(sprite, sprite.getSharedMaterial(0));
        }
        const newMaterial = type == 1 ? this._ins.material_white : this._ins.material_red;
        if (!newMaterial) {
            console.warn('[HighlightManager] Material not bound in editor, type=' + type);
            return;
        }
        sprite.setSharedMaterial(newMaterial, 0);
    }

    /** 清除高亮效果，恢复原始材质 */
    public static clearEffect(sprite: Sprite): void {
        if (!this._ins || !sprite) return;
        if (this.originalMaterials.has(sprite)) {
            sprite.setSharedMaterial(this.originalMaterials.get(sprite), 0);
            this.originalMaterials.delete(sprite);
        }
    }
}
