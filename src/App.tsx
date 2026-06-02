import { Routes, Route } from 'react-router-dom';
import LandingPage from './app/page';
import HomePageView from './app/homePage/page';
import LoginPage from './app/login/page';
import LibraryTreePage from './app/library-tree/page';
import SastraNidhiPage from './app/sastranidhi/page';
import DonatePage from './app/sastranidhi/donate/page';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/homePage" element={<HomePageView />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/library-tree" element={<LibraryTreePage />} />
      <Route path="/sastranidhi" element={<SastraNidhiPage />} />
      <Route path="/sastranidhi/donate" element={<DonatePage />} />
    </Routes>
  );
}
