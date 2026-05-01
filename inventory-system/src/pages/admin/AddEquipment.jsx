import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, writeBatch, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebase.config';
import { useTheme } from '../../context/ThemeContext';
import { QRCodeSVG } from 'qrcode.react';

export default function AddEquipmentPage() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [quantity, setQuantity] = useState(1);
  const [trackingType, setTrackingType] = useState('individual');
  const [isLoading, setIsLoading] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', totalQuantity: 1 });

  const [toast, setToast] = useState({ show: false, message: '', type: 'default' });
  const [deleteModal, setDeleteModal] = useState({ show: false, itemId: null });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const EQUIPMENT_LIMIT = 200;

  const dropdownRef = useRef(null);
  const categories = ["Electronics", "Glassware", "Hardware", "Peripherals"];

  const showToast = (message, type = 'default') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'default' }), 3000);
  };

  const downloadQRCode = (id, fileName) => {
    const svg = document.getElementById(id);
    if (!svg) return;

    const svgClone = svg.cloneNode(true);
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgData = new XMLSerializer().serializeToString(svgClone);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const size = 2048;

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.download = `${fileName}_HD.png`;
        downloadLink.href = url;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      }, "image/png", 1.0);
    };

    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    img.src = URL.createObjectURL(svgBlob);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'equipment'), orderBy('dateAdded', 'desc'), limit(EQUIPMENT_LIMIT));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEquipmentList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      if (trackingType === 'bulk') {
        const docRef = doc(collection(db, 'equipment'));
        const assetTag = `BLK-${category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        batch.set(docRef, {
          name, category, assetTag, status: 'available', trackingType: 'bulk',
          totalQuantity: parseInt(quantity), availableQuantity: parseInt(quantity),
          dateAdded: serverTimestamp()
        });
      } else {
        for (let i = 0; i < quantity; i++) {
          const docRef = doc(collection(db, 'equipment'));
          const assetTag = `${category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
          batch.set(docRef, {
            name, category, assetTag, status: 'available', trackingType: 'individual', dateAdded: serverTimestamp()
          });
        }
      }
      await batch.commit();
      setExpandedGroups(prev => ({ ...prev, [name.trim().toLowerCase()]: true }));
      showToast(`Added ${quantity} item(s).`);
      setName(''); setQuantity(1);
    } catch (error) {
      console.error(error);
      showToast("Error adding equipment.", 'delete');
    } finally { setIsLoading(false); }
  };

  const confirmDelete = async () => {
    if (deleteModal.itemId) {
      try {
        await deleteDoc(doc(db, 'equipment', deleteModal.itemId));
        showToast("Asset permanently removed.", 'delete');
      } catch (error) {
        showToast("Error deleting asset.", 'delete');
      }
      finally { setDeleteModal({ show: false, itemId: null }); }
    }
  };

  const handleUpdate = async (item) => {
    try {
      const updateData = { name: editForm.name };

      if (item.trackingType === 'bulk') {
        const newTotal = parseInt(editForm.totalQuantity) || 1;
        const borrowedAmount = item.totalQuantity - item.availableQuantity;
        const newAvailable = Math.max(0, newTotal - borrowedAmount);

        updateData.totalQuantity = newTotal;
        updateData.availableQuantity = newAvailable;
        if (item.status !== 'maintenance') {
            updateData.status = newAvailable === 0 ? 'borrowed' : 'available';
        }
      }

      await updateDoc(doc(db, 'equipment', item.id), updateData);
      showToast("Asset updated.");
      setEditingId(null);
    } catch (error) {
      console.error("Update failed:", error);
      showToast("Update failed.", 'delete');
    }
  };

  const toggleMaintenance = async (item) => {
    try {
      const newStatus = item.status === 'maintenance' ? 'available' : 'maintenance';
      await updateDoc(doc(db, 'equipment', item.id), { status: newStatus });
      showToast(`Item marked as ${newStatus}.`);
    } catch (error) {
      console.error("Maintenance update failed:", error);
      showToast("Status update failed.", 'delete');
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const groupedInventory = Object.values(equipmentList.reduce((acc, item) => {
    const key = item.name.trim().toLowerCase();
    if (!acc[key]) {
      acc[key] = { key, name: item.name, category: item.category, items: [], availableCount: 0 };
    }
    acc[key].items.push(item);
    if (item.trackingType === 'bulk') {
      acc[key].availableCount += item.availableQuantity;
    } else if (item.status === 'available') {
      acc[key].availableCount++;
    }
    return acc;
  }, {}));

  const pageBg = isDarkMode ? 'bg-[#050B14] text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40';
  const inputBg = isDarkMode ? 'bg-black/40 border-white/10 placeholder:text-white/10' : 'bg-white border-slate-300 placeholder:text-slate-400 text-slate-900';
  const labelText = isDarkMode ? 'text-white/30' : 'text-slate-400';
  const subText = isDarkMode ? 'text-blue-100/40' : 'text-slate-400';
  const tableHead = isDarkMode ? 'bg-white/5 text-white/20' : 'bg-slate-50 text-slate-400';
  const assetText = isDarkMode ? 'text-white/40' : 'text-slate-400';
  const countText = isDarkMode ? 'text-white/30' : 'text-slate-400';
  const dropdownBg = isDarkMode ? 'bg-black/80 border-white/10' : 'bg-white border-slate-200 shadow-xl';
  const dropItem = isDarkMode ? 'text-white/60 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100';
  const dropActive = isDarkMode ? 'text-[#3B82F6] bg-[#3B82F6]/5' : 'text-[#3852A4] bg-[#3852A4]/5';
  const addBtn = isDarkMode ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800';
  const editInput = isDarkMode ? 'bg-white/10 text-white border-white/20 focus:border-[#3852A4]' : 'bg-slate-100 text-slate-900 border-slate-300 focus:border-[#3852A4]';
  const badgeAvailable = isDarkMode ? 'bg-[#3852A4]/20 text-blue-400' : 'bg-[#3852A4]/10 text-[#3852A4]';
  const badgeUnavailable = isDarkMode ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500';

  // Harmonized Badge Styling
  const getBadgeStyle = (status) => {
    if (status === 'available') return badgeAvailable;
    if (status === 'maintenance') return isDarkMode ? 'bg-white/10 text-white/60' : 'bg-slate-200 text-slate-600';
    return badgeUnavailable;
  };

  const getToastStyle = () => {
    if (toast.type === 'delete') {
      return isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600';
    }
    return isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-900 border-slate-800 text-white';
  };

  return (
    <div className={`min-h-screen w-full p-4 sm:p-6 md:p-12 lg:p-16 flex flex-col items-center overflow-y-auto relative transition-colors duration-500 ${pageBg}`} style={{ fontFamily: "ui-monospace, monospace" }}>

      <div className={`fixed bottom-4 sm:bottom-10 right-4 sm:right-10 z-[60] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl backdrop-blur-2xl border shadow-2xl transition-colors duration-300 flex items-center gap-3 ${getToastStyle()}`}>
          {toast.type === 'delete' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          )}
          <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] uppercase opacity-90">{toast.message}</span>
        </div>
      </div>

      {deleteModal.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setDeleteModal({ show: false, itemId: null })}></div>
          <div className={`relative w-full max-w-md p-6 sm:p-10 backdrop-blur-3xl border rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl text-center ${isDarkMode ? 'bg-gradient-to-br from-white/10 to-[#050B14] border-white/10' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Confirm Deletion</h3>
            <p className={`mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>This action is permanent.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={() => setDeleteModal({ show: false, itemId: null })} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl border transition-all font-bold cursor-pointer ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-bold cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/dashboard')} className={`self-start text-base sm:text-lg transition-all mb-8 sm:mb-12 flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
        <span className="text-xl sm:text-2xl">←</span> Back to Dashboard
      </button>

      <div className={`w-full max-w-6xl p-6 sm:p-8 md:p-12 backdrop-blur-3xl border rounded-[2rem] sm:rounded-[3rem] mb-10 sm:mb-16 shadow-2xl ${cardBg}`}>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2 sm:mb-4">Add Equipment</h1>
        <p className={`text-base sm:text-xl mb-8 sm:mb-12 ${subText}`}>Register and track new lab assets.</p>

        <form onSubmit={handleAddEquipment} className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-end">
          <div className="lg:col-span-12 flex flex-col sm:flex-row gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div onClick={() => setTrackingType('individual')} className={`flex-1 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border cursor-pointer transition-all ${trackingType === 'individual' ? `border-[#3852A4] shadow-[0_0_15px_rgba(56,82,164,0.15)] ${isDarkMode ? 'bg-[#3852A4]/10 text-blue-100' : 'bg-blue-50/50 text-[#3852A4]'}` : inputBg}`}>
              <h4 className="font-bold uppercase tracking-widest text-xs sm:text-sm mb-1">Individual Tracking</h4>
              <p className={`text-[9px] sm:text-[10px] uppercase tracking-widest ${trackingType === 'individual' ? 'opacity-80' : 'opacity-40'}`}>Unique QR code for every unit.</p>
            </div>
            <div onClick={() => setTrackingType('bulk')} className={`flex-1 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border cursor-pointer transition-all ${trackingType === 'bulk' ? `border-[#3852A4] shadow-[0_0_15px_rgba(56,82,164,0.15)] ${isDarkMode ? 'bg-[#3852A4]/10 text-blue-100' : 'bg-blue-50/50 text-[#3852A4]'}` : inputBg}`}>
              <h4 className="font-bold uppercase tracking-widest text-xs sm:text-sm mb-1">Bulk Tracking</h4>
              <p className={`text-[9px] sm:text-[10px] uppercase tracking-widest ${trackingType === 'bulk' ? 'opacity-80' : 'opacity-40'}`}>1 QR code for the entire quantity.</p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <label className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] mb-2 sm:mb-4 block ml-2 sm:ml-4 ${labelText}`}>Equipment Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={`w-full border rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-4 sm:py-6 text-base sm:text-xl focus:border-[#3852A4] transition-all outline-none ${inputBg}`} placeholder="e.g. Epson Projector X1" />
          </div>

          <div className="lg:col-span-3 relative" ref={dropdownRef}>
            <label className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] mb-2 sm:mb-4 block ml-2 sm:ml-4 ${labelText}`}>Category</label>
            <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`w-full border rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-4 sm:py-6 text-base sm:text-xl cursor-pointer transition-all flex justify-between items-center ${inputBg} ${isDropdownOpen ? 'border-[#3852A4] ring-1 ring-[#3852A4]/50' : ''}`}>
              <span>{category}</span>
              <svg width="16" height="16" sm:width="20" sm:height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-[#3852A4]' : 'text-slate-400'}`}><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {isDropdownOpen && (
              <div className={`absolute top-[calc(100%+8px)] sm:top-[calc(100%+10px)] left-0 w-full backdrop-blur-2xl border rounded-2xl sm:rounded-3xl overflow-hidden z-[80] shadow-2xl ${dropdownBg}`}>
                {categories.map((cat) => (
                  <div key={cat} onClick={() => { setCategory(cat); setIsDropdownOpen(false); }} className={`px-4 sm:px-8 py-3 sm:py-4 text-sm sm:text-lg cursor-pointer transition-all ${category === cat ? `font-bold ${dropActive}` : dropItem}`}>{cat}</div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] mb-2 sm:mb-4 block ml-2 sm:ml-4 ${labelText}`}>Quantity</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`w-full border rounded-2xl sm:rounded-3xl py-4 sm:py-6 text-base sm:text-xl text-center outline-none focus:border-[#3852A4] transition-all ${inputBg}`} />
          </div>

          <div className="lg:col-span-2">
            <button type="submit" disabled={isLoading} className={`w-full backdrop-blur-md border py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-bold text-base sm:text-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer ${addBtn}`}>
              {isLoading ? "..." : "Add"}
            </button>
          </div>
        </form>
      </div>

      <div className={`w-full max-w-6xl border rounded-[2rem] sm:rounded-[3rem] shadow-xl overflow-hidden ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className={`p-6 sm:p-10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Active Inventory</h2>
          <span className={`text-xs sm:text-sm font-bold uppercase tracking-widest ${countText}`}>{equipmentList.length} Visible Entries</span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] ${tableHead}`}>
                <th className="px-6 sm:px-10 py-6 sm:py-8 whitespace-nowrap">Asset Tag</th>
                <th className="px-6 sm:px-10 py-6 sm:py-8 whitespace-nowrap min-w-[250px]">Equipment Name & Details</th>
                <th className="px-6 sm:px-10 py-6 sm:py-8 text-center whitespace-nowrap">Status</th>
                <th className="px-6 sm:px-10 py-6 sm:py-8 text-center whitespace-nowrap">Checkout Tag</th>
                <th className="px-6 sm:px-10 py-6 sm:py-8 text-right whitespace-nowrap">Management</th>
              </tr>
            </thead>

            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
              {groupedInventory.map((group) => {
                if (group.items.length === 1) {
                  const item = group.items[0];
                  const isBulk = item.trackingType === 'bulk';
                  return (
                    <tr key={item.id} className={`transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 sm:px-10 py-6 sm:py-8 font-medium tracking-wider text-sm sm:text-base ${assetText}`}>{item.assetTag}</td>

                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-lg sm:text-xl font-bold">
                        {editingId === item.id ? (
                          <div className="flex flex-col gap-3">
                            <input
                              autoFocus
                              value={editForm.name}
                              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                              placeholder="Equipment Name"
                              className={`border outline-none px-3 sm:px-4 py-2 sm:py-2 rounded-lg sm:rounded-xl w-full text-base ${editInput}`}
                            />
                            {isBulk && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest opacity-50">Total Qty:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={editForm.totalQuantity}
                                  onChange={(e) => setEditForm({...editForm, totalQuantity: e.target.value})}
                                  className={`border outline-none px-3 py-1 rounded-lg w-24 text-sm ${editInput}`}
                                />
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleUpdate(item)} className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${isDarkMode ? 'bg-[#3852A4]/20 text-blue-400 hover:bg-[#3852A4]/30' : 'bg-[#3852A4]/10 text-[#3852A4] hover:bg-[#3852A4]/20'}`}>Save</button>
                              <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-500/10 px-4 py-1.5 rounded-full hover:bg-slate-500/20 transition-all">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          item.name
                        )}
                      </td>

                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-center whitespace-nowrap">
                        <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${getBadgeStyle(item.status)}`}>
                          {isBulk && item.status !== 'maintenance' ? `${item.availableQuantity} / ${item.totalQuantity} Available` : item.status}
                        </span>
                      </td>

                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-center">
                        <div className="bg-white p-2 rounded-lg sm:rounded-xl inline-block shadow-sm relative">
                          <QRCodeSVG id={`qr-${item.id}`} value={`${import.meta.env.VITE_APP_URL || window.location.origin}/borrow/${item.id}`} size={64} level={"H"} includeMargin={false} />
                          <div style={{position:'absolute',left:'-9999px',top:'-9999px'}}>
                            <QRCodeSVG id={`qr-dl-${item.id}`} value={`${import.meta.env.VITE_APP_URL || window.location.origin}/borrow/${item.id}`} size={512} level={"H"} includeMargin={true} />
                          </div>
                          {isBulk && <div className="absolute -top-2 -right-2 bg-[#3852A4] text-white text-[6px] sm:text-[8px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-lg">BULK</div>}
                        </div>
                        <div className="mt-2 flex flex-col items-center gap-1">
                           {/* TEST LINK COMMENTED OUT FOR REDEPLOYMENT[cite: 14] */}
                          {/*<a href={`/borrow/${item.id}`} target="_blank" rel="noreferrer" className="text-[8px] sm:text-[10px] font-bold text-blue-400 hover:underline uppercase tracking-widest cursor-pointer whitespace-nowrap">Test Link</a>*/}
                          <button onClick={() => downloadQRCode(`qr-dl-${item.id}`, `QR_${item.assetTag}`)} className="text-[8px] sm:text-[10px] font-bold text-[#3852A4] hover:underline uppercase tracking-widest cursor-pointer whitespace-nowrap">Download PNG</button>
                        </div>
                      </td>

                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-right space-x-4 sm:space-x-6 whitespace-nowrap">
                        <button onClick={() => { setEditingId(item.id); setEditForm({ name: item.name, totalQuantity: item.totalQuantity || 1 }); }} className="text-blue-400 hover:text-blue-300 font-bold text-xs sm:text-sm uppercase tracking-widest transition-all cursor-pointer">Edit</button>

                        {/* HARMONIZED MAINTENANCE BUTTON */}
                        {item.status !== 'borrowed' && (
                          <button
                            onClick={() => toggleMaintenance(item)}
                            className={`font-bold text-xs sm:text-sm uppercase tracking-widest transition-all cursor-pointer ${
                              item.status === 'maintenance'
                                ? 'text-[#3852A4] hover:text-blue-500'
                                : (isDarkMode ? 'text-white/30 hover:text-white/70' : 'text-slate-400 hover:text-slate-700')
                            }`}
                          >
                            {item.status === 'maintenance' ? 'Resolve' : 'Maintain'}
                          </button>
                        )}

                        <button onClick={() => setDeleteModal({ show: true, itemId: item.id })} className="text-red-500/60 hover:text-red-400 font-bold text-xs sm:text-sm uppercase tracking-widest transition-all cursor-pointer">Delete</button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <React.Fragment key={group.key}>
                    <tr onClick={() => toggleGroup(group.key)} className={`cursor-pointer transition-all ${isDarkMode ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-slate-100 hover:bg-slate-200'}`}>
                      <td className={`px-6 sm:px-10 py-4 sm:py-6 font-bold tracking-widest uppercase text-[10px] sm:text-xs opacity-60 ${assetText} whitespace-nowrap`}>{group.items.length} Units</td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-4 whitespace-nowrap">
                        <svg width="14" height="14" sm:width="18" sm:height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 text-[#3852A4] ${expandedGroups[group.key] ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"></polyline></svg>
                        {group.name}
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-center whitespace-nowrap"><span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${group.availableCount > 0 ? badgeAvailable : badgeUnavailable}`}>{group.availableCount} / {group.items.length} Available</span></td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-center whitespace-nowrap"><span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-30">Grouped</span></td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-right whitespace-nowrap"><span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest transition-all ${expandedGroups[group.key] ? 'text-[#3852A4]' : 'opacity-40'}`}>{expandedGroups[group.key] ? 'Close Folder' : 'Expand Folder'}</span></td>
                    </tr>

                    {expandedGroups[group.key] && group.items.map((item) => (
                      <tr key={item.id} className={`transition-all border-l-2 sm:border-l-4 border-l-[#3852A4] ${isDarkMode ? 'bg-black/30 hover:bg-black/50' : 'bg-slate-50/50 hover:bg-slate-50'}`}>
                        <td className={`px-6 sm:px-10 py-6 sm:py-8 font-medium tracking-wider pl-8 sm:pl-14 text-sm sm:text-base ${assetText} whitespace-nowrap`}><span className="opacity-30 mr-1 sm:mr-2">└─</span> {item.assetTag}</td>

                        <td className="px-6 sm:px-10 py-6 sm:py-8 text-base sm:text-lg font-medium opacity-80">
                          {editingId === item.id ? (
                            <div className="flex flex-col gap-3">
                              <input
                                autoFocus
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className={`border outline-none px-3 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl w-full text-base ${editInput}`}
                              />
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => handleUpdate(item)} className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${isDarkMode ? 'bg-[#3852A4]/20 text-blue-400 hover:bg-[#3852A4]/30' : 'bg-[#3852A4]/10 text-[#3852A4] hover:bg-[#3852A4]/20'}`}>Save</button>
                                <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-500/10 px-4 py-1.5 rounded-full hover:bg-slate-500/20 transition-all">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            item.name
                          )}
                        </td>

                        <td className="px-6 sm:px-10 py-6 sm:py-8 text-center whitespace-nowrap">
                          <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${getBadgeStyle(item.status)}`}>
                            {item.status}
                          </span>
                        </td>

                        <td className="px-6 sm:px-10 py-6 sm:py-8 text-center">
                          <div className="bg-white p-2 rounded-lg sm:rounded-xl inline-block shadow-sm relative">
                            <QRCodeSVG id={`qr-${item.id}`} value={`${import.meta.env.VITE_APP_URL || window.location.origin}/borrow/${item.id}`} size={48} sm:size={64} level={"H"} includeMargin={false} />
                            <div style={{position:'absolute',left:'-9999px',top:'-9999px'}}>
                              <QRCodeSVG id={`qr-dl-${item.id}`} value={`${import.meta.env.VITE_APP_URL || window.location.origin}/borrow/${item.id}`} size={512} level={"H"} includeMargin={true} />
                            </div>
                          </div>
                          <div className="mt-2 flex flex-col items-center gap-1">
                            <button onClick={() => downloadQRCode(`qr-dl-${item.id}`, `QR_${item.assetTag}`)} className="text-[8px] sm:text-[10px] font-bold text-[#3852A4] hover:underline uppercase tracking-widest cursor-pointer whitespace-nowrap">Download PNG</button>
                          </div>
                        </td>

                        <td className="px-6 sm:px-10 py-6 sm:py-8 text-right space-x-4 sm:space-x-6 whitespace-nowrap">
                          <button onClick={() => { setEditingId(item.id); setEditForm({ name: item.name, totalQuantity: item.totalQuantity || 1 }); }} className="text-blue-400 hover:text-blue-300 font-bold text-xs sm:text-sm uppercase tracking-widest transition-all cursor-pointer">Edit</button>

                          {/* HARMONIZED MAINTENANCE BUTTON */}
                          {item.status !== 'borrowed' && (
                            <button
                              onClick={() => toggleMaintenance(item)}
                              className={`font-bold text-xs sm:text-sm uppercase tracking-widest transition-all cursor-pointer ${
                                item.status === 'maintenance'
                                  ? 'text-[#3852A4] hover:text-blue-500'
                                  : (isDarkMode ? 'text-white/30 hover:text-white/70' : 'text-slate-400 hover:text-slate-700')
                              }`}
                            >
                              {item.status === 'maintenance' ? 'Resolve' : 'Maintain'}
                            </button>
                          )}

                          <button onClick={() => setDeleteModal({ show: true, itemId: item.id })} className="text-red-500/60 hover:text-red-400 font-bold text-xs sm:text-sm uppercase tracking-widest transition-all cursor-pointer">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}