import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebase.config';
import { useTheme } from '../../context/ThemeContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [stats, setStats] = useState({ available: 0, total: 0, borrowed: 0, maintenance: 0 });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const fetchCounts = async () => {
      try {
        const equipmentRef = collection(db, 'equipment');
        const [totalSnap, availableSnap, borrowedSnap, maintenanceSnap] = await Promise.all([
          getCountFromServer(equipmentRef),
          getCountFromServer(query(equipmentRef, where('status', '==', 'available'))),
          getCountFromServer(query(equipmentRef, where('status', '==', 'borrowed'))),
          getCountFromServer(query(equipmentRef, where('status', '==', 'maintenance'))),
        ]);

        if (!isActive) return;

        setStats({
          available: availableSnap.data().count,
          total: totalSnap.data().count,
          borrowed: borrowedSnap.data().count,
          maintenance: maintenanceSnap.data().count,
        });
      } catch (error) {
        console.error('Stats refresh error:', error);
      }
    };

    fetchCounts();
    const intervalId = setInterval(fetchCounts, 30000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = ['equipment', 'logs', 'reports'];

  return (
    <div className={`min-h-screen md:h-screen w-full flex flex-col p-4 sm:p-6 md:p-10 lg:p-14 transition-colors duration-500 relative ${isDarkMode ? 'bg-[#050B14] text-white' : 'bg-slate-50 text-slate-900'}`} style={{ fontFamily: "ui-monospace, monospace" }}>

      {/* --- SIGN OUT MODAL --- */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
          <div className={`relative w-full max-w-md p-8 border rounded-[2rem] shadow-2xl text-center ${isDarkMode ? 'bg-[#050B14] border-white/10' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xl font-bold mb-4">Confirm Sign Out</h3>
            <p className="mb-8 text-sm opacity-50">End your current session?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowLogoutModal(false)} className={`flex-1 py-4 rounded-2xl border font-bold ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'}`}>Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-lg active:scale-95">Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MOBILE ONLY: HAMBURGER SIDEBAR --- */}
      <div className={`md:hidden fixed inset-0 z-[90] transition-all duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
        <div className={`absolute top-0 right-0 h-full w-[80%] max-w-[300px] p-8 flex flex-col shadow-2xl transition-transform duration-500 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-[#050B14] border-l border-white/10' : 'bg-white border-l border-slate-200'}`}>
          <div className="flex justify-between items-center mb-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Menu</span>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 opacity-50"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <div className="flex flex-col gap-3 mb-auto">
            {navItems.map((path) => (
              <button key={path} onClick={() => { navigate(`/${path}`); setIsMenuOpen(false); }} className={`py-5 px-6 rounded-2xl text-left font-bold border transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                {path.charAt(0).toUpperCase() + path.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 pt-6 border-t border-white/5">
            <button onClick={toggleTheme} className={`flex items-center justify-between py-4 px-6 rounded-2xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <span className="font-bold">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              {isDarkMode ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>}
            </button>
            <button onClick={() => { setIsMenuOpen(false); setShowLogoutModal(true); }} className="py-4 rounded-2xl font-bold bg-red-500/10 text-red-400">Sign out</button>
          </div>
        </div>
      </div>

      {/* --- DASHBOARD HEADER --- */}
      <header className="flex justify-between items-center mb-8 md:mb-14">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-1 sm:mb-2">Overview</h1>
          <p className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.3em] opacity-30">Lab Inventory System</p>
        </div>

        {/* Desktop Only Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <button onClick={toggleTheme} className={`p-3 rounded-full border transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            {isDarkMode ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>}
          </button>
          <button onClick={() => setShowLogoutModal(true)} className={`px-8 py-3 rounded-full border font-semibold transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50'}`}>Sign out</button>
        </div>

        {/* Mobile Only Hamburger Trigger */}
        <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-3 rounded-full border border-white/10 bg-white/5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </header>

      {/* --- STATS GRID: BENTO ON MOBILE, LINEAR ON DESKTOP --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-8 flex-1 min-h-0">

        {/* HERO CARD: Bento (spans 2x2) on Mobile, Single Column on Desktop */}
        <div className={`col-span-2 md:col-span-1 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border transition-all flex flex-col justify-between ${isDarkMode ? 'bg-gradient-to-br from-[#3852A4]/20 to-transparent border-[#3852A4]/30' : 'bg-white border-slate-200 shadow-xl'}`}>
          <span className={`text-[10px] md:text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-200/60' : 'text-slate-400'}`}>Available</span>
          <span className="text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-[#3852A4]">{stats.available}</span>
        </div>

        <div className={`col-span-1 md:col-span-1 p-5 md:p-10 rounded-[1.5rem] md:rounded-[3rem] border transition-all flex flex-col justify-between ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
          <span className="text-[10px] md:text-sm font-black uppercase tracking-widest opacity-40">Total</span>
          <span className="text-4xl md:text-8xl font-bold tracking-tighter">{stats.total}</span>
        </div>

        <div className={`col-span-1 md:col-span-1 p-5 md:p-10 rounded-[1.5rem] md:rounded-[3rem] border transition-all flex flex-col justify-between ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
          <span className="text-[10px] md:text-sm font-black uppercase tracking-widest opacity-40">Borrowed</span>
          <span className="text-4xl md:text-8xl font-bold tracking-tighter">{stats.borrowed}</span>
        </div>

        {/* WIDE CARD: Spans 2 columns on Mobile, Single Column on Desktop */}
        <div className={`col-span-2 md:col-span-1 p-5 md:p-10 rounded-[1.5rem] md:rounded-[3rem] border transition-all flex flex-col justify-between ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
          <span className="text-[10px] md:text-sm font-black uppercase tracking-widest opacity-40">Maintenance</span>
          <span className="text-4xl md:text-8xl font-bold tracking-tighter">{stats.maintenance}</span>
        </div>
      </div>

      {/* --- DESKTOP ONLY: MANAGEMENT CONTROLS --- */}
      <div className="hidden md:block mt-14">
        <h2 className="text-sm font-black uppercase tracking-[0.4em] mb-8 opacity-20 text-center md:text-left">Management Controls</h2>
        <div className="grid grid-cols-3 gap-6">
          {navItems.map((path) => (
            <button key={path} onClick={() => navigate(`/${path}`)} className={`py-8 rounded-[2.5rem] text-xl font-bold border transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-[#3852A4]/30' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-lg'}`}>
              {path.charAt(0).toUpperCase() + path.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}