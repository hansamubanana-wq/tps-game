import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { CameraController } from './CameraController';
import { Level } from '../entities/Level';
import { Enemy } from '../entities/Enemy';
import { EffectManager } from './EffectManager';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  private animationId: number | null = null;
  private clock: THREE.Clock;

  private inputManager: InputManager;
  private player: Player;
  private cameraController: CameraController;
  private level: Level;
  private effectManager: EffectManager;
  
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
    this.scene.background = new THREE.Color(0x222222);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.clock = new THREE.Clock();

    // --- ライト ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(dirLight);

    // --- 各要素の初期化 ---
    this.level = new Level(this.scene);
    this.effectManager = new EffectManager(this.scene);

    // 敵の配置
    this.enemies.push(new Enemy(this.scene, new THREE.Vector3(0, 0, 5)));
    this.enemies.push(new Enemy(this.scene, new THREE.Vector3(-5, 0, 8)));
    this.enemies.push(new Enemy(this.scene, new THREE.Vector3(5, 0, 8)));

    this.inputManager = new InputManager();
    this.player = new Player(this.scene);
    
    this.cameraController = new CameraController(this.camera);
    this.cameraController.setTarget(this.player.mesh);

    // --- UI要素の取得 ---
    this.scoreElement = document.getElementById('score') as HTMLElement;
    this.hpBarElement = document.getElementById('hp-bar') as HTMLElement;
    this.gameOverScreen = document.getElementById('game-over-screen') as HTMLElement;

    // リスタートボタンの設定（単純にページリロード）
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        location.reload();
      });
    }
  }

  public start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    this.update(delta);
    this.render();
  }

  private update(delta: number): void {
    if (this.isGameOver) return; // ゲームオーバーなら更新停止

    this.inputManager.update();

    const playerPos = this.player.mesh.position;
    
    // --- 敵の処理と衝突判定 ---
    this.enemies.forEach(enemy => {
      // 敵の更新
      enemy.update(delta, playerPos, this.enemies);

      // スコア加算判定（死んだ瞬間のフラグ管理が簡易的なので、HPを見て判断）
      // 本来はEnemyクラスでイベントを発火するのが良いですが、今回は簡易的に
      if (enemy.isDead && enemy.mesh.visible) {
        // すでに死んでいる敵は無視したいが、今回は倒れた敵も残り続ける仕様なので
        // スコア加算は「倒した瞬間」にしたい。
        // ※Enemy.ts側でスコア加算を呼ぶか、Game側で管理するか。
        // ここではシンプルに「Game側でHPを見て、死んでたらフラグを立てる」方式が面倒なので
        // 敵の配列から生存者だけフィルタリングする方式はとらず、
        // 攻撃ヒット時にEnemyクラス内で加算コールバックをするのが理想。
        // ですが、今回は「スコアは攻撃ヒット時」ではなく「倒した時」にしたい...
        // 簡易実装として「攻撃ヒット時」にスコアを増やしましょう。
      }
      
      // ★プレイヤーへのダメージ判定
      if (!enemy.isDead) {
        const dist = playerPos.distanceTo(enemy.mesh.position);
        // 敵が近くにいて（1.5m以内）、プレイヤーが無敵でなければ
        if (dist < 1.5) {
          this.player.takeDamage(1);
          // 敵も少しノックバックさせると良いが今回は省略
        }
      }
    });

    // 死んだ敵からスコアを得る（簡易実装：Enemyクラスをいじらずここで計算するのは難しいので、
    // Playerが攻撃を当てた時にスコアを加算するように変更します）
    // ※今回は「攻撃ヒット＝100点」にします。

    this.effectManager.update(delta);
    this.player.update(delta, this.inputManager, this.camera, this.level.obstacles, this.enemies, this.effectManager);
    this.cameraController.update(this.inputManager);

    // --- UI更新 ---
    
    // HPバーの更新
    const hpPercent = (this.player.hp / this.player.maxHp) * 100;
    this.hpBarElement.style.width = `${hpPercent}%`;
    
    // HPに応じて色を変える演出
    if (hpPercent > 50) this.hpBarElement.style.backgroundColor = '#00ff00'; // 緑
    else if (hpPercent > 20) this.hpBarElement.style.backgroundColor = '#ffff00'; // 黄
    else this.hpBarElement.style.backgroundColor = '#ff0000'; // 赤

    // スコア更新（Player.checkAttackHit内で敵を倒した判定を取るのが綺麗ですが、
    // ここでは「倒された敵の数」を数える方式に変えます）
    const deadCount = this.enemies.filter(e => e.isDead).length;
    this.score = deadCount * 1000; // 1体1000点
    this.scoreElement.innerText = `SCORE: ${this.score}`;

    // --- ゲームオーバー判定 ---
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