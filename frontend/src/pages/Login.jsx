import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ArrowRight, ShieldCheck, Bolt, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [setupRequired, setSetupRequired] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.getAuthSetupStatus()
      .then(res => {
        if (!res.success) throw new Error(res.message || 'Could not check account setup status.');
        setSetupRequired(res.setupRequired);
      })
      .catch(() => setError('Cannot connect to authentication server.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(username, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || 'Invalid username or password');
      }
    } catch (err) {
      setError('Cannot connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (setupPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createInitialAdmin({
        full_name: setupName,
        email: setupEmail,
        password: setupPassword
      });
      if (!res.success) {
        setError(res.message || 'Could not create the administrator account.');
        return;
      }

      setSetupRequired(false);
      setUsername(setupEmail.trim());
      setPassword('');
      setSetupPassword('');
      setConfirmPassword('');
      setNotice(res.message);
    } catch (err) {
      setError(err.message || 'Cannot connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F4] flex items-center justify-center p-4 lg:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#E3E9E3] bg-white shadow-[0_25px_80px_rgba(20,47,39,0.12)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#142F27_0%,#1A3A33_100%)] p-8 text-white lg:p-10">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#48C985]/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#48C985]/10 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#48C985] text-xl font-black text-[#142F27] shadow-lg shadow-[#48C985]/30">
                N
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#A7C2B9]">Retail Management</p>
                <h1 className="text-2xl font-black tracking-tight">NEXMART</h1>
              </div>
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#3C5B52] bg-[#1D433B] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DDEFE7]">
              <Bolt className="h-3.5 w-3.5 text-[#48C985]" />
              Electrical Store
            </div>

            <h2 className="max-w-sm text-3xl font-black tracking-tight text-white">
              Smarter billing for every electrical sale.
            </h2>

            <p className="mt-4 max-w-md text-sm leading-6 text-[#DDEFE7]">
              Manage stock, invoices, suppliers, and daily sales with a premium retail workflow built for modern electrical shops.
            </p>

            <div className="mt-8 space-y-3">
              {[
                'Fast invoice processing',
                'Live stock and pricing control',
                'Customer and supplier tracking'
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#2A5148] bg-[#1A3A33]/70 px-3 py-2.5 text-sm text-[#E7F3EE]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#48C985] text-[#142F27]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-[#F5F7F4] p-6 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7A867E]">
                {setupRequired ? 'First-time setup' : 'Welcome back'}
              </p>
              <h3 className="mt-2 text-2xl font-black text-[#202923]">
                {setupRequired ? 'Create administrator' : 'Sign in'}
              </h3>
            </div>

            {notice && (
              <div className="mb-4 rounded-2xl border border-[#B9E4CC] bg-[#F0F8F3] px-3 py-2.5 text-xs font-medium text-[#1A3A33]">
                {notice}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-2xl border border-[#F1C7C7] bg-[#FFF4F4] px-3 py-2.5 text-xs font-medium text-[#B62F2F]">
                {error}
              </div>
            )}

            {setupRequired ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#202923]">Administrator name</label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  autoComplete="name"
                  value={setupName}
                  onChange={e => setSetupName(e.target.value)}
                  className="w-full rounded-2xl border border-[#DCE5DF] bg-white px-3 py-2.5 text-sm text-[#202923] outline-none transition focus:border-[#48C985] focus:ring-2 focus:ring-[#48C985]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#202923]">Email address</label>
                <input
                  type="email"
                  required
                  maxLength={150}
                  autoComplete="email"
                  value={setupEmail}
                  onChange={e => setSetupEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#DCE5DF] bg-white px-3 py-2.5 text-sm text-[#202923] outline-none transition focus:border-[#48C985] focus:ring-2 focus:ring-[#48C985]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#202923]">Password</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={setupPassword}
                  onChange={e => setSetupPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#DCE5DF] bg-white px-3 py-2.5 text-sm text-[#202923] outline-none transition focus:border-[#48C985] focus:ring-2 focus:ring-[#48C985]/20"
                />
                <p className="mt-1 text-[11px] text-[#7A867E]">Use at least 12 characters.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#202923]">Confirm password</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#DCE5DF] bg-white px-3 py-2.5 text-sm text-[#202923] outline-none transition focus:border-[#48C985] focus:ring-2 focus:ring-[#48C985]/20"
                />
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-[#DCE5DF] bg-[#F0F8F3] p-3 text-[11px] text-[#1A3A33]">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-[#48C985]" />
                <div>
                  <div className="font-bold">One-time secure setup</div>
                  <div className="mt-1 text-[#4A5B56]">This form is disabled after the first administrator account is created.</div>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#48C985] px-4 py-3 text-sm font-bold text-[#142F27] shadow-[0_12px_30px_rgba(72,201,133,0.28)] transition hover:bg-[#3DBE76] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? 'Creating account...' : 'Create Administrator'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#202923]">Username / Phone Number</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-[#7A867E]" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin or 9742762826"
                    className="w-full rounded-2xl border border-[#DCE5DF] bg-white py-2.5 pl-10 pr-3 text-sm text-[#202923] outline-none transition focus:border-[#48C985] focus:ring-2 focus:ring-[#48C985]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#202923]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#7A867E]" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-[#DCE5DF] bg-white py-2.5 pl-10 pr-3 text-sm text-[#202923] outline-none transition focus:border-[#48C985] focus:ring-2 focus:ring-[#48C985]/20"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[#DCE5DF] bg-[#F0F8F3] p-3 text-[11px] text-[#1A3A33]">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-[#48C985]" />
                <div>
                  <div className="font-bold">Secure access</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#48C985] px-4 py-3 text-sm font-bold text-[#142F27] shadow-[0_12px_30px_rgba(72,201,133,0.28)] transition hover:bg-[#3DBE76] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
