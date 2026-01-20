import nipplejs from 'nipplejs';

/**
 * 入力管理クラス
 * キーボード、マウス、タッチ、バーチャルスティックを管理
 */
export class InputManager {
  public moveVector: { x: number; y: number };
  public lookDelta: { x: number; y: number };

  public isRollPressed: boolean = false;
  public isAttackPressed: boolean = false;

  private keys: { [key: string]: boolean };
  private isRightMouseDown: boolean = false;
  private previousTouch: { x: number; y: number } | null = null;
  
  // バーチャルスティック管理
  private joystickManager: any = null;

  constructor() {
    this.moveVector = { x: 0, y: 0 };
    this.lookDelta = { x: 0, y: 0 };
    this.keys = {};

    // --- PC操作イベント ---
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // --- スマホ視点操作 ---
    window.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', () => this.onTouchEnd());

    // --- 初期化 ---
    setTimeout(() => {
      this.initJoystick();
      this.initButtons();
    }, 100);
  }

  private initJoystick(): void {
    const zone = document.getElementById('joystick-zone');
    if (zone) {
      this.joystickManager = nipplejs.create({
        zone: zone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'white',
        size: 100
      });

      // スティックが動いた時（引数名の修正）
      this.joystickManager.on('move', (_evt: any, data: any) => {
        if (data && data.vector) {
          this.moveVector.x = data.vector.x;
          this.moveVector.y = -data.vector.y;
        }
      });

      // スティックを離した時
      this.joystickManager.on('end', () => {
        this.moveVector.x = 0;
        this.moveVector.y = 0;
      });
    }
  }

  private initButtons(): void {
    const btnAttack = document.getElementById('btn-attack');
    const btnRoll = document.getElementById('btn-roll');

    const handlePress = (type: 'attack' | 'roll', isPressed: boolean) => {
      if (type === 'attack') this.isAttackPressed = isPressed;
      if (type === 'roll') this.isRollPressed = isPressed;
    };

    // 攻撃ボタン
    if (btnAttack) {
      btnAttack.addEventListener('touchstart', (e) => { e.preventDefault(); handlePress('attack', true); });
      btnAttack.addEventListener('touchend', (e) => { e.preventDefault(); handlePress('attack', false); });
      btnAttack.addEventListener('mousedown', () => handlePress('attack', true));
      btnAttack.addEventListener('mouseup', () => handlePress('attack', false));
    }

    // 回避ボタン
    if (btnRoll) {
      btnRoll.addEventListener('touchstart', (e) => { e.preventDefault(); handlePress('roll', true); });
      btnRoll.addEventListener('touchend', (e) => { e.preventDefault(); handlePress('roll', false); });
      btnRoll.addEventListener('mousedown', () => handlePress('roll', true));
      btnRoll.addEventListener('mouseup', () => handlePress('roll', false));
    }
  }

  public update(): void {
    // PCキーボード入力がある場合はそちらを優先
    let x = 0;
    let y = 0;
    let hasKeyInput = false;

    if (this.keys['w'] || this.keys['arrowup']) { y -= 1; hasKeyInput = true; }
    if (this.keys['s'] || this.keys['arrowdown']) { y += 1; hasKeyInput = true; }
    if (this.keys['a'] || this.keys['arrowleft']) { x -= 1; hasKeyInput = true; }
    if (this.keys['d'] || this.keys['arrowright']) { x += 1; hasKeyInput = true; }

    if (hasKeyInput) {
      if (x !== 0 || y !== 0) {
        const length = Math.sqrt(x * x + y * y);
        x /= length;
        y /= length;
      }
      this.moveVector = { x, y };
    }
    
    if (this.keys[' ']) this.isRollPressed = true;
  }

  public reset(): void {
    this.lookDelta = { x: 0, y: 0 };
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
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON') return;

    if (event.button === 0) this.isAttackPressed = true;
    if (event.button === 2) this.isRightMouseDown = true;
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) this.isAttackPressed = false;
    if (event.button === 2) this.isRightMouseDown = false;
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isRightMouseDown) {
      this.lookDelta.x += event.movementX;
      this.lookDelta.y += event.movementY;
    }
  }

  private onTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('#mobile-controls')) return;

    if (event.touches.length > 0) {
      this.previousTouch = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
  }

  private onTouchMove(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('#joystick-zone')) return;

    if (event.touches.length > 0 && this.previousTouch) {
      const touch = event.touches[0];
      const dx = touch.clientX - this.previousTouch.x;
      const dy = touch.clientY - this.previousTouch.y;

      this.lookDelta.x += dx;
      this.lookDelta.y += dy;

      this.previousTouch = {
        x: touch.clientX,
        y: touch.clientY
      };
    }
  }

  private onTouchEnd(): void {
    this.previousTouch = null;
  }
}