/**
 * ADHDコンパス - Preload Script
 * メインプロセスとレンダラープロセスのセキュリティブリッジ
 */
const { contextBridge, ipcRenderer } = require('electron');

// レンダラーに安全なAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // Electronで動作しているかどうか
  isElectron: true,

  // ネイティブ通知を送る
  sendNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  }
});
