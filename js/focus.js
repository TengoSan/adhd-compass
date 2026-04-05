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

    // クイックメモボタン
    const memoBtn = document.getElementById('focus-memo-btn');
    if (memoBtn) {
      memoBtn.addEventListener('click', () => this.toggleQuickMemo());
    }

    const memoSave = document.getElementById('focus-memo-save');
    if (memoSave) {
      memoSave.addEventListener('click', () => this.saveQuickMemo());
    }

    const memoInput = document.getElementById('focus-memo-input');
    if (memoInput) {
      memoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.saveQuickMemo();
        if (e.key === 'Escape') this.toggleQuickMemo();
      });
    }

    // リカバリー画面の復帰ボタン
    const recoveryBtn = document.getElementById('recovery-resume-btn');
    if (recoveryBtn) {
      recoveryBtn.addEventListener('click', () => this.dismissRecovery());
    }

    // 5秒ルールのキャンセルボタン
    const fiveSecCancel = document.getElementById('five-sec-cancel');
    if (fiveSecCancel) {
      fiveSecCancel.addEventListener('click', () => this.cancelFiveSecRule());
    }

    // アプリ離脱検出
    this._setupVisibilityDetection();
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
    this._leaveCount = 0;
    this.requestNotificationPermission();

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
      leaveCount: this._leaveCount,
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

    // 離脱回数の表示
    const statsEl = document.getElementById('result-stats');
    if (statsEl) {
      if (session.leaveCount > 0) {
        statsEl.textContent = `脱線: ${session.leaveCount}回`;
      } else {
        statsEl.textContent = '脱線なし！すごい！';
      }
    }

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
    // Electron環境ではネイティブ通知を使う
    if (window.electronAPI) {
      window.electronAPI.sendNotification(title, body);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: 'assets/icons/icon-192.png' });
    }
  },

  // ========================================
  // Step 3: 注意散漫対策
  // ========================================

  _leftAt: null,        // アプリ離脱時刻
  _leaveCount: 0,       // 離脱回数
  _fiveSecTimer: null,   // 5秒ルールタイマー

  /**
   * アプリ離脱検出のセットアップ
   */
  _setupVisibilityDetection() {
    document.addEventListener('visibilitychange', () => {
      // 集中中でなければ無視
      if (Timer.state !== 'running' && Timer.state !== 'overtime') return;

      if (document.hidden) {
        // アプリから離脱
        this._leftAt = Date.now();
        this._leaveCount++;
      } else {
        // アプリに復帰
        if (this._leftAt) {
          const awayMs = Date.now() - this._leftAt;
          this._leftAt = null;

          // 10秒以上離れていたらリカバリー画面を表示
          if (awayMs > 10000) {
            this.showRecovery(awayMs);
          }
        }
      }
    });
  },

  /**
   * リカバリー画面を表示
   */
  showRecovery(awayMs) {
    const recovery = document.getElementById('focus-recovery');
    if (!recovery) return;

    // タスク名を表示
    document.getElementById('recovery-task-name').textContent = this.taskName;

    // 離席時間を表示
    const awaySec = Math.round(awayMs / 1000);
    let awayText;
    if (awaySec < 60) {
      awayText = `${awaySec}秒 離れてたよ`;
    } else {
      awayText = `${Math.round(awaySec / 60)}分 離れてたよ`;
    }
    document.getElementById('recovery-elapsed').textContent = awayText;

    recovery.style.display = 'flex';
  },

  /**
   * リカバリー画面を閉じる
   */
  dismissRecovery() {
    const recovery = document.getElementById('focus-recovery');
    if (recovery) recovery.style.display = 'none';
  },

  /**
   * クイックメモの表示/非表示
   */
  toggleQuickMemo() {
    const btn = document.getElementById('focus-memo-btn');
    const inputArea = document.getElementById('focus-memo-input-area');
    const input = document.getElementById('focus-memo-input');

    if (inputArea.style.display === 'none') {
      // 5秒ルール: まず5秒カウントダウンを表示
      this.showFiveSecRule();
    } else {
      inputArea.style.display = 'none';
      btn.style.display = 'block';
    }
  },

  /**
   * クイックメモを保存
   */
  saveQuickMemo() {
    const input = document.getElementById('focus-memo-input');
    const text = input.value.trim();
    if (!text) return;

    Storage.addMemo(text);
    input.value = '';

    // メモ入力を閉じて元に戻す
    document.getElementById('focus-memo-input-area').style.display = 'none';
    document.getElementById('focus-memo-btn').style.display = 'block';

    // 保存フィードバック
    const btn = document.getElementById('focus-memo-btn');
    const original = btn.textContent;
    btn.textContent = '✅ メモした！';
    setTimeout(() => { btn.textContent = original; }, 1500);
  },

  /**
   * 5秒ルール表示
   */
  showFiveSecRule() {
    const overlay = document.getElementById('five-sec-overlay');
    const countEl = document.getElementById('five-sec-count');
    if (!overlay) return;

    overlay.style.display = 'flex';
    let count = 5;
    countEl.textContent = count;

    this._fiveSecTimer = setInterval(() => {
      count--;
      countEl.textContent = count;
      if (count <= 0) {
        clearInterval(this._fiveSecTimer);
        this._fiveSecTimer = null;
        // 5秒経過 → メモ入力を表示
        overlay.style.display = 'none';
        document.getElementById('focus-memo-btn').style.display = 'none';
        document.getElementById('focus-memo-input-area').style.display = 'flex';
        document.getElementById('focus-memo-input').focus();
      }
    }, 1000);
  },

  /**
   * 5秒ルールキャンセル（衝動が消えた）
   */
  cancelFiveSecRule() {
    if (this._fiveSecTimer) {
      clearInterval(this._fiveSecTimer);
      this._fiveSecTimer = null;
    }
    document.getElementById('five-sec-overlay').style.display = 'none';
  },

  /**
   * セッション開始時にOS通知の許可を求める
   */
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  // ========================================
  // Step 4: 休憩モード
  // ========================================

  _breakMinutes: 5,
  _breakActivities: [
    '立ち上がって、ストレッチしよう 🧘',
    '水を一杯飲もう 💧',
    '窓の外を30秒眺めよう 🌳',
    '深呼吸を5回しよう 🌬️',
    '肩を10回まわそう 💪',
    '顔を洗おう 🚿',
    '好きな音楽を1曲聴こう 🎵',
    '手を握ったり開いたりしよう ✊✋',
    '目を閉じて30秒休もう 😌',
    '首をゆっくり回そう 🔄',
    '好きな飲み物を入れよう ☕',
    'トイレに行っておこう 🚻'
  ],

  /**
   * 休憩モードの初期化
   */
  initBreak() {
    // 休憩ボタン（結果画面から）
    const breakBtn = document.getElementById('result-break-btn');
    if (breakBtn) {
      breakBtn.addEventListener('click', () => this.showBreakSetup());
    }

    // 休憩時間選択
    document.querySelectorAll('.break-time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.break-time-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this._breakMinutes = Number(btn.dataset.minutes);
      });
    });

    // 休憩スタート
    const startBtn = document.getElementById('break-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startBreak());
    }

    // 休憩後→次のセッション
    const toFocusBtn = document.getElementById('break-to-focus');
    if (toFocusBtn) {
      toFocusBtn.addEventListener('click', () => {
        document.getElementById('focus-break').style.display = 'none';
        this.resetToSetup();
      });
    }
  },

  /**
   * 休憩セットアップ画面を表示
   */
  showBreakSetup() {
    document.getElementById('focus-result').style.display = 'none';
    document.getElementById('focus-break').style.display = 'block';
    document.getElementById('break-setup').style.display = 'block';
    document.getElementById('break-active').style.display = 'none';
    document.getElementById('break-done').style.display = 'none';
  },

  /**
   * 休憩開始
   */
  startBreak() {
    document.getElementById('break-setup').style.display = 'none';
    document.getElementById('break-active').style.display = 'block';

    // ランダムなアクティビティを選択
    const activity = this._breakActivities[Math.floor(Math.random() * this._breakActivities.length)];
    document.getElementById('break-activity-text').textContent = activity;

    // 次のタスクを表示
    const nextEl = document.getElementById('break-next-task');
    if (nextEl) {
      nextEl.textContent = this.nextTask ? `次: ${this.nextTask}` : '';
    }

    // タイマー開始
    Timer.onTick = (remaining, elapsed, progress) => {
      this.updateBreakDisplay(remaining, progress);
    };
    Timer.onComplete = () => this.onBreakComplete();
    Timer.onWarning = null;
    Timer.onUrgent = null;
    Timer.onOvertime = null;

    Timer.startBreak(this._breakMinutes);
  },

  /**
   * 休憩タイマーの表示更新
   */
  updateBreakDisplay(remaining, progress) {
    const timeEl = document.getElementById('break-time-display');
    if (timeEl) {
      timeEl.textContent = Timer.formatTime(remaining);
    }

    const progressCircle = document.getElementById('break-progress-circle');
    if (progressCircle) {
      const circumference = 2 * Math.PI * 45;
      const offset = circumference * (1 - Math.min(progress, 1));
      progressCircle.style.strokeDashoffset = offset;
    }
  },

  /**
   * 休憩終了
   */
  onBreakComplete() {
    document.getElementById('break-active').style.display = 'none';
    document.getElementById('break-done').style.display = 'block';

    // 次のタスクを表示
    const nextEl = document.getElementById('break-done-next');
    if (nextEl) {
      nextEl.textContent = this.nextTask ? `次にやること: ${this.nextTask}` : '';
    }

    // 通知
    this.playNotificationSound();
    this.sendNotification('休憩終了！', 'リフレッシュできた？次に進もう！');
  }
};
