import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase.config';

export default function AddEquipmentPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  // UI States: Toast and Modal
  const [toast, setToast] = useState({ show: false, message: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, itemId: null });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

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
      for (let i = 0; i < quantity; i++) {
        const assetTag = `${category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await addDoc(collection(db, 'equipment'), {
          name, category, assetTag, status: 'available', dateAdded: new Date().toISOString()
        });
      }
      showToast(`Added ${quantity} item(s).`);
      setName(''); setQuantity(1);
    } catch (error) { showToast("Error adding equipment."); }
    finally { setIsLoading(false); }
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

  return (
    <div className="min-h-screen w-full bg-[#050B14] text-white p-6 md:p-12 lg:p-16 flex flex-col items-center overflow-y-auto relative" style={{ fontFamily: "ui-monospace, monospace" }}>

      {/* --- MINIMAL TOAST (No Dot) --- */}
      <div className={`fixed bottom-10 right-10 z-[60] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/10 shadow-2xl">
          <span className="text-xs font-black tracking-[0.3em] uppercase text-white/80">{toast.message}</span>
        </div>
      </div>

      {/* --- SUBTLE DELETE MODAL --- */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModal({ show: false, itemId: null })}></div>
          <div className="relative w-full max-w-md p-10 bg-gradient-to-br from-white/10 to-[#050B14] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl text-center">
            <h3 className="text-2xl font-bold mb-4">Confirm Deletion</h3>
            <p className="text-white/50 mb-8 leading-relaxed">This action is permanent. Are you sure you want to remove this asset tag from the inventory?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteModal({ show: false, itemId: null })} className="flex-1 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-all font-bold">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Back Navigation[cite: 21] */}
      <button onClick={() => navigate('/dashboard')} className="self-start text-lg text-white/40 hover:text-white transition-all mb-12 flex items-center gap-2">
        <span className="text-2xl">←</span> Back to Dashboard
      </button>

      {/* Add Form Card[cite: 21, 22] */}
      <div className="w-full max-w-6xl p-12 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] mb-16 shadow-2xl">
        <h1 className="text-5xl font-bold tracking-tight mb-4">Add Equipment</h1>
        <p className="text-xl text-blue-100/40 mb-12">Register and track new lab assets.</p>

        <form onSubmit={handleAddEquipment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-5">
            <label className="text-xs font-bold text-white/30 uppercase tracking-[0.3em] mb-4 block">Equipment Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-3xl px-8 py-6 text-xl focus:border-[#3852A4] transition-all outline-none placeholder:text-white/10" placeholder="e.g. Epson Projector X1" />
          </div>

          <div className="lg:col-span-3 relative">
            <label className="text-xs font-bold text-white/30 uppercase tracking-[0.3em] mb-4 block">Category</label>
            <div className="relative">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-3xl px-8 py-6 text-xl appearance-none cursor-pointer focus:border-[#3852A4] outline-none transition-all">
                <option value="Electronics">Electronics</option>
                <option value="Glassware">Glassware</option>
                <option value="Hardware">Hardware</option>
                <option value="Peripherals">Peripherals</option>
              </select>
              <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-white/30 uppercase tracking-[0.3em] mb-4 block">Quantity</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-3xl py-6 text-xl text-center outline-none focus:border-[#3852A4] transition-all" />
          </div>

          <div className="lg:col-span-2">
            <button type="submit" disabled={isLoading} className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white py-6 rounded-3xl font-bold text-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer">
              {isLoading ? "..." : "Add"}
            </button>
          </div>
        </form>
      </div>

      {/* Inventory List Table[cite: 21, 22] */}
      <div className="w-full max-w-6xl bg-white/[0.02] border border-white/10 rounded-[3rem] overflow-hidden shadow-xl">
        <div className="p-10 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Active Inventory</h2>
          <span className="text-sm font-bold text-white/30 uppercase tracking-widest">{equipmentList.length} Total Items</span>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-bold text-white/20 uppercase tracking-[0.2em]">
              <th className="px-10 py-8">Asset Tag</th>
              <th className="px-10 py-8">Equipment Name</th>
              <th className="px-10 py-8 text-center">Status</th>
              <th className="px-10 py-8 text-right">Management</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {equipmentList.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.03] transition-all">
                <td className="px-10 py-8 text-white/40 font-medium tracking-wider">{item.assetTag}</td>
                <td className="px-10 py-8 text-xl font-bold">
                  {editingId === item.id ? (
                    <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={() => handleUpdate(item.id)} onKeyDown={(e) => e.key === 'Enter' && handleUpdate(item.id)} className="bg-white/10 border border-[#3852A4] outline-none px-4 py-2 rounded-xl w-full" />
                  ) : item.name}
                </td>
                <td className="px-10 py-8 text-center">
                  <span className="px-4 py-1.5 bg-green-500/10 text-green-400 rounded-full text-xs font-black uppercase tracking-tighter">{item.status}</span>
                </td>
                <td className="px-10 py-8 text-right space-x-6">
                  <button onClick={() => { setEditingId(item.id); setEditName(item.name); }} className="text-blue-400 hover:text-blue-300 font-bold text-sm uppercase tracking-widest transition-all">Edit</button>
                  <button onClick={() => setDeleteModal({ show: true, itemId: item.id })} className="text-red-500/60 hover:text-red-400 font-bold text-sm uppercase tracking-widest transition-all">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}