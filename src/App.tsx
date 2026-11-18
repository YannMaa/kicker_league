import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LeagueProvider } from './lib/store';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NewGame } from './pages/NewGame';
import { Register } from './pages/Register';
import { Table } from './pages/Table';
import { Profile } from './pages/Profile';
import { Insights } from './pages/Insights';
import { QrPrint } from './pages/QrPrint';

export default function App() {
  return (
    <LeagueProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="spiel" element={<NewGame />} />
            <Route path="spieler/neu" element={<Register />} />
            <Route path="spieler/:id" element={<Profile />} />
            <Route path="tabelle" element={<Table />} />
            <Route path="insights" element={<Insights />} />
            <Route path="qr" element={<QrPrint />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LeagueProvider>
  );
}
