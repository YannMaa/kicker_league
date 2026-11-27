import { NavLink, Outlet, Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { resetDemo } from '../lib/api';

const nav = [
  { to: '/', label: 'Home', icon: '🏟️' },
  { to: '/table', label: 'Table', icon: '📊' },
  { to: '/game', label: 'Match', icon: '⚽', primary: true },
  { to: '/insights', label: 'Insights', icon: '💡' },
  { to: '/players/new', label: 'Join', icon: '➕' },
];

export function Layout() {
  const { demo, error } = useLeague();
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="wood no-print sticky top-0 z-20 flex items-center justify-between rounded-b-2xl px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-score text-3xl leading-none tracking-wider drop-shadow">AIBE FOOSBALL LEAGUE</span>
        </Link>
      </header>
      {demo && (
        <div className="no-print mx-4 mt-3 rounded-xl bg-yellow-300 px-3 py-2 text-sm font-semibold text-black">
          Demo mode: Supabase is not connected yet, data is only stored in this browser.{' '}
          <button className="underline" onClick={() => { resetDemo(); location.reload(); }}>
            Reset demo
          </button>
        </div>
      )}
      {error && (
        <div className="no-print mx-4 mt-3 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold">
          Connection problem: {error}
        </div>
      )}
      <main className="flex-1 px-4 pt-4">
        <Outlet />
      </main>
      {/* pb-28: Platz für die feste Navigation */}
      <footer className="px-4 pb-28 pt-10 text-center text-[11px] text-white/60 print:hidden">
        Imprint · Feedback or ideas for improvement? Feel free to email{' '}
        <a href="mailto:yannis.maag@fau.de" className="underline">
          yannis.maag@fau.de
        </a>
      </footer>
      <nav className="wood no-print fixed inset-x-0 bottom-0 z-20 mx-auto max-w-3xl rounded-t-2xl px-2 pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-5">
          {nav.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center py-2 text-[11px] font-bold uppercase ${
                    n.primary ? '-mt-5' : ''
                  } ${isActive ? 'text-yellow-300' : 'text-white/90'}`
                }
              >
                <span
                  className={
                    n.primary
                      ? 'flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl shadow-[0_4px_0_#94a3b8] ring-4 ring-wood-dark'
                      : 'text-xl'
                  }
                >
                  {n.icon}
                </span>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
