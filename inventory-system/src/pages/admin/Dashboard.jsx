import React from 'react';
import { useNavigate } from 'react-router-dom';
import hero from '../../assets/loginBg.png';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#050B14] text-white"
      style={{
        backgroundImage: `url(${hero})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Google Sans', sans-serif"
      }}
    >
      {/* Floating Stat 1 - Top Left */}
      <div className="absolute top-24 left-10 md:left-32 bg-white/5 backdrop-blur-md px-8 py-6 rounded-[2rem] border border-white/10 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
        <div className="text-5xl font-medium tracking-tight text-blue-100">142</div>
        <div className="text-sm tracking-wide mt-2 text-blue-200/70 uppercase">Total Items</div>
      </div>

      {/* Floating Stat 2 - Top Right */}
      <div className="absolute top-32 right-10 md:right-32 bg-white/5 backdrop-blur-md px-8 py-6 rounded-[2rem] border border-white/10 transform rotate-6 hover:rotate-0 transition-transform duration-300">
        <div className="text-5xl font-medium tracking-tight text-blue-100">89</div>
        <div className="text-sm tracking-wide mt-2 text-blue-200/70 uppercase">Available</div>
      </div>

      {/* Floating Stat 3 - Bottom Left */}
      <div className="absolute bottom-32 left-10 md:left-40 bg-white/5 backdrop-blur-md px-8 py-6 rounded-[2rem] border border-white/10 transform rotate-2 hover:rotate-0 transition-transform duration-300">
        <div className="text-5xl font-medium tracking-tight text-blue-100">45</div>
        <div className="text-sm tracking-wide mt-2 text-blue-200/70 uppercase">Borrowed</div>
      </div>

      {/* Floating Stat 4 - Bottom Right */}
      <div className="absolute bottom-24 right-10 md:right-40 bg-[#d4e157]/10 backdrop-blur-md px-8 py-6 rounded-[2rem] border border-[#d4e157]/20 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
        <div className="text-5xl font-medium tracking-tight text-[#d4e157]">8</div>
        <div className="text-sm tracking-wide mt-2 text-[#d4e157]/80 uppercase">Maintenance</div>
      </div>

      {/* Central Content */}
      <div className="z-10 text-center max-w-3xl px-6 flex flex-col items-center">
        <h1 className="text-7xl md:text-8xl font-normal tracking-tight mb-6">
          Dashboard
        </h1>
        <p className="text-lg md:text-xl text-blue-100/70 mb-12 font-light max-w-lg">
          Easily manage lab equipment, track borrower records, and monitor inventory status in real-time.
        </p>

        {/* Large Primary Action Button matching the "Let's get started" layout */}
        <button
          onClick={() => navigate('/equipment')}
          className="bg-[#d4e157] text-[#0a1128] hover:bg-[#cddc39] transition-colors duration-300 px-12 py-5 rounded-full text-lg font-medium shadow-[0_0_40px_rgba(212,225,87,0.2)]"
        >
          Manage equipment
        </button>
      </div>
    </div>
  );
}