import { Link, useParams } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { PlayerForm } from '../components/PlayerForm';

export function EditPlayer() {
  const { id } = useParams();
  const { playersById, loading } = useLeague();
  const p = id ? playersById.get(id) : undefined;
  if (loading) return <p>Loading…</p>;
  if (!p || p.archived_at)
    return (
      <div className="pitch-card text-center">
        <p className="mb-3">Player not found. They may have been removed.</p>
        <Link to="/table" className="btn-ghost">Back to the table</Link>
      </div>
    );
  return <PlayerForm key={p.id} player={p} />;
}
