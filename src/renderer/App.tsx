import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import '../../node_modules/@blueprintjs/core/lib/css/blueprint.css';
import '../../node_modules/@blueprintjs/icons/lib/css/blueprint-icons.css';
import appRoutes from './constants/routes';
import { WindowSizeProvider } from './hooks/windowSize';
import DetailsView from './Views/DetailsView/DetailsView';
import HomeView from './Views/HomeView/HomeView';

export default function App() {
  return (
    <WindowSizeProvider>
      <Router>
        <Routes>
          <Route path={appRoutes.DETAILS} element={<DetailsView />} />
          <Route path={appRoutes.HOME} element={<HomeView />} />
        </Routes>
      </Router>
    </WindowSizeProvider>
  );
}
