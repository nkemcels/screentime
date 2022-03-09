import { ipcMain } from 'electron';
import AppProcess from './AppProcess';

// eslint-disable-next-line
export const init = (appProcess: AppProcess) => {
  ipcMain.on('get-current-snapshot', (event) => {
    const data = appProcess.getSnapshot();
    event.reply('get-current-snapshot', data);
  });

  ipcMain.on('get-current-basic-snapshot', (event) => {
    const { screenTime, longestSession } = appProcess.getSnapshot();
    event.reply('get-current-basic-snapshot', { screenTime, longestSession });
  });

  ipcMain.on('get-today-hours-snapshot', (event) => {
    event.reply('get-today-hours-snapshot', appProcess.getTodayHoursSnapshot());
  });

  ipcMain.on('get-today-mostused-snapshot', (event) => {
    event.reply('get-today-mostused-snapshot', appProcess.getTodayMostUsedSnapshot());
  });

  ipcMain.on('get-today-mostopened-snapshot', (event) => {
    event.reply('get-today-mostopened-snapshot', appProcess.getTodayMostOpenedSnapshot());
  });

  ipcMain.on('get-days-hours-snapshot', (event, { days }) => {
    event.reply('get-days-hours-snapshot', appProcess.getDaysHoursSnapshot(days));
  });

  ipcMain.on('get-days-mostused-snapshot', (event, { days }) => {
    event.reply('get-days-mostused-snapshot', appProcess.getDaysMostUsedSnapshot(days));
  });

  ipcMain.on('get-days-mostopened-snapshot', (event, { days }) => {
    event.reply('get-days-mostopened-snapshot', appProcess.getDaysMostOpenedSnapshot(days));
  });
};
