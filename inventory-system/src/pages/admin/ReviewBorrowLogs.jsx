import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase.config';
import { useTheme } from '../../context/ThemeContext';

export default function ReviewBorrowLogs() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI States for Toast and Custom Modal
  const [toast, setToast] = useState({ show: false, message: '' });
  const [returnModal, setReturnModal] = useState({ show: false, logId: null, equipmentId: null });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

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

  const initiateReturn = (logId, equipmentId) => {
    setReturnModal({ show: true, logId, equipmentId });
  };

  const confirmReturn = async () => {
    const { logId, equipmentId } = returnModal;
    if (!logId) return;

    try {
      await updateDoc(doc(db, 'logs', logId), {
        status: 'Returned',
        dateReturned: new Date().toLocaleString()
      });

      if (equipmentId) {
        await updateDoc(doc(db, 'equipment', equipmentId), {
          status: 'available'
        });
      }

      setReturnModal({ show: false, logId: null, equipmentId: null });
      showToast("Return processed successfully.");
    } catch (error) {
      console.error("Error updating return status:", error);
      showToast("Error processing return.");
      setReturnModal({ show: false, logId: null, equipmentId: null });
    }
  };

  const activeCount = logs.filter(log => log.status === 'Active').length;

  return (
    <div className={`min-h-screen w-full p-6 md:p-12 lg:p-16 flex flex-col items-center overflow-y-auto transition-colors duration-500 relative ${isDarkMode ? 'bg-[#050B14] text-white' : 'bg-slate-50 text-slate-900'}`} style={{ fontFamily: "ui-monospace, monospace" }}>

      {/* --- SUBTLE TOAST NOTIFICATION --- */}
      <div className={`fixed bottom-10 right-10 z-[60] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-8 py-4 rounded-2xl backdrop-blur-2xl border shadow-2xl ${isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
          <span className="text-xs font-black tracking-[0.3em] uppercase opacity-80">{toast.message}</span>
        </div>
      </div>

      {/* --- CUSTOM RETURN CONFIRMATION MODAL --- */}
      {returnModal.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setReturnModal({ show: false, logId: null, equipmentId: null })}></div>
          <div className={`relative w-full max-w-md p-10 backdrop-blur-3xl border rounded-[2.5rem] shadow-2xl text-center ${isDarkMode ? 'bg-gradient-to-br from-white/10 to-[#050B14] border-white/10' : 'bg-white border-slate-200'}`}>
            <h3 className="text-2xl font-bold mb-4">Confirm Return</h3>
            <p className={`mb-8 leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Verify that the equipment has been physically returned and inspected. This action will free up the asset for the next borrower.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setReturnModal({ show: false, logId: null, equipmentId: null })}
                className={`flex-1 py-4 rounded-2xl border transition-all font-bold cursor-pointer ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
              >
                Cancel
              </button>
              {/* Restored to consistent brand blue styling */}
              <button
                onClick={confirmReturn}
                className="flex-1 py-4 rounded-2xl bg-[#3852A4] text-white font-bold hover:bg-[#2e438a] transition-all cursor-pointer shadow-lg active:scale-95"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/dashboard')} className={`self-start text-xl transition-all mb-12 flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
        <span className="text-3xl">←</span> Back to Dashboard
      </button>

      <div className="w-full max-w-7xl mb-12 text-left">
        <h1 className="text-6xl font-bold tracking-tight mb-4">Borrow Logs</h1>
        <p className={`text-2xl uppercase tracking-[0.3em] font-black ${isDarkMode ? 'text-blue-100/40' : 'text-slate-400'}`}>
          Live Activity Feed
        </p>
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className={`p-10 rounded-[2.5rem] flex justify-between items-center border transition-all ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40'}`}>
          <span className={`font-black uppercase tracking-[0.3em] text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Currently Out</span>
          <span className="text-5xl font-bold text-[#3B82F6] tracking-tighter">{activeCount}</span>
        </div>
        <div className={`p-10 rounded-[2.5rem] flex justify-between items-center border transition-all ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40'}`}>
          <span className={`font-black uppercase tracking-[0.3em] text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Total Records</span>
          <span className="text-5xl font-bold tracking-tighter">{logs.length}</span>
        </div>
      </div>

      <div className={`w-full max-w-7xl border rounded-[3rem] overflow-hidden transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200 shadow-2xl shadow-slate-200/50'}`}>
        <table className="w-full text-left">
          <thead className={isDarkMode ? 'bg-white/5 text-white/20' : 'bg-slate-50 text-slate-400'}>
            <tr className="text-xs font-black uppercase tracking-[0.4em]">
              <th className="px-8 py-10">Borrower Info</th>
              <th className="px-8 py-10">Asset Name</th>
              <th className="px-8 py-10">Checked Out</th>
              <th className="px-8 py-10 text-center">Status</th>
              <th className="px-8 py-10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
            {loading ? (
              <tr><td colSpan="5" className="p-32 text-center opacity-50 animate-pulse text-xl">Initializing Live Stream...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" className="p-32 text-center opacity-50 text-xl">No borrowing activity recorded yet.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={`transition-all ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}>

                  <td className="px-8 py-8">
                    <span className="text-2xl font-bold block mb-1">{log.borrowerName || log.studentName}</span>
                    <span className={`text-xs font-bold tracking-widest uppercase flex items-center gap-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                      {log.borrowerRole || 'Student'} • ID: {log.borrowerId || log.studentId}
                    </span>
                  </td>

                  <td className="px-8 py-8 text-xl font-medium">
                    {log.itemName}
                  </td>

                  <td className="px-8 py-8">
                    <span className={`block font-bold text-sm mb-1 ${isDarkMode ? 'text-white/80' : 'text-slate-700'}`}>{log.dateBorrowed}</span>
                    <span className={`text-xs font-bold tracking-widest uppercase ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>
                      Due: {log.expectedReturn || 'N/A'}
                    </span>
                  </td>

                  <td className="px-8 py-8 text-center">
                    <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      log.status === 'Active' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                      log.status === 'Returned' ? 'bg-slate-500/20 text-slate-400' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {log.status}
                    </span>
                  </td>

                  <td className="px-8 py-8 text-right">
                    {log.status === 'Active' ? (
                      <button
                        onClick={() => initiateReturn(log.id, log.equipmentId)}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-end gap-2 ml-auto border
                          ${isDarkMode
                            ? 'bg-white/[0.05] border-white/10 text-white hover:bg-[#3852A4]/20 hover:text-blue-300 hover:border-[#3852A4]/40'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#3852A4] hover:border-blue-200'
                          }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Receive Return
                      </button>
                    ) : (
                      <div className={`text-xs font-bold tracking-widest uppercase ${isDarkMode ? 'text-white/20' : 'text-slate-400'}`}>
                        Returned on <br/> {log.dateReturned?.split(',')[0]}
                      </div>
                    )}
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