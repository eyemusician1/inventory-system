import React from 'react';
import { useNavigate } from 'react-router-dom';
import loginBg from '../../assets/loginBg.png';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#050B14] text-white"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Google Sans', 'Product Sans', 'Segoe UI', system-ui, sans-serif"
      }}
    >
      <div className="text-center max-w-4xl px-4 sm:px-6 flex flex-col items-center">

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter mb-4 sm:mb-6 leading-none">
          Inventory
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-blue-100/70 mb-10 sm:mb-14 max-w-2xl">
          Easily manage lab equipment and monitor status in real-time.
        </p>

        <button
          onClick={() => navigate('/login')}
          style={{ fontFamily: 'inherit' }}
          className="inline-flex items-center justify-center whitespace-nowrap bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-semibold transition-all duration-300 hover:bg-white/20 hover:border-white/40 shadow-lg"
        >
          Get Started
        </button>

      </div>
    </div>
  );
}