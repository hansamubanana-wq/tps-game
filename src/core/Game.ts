import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { CameraController } from './CameraController';
import { Level } from '../entities/Level';
import { Enemy } from '../entities/Enemy';
import { EffectManager } from './EffectManager';
import { SoundManager } from './SoundManager';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  // private animationId: number | null = null; // 削除
  private clock: THREE.Clock;

  private inputManager: InputManager;
  private player: Player;
  private cameraController: CameraController;
  private level: Level;
  private effectManager: EffectManager;
  private soundManager: SoundManager;
  
  private enemies: Enemy[] = [];

  // ゲーム状態
  private score: number = 0;
  private isGameOver: boolean = false;

  // UI要素
  private scoreElement: HTMLElement;
  private hpBarElement: HTMLElement;
  private gameOverScreen: HTMLElement;

  constructor() {
    // --- 基本設定 ---
    this.scene = new THREE.Scene();
    
    // 背景とフォグ
    const skyColor = 0xa0a0a0; 
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.Fog(skyColor, 20, 60);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.clock = new THREE.Clock();

    // --- ライト ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(dirLight);

    // --- 各要素の初期化 ---
    this.level = new Level(this.scene);
    this.effectManager = new EffectManager(this.scene);
    this.soundManager = new SoundManager();

    // 敵の配置
    this.enemies.push(new Enemy(this.scene, new THREE.Vector3(0, 0, 5)));
    this.enemies.push(new Enemy(this.scene, new THREE.Vector3(-5, 0, 8)));
    this.enemies.push(new Enemy(this.scene, new THREE.Vector3(5, 0, 8)));

    // クラスのインスタンス化
    this.inputManager = new InputManager();
    this.player = new Player(this.scene);
    
    // カメラコントローラー
    this.cameraController = new CameraController(this.camera);
    this.cameraController.setTarget(this.player.mesh);

    // --- UI要素の取得 ---
    this.scoreElement = document.getElementById('score') as HTMLElement;
    this.hpBarElement = document.getElementById('hp-bar') as HTMLElement;
    this.gameOverScreen = document.getElementById('game-over-screen') as HTMLElement;

    // リスタートボタンの設定
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        location.reload();
      });
    }

    // 最初のクリックで攻撃音の空打ちをしてAudioContextを起動する
    window.addEventListener('click', () => {
      this.soundManager.playAttack(); 
    }, { once: true });
  }

  public start(): void {
    this.animate();
  }

  private animate(): void {
    // 戻り値を受け取らないように修正
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    this.update(delta);
    this.render();
  }

  private update(delta: number): void {
    if (this.isGameOver) return;

    this.inputManager.update();

    const playerPos = this.player.mesh.position;
    
    // --- 敵の処理 ---
    this.enemies.forEach(enemy => {
      enemy.update(delta, playerPos, this.enemies);

      if (!enemy.isDead) {
        const dist = playerPos.distanceTo(enemy.mesh.position);
        if (dist < 1.5) {
          this.player.takeDamage(1, this.soundManager);
        }
      }
    });

    // エフェクト更新
    this.effectManager.update(delta);
    
    // --- プレイヤーの更新 ---
    this.player.update(
      delta, 
      this.inputManager, 
      this.camera, 
      this.level.obstacles, 
      this.enemies, 
      this.effectManager, 
      this.soundManager
    );
    
    // カメラ更新
    this.cameraController.update(this.inputManager);

    // --- UI更新 ---
    const hpPercent = (this.player.hp / this.player.maxHp) * 100;
    this.hpBarElement.style.width = `${hpPercent}%`;
    if (hpPercent > 50) this.hpBarElement.style.backgroundColor = '#00ff00';
    else if (hpPercent > 20) this.hpBarElement.style.backgroundColor = '#ffff00';
    else this.hpBarElement.style.backgroundColor = '#ff0000';

    const deadCount = this.enemies.filter(e => e.isDead).length;
    this.score = deadCount * 1000;
    this.scoreElement.innerText = `SCORE: ${this.score}`;

    // ゲームオーバー判定
    if (this.player.hp <= 0) {
      this.isGameOver = true;
      this.gameOverScreen.classList.remove('hidden');
    }

    this.inputManager.reset();
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}