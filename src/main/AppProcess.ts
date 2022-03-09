/* eslint-disable no-continue */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-plusplus */
/* eslint-disable class-methods-use-this */
import activeWin from 'active-win';
import fs from 'fs';
import moment from 'moment';
import os from 'os';
import path from 'path';
// import { fileIconToBuffer } from 'file-icon';

type TSessionData = {
  title: string;
  id: number;
  owner: { name: string; processId: number; path: string };
  url?: string;
  memoryUsage: number;
  timestamp: string;
};

type TAppState = {
  hidden: boolean;
  autoLaunch: boolean;
};

const INITIAL_STATE: TAppState = {
  hidden: false,
  autoLaunch: true,
};

export type TActiveSessionData = TSessionData & { duration: number };
export type TProcessData = {
  screenTime: number;
  longestSession: TActiveSessionData | null;
  sessions: TSessionData[];
};

const PROCESS_INTERVAL = 5000;

export default class AppProcess {
  private dataPathDir = path.join(os.homedir(), '.activity-mon');

  private activeIntervalId: any = null;

  private activeSession: TActiveSessionData | null = null;

  private currentData: TProcessData = {
    screenTime: 0,
    longestSession: null,
    sessions: [],
  };

  private currentPath: string = '';

  private getTodaysFilepath() {
    const date = Date.now();
    const dateStr = moment(date).format('DD-MM-YYYY');
    const timestamp = moment(date).toISOString();
    const filename = `${dateStr}.json`;
    return { filepath: path.join(this.dataPathDir, filename), date: dateStr, timestamp };
  }

  init() {
    let alreadyRunning = false;
    if (!fs.existsSync(this.dataPathDir)) {
      fs.mkdirSync(this.dataPathDir);
    }

    this.currentPath = this.getTodaysFilepath().filepath;

    if (fs.existsSync(this.currentPath)) {
      try {
        this.currentData = JSON.parse(fs.readFileSync(this.currentPath, { encoding: 'utf8' }).toString());
        if (!Array.isArray(this.currentData?.sessions)) {
          this.currentData = { screenTime: 0, longestSession: null, sessions: [] };
        }
      } catch (err) {
        console.error(err);
      }
    }

    clearInterval(this.activeIntervalId);

    this.activeIntervalId = setInterval(async () => {
      if (alreadyRunning) return;
      alreadyRunning = true;
      await this.runTask();
      alreadyRunning = false;
    }, PROCESS_INTERVAL);
  }

