import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebase.config';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    available: 0,
    total: 0,
    borrowed: 0,
    maintenance: 0
  });

  useEffect(() => {
    const equipmentRef = collection(db, 'equipment');
    const unsubscribe = onSnapshot(equipmentRef, (snapshot) => {
      let availableCount = 0;
      let borrowedCount = 0;
      let maintenanceCount = 0;
      let totalCount = snapshot.size;

      snapshot.forEach((doc) => {
        const item = doc.data();
        if (item.status === 'available') availableCount++;
        if (item.status === 'borrowed') borrowedCount++;
        if (item.status === 'maintenance') maintenanceCount++;
      });

      setStats({
        available: availableCount,
        total: totalCount,
        borrowed: borrowedCount,
        maintenance: maintenanceCount
      });
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div
      className="h-screen w-full overflow-hidden bg-[#050B14] text-white flex flex-col p-6 md:p-10 lg:p-14"
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace"
      }}
    >
      {/* Scaled Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">Overview</h1>
          <p className="text-blue-100/40 text-lg tracking-wide uppercase">Lab Inventory System</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-base font-semibold transition-all duration-300 cursor-pointer"
        >
          Sign out
        </button>
      </header>

      {/* Scaled Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 flex-1 min-h-0">

        <div className="bg-gradient-to-br from-[#3852A4]/20 to-white/[0.02] backdrop-blur-xl border border-white/[0.08] p-10 rounded-[3rem] flex flex-col justify-between transition-all hover:bg-white/[0.05]">
          <span className="text-blue-200/60 text-sm font-black uppercase tracking-[0.25em]">Available</span>
          <span className="text-8xl lg:text-9xl font-bold text-white tracking-tighter">{stats.available}</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.08] p-10 rounded-[3rem] flex flex-col justify-between transition-all hover:bg-white/[0.08]">
          <span className="text-white/40 text-sm font-black uppercase tracking-[0.25em]">Total Assets</span>
          <span className="text-8xl lg:text-9xl font-bold text-white tracking-tighter">{stats.total}</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.08] p-10 rounded-[3rem] flex flex-col justify-between transition-all hover:bg-white/[0.08]">
          <span className="text-white/40 text-sm font-black uppercase tracking-[0.25em]">On Loan</span>
          <span className="text-8xl lg:text-9xl font-bold text-white tracking-tighter">{stats.borrowed}</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.08] p-10 rounded-[3rem] flex flex-col justify-between transition-all hover:bg-white/[0.08]">
          <span className="text-white/40 text-sm font-black uppercase tracking-[0.25em]">In Service</span>
          <span className="text-8xl lg:text-9xl font-bold text-white tracking-tighter">{stats.maintenance}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-12">
        <h2 className="text-sm font-black text-white/30 uppercase tracking-[0.4em] mb-8">Management Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/equipment')}
            className="flex items-center justify-center py-7 bg-white/[0.05] hover:bg-[#3852A4]/40 backdrop-blur-md border border-white/10 text-white rounded-[2rem] transition-all duration-300 text-xl font-bold tracking-tight cursor-pointer"
          >
            Manage Equipment
          </button>
          <button
            onClick={() => navigate('/logs')}
            className="flex items-center justify-center py-7 bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-md border border-white/10 text-white rounded-[2rem] transition-all duration-300 text-xl font-bold tracking-tight cursor-pointer"
          >
            Review Logs
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center justify-center py-7 bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-md border border-white/10 text-white rounded-[2rem] transition-all duration-300 text-xl font-bold tracking-tight cursor-pointer"
          >
            System Reports
          </button>
        </div>
      </div>
    </div>
  );
}