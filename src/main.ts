import './style.css';
import { Game } from './core/Game';

// ページの読み込み完了後にゲームを開始
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});