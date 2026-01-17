import * as THREE from 'three';

/**
 * ゲームのステージ（マップ）を管理するクラス
 * 床、壁、障害物などを生成する
 */
export class Level {
  // 障害物のリスト（後で当たり判定に使うため保持しておく）
  public obstacles: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    // 1. 床の作成
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x444444, 
      roughness: 0.8 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // 横倒し
    floor.position.y = 0;
    floor.receiveShadow = true; // 影を受ける
    scene.add(floor);

    // グリッドヘルパー（距離感がわかるように薄く表示）
    const gridHelper = new THREE.GridHelper(100, 20);
    gridHelper.position.y = 0.01; // 床と重ならないように少し浮かす
    scene.add(gridHelper);

    // 2. 障害物（壁・柱）の配置
    this.createWall(scene, 5, 4, 2, new THREE.Vector3(5, 2, 5));   // 右手前の柱
    this.createWall(scene, 5, 4, 2, new THREE.Vector3(-5, 2, 5));  // 左手前の柱
    this.createWall(scene, 2, 4, 10, new THREE.Vector3(10, 2, 0)); // 右の壁
    this.createWall(scene, 2, 4, 10, new THREE.Vector3(-10, 2, 0)); // 左の壁
    this.createWall(scene, 10, 3, 2, new THREE.Vector3(0, 1.5, -10)); // 奥の低い壁
    
    // 中央に大きなブロック
    this.createWall(scene, 4, 2, 4, new THREE.Vector3(0, 1, 8));
  }

  /**
   * 箱型の障害物を作成してシーンに追加するヘルパーメソッド
   */
  private createWall(
    scene: THREE.Scene, 
    width: number, 
    height: number, 
    depth: number, 
    position: THREE.Vector3
  ): void {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const wall = new THREE.Mesh(geometry, material);
    
    wall.position.copy(position);
    wall.castShadow = true;   // 影を落とす
    wall.receiveShadow = true; // 影を受ける
    
    scene.add(wall);
    
    // リストに追加（後で衝突判定に使用）
    this.obstacles.push(wall);
  }
}