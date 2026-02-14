import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginGuard } from './components/LoginGuard';
import Home from './pages/Home';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <LoginGuard>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </LoginGuard>
    </BrowserRouter>
  );
}

export default App;
