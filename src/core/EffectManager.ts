import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3; // 飛んでいく方向と速度
  life: number;            // 残り寿命（秒）
}

export class EffectManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];

  // パーティクルの共通マテリアルとジオメトリ（使い回して軽量化）
  private geometry: THREE.BoxGeometry;
  private material: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2); // 小さな箱
    this.material = new THREE.MeshBasicMaterial({ color: 0xffcc00 }); // 黄色
  }

  /**
   * 指定した位置にヒットエフェクト（火花）を発生させる
   */
  public spawnHitEffect(position: THREE.Vector3): void {
    const particleCount = 8; // 破片の数

    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      
      // 発生位置（少しランダムにずらす）
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 0.5;
      mesh.position.y += (Math.random() - 0.5) * 0.5;
      mesh.position.z += (Math.random() - 0.5) * 0.5;

      this.scene.add(mesh);

      // ランダムな方向に飛び散らせる
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10, // X: 左右
        (Math.random() * 5) + 2,    // Y: 上方向（少し跳ねる感じ）
        (Math.random() - 0.5) * 10  // Z: 前後
      );

      this.particles.push({
        mesh: mesh,
        velocity: velocity,
        life: 0.5 + Math.random() * 0.3 // 0.5〜0.8秒で消える
      });
    }
  }

  /**
   * 毎フレームの更新処理
   */
  public update(dt: number): void {
    // 後ろからループして、死んだパーティクルを削除しやすくする
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= dt;

      if (p.life <= 0) {
        // 寿命切れ：シーンから消して配列からも削除
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      } else {
        // 移動
        p.mesh.position.addScaledVector(p.velocity, dt);
        
        // 重力で少し落ちる
        p.velocity.y -= 15.0 * dt;

        // 回転（見た目の動き）
        p.mesh.rotation.x += 10 * dt;
        p.mesh.rotation.y += 10 * dt;

        // 徐々に小さくする
        const scale = p.life * 2.0; // 寿命に比例
        p.mesh.scale.set(scale, scale, scale);
      }
    }
  }
}