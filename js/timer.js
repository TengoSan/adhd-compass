/**
 * ADHDコンパス - タイマー管理
 * requestAnimationFrameベースの正確なカウントダウン
 */
const Timer = {
  // 状態
  state: 'idle', // idle, running, paused, overtime, break
  startTime: 0,
  duration: 0,       // 設定時間（ミリ秒）
  pausedElapsed: 0,  // 一時停止時の経過時間
  rafId: null,

  // コールバック
  onTick: null,      // 毎フレーム呼ばれる (remaining, elapsed, progress)
  onWarning: null,   // 残り5分で呼ばれる
  onUrgent: null,    // 残り1分で呼ばれる
  onComplete: null,  // 時間終了で呼ばれる
  onOvertime: null,  // 超過時に毎フレーム呼ばれる (overtimeMs)

  // 通知フラグ
  _warningSent: false,
  _urgentSent: false,
  _completeSent: false,

  /**
   * タイマーを開始
   * @param {number} durationMin - 時間（分）
   */
  start(durationMin) {
    this.duration = durationMin * 60 * 1000;
    this.startTime = performance.now();
    this.pausedElapsed = 0;
    this.state = 'running';
    this._warningSent = false;
    this._urgentSent = false;
    this._completeSent = false;
    this._tick();
  },

  /**
   * 一時停止
   */
  pause() {
    if (this.state !== 'running' && this.state !== 'overtime') return;
    this.pausedElapsed += performance.now() - this.startTime;
    this.state = 'paused';
    if (this.rafId) cancelAnimationFrame(this.rafId);
  },

  /**
   * 再開
   */
  resume() {
    if (this.state !== 'paused') return;
    this.startTime = performance.now();
    this.state = this.pausedElapsed >= this.duration ? 'overtime' : 'running';
    this._tick();
  },

  /**
   * 停止・リセット
   */
  stop() {
    this.state = 'idle';
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  },

  /**
   * 休憩タイマーを開始
   * @param {number} durationMin - 休憩時間（分）
   */
  startBreak(durationMin) {
    this.duration = durationMin * 60 * 1000;
    this.startTime = performance.now();
    this.pausedElapsed = 0;
    this.state = 'break';
    this._warningSent = false;
    this._urgentSent = false;
    this._completeSent = false;
    this._tick();
  },

  /**
   * アニメーションフレーム処理
   */
  _tick() {
    if (this.state === 'idle') return;

    const now = performance.now();
    const elapsed = this.pausedElapsed + (now - this.startTime);
    const remaining = Math.max(0, this.duration - elapsed);
    const progress = Math.min(1, elapsed / this.duration);

    // 毎フレームコールバック
    if (this.onTick) {
      this.onTick(remaining, elapsed, progress);
    }

    if (this.state === 'running' || this.state === 'break') {
      // 残り5分の警告
      if (!this._warningSent && remaining <= 5 * 60 * 1000 && remaining > 0) {
        this._warningSent = true;
        if (this.onWarning) this.onWarning(remaining);
      }

      // 残り1分の警告
      if (!this._urgentSent && remaining <= 60 * 1000 && remaining > 0) {
        this._urgentSent = true;
        if (this.onUrgent) this.onUrgent(remaining);
      }

      // 時間終了
      if (!this._completeSent && remaining <= 0) {
        this._completeSent = true;
        if (this.state === 'break') {
          // 休憩終了
          if (this.onComplete) this.onComplete();
          this.stop();
          return;
        } else {
          // 作業時間終了 → 超過モードへ
          this.state = 'overtime';
          if (this.onComplete) this.onComplete();
        }
      }
    }

    // 超過モード
    if (this.state === 'overtime') {
      const overtimeMs = elapsed - this.duration;
      if (this.onOvertime) this.onOvertime(overtimeMs);
    }

    this.rafId = requestAnimationFrame(() => this._tick());
  },

  /**
   * 残り時間を「MM:SS」形式で返す
   */
  formatTime(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  },

  /**
   * 現在の経過時間（ミリ秒）
   */
  getElapsed() {
    if (this.state === 'idle') return 0;
    if (this.state === 'paused') return this.pausedElapsed;
    return this.pausedElapsed + (performance.now() - this.startTime);
  }
};
