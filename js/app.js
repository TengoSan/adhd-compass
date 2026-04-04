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
    this.restoreMoodState();
    Focus.init();
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
  }
};

// アプリ起動
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
