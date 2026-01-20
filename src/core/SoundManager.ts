/**
 * 効果音を生成・再生するクラス（Web Audio API使用）
 * 外部ファイルを使わず、プログラムで音を合成します。
 */
export class SoundManager {
  private context: AudioContext;

  constructor() {
    // ブラウザごとのAudioContextを取得
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.context = new AudioContextClass();
  }

  /**
   * 攻撃音（シュッ！）
   */
  public playAttack(): void {
    this.playTone(400, 'sawtooth', 0.1, 0.05); // 短いノコギリ波
    this.playNoise(0.1); // ノイズを混ぜて風切り音っぽく
  }

  /**
   * ヒット音（バシッ！）
   */
  public playHit(): void {
    this.playTone(150, 'square', 0.1, 0.0); // 低い矩形波
    this.playNoise(0.2); // ノイズ強め
  }

  /**
   * ダメージ音（グハッ）
   */
  public playDamage(): void {
    this.playTone(100, 'sawtooth', 0.3, 0.1); // 低く長く
  }

  /**
   * 基本的なトーン再生
   */
  private playTone(freq: number, type: OscillatorType, duration: number, delay: number): void {
    if (this.context.state === 'suspended') this.context.resume();

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime + delay);
    // 音程を下げる（ピッチベンド）
    osc.frequency.exponentialRampToValueAtTime(freq * 0.1, this.context.currentTime + delay + duration);

    gain.gain.setValueAtTime(0.3, this.context.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start(this.context.currentTime + delay);
    osc.stop(this.context.currentTime + delay + duration);
  }

  /**
   * ノイズ再生（打撃感用）
   */
  private playNoise(duration: number): void {
    if (this.context.state === 'suspended') this.context.resume();

    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.5, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    noise.connect(gain);
    gain.connect(this.context.destination);
    noise.start();
  }
}