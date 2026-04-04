/**
 * ADHDコンパス - AIエンジン
 * テンプレートベースのタスク分解＋コーチメッセージ
 * 将来的にClaude APIに切り替え可能な設計
 */
const AIEngine = {
  // モード: 'template' or 'api'
  mode: 'template',

  // ========================================
  // タスク分解
  // ========================================

  /**
   * タスクを小さなステップに分解
   * @param {string} task - タスクの説明
   * @returns {Array} ステップの配列 [{text, minutes}]
   */
  decomposeTask(task) {
    if (this.mode === 'api') {
      // 将来: Claude API呼び出し
      return this._decomposeTemplate(task);
    }
    return this._decomposeTemplate(task);
  },

  /**
   * テンプレートベースの分解
   */
  _decomposeTemplate(task) {
    const lower = task.toLowerCase();

    // キーワードマッチでパターンを選択
    for (const pattern of this._patterns) {
      if (pattern.keywords.some(kw => lower.includes(kw))) {
        return pattern.steps.map(s => ({
          text: s.text.replace('{task}', task),
          minutes: s.minutes
        }));
      }
    }

    // どのパターンにもマッチしない場合は汎用パターン
    return this._genericSteps(task);
  },

  /**
   * 分解パターン定義
   */
  _patterns: [
    {
      keywords: ['書く', '作文', 'レポート', '文章', 'メール', '企画書', '資料'],
      steps: [
        { text: 'ゴールを1行で書き出す', minutes: 3 },
        { text: '構成・目次をざっくり考える', minutes: 5 },
        { text: '最初のセクションだけ書く', minutes: 15 },
        { text: '残りを書き足す', minutes: 15 },
        { text: '全体を見直して仕上げる', minutes: 10 }
      ]
    },
    {
      keywords: ['掃除', '片付', '整理', '清掃', '洗'],
      steps: [
        { text: '片付ける場所を1か所だけ決める', minutes: 2 },
        { text: 'まず5つだけ元の場所に戻す', minutes: 5 },
        { text: 'ゴミを集めて捨てる', minutes: 5 },
        { text: '表面を拭く', minutes: 5 },
        { text: '完了！残りは明日でOK', minutes: 1 }
      ]
    },
    {
      keywords: ['勉強', '学ぶ', '読む', '本', '復習', '予習', '暗記'],
      steps: [
        { text: '教材・ノートを机に出す', minutes: 2 },
        { text: '今日やる範囲を決める（少なめに）', minutes: 3 },
        { text: '15分だけ集中して取り組む', minutes: 15 },
        { text: '学んだことを1行でメモする', minutes: 3 },
        { text: 'ご褒美タイム！', minutes: 5 }
      ]
    },
    {
      keywords: ['買い物', '買う', 'スーパー', 'コンビニ', '購入'],
      steps: [
        { text: '買うものリストを書き出す', minutes: 3 },
        { text: '必要なもの3つに絞る', minutes: 2 },
        { text: '出発準備（カバン・財布）', minutes: 3 },
        { text: '買い物に行く', minutes: 20 },
        { text: '帰宅・片付け', minutes: 5 }
      ]
    },
    {
      keywords: ['電話', '連絡', '予約', '問い合わせ'],
      steps: [
        { text: '伝えたいことを3つメモする', minutes: 3 },
        { text: '電話番号を確認する', minutes: 1 },
        { text: '深呼吸してから電話する', minutes: 1 },
        { text: '電話する', minutes: 10 },
        { text: '結果をメモする', minutes: 2 }
      ]
    },
    {
      keywords: ['準備', '支度', '用意', '出かけ', '出発'],
      steps: [
        { text: '持ち物を確認する', minutes: 3 },
        { text: '服を選ぶ', minutes: 5 },
        { text: '身支度する', minutes: 10 },
        { text: '忘れ物チェック（鍵・財布・スマホ）', minutes: 2 }
      ]
    },
    {
      keywords: ['料理', '作る', '食事', 'ごはん', '弁当'],
      steps: [
        { text: '何を作るか決める', minutes: 3 },
        { text: '材料を出す', minutes: 3 },
        { text: '下ごしらえする', minutes: 10 },
        { text: '調理する', minutes: 15 },
        { text: '片付け（食べながらでOK）', minutes: 5 }
      ]
    },
    {
      keywords: ['運動', 'トレーニング', '筋トレ', 'ジム', '散歩', 'ウォーキング'],
      steps: [
        { text: '運動着に着替える', minutes: 3 },
        { text: 'ストレッチする', minutes: 5 },
        { text: '10分だけやってみる', minutes: 10 },
        { text: '気分が乗れば続ける（無理しない）', minutes: 10 },
        { text: 'クールダウン＋水分補給', minutes: 5 }
      ]
    }
  ],

  /**
   * 汎用分解パターン
   */
  _genericSteps(task) {
    return [
      { text: `「${task}」に必要なものを考える`, minutes: 3 },
      { text: '最初の一歩だけやる', minutes: 10 },
      { text: '5分休憩', minutes: 5 },
      { text: '次のステップに進む', minutes: 10 },
      { text: '今日はここまで！振り返り', minutes: 3 }
    ];
  },

  // ========================================
  // ADHDコーチメッセージ
  // ========================================

  /**
   * 気分と時間帯に応じたコーチメッセージを取得
   * @param {string} mood - great, okay, low, irritated
   * @returns {string} コーチメッセージ
   */
  getCoachMessage(mood) {
    const hour = new Date().getHours();
    let period;
    if (hour < 12) period = 'morning';
    else if (hour < 18) period = 'afternoon';
    else period = 'evening';

    const messages = this._coachMessages[period]?.[mood] || this._coachMessages.morning.okay;
    return messages[Math.floor(Math.random() * messages.length)];
  },

  /**
   * コーチメッセージテンプレート
   * 時間帯 × 気分 のマトリクス（各2-3パターン）
   */
  _coachMessages: {
    morning: {
      great: [
        'いい朝！その調子で、今日の1つ目のタスクに取りかかろう',
        '元気いっぱい！エネルギーがあるうちに大事なことを片付けよう',
        '最高の気分だね！今日は少し挑戦的なタスクにトライしてみよう'
      ],
      okay: [
        'おはよう。まあまあの日は、まあまあでOK。1つだけ進めてみよう',
        '普通の朝も大事な朝。小さなことから始めよう',
        'ぼちぼちいこう。今日のタスクを1つ選んでみて'
      ],
      low: [
        '今日はゆっくりでいいよ。1つだけ選んでやってみよう',
        '調子が出ない日もある。まず水を飲んで、深呼吸しよう',
        '無理しなくていい。今日の目標は「1つだけ」で十分'
      ],
      irritated: [
        'イライラする朝だね。まず深呼吸を3回してみよう',
        '気持ちが落ち着かない時は、体を動かすと良いよ。ストレッチしてみない？',
        'モヤモヤは書き出すとスッキリするよ。メモに気持ちを書いてみよう'
      ]
    },
    afternoon: {
      great: [
        '午後も好調！この勢いで進めよう。でも休憩も忘れずに',
        'いい感じ！あと1つか2つ片付けたら、自分にご褒美をあげよう',
        '集中力が高い時間帯。フォーカスバブルで一気に進めてみよう'
      ],
      okay: [
        '午後は眠くなりがち。15分だけ集中してみよう',
        '昼食後のだるさは普通。短いセッションで乗り切ろう',
        'ここからもうひと頑張り。まず簡単なタスクから片付けよう'
      ],
      low: [
        '午後の疲れが出てきたかな。5分だけ目を閉じて休もう',
        '無理しなくていいよ。今日できたことを振り返ってみよう',
        '外の空気を吸ってみない？気分転換になるよ'
      ],
      irritated: [
        '深呼吸してみよう。今の気持ちは一時的なもの',
        'イライラしてる時は、体を動かすのが効果的。少し歩いてみよう',
        '気持ちを書き出してみよう。メモに「今イライラしてること」を書くだけでもスッキリする'
      ]
    },
    evening: {
      great: [
        'いい1日だったね！明日の準備を1つだけしておこう',
        '今日はよく頑張った！寝る前にリラックスタイムを楽しもう',
        '充実した日だね。今日できたことを振り返ってみよう'
      ],
      okay: [
        'お疲れさま。今日やったことを1つ思い出してみよう',
        '普通の1日も立派な1日。明日に備えてゆっくり休もう',
        '今夜はリラックスして、明日に備えよう'
      ],
      low: [
        '今日はしんどかったね。でもここまで頑張った自分を褒めてあげよう',
        '落ち込む日もある。温かい飲み物を飲んで、早めに休もう',
        '明日は違う日になるよ。今夜はゆっくり休むことが一番大事'
      ],
      irritated: [
        'イライラした1日だったね。寝る前に深呼吸で気持ちをリセットしよう',
        '今日の気持ちを手放そう。明日は新しい日',
        'モヤモヤはメモに書き出して、頭から出してしまおう。スッキリ寝られるよ'
      ]
    }
  }
};
