import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
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
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, itemId: null });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const categories = ["Electronics", "Glassware", "Hardware", "Peripherals"];

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // NEW: Download Helper Function
  const downloadQRCode = (id, fileName) => {
    const svg = document.getElementById(id);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Set size to 512px for high-quality print resolution
    const size = 512;

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${fileName}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
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
    const q = collection(db, 'equipment');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEquipmentList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (trackingType === 'bulk') {
        const assetTag = `BLK-${category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await addDoc(collection(db, 'equipment'), {
          name, category, assetTag, status: 'available', trackingType: 'bulk',
          totalQuantity: parseInt(quantity), availableQuantity: parseInt(quantity),
          dateAdded: new Date().toISOString()
        });
      } else {
        for (let i = 0; i < quantity; i++) {
          const assetTag = `${category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
          await addDoc(collection(db, 'equipment'), {
            name, category, assetTag, status: 'available', trackingType: 'individual', dateAdded: new Date().toISOString()
          });
        }
      }
      setExpandedGroups(prev => ({ ...prev, [name.trim().toLowerCase()]: true }));
      showToast(`Added ${quantity} item(s).`);
      setName(''); setQuantity(1);
    } catch (error) {
      console.error(error);
      showToast("Error adding equipment.");
    } finally { setIsLoading(false); }
  };

  const confirmDelete = async () => {
    if (deleteModal.itemId) {
      try {
        await deleteDoc(doc(db, 'equipment', deleteModal.itemId));
        showToast("Asset removed.");
      } catch (error) { showToast("Error deleting."); }
      finally { setDeleteModal({ show: false, itemId: null }); }
    }
  };

  const handleUpdate = async (id) => {
    try {
      await updateDoc(doc(db, 'equipment', id), { name: editName });
      showToast("Updated.");
      setEditingId(null);
    } catch (error) { showToast("Update failed."); }
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

  // Style Constants
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
  const editInput = isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900';
  const badgeAvailable = isDarkMode ? 'bg-[#3852A4]/20 text-blue-400' : 'bg-[#3852A4]/10 text-[#3852A4]';
  const badgeUnavailable = isDarkMode ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500';

  return (
    <div className={`min-h-screen w-full p-6 md:p-12 lg:p-16 flex flex-col items-center overflow-y-auto relative transition-colors duration-500 ${pageBg}`} style={{ fontFamily: "ui-monospace, monospace" }}>

      {/* Toast */}
      <div className={`fixed bottom-10 right-10 z-[60] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-8 py-4 rounded-2xl backdrop-blur-2xl border shadow-2xl ${isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
          <span className="text-xs font-black tracking-[0.3em] uppercase opacity-80">{toast.message}</span>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setDeleteModal({ show: false, itemId: null })}></div>
          <div className={`relative w-full max-w-md p-10 backdrop-blur-3xl border rounded-[2.5rem] shadow-2xl text-center ${isDarkMode ? 'bg-gradient-to-br from-white/10 to-[#050B14] border-white/10' : 'bg-white border-slate-200'}`}>
            <h3 className="text-2xl font-bold mb-4">Confirm Deletion</h3>
            <p className={`mb-8 leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>This action is permanent.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteModal({ show: false, itemId: null })} className={`flex-1 py-4 rounded-2xl border transition-all font-bold cursor-pointer ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-bold cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Dashboard */}
      <button onClick={() => navigate('/dashboard')} className={`self-start text-lg transition-all mb-12 flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
        <span className="text-2xl">←</span> Back to Dashboard
      </button>

      {/* Form Card */}
      <div className={`w-full max-w-6xl p-12 backdrop-blur-3xl border rounded-[3rem] mb-16 shadow-2xl ${cardBg}`}>
        <h1 className="text-5xl font-bold tracking-tight mb-4">Add Equipment</h1>
        <p className={`text-xl mb-12 ${subText}`}>Register and track new lab assets.</p>

        <form onSubmit={handleAddEquipment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-12 flex flex-col md:flex-row gap-4 mb-4">
            <div onClick={() => setTrackingType('individual')} className={`flex-1 p-6 rounded-3xl border cursor-pointer transition-all ${trackingType === 'individual' ? `border-[#3852A4] shadow-[0_0_15px_rgba(56,82,164,0.15)] ${isDarkMode ? 'bg-[#3852A4]/10 text-blue-100' : 'bg-blue-50/50 text-[#3852A4]'}` : inputBg}`}>
              <h4 className="font-bold uppercase tracking-widest text-sm mb-1">Individual Tracking</h4>
              <p className={`text-[10px] uppercase tracking-widest ${trackingType === 'individual' ? 'opacity-80' : 'opacity-40'}`}>Unique QR code for every unit.</p>
            </div>
            <div onClick={() => setTrackingType('bulk')} className={`flex-1 p-6 rounded-3xl border cursor-pointer transition-all ${trackingType === 'bulk' ? `border-[#3852A4] shadow-[0_0_15px_rgba(56,82,164,0.15)] ${isDarkMode ? 'bg-[#3852A4]/10 text-blue-100' : 'bg-blue-50/50 text-[#3852A4]'}` : inputBg}`}>
              <h4 className="font-bold uppercase tracking-widest text-sm mb-1">Bulk Tracking</h4>
              <p className={`text-[10px] uppercase tracking-widest ${trackingType === 'bulk' ? 'opacity-80' : 'opacity-40'}`}>1 QR code for the entire quantity.</p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <label className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-4 block ml-4 ${labelText}`}>Equipment Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={`w-full border rounded-3xl px-8 py-6 text-xl focus:border-[#3852A4] transition-all outline-none ${inputBg}`} placeholder="e.g. Epson Projector X1" />
          </div>

          <div className="lg:col-span-3 relative" ref={dropdownRef}>
            <label className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-4 block ml-4 ${labelText}`}>Category</label>
            <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`w-full border rounded-3xl px-8 py-6 text-xl cursor-pointer transition-all flex justify-between items-center ${inputBg} ${isDropdownOpen ? 'border-[#3852A4] ring-1 ring-[#3852A4]/50' : ''}`}>
              <span>{category}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-[#3852A4]' : 'text-slate-400'}`}><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {isDropdownOpen && (
              <div className={`absolute top-[calc(100%+10px)] left-0 w-full backdrop-blur-2xl border rounded-3xl overflow-hidden z-[80] shadow-2xl ${dropdownBg}`}>
                {categories.map((cat) => (
                  <div key={cat} onClick={() => { setCategory(cat); setIsDropdownOpen(false); }} className={`px-8 py-4 text-lg cursor-pointer transition-all ${category === cat ? `font-bold ${dropActive}` : dropItem}`}>{cat}</div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-4 block ml-4 ${labelText}`}>Quantity</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`w-full border rounded-3xl py-6 text-xl text-center outline-none focus:border-[#3852A4] transition-all ${inputBg}`} />
          </div>

          <div className="lg:col-span-2">
            <button type="submit" disabled={isLoading} className={`w-full backdrop-blur-md border py-6 rounded-3xl font-bold text-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer ${addBtn}`}>
              {isLoading ? "..." : "Add"}
            </button>
          </div>
        </form>
      </div>

      {/* Inventory Table */}
      <div className={`w-full max-w-6xl border rounded-[3rem] overflow-hidden shadow-xl ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className={`p-10 border-b flex justify-between items-center ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          <h2 className="text-2xl font-bold tracking-tight">Active Inventory</h2>
          <span className={`text-sm font-bold uppercase tracking-widest ${countText}`}>{equipmentList.length} Total Entries</span>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className={`text-xs font-bold uppercase tracking-[0.2em] ${tableHead}`}>
              <th className="px-10 py-8">Asset Tag</th>
              <th className="px-10 py-8">Equipment Name</th>
              <th className="px-10 py-8 text-center">Status</th>
              <th className="px-10 py-8 text-center">Checkout Tag</th>
              <th className="px-10 py-8 text-right">Management</th>
            </tr>
          </thead>

          <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
            {groupedInventory.map((group) => {
              if (group.items.length === 1) {
                const item = group.items[0];
                const isBulk = item.trackingType === 'bulk';
                return (
                  <tr key={item.id} className={`transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                    <td className={`px-10 py-8 font-medium tracking-wider ${assetText}`}>{item.assetTag}</td>
                    <td className="px-10 py-8 text-xl font-bold">{editingId === item.id ? <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={() => handleUpdate(item.id)} className={`border border-[#3852A4] outline-none px-4 py-2 rounded-xl w-full ${editInput}`} /> : item.name}</td>
                    <td className="px-10 py-8 text-center"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'available' ? badgeAvailable : badgeUnavailable}`}>{isBulk ? `${item.availableQuantity} / ${item.totalQuantity} Available` : item.status}</span></td>
                    <td className="px-10 py-8 text-center">
                      <div className="bg-white p-2 rounded-xl inline-block shadow-sm relative">
                        <QRCodeSVG id={`qr-${item.id}`} value={`${window.location.origin}/borrow/${item.id}`} size={64} level={"H"} includeMargin={false} />
                        {isBulk && <div className="absolute -top-2 -right-2 bg-[#3852A4] text-white text-[8px] font-bold px-2 py-1 rounded-full shadow-lg">BULK</div>}
                      </div>
                      <div className="mt-2 flex flex-col items-center gap-1">
                        <a href={`/borrow/${item.id}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-400 hover:underline uppercase tracking-widest cursor-pointer">Test Link</a>
                        <button onClick={() => downloadQRCode(`qr-${item.id}`, `QR_${item.assetTag}`)} className="text-[10px] font-bold text-[#3852A4] hover:underline uppercase tracking-widest cursor-pointer">Download PNG</button>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right space-x-6">
                      <button onClick={() => { setEditingId(item.id); setEditName(item.name); }} className="text-blue-400 hover:text-blue-300 font-bold text-sm uppercase tracking-widest transition-all cursor-pointer">Edit</button>
                      <button onClick={() => setDeleteModal({ show: true, itemId: item.id })} className="text-red-500/60 hover:text-red-400 font-bold text-sm uppercase tracking-widest transition-all cursor-pointer">Delete</button>
                    </td>
                  </tr>
                );
              }

              return (
                <React.Fragment key={group.key}>
                  <tr onClick={() => toggleGroup(group.key)} className={`cursor-pointer transition-all ${isDarkMode ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-slate-100 hover:bg-slate-200'}`}>
                    <td className={`px-10 py-6 font-bold tracking-widest uppercase text-xs opacity-60 ${assetText}`}>{group.items.length} Units</td>
                    <td className="px-10 py-6 text-xl font-bold flex items-center gap-4">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 text-[#3852A4] ${expandedGroups[group.key] ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"></polyline></svg>
                      {group.name}
                    </td>
                    <td className="px-10 py-6 text-center"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${group.availableCount > 0 ? badgeAvailable : badgeUnavailable}`}>{group.availableCount} / {group.items.length} Available</span></td>
                    <td className="px-10 py-6 text-center"><span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Grouped</span></td>
                    <td className="px-10 py-6 text-right"><span className={`text-[10px] font-bold uppercase tracking-widest transition-all ${expandedGroups[group.key] ? 'text-[#3852A4]' : 'opacity-40'}`}>{expandedGroups[group.key] ? 'Close Folder' : 'Expand Folder'}</span></td>
                  </tr>

                  {expandedGroups[group.key] && group.items.map((item) => (
                    <tr key={item.id} className={`transition-all border-l-4 border-l-[#3852A4] ${isDarkMode ? 'bg-black/30 hover:bg-black/50' : 'bg-slate-50/50 hover:bg-slate-50'}`}>
                      <td className={`px-10 py-8 font-medium tracking-wider pl-14 ${assetText}`}><span className="opacity-30 mr-2">└─</span> {item.assetTag}</td>
                      <td className="px-10 py-8 text-lg font-medium opacity-80">{editingId === item.id ? <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={() => handleUpdate(item.id)} className={`border border-[#3852A4] outline-none px-4 py-2 rounded-xl w-full ${editInput}`} /> : item.name}</td>
                      <td className="px-10 py-8 text-center"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'available' ? badgeAvailable : badgeUnavailable}`}>{item.status}</span></td>
                      <td className="px-10 py-8 text-center">
                        <div className="bg-white p-2 rounded-xl inline-block shadow-sm relative">
                          <QRCodeSVG id={`qr-${item.id}`} value={`${window.location.origin}/borrow/${item.id}`} size={64} level={"H"} includeMargin={false} />
                        </div>
                        <div className="mt-2 flex flex-col items-center gap-1">
                          <a href={`/borrow/${item.id}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-400 hover:underline uppercase tracking-widest cursor-pointer">Test Link</a>
                          <button onClick={() => downloadQRCode(`qr-${item.id}`, `QR_${item.assetTag}`)} className="text-[10px] font-bold text-[#3852A4] hover:underline uppercase tracking-widest cursor-pointer">Download PNG</button>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right space-x-6">
                        <button onClick={() => { setEditingId(item.id); setEditName(item.name); }} className="text-blue-400 hover:text-blue-300 font-bold text-sm uppercase tracking-widest transition-all cursor-pointer">Edit</button>
                        <button onClick={() => setDeleteModal({ show: true, itemId: item.id })} className="text-red-500/60 hover:text-red-400 font-bold text-sm uppercase tracking-widest transition-all cursor-pointer">Delete</button>
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
  );
}