/**
 * ADHDコンパス - ルーティンクエスト
 * 日常習慣をRPG化。失敗しない設計。
 */
const Quest = {
  currentPeriod: 'morning',

  // デフォルトクエスト
  defaultQuests: {
    morning: [
      { text: '顔を洗う', exp: 10 },
      { text: '朝ごはんを食べる', exp: 15 },
      { text: '歯みがき', exp: 10 },
      { text: '身支度する', exp: 20 },
    ],
    afternoon: [
      { text: '水を飲む', exp: 10 },
      { text: '5分ストレッチ', exp: 15 },
      { text: '机の上を片付ける', exp: 20 },
    ],
    evening: [
      { text: 'お風呂に入る', exp: 20 },
      { text: '明日の準備', exp: 15 },
      { text: '歯みがき', exp: 10 },
      { text: '寝る準備', exp: 15 },
    ]
  },

  // レベルアップに必要なEXP
  expPerLevel: 100,

  // キャラクターアバター（レベルに応じて変化）
  avatars: ['🧒', '🧑', '🧙', '🦸', '👑', '🌟'],

  /**
   * 初期化
   */
  init() {
    this.setupTabs();
    this.setupAddForm();
    this.initQuestsIfNeeded();
    this.detectPeriod();
    this.renderQuests();
    this.renderStatus();
  },

  /**
   * 時間帯タブのセットアップ
   */
  setupTabs() {
    document.querySelectorAll('.quest-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.quest-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentPeriod = tab.dataset.period;
        this.renderQuests();
      });
    });
  },

  /**
   * クエスト追加フォームのセットアップ
   */
  setupAddForm() {
    const addBtn = document.getElementById('quest-add-btn');
    const form = document.getElementById('quest-add-form');
    const saveBtn = document.getElementById('quest-add-save');
    const input = document.getElementById('quest-add-input');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addBtn.style.display = 'none';
        form.style.display = 'block';
        input.focus();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.addQuest());
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.addQuest();
        if (e.key === 'Escape') {
          form.style.display = 'none';
          addBtn.style.display = 'block';
        }
      });
    }
  },

  /**
   * 初回起動時にデフォルトクエストを設定
   */
  initQuestsIfNeeded() {
    const quests = Storage.load('quests', null);
    if (!quests) {
      const initial = {};
      for (const period of ['morning', 'afternoon', 'evening']) {
        initial[period] = this.defaultQuests[period].map((q, i) => ({
          id: `${period}-${i}`,
          text: q.text,
          exp: q.exp,
          period: period
        }));
      }
      Storage.save('quests', initial);
    }

    // 今日の完了状態を初期化
    const today = Storage.todayKey();
    const completedToday = Storage.load('quest-completed', {});
    if (!completedToday[today]) {
      completedToday[today] = [];
      Storage.save('quest-completed', completedToday);
    }
  },

  /**
   * 現在の時間帯を自動検出
   */
  detectPeriod() {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.currentPeriod = 'morning';
    } else if (hour < 18) {
      this.currentPeriod = 'afternoon';
    } else {
      this.currentPeriod = 'evening';
    }

    // タブの選択状態を更新
    document.querySelectorAll('.quest-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.quest-tab[data-period="${this.currentPeriod}"]`);
    if (activeTab) activeTab.classList.add('active');
  },

  /**
   * クエストリストを描画
   */
  renderQuests() {
    const quests = Storage.load('quests', {});
    const periodQuests = quests[this.currentPeriod] || [];
    const completedToday = this.getCompletedToday();
    const list = document.getElementById('quest-list');

    if (periodQuests.length === 0) {
      list.innerHTML = '<p class="quest-empty">クエストがないよ。追加してみよう！</p>';
      this.updateProgress(0, 0);
      return;
    }

    let completedCount = 0;
    list.innerHTML = periodQuests.map(q => {
      const done = completedToday.includes(q.id);
      if (done) completedCount++;
      return `
        <div class="quest-item ${done ? 'done' : ''}" data-id="${q.id}">
          <button class="quest-check" aria-label="${done ? '完了済み' : '完了にする'}">
            ${done ? '✅' : '○'}
          </button>
          <span class="quest-text">${this.escapeHtml(q.text)}</span>
          <span class="quest-exp">+${q.exp}</span>
          <button class="quest-delete" aria-label="削除">×</button>
        </div>
      `;
    }).join('');

    this.updateProgress(completedCount, periodQuests.length);

    // チェックボタンのイベント
    list.querySelectorAll('.quest-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.quest-item').dataset.id;
        this.toggleQuest(id);
      });
    });

    // 削除ボタンのイベント
    list.querySelectorAll('.quest-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.quest-item').dataset.id;
        this.deleteQuest(id);
      });
    });
  },

  /**
   * クエストの完了/未完了を切り替え
   */
  toggleQuest(id) {
    const today = Storage.todayKey();
    const completed = Storage.load('quest-completed', {});
    if (!completed[today]) completed[today] = [];

    const quests = Storage.load('quests', {});
    let questExp = 0;
    for (const period of ['morning', 'afternoon', 'evening']) {
      const q = (quests[period] || []).find(q => q.id === id);
      if (q) { questExp = q.exp; break; }
    }

    const idx = completed[today].indexOf(id);
    if (idx === -1) {
      // 完了にする
      completed[today].push(id);
      this.addExp(questExp);
    } else {
      // 未完了に戻す
      completed[today].splice(idx, 1);
      this.addExp(-questExp);
    }

    Storage.save('quest-completed', completed);
    this.renderQuests();
    this.renderStatus();
  },

  /**
   * クエストを追加
   */
  addQuest() {
    const input = document.getElementById('quest-add-input');
    const expSelect = document.getElementById('quest-add-exp');
    const text = input.value.trim();
    if (!text) return;

    const quests = Storage.load('quests', {});
    if (!quests[this.currentPeriod]) quests[this.currentPeriod] = [];

    quests[this.currentPeriod].push({
      id: `${this.currentPeriod}-${Date.now()}`,
      text: text,
      exp: Number(expSelect.value),
      period: this.currentPeriod
    });

    Storage.save('quests', quests);
    input.value = '';

    // フォームを閉じる
    document.getElementById('quest-add-form').style.display = 'none';
    document.getElementById('quest-add-btn').style.display = 'block';

    this.renderQuests();
  },

  /**
   * クエストを削除
   */
  deleteQuest(id) {
    const quests = Storage.load('quests', {});
    for (const period of ['morning', 'afternoon', 'evening']) {
      if (quests[period]) {
        quests[period] = quests[period].filter(q => q.id !== id);
      }
    }
    Storage.save('quests', quests);
    this.renderQuests();
  },

  /**
   * 今日の完了済みIDリスト
   */
  getCompletedToday() {
    const today = Storage.todayKey();
    const completed = Storage.load('quest-completed', {});
    return completed[today] || [];
  },

  /**
   * 進捗バーを更新
   */
  updateProgress(done, total) {
    const fill = document.getElementById('quest-progress-fill');
    const text = document.getElementById('quest-progress-text');
    if (total === 0) {
      if (fill) fill.style.width = '0%';
      if (text) text.textContent = '';
      return;
    }
    const pct = Math.round((done / total) * 100);
    if (fill) fill.style.width = pct + '%';
    if (text) {
      if (done === total) {
        text.textContent = `🎉 全クリア！ ${done}/${total}`;
      } else {
        text.textContent = `あと${total - done}つ！ ${done}/${total}`;
      }
    }
  },

  /**
   * EXPを加算
   */
  addExp(amount) {
    const status = Storage.load('quest-status', { exp: 0, level: 1, totalExp: 0 });
    status.exp += amount;
    status.totalExp = Math.max(0, (status.totalExp || 0) + amount);

    // レベルアップ判定
    while (status.exp >= this.expPerLevel) {
      status.exp -= this.expPerLevel;
      status.level++;
    }
    // EXPがマイナスにならないように
    if (status.exp < 0) status.exp = 0;

    Storage.save('quest-status', status);
  },

  /**
   * ステータス表示を更新
   */
  renderStatus() {
    const status = Storage.load('quest-status', { exp: 0, level: 1, totalExp: 0 });

    // レベル
    const levelEl = document.getElementById('quest-level');
    if (levelEl) levelEl.textContent = `Lv.${status.level}`;

    // EXPバー
    const fillEl = document.getElementById('quest-exp-fill');
    if (fillEl) fillEl.style.width = `${(status.exp / this.expPerLevel) * 100}%`;

    // EXPテキスト
    const textEl = document.getElementById('quest-exp-text');
    if (textEl) textEl.textContent = `${status.exp} / ${this.expPerLevel} EXP`;

    // アバター（レベルに応じて変化）
    const avatarEl = document.getElementById('quest-avatar');
    if (avatarEl) {
      const idx = Math.min(Math.floor((status.level - 1) / 5), this.avatars.length - 1);
      avatarEl.textContent = this.avatars[idx];
    }

    // 連続日数
    this.renderStreak();
  },

  /**
   * 連続日数を計算・表示
   */
  renderStreak() {
    const completed = Storage.load('quest-completed', {});
    const today = new Date();
    let streak = 0;

    // 今日から遡って連続日数を数える
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (completed[key] && completed[key].length > 0) {
        streak++;
      } else if (i > 0) {
        break; // 今日以外で途切れたら終了
      }
    }

    const streakEl = document.getElementById('quest-streak');
    if (streakEl) {
      if (streak > 0) {
        streakEl.textContent = `🔥 ${streak}日連続`;
      } else {
        streakEl.textContent = '今日から始めよう！';
      }
    }
  },

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
