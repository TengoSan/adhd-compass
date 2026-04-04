/**
 * ADHDコンパス - メインアプリケーション
 * SPA画面遷移、感情チェックイン、メモ機能
 */
const App = {
  currentScreen: 'home',

  /**
   * アプリ初期化
   */
  init() {
    this.setupNavigation();
    this.setupMoodCheckin();
    this.setupMemo();
    this.setupTodayTasks();
    this.setupDecompose();
    this.restoreMoodState();
    this.updateSummary();
    Focus.init();
    Focus.initBreak();
    Quest.init();
  },

  // ========================================
  // 画面遷移
  // ========================================

  /**
   * ナビゲーションのセットアップ
   */
  setupNavigation() {
    // メインナビカード
    document.querySelectorAll('.nav-card').forEach(card => {
      card.addEventListener('click', () => {
        this.navigateTo(card.dataset.screen);
      });
    });

    // 戻るボタン（.back-btn と .back-btn-large の両方）
    document.querySelectorAll('.back-btn, .back-btn-large').forEach(btn => {
      btn.addEventListener('click', () => {
        // フォーカス画面からの場合はリセット
        if (btn.closest('#screen-focus')) {
          Focus.resetToSetup();
          // 休憩画面も非表示に
          const breakEl = document.getElementById('focus-break');
          if (breakEl) breakEl.style.display = 'none';
        }
        this.navigateTo(btn.dataset.screen);
      });
    });
  },

  /**
   * 画面を切り替える
   */
  navigateTo(screenId) {
    // 現在の画面を非表示
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
    });

    // 指定画面を表示
    const target = document.getElementById('screen-' + screenId);
    if (screenId === 'stats') Stats.refresh();
    if (screenId === 'home') this.updateSummary();
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
      // 画面トップにスクロール
      window.scrollTo(0, 0);
    }
  },

  // ========================================
  // 感情チェックイン
  // ========================================

  /**
   * 感情チェックインのセットアップ
   */
  setupMoodCheckin() {
    const moodMessages = {
      great: 'いい調子！その勢いで何か始めてみよう 🌟',
      okay: 'まあまあだね。無理せずいこう 👍',
      low: '今日はゆっくりでいいよ。小さなことから 🌱',
      irritated: 'イライラする日もあるよね。深呼吸してみよう 🌊'
    };

    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;

        // 選択状態を更新
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // メッセージを表示
        const result = document.getElementById('mood-result');
        result.textContent = moodMessages[mood];
        result.style.opacity = '0';
        requestAnimationFrame(() => {
          result.style.opacity = '1';
        });

        // コーチメッセージを表示
        this.showCoachMessage(mood);

        // 保存
        Storage.saveMood(mood);
      });
    });
  },

  /**
   * 前回の気分状態を復元
   */
  restoreMoodState() {
    const todayMood = Storage.getTodayMood();
    if (todayMood) {
      const btn = document.querySelector(`.mood-btn[data-mood="${todayMood.mood}"]`);
      if (btn) {
        btn.classList.add('selected');
        // 最後の記録時刻を表示
        const time = new Date(todayMood.time);
        const h = String(time.getHours()).padStart(2, '0');
        const m = String(time.getMinutes()).padStart(2, '0');
        document.getElementById('mood-result').textContent = `${h}:${m} に記録済み`;
        this.showCoachMessage(todayMood.mood);
      }
    }
  },

  // ========================================
  // メモ機能
  // ========================================

  /**
   * メモ機能のセットアップ
   */
  setupMemo() {
    const input = document.getElementById('memo-input');
    const addBtn = document.getElementById('memo-add-btn');

    // 追加ボタン
    addBtn.addEventListener('click', () => {
      this.addMemo();
    });

    // Enterキーで追加
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addMemo();
      }
    });

    // 初期表示
    this.renderMemos();
  },

  /**
   * メモを追加
   */
  addMemo() {
    const input = document.getElementById('memo-input');
    const text = input.value.trim();
    if (!text) return;

    Storage.addMemo(text);
    input.value = '';
    input.focus();
    this.renderMemos();
  },

  /**
   * メモ一覧を描画
   */
  renderMemos() {
    const memos = Storage.getMemos();
    const list = document.getElementById('memo-list');
    const empty = document.getElementById('memo-empty');

    if (memos.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    list.innerHTML = memos.map(memo => {
      const time = new Date(memo.time);
      const h = String(time.getHours()).padStart(2, '0');
      const m = String(time.getMinutes()).padStart(2, '0');
      return `
        <li class="memo-item" data-id="${memo.id}">
          <span class="memo-item-text">${this.escapeHtml(memo.text)}</span>
          <span class="memo-item-time">${h}:${m}</span>
          <button class="memo-item-delete" aria-label="削除">×</button>
        </li>
      `;
    }).join('');

    // 削除ボタンのイベント
    list.querySelectorAll('.memo-item-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.closest('.memo-item').dataset.id);
        Storage.deleteMemo(id);
        this.renderMemos();
      });
    });
  },

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // ========================================
  // 今日やること（タスク管理）
  // ========================================

  setupTodayTasks() {
    const input = document.getElementById('today-task-input');
    const addBtn = document.getElementById('today-task-add-btn');

    if (addBtn) {
      addBtn.addEventListener('click', () => this.addTodayTask());
    }
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.addTodayTask();
      });
    }

    this.renderTodayTasks();
  },

  addTodayTask() {
    const input = document.getElementById('today-task-input');
    const text = input.value.trim();
    if (!text) return;

    const today = Storage.todayKey();
    const tasks = Storage.load('today-tasks', {});
    if (!tasks[today]) tasks[today] = [];

    tasks[today].push({
      id: Date.now(),
      text: text,
      done: false
    });

    Storage.save('today-tasks', tasks);
    input.value = '';
    this.renderTodayTasks();
  },

  toggleTodayTask(id) {
    const today = Storage.todayKey();
    const tasks = Storage.load('today-tasks', {});
    if (!tasks[today]) return;

    const task = tasks[today].find(t => t.id === id);
    if (task) {
      task.done = !task.done;
      Storage.save('today-tasks', tasks);
      this.renderTodayTasks();
      this.updateSummary();
    }
  },

  deleteTodayTask(id) {
    const today = Storage.todayKey();
    const tasks = Storage.load('today-tasks', {});
    if (!tasks[today]) return;

    tasks[today] = tasks[today].filter(t => t.id !== id);
    Storage.save('today-tasks', tasks);
    this.renderTodayTasks();
    this.updateSummary();
  },

  renderTodayTasks() {
    const today = Storage.todayKey();
    const tasks = Storage.load('today-tasks', {});
    const todayTasks = tasks[today] || [];
    const list = document.getElementById('today-task-list');
    const hint = document.getElementById('today-task-hint');

    if (todayTasks.length === 0) {
      list.innerHTML = '';
      if (hint) hint.style.display = 'block';
      return;
    }

    if (hint) {
      hint.style.display = todayTasks.length >= 3 ? 'none' : 'block';
    }

    list.innerHTML = todayTasks.map(t => `
      <div class="today-task-item ${t.done ? 'done' : ''}" data-id="${t.id}">
        <button class="today-task-check">${t.done ? '✅' : '○'}</button>
        <span class="today-task-text">${this.escapeHtml(t.text)}</span>
        <button class="today-task-delete">×</button>
      </div>
    `).join('');

    list.querySelectorAll('.today-task-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.closest('.today-task-item').dataset.id);
        this.toggleTodayTask(id);
      });
    });

    list.querySelectorAll('.today-task-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.closest('.today-task-item').dataset.id);
        this.deleteTodayTask(id);
      });
    });
  },

  // ========================================
  // コーチメッセージ
  // ========================================

  showCoachMessage(mood) {
    const coachEl = document.getElementById('coach-message');
    const textEl = document.getElementById('coach-text');
    if (!coachEl || !textEl) return;

    const message = AIEngine.getCoachMessage(mood);
    textEl.textContent = message;
    coachEl.style.display = 'block';
  },

  // ========================================
  // タスク分解
  // ========================================

  _decomposeSteps: [],

  setupDecompose() {
    const decomposeBtn = document.getElementById('today-task-decompose-btn');
    const addAllBtn = document.getElementById('decompose-add-all');
    const cancelBtn = document.getElementById('decompose-cancel');

    if (decomposeBtn) {
      decomposeBtn.addEventListener('click', () => this.decomposeTask());
    }
    if (addAllBtn) {
      addAllBtn.addEventListener('click', () => this.addDecomposedSteps());
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideDecompose());
    }
  },

  decomposeTask() {
    const input = document.getElementById('today-task-input');
    const text = input.value.trim();
    if (!text) return;

    const steps = AIEngine.decomposeTask(text);
    this._decomposeSteps = steps;

    const stepsEl = document.getElementById('decompose-steps');
    stepsEl.innerHTML = steps.map((s, i) => `
      <div class="decompose-step">
        <span class="decompose-step-num">${i + 1}</span>
        <span class="decompose-step-text">${this.escapeHtml(s.text)}</span>
        <span class="decompose-step-time">${s.minutes}分</span>
      </div>
    `).join('');

    document.getElementById('decompose-result').style.display = 'block';
  },

  addDecomposedSteps() {
    const today = Storage.todayKey();
    const tasks = Storage.load('today-tasks', {});
    if (!tasks[today]) tasks[today] = [];

    this._decomposeSteps.forEach(step => {
      tasks[today].push({
        id: Date.now() + Math.random(),
        text: step.text,
        done: false
      });
    });

    Storage.save('today-tasks', tasks);
    document.getElementById('today-task-input').value = '';
    this.hideDecompose();
    this.renderTodayTasks();
  },

  hideDecompose() {
    document.getElementById('decompose-result').style.display = 'none';
    this._decomposeSteps = [];
  },

  // ========================================
  // 今日のサマリー
  // ========================================

  updateSummary() {
    const el = document.getElementById('summary-content');
    if (!el) return;

    const today = Storage.todayKey();
    const tasks = Storage.load('today-tasks', {});
    const todayTasks = tasks[today] || [];
    const doneCount = todayTasks.filter(t => t.done).length;

    const sessions = Storage.load('focus-sessions', []);
    const todaySessions = sessions.filter(s => s.startTime && s.startTime.startsWith(today));
    const totalMin = Math.round(todaySessions.reduce((sum, s) => sum + (s.actualMs || 0), 0) / 60000);

    const parts = [];
    if (doneCount > 0) parts.push(`タスク ${doneCount}個完了`);
    if (totalMin > 0) parts.push(`集中 ${totalMin}分`);

    el.textContent = parts.length > 0 ? parts.join(' / ') : 'まだ記録がないよ。何か始めてみよう！';
  }
};

// アプリ起動
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
