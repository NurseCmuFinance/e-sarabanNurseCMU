
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">จัดการข้อมูลพื้นฐาน (Master Data)</h1>
                    <p className="text-slate-500">จัดการชุดข้อมูลที่ใช้ซ้ำในระบบให้เป็นระเบียบ</p>
                </div>
                <button 
                    onClick={() => { setEditingItem({}); setIsModalOpen(true); }}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 font-bold shadow-lg transition-all active:scale-95"
                >
                    <Plus size={20} /> เพิ่มข้อมูลใหม่
                </button>
            </div>

            <div className="flex gap-2 border-b overflow-x-auto whitespace-nowrap">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-4 flex items-center gap-2 border-b-2 font-bold transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <tab.icon size={18} /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ChevronRight size={14}/> {tabs.find(t => t.id === activeTab)?.desc}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">{items.length} รายการ</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-slate-500 font-bold border-b">
                            <tr>
                                <th className="px-6 py-4">ลำดับ</th>
                                <th className="px-6 py-4">ชื่อเรียก / ชื่อหน่วยงาน</th>
                                {activeTab === 'recipients' && <th className="px-6 py-4">ตำแหน่ง</th>}
                                <th className="px-6 py-4 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && !isModalOpen && !deleteConfirm ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={32} /></td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic font-bold">ไม่พบข้อมูลในหมวดหมู่นี้</td></tr>
                            ) : items.map((item, index) => (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{index + 1}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                                    {activeTab === 'recipients' && <td className="px-6 py-4 text-slate-500 font-medium">{item.position || '-'}</td>}
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="แก้ไข"><Edit2 size={16}/></button>
                                            <button onClick={() => setDeleteConfirm({ isOpen: true, id: item.id, name: item.name })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="ลบ"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{editingItem?.id ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">ชื่อเรียก / ชื่อหน่วยงาน *</label>
                                <input 
                                    type="text" required autoFocus className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all" 
                                    value={editingItem?.name || ''} 
                                    onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                                    placeholder="ระบุชื่อที่ต้องการ..."
                                />
                            </div>
                            {activeTab === 'recipients' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">ตำแหน่ง (ระบุเพื่อความชัดเจน)</label>
                                    <input 
                                        type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all" 
                                        value={editingItem?.position || ''} 
                                        onChange={e => setEditingItem({...editingItem, position: e.target.value})}
                                        placeholder="เช่น ปลัดองค์การบริหารส่วนตำบล..."
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-50">ยกเลิก</button>
                                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50">
                                    {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} บันทึกข้อมูล
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirm?.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32}/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการลบ</h3>
                            <p className="text-slate-500 text-sm mb-6 px-4">คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล <span className="text-red-600 font-bold">"{deleteConfirm.name}"</span> ออกจากระบบ?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-3 text-slate-500 font-bold border rounded-xl hover:bg-slate-50">ยกเลิก</button>
                                <button 
                                    onClick={handleDelete}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all active:scale-95"
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
