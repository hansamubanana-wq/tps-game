import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Enemy {
  public mesh: THREE.Group;
  public isDead: boolean = false; // 生存フラグ

  private hp: number = 1;
  private moveSpeed: number = 3.5;
  private detectionRange: number = 15.0;
  private stopRange: number = 2.0;

  // 仲間と避ける距離（パーソナルスペース）
  private separationRange: number = 2.5; 

  // アニメーション関連
  private mixer: THREE.AnimationMixer | null = null;
  private actions: { [key: string]: THREE.AnimationAction } = {};
  private currentActionName: string = '';

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    this.loadModel();
  }

  private loadModel(): void {
    const loader = new GLTFLoader();
    const modelUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Soldier.glb';

    loader.load(modelUrl, (gltf) => {
      const model = gltf.scene;
      
      model.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          object.castShadow = true;
        }
      });

      model.scale.set(3, 3, 3);
      
      // モデルの向きを180度反転（背中合わせ）にしておく
      // これで lookAt した時に顔が向くようになる
      model.rotation.y = Math.PI;

      this.mesh.add(model);

      this.mixer = new THREE.AnimationMixer(model);
      const animations = gltf.animations;

      this.actions['Idle'] = this.mixer.clipAction(animations[0]);
      this.actions['Run'] = this.mixer.clipAction(animations[1]);

      this.playAnimation('Idle');
    });
  }

  private playAnimation(name: string): void {
    if (this.currentActionName === name) return;

    const newAction = this.actions[name];
    const oldAction = this.actions[this.currentActionName];

    if (newAction) {
      newAction.reset();
      newAction.play();
      if (oldAction) {
        newAction.crossFadeFrom(oldAction, 0.2, true);
      }
      this.currentActionName = name;
    }
  }

  /**
   * 更新処理
   * 引数に allEnemies を追加 ★変更
   */
  public update(dt: number, playerPosition: THREE.Vector3, allEnemies: Enemy[]): void {
    if (!this.mixer) return;
    this.mixer.update(dt);

    if (this.isDead) return;

    // プレイヤーとの距離
    const distToPlayer = this.mesh.position.distanceTo(playerPosition);

    if (distToPlayer <= this.detectionRange && distToPlayer > this.stopRange) {
      this.playAnimation('Run');

      // --- 移動方向の計算 ---
      
      // 1. 基本ベクトル：プレイヤーに向かう方向
      const direction = new THREE.Vector3()
        .subVectors(playerPosition, this.mesh.position)
        .normalize();

      // 2. 分離ベクトル：近くの仲間から離れる方向 ★追加ロジック
      const separation = new THREE.Vector3(0, 0, 0);
      let count = 0;

      allEnemies.forEach(other => {
        if (other === this || other.isDead) return; // 自分自身や死体は無視

        const distToNeighbor = this.mesh.position.distanceTo(other.mesh.position);
        
        // パーソナルスペースに入り込んでいる仲間がいれば
        if (distToNeighbor < this.separationRange) {
          // 相手から自分へのベクトル（逃げる方向）
          const push = new THREE.Vector3()
            .subVectors(this.mesh.position, other.mesh.position)
            .normalize();
          
          // 近ければ近いほど強く反発する
          const weight = (this.separationRange - distToNeighbor) / this.separationRange;
          separation.addScaledVector(push, weight);
          count++;
        }
      });

      if (count > 0) {
        separation.divideScalar(count); // 平均化
        // 分離の力を少し強めに加える (1.5倍)
        direction.addScaledVector(separation, 1.5).normalize();
      }

      // --- 移動実行 ---

      // 計算した方向（プレイヤー方向 ＋ 仲間を避ける方向）を向く
      // lookAtTargetを計算
      const lookTarget = this.mesh.position.clone().add(direction);
      this.mesh.lookAt(lookTarget.x, this.mesh.position.y, lookTarget.z);

      // 前進
      const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
      this.mesh.position.addScaledVector(forward, this.moveSpeed * dt);

    } else {
      this.playAnimation('Idle');
    }
  }

  public takeDamage(): void {
    if (this.isDead) return;

    this.hp -= 1;
    if (this.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    
    // 倒れる演出
    this.mesh.rotation.x = Math.PI / 2; 
    this.mesh.position.y = 0.5;

    console.log("Enemy Defeated!");
  }
}