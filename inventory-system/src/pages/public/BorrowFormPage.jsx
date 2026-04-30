import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
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

  // NEW: State to track how many items the borrower wants (defaults to 1)
  const [borrowQuantity, setBorrowQuantity] = useState(1);

  const roleRef = useRef(null);
  const roles = ["Student", "Faculty", "Staff", "Other"];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

    // Validation checks
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

    // NEW: Prevent borrowing more than what is available
    if (equipment.trackingType === 'bulk' && borrowQuantity > equipment.availableQuantity) {
      alert(`Only ${equipment.availableQuantity} items available.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const finalRole = role === 'Other' ? formData.otherRole : role;

      // 1. Log the borrow request
      await addDoc(collection(db, 'logs'), {
        borrowerName: formData.fullName,
        borrowerId: role === 'Student' ? formData.idNumber : 'N/A',
        borrowerRole: finalRole,
        itemName: equipment.name,
        equipmentId: id,
        // Save the exact quantity requested (defaults to 1 if individual item)
        quantityBorrowed: equipment.trackingType === 'bulk' ? borrowQuantity : 1,
        dateBorrowed: new Date().toLocaleString(),
        expectedReturn: formData.returnDate.toLocaleDateString(),
        status: 'Active'
      });

      // 2. Update the equipment database logic based on tracking type
      if (equipment.trackingType === 'bulk') {
        const newAvailable = equipment.availableQuantity - borrowQuantity;
        await updateDoc(doc(db, 'equipment', id), {
          availableQuantity: newAvailable,
          // Auto-mark as borrowed if they take the very last unit
          status: newAvailable === 0 ? 'borrowed' : 'available'
        });
      } else {
        await updateDoc(doc(db, 'equipment', id), {
          status: 'borrowed'
        });
      }

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
      <div className={`min-h-screen w-full flex items-center justify-center ${pageBg}`} style={{ fontFamily: "ui-monospace, monospace" }}>
        <p className="animate-pulse font-bold tracking-widest uppercase text-sm">Locating Asset...</p>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center p-6 ${pageBg}`} style={{ fontFamily: "ui-monospace, monospace" }}>
        <div className={`w-full max-w-md p-10 text-center border rounded-[3rem] backdrop-blur-3xl ${cardBg}`}>
          <h1 className="text-3xl font-bold mb-4">Asset Not Found</h1>
          <p className="opacity-50">This QR code may be invalid or the item has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-6 transition-colors duration-500 ${pageBg}`} style={{ fontFamily: "ui-monospace, monospace" }}>

      <div className={`w-full max-w-xl p-8 md:p-12 border rounded-[3rem] backdrop-blur-3xl transition-all ${cardBg}`}>

        {success ? (
          <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 rounded-full bg-[#3852A4]/20 text-[#3852A4] flex items-center justify-center mb-8">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Checkout Confirmed</h2>
            <p className="opacity-50 leading-relaxed text-lg">Your request has been recorded. Please show this screen to the lab staff to receive your equipment.</p>
          </div>
        ) : (
          <>
            <div className="mb-10 text-center md:text-left">
              <p className="text-[#3852A4] font-black uppercase tracking-widest text-xs mb-2">Checkout Request</p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{equipment.name}</h1>
              <p className={`font-medium tracking-widest uppercase ${labelText}`}>Asset Tag: {equipment.assetTag}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              <div className="flex flex-col">
                <label className={`text-[10px] font-bold uppercase tracking-[0.3em] ml-6 mb-2 ${labelText}`}>Full Name</label>
                <input
                  required type="text" placeholder="e.g. Maria Santos"
                  className={`p-6 rounded-3xl border outline-none focus:border-[#3852A4] transition-all text-lg ${inputBg}`}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>

              {/* ROLE DROPDOWN */}
              <div className="flex flex-col relative" ref={roleRef}>
                <label className={`text-[10px] font-bold uppercase tracking-[0.3em] ml-6 mb-2 ${labelText}`}>Affiliation / Role</label>
                <div
                  onClick={() => setIsRoleOpen(!isRoleOpen)}
                  className={`w-full p-6 rounded-3xl border text-lg cursor-pointer flex justify-between items-center transition-all ${inputBg} ${isRoleOpen ? 'border-[#3852A4] ring-1 ring-[#3852A4]/50' : ''}`}
                >
                  <span className={role ? '' : 'opacity-40'}>{role || 'Select Affiliation...'}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isRoleOpen ? 'rotate-180 text-[#3852A4]' : 'opacity-40'}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>

                {isRoleOpen && (
                  <div className={`absolute top-[calc(100%+10px)] left-0 w-full border rounded-3xl overflow-hidden z-[80] shadow-2xl animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-black/90 backdrop-blur-2xl border-white/10' : 'bg-white border-slate-200'}`}>
                    {roles.map((r) => (
                      <div
                        key={r}
                        onClick={() => { setRole(r); setIsRoleOpen(false); }}
                        className={`px-8 py-5 text-lg cursor-pointer transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'} ${role === r ? 'text-[#3852A4] font-bold bg-[#3852A4]/5' : ''}`}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CONDITIONAL ID NUMBER (Only for Students) */}
              {role === 'Student' && (
                <div className="flex flex-col animate-in slide-in-from-top-2 fade-in duration-300">
                  <label className={`text-[10px] font-bold uppercase tracking-[0.3em] ml-6 mb-2 ${labelText}`}>Student ID Number</label>
                  <input
                    required type="text" placeholder="e.g. 2023-0142"
                    className={`p-6 rounded-3xl border outline-none focus:border-[#3852A4] transition-all text-lg ${inputBg}`}
                    onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                  />
                </div>
              )}

              {/* CONDITIONAL SPECIFY ROLE (Only for "Other") */}
              {role === 'Other' && (
                <div className="flex flex-col animate-in slide-in-from-top-2 fade-in duration-300">
                  <label className={`text-[10px] font-bold uppercase tracking-[0.3em] ml-6 mb-2 ${labelText}`}>Please Specify Role</label>
                  <input
                    required type="text" placeholder="e.g. Guest Researcher"
                    className={`p-6 rounded-3xl border outline-none focus:border-[#3852A4] transition-all text-lg ${inputBg}`}
                    onChange={(e) => setFormData({...formData, otherRole: e.target.value})}
                  />
                </div>
              )}

              {/* CONDITIONAL QUANTITY SELECTOR (Only shows for Bulk Items) */}
              {equipment.trackingType === 'bulk' && (
                <div className="flex flex-col animate-in slide-in-from-top-2 fade-in duration-300">
                  <div className="flex justify-between items-end mb-2 ml-6">
                    <label className={`text-[10px] font-bold uppercase tracking-[0.3em] ${labelText}`}>Quantity Needed</label>
                    <span className="text-[10px] font-bold text-[#3852A4] bg-[#3852A4]/10 px-3 py-1 rounded-full uppercase tracking-widest">
                      {equipment.availableQuantity} Available
                    </span>
                  </div>
                  <div className={`flex items-center justify-between p-2 rounded-3xl border transition-all ${inputBg}`}>
                    <button
                      type="button"
                      onClick={() => setBorrowQuantity(Math.max(1, borrowQuantity - 1))}
                      className={`w-14 h-14 rounded-2xl transition-all flex items-center justify-center font-bold text-2xl cursor-pointer ${isDarkMode ? 'bg-white/5 hover:bg-[#3852A4]/20 hover:text-blue-400' : 'bg-slate-500/10 hover:bg-[#3852A4]/10 hover:text-[#3852A4]'}`}
                    >
                      -
                    </button>

                    <span className="text-2xl font-bold">{borrowQuantity}</span>

                    <button
                      type="button"
                      onClick={() => setBorrowQuantity(Math.min(equipment.availableQuantity, borrowQuantity + 1))}
                      className={`w-14 h-14 rounded-2xl transition-all flex items-center justify-center font-bold text-2xl cursor-pointer ${isDarkMode ? 'bg-white/5 hover:bg-[#3852A4]/20 hover:text-blue-400' : 'bg-slate-500/10 hover:bg-[#3852A4]/10 hover:text-[#3852A4]'}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* RETURN DATE WITH SUBTLE ICON */}
              <div className="flex flex-col relative">
                <label className={`text-[10px] font-bold uppercase tracking-[0.3em] ml-6 mb-2 ${labelText}`}>Expected Return Date</label>
                <DatePicker
                  selected={formData.returnDate}
                  onChange={(date) => setFormData({...formData, returnDate: date})}
                  minDate={new Date()}
                  placeholderText="Select return date"
                  wrapperClassName="w-full"
                  dateFormat="MMMM d, yyyy"
                  className={`w-full p-6 rounded-3xl border outline-none transition-all text-lg cursor-pointer
                    ${formData.returnDate
                      ? `border-[#3852A4] font-bold shadow-[0_0_15px_rgba(56,82,164,0.15)] pr-14 ${isDarkMode ? 'bg-[#3852A4]/10 text-blue-100' : 'bg-blue-50/50 text-[#3852A4]'}`
                      : `focus:border-[#3852A4] pr-14 ${inputBg}`
                    }
                  `}
                />

                <div className={`absolute right-6 top-[calc(50%+10px)] -translate-y-1/2 pointer-events-none transition-all duration-300 ${formData.returnDate ? 'text-[#3852A4] scale-110' : 'opacity-30'}`}>
                  {formData.returnDate ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-in zoom-in">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  )}
                </div>
              </div>

              {equipment.status !== 'available' ? (
                <div className="mt-4 p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 text-center font-bold uppercase tracking-widest text-sm">
                  Item is currently out of stock
                </div>
              ) : (
                <button
                  type="submit" disabled={isSubmitting}
                  className={`mt-4 py-6 rounded-3xl font-bold text-xl transition-all shadow-lg active:scale-95 cursor-pointer ${isDarkMode ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white' : 'bg-slate-900 text-white border border-slate-900 hover:bg-slate-800'}`}
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