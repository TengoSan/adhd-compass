/**
 * ADHDコンパス - ストレージ管理
 * LocalStorageを使ったデータの保存・読み込み
 */
const Storage = {
  PREFIX: 'adhd-compass-',

  /**
   * データを保存
   */
  save(key, data) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.warn('保存に失敗:', e);
    }
  },

  /**
   * データを読み込み
   */
  load(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(this.PREFIX + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn('読み込みに失敗:', e);
      return defaultValue;
    }
  },

  /**
   * データを削除
   */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  // --- 感情記録 ---

  /**
   * 今日の気分を保存
   */
  saveMood(mood) {
    const today = this.todayKey();
    const moods = this.load('moods', {});
    if (!moods[today]) {
      moods[today] = [];
    }
    moods[today].push({
      mood: mood,
      time: new Date().toISOString()
    });
    this.save('moods', moods);
  },

  /**
   * 今日の最新の気分を取得
   */
  getTodayMood() {
    const today = this.todayKey();
    const moods = this.load('moods', {});
    const todayMoods = moods[today] || [];
    return todayMoods.length > 0 ? todayMoods[todayMoods.length - 1] : null;
  },

  // --- メモ ---

  /**
   * メモを追加
   */
  addMemo(text) {
    const memos = this.load('memos', []);
    memos.unshift({
      id: Date.now(),
      text: text,
      time: new Date().toISOString()
    });
    this.save('memos', memos);
    return memos;
  },

  /**
   * メモを削除
   */
  deleteMemo(id) {
    let memos = this.load('memos', []);
    memos = memos.filter(m => m.id !== id);
    this.save('memos', memos);
    return memos;
  },

  /**
   * 全メモを取得
   */
  getMemos() {
    return this.load('memos', []);
  },

  // --- ユーティリティ ---

  /**
   * 今日の日付キー (YYYY-MM-DD)
   */
  todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};
