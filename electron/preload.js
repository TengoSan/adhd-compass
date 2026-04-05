/**
 * ADHDコンパス - Preload Script
 * メインプロセスとレンダラープロセスのセキュリティブリッジ
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Electronで動作しているかどうか
  isElectron: true,

  // ネイティブ通知
  sendNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },

  // 検出エンジン: フォーカスセッション開始時に監視開始
  startDetector: () => {
    ipcRenderer.send('detector-start');
  },

  // 検出エンジン: フォーカスセッション終了時に監視停止
  stopDetector: () => {
    ipcRenderer.send('detector-stop');
  },

  // 行動データを取得
  getBehaviorData: () => {
    return ipcRenderer.invoke('detector-get-behavior');
  },

  // 気が散るアプリリストを更新
  updateDistractingApps: (apps) => {
    ipcRenderer.send('detector-update-distracting-apps', apps);
  },

  // メインプロセスからのイベントを受信
  onIdleAlert: (callback) => {
    ipcRenderer.on('idle-alert', (event, data) => callback(data));
  },
  onIdleResumed: (callback) => {
    ipcRenderer.on('idle-resumed', (event, data) => callback(data));
  },
  onScreenUnlocked: (callback) => {
    ipcRenderer.on('screen-unlocked', (event, data) => callback(data));
  },
  onDistractionDetected: (callback) => {
    ipcRenderer.on('distraction-detected', (event, data) => callback(data));
  }
});
