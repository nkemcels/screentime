import { ipcRenderer } from 'electron';
import React, { useContext, useEffect, useState } from 'react';

const WindowSizeContext = React.createContext<{
  setWindowSize: (args: { width: number; height: number }) => void;
  setWindowWidth: (val: number) => void;
  setWindowHeight: (val: number) => void;
  windowSize: { width: number; height: number };
}>({ setWindowSize: () => {}, setWindowHeight: () => {}, setWindowWidth: () => {}, windowSize: { width: 240, height: 220 } });

export const useWindowSize = () => {
  const { setWindowSize, windowSize, setWindowHeight, setWindowWidth } = useContext(WindowSizeContext);
  useEffect(() => {
    ipcRenderer.send('adjust-window-size', windowSize);
  }, [windowSize]);
  return { setWindowSize, windowSize, setWindowHeight, setWindowWidth };
};

export const WindowSizeProvider: React.FC = ({ children }) => {
  const [windowSize, setWindowSize] = useState({ width: 240, height: 220 });
  const handleSetWidth = (val: number) => setWindowSize((r) => ({ ...r, width: val }));
  const handleSetHeight = (val: number) => setWindowSize((r) => ({ ...r, height: val }));
  return (
    <WindowSizeContext.Provider value={{ windowSize, setWindowSize, setWindowHeight: handleSetHeight, setWindowWidth: handleSetWidth }}>
      {children}
    </WindowSizeContext.Provider>
  );
};
