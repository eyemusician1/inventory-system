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
  const [isLoading, setIsLoading] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', totalQuantity: 1 });

  const [toast, setToast] = useState({ show: false, message: '', type: 'default' });
  const [deleteModal, setDeleteModal] = useState({ show: false, itemId: null, itemIds: [], label: '' });

  const [trackingModal, setTrackingModal] = useState({ show: false });

  const [groupEditModal, setGroupEditModal] = useState({
    show: false,
    name: '',
    category: 'Electronics',
    trackingType: 'individual',
    quantity: 1,
    items: [],
  });
  const [isGroupActionLoading, setIsGroupActionLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalDropdownOpen, setIsModalDropdownOpen] = useState(false);

  const EQUIPMENT_LIMIT = 200;

  const dropdownRef = useRef(null);
  const modalDropdownRef = useRef(null);
  const categories = ["Electronics", "Glassware", "Hardware", "Peripherals"];

  const showToast = (message, type = 'default') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'default' }), 3000);
  };

  const normalizeQuantity = (value, fallback = 1) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  // NEW: Smart Heuristic Validation for College/Lab Equipment
  const validateEquipmentName = (itemName) => {
    const term = itemName.toLowerCase().trim();

    // Failsafe: Must have letters, not just numbers or symbols
    if (!/[a-zA-Z]/.test(term)) return false;

    // Semantic Blacklist: Prevents adding vehicles, household appliances, food, animals, etc.
    const blockedPattern = /\b(airplane|jet|helicopter|car|truck|boat|motorcycle|washing machine|laundry|dryer|dishwasher|refrigerator|fridge|freezer|oven|stove|microwave|toaster|blender|dog|cat|pet|weapon|gun|knife|sword|food|pizza|burger|apple|toy)\b/i;

    if (blockedPattern.test(term)) {
      return false;
    }

    return true;
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

  const closeDeleteModal = () => {
    setDeleteModal({ show: false, itemId: null, itemIds: [], label: '' });
  };

  const openGroupEditModal = (group) => {
    setGroupEditModal({
      show: true,
      name: group.name,
      category: group.category,
      trackingType: group.items[0]?.trackingType === 'bulk' ? 'bulk' : 'individual',
      quantity: group.items.length,
      items: group.items,
    });
  };

  const closeGroupEditModal = () => {
    setGroupEditModal({
      show: false,
      name: '',
      category: 'Electronics',
      trackingType: 'individual',
      quantity: 1,
      items: [],
    });
    setIsModalDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (modalDropdownRef.current && !modalDropdownRef.current.contains(event.target)) {
        setIsModalDropdownOpen(false);
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

  const handleAddSubmit = (e) => {
    e.preventDefault();

    // Trigger Semantic Validation Check
    if (!validateEquipmentName(name)) {
      showToast("This is not a valid equipment in lab.", 'delete');
      return;
    }

    setTrackingModal({ show: true });
  };

  const confirmAddEquipment = async (selectedTrackingType) => {
    setIsLoading(true);
    setTrackingModal({ show: false });

    try {
      const itemQuantity = normalizeQuantity(quantity);
      const batch = writeBatch(db);

      if (selectedTrackingType === 'bulk') {
        const docRef = doc(collection(db, 'equipment'));
        const assetTag = `BLK-${category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        batch.set(docRef, {
          name, category, assetTag, status: 'available', trackingType: 'bulk',
          totalQuantity: itemQuantity, availableQuantity: itemQuantity,
          dateAdded: serverTimestamp()
        });
      } else {
        for (let i = 0; i < itemQuantity; i++) {
          const docRef = doc(collection(db, 'equipment'));
          const assetTag = `${category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
          batch.set(docRef, {
            name, category, assetTag, status: 'available', trackingType: 'individual', dateAdded: serverTimestamp()
          });
        }
      }
      await batch.commit();
      setExpandedGroups(prev => ({ ...prev, [name.trim().toLowerCase()]: true }));
      showToast(`Added ${itemQuantity} item(s).`);
      setName(''); setQuantity(1);
    } catch (error) {
      console.error(error);
      showToast("Error adding equipment.", 'delete');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = async () => {
    const idsToDelete = deleteModal.itemIds?.length
      ? deleteModal.itemIds
      : deleteModal.itemId
        ? [deleteModal.itemId]
        : [];

    if (!idsToDelete.length) return;

    setIsGroupActionLoading(true);
    try {
      const batch = writeBatch(db);
      idsToDelete.forEach((id) => {
        batch.delete(doc(db, 'equipment', id));
      });
      await batch.commit();
      showToast(idsToDelete.length > 1 ? `${idsToDelete.length} items removed.` : "Asset permanently removed.", 'delete');
    } catch (error) {
      console.error(error);
      showToast("Error deleting asset.", 'delete');
    } finally {
      setIsGroupActionLoading(false);
      closeDeleteModal();
    }
  };

  const confirmGroupEdit = async () => {
    if (!groupEditModal.items.length) return;

    const trimmedName = groupEditModal.name.trim();
    if (!trimmedName) {
      showToast('Folder name is required.', 'delete');
      return;
    }

    setIsGroupActionLoading(true);
    try {
      const batch = writeBatch(db);
      const groupKey = trimmedName.toLowerCase();

      if (groupEditModal.trackingType === 'bulk') {
        const totalQuantity = normalizeQuantity(groupEditModal.quantity, groupEditModal.items.length);
        const availableQuantity = Math.min(
          totalQuantity,
          groupEditModal.items.reduce((count, item) => count + (item.status === 'available' ? 1 : 0), 0)
        );
        const keeper = groupEditModal.items[0];

        groupEditModal.items.slice(1).forEach((item) => {
          batch.delete(doc(db, 'equipment', item.id));
        });

        batch.update(doc(db, 'equipment', keeper.id), {
          name: trimmedName,
          category: groupEditModal.category,
          trackingType: 'bulk',
          totalQuantity,
          availableQuantity,
          status: availableQuantity === totalQuantity ? 'available' : 'borrowed',
        });

        setExpandedGroups((prev) => ({ ...prev, [groupKey]: true }));
      } else {
        groupEditModal.items.forEach((item) => {
          batch.update(doc(db, 'equipment', item.id), {
            name: trimmedName,
            category: groupEditModal.category,
          });
        });

        setExpandedGroups((prev) => ({ ...prev, [groupKey]: true }));
      }

      await batch.commit();
      showToast(groupEditModal.trackingType === 'bulk' ? 'Folder converted to bulk.' : 'Folder updated.');
      closeGroupEditModal();
    } catch (error) {
      console.error('Folder update failed:', error);
      showToast('Folder update failed.', 'delete');
    } finally {
      setIsGroupActionLoading(false);
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
  const dropdownBg = isDarkMode ? 'bg-black/80 border-white/10' : 'bg-white border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.12)]';
  const dropItem = isDarkMode ? 'text-white/70 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100/80';
  const dropActive = isDarkMode ? 'text-[#3B82F6] bg-[#3B82F6]/5' : 'text-[#2d3b73] bg-[#3852A4]/10';
  const addBtn = isDarkMode ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800';
  const editInput = isDarkMode ? 'bg-white/10 text-white border-white/20 focus:border-[#3852A4]' : 'bg-slate-100 text-slate-900 border-slate-300 focus:border-[#3852A4]';
  const badgeAvailable = isDarkMode ? 'bg-[#3852A4]/20 text-blue-400' : 'bg-[#3852A4]/10 text-[#3852A4]';
  const badgeUnavailable = isDarkMode ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500';

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

  const parsedQuantity = parseInt(quantity, 10);
  const suggestBulk = !isNaN(parsedQuantity) && parsedQuantity > 1;

  return (
    <div className={`min-h-screen w-full p-4 sm:p-6 md:p-12 lg:p-16 flex flex-col items-center overflow-y-auto relative transition-colors duration-500 ${pageBg}`} style={{ fontFamily: "'Google Sans', 'Product Sans', 'Segoe UI', system-ui, sans-serif" }}>

      <div className={`fixed bottom-4 sm:bottom-10 right-4 sm:right-10 z-[60] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl backdrop-blur-2xl border shadow-2xl transition-colors duration-300 flex items-center gap-3 ${getToastStyle()}`}>
          {toast.type === 'delete' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          )}
          <span className="text-xs sm:text-sm font-bold tracking-wide uppercase opacity-90">{toast.message}</span>
        </div>
      </div>

      {trackingModal.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setTrackingModal({ show: false })}></div>
          <div className={`relative w-full max-w-xl p-6 sm:p-10 backdrop-blur-3xl border rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-white/10 to-[#050B14] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl sm:text-2xl font-bold">Select Tracking Method</h3>
              <button onClick={() => setTrackingModal({ show: false })} className={`transition-all cursor-pointer ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
                <span className="material-icons-outlined text-2xl">close</span>
              </button>
            </div>

            <p className={`mb-8 text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
              How would you like to track the {quantity} unit(s) of <strong>{name}</strong>?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => confirmAddEquipment('individual')}
                className={`flex flex-col text-left p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer group ${!suggestBulk ? 'border-[#3852A4]/60 shadow-[0_0_20px_rgba(56,82,164,0.15)]' : 'hover:border-[#3852A4]/30'} ${inputBg}`}
              >
                <div className="flex justify-between items-start w-full mb-2">
                  <h4 className={`font-bold uppercase tracking-wide text-sm sm:text-base transition-colors ${!suggestBulk ? 'text-[#3852A4]' : 'group-hover:text-[#3852A4]'}`}>Individual</h4>
                  {!suggestBulk && <span className="text-[10px] font-bold bg-[#3852A4]/10 text-[#3852A4] px-2 py-1 rounded-full uppercase tracking-wide">Suggested</span>}
                </div>
                <p className={`text-xs sm:text-sm uppercase tracking-wide leading-relaxed ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Generates a unique QR code for every single unit.</p>
              </button>

              <button
                type="button"
                onClick={() => confirmAddEquipment('bulk')}
                className={`flex flex-col text-left p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer group ${suggestBulk ? 'border-[#3852A4]/60 shadow-[0_0_20px_rgba(56,82,164,0.15)]' : 'hover:border-[#3852A4]/30'} ${inputBg}`}
              >
                <div className="flex justify-between items-start w-full mb-2">
                  <h4 className={`font-bold uppercase tracking-wide text-sm sm:text-base transition-colors ${suggestBulk ? 'text-[#3852A4]' : 'group-hover:text-[#3852A4]'}`}>Bulk</h4>
                  {suggestBulk && <span className="text-[10px] font-bold bg-[#3852A4]/10 text-[#3852A4] px-2 py-1 rounded-full uppercase tracking-wide">Suggested</span>}
                </div>
                <p className={`text-xs sm:text-sm uppercase tracking-wide leading-relaxed ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Generates 1 single shared QR code for the entire quantity.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={closeDeleteModal}></div>
          <div className={`relative w-full max-w-md p-6 sm:p-10 backdrop-blur-3xl border rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl text-center ${isDarkMode ? 'bg-gradient-to-br from-white/10 to-[#050B14] border-white/10' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xl sm:text-2xl font-bold mb-4">{deleteModal.itemIds?.length > 1 ? 'Confirm Folder Deletion' : 'Confirm Deletion'}</h3>
            <p className={`mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
              {deleteModal.itemIds?.length > 1
                ? `This will permanently remove ${deleteModal.itemIds.length} item(s) from ${deleteModal.label || 'this folder'}.`
                : 'This action is permanent.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={closeDeleteModal} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl border transition-all font-bold cursor-pointer ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>Cancel</button>
              <button onClick={confirmDelete} disabled={isGroupActionLoading} className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-bold cursor-pointer disabled:opacity-50">{isGroupActionLoading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {groupEditModal.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={closeGroupEditModal}></div>
          <div className={`relative w-full max-w-xl p-6 sm:p-10 backdrop-blur-3xl border rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-white/10 to-[#050B14] border-white/10' : 'bg-white border-slate-200'}`}>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold">Edit Folder</h3>
                <p className={`mt-2 text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>{groupEditModal.items.length} item(s) will be updated together.</p>
              </div>
              <button onClick={closeGroupEditModal} className={`transition-all cursor-pointer ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
                 <span className="material-icons-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="grid gap-4 sm:gap-5">
              <div>
                <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide mb-2 sm:mb-3 block ml-2 ${labelText}`}>Folder Name</label>
                <input
                  type="text"
                  value={groupEditModal.name}
                  onChange={(e) => setGroupEditModal((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full border rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-4 sm:py-5 text-base sm:text-lg outline-none focus:border-[#3852A4] transition-all ${inputBg}`}
                  placeholder="Rename the whole folder"
                />
              </div>

              <div className="relative" ref={modalDropdownRef}>
                <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide mb-2 sm:mb-3 block ml-2 ${labelText}`}>Category</label>
                <div
                  onClick={() => setIsModalDropdownOpen(!isModalDropdownOpen)}
                  className={`w-full border rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-4 sm:py-5 text-base sm:text-lg cursor-pointer transition-all flex justify-between items-center ${inputBg} ${isModalDropdownOpen ? 'border-[#3852A4] ring-2 ring-[#3852A4]/15 shadow-[0_10px_30px_rgba(56,82,164,0.12)]' : ''}`}
                >
                  <span>{groupEditModal.category}</span>
                  <svg width="16" height="16" sm:width="20" sm:height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isModalDropdownOpen ? 'rotate-180 text-[#3852A4]' : 'text-slate-400'}`}><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {isModalDropdownOpen && (
                  <div className={`absolute top-[calc(100%+8px)] sm:top-[calc(100%+10px)] left-0 w-full border rounded-2xl sm:rounded-3xl overflow-hidden z-[80] shadow-2xl ${dropdownBg}`}>
                    {categories.map((cat) => (
                      <div
                        key={cat}
                        onClick={() => { setGroupEditModal(prev => ({ ...prev, category: cat })); setIsModalDropdownOpen(false); }}
                        className={`px-5 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-lg cursor-pointer transition-all ${groupEditModal.category === cat ? `font-semibold ${dropActive}` : dropItem}`}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide mb-2 sm:mb-3 block ml-2 ${labelText}`}>Folder Action</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGroupEditModal((prev) => ({ ...prev, trackingType: 'individual' }))}
                    className={`rounded-2xl sm:rounded-3xl border px-4 py-4 text-left cursor-pointer transition-all hover:border-[#3852A4]/50 ${groupEditModal.trackingType === 'individual' ? `border-[#3852A4] ${isDarkMode ? 'bg-[#3852A4]/10 text-blue-100' : 'bg-blue-50/70 text-[#3852A4]'}` : inputBg}`}
                  >
                    <div className={`font-bold uppercase tracking-wide text-sm sm:text-base transition-colors ${groupEditModal.trackingType === 'individual' ? 'text-[#3852A4]' : ''}`}>Keep as Individual</div>
                    <div className={`mt-1 text-xs sm:text-sm uppercase tracking-wide transition-opacity ${groupEditModal.trackingType === 'individual' ? 'opacity-80' : 'opacity-40'}`}>Update every item in the folder.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupEditModal((prev) => ({ ...prev, trackingType: 'bulk' }))}
                    className={`rounded-2xl sm:rounded-3xl border px-4 py-4 text-left cursor-pointer transition-all hover:border-[#3852A4]/50 ${groupEditModal.trackingType === 'bulk' ? `border-[#3852A4] ${isDarkMode ? 'bg-[#3852A4]/10 text-blue-100' : 'bg-blue-50/70 text-[#3852A4]'}` : inputBg}`}
                  >
                    <div className={`font-bold uppercase tracking-wide text-sm sm:text-base transition-colors ${groupEditModal.trackingType === 'bulk' ? 'text-[#3852A4]' : ''}`}>Convert to Bulk</div>
                    <div className={`mt-1 text-xs sm:text-sm uppercase tracking-wide transition-opacity ${groupEditModal.trackingType === 'bulk' ? 'opacity-80' : 'opacity-40'}`}>Collapse the folder into one bulk entry.</div>
                  </button>
                </div>
              </div>

              {groupEditModal.trackingType === 'bulk' && (
                <div>
                  <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide mb-2 sm:mb-3 block ml-2 ${labelText}`}>Bulk Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={groupEditModal.quantity}
                    onChange={(e) => setGroupEditModal((prev) => ({ ...prev, quantity: e.target.value }))}
                    className={`w-full border rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-4 sm:py-5 text-base sm:text-lg outline-none focus:border-[#3852A4] transition-all ${inputBg}`}
                    placeholder="Enter total quantity"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8">
              <button onClick={closeGroupEditModal} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl border transition-all font-bold cursor-pointer ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>Cancel</button>
              <button onClick={confirmGroupEdit} disabled={isGroupActionLoading} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl border transition-all font-bold cursor-pointer disabled:opacity-50 ${addBtn}`}>{isGroupActionLoading ? 'Saving...' : 'Save Folder'}</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/dashboard')} className={`self-start text-base sm:text-lg transition-all mb-8 sm:mb-12 flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
        <span className="text-xl sm:text-2xl">←</span> Back to Dashboard
      </button>

      <div className={`w-full max-w-6xl p-6 sm:p-8 md:p-12 backdrop-blur-3xl border rounded-[2rem] sm:rounded-[3rem] mb-10 sm:mb-16 shadow-2xl ${cardBg}`}>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-normal mb-2 sm:mb-4">Add Equipment</h1>
        <p className={`text-base sm:text-xl mb-8 sm:mb-12 ${subText}`}>Register and track new lab assets.</p>

        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-end">

          <div className="lg:col-span-5">
            <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide mb-2 sm:mb-4 block ml-2 sm:ml-4 ${labelText}`}>Equipment Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={`w-full border rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-4 sm:py-6 text-base sm:text-xl focus:border-[#3852A4] transition-all outline-none ${inputBg}`} placeholder="e.g. Epson Projector X1" />
          </div>

          <div className="lg:col-span-3 relative" ref={dropdownRef}>
            <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide mb-2 sm:mb-4 block ml-2 sm:ml-4 ${labelText}`}>Category</label>
            <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`w-full border rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-4 sm:py-6 text-base sm:text-xl cursor-pointer transition-all flex justify-between items-center ${inputBg} ${isDropdownOpen ? 'border-[#3852A4] ring-2 ring-[#3852A4]/15 shadow-[0_10px_30px_rgba(56,82,164,0.12)]' : ''}`}>
              <span>{category}</span>
              <svg width="16" height="16" sm:width="20" sm:height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-[#3852A4]' : 'text-slate-400'}`}><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {isDropdownOpen && (
              <div className={`absolute top-[calc(100%+8px)] sm:top-[calc(100%+10px)] left-0 w-full border rounded-2xl sm:rounded-3xl overflow-hidden z-[80] ${dropdownBg}`}>
                {categories.map((cat) => (
                  <div
                    key={cat}
                    onClick={() => { setCategory(cat); setIsDropdownOpen(false); }}
                    className={`px-5 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-lg cursor-pointer transition-all ${category === cat ? `font-semibold ${dropActive}` : dropItem}`}
                  >
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide mb-2 sm:mb-4 block ml-2 sm:ml-4 ${labelText}`}>Quantity</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`w-full border rounded-2xl sm:rounded-3xl py-4 sm:py-6 text-base sm:text-xl text-center outline-none focus:border-[#3852A4] transition-all ${inputBg}`} />
          </div>

          <div className="lg:col-span-2">
            <button type="submit" disabled={isLoading || !name.trim()} className={`w-full backdrop-blur-md border py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-bold text-base sm:text-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer ${addBtn}`}>
              {isLoading ? "..." : "Add"}
            </button>
          </div>
        </form>
      </div>

      <div className={`w-full max-w-6xl border rounded-[2rem] sm:rounded-[3rem] shadow-xl overflow-hidden ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className={`p-6 sm:p-10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          <h2 className="text-xl sm:text-2xl font-bold tracking-normal">Active Inventory</h2>
          <span className={`text-sm sm:text-base font-bold uppercase tracking-wide ${countText}`}>{equipmentList.length} Visible Entries</span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${tableHead}`}>
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
                      <td className={`px-6 sm:px-10 py-6 sm:py-8 font-medium text-sm sm:text-base ${assetText}`}>{item.assetTag}</td>

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
                                <span className="text-xs sm:text-sm uppercase tracking-wide opacity-50">Total Qty:</span>
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
                              <button onClick={() => handleUpdate(item)} className={`text-xs sm:text-sm font-bold uppercase tracking-wide px-4 py-1.5 rounded-full transition-all cursor-pointer ${isDarkMode ? 'bg-[#3852A4]/20 text-blue-400 hover:bg-[#3852A4]/30' : 'bg-[#3852A4]/10 text-[#3852A4] hover:bg-[#3852A4]/20'}`}>Save</button>
                              <button onClick={() => setEditingId(null)} className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide bg-slate-500/10 px-4 py-1.5 rounded-full hover:bg-slate-500/20 transition-all cursor-pointer">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          item.name
                        )}
                      </td>

                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-center whitespace-nowrap">
                        <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide ${getBadgeStyle(item.status)}`}>
                          {isBulk && item.status !== 'maintenance' ? `${item.availableQuantity} / ${item.totalQuantity} Available` : item.status}
                        </span>
                      </td>

                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-center">
                        <div className="bg-white p-2 rounded-lg sm:rounded-xl inline-block shadow-sm relative">
                          <QRCodeSVG id={`qr-${item.id}`} value={`${import.meta.env.VITE_APP_URL || window.location.origin}/borrow/${item.id}`} size={64} level={"H"} includeMargin={false} />
                          <div style={{position:'absolute',left:'-9999px',top:'-9999px'}}>
                            <QRCodeSVG id={`qr-dl-${item.id}`} value={`${import.meta.env.VITE_APP_URL || window.location.origin}/borrow/${item.id}`} size={512} level={"H"} includeMargin={true} />
                          </div>
                          {isBulk && <div className="absolute -top-2 -right-2 bg-[#3852A4] text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-lg">BULK</div>}
                        </div>
                        <div className="mt-2 flex flex-col items-center gap-1">
                          <button onClick={() => downloadQRCode(`qr-dl-${item.id}`, `QR_${item.assetTag}`)} className="text-[10px] sm:text-xs font-bold text-[#3852A4] hover:underline uppercase tracking-wide cursor-pointer whitespace-nowrap">Download PNG</button>
                        </div>
                      </td>

                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-right space-x-4 sm:space-x-6 whitespace-nowrap">
                        <button
                          onClick={() => { setEditingId(item.id); setEditForm({ name: item.name, totalQuantity: item.totalQuantity || 1 }); }}
                          className="text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <span className="material-icons-outlined text-base sm:text-lg" aria-hidden="true">edit</span>
                          <span className="sr-only">Edit</span>
                        </button>

                        {item.status !== 'borrowed' && (
                          <button
                            onClick={() => toggleMaintenance(item)}
                            className={`transition-all cursor-pointer ${
                              item.status === 'maintenance'
                                ? 'text-[#3852A4] hover:text-blue-500'
                                : (isDarkMode ? 'text-white/30 hover:text-white/70' : 'text-slate-400 hover:text-slate-700')
                            }`}
                            aria-label={item.status === 'maintenance' ? 'Resolve maintenance' : 'Mark for maintenance'}
                            title={item.status === 'maintenance' ? 'Resolve maintenance' : 'Mark for maintenance'}
                          >
                            <span className="material-icons-outlined text-base sm:text-lg" aria-hidden="true">
                              {item.status === 'maintenance' ? 'check_circle' : 'build'}
                            </span>
                            <span className="sr-only">{item.status === 'maintenance' ? 'Resolve' : 'Maintain'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteModal({ show: true, itemId: item.id })}
                          className="text-red-500/60 hover:text-red-400 transition-all cursor-pointer"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <span className="material-icons-outlined text-base sm:text-lg" aria-hidden="true">delete</span>
                          <span className="sr-only">Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <React.Fragment key={group.key}>
                    <tr className={`transition-all ${isDarkMode ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-slate-100 hover:bg-slate-200'}`}>
                      <td className={`px-6 sm:px-10 py-4 sm:py-6 font-bold uppercase tracking-wide text-xs sm:text-sm opacity-60 ${assetText} whitespace-nowrap`}>{group.items.length} Units</td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-lg sm:text-xl font-bold whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 sm:gap-4">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleGroup(group.key); }}
                            aria-label={expandedGroups[group.key] ? 'Collapse folder' : 'Expand folder'}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-slate-300 hover:bg-slate-200'}`}
                          >
                            <svg width="14" height="14" sm:width="18" sm:height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 text-[#3852A4] ${expandedGroups[group.key] ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"></polyline></svg>
                          </button>
                          <span>{group.name}</span>
                        </div>
                      </td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-center whitespace-nowrap"><span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide ${group.availableCount > 0 ? badgeAvailable : badgeUnavailable}`}>{group.availableCount} / {group.items.length} Available</span></td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-center whitespace-nowrap"><span className="text-xs sm:text-sm font-bold uppercase tracking-wide opacity-30">Grouped</span></td>
                      <td className="px-6 sm:px-10 py-4 sm:py-6 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openGroupEditModal(group); }}
                              className="text-[#3852A4] hover:text-blue-500 transition-all cursor-pointer"
                              aria-label="Edit folder"
                              title="Edit folder"
                            >
                              <span className="material-icons-outlined text-base sm:text-lg" aria-hidden="true">edit</span>
                              <span className="sr-only">Edit Folder</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModal({ show: true, itemId: null, itemIds: group.items.map((item) => item.id), label: group.name });
                              }}
                              className="text-red-500/70 hover:text-red-400 transition-all cursor-pointer"
                              aria-label="Delete folder"
                              title="Delete folder"
                            >
                              <span className="material-icons-outlined text-base sm:text-lg" aria-hidden="true">delete</span>
                              <span className="sr-only">Delete Folder</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {expandedGroups[group.key] && group.items.map((item) => (
                      <tr key={item.id} className={`transition-all border-l-2 sm:border-l-4 border-l-[#3852A4] ${isDarkMode ? 'bg-black/30 hover:bg-black/50' : 'bg-slate-50/50 hover:bg-slate-50'}`}>
                        <td className={`px-6 sm:px-10 py-6 sm:py-8 font-medium text-sm sm:text-base ${assetText} whitespace-nowrap`}><span className="opacity-30 mr-1 sm:mr-2">└─</span> {item.assetTag}</td>

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
                                <button onClick={() => handleUpdate(item)} className={`text-xs sm:text-sm font-bold uppercase tracking-wide px-4 py-1.5 rounded-full transition-all cursor-pointer ${isDarkMode ? 'bg-[#3852A4]/20 text-blue-400 hover:bg-[#3852A4]/30' : 'bg-[#3852A4]/10 text-[#3852A4] hover:bg-[#3852A4]/20'}`}>Save</button>
                                <button onClick={() => setEditingId(null)} className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide bg-slate-500/10 px-4 py-1.5 rounded-full hover:bg-slate-500/20 transition-all cursor-pointer">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            item.name
                          )}
                        </td>

                        <td className="px-6 sm:px-10 py-6 sm:py-8 text-center whitespace-nowrap">
                          <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide ${getBadgeStyle(item.status)}`}>
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
                            <button onClick={() => downloadQRCode(`qr-dl-${item.id}`, `QR_${item.assetTag}`)} className="text-[10px] sm:text-xs font-bold text-[#3852A4] hover:underline uppercase tracking-wide cursor-pointer whitespace-nowrap">Download PNG</button>
                          </div>
                        </td>

                        <td className="px-6 sm:px-10 py-6 sm:py-8 text-right space-x-4 sm:space-x-6 whitespace-nowrap">
                          <button
                            onClick={() => { setEditingId(item.id); setEditForm({ name: item.name, totalQuantity: item.totalQuantity || 1 }); }}
                            className="text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                            aria-label="Edit"
                            title="Edit"
                          >
                            <span className="material-icons-outlined text-base sm:text-lg" aria-hidden="true">edit</span>
                            <span className="sr-only">Edit</span>
                          </button>

                          {item.status !== 'borrowed' && (
                            <button
                              onClick={() => toggleMaintenance(item)}
                              className={`transition-all cursor-pointer ${
                                item.status === 'maintenance'
                                  ? 'text-[#3852A4] hover:text-blue-500'
                                  : (isDarkMode ? 'text-white/30 hover:text-white/70' : 'text-slate-400 hover:text-slate-700')
                              }`}
                              aria-label={item.status === 'maintenance' ? 'Resolve maintenance' : 'Mark for maintenance'}
                              title={item.status === 'maintenance' ? 'Resolve maintenance' : 'Mark for maintenance'}
                            >
                              <span className="material-icons-outlined text-base sm:text-lg" aria-hidden="true">
                                {item.status === 'maintenance' ? 'check_circle' : 'build'}
                              </span>
                              <span className="sr-only">{item.status === 'maintenance' ? 'Resolve' : 'Maintain'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteModal({ show: true, itemId: item.id })}
                            className="text-red-500/60 hover:text-red-400 transition-all cursor-pointer"
                            aria-label="Delete"
                            title="Delete"
                          >
                            <span className="material-icons-outlined text-base sm:text-lg" aria-hidden="true">delete</span>
                            <span className="sr-only">Delete</span>
                          </button>
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