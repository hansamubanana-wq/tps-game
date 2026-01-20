import * as THREE from 'three';

/**
 * ゲームのステージ（マップ）を管理するクラス
 */
export class Level {
  public obstacles: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    // 1. テクスチャの生成（画像ファイルを使わずプログラムで作る）
    const floorTexture = this.createGridTexture();
    const wallTexture = this.createBlockTexture();

    // 2. 床の作成
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      map: floorTexture, // テクスチャを貼る
      roughness: 0.8,
      color: 0x888888 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 3. 障害物（壁・柱）の配置
    // 壁のマテリアル
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      map: wallTexture,
      roughness: 0.1,
      metalness: 0.1,
      color: 0xaaaaaa
    });

    this.createWall(scene, wallMaterial, 5, 4, 2, new THREE.Vector3(5, 2, 5));
    this.createWall(scene, wallMaterial, 5, 4, 2, new THREE.Vector3(-5, 2, 5));
    this.createWall(scene, wallMaterial, 2, 4, 10, new THREE.Vector3(10, 2, 0));
    this.createWall(scene, wallMaterial, 2, 4, 10, new THREE.Vector3(-10, 2, 0));
    this.createWall(scene, wallMaterial, 10, 3, 2, new THREE.Vector3(0, 1.5, -10));
    this.createWall(scene, wallMaterial, 4, 2, 4, new THREE.Vector3(0, 1, 8));
  }

  private createWall(
    scene: THREE.Scene, 
    material: THREE.Material,
    width: number, 
    height: number, 
    depth: number, 
    position: THREE.Vector3
  ): void {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const wall = new THREE.Mesh(geometry, material);
    
    wall.position.copy(position);
    wall.castShadow = true;
    wall.receiveShadow = true;
    
    scene.add(wall);
    this.obstacles.push(wall);
  }

  /**
   * 床用のグリッドテクスチャを生成する
   */
  private createGridTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#222'; // ベース色
      context.fillRect(0, 0, 512, 512);
      
      context.strokeStyle = '#444'; // ライン色
      context.lineWidth = 4;
      
      // グリッドを描く
      context.beginPath();
      for (let i = 0; i <= 512; i += 64) {
        context.moveTo(i, 0);
        context.lineTo(i, 512);
        context.moveTo(0, i);
        context.lineTo(512, i);
      }
      context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20); // 20回繰り返して貼る
    
    return texture;
  }

  /**
   * 壁用のブロックテクスチャを生成する
   */
  private createBlockTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#555';
      context.fillRect(0, 0, 512, 512);
      
      context.fillStyle = '#666';
      context.fillRect(10, 10, 236, 236);
      context.fillRect(266, 10, 236, 236);
      context.fillRect(10, 266, 236, 236);
      context.fillRect(266, 266, 236, 236);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}