  async runTask() {
    const { filepath, date, timestamp } = this.getTodaysFilepath();
    if (filepath !== this.currentPath) return this.init();

    const info = await activeWin();
    if (info) {
      const { id, title, owner, memoryUsage } = info;
      const sessionData = { id, title, owner, memoryUsage, timestamp };
      this.currentData.sessions.push(sessionData);
      this.currentData.screenTime += PROCESS_INTERVAL;
      const isDifferentActive = this.activeSession?.owner.name !== sessionData.owner.name;
      this.activeSession = {
        ...sessionData,
        duration: isDifferentActive ? 1 : (this.activeSession?.duration ?? -PROCESS_INTERVAL + 1) + PROCESS_INTERVAL,
      };

      if (this.activeSession.duration > (this.currentData.longestSession?.duration ?? 0)) {
        this.currentData.longestSession = this.activeSession;
      }

      await new Promise((resolve, reject) => {
        fs.writeFile(filepath, JSON.stringify(this.currentData), { encoding: 'utf8' }, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    }

    return info;
  }

  getSnapshot() {
    return this.currentData;
  }

  getHoursSnapshot(dateInput: moment.MomentInput) {
    const dateFilename = moment(dateInput).format('DD-MM-YYYY');
    const filePath = path.join(this.dataPathDir, dateFilename.endsWith('.json') ? dateFilename : `${dateFilename}.json`);
    if (!fs.existsSync(filePath)) return [];

    try {
      const data = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }).toString()) as TProcessData;
      const timeLogsByHour: { [k: string]: number } = {};
      const timeLogs: { hour: string; value: number }[] = [];

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < data.sessions.length; i++) {
        const item = data.sessions[i];
        const hour = moment(item.timestamp).format('H');
        timeLogsByHour[hour] = timeLogsByHour[hour] || 0;
        timeLogsByHour[hour] += PROCESS_INTERVAL;
      }

      Array(12)
        .fill(0)
        .forEach((_, hour) => {
          const firstVal = timeLogsByHour[hour] || 0;
          const secondVal = timeLogsByHour[hour + 1] || 0;
          const toHour = hour * 2 + 2;
          const fHour = toHour % 12 === 0 ? 12 : toHour % 12;
          const amPm = toHour / 12 >= 1 && toHour < 24 ? 'pm' : 'am';
          timeLogs.push({ hour: `${fHour < 10 ? `0${fHour}` : fHour} ${amPm}`, value: +((firstVal + secondVal) / (1000 * 60 * 60)).toFixed(2) });
        });

      return timeLogs;
    } catch (err) {
      console.error(err);
    }
    return null;
  }

  getMostUsedSnapshot(dateInput: moment.MomentInput, moreDetailApps: string[] = []) {
    const dateFilename = moment(dateInput).format('DD-MM-YYYY');
    const filePath = path.join(this.dataPathDir, dateFilename.endsWith('.json') ? dateFilename : `${dateFilename}.json`);
    if (!fs.existsSync(filePath)) return [];

    try {
      const data = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }).toString()) as TProcessData;
      const timeLogsByApp: { [k: string]: { value: number; subApps: { [k: string]: number } } } = {};

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < data.sessions.length; i++) {
        const item = data.sessions[i];
        const app = item.owner.name;
        timeLogsByApp[app] = timeLogsByApp[app] || { value: 0, subApps: {} };
        timeLogsByApp[app].value += PROCESS_INTERVAL;
        timeLogsByApp[app].subApps[item.title] = timeLogsByApp[app].subApps[item.title] || 0;
        timeLogsByApp[app].subApps[item.title] += PROCESS_INTERVAL;
      }

      return Object.keys(timeLogsByApp)
        .map((item) => ({
          app: item,
          value: timeLogsByApp[item].value,
          subApps: Object.keys(timeLogsByApp[item].subApps)
            .map((r) => ({ subApp: r, value: timeLogsByApp[item].subApps[r] }))
            .sort((a, b) => (a.value < b.value ? 1 : a.value > b.value ? -1 : 0)),
        }))
        .sort((a, b) => (a.value < b.value ? 1 : a.value > b.value ? -1 : 0));
    } catch (err) {
      console.error(err);
    }
    return null;
  }

  getMostOpenedSnapshot(dateInput: moment.MomentInput) {
    const dateFilename = moment(dateInput).format('DD-MM-YYYY');
    const filePath = path.join(this.dataPathDir, dateFilename.endsWith('.json') ? dateFilename : `${dateFilename}.json`);
    if (!fs.existsSync(filePath)) return [];

    try {
      const data = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }).toString()) as TProcessData;
      const countLogsByApp: { [k: string]: { value: number; subApps: { [k: string]: number } } } = {};

      let currentApp = '';
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < data.sessions.length; i++) {
        const item = data.sessions[i];
        const app = item.owner.name;
        if (app !== currentApp) {
          countLogsByApp[app] = countLogsByApp[app] || { value: 0, subApps: {} };
          countLogsByApp[app].value += 1;
          countLogsByApp[app].subApps[item.title] = countLogsByApp[app].subApps[item.title] || 0;
          countLogsByApp[app].subApps[item.title] += 1;
          currentApp = app;
        }
      }

      return Object.keys(countLogsByApp)
        .map((item) => ({
          app: item,
          value: countLogsByApp[item].value,
          subApps: Object.keys(countLogsByApp[item].subApps)
            .map((r) => ({ subApp: r, value: countLogsByApp[item].subApps[r] }))
            .sort((a, b) => (a.value < b.value ? 1 : a.value > b.value ? -1 : 0)),
        }))
        .sort((a, b) => (a.value < b.value ? 1 : a.value > b.value ? -1 : 0));
    } catch (err) {
      console.error(err);
    }
    return null;
  }

  getTodayHoursSnapshot() {
    return this.getHoursSnapshot(new Date());
  }

  getTodayMostUsedSnapshot() {
    return this.getMostUsedSnapshot(new Date());
  }

  getTodayMostOpenedSnapshot() {
    return this.getMostOpenedSnapshot(new Date());
  }

  getDaysHoursSnapshot(daysCount: number) {
    const timeLogsByDate: { [k: string]: number } = {};
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      const res = this.getHoursSnapshot(date);
      if (!res) continue;
      const hours = res.reduce((r, c) => c.value + r, 0);
      timeLogsByDate[date.format('MMM DD')] = hours;
    }

    return Object.keys(timeLogsByDate).map((item) => ({ hour: item, value: timeLogsByDate[item] }));
  }

  getDaysMostUsedSnapshot(daysCount: number) {
    const timeLogsByApp: { [k: string]: { value: number; subApps: { [k: string]: number } } } = {};
    for (let i = 0; i < daysCount; i++) {
      const date = moment().subtract(i, 'days');
      const res = this.getMostUsedSnapshot(date);
      if (!res) continue;

      for (let j = 0; j < res.length; j++) {
        const appName = res[j].app;
        timeLogsByApp[appName] = timeLogsByApp[appName] || { value: 0, subApps: {} };
        timeLogsByApp[appName].value += res[j].value;

        for (let k = 0; k < res[j].subApps.length; k++) {
          const subAppName = res[j].subApps[k].subApp;
          timeLogsByApp[appName].subApps[subAppName] = timeLogsByApp[appName].subApps[subAppName] || 0;
          timeLogsByApp[appName].subApps[subAppName] += res[j].subApps[k].value;
        }
      }
    }

    return Object.keys(timeLogsByApp).map((item) => ({
      app: item,
      value: timeLogsByApp[item].value,
      subApps: Object.keys(timeLogsByApp[item].subApps).map((r) => ({ subApp: r, value: timeLogsByApp[item].subApps[r] })),
    }));
  }

  getDaysMostOpenedSnapshot(daysCount: number) {
    const countLogsByApp: { [k: string]: { value: number; subApps: { [k: string]: number } } } = {};
    for (let i = 0; i < daysCount; i++) {
      const date = moment().subtract(i, 'days');
      const res = this.getMostOpenedSnapshot(date);
      if (!res) continue;

      for (let j = 0; j < res.length; j++) {
        const appName = res[j].app;
        countLogsByApp[appName] = countLogsByApp[appName] || { value: 0, subApps: {} };
        countLogsByApp[appName].value += res[j].value;

        for (let k = 0; k < res[j].subApps.length; k++) {
          const subAppName = res[j].subApps[k].subApp;
          countLogsByApp[appName].subApps[subAppName] = countLogsByApp[appName].subApps[subAppName] || 0;
          countLogsByApp[appName].subApps[subAppName] += res[j].subApps[k].value;
        }
      }
    }

    return Object.keys(countLogsByApp).map((item) => ({
      app: item,
      value: countLogsByApp[item].value,
      subApps: Object.keys(countLogsByApp[item].subApps).map((r) => ({ subApp: r, value: countLogsByApp[item].subApps[r] })),
    }));
  }

  setAppState = (state: Partial<TAppState>) => {
    if (!fs.existsSync(this.dataPathDir)) fs.mkdirSync(this.dataPathDir, { recursive: true });
    let d: any = {};
    try {
      d = JSON.parse(fs.readFileSync(path.join(this.dataPathDir, '.state')).toString());
    } catch (e) {}

    fs.writeFileSync(path.join(this.dataPathDir, '.state'), JSON.stringify({ ...d, ...state }));
    return { ...d, ...state };
  };

  getAppState = (): TAppState => {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.dataPathDir, '.state')).toString());
    } catch (e) {}

    return INITIAL_STATE;
  };
}
