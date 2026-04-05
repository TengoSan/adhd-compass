const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, Notification, ipcMain } = require('electron');
const path = require('path');
const Detector = require('./detector');

let mainWindow = null;
let tray = null;
let detector = null;

/**
 * メインウィンドウを作成
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 740,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: '#0d0d1a',
    titleBarStyle: 'hiddenInset', // macOS: タイトルバーをコンテンツに統合
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false, // 読み込み完了まで非表示
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon-192.svg')
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // 読み込み完了後に表示（ちらつき防止）
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // ウィンドウを閉じる時は非表示にする（Trayに常駐）
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

/**
 * Tray（メニューバー常駐）を作成
 */
function createTray() {
  // 16x16のシンプルなアイコンを作成
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAgElEQVR4Xq2TwQ3AIAwDnYgBGINR2P9fOkAlqkr5cEhE4sMJNheS0IcQJME3EpKkT4JmPQLeuvNm1slMvgEN8B5w951cA/ICxJUT4C1gcgVMnQB1qzN5CyhXLuATIL0CnAX8F3AvkHcFcv9jnQdUi1kH1Ivph1SHeodVC9qH/QDajTySQOEyxwAAAABJRU5ErkJggg=='
  );
  // テンプレート画像として扱う（macOS: ダーク/ライトモード対応）
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('ADHDコンパス');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🫧 フォーカスバブル開始',
      click: () => {
        showAndNavigate('focus');
      }
    },
    {
      label: '📝 クイックメモ',
      click: () => {
        showAndNavigate('memo');
      }
    },
    {
      label: '🏰 クエスト',
      click: () => {
        showAndNavigate('quest');
      }
    },
    { type: 'separator' },
    {
      label: 'ウィンドウを表示',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Trayクリックでウィンドウ表示/非表示
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/**
 * グローバルショートカットを登録
 */
function registerShortcuts() {
  // Cmd+Shift+F: フォーカスバブル開始
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    showAndNavigate('focus');
  });

  // Cmd+Shift+M: クイックメモ
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    showAndNavigate('memo');
  });
}

/**
 * ウィンドウを表示して指定画面に遷移
 */
function showAndNavigate(screen) {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.executeJavaScript(`App.navigateTo('${screen}')`);
}

// IPC: ネイティブ通知
ipcMain.on('show-notification', (event, { title, body }) => {
  new Notification({ title, body }).show();
});

// IPC: 検出エンジン制御
ipcMain.on('detector-start', () => {
  if (detector) detector.startMonitoring();
});

ipcMain.on('detector-stop', () => {
  if (detector) detector.stopMonitoring();
});

ipcMain.handle('detector-get-behavior', () => {
  if (detector) return detector.exportBehaviorData();
  return null;
});

ipcMain.on('detector-update-distracting-apps', (event, apps) => {
  if (detector) detector.updateDistractingApps(apps);
});

// アプリ初期化
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcuts();

  // 検出エンジン初期化
  detector = new Detector(mainWindow);
  detector.startLockMonitoring(); // ロック監視は常時

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// 全ウィンドウが閉じてもアプリを終了しない（Tray常駐）
app.on('window-all-closed', () => {
  // macOSでは何もしない（Trayに常駐）
});

// アプリ終了時にショートカットを解除
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (detector) detector.stopMonitoring();
});
