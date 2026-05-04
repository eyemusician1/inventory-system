import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase.config';
import { useTheme } from '../../context/ThemeContext';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function BorrowFormPage() {
  const { id } = useParams();
  const { isDarkMode } = useTheme();

  const [equipment, setEquipment] = useState(null);
  const [loadingEq, setLoadingEq] = useState(true);
  const [error, setError] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    idNumber: '',
    returnDate: null,
    otherRole: ''
  });

  const [role, setRole] = useState('');
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [borrowQuantity, setBorrowQuantity] = useState(1);

  const roleRef = useRef(null);
  const roles = ["Student", "Faculty", "Staff", "Other"];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmationTime, setConfirmationTime] = useState('');

  const [isViewOnly, setIsViewOnly] = useState(false);

  const dismissKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleRef.current && !roleRef.current.contains(event.target)) {
        setIsRoleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const docRef = doc(db, 'equipment', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEquipment(docSnap.data());
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoadingEq(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }
    if (!role) {
      alert("Please select your affiliation/role.");
      return;
    }
    if (role === 'Student' && !formData.idNumber.trim()) {
      alert("Please provide your Student ID Number.");
      return;
    }
    if (role === 'Other' && !formData.otherRole.trim()) {
      alert("Please specify your role.");
      return;
    }
    if (!formData.returnDate) {
      alert("Please select an expected return date.");
      return;
    }

    if (equipment.trackingType === 'bulk' && borrowQuantity > equipment.availableQuantity) {
      alert(`Only ${equipment.availableQuantity} items available.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const finalRole = role === 'Other' ? formData.otherRole : role;
      const now = new Date();
      const timestampString = now.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      await runTransaction(db, async (transaction) => {
        const eqRef = doc(db, 'equipment', id);
        const eqSnap = await transaction.get(eqRef);
        if (!eqSnap.exists()) {
          throw new Error('Equipment not found.');
        }

        const eqData = eqSnap.data();
        const isBulk = eqData.trackingType === 'bulk';
        const requestedQty = isBulk ? borrowQuantity : 1;

        if (eqData.status === 'maintenance') {
          throw new Error('Item is under maintenance.');
        }

        if (isBulk) {
          const availableQty = eqData.availableQuantity ?? 0;
          if (availableQty < requestedQty) {
            throw new Error('Not enough items available.');
          }
          const newAvailable = availableQty - requestedQty;
          transaction.update(eqRef, {
            availableQuantity: newAvailable,
            status: newAvailable === 0 ? 'borrowed' : 'available'
          });
        } else {
          if (eqData.status !== 'available') {
            throw new Error('Item is not available.');
          }
          transaction.update(eqRef, { status: 'borrowed' });
        }

        const logRef = doc(collection(db, 'logs'));
        transaction.set(logRef, {
          borrowerName: formData.fullName,
          borrowerId: role === 'Student' ? formData.idNumber : 'N/A',
          borrowerRole: finalRole,
          itemName: eqData.name,
          equipmentId: id,
          quantityBorrowed: requestedQty,
          dateBorrowedAt: serverTimestamp(),
          dateBorrowed: timestampString,
          expectedReturn: formData.returnDate.toLocaleDateString(),
          status: 'Active'
        });
      });

      setConfirmationTime(timestampString);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Error submitting request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageBg    = isDarkMode ? 'bg-[#050B14] text-white' : 'bg-slate-50 text-slate-900';
  const cardBg    = isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50';
  const inputBg   = isDarkMode ? 'bg-black/40 border-white/10 text-white placeholder:text-white/20'
                               : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400';
  const labelText = isDarkMode ? 'text-white/40' : 'text-slate-400';

  if (loadingEq) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center ${pageBg}`} style={{ fontFamily: "'Google Sans', 'Product Sans', 'Segoe UI', system-ui, sans-serif" }}>
        <p className="animate-pulse font-bold tracking-widest uppercase text-sm">Locating Asset...</p>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center p-4 sm:p-6 ${pageBg}`} style={{ fontFamily: "'Google Sans', 'Product Sans', 'Segoe UI', system-ui, sans-serif" }}>
        <div className={`w-full max-w-md p-8 sm:p-10 text-center border rounded-[2rem] sm:rounded-[3rem] backdrop-blur-3xl ${cardBg}`}>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Asset Not Found</h1>
          <p className="opacity-50 text-sm sm:text-base">This QR code may be invalid or the item has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 sm:p-6 transition-colors duration-500 ${pageBg}`} style={{ fontFamily: "'Google Sans', 'Product Sans', 'Segoe UI', system-ui, sans-serif" }}>

      <div className={`w-full max-w-xl p-6 sm:p-8 md:p-12 border rounded-[2rem] sm:rounded-[3rem] backdrop-blur-3xl transition-all ${cardBg}`}>

        {success ? (
          <div className="text-center py-4 sm:py-6 animate-in fade-in zoom-in duration-500">
            <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#3852A4]/20 text-[#3852A4] flex items-center justify-center mb-6 sm:mb-8">
              <svg width="32" height="32" sm:width="40" sm:height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">Checkout Confirmed</h2>
            <p className="opacity-50 leading-relaxed text-base sm:text-lg mb-8">Your request has been recorded. Please take a screenshot for your records.</p>

            <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-2 mb-8">
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}>Transaction Verified</span>
              <span className={`text-xs sm:text-sm font-bold tracking-widest ${isDarkMode ? 'text-blue-400/60' : 'text-[#3852A4]/60'}`}>
                {confirmationTime}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 sm:mb-10 text-center md:text-left">
              <p className={`font-black uppercase tracking-widest text-[10px] sm:text-xs mb-2 transition-colors ${isViewOnly ? 'text-slate-500' : 'text-[#3852A4]'}`}>
                {isViewOnly ? 'Receipt / Record' : 'Checkout Request'}
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2 break-words">{equipment.name}</h1>
              <p className={`font-medium tracking-widest uppercase text-xs sm:text-sm ${labelText}`}>Asset Tag: {equipment.assetTag}</p>
            </div>

            <form onSubmit={handleSubmit} className={`flex flex-col gap-5 sm:gap-6 transition-all duration-500 ${isViewOnly ? 'opacity-50 pointer-events-none grayscale' : ''}`}>

              <div className="flex flex-col">
                <label className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] ml-4 sm:ml-6 mb-2 ${labelText}`}>Full Name</label>
                <input
                  required type="text" placeholder="e.g. Maria Santos"
                  className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border outline-none focus:border-[#3852A4] transition-all text-base sm:text-lg ${inputBg}`}
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>

              <div className="flex flex-col relative" ref={roleRef}>
                <label className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] ml-4 sm:ml-6 mb-2 ${labelText}`}>Affiliation / Role</label>
                <div
                  onClick={() => setIsRoleOpen(!isRoleOpen)}
                  className={`w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl border text-base sm:text-lg cursor-pointer flex justify-between items-center transition-all ${inputBg} ${isRoleOpen ? 'border-[#3852A4] ring-1 ring-[#3852A4]/50' : ''}`}
                >
                  <span className={role ? '' : 'opacity-40'}>{role || 'Select Affiliation...'}</span>
                  <svg width="16" height="16" sm:width="20" sm:height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isRoleOpen ? 'rotate-180 text-[#3852A4]' : 'opacity-40'}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>

                {isRoleOpen && (
                  <div className={`absolute top-[calc(100%+10px)] left-0 w-full border rounded-2xl sm:rounded-3xl overflow-hidden z-[80] shadow-2xl animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-black/90 backdrop-blur-2xl border-white/10' : 'bg-white border-slate-200'}`}>
                    {roles.map((r) => (
                      <div
                        key={r}
                        onClick={() => { setRole(r); setIsRoleOpen(false); }}
                        className={`px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg cursor-pointer transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'} ${role === r ? 'text-[#3852A4] font-bold bg-[#3852A4]/5' : ''}`}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {role === 'Student' && (
                <div className="flex flex-col animate-in slide-in-from-top-2 fade-in duration-300">
                  <label className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] ml-4 sm:ml-6 mb-2 ${labelText}`}>Student ID Number</label>
                  <input
                    required type="text" placeholder="e.g. 202613213"
                    className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border outline-none focus:border-[#3852A4] transition-all text-base sm:text-lg ${inputBg}`}
                    value={formData.idNumber}
                    onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                  />
                </div>
              )}

              {role === 'Other' && (
                <div className="flex flex-col animate-in slide-in-from-top-2 fade-in duration-300">
                  <label className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] ml-4 sm:ml-6 mb-2 ${labelText}`}>Please Specify Role</label>
                  <input
                    required type="text" placeholder="e.g. Guest Researcher"
                    className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border outline-none focus:border-[#3852A4] transition-all text-base sm:text-lg ${inputBg}`}
                    value={formData.otherRole}
                    onChange={(e) => setFormData({...formData, otherRole: e.target.value})}
                  />
                </div>
              )}

              {equipment.trackingType === 'bulk' && (
                <div className="flex flex-col animate-in slide-in-from-top-2 fade-in duration-300">
                  <div className="flex justify-between items-end mb-2 ml-4 sm:ml-6">
                    <label className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] ${labelText}`}>Quantity Needed</label>
                    <span className="text-[9px] sm:text-[10px] font-bold text-[#3852A4] bg-[#3852A4]/10 px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest">
                      {equipment.availableQuantity} Available
                    </span>
                  </div>
                  <div className={`flex items-center justify-between p-2 rounded-2xl sm:rounded-3xl border transition-all ${inputBg}`}>
                    <button
                      type="button"
                      onClick={() => setBorrowQuantity(Math.max(1, borrowQuantity - 1))}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center font-bold text-xl sm:text-2xl cursor-pointer ${isDarkMode ? 'bg-white/5 hover:bg-[#3852A4]/20 hover:text-blue-400' : 'bg-slate-500/10 hover:bg-[#3852A4]/10 hover:text-[#3852A4]'}`}
                    >
                      -
                    </button>
                    <span className="text-xl sm:text-2xl font-bold">{borrowQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setBorrowQuantity(Math.min(equipment.availableQuantity, borrowQuantity + 1))}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center font-bold text-xl sm:text-2xl cursor-pointer ${isDarkMode ? 'bg-white/5 hover:bg-[#3852A4]/20 hover:text-blue-400' : 'bg-slate-500/10 hover:bg-[#3852A4]/10 hover:text-[#3852A4]'}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col relative">
                <label className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] ml-4 sm:ml-6 mb-2 ${labelText}`}>Expected Return Date</label>
                <DatePicker
                  selected={formData.returnDate}
                  onChange={(date) => { setFormData({...formData, returnDate: date}); dismissKeyboard(); }}
                  minDate={new Date()}
                  placeholderText="Select return date"
                  wrapperClassName="w-full"
                  dateFormat="MMMM d, yyyy"
                  className={`w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl border outline-none transition-all text-base sm:text-lg cursor-pointer
                    ${formData.returnDate
                      ? `border-[#3852A4] font-bold shadow-[0_0_15px_rgba(56,82,164,0.15)] pr-12 sm:pr-14 ${isDarkMode ? 'bg-[#3852A4]/10 text-blue-100' : 'bg-blue-50/50 text-[#3852A4]'}`
                      : `focus:border-[#3852A4] pr-12 sm:pr-14 ${inputBg}`
                    }
                  `}
                />
                <div className={`absolute right-4 sm:right-6 top-[calc(50%+10px)] -translate-y-1/2 pointer-events-none transition-all duration-300 ${formData.returnDate ? 'text-[#3852A4] scale-110' : 'opacity-30'}`}>
                  {formData.returnDate ? (
                    <svg width="20" height="20" sm:width="22" sm:height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-in zoom-in">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="20" height="20" sm:width="22" sm:height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  )}
                </div>
              </div>

              {/* Conditional Submit Button styling */}
              {isViewOnly ? (
                 <div className={`mt-2 sm:mt-4 p-4 sm:py-6 rounded-2xl sm:rounded-3xl border text-center font-bold uppercase tracking-widest text-xs sm:text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                   Transaction Completed
                 </div>
              ) : equipment.status === 'maintenance' ? (
                <div className={`mt-2 sm:mt-4 p-4 sm:py-6 rounded-2xl sm:rounded-3xl border text-center font-bold uppercase tracking-widest text-xs sm:text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                  Item is under maintenance
                </div>
              ) : equipment.status !== 'available' ? (
                <div className="mt-2 sm:mt-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 text-center font-bold uppercase tracking-widest text-xs sm:text-sm">
                  Item is currently out of stock
                </div>
              ) : (
                <button
                  type="submit" disabled={isSubmitting}
                  className={`mt-2 sm:mt-4 py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-bold text-lg sm:text-xl transition-all shadow-lg active:scale-95 cursor-pointer ${isDarkMode ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white' : 'bg-slate-900 text-white border border-slate-900 hover:bg-slate-800'}`}
                >
                  {isSubmitting ? "Processing..." : "Confirm Checkout"}
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}