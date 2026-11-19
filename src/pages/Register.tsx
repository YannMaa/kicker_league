import { useSearchParams } from 'react-router-dom';
import { PlayerForm } from '../components/PlayerForm';

export function Register() {
  const [params] = useSearchParams();
  return <PlayerForm backToGame={params.get('back') === 'game'} />;
}
