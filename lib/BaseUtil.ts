import { Node, tween, v3, Vec3, find, isValid, Label, Renderer, Material, Mask, builtinResMgr, UITransform } from 'cc';

/**
 * 通用工具函数集
 *
 * 从项目中提取的游戏无关的通用工具方法。
 * 纯静态方法，可直接在任何 Cocos Creator 3.x 项目中使用。
 */
export class BaseUtil {

    /** 字符串模板替换：replaceNumber("第{0}关", 5) → "第5关" */
    public static replaceNumber(value: string, ...args: any[]): string {
        let index = -1;
        if (value.includes('{T}')) {
            return value.replace('{T}', () => {
                return args[++index];
            });
        }
        return value.replace(/{\w}/g, () => {
            return args[++index];
        });
    }

    /** Base64 编码（字节数组 → 字符串） */
    public static encode(input: any): string {
        const _keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        let chr1: number, chr2: number, chr3: number, enc1: number, enc2: number, enc3: number, enc4: number;
        let i = 0;
        while (i < input.length) {
            chr1 = input[i++];
            chr2 = input[i++];
            chr3 = input[i++];
            enc1 = chr1 >> 2;
            enc2 = (chr1 & 3) << 4 | chr2 >> 4;
            enc3 = (chr2 & 15) << 2 | chr3 >> 6;
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
        }
        return output;
    }

    /** 清除 HTML 标签和换行符 */
    public static clearBr(key: string): string {
        key = key.replace(/<\/?.+?>/g, '');
        key = key.replace(/[\r\n]/g, '');
        return key;
    }

    /** 深拷贝对象 */
    public static deepCopy(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        const result: any = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = BaseUtil.deepCopy(obj[key]);
            }
        }
        return result;
    }

    /** 语义化版本号比较：返回正数表示 A>B，负数表示 A<B，0 表示相等 */
    public static versionCompare(versionA: string, versionB: string): number {
        const vA = versionA.split('.');
        const vB = versionB.split('.');
        for (let i = 0; i < vA.length; ++i) {
            const a = parseInt(vA[i]);
            const b = parseInt(vB[i] || '0');
            if (a === b) continue;
            return a - b;
        }
        if (vB.length > vA.length) return -1;
        return 0;
    }

    /**
     * 递归设置节点及所有子节点的灰度状态
     * @param node 目标节点
     * @param isGray true = 灰色，false = 恢复
     */
    public static setAllRenderGray(node: Node, isGray: boolean): void {
        const renderComps = node.getComponents(Renderer);
        for (const comp of renderComps) {
            if (comp instanceof Mask) continue;
            const mat: Material = isGray
                ? builtinResMgr.get('ui-sprite-gray-material') as Material
                : builtinResMgr.get('ui-sprite-material') as Material;
            comp.setMaterial(mat, 0);
        }
        node.children.forEach(child => {
            BaseUtil.setAllRenderGray(child, isGray);
        });
    }

    /**
     * 屏幕震动（保留 Camera z 原值，避免 z=0 导致黑屏）
     *
     * 生产级用法参考 ProjectDrop EffectManager.safeShake — 加 100ms 节流
     * 避免高频击杀时每帧重建 tween。
     */
    public static shakeScreen(duration: number = 0.3, intensity: number = 10): void {
        const canvas = find('Canvas');
        if (!canvas) return;
        const cameraNode = canvas.getChildByName('Camera');
        if (!cameraNode) return;

        const origZ = cameraNode.position.z;
        tween(cameraNode).stop();

        const steps = Math.max(1, Math.floor(duration / 0.03));
        let t = tween(cameraNode);
        for (let i = 0; i < steps; i++) {
            const rx = (Math.random() - 0.5) * 2 * intensity;
            const ry = (Math.random() - 0.5) * 2 * intensity;
            t = t.to(0.02, { position: v3(rx, ry, origZ) });
        }
        t.to(0.02, { position: v3(0, 0, origZ) }).start();
    }

    /** Label 数字跳动动画（缩放弹跳效果） */
    public static playNumberJumpAnimation(callback: () => void, lb: Label): void {
        if (!lb || !isValid(lb.node)) {
            callback();
            return;
        }
        tween(lb.node)
            .to(0.03, { scale: v3(1.2, 1.2, 1) })
            .to(0.02, { scale: v3(1, 1, 1) })
            .call(() => { callback(); })
            .start();
    }

    /**
     * 坐标空间转换（2.x convertToNodeSpaceAR 的 3.x 等价实现）
     * 将 sourceNode 的世界坐标转换为 targetNode 的本地坐标
     */
    public static convertToNodeSpace(targetNode: Node, sourceNode: Node): Vec3 {
        const sourceUT = sourceNode.getComponent(UITransform);
        const targetUT = targetNode.getComponent(UITransform);
        const worldPos = sourceUT ? sourceUT.convertToWorldSpaceAR(v3(0, 0, 0)) : sourceNode.worldPosition.clone();
        const localPos = targetUT ? targetUT.convertToNodeSpaceAR(worldPos) : v3(0, 0, 0);
        return localPos;
    }
}
