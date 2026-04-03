import { _decorator, Component, Sprite, SpriteFrame, Node, find, isValid, resources } from 'cc';

const { ccclass } = _decorator;

/**
 * 帧动画内部状态
 */
class AnimationState {
    sprite: Sprite;
    frames: SpriteFrame[];
    frameRate: number;
    loop: boolean;
    isPlaying: boolean = true;
    onComplete?: () => void;

    private timer: number = 0;
    private currentIndex: number = 0;
    private interval: number;

    constructor(sprite: Sprite, frames: SpriteFrame[], frameRate: number, loop: boolean) {
        this.sprite = sprite;
        this.frames = frames;
        this.frameRate = frameRate;
        this.loop = loop;
        this.interval = 1 / frameRate;
        if (this.frames.length > 0) {
            this.sprite.spriteFrame = this.frames[0];
        }
    }

    update(dt: number): boolean {
        if (!this.isPlaying || this.frames.length === 0) {
            return this.isPlaying;
        }
        this.timer += dt;
        if (this.timer >= this.interval) {
            this.timer -= this.interval;
            this.currentIndex++;
            if (this.currentIndex >= this.frames.length) {
                if (this.loop) {
                    this.currentIndex = 0;
                } else {
                    this.isPlaying = false;
                    return false;
                }
            }
            if (isValid(this.sprite.node)) {
                this.sprite.spriteFrame = this.frames[this.currentIndex];
            } else {
                this.isPlaying = false;
                return false;
            }
        }
        return true;
    }
}

/**
 * 通用帧动画管理器
 *
 * 从 resources 目录加载序列帧图片，驱动 Sprite 逐帧播放。
 * 支持循环、暂停、恢复、停止，自动缓存已加载的帧序列。
 *
 * 使用方式：
 *   1. 在场景中创建一个空节点，挂载此组件
 *   2. 代码中：AnimationManager.instance.play(targetNode, 'effects/explode', 8, 15);
 *
 * 帧图片命名要求：按字母/数字排序（如 frame_01.png, frame_02.png ...）
 */
@ccclass('AnimationManager')
export default class AnimationManager extends Component {

    private static _instance: AnimationManager = null;

    public static get instance(): AnimationManager {
        return this._instance;
    }

    onLoad() {
        if (AnimationManager._instance && AnimationManager._instance !== this) {
            this.destroy();
            return;
        }
        AnimationManager._instance = this;
    }

    private activeAnimations: Map<Node, AnimationState> = new Map();
    private spriteFrameCache: Map<string, SpriteFrame[]> = new Map();

    /**
     * 播放帧动画
     * @param target 目标节点（需要有 Sprite 组件）或节点路径字符串
     * @param path resources 下的目录路径（如 'effects/explode'）
     * @param frameCount 总帧数
     * @param frameRate 帧率（默认 10）
     * @param loop 是否循环（默认 false）
     * @param onComplete 播放完成回调（循环模式不触发）
     * @param onLoadComplete 帧加载完成回调，返回首帧宽高
     */
    public play(
        target: Node | string,
        path: string,
        frameCount: number,
        frameRate: number = 10,
        loop: boolean = false,
        onComplete?: () => void,
        onLoadComplete?: (width: number, height: number) => void,
    ) {
        const node = typeof target === 'string' ? find(target) : target;
        if (!node) {
            console.error(`[AnimationManager] Node not found.`);
            return;
        }
        const sprite = node.getComponent(Sprite);
        if (!sprite) {
            console.error('[AnimationManager] Target node must have a Sprite component.');
            return;
        }

        const startAnimation = (frames: SpriteFrame[]) => {
            if (frames.length === 0) return;
            const animState = new AnimationState(sprite, frames, frameRate, loop);
            animState.onComplete = onComplete;
            this.activeAnimations.set(node, animState);
        };

        if (this.spriteFrameCache.has(path)) {
            const cachedFrames = this.spriteFrameCache.get(path);
            if (onLoadComplete && cachedFrames.length > 0) {
                const rect = cachedFrames[0].rect;
                onLoadComplete(rect.width, rect.height);
            }
            startAnimation(cachedFrames);
        } else {
            resources.loadDir(path, SpriteFrame, (err, frames: SpriteFrame[]) => {
                if (err) {
                    console.error(`[AnimationManager] loadDir FAILED: ${path}`, err);
                    return;
                }
                if (frames.length === 0) {
                    console.warn(`[AnimationManager] loadDir returned 0 frames: ${path}`);
                    return;
                }
                frames.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                frames = frames.slice(0, Math.min(frameCount, frames.length));
                this.spriteFrameCache.set(path, frames);
                if (onLoadComplete && frames.length > 0) {
                    const rect = frames[0].rect;
                    onLoadComplete(rect.width, rect.height);
                }
                if (isValid(node)) {
                    startAnimation(frames);
                }
            });
        }
    }

    public pause(target: Node | string) {
        const node = typeof target === 'string' ? find(target) : target;
        if (!node) return;
        if (this.activeAnimations.has(node)) {
            this.activeAnimations.get(node).isPlaying = false;
        }
    }

    public resume(target: Node | string) {
        const node = typeof target === 'string' ? find(target) : target;
        if (!node) return;
        if (this.activeAnimations.has(node)) {
            this.activeAnimations.get(node).isPlaying = true;
        }
    }

    public stop(target: Node | string) {
        const node = typeof target === 'string' ? find(target) : target;
        if (!node) return;
        this.activeAnimations.delete(node);
    }

    update(dt: number) {
        if (this.activeAnimations.size === 0) return;
        const nodesToRemove: Node[] = [];
        this.activeAnimations.forEach((anim, node) => {
            if (!isValid(node)) {
                nodesToRemove.push(node);
                return;
            }
            const playing = anim.update(dt);
            if (!playing && !anim.loop) {
                anim.onComplete?.();
                nodesToRemove.push(node);
            }
        });
        nodesToRemove.forEach(node => {
            this.activeAnimations.delete(node);
        });
    }
}
