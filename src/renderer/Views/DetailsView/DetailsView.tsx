/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/require-default-props */
/* eslint-disable react-hooks/exhaustive-deps */
import { Button, Icon, Tab, Tabs } from '@blueprintjs/core';
import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import prettyMs from 'pretty-ms';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import appRoutes from 'renderer/constants/routes';
import { useWindowSize } from 'renderer/hooks/windowSize';
import Styles from './DetailsView.module.scss';
import hoursRangeMap from './hourLabelMap';

const HoursChartDisplay: React.FC<{ width: number; days: number }> = ({ width, days }) => {
  const [chartData, setChartData] = useState<{ hours: string; value: number }[]>([]);
  const timeout = useRef<any>();

  const requestForData = () => {
    if (days !== 1) ipcRenderer.send('get-days-hours-snapshot', { days });
    else ipcRenderer.send('get-today-hours-snapshot');
  };

  const setChartDataCb = useCallback((_, resp) => {
    if (Array.isArray(resp)) setChartData(resp);
  }, []);

  useEffect(() => {
    clearInterval(timeout.current);
    setChartData([]);
    setTimeout(() => {
      requestForData();
    }, 100);

    timeout.current = setInterval(() => {
      requestForData();
    }, 10000);
  }, [days, requestForData]);

  useEffect(() => {
    ipcRenderer.on('get-today-hours-snapshot', setChartDataCb);
    ipcRenderer.on('get-days-hours-snapshot', setChartDataCb);

    return () => {
      clearInterval(timeout.current);
      ipcRenderer.removeListener('get-today-hours-snapshot', setChartDataCb);
      ipcRenderer.removeListener('get-days-hours-snapshot', setChartDataCb);
    };
  }, []);
  return (
    <div>
      <BarChart width={width} height={200} data={chartData}>
        <CartesianGrid strokeDasharray="5 5" vertical={false} />
        <XAxis dataKey="hour" dx={25} fontSize={10} angle={-15} />
        <YAxis label={{ value: 'Hours Logged', position: 'insideLeft', angle: -90, offset: 10, fill: '#ccc' }} />
        {/* <Legend /> */}
        <Tooltip
          formatter={(val: string) => [`${val} hrs`, 'avg']}
          labelFormatter={(label: keyof typeof hoursRangeMap) => {
            const val = hoursRangeMap[label];
            return val || label;
          }}
          labelStyle={{ color: '#999' }}
        />
        <Bar dataKey="value" fill="#8884d8" />
      </BarChart>
    </div>
  );
};

