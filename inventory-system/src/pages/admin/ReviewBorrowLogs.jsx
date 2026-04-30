import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/firebase.config';

export default function ReviewBorrowLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for the 'logs' collection[cite: 19, 28]
  useEffect(() => {
    const q = query(collection(db, 'logs'), orderBy('dateBorrowed', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate live numbers for the header[cite: 19, 28]
  const activeCount = logs.filter(log => log.status === 'Active').length;

  return (
    <div
      className="min-h-screen w-full bg-[#050B14] text-white p-6 md:p-12 lg:p-16 flex flex-col items-center overflow-y-auto"
      style={{ fontFamily: "ui-monospace, monospace" }}
    >

      {/* Back Navigation[cite: 22, 28] */}
      <button
        onClick={() => navigate('/dashboard')}
        className="self-start text-xl text-white/40 hover:text-white transition-all mb-12 flex items-center gap-2"
      >
        <span className="text-3xl">←</span> Back to Dashboard
      </button>

      {/* Scaled Page Header[cite: 19, 28] */}
      <div className="w-full max-w-6xl mb-12 text-left">
        <h1 className="text-6xl font-bold tracking-tight mb-4 text-white">Borrow Logs</h1>
        <p className="text-2xl text-blue-100/40 uppercase tracking-[0.3em] font-black">
          Live Activity Feed
        </p>
      </div>

      {/* --- SCALED LIVE STATS BAR ---[cite: 28] */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] flex justify-between items-center transition-all hover:bg-white/[0.05]">
          <span className="text-white/40 font-black uppercase tracking-[0.3em] text-xs">Currently Out</span>
          <span className="text-5xl font-bold text-[#3B82F6] tracking-tighter">{activeCount}</span>
        </div>
        <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] flex justify-between items-center transition-all hover:bg-white/[0.05]">
          <span className="text-white/40 font-black uppercase tracking-[0.3em] text-xs">Total Records</span>
          <span className="text-5xl font-bold tracking-tighter">{logs.length}</span>
        </div>
      </div>

      {/* --- SCALED LOGS TABLE ---[cite: 22, 23, 28] */}
      <div className="w-full max-w-6xl bg-white/[0.02] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-black text-white/20 uppercase tracking-[0.4em] bg-white/5">
              <th className="px-10 py-10">Log ID</th>
              <th className="px-10 py-10">Borrower Info</th>
              <th className="px-10 py-10">Asset Name</th>
              <th className="px-10 py-10">Timestamp</th>
              <th className="px-10 py-10 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-32 text-center text-white/20 animate-pulse text-xl">Initializing Live Stream...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-32 text-center text-white/20 text-xl">No borrowing activity recorded yet.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.03] transition-all">
                  <td className="px-10 py-10 text-white/40 font-bold tracking-widest text-sm uppercase">
                    {log.id.substring(0, 8)}
                  </td>
                  <td className="px-10 py-10 text-2xl font-bold">
                    {log.studentName} <br/>
                    <span className="text-sm text-white/30 font-bold tracking-widest uppercase mt-1 block">
                      ID: {log.studentId}
                    </span>
                  </td>
                  <td className="px-10 py-10 text-white/80 text-lg">
                    {log.itemName}
                  </td>
                  <td className="px-10 py-10 text-white/40 font-bold text-base">
                    {log.dateBorrowed}
                  </td>
                  <td className="px-10 py-10 text-right">
                    <span className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest ${
                      log.status === 'Active' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                      log.status === 'Returned' ? 'bg-green-500/10 text-green-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}