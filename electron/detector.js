/**
 * ADHDコンパス - デスクトップ検出エンジン
 * Electronならではの過集中/注意散漫検出
 */
const { powerMonitor } = require('electron');
const { exec } = require('child_process');

class Detector {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.isMonitoring = false;
    this.idleCheckInterval = null;
    this.activeWindowInterval = null;

    // 設定
    this.config = {
      idleAlertSec: 180,       // 3分操作なしでアラート
      idleLongSec: 600,        // 10分操作なしで長時間離席
      windowCheckMs: 5000,     // 5秒ごとにアクティブウィンドウチェック
      distractingApps: [       // 気が散るアプリ（デフォルト）
        'twitter', 'x.com', 'tweetdeck',
        'instagram', 'facebook', 'tiktok',
        'youtube', 'netflix', 'twitch',
        'discord', 'line', 'slack',
        'reddit',
      ],
    };

    // 行動データ蓄積
    this.behaviorLog = [];
    this.distractionCount = 0;
    this.lastActiveApp = '';
  }

  // ========================================
  // 1. システムアイドル検出
  // ========================================

  /**
   * アイドル監視を開始
   */
  startIdleMonitoring() {
    if (this.idleCheckInterval) return;

    let alerted = false;
    let longAlerted = false;

    this.idleCheckInterval = setInterval(() => {
      if (!this.isMonitoring) return;

      const idleSec = powerMonitor.getSystemIdleTime();

      // 3分操作なし → やさしい通知
      if (idleSec >= this.config.idleAlertSec && !alerted) {
        alerted = true;
        this._sendToRenderer('idle-alert', {
          type: 'short',
          idleSec: idleSec,
          message: '少し動いてない？大丈夫？'
        });
        this._logBehavior('idle-short', { idleSec });
      }

      // 10分操作なし → 長時間離席
      if (idleSec >= this.config.idleLongSec && !longAlerted) {
        longAlerted = true;
        this._sendToRenderer('idle-alert', {
          type: 'long',
          idleSec: idleSec,
          message: '長い間離れてたね'
        });
        this._logBehavior('idle-long', { idleSec });
      }

      // 操作が再開されたらリセット
      if (idleSec < 10) {
        if (alerted || longAlerted) {
          this._sendToRenderer('idle-resumed', { wasLong: longAlerted });
          this._logBehavior('idle-resumed', { wasLong: longAlerted });
        }
        alerted = false;
        longAlerted = false;
      }
    }, 10000); // 10秒ごとにチェック
  }

  stopIdleMonitoring() {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
  }

  // ========================================
  // 2. スクリーンロック/アンロック検出
  // ========================================

  /**
   * スクリーンロック監視を開始
   */
  startLockMonitoring() {
    this._lockTime = null;

    powerMonitor.on('lock-screen', () => {
      this._lockTime = Date.now();
      this._logBehavior('screen-locked', {});
    });

    powerMonitor.on('unlock-screen', () => {
      const awayMs = this._lockTime ? Date.now() - this._lockTime : 0;
      this._lockTime = null;

      if (this.isMonitoring) {
        this._sendToRenderer('screen-unlocked', {
          awayMs: awayMs,
          message: awayMs > 60000
            ? `${Math.round(awayMs / 60000)}分離れてたよ`
            : '少し離れてたね'
        });
      }
      this._logBehavior('screen-unlocked', { awayMs });
    });

    // スリープ/復帰
    powerMonitor.on('suspend', () => {
      this._suspendTime = Date.now();
      this._logBehavior('suspend', {});
    });

    powerMonitor.on('resume', () => {
      const awayMs = this._suspendTime ? Date.now() - this._suspendTime : 0;
      this._suspendTime = null;

      if (this.isMonitoring && awayMs > 30000) {
        this._sendToRenderer('screen-unlocked', {
          awayMs: awayMs,
          message: 'PCが復帰したよ。何してたっけ？'
        });
      }
      this._logBehavior('resume', { awayMs });
    });
  }

  // ========================================
  // 3. アクティブウィンドウ監視
  // ========================================

  /**
   * アクティブウィンドウ監視を開始
   * ネイティブモジュールなしでAppleScript/OS APIを使う
   */
  startActiveWindowMonitoring() {
    if (this.activeWindowInterval) return;

    this.activeWindowInterval = setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        const appName = await this._getActiveAppName();
        if (appName && appName !== this.lastActiveApp) {
          const previous = this.lastActiveApp;
          this.lastActiveApp = appName;

          // アプリ切り替えを記録
          this._logBehavior('app-switch', {
            from: previous,
            to: appName,
            timestamp: Date.now()
          });

          // 気が散るアプリかチェック
          this._checkDistractingApp(appName);
        }
      } catch (e) {
        // エラーは無視（権限不足など）
      }
    }, this.config.windowCheckMs);
  }

  stopActiveWindowMonitoring() {
    if (this.activeWindowInterval) {
      clearInterval(this.activeWindowInterval);
      this.activeWindowInterval = null;
    }
  }

  /**
   * macOSでアクティブなアプリ名を取得（AppleScript使用）
   */
  _getActiveAppName() {
    return new Promise((resolve) => {
      // macOS: AppleScriptでフロントアプリを取得
      exec(
        'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'',
        { timeout: 3000 },
        (err, stdout) => {
          if (err) {
            resolve(null);
          } else {
            resolve(stdout.trim());
          }
        }
      );
    });
  }

  // ========================================
  // 4. 気が散るアプリ検出
  // ========================================

  /**
   * 気が散るアプリかチェック
   */
  _checkDistractingApp(appName) {
    const lower = appName.toLowerCase();
    const isDistracting = this.config.distractingApps.some(d =>
      lower.includes(d)
    );

    if (isDistracting) {
      this.distractionCount++;
      this._sendToRenderer('distraction-detected', {
        app: appName,
        count: this.distractionCount,
        message: `${appName} を開いたよ。今のタスクに戻る？`
      });
      this._logBehavior('distraction', { app: appName, count: this.distractionCount });
    }
  }

  /**
   * 気が散るアプリリストを更新
   */
  updateDistractingApps(apps) {
    this.config.distractingApps = apps;
  }

  // ========================================
  // 5. 行動パターン学習
  // ========================================

  /**
   * 行動ログを記録
   */
  _logBehavior(type, data) {
    const entry = {
      type,
      timestamp: Date.now(),
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      ...data
    };
    this.behaviorLog.push(entry);

    // 最大1000件保持
    if (this.behaviorLog.length > 1000) {
      this.behaviorLog = this.behaviorLog.slice(-500);
    }
  }

  /**
   * 行動パターンを分析
   */
  analyzeBehavior() {
    if (this.behaviorLog.length < 10) {
      return { hasEnoughData: false };
    }

    const analysis = {
      hasEnoughData: true,
      insights: [],
      distractionsByHour: {},
      idlePatterns: {},
      appSwitchRate: 0,
    };

    // 時間帯別の脱線回数
    const distractions = this.behaviorLog.filter(e => e.type === 'distraction');
    distractions.forEach(d => {
      const h = d.hour;
      analysis.distractionsByHour[h] = (analysis.distractionsByHour[h] || 0) + 1;
    });

    // 最も脱線しやすい時間帯
    if (Object.keys(analysis.distractionsByHour).length > 0) {
      const worst = Object.entries(analysis.distractionsByHour)
        .sort((a, b) => b[1] - a[1])[0];
      analysis.insights.push(`${worst[0]}時台が一番脱線しやすい（${worst[1]}回）`);
    }

    // アイドルパターン
    const idles = this.behaviorLog.filter(e => e.type === 'idle-short' || e.type === 'idle-long');
    if (idles.length > 3) {
      const avgIdle = idles.reduce((s, e) => s + (e.idleSec || 0), 0) / idles.length;
      analysis.insights.push(`平均${Math.round(avgIdle / 60)}分の無操作時間`);
    }

    // アプリ切り替え頻度
    const switches = this.behaviorLog.filter(e => e.type === 'app-switch');
    if (switches.length > 5) {
      // 1時間あたりの切り替え回数
      const firstSwitch = switches[0].timestamp;
      const lastSwitch = switches[switches.length - 1].timestamp;
      const hours = Math.max(1, (lastSwitch - firstSwitch) / 3600000);
      analysis.appSwitchRate = Math.round(switches.length / hours);

      if (analysis.appSwitchRate > 20) {
        analysis.insights.push(`1時間に${analysis.appSwitchRate}回アプリ切り替え。短セッションがおすすめ`);
      }
    }

    // 最もよく使う気が散るアプリ
    if (distractions.length > 0) {
      const appCounts = {};
      distractions.forEach(d => {
        appCounts[d.app] = (appCounts[d.app] || 0) + 1;
      });
      const topApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0];
      analysis.insights.push(`${topApp[0]}を最もよく開いている（${topApp[1]}回）`);
    }

    return analysis;
  }

  /**
   * 行動ログをエクスポート（レンダラーに送信）
   */
  exportBehaviorData() {
    return {
      log: this.behaviorLog,
      analysis: this.analyzeBehavior(),
      distractionCount: this.distractionCount,
    };
  }

  // ========================================
  // 監視制御
  // ========================================

  /**
   * フォーカスセッション開始時に呼ぶ
   */
  startMonitoring() {
    this.isMonitoring = true;
    this.distractionCount = 0;
    this.lastActiveApp = '';
    this.startIdleMonitoring();
    this.startActiveWindowMonitoring();
  }

  /**
   * フォーカスセッション終了時に呼ぶ
   */
  stopMonitoring() {
    this.isMonitoring = false;
    this.stopIdleMonitoring();
    this.stopActiveWindowMonitoring();
  }

  /**
   * レンダラーにメッセージを送信
   */
  _sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

module.exports = Detector;
