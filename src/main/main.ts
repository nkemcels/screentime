/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import AutoLaunch from 'auto-launch';
import { resolveHtmlPath } from './util';
import AppProcess from './AppProcess';
import * as ipcMainItems from './ipcMain';

const appProcess = new AppProcess();
ipcMainItems.init(appProcess);

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();

    const autoLaunch = new AutoLaunch({
      name: 'Screentime by Celsbits',
      path: process.execPath,
    });

    if (appProcess.getAppState().autoLaunch && !autoLaunch.isEnabled()) autoLaunch.enable();
    else if (!appProcess.getAppState().autoLaunch && autoLaunch.isEnabled()) autoLaunch.disable();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('close-app', (event) => {
  BrowserWindow.getFocusedWindow()?.hide();
  appProcess.setAppState({ hidden: true });
});

ipcMain.on('adjust-window-size', (evt, { width, height }: { width: number; height: number }) => {
  BrowserWindow.getFocusedWindow()?.setMinimumSize(width, height);
  BrowserWindow.getFocusedWindow()?.setSize(width, height);
});

ipcMain.on('ready', async (event) => {
  appProcess.init();
  event.reply('get-current-snapshot', appProcess.getSnapshot());
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

console.log('EXEC PATH ', process.execPath);

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};
const RESOURCES_PATH = app.isPackaged ? path.join(process.resourcesPath, 'assets') : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 235,
    height: 220,
    x: screen.getPrimaryDisplay().bounds.width - 240 - 10,
    y: 10,
    frame: false,
    transparent: true,
    resizable: false,
    autoHideMenuBar: true,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    const appState = appProcess.getAppState();
    if (appState.hidden) mainWindow.hide();
    else mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.removeMenu();

  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    setTimeout(() => {
      const appTray = new Tray(getAssetPath('icon.png'));
      appTray.setIgnoreDoubleClickEvents(true);
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show screentime',
          click: () => {
            console.log('OPENING SCREENTIME APP!!!');
            if (mainWindow?.isDestroyed()) createWindow();
            else mainWindow?.show();
            appProcess.setAppState({ hidden: false });
          },
        },
        {
          label: 'Launch on startup',
          type: 'radio',
          checked: appProcess.getAppState().autoLaunch,
          click: (item) => {
            appProcess.setAppState({ autoLaunch: !appProcess.getAppState().autoLaunch });
            console.log('Updating state... ', appProcess.getAppState().autoLaunch);
            contextMenu.items[1].checked = appProcess.getAppState().autoLaunch;
            appTray.setContextMenu(contextMenu);
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit',
          click: () => {
            console.log('WE ARE QUITTING');
            mainWindow?.close();
            appTray.destroy();
            app.quit();
          },
        },
      ]);
      appTray.on('click', () => {});
      appTray.setToolTip('Screentime by Celsbits');
      appTray.setContextMenu(contextMenu);
    }, 2000);
  })
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })

  .catch(console.log);
