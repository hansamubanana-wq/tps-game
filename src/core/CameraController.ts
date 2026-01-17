import * as THREE from 'three';
import { InputManager } from './InputManager';

/**
 * カメラ制御クラス（TPS視点）
 * プレイヤーの周囲を回転し、追従する
 */
export class CameraController {
  private camera: THREE.Camera;
  private target: THREE.Object3D | null = null;

  // カメラの設定パラメータ
  private distance: number = 8.0; // ターゲットとの距離
  private height: number = 3.0;   // 注視点の高さオフセット
  private rotateSpeed: number = 0.005; // 回転速度

  // 現在の角度（ラジアン）
  private theta: number = 0; // 水平角度
  private phi: number = Math.PI / 6; // 垂直角度（30度くらい）

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  /**
   * 追従するターゲット（プレイヤー）をセットする
   */
  public setTarget(target: THREE.Object3D): void {
    this.target = target;
  }

  /**
   * 更新処理
   */
  public update(input: InputManager): void {
    if (!this.target) return;

    // 1. 入力による回転（マウス・タッチの移動量を使用）
    // input.lookDelta.x は横移動なので theta（水平）を変更
    // input.lookDelta.y は縦移動なので phi（垂直）を変更
    this.theta -= input.lookDelta.x * this.rotateSpeed;
    this.phi -= input.lookDelta.y * this.rotateSpeed;

    // 2. 垂直角度の制限（真上や真下に行き過ぎないように）
    // 10度〜80度くらいの範囲に制限
    const minPhi = Math.PI / 18;       // 約10度
    const maxPhi = Math.PI / 2 - 0.1;  // 約85度
    this.phi = Math.max(minPhi, Math.min(maxPhi, this.phi));

    // 3. カメラ位置の計算（球座標系）
    // ターゲットの中心位置
    const targetPos = this.target.position.clone();
    targetPos.y += this.height; // 少し上を見る

    // カメラの位置を決定
    // x = r * sin(phi) * sin(theta)
    // y = r * cos(phi)
    // z = r * sin(phi) * cos(theta)
    // ※Three.jsの座標系に合わせて調整
    const x = this.distance * Math.sin(this.phi) * Math.sin(this.theta);
    const y = this.distance * Math.cos(this.phi);
    const z = this.distance * Math.sin(this.phi) * Math.cos(this.theta);

    // ターゲット位置からのオフセットとして設定
    this.camera.position.set(
      targetPos.x + x,
      targetPos.y + y,
      targetPos.z + z
    );

    // 4. カメラをターゲットに向ける
    this.camera.lookAt(targetPos);
  }
}