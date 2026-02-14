import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginGuard } from './components/LoginGuard';
import MainLayout from './pages/MainLayout';
import './styles/tea-theme.less';

function App() {
  return (
    <BrowserRouter>
      <LoginGuard>
        <Routes>
          <Route path="/" element={<MainLayout />} />
        </Routes>
      </LoginGuard>
    </BrowserRouter>
  );
}

export default App;