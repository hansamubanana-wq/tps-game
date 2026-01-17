/**
 * 入力管理クラス
 * キーボード、マウス、タッチ入力を管理する
 */
export class InputManager {
  // 移動入力
  public moveVector: { x: number; y: number };
  
  // 視点入力
  public lookDelta: { x: number; y: number };

  // アクション入力
  public isRollPressed: boolean = false;
  public isAttackPressed: boolean = false; // ★追加：攻撃ボタン

  // 内部状態
  private keys: { [key: string]: boolean };
  private isRightMouseDown: boolean = false; // ★変更：右クリック判定
  private previousTouch: { x: number; y: number } | null = null;

  constructor() {
    this.moveVector = { x: 0, y: 0 };
    this.lookDelta = { x: 0, y: 0 };
    this.keys = {};

    // キーボード
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // マウスイベント
    window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    
    // 右クリックのメニューが出ないようにする
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // タッチイベント
    window.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', () => this.onTouchEnd());
  }

  public update(): void {
    // 1. 移動入力
    let x = 0;
    let y = 0;

    if (this.keys['w'] || this.keys['arrowup']) y -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) y += 1;
    if (this.keys['a'] || this.keys['arrowleft']) x -= 1;
    if (this.keys['d'] || this.keys['arrowright']) x += 1;

    if (x !== 0 || y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }
    this.moveVector = { x, y };

    // 2. アクション入力
    this.isRollPressed = this.keys[' '] || false;
    // 攻撃は mousedown イベントでフラグが立つが、updateで拾った後にリセットする必要がある
    // (Player側で処理した後に false に戻す運用もできるが、ここではフレームの最後に reset() で戻す)
  }

  public reset(): void {
    this.lookDelta = { x: 0, y: 0 };
    this.isAttackPressed = false; // ★攻撃フラグは1フレームでリセット
  }

  // --- イベントハンドラ ---

  private onKeyDown(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = true;
    if (event.key === " ") this.keys[" "] = true;
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = false;
    if (event.key === " ") this.keys[" "] = false;
  }

  private onMouseDown(event: MouseEvent): void {
    // ボタン判定
    if (event.button === 0) {
      // 左クリック：攻撃
      this.isAttackPressed = true;
    } else if (event.button === 2) {
      // 右クリック：視点操作開始
      this.isRightMouseDown = true;
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isAttackPressed = false;
    } else if (event.button === 2) {
      this.isRightMouseDown = false;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    // 右ドラッグ時のみ視点回転
    if (this.isRightMouseDown) {
      this.lookDelta.x += event.movementX;
      this.lookDelta.y += event.movementY;
    }
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 0) {
      this.previousTouch = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      
      // スマホ簡易操作：右側タップで攻撃
      if (event.touches[0].clientX > window.innerWidth / 2) {
         this.isAttackPressed = true;
      }
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length > 0 && this.previousTouch) {
      const touch = event.touches[0];
      const dx = touch.clientX - this.previousTouch.x;
      const dy = touch.clientY - this.previousTouch.y;

      // 左側で少しスワイプしたら視点操作（簡易）
      if (touch.clientX < window.innerWidth / 2) {
         this.lookDelta.x += dx;
         this.lookDelta.y += dy;
      }
      
      this.previousTouch = {
        x: touch.clientX,
        y: touch.clientY
      };
    }
  }

  private onTouchEnd(): void {
    this.previousTouch = null;
    this.isAttackPressed = false;
  }
}