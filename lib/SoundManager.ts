import { AudioSource, AudioClip, resources, Node, clamp01 } from 'cc';

/**
 * 通用音效管理器
 *
 * 用法：
 *   SoundManager.getInstance().init(audioNode);  // audioNode 需要有 AudioSource 组件
 *   SoundManager.getInstance().playMusic('bgm');
 *   SoundManager.getInstance().playSound('click');
 *
 * 音频文件需放在 resources/sound/ 目录下。
 * 如果你的项目音频路径不同，修改 SOUND_DIR 常量。
 */
const SOUND_DIR = 'sound/';

export default class SoundManager {
    private static _instance: SoundManager = null;

    private musicVolume: number = 1.0;
    private soundVolume: number = 1.0;
    private isMusicEnabled: boolean = true;
    private isSoundEnabled: boolean = true;

    private musicSource: AudioSource = null;
    private currentMusicUrl: string = '';
    private _audioNode: Node = null;

    public static getInstance(): SoundManager {
        if (!this._instance) {
            this._instance = new SoundManager();
        }
        return this._instance;
    }

    private constructor() {}

    /** 初始化：传入一个场景中的 Node（需要有 AudioSource 组件） */
    public init(audioNode: Node): void {
        this._audioNode = audioNode;
        this.musicSource = audioNode.getComponent(AudioSource);
        if (!this.musicSource) {
            this.musicSource = audioNode.addComponent(AudioSource);
        }
    }

    public playMusic(url: string, loop: boolean = true, volume?: number): void {
        if (!this.isMusicEnabled || !this.musicSource) return;
        this.stopMusic();

        resources.load(`${SOUND_DIR}${url}`, AudioClip, (err, audioClip: AudioClip) => {
            if (err || !this.musicSource) return;
            this.musicSource.clip = audioClip;
            this.musicSource.loop = loop;
            this.musicSource.volume = volume !== undefined ? volume : this.musicVolume;
            this.musicSource.play();
            this.currentMusicUrl = url;
        });
    }

    public playSound(url: string, loop: boolean = false, volume?: number): void {
        if (!this.isSoundEnabled || !this._audioNode || !this.musicSource) return;

        resources.load(`${SOUND_DIR}${url}`, AudioClip, (err, audioClip: AudioClip) => {
            if (err || !this.musicSource) return;
            const playVolume = volume !== undefined ? volume : this.soundVolume;
            this.musicSource.playOneShot(audioClip, playVolume);
        });
    }

    public pauseMusic(): void {
        if (this.musicSource && this.musicSource.playing) {
            this.musicSource.pause();
        }
    }

    public resumeMusic(): void {
        if (this.musicSource) {
            this.musicSource.play();
        }
    }

    public stopMusic(): void {
        if (this.musicSource) {
            this.musicSource.stop();
            this.currentMusicUrl = '';
        }
    }

    public setMusicVolume(volume: number): void {
        this.musicVolume = clamp01(volume);
        if (this.musicSource) {
            this.musicSource.volume = this.musicVolume;
        }
    }

    public setSoundVolume(volume: number): void {
        this.soundVolume = clamp01(volume);
    }

    public getMusicVolume(): number { return this.musicVolume; }
    public getSoundVolume(): number { return this.soundVolume; }

    public setMusicEnabled(enabled: boolean): void {
        this.isMusicEnabled = enabled;
        if (!enabled) this.stopMusic();
    }

    public setSoundEnabled(enabled: boolean): void {
        this.isSoundEnabled = enabled;
    }

    public isMusicEnable(): boolean { return this.isMusicEnabled; }
    public isSoundEnable(): boolean { return this.isSoundEnabled; }
    public getCurrentMusicUrl(): string { return this.currentMusicUrl; }
    public isMusicPlaying(): boolean { return this.musicSource && this.musicSource.playing; }

    public cleanup(): void {
        this.stopMusic();
    }
}
