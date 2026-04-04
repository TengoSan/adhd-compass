/**
 * ADHDコンパス - バブルアニメーション
 * Canvasで泡の膨張・揺れ・浮上を表現
 */
const BubbleAnimation = {
  canvas: null,
  ctx: null,
  animId: null,
  progress: 0,       // 0〜1 (時間経過の割合)
  state: 'idle',     // idle, focus, warning, urgent, overtime, surfacing

  // バブルパラメータ
  bubbleX: 0,
  bubbleY: 0,
  baseRadius: 0,
  wobblePhase: 0,
  smallBubbles: [],  // 背景の小さな泡

  /**
   * 初期化
   */
  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.resize();
    this._generateSmallBubbles();

    window.addEventListener('resize', () => this.resize());
  },

  /**
   * Canvasサイズ調整
   */
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.bubbleX = w / 2;
    this.bubbleY = h / 2;
    this.baseRadius = Math.min(w, h) * 0.28;
  },

  /**
   * 背景の小さな泡を生成
   */
  _generateSmallBubbles() {
    this.smallBubbles = [];
    for (let i = 0; i < 15; i++) {
      this.smallBubbles.push({
        x: Math.random(),
        y: Math.random(),
        r: 2 + Math.random() * 6,
        speed: 0.0002 + Math.random() * 0.0005,
        phase: Math.random() * Math.PI * 2
      });
    }
  },

  /**
   * 描画ループ開始
   */
  start() {
    this.state = 'focus';
    this._animate();
  },

  /**
   * 描画停止
   */
  stop() {
    this.state = 'idle';
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    this._clear();
  },

  /**
   * 進捗を更新 (0〜1)
   */
  setProgress(p) {
    this.progress = Math.min(1, Math.max(0, p));

    // 状態を自動判定
    if (p >= 1) {
      this.state = 'overtime';
    } else if (p >= 0.95) {
      this.state = 'urgent';
    } else if (p >= 0.8) {
      this.state = 'warning';
    } else {
      this.state = 'focus';
    }
  },

  /**
   * 浮上アニメーション
   */
  playSurface() {
    this.state = 'surfacing';
    // 3秒後にidleに戻す
    setTimeout(() => {
      this.state = 'idle';
    }, 3000);
  },

  /**
   * アニメーションループ
   */
  _animate() {
    if (this.state === 'idle') return;

    this._clear();
    this._drawBackground();
    this._drawSmallBubbles();
    this._drawMainBubble();

    this.wobblePhase += 0.02;
    this.animId = requestAnimationFrame(() => this._animate());
  },

  /**
   * 画面クリア
   */
  _clear() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, w, h);
  },

  /**
   * 背景グラデーション
   */
  _drawBackground() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const ctx = this.ctx;

    // 進捗に応じた色変化: 青→黄→赤
    let color1, color2;
    if (this.state === 'overtime') {
      color1 = 'rgba(239, 68, 68, 0.25)';
      color2 = 'rgba(239, 68, 68, 0.08)';
    } else if (this.progress < 0.5) {
      // 青系
      color1 = 'rgba(59, 130, 246, 0.2)';
      color2 = 'rgba(59, 130, 246, 0.05)';
    } else if (this.progress < 0.8) {
      // 青→黄
      const t = (this.progress - 0.5) / 0.3;
      const r = Math.round(59 + t * 186);
      const g = Math.round(130 + t * 28);
      const b = Math.round(246 - t * 235);
      color1 = `rgba(${r}, ${g}, ${b}, 0.2)`;
      color2 = `rgba(${r}, ${g}, ${b}, 0.06)`;
    } else {
      // 黄→赤
      const t = (this.progress - 0.8) / 0.2;
      const r = Math.round(245 - t * 6);
      const g = Math.round(158 - t * 90);
      const b = Math.round(11 + t * 57);
      color1 = `rgba(${r}, ${g}, ${b}, 0.25)`;
      color2 = `rgba(${r}, ${g}, ${b}, 0.08)`;
    }

    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },

  /**
   * 背景の小さな泡
   */
  _drawSmallBubbles() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const ctx = this.ctx;
    const t = Date.now() / 1000;

    this.smallBubbles.forEach(b => {
      // ゆっくり上昇
      b.y -= b.speed;
      if (b.y < -0.05) {
        b.y = 1.05;
        b.x = Math.random();
      }

      const x = b.x * w + Math.sin(t + b.phase) * 8;
      const y = b.y * h;

      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.fill();

      // ハイライト
      ctx.beginPath();
      ctx.arc(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fill();
    });
  },

  /**
   * メインバブル描画
   */
  _drawMainBubble() {
    const ctx = this.ctx;
    const t = this.wobblePhase;

    // 膨張: 進捗に応じてサイズ変化
    let radiusMultiplier = 0.8 + this.progress * 0.4; // 0.8→1.2

    // 揺れの強さ: 警告時は揺れが大きくなる
    let wobbleAmp = 2;
    if (this.state === 'warning') wobbleAmp = 5;
    if (this.state === 'urgent') wobbleAmp = 10;
    if (this.state === 'overtime') wobbleAmp = 15;

    const wobbleX = Math.sin(t * 1.5) * wobbleAmp;
    const wobbleY = Math.cos(t * 2) * wobbleAmp * 0.5;

    const r = this.baseRadius * radiusMultiplier;
    const cx = this.bubbleX + wobbleX;
    const cy = this.bubbleY + wobbleY;

    // バブル色
    let bubbleColor, bubbleGlow;
    if (this.state === 'overtime') {
      bubbleColor = 'rgba(239, 68, 68, 0.3)';
      bubbleGlow = 'rgba(239, 68, 68, 0.15)';
    } else if (this.state === 'urgent') {
      bubbleColor = 'rgba(245, 158, 11, 0.35)';
      bubbleGlow = 'rgba(245, 158, 11, 0.15)';
    } else if (this.state === 'warning') {
      bubbleColor = 'rgba(245, 200, 11, 0.3)';
      bubbleGlow = 'rgba(245, 200, 11, 0.12)';
    } else {
      bubbleColor = 'rgba(59, 130, 246, 0.3)';
      bubbleGlow = 'rgba(59, 130, 246, 0.12)';
    }

    // グロー
    ctx.beginPath();
    ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
    ctx.fillStyle = bubbleGlow;
    ctx.fill();

    // メインの泡
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = bubbleColor;
    ctx.fill();
    ctx.strokeStyle = this.state === 'overtime'
      ? 'rgba(239, 68, 68, 0.4)'
      : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ハイライト（光の反射）
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy - r * 0.3, r * 0.15, r * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();

    // 浮上アニメーション
    if (this.state === 'surfacing') {
      this._drawSurfaceEffect(cx, cy, r);
    }
  },

  /**
   * 浮上エフェクト
   */
  _drawSurfaceEffect(cx, cy, r) {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const t = Date.now() / 1000;

    // 水面の波紋
    for (let i = 0; i < 5; i++) {
      const waveR = r + 30 + i * 25 + Math.sin(t * 3 + i) * 10;
      ctx.beginPath();
      ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 - i * 0.04})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
};
