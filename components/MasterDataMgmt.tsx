
import React, { useState, useEffect } from 'react';
import { getMasterItems, saveMasterItem, deleteMasterItem } from '../services/mockService';
import { MasterData } from '../types';
import { Plus, Trash2, Edit2, Database, UserCheck, Building, Layers, X, Save, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';

const MasterDataMgmt: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'recipients' | 'agencies' | 'departments'>('recipients');
    const [items, setItems] = useState<MasterData[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<MasterData> | null>(null);

    // Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getMasterItems(activeTab);
            setItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [activeTab]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem?.name) return;
        setLoading(true);
        try {
            await saveMasterItem(activeTab, editingItem);
            setIsModalOpen(false);
            await loadData();
        } catch (err: any) { 
            alert(err.message); 
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setLoading(true);
        try {
            await deleteMasterItem(activeTab, deleteConfirm.id);
            setDeleteConfirm(null);
            await loadData();
        } catch (err: any) { 
            alert(err.message); 
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'recipients', label: 'เรียน/เสนอ (ผู้รับ)', icon: UserCheck, desc: 'รายชื่อเจ้าหน้าที่ที่ใช้ในการเสนอหนังสือ' },
        { id: 'agencies', label: 'หน่วยงานภายนอก', icon: Building, desc: 'รายชื่อหน่วยงานต้นทางที่ส่งหนังสือเข้ามา' },
        { id: 'departments', label: 'แผนก/ส่วนงาน', icon: Layers, desc: 'แผนกภายในองค์กรสำหรับจัดกลุ่มผู้ใช้' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Database className="text-indigo-600 animate-float" size={28} />
                        จัดการข้อมูลพื้นฐาน (Master Data)
                    </h1>
                    <p className="text-stone-500 text-sm font-medium mt-1">จัดการชุดข้อมูลสำหรับใช้งานซ้ำภายในระบบสารบรรณพยาบาลให้มีความถูกต้องเป็นระเบียบ</p>
                </div>
                <button 
                    onClick={() => { setEditingItem({}); setIsModalOpen(true); }}
                    className="btn btn-primary shadow-lg shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 font-bold px-5.5 py-3 rounded-xl shrink-0"
                >
                    <Plus size={18} /> เพิ่มข้อมูลใหม่
                </button>
            </div>

            {/* Custom Premium Tabs Selector */}
            <div className="flex gap-2.5 border-b border-stone-200/60 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-5 py-3 flex items-center gap-2.5 rounded-xl font-bold transition-all duration-200 ${
                            activeTab === tab.id 
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200/40' 
                                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100/60'
                        }`}
                    >
                        <tab.icon size={18} className={activeTab === tab.id ? 'animate-pulse' : ''} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Glass Card Table Wrapper */}
            <div className="glass-card overflow-hidden">
                <div className="px-6 py-4.5 bg-stone-50/50 border-b border-stone-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                        <ChevronRight size={14} className="text-indigo-500"/> {tabs.find(t => t.id === activeTab)?.desc}
                    </span>
                    <span className="badge bg-indigo-50 text-indigo-700 font-bold border border-indigo-100/60 px-3 py-1.5">{items.length} รายการ</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="border-b border-stone-200/60 bg-stone-50/30 text-stone-500 font-bold">
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-20">ลำดับ</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">ชื่อเรียก / ชื่อหน่วยงาน</th>
                                {activeTab === 'recipients' && <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">ตำแหน่ง</th>}
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right w-32">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200/40">
                            {loading && !isModalOpen && !deleteConfirm ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                                            <span className="text-stone-400 font-bold text-xs">กำลังโหลดข้อมูล...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center text-stone-400 italic font-bold">
                                        ไม่พบข้อมูลในหมวดหมู่นี้
                                    </td>
                                </tr>
                            ) : items.map((item, index) => (
                                <tr key={item.id} className="hover:bg-indigo-50/20 transition-colors duration-150">
                                    <td className="px-6 py-4 text-stone-400 font-mono text-xs">{index + 1}</td>
                                    <td className="px-6 py-4 font-bold text-stone-800">{item.name}</td>
                                    {activeTab === 'recipients' && (
                                        <td className="px-6 py-4 text-stone-500 font-medium">
                                            <span className="px-2.5 py-1 bg-stone-100 rounded-lg text-xs font-semibold text-stone-600">
                                                {item.position || '-'}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-1.5">
                                            <button 
                                                onClick={() => { setEditingItem(item); setIsModalOpen(true); }} 
                                                className="btn btn-icon btn-sm btn-ghost hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                                title="แก้ไข"
                                            >
                                                <Edit2 size={15}/>
                                            </button>
                                            <button 
                                                onClick={() => setDeleteConfirm({ isOpen: true, id: item.id, name: item.name })} 
                                                className="btn btn-icon btn-sm btn-ghost hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                                                title="ลบ"
                                            >
                                                <Trash2 size={15}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Premium Glass Modal - Edit / Create */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-modal max-w-md w-full overflow-hidden animate-fade-in-scale border border-white/50">
                        <div className="px-6 py-5 border-b border-stone-200/60 flex justify-between items-center bg-stone-50/50">
                            <h3 className="font-bold text-lg text-stone-800 flex items-center gap-2">
                                <Database className="text-indigo-600" size={20} />
                                {editingItem?.id ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}
                            </h3>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-lg transition-colors"
                            >
                                <X size={20}/>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="modern-input-label px-1">ชื่อเรียก / ชื่อหน่วยงาน *</label>
                                <input 
                                    type="text" 
                                    required 
                                    autoFocus 
                                    className="modern-input font-semibold" 
                                    value={editingItem?.name || ''} 
                                    onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                                    placeholder="ระบุชื่อที่ต้องการ..."
                                />
                            </div>
                            {activeTab === 'recipients' && (
                                <div className="space-y-1.5">
                                    <label className="modern-input-label px-1">ตำแหน่ง (ระบุเพื่อความชัดเจน)</label>
                                    <input 
                                        type="text" 
                                        className="modern-input font-medium" 
                                        value={editingItem?.position || ''} 
                                        onChange={e => setEditingItem({...editingItem, position: e.target.value})}
                                        placeholder="เช่น หัวหน้าฝ่ายงานการพยาบาล..."
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-200/60">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="btn btn-ghost font-bold hover:bg-stone-100 text-stone-500"
                                >
                                    ยกเลิก
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="btn btn-success font-bold px-6 shadow-lg shadow-emerald-200/50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} บันทึกข้อมูล
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirm?.isOpen && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-modal max-w-sm w-full overflow-hidden animate-fade-in-scale border border-white/50">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                                <AlertTriangle className="animate-pulse" size={28}/>
                            </div>
                            <h3 className="text-lg font-bold text-stone-900 mb-1.5">ยืนยันการลบข้อมูล</h3>
                            <p className="text-stone-500 text-sm mb-6 px-2 leading-relaxed">
                                คุณแน่ใจหรือไม่ว่าต้องการลบ <span className="text-rose-600 font-bold">"{deleteConfirm.name}"</span> ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนคืนได้
                            </p>
                            <div className="flex gap-2.5">
                                <button 
                                    onClick={() => setDeleteConfirm(null)} 
                                    className="flex-1 btn btn-secondary font-bold text-stone-500 hover:bg-stone-100"
                                >
                                    ยกเลิก
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    className="flex-1 btn btn-danger font-bold shadow-lg shadow-rose-200/50"
                                >
                                    {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'ยืนยันลบ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterDataMgmt;
