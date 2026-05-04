import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/firebase.config';
import loginBg from '../../assets/loginBg.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err.code);
      setError('You are not the admin! Try Again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center bg-[#050B14] p-4"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Google Sans', 'Product Sans', 'Segoe UI', system-ui, sans-serif"
      }}
    >
      <div className="absolute inset-0 bg-[#050B14]/40 backdrop-blur-md z-0"></div>

      <div className="z-10 w-full max-w-[420px] p-8 sm:p-10 bg-gradient-to-br from-white/10 to-[#0a1128]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden">

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl sm:text-4xl text-white font-semibold tracking-tight mb-2">Sign in</h1>
          <p className="text-blue-100/50 text-xs sm:text-sm">Secure Admin Access</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 sm:gap-5 relative z-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-xs sm:text-sm p-3 rounded-xl text-center">{error}</div>
          )}

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-[1rem] sm:rounded-[1.2rem] px-5 sm:px-6 py-3 sm:py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all text-sm sm:text-base"
            placeholder="Admin Email"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-[1rem] sm:rounded-[1.2rem] px-5 sm:px-6 py-3 sm:py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all pr-12 sm:pr-14 text-sm sm:text-base"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <svg width="18" height="18" sm:width="20" sm:height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg width="18" height="18" sm:width="20" sm:height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`mt-2 sm:mt-4 border border-white/10 px-5 sm:px-6 py-3 sm:py-4 rounded-[1rem] sm:rounded-[1.2rem] text-base sm:text-lg font-semibold transition-all duration-300 w-full cursor-pointer ${
              isLoading ? 'bg-white/5 text-white/50 cursor-not-allowed' : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20'
            }`}
          >
            {isLoading ? 'Authenticating...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}