import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { InputManager } from '../core/InputManager';
import { Enemy } from './Enemy';
import { EffectManager } from '../core/EffectManager';
import { SoundManager } from '../core/SoundManager';

type PlayerState = 'Idle' | 'Run' | 'Roll' | 'Attack' | 'Dead';

export class Player {
  public mesh: THREE.Group;
  
  // パラメータ
  public maxHp: number = 5;
  public hp: number = 5;
  
  private moveSpeed: number = 8.0;
  private rollSpeed: number = 20.0;
  private rollDuration: number = 0.5;
  private attackDuration: number = 0.5;

  // 無敵時間
  private isInvincible: boolean = false;
  private invincibleTimer: number = 0;
  private invincibleDuration: number = 1.0;

  private mixer: THREE.AnimationMixer | null = null;
  private actions: { [key: string]: THREE.AnimationAction } = {};
  
  private state: PlayerState = 'Idle';
  private stateTimer: number = 0;
  private moveDirection: THREE.Vector3 = new THREE.Vector3();

  private hasHitAttacked: boolean = false;
  private raycaster: THREE.Raycaster;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0, 0);
    scene.add(this.mesh);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.0; 

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

      model.scale.set(2, 2, 2); 
      this.mesh.add(model);

      this.mixer = new THREE.AnimationMixer(model);
      const animations = gltf.animations;

      this.actions['Idle'] = this.mixer.clipAction(animations[0]);
      this.actions['Run'] = this.mixer.clipAction(animations[1]);
      this.actions['Attack'] = this.mixer.clipAction(animations[3]);
      this.actions['Dead'] = this.mixer.clipAction(animations[0]); 

      this.switchState('Idle');
    });
  }

  private switchState(newState: PlayerState): void {
    this.state = newState;
    this.stateTimer = 0;

    this.mixer?.stopAllAction();

    const action = this.actions[newState === 'Roll' ? 'Run' : newState];
    if (action) {
        action.reset();
        action.play();
    }

    if (newState === 'Attack') {
        if (this.actions['Attack']) {
            this.actions['Attack'].setDuration(0.3);
            this.actions['Attack'].setLoop(THREE.LoopOnce, 1);
            this.actions['Attack'].clampWhenFinished = true;
        }
        this.hasHitAttacked = false;
    }
  }

  public update(
    dt: number, 
    input: InputManager, 
    camera: THREE.Camera, 
    obstacles: THREE.Object3D[], 
    enemies: Enemy[], 
    effectManager: EffectManager,
    soundManager: SoundManager
  ): void {
    if (!this.mixer) return;
    this.mixer.update(dt);

    // 無敵時間の更新
    if (this.isInvincible) {
        this.invincibleTimer -= dt;
        if (this.invincibleTimer <= 0) {
            this.isInvincible = false;
            this.mesh.visible = true;
        } else {
            this.mesh.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
        }
    }

    if (this.state === 'Dead') return;

    switch (this.state) {
      case 'Idle':
        this.updateIdle(dt, input, camera);
        break;
      case 'Run':
        this.updateRun(dt, input, camera, obstacles);
        break;
      case 'Roll':
        this.updateRoll(dt, obstacles);
        break;
      case 'Attack':
        this.updateAttack(dt, enemies, effectManager, soundManager);
        break;
    }
  }

  public takeDamage(amount: number, soundManager: SoundManager): void {
    if (this.isInvincible || this.state === 'Dead' || this.state === 'Roll') return;

    this.hp -= amount;
    
    soundManager.playDamage();

    if (this.hp <= 0) {
        this.hp = 0;
        this.die();
    } else {
        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
        console.log(`Player HP: ${this.hp}`);
    }
  }

  private die(): void {
    this.switchState('Dead');
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.5;
    console.log("Player Died...");
  }

  // --- 更新ロジック ---

  // 未使用の引数に _ を付けました
  private updateIdle(_dt: number, input: InputManager, _camera: THREE.Camera): void {
    if (input.isAttackPressed) { this.switchState('Attack'); return; }
    if (input.moveVector.x !== 0 || input.moveVector.y !== 0) { this.switchState('Run'); return; }
    if (input.isRollPressed) { 
        const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
        this.moveDirection.copy(forward);
        this.switchState('Roll'); 
    }
  }

  private updateRun(dt: number, input: InputManager, camera: THREE.Camera, obstacles: THREE.Object3D[]): void {
    if (input.isAttackPressed) { this.switchState('Attack'); return; }
    const inputDir = input.moveVector;
    if (inputDir.x === 0 && inputDir.y === 0) { this.switchState('Idle'); return; }

    this.calculateMoveDirection(inputDir, camera);
    this.rotateToDirection(this.moveDirection, dt);

    if (!this.checkCollision(this.moveDirection, obstacles)) {
      this.mesh.position.addScaledVector(this.moveDirection, this.moveSpeed * dt);
    }
    if (input.isRollPressed) { this.switchState('Roll'); }
  }

  private updateRoll(dt: number, obstacles: THREE.Object3D[]): void {
    this.stateTimer += dt;
    if (!this.checkCollision(this.moveDirection, obstacles)) {
      this.mesh.position.addScaledVector(this.moveDirection, this.rollSpeed * dt);
    }
    const model = this.mesh.children[0];
    if (model) model.rotation.x += 15 * dt;

    if (this.stateTimer >= this.rollDuration) {
        if (model) model.rotation.x = 0;
        this.switchState('Idle');
    }
  }

  private updateAttack(dt: number, enemies: Enemy[], effectManager: EffectManager, soundManager: SoundManager): void {
    this.stateTimer += dt;
    if (!this.hasHitAttacked && this.stateTimer > 0.1 && this.stateTimer < 0.3) {
      this.checkAttackHit(enemies, effectManager, soundManager);
      this.hasHitAttacked = true;
    }
    if (this.stateTimer >= this.attackDuration) {
        this.switchState('Idle');
    }
  }

  private checkAttackHit(enemies: Enemy[], effectManager: EffectManager, soundManager: SoundManager): void {
    const attackRange = 4.0; 
    const attackAngle = Math.PI / 2;
    const playerPos = this.mesh.position;
    const playerForward = new THREE.Vector3(0, 0, -1).applyEuler(this.mesh.rotation).normalize();

    enemies.forEach(enemy => {
      if (enemy.isDead) return;
      const distance = playerPos.distanceTo(enemy.mesh.position);
      if (distance <= attackRange) {
        const toEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, playerPos).normalize();
        const dot = playerForward.dot(toEnemy);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        
        if (angle <= attackAngle / 2) {
          enemy.takeDamage();
          
          soundManager.playHit();

          const effectPos = enemy.mesh.position.clone();
          effectPos.y += 1.5; 
          effectManager.spawnHitEffect(effectPos);
        }
      }
    });
  }

  private checkCollision(direction: THREE.Vector3, obstacles: THREE.Object3D[]): boolean {
    const rayOrigin = this.mesh.position.clone();
    rayOrigin.y += 1.0; 
    this.raycaster.set(rayOrigin, direction);
    const intersects = this.raycaster.intersectObjects(obstacles);
    return intersects.length > 0 && intersects[0].distance < 1.5;
  }

  private calculateMoveDirection(inputDir: { x: number, y: number }, camera: THREE.Camera): void {
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0; 
    cameraForward.normalize();
    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));
    this.moveDirection.set(0, 0, 0)
      .addScaledVector(cameraForward, -inputDir.y)
      .addScaledVector(cameraRight, inputDir.x)
      .normalize();
  }

  private rotateToDirection(direction: THREE.Vector3, dt: number): void {
    const angle = Math.atan2(direction.x, direction.z) + Math.PI;
    let diff = angle - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const rotateSpeed = 10;
    this.mesh.rotation.y += diff * rotateSpeed * dt;
  }
}