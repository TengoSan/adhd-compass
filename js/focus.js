/**
 * ADHDコンパス - フォーカスバブル画面ロジック
 */
const Focus = {
  // 設定
  selectedMinutes: 25,
  taskName: '',
  nextTask: '',

  /**
   * 初期化
   */
  init() {
    this.setupTimeButtons();
    this.setupStartButton();
    this.setupFocusControls();
  },

  /**
   * 時間選択ボタンのセットアップ
   */
  setupTimeButtons() {
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedMinutes = Number(btn.dataset.minutes);
      });
    });
  },

  /**
   * 開始ボタンのセットアップ
   */
  setupStartButton() {
    const startBtn = document.getElementById('focus-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startSession());
    }
  },

  /**
   * 集中中コントロールのセットアップ
   */
  setupFocusControls() {
    // 浮上（停止）ボタン
    const surfaceBtn = document.getElementById('focus-surface-btn');
    if (surfaceBtn) {
      surfaceBtn.addEventListener('click', () => this.endSession());
    }

    // 一時停止/再開ボタン
    const pauseBtn = document.getElementById('focus-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.togglePause());
    }
  },

  /**
   * セッション開始
   */
  startSession() {
    const taskInput = document.getElementById('focus-task-input');
    this.taskName = taskInput ? taskInput.value.trim() || 'タスク' : 'タスク';

    const nextInput = document.getElementById('focus-next-input');
    this.nextTask = nextInput ? nextInput.value.trim() : '';

    // UI切り替え: 設定画面 → 集中画面
    document.getElementById('focus-setup').style.display = 'none';
    document.getElementById('focus-active').style.display = 'flex';

    // タスク名表示
    document.getElementById('focus-current-task').textContent = this.taskName;

    // 次のタスク表示
    const nextEl = document.getElementById('focus-next-display');
    if (nextEl) {
      nextEl.textContent = this.nextTask ? `次: ${this.nextTask}` : '';
    }

    // タイマー開始
    Timer.onTick = (remaining, elapsed, progress) => {
      this.updateDisplay(remaining, progress);
    };
    Timer.onWarning = () => this.onWarning();
    Timer.onUrgent = () => this.onUrgent();
    Timer.onComplete = () => this.onComplete();
    Timer.onOvertime = (ms) => this.onOvertime(ms);

    Timer.start(this.selectedMinutes);

    // Canvas初期化＋アニメーション開始（表示後にサイズを取得する必要がある）
    requestAnimationFrame(() => {
      const canvas = document.getElementById('bubble-canvas');
      if (canvas) {
        BubbleAnimation.init(canvas);
        BubbleAnimation.start();
      }
    });

    // 集中開始時刻を記録
    this._sessionStart = new Date();
  },

  /**
   * 表示を更新
   */
  updateDisplay(remaining, progress) {
    // 残り時間
    const timeEl = document.getElementById('focus-time-display');
    if (timeEl) {
      if (Timer.state === 'overtime') {
        const overtime = Timer.getElapsed() - Timer.duration;
        timeEl.textContent = '+' + Timer.formatTime(overtime);
        timeEl.classList.add('overtime');
      } else {
        timeEl.textContent = Timer.formatTime(remaining);
        timeEl.classList.remove('overtime');
      }
    }

    // バブルの進捗更新
    BubbleAnimation.setProgress(progress);

    // 円形プログレスバー
    const progressCircle = document.getElementById('focus-progress-circle');
    if (progressCircle) {
      const circumference = 2 * Math.PI * 45; // r=45
      const offset = circumference * (1 - Math.min(progress, 1));
      progressCircle.style.strokeDashoffset = offset;

      // 色の変化
      if (progress >= 1) {
        progressCircle.style.stroke = '#ef4444';
      } else if (progress >= 0.8) {
        progressCircle.style.stroke = '#f59e0b';
      } else {
        progressCircle.style.stroke = '#3b82f6';
      }
    }
  },

  /**
   * 残り5分の警告
   */
  onWarning() {
    // 画面のパルスエフェクト
    const active = document.getElementById('focus-active');
    if (active) active.classList.add('warning-pulse');
  },

  /**
   * 残り1分の緊急通知
   */
  onUrgent() {
    const active = document.getElementById('focus-active');
    if (active) {
      active.classList.remove('warning-pulse');
      active.classList.add('urgent-glow');
    }

    // スマホの振動（対応機器のみ）
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  },

  /**
   * 時間終了
   */
  onComplete() {
    const active = document.getElementById('focus-active');
    if (active) {
      active.classList.remove('warning-pulse', 'urgent-glow');
      active.classList.add('overtime-mode');
    }

    // 通知音（Web Audio APIで短いチャイム）
    this.playNotificationSound();

    // OS通知
    this.sendNotification('時間だよ！', '🫧 そろそろ浮上しよう');

    // 浮上ボタンを強調
    const surfaceBtn = document.getElementById('focus-surface-btn');
    if (surfaceBtn) surfaceBtn.classList.add('pulse');
  },

  /**
   * 超過モード
   */
  onOvertime(ms) {
    // 10分超過で強い通知
    if (ms > 10 * 60 * 1000 && !this._overtimeAlert) {
      this._overtimeAlert = true;
      this.sendNotification('10分超過！', '休憩しよう。立ち上がって水を飲もう 🌊');
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
    }
  },

  /**
   * 一時停止/再開
   */
  togglePause() {
    const pauseBtn = document.getElementById('focus-pause-btn');
    if (Timer.state === 'running' || Timer.state === 'overtime') {
      Timer.pause();
      if (pauseBtn) pauseBtn.textContent = '▶ 再開';
      BubbleAnimation.stop();
    } else if (Timer.state === 'paused') {
      Timer.resume();
      if (pauseBtn) pauseBtn.textContent = '⏸ 一時停止';
      BubbleAnimation.start();
    }
  },

  /**
   * セッション終了
   */
  endSession() {
    const elapsed = Timer.getElapsed();
    const wasOvertime = Timer.state === 'overtime';

    Timer.stop();
    BubbleAnimation.stop();
    this._overtimeAlert = false;

    // セッションデータを保存
    const session = {
      task: this.taskName,
      plannedMinutes: this.selectedMinutes,
      actualMs: elapsed,
      wasOvertime: wasOvertime,
      startTime: this._sessionStart.toISOString(),
      endTime: new Date().toISOString()
    };
    this.saveSession(session);

    // 完了画面を表示
    this.showResult(session);
  },

  /**
   * 結果画面
   */
  showResult(session) {
    document.getElementById('focus-active').style.display = 'none';
    document.getElementById('focus-active').classList.remove('warning-pulse', 'urgent-glow', 'overtime-mode');

    const resultEl = document.getElementById('focus-result');
    resultEl.style.display = 'block';

    const actualMin = Math.round(session.actualMs / 60000);
    document.getElementById('result-task').textContent = session.task;
    document.getElementById('result-time').textContent = `${actualMin}分間 集中できた！`;

    // 次のタスクがあれば表示
    const nextEl = document.getElementById('result-next-task');
    if (nextEl) {
      nextEl.textContent = this.nextTask ? `次にやること: ${this.nextTask}` : '';
    }
  },

  /**
   * 設定画面に戻る
   */
  resetToSetup() {
    document.getElementById('focus-result').style.display = 'none';
    document.getElementById('focus-setup').style.display = 'block';

    // 入力をクリア
    const taskInput = document.getElementById('focus-task-input');
    if (taskInput) taskInput.value = '';
    const nextInput = document.getElementById('focus-next-input');
    if (nextInput) nextInput.value = '';

    // ボタンリセット
    const pauseBtn = document.getElementById('focus-pause-btn');
    if (pauseBtn) pauseBtn.textContent = '⏸ 一時停止';
    const surfaceBtn = document.getElementById('focus-surface-btn');
    if (surfaceBtn) surfaceBtn.classList.remove('pulse');
  },

  /**
   * セッションを保存
   */
  saveSession(session) {
    const sessions = Storage.load('focus-sessions', []);
    sessions.push(session);
    // 最大100件保持
    if (sessions.length > 100) sessions.shift();
    Storage.save('focus-sessions', sessions);
  },

  /**
   * 通知音を再生
   */
  playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // 優しいチャイム音（2音）
      [0, 0.3].forEach((delay, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.value = i === 0 ? 523.25 : 659.25; // C5, E5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.8);

        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.8);
      });
    } catch (e) {
      // Web Audio API未対応の場合は無視
    }
  },

  /**
   * OS通知を送る
   */
  sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: 'assets/icons/icon-192.png' });
    }
  }
};
