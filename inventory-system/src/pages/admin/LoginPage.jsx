import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Adjust this path if your image is located elsewhere
import loginBg from '../../assets/loginBg.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // TODO: Connect Firebase Authentication here later
    console.log('Logging in with:', email);

    // For now, successfully submitting the form routes you to the dashboard
    navigate('/');
  };

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#050B14] text-white"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Google Sans', sans-serif"
      }}
    >
      {/* Floating Element 1 - Top Left */}
      <div className="absolute top-20 left-10 md:left-32 bg-white/5 backdrop-blur-md px-8 py-6 rounded-[2rem] border border-white/10 transform -rotate-3 hover:rotate-0 transition-transform duration-300 hidden md:block">
        <div className="text-sm tracking-widest text-blue-200/70 uppercase mb-1">System</div>
        <div className="text-3xl font-medium tracking-tight text-blue-100">Lab Inventory</div>
      </div>

      {/* Floating Element 2 - Bottom Right */}
      <div className="absolute bottom-24 right-10 md:right-32 bg-[#d4e157]/10 backdrop-blur-md px-8 py-6 rounded-[2rem] border border-[#d4e157]/20 transform rotate-6 hover:rotate-0 transition-transform duration-300 hidden md:block">
        <div className="text-sm tracking-widest text-[#d4e157]/80 uppercase mb-1">Status</div>
        <div className="text-3xl font-medium tracking-tight text-[#d4e157]">Secure</div>
      </div>

      {/* Center Focal Point: Login Form */}
      <div className="z-10 w-full max-w-[440px] px-8 py-12 md:px-10 md:py-14 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col items-center">

        <h1 className="text-5xl md:text-6xl font-normal tracking-tight mb-4">
          Sign In
        </h1>
        <p className="text-lg text-blue-100/70 mb-10 font-light text-center">
          Access the admin portal
        </p>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">

          {/* Email Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-blue-100 ml-4 tracking-wide">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-full px-6 py-5 text-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#d4e157] focus:bg-black/40 transition-all duration-300"
              placeholder="name@institution.edu"
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-blue-100 ml-4 tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-full px-6 py-5 text-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#d4e157] focus:bg-black/40 transition-all duration-300"
              placeholder="••••••••"
            />
          </div>

          {/* Large Primary Action Button */}
          <button
            type="submit"
            className="mt-6 bg-[#d4e157] text-[#0a1128] hover:bg-[#cddc39] transition-colors duration-300 px-8 py-5 rounded-full text-xl font-medium shadow-[0_0_40px_rgba(212,225,87,0.15)] hover:shadow-[0_0_50px_rgba(212,225,87,0.3)] w-full"
          >
            Authenticate
          </button>
        </form>

      </div>
    </div>
  );
}