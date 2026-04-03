import { SpriteFrame, resources } from 'cc';

/**
 * Cocos 3.x SpriteFrame 加载兼容工具
 *
 * Cocos 3.x 中 png 文件的 SpriteFrame 是子资源，
 * 路径可能需要追加 '/spriteFrame' 才能正确加载。
 * 此方法自动兜底两种路径格式。
 *
 * 用法：
 *   loadSpriteFrame('textures/icon', (err, frame) => {
 *       if (frame) sprite.spriteFrame = frame;
 *   });
 */
export function loadSpriteFrame(path: string, callback: (err: Error | null, asset: SpriteFrame | null) => void): void {
    resources.load(path, SpriteFrame, (err, asset) => {
        if (!err && asset) {
            callback(null, asset);
        } else {
            // 兜底：追加 /spriteFrame
            resources.load(path + '/spriteFrame', SpriteFrame, (err2, asset2) => {
                if (err2) {
                    console.warn(`[ResLoader] FAILED both paths: ${path}`, err2.message);
                }
                callback(err2, asset2);
            });
        }
    });
}
