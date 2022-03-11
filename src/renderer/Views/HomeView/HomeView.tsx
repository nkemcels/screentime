/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from 'react';
import { ipcRenderer, BrowserWindow } from 'electron';
import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '@blueprintjs/core';

import moment from 'moment';
import { TProcessData } from 'main/AppProcess';
import prettyMs from 'pretty-ms';
import { useWindowSize } from 'renderer/hooks/windowSize';

import appRoutes from 'renderer/constants/routes';
import Styles from './HomeView.module.scss';

const getTimeDisplay = (time: number) => {
  return prettyMs(time, { verbose: true, unitCount: 2 }).replace('minute', 'min').replace('second', 'sec').replace('hour', 'hr');
};

const HomeView = () => {
  const { windowSize, setWindowHeight, setWindowSize } = useWindowSize();
  const [viewCollapsed, setViewCollapsed] = useState(false);
  const [currentScreenInfo, setCurrentScreenInfo] = useState<{
    screenTime: TProcessData['screenTime'];
    longestSession: TProcessData['longestSession'];
  }>({ screenTime: 0, longestSession: null });
  const navigate = useNavigate();
  const handleClose = () => {
    ipcRenderer.send('close-app');
  };

  const handleNavigateToDetals = () => {
    navigate(appRoutes.DETAILS);
  };

  const handleToggleCollapseView = () => {
    setWindowHeight(viewCollapsed ? 220 : 120);
    setViewCollapsed((r) => !r);
  };

  useEffect(() => {
    ipcRenderer.send('ready');
    ipcRenderer.on('get-current-basic-snapshot', (evt, data) => {
      // console.log('DATA ', data);
      setCurrentScreenInfo({ screenTime: data.screenTime, longestSession: data.longestSession });
    });
    setWindowSize({ width: 240, height: 220 });
    setInterval(() => {
      ipcRenderer.send('get-current-basic-snapshot');
    }, 5000);
  }, [setWindowSize]);

  return (
    <div className={Styles.Container} style={{ width: windowSize.width - 20, height: windowSize.height - 20 }}>
      <div className={Styles.Inner}>
        <h3 className={Styles.ScreenTimeHeader}>{getTimeDisplay(currentScreenInfo.screenTime ?? 0)}</h3>
        <span className={Styles.Label}>
          <Icon icon="time" size={12} className={Styles.ClockIcon} />
          Today&apos;s screen time
        </span>
        <div className={Styles.Divider}>
          <div className={Styles.Line} />
          <Icon icon={viewCollapsed ? 'caret-left' : 'caret-down'} size={19} className={Styles.CollapseIcon} onClick={handleToggleCollapseView} />
        </div>
        {!viewCollapsed && (
          <>
            <div className={Styles.ContentContainer}>
              <div className={Styles.SessionContentWrapper}>
                <div className={Styles.Header}>Longest session</div>
                <div className={Styles.TimeHeader}>{getTimeDisplay(currentScreenInfo.longestSession?.duration ?? 0)}</div>
              </div>
              <div className={Styles.SessionNameWrapper}>
                <span className={Styles.Name}>{currentScreenInfo.longestSession?.owner.name}</span>&nbsp;at&nbsp;
                <span className={Styles.Time}>
                  {moment(currentScreenInfo.longestSession?.timestamp)
                    .subtract(currentScreenInfo.longestSession?.duration ?? 0)
                    .format('hh:mm A')}
                </span>
              </div>
            </div>
            <div className={Styles.ViewMoreContainer}>
              <Button rightIcon="arrow-right" small text="View Details" intent="primary" onClick={handleNavigateToDetals} />
            </div>
          </>
        )}
        <div className={Styles.DragView}>
          <div style={{ width: '100%', height: '100%' }}>
            <Icon icon="drag-handle-vertical" />
          </div>
        </div>
        <div className={Styles.CloseButton} onClick={handleClose}>
          <Icon icon="cross" />
        </div>
      </div>
    </div>
  );
};

export default HomeView;
