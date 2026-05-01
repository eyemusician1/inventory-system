import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDoc, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebase.config';
import { useTheme } from '../../context/ThemeContext';

export default function ReviewBorrowLogs() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ show: false, message: '', type: 'default' });
  const [returnModal, setReturnModal] = useState({ show: false, log: null });
  const [deleteModal, setDeleteModal] = useState({ show: false, logId: null });

  const LOG_LIMIT = 300;

  const showToast = (message, type = 'default') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'default' }), 3000);
  };

  const formatLogDate = (log) => {
    if (log?.dateBorrowedAt?.toDate) {
      return log.dateBorrowedAt.toDate().toLocaleString();
    }
    return log?.dateBorrowed || 'N/A';
  };

  useEffect(() => {
    const q = query(collection(db, 'logs'), orderBy('dateBorrowedAt', 'desc'), limit(LOG_LIMIT));
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

  const initiateReturn = (log) => {
    setReturnModal({ show: true, log });
  };

  const confirmReturn = async () => {
    const { log } = returnModal;
    if (!log || !log.id) return;

    try {
      // 1. Update the Log Status
      await updateDoc(doc(db, 'logs', log.id), {
        status: 'Returned',
        dateReturned: new Date().toLocaleString()
      });

      // 2. Fetch current equipment data to handle hybrid tracking
      if (log.equipmentId) {
        const eqRef = doc(db, 'equipment', log.equipmentId);
        const eqSnap = await getDoc(eqRef);

        if (eqSnap.exists()) {
          const eqData = eqSnap.data();

          if (eqData.trackingType === 'bulk') {
            // Restore bulk quantity and make available
            const restoredQty = (eqData.availableQuantity || 0) + (log.quantityBorrowed || 1);
            await updateDoc(eqRef, {
              availableQuantity: restoredQty,
              status: 'available'
            });
          } else {
            // Simply make individual item available
            await updateDoc(eqRef, {
              status: 'available'
            });
          }
        }
      }

      setReturnModal({ show: false, log: null });
      showToast("Return processed successfully.");
    } catch (error) {
      console.error("Error processing return:", error);
      showToast("Error processing return.", 'delete');
      setReturnModal({ show: false, log: null });
    }
  };

  const initiateDelete = (logId) => {
    setDeleteModal({ show: true, logId });
  };

  const confirmDelete = async () => {
    const { logId } = deleteModal;
    if (!logId) return;
    try {
      await deleteDoc(doc(db, 'logs', logId));
      showToast("Log entry deleted permanently.", 'delete');
      setDeleteModal({ show: false, logId: null });
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Error deleting log.", 'delete');
      setDeleteModal({ show: false, logId: null });
    }
  };

  const activeCount = logs.filter(log => log.status === 'Active').length;

  const getToastStyle = () => {
    if (toast.type === 'delete') {
      return isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600';
    }
    return isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-900 border-slate-800 text-white';
  };

  return (
    <div className={`min-h-screen w-full p-4 sm:p-6 md:p-12 lg:p-16 flex flex-col items-center overflow-y-auto transition-colors duration-500 relative ${isDarkMode ? 'bg-[#050B14] text-white' : 'bg-slate-50 text-slate-900'}`} style={{ fontFamily: "ui-monospace, monospace" }}>

      <div className={`fixed bottom-4 sm:bottom-10 right-4 sm:right-10 z-[60] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl backdrop-blur-2xl border shadow-2xl transition-colors duration-300 flex items-center gap-3 ${getToastStyle()}`}>
          {toast.type === 'delete' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          )}
          <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] uppercase opacity-90">{toast.message}</span>
        </div>
      </div>

      {returnModal.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setReturnModal({ show: false, log: null })}></div>
          <div className={`relative w-full max-w-md p-6 sm:p-10 backdrop-blur-3xl border rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl text-center ${isDarkMode ? 'bg-gradient-to-br from-white/10 to-[#050B14] border-white/10' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Confirm Return</h3>
            <p className={`mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Verify that the equipment has been physically returned and inspected.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={() => setReturnModal({ show: false, log: null })} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl border transition-all font-bold cursor-pointer ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>Cancel</button>
              <button onClick={confirmReturn} className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#3852A4] text-white font-bold hover:bg-[#2e438a] transition-all cursor-pointer shadow-lg active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setDeleteModal({ show: false, logId: null })}></div>
          <div className={`relative w-full max-w-md p-6 sm:p-10 backdrop-blur-3xl border rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl text-center ${isDarkMode ? 'bg-gradient-to-br from-white/10 to-[#050B14] border-white/10' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Confirm Deletion</h3>
            <p className={`mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>This action is permanent.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={() => setDeleteModal({ show: false, logId: null })} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl border transition-all font-bold cursor-pointer ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-bold cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/dashboard')} className={`self-start text-base sm:text-xl transition-all mb-8 sm:mb-12 flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
        <span className="text-xl sm:text-3xl">←</span> Back to Dashboard
      </button>

      <div className="w-full max-w-7xl mb-8 sm:mb-12 text-left">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-2 sm:mb-4">Borrow Logs</h1>
        <p className={`text-sm sm:text-lg md:text-2xl uppercase tracking-[0.3em] font-black ${isDarkMode ? 'text-blue-100/40' : 'text-slate-400'}`}>
          Live Activity Feed
        </p>
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-10">
        <div className={`p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] flex justify-between items-center border transition-all ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40'}`}>
          <span className={`font-black uppercase tracking-[0.3em] text-[10px] sm:text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Currently Out</span>
          <span className="text-4xl sm:text-5xl font-bold text-[#3B82F6] tracking-tighter">{activeCount}</span>
        </div>
        <div className={`p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] flex justify-between items-center border transition-all ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40'}`}>
          <span className={`font-black uppercase tracking-[0.3em] text-[10px] sm:text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Recent Records</span>
          <span className="text-4xl sm:text-5xl font-bold tracking-tighter">{logs.length}</span>
        </div>
      </div>

      <div className={`w-full max-w-7xl border rounded-[2rem] sm:rounded-[3rem] overflow-hidden transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200 shadow-2xl shadow-slate-200/50'}`}>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[900px]">
            <thead className={isDarkMode ? 'bg-white/5 text-white/20' : 'bg-slate-50 text-slate-400'}>
              <tr className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em]">
                <th className="px-6 sm:px-8 py-6 sm:py-10 whitespace-nowrap">Borrower Info</th>
                <th className="px-6 sm:px-8 py-6 sm:py-10 whitespace-nowrap">Asset Name</th>
                <th className="px-6 sm:px-8 py-6 sm:py-10 whitespace-nowrap">Checked Out</th>
                <th className="px-6 sm:px-8 py-6 sm:py-10 text-center whitespace-nowrap">Status</th>
                <th className="px-6 sm:px-8 py-6 sm:py-10 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
              {loading ? (
                <tr><td colSpan="5" className="p-16 sm:p-32 text-center opacity-50 animate-pulse text-base sm:text-xl">Initializing Live Stream...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" className="p-16 sm:p-32 text-center opacity-50 text-base sm:text-xl">No borrowing activity recorded yet.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className={`transition-all ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}>

                    <td className="px-6 sm:px-8 py-6 sm:py-8 whitespace-nowrap">
                      <span className="text-xl sm:text-2xl font-bold block mb-1">{log.borrowerName || log.studentName}</span>
                      <span className={`text-[10px] sm:text-xs font-bold tracking-widest uppercase flex items-center gap-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                        {log.borrowerRole || 'Student'} • ID: {log.borrowerId || log.studentId}
                      </span>
                    </td>

                    <td className="px-6 sm:px-8 py-6 sm:py-8 text-lg sm:text-xl font-medium whitespace-nowrap">
                      {log.quantityBorrowed > 1 && <span className="font-bold text-[#3852A4] mr-2">{log.quantityBorrowed}x</span>}
                      {log.itemName}
                    </td>

                    <td className="px-6 sm:px-8 py-6 sm:py-8 whitespace-nowrap">
                      <span className={`block font-bold text-xs sm:text-sm mb-1 ${isDarkMode ? 'text-white/80' : 'text-slate-700'}`}>{formatLogDate(log)}</span>
                      <span className={`text-[10px] sm:text-xs font-bold tracking-widest uppercase ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>
                        Due: {log.expectedReturn || 'N/A'}
                      </span>
                    </td>

                    <td className="px-6 sm:px-8 py-6 sm:py-8 text-center whitespace-nowrap">
                      <span className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${
                        log.status === 'Active' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                        log.status === 'Returned' ? 'bg-slate-500/20 text-slate-400' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {log.status}
                      </span>
                    </td>

                    <td className="px-6 sm:px-8 py-6 sm:py-8 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-4">
                        {log.status === 'Active' ? (
                          <button
                            onClick={() => initiateReturn(log)} // FIXED: Pass the entire log object
                            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-sm tracking-widest uppercase transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-2 border
                              ${isDarkMode
                                ? 'bg-white/[0.05] border-white/10 text-white hover:bg-[#3852A4]/20'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50'
                              }`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Receive
                          </button>
                        ) : (
                          <div className={`text-[10px] sm:text-xs font-bold tracking-widest uppercase ${isDarkMode ? 'text-white/20' : 'text-slate-400'}`}>
                            Returned <br/> {log.dateReturned?.split(',')[0]}
                          </div>
                        )}

                        {/* SUBTLE DELETE BUTTON */}
                        <button
                          onClick={() => initiateDelete(log.id)}
                          className={`p-2 sm:p-3 rounded-xl transition-all opacity-30 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-400'}`}
                          title="Delete Log"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}