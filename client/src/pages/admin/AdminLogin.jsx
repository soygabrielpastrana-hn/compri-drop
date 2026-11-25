import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { api } from '../../lib/api.js';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-600';

export default function AdminLogin({ onLogin }) {
  const [master, setMaster] = useState(false); // clave maestra (sin correo)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.admin.login(master ? '' : email, password);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-brand-800 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-7 shadow-xl">
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent-400 text-brand-900"><Lock size={22} /></span>
          <h1 className="mt-3 text-xl font-extrabold text-brand-800">Panel de Compri</h1>
          <p className="text-sm text-slate-500">Acceso para el equipo</p>
        </div>

        {!master && (
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className={input} />
        )}
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={master ? 'Clave maestra' : 'Contraseña'} className={input} />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <button type="button" onClick={() => { setMaster((m) => !m); setError(''); }} className="block w-full text-center text-xs text-slate-400 hover:text-brand-700">
          {master ? '← Entrar con mi correo' : 'Entrar con clave maestra'}
        </button>
        <Link to="/" className="block text-center text-sm text-slate-500">← Volver a la tienda</Link>
      </form>
    </div>
  );
}
