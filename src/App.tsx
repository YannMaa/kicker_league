import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LeagueProvider } from './lib/store';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NewGame } from './pages/NewGame';
import { Register } from './pages/Register';
import { Table } from './pages/Table';
import { Profile } from './pages/Profile';
import { Insights } from './pages/Insights';
import { QrPrint } from './pages/QrPrint';
import { MatchDetail } from './pages/MatchDetail';

export default function App() {
  return (
    <LeagueProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="game" element={<NewGame />} />
            <Route path="players/new" element={<Register />} />
            <Route path="players/:id" element={<Profile />} />
            <Route path="matches/:id" element={<MatchDetail />} />
            <Route path="table" element={<Table />} />
            {/* alte deutsche Adressen (z.B. bereits gescannte QR-Codes) */}
            <Route path="spiel" element={<Navigate to="/game" replace />} />
            <Route path="tabelle" element={<Navigate to="/table" replace />} />
            <Route path="insights" element={<Insights />} />
            <Route path="qr" element={<QrPrint />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LeagueProvider>
  );
}
