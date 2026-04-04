/**
 * ADHDコンパス - 統計・パターン分析
 */
const Stats = {
  /**
   * 統計画面を更新
   */
  refresh() {
    this.renderWeeklySummary();
    this.renderFocusChart();
    this.renderMoodChart();
    this.renderInsight();
  },

  /**
   * 過去7日間の日付キー配列を取得
   */
  getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        label: ['日', '月', '火', '水', '木', '金', '土'][d.getDay()],
        date: d
      });
    }
    return days;
  },

  /**
   * 今週のサマリー
   */
  renderWeeklySummary() {
    const days = this.getLast7Days();
    const sessions = Storage.load('focus-sessions', []);
    const completed = Storage.load('quest-completed', {});

    // 集中時間合計
    let totalFocusMin = 0;
    let sessionCount = 0;
    days.forEach(day => {
      const daySessions = sessions.filter(s => s.startTime && s.startTime.startsWith(day.key));
      daySessions.forEach(s => {
        totalFocusMin += (s.actualMs || 0) / 60000;
        sessionCount++;
      });
    });

    // クエスト完了数
    let questCount = 0;
    days.forEach(day => {
      questCount += (completed[day.key] || []).length;
    });

    // 連続日数
    const status = Storage.load('quest-status', { exp: 0, level: 1 });

    document.getElementById('stats-focus-total').textContent = Math.round(totalFocusMin);
    document.getElementById('stats-sessions').textContent = sessionCount;
    document.getElementById('stats-quests').textContent = questCount;

    // 連続日数を計算
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if ((completed[key] || []).length > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    document.getElementById('stats-streak').textContent = streak;
  },

  /**
   * 集中時間のバーチャート（7日間）
   */
  renderFocusChart() {
    const days = this.getLast7Days();
    const sessions = Storage.load('focus-sessions', []);
    const chart = document.getElementById('stats-focus-chart');

    // 各日の集中時間を計算
    const dailyMin = days.map(day => {
      const daySessions = sessions.filter(s => s.startTime && s.startTime.startsWith(day.key));
      return Math.round(daySessions.reduce((sum, s) => sum + (s.actualMs || 0), 0) / 60000);
    });

    const maxMin = Math.max(...dailyMin, 1); // 0除算防止

    chart.innerHTML = days.map((day, i) => {
      const min = dailyMin[i];
      const heightPct = (min / maxMin) * 100;
      return `
        <div class="stats-bar-col">
          <span class="stats-bar-value">${min > 0 ? min + '分' : ''}</span>
          <div class="stats-bar" style="height:${Math.max(heightPct, 2)}%"></div>
          <span class="stats-bar-label">${day.label}</span>
        </div>
      `;
    }).join('');
  },

  /**
   * 感情推移チャート（7日間）
   */
  renderMoodChart() {
    const days = this.getLast7Days();
    const moods = Storage.load('moods', {});
    const chart = document.getElementById('stats-mood-chart');

    const moodEmoji = {
      great: '😊',
      okay: '😐',
      low: '😔',
      irritated: '😤'
    };

    chart.innerHTML = days.map(day => {
      const dayMoods = moods[day.key] || [];
      const lastMood = dayMoods.length > 0 ? dayMoods[dayMoods.length - 1].mood : null;
      const emoji = lastMood ? moodEmoji[lastMood] : '·';

      return `
        <div class="stats-mood-day">
          <span class="stats-mood-emoji">${emoji}</span>
          <span class="stats-mood-date">${day.label}</span>
        </div>
      `;
    }).join('');
  },

  /**
   * パターン分析
   */
  renderInsight() {
    const sessions = Storage.load('focus-sessions', []);
    const moods = Storage.load('moods', {});
    const el = document.getElementById('stats-insight');
    const insights = [];

    if (sessions.length >= 3) {
      // 平均集中時間
      const avgMin = Math.round(sessions.reduce((s, x) => s + (x.actualMs || 0), 0) / sessions.length / 60000);
      insights.push(`平均集中時間は${avgMin}分`);

      // 過集中の割合
      const overtimeCount = sessions.filter(s => s.wasOvertime).length;
      if (overtimeCount > 0) {
        const pct = Math.round((overtimeCount / sessions.length) * 100);
        insights.push(`${pct}%のセッションで過集中`);
      }

      // 脱線の多さ
      const avgLeave = sessions.reduce((s, x) => s + (x.leaveCount || 0), 0) / sessions.length;
      if (avgLeave > 2) {
        insights.push('脱線が多め。短いセッションを試してみよう');
      } else if (avgLeave < 1) {
        insights.push('脱線が少ない！集中力が高い');
      }
    }

    // 感情パターン
    const moodDays = Object.keys(moods);
    if (moodDays.length >= 3) {
      const allMoods = moodDays.flatMap(k => moods[k].map(m => m.mood));
      const moodCounts = {};
      allMoods.forEach(m => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
      const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
      const moodLabels = { great: '良い', okay: '普通', low: '落ち込み', irritated: 'イライラ' };
      if (topMood) {
        insights.push(`気分は「${moodLabels[topMood[0]] || topMood[0]}」が多い`);
      }
    }

    if (insights.length === 0) {
      el.textContent = 'データが貯まると傾向が見えてくるよ。使い続けてみよう！';
    } else {
      el.textContent = insights.join('。') + '。';
    }
  }
};