const AppDetailsDisplay: React.FC<{ days: number; dataSuffix?: string; dKey: 'mostused' | 'mostopened'; isTime?: boolean }> = ({
  days,
  dKey,
  dataSuffix,
  isTime,
}) => {
  const [listData, setListData] = useState<{ app: string; value: number; subApps: { subApp: string; value: number }[] }[]>([]);
  const timeout = useRef<any>();
  const [activeItems, setActiveItems] = useState<string[]>([]);

  const requestForData = () => {
    if (days !== 1) ipcRenderer.send(`get-days-${dKey}-snapshot`, { days });
    else ipcRenderer.send(`get-today-${dKey}-snapshot`);
  };

  const toggleActiveItem = (item: string) => {
    if (activeItems.includes(item)) {
      setActiveItems((r) => r.filter((m) => m !== item));
    } else setActiveItems((r) => [...r, item]);
  };

  const setListDataCb = useCallback((_, resp) => {
    if (Array.isArray(resp)) setListData(resp);
    console.log('DATA ', resp);
  }, []);

  useEffect(() => {
    clearInterval(timeout.current);
    setListData([]);
    setTimeout(() => {
      requestForData();
    }, 100);

    timeout.current = setInterval(() => {
      requestForData();
    }, 10000);

    return () => {
      clearInterval(timeout.current);
    };
  }, [days]);

  useEffect(() => {
    ipcRenderer.on(`get-today-${dKey}-snapshot`, setListDataCb);
    ipcRenderer.on(`get-days-${dKey}-snapshot`, setListDataCb);
    return () => {
      clearInterval(timeout.current);
      ipcRenderer.removeListener(`get-today-${dKey}-snapshot`, setListDataCb);
      ipcRenderer.removeListener(`get-days-${dKey}-snapshot`, setListDataCb);
    };
  }, [dKey]);
  return (
    <div className={Styles.AppListView}>
      {listData.map((item) => (
        <React.Fragment key={item.app}>
          <div key={item.app} className={Styles.AppListItem} onClick={() => toggleActiveItem(item.app)}>
            <div className={Styles.AppName}>
              <Icon icon={activeItems.includes(item.app) ? 'caret-down' : 'caret-right'} /> {item.app}
            </div>
            <div className={Styles.Value} style={{ fontWeight: 'bold' }}>
              {isTime ? prettyMs(item.value) : item.value} {isTime ? '' : `${dataSuffix}${item.value > 1 ? 's' : ''}`}
            </div>
          </div>
          {activeItems.includes(item.app) &&
            item.subApps.map((r) => (
              <div key={r.subApp} className={Styles.AppListItem} style={{ color: '#999' }}>
                <div className={Styles.AppName} style={{ paddingLeft: 20 }}>
                  <Icon icon="application" size={12} style={{ marginRight: 3 }} /> {r.subApp}
                </div>
                <div className={Styles.Value}>
                  {isTime ? prettyMs(r.value) : r.value} {isTime ? '' : dataSuffix}
                </div>
              </div>
            ))}
        </React.Fragment>
      ))}
    </div>
  );
};

const DetailsView = () => {
  const { windowSize, setWindowHeight, setWindowSize } = useWindowSize();
  const [activeTab, setActiveTab] = useState('today');
  const [activeSubTab, setActiveSubTab] = useState('most_used');
  const navigate = useNavigate();

  useEffect(() => {
    setWindowSize({ width: 850, height: 600 });
  }, []);

  return (
    <div className={Styles.Container} style={{ width: windowSize.width - 20, height: windowSize.height - 20 }}>
      <div className={Styles.Inner}>
        <div className={Styles.Header}>
          <Icon icon="arrow-left" className={Styles.BackButton} onClick={() => navigate(appRoutes.HOME)} />
          <div className={Styles.Label}>Screen time</div>
        </div>
        <div className={Styles.Content}>
          <div className={Styles.Tabs}>
            <div className={classNames(Styles.Tab, { [Styles.Active]: activeTab === 'today' })} onClick={() => setActiveTab('today')}>
              Today
            </div>
            <div className={classNames(Styles.Tab, { [Styles.Active]: activeTab === 'seven_days' })} onClick={() => setActiveTab('seven_days')}>
              Last 7 Days
            </div>
          </div>

          <HoursChartDisplay key={activeTab} width={windowSize.width - 50} days={activeTab === 'seven_days' ? 7 : 1} />

          <div className={Styles.SubTabs}>
            <div
              className={classNames(Styles.SubTab, { [Styles.Active]: activeSubTab === 'most_used' })}
              onClick={() => setActiveSubTab('most_used')}
            >
              Most Used
            </div>
            <div
              className={classNames(Styles.SubTab, { [Styles.Active]: activeSubTab === 'most_opened' })}
              onClick={() => setActiveSubTab('most_opened')}
            >
              Most Opened
            </div>
          </div>

          <div className={Styles.BottomItems}>
            <div className={Styles.BottomItemsMain}>
              <div className={Styles.OverflowWrapper}>
                {activeSubTab === 'most_opened' ? (
                  <AppDetailsDisplay key="mostopened" dKey="mostopened" dataSuffix="time" days={activeTab === 'seven_days' ? 7 : 1} />
                ) : (
                  <AppDetailsDisplay key="mostused" dKey="mostused" isTime days={activeTab === 'seven_days' ? 7 : 1} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={Styles.DragView}>
        <Icon icon="drag-handle-vertical" />
      </div>
    </div>
  );
};

export default DetailsView;
