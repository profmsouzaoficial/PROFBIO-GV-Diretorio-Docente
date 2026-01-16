import React, { useState, useEffect, useRef } from 'react';
import { Professor, Dissertation, Product, ProductType } from '../types';
import { EditIcon, XIcon, MailIcon, LinkIcon, CameraIcon, BookOpenIcon, FileTextIcon, MicIcon, KeyIcon } from './icons';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';

interface EditProfileProps {
    professor: Professor | undefined;
    onNavigate: (page: string) => void;
    onRefresh: () => void;
}

const RESEARCH_LINES = [
    "Comunicação, Enisno e Aprendizagem em Biologia",
    "Organização e funcionamento dos organismos",
    "Origem da vida, evolução, ecologia e Biodiversidade"
];

const PRODUCT_TYPES: ProductType[] = [
    'Artigo', 'Conjunto de Dados', 'Repositório', 'Apresentação', 
    'Aplicativo', 'Livro', 'Revista em Quadrinhos', 'Jogo Digital', 
    'Sequência Didática', 'Automação de Processos Pedagógicos', 'Outro'
];

const CheckIcon = () => (
    <svg className="w-5 h-5 text-green-600 animate-in zoom-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
);

const TrashIcon = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const EditProfile: React.FC<EditProfileProps> = ({ professor, onNavigate, onRefresh }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const podcastInputRef = useRef<HTMLInputElement>(null);
    
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pdfUploading, setPdfUploading] = useState(false);
    const [podcastUploading, setPodcastUploading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', title: '', mini_bio: '', public_email: '', 
        lattes_url: '', photo_url: '', lines_of_research: [] as string[]
    });

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);

    const [dissertations, setDissertations] = useState<Dissertation[]>([]);
    const [editingDissertation, setEditingDissertation] = useState<Partial<Dissertation> | null>(null);
    const [isDissertationModalOpen, setIsDissertationModalOpen] = useState(false);
    const [dissertationLoading, setDissertationLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({
        isOpen: false,
        id: null
    });

    useEffect(() => {
        if (professor) {
            setFormData({
                name: professor.name || '',
                title: professor.title || '',
                mini_bio: professor.mini_bio || '',
                public_email: professor.public_email || '',
                lattes_url: professor.lattes_url || '',
                photo_url: professor.photo_url || '',
                lines_of_research: professor.lines_of_research || []
            });
            setDissertations(professor.dissertations || []);
        }
    }, [professor]);

    const formatError = (err: any, bucketName?: string): string => {
        console.error("Erro original:", err);
        return err?.message || String(err);
    };

    const handleFileUpload = async (file: File, bucket: string) => {
        if (!professor) return null;
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${professor.user_id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
            return publicUrl;
        } catch (err: any) {
            throw err;
        }
    };

    const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const url = await handleFileUpload(file, 'avatars');
            if (url) setFormData(prev => ({ ...prev, photo_url: url }));
            setMessage({ type: 'success', text: 'Foto atualizada com sucesso!' });
        } catch (error: any) {
            alert('Erro na foto: ' + formatError(error, 'avatars'));
        } finally {
            setUploading(false);
        }
    };

    const handlePdfFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !editingDissertation) return;
        try {
            setPdfUploading(true);
            const url = await handleFileUpload(file, 'pdfs');
            if (url) setEditingDissertation(prev => ({ ...prev!, pdf_url: url }));
        } catch (error: any) {
            alert('Erro no PDF: ' + formatError(error, 'pdfs'));
        } finally {
            setPdfUploading(false);
        }
    };

    const handlePodcastFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !editingDissertation) return;
        try {
            setPodcastUploading(true);
            const url = await handleFileUpload(file, 'podcasts');
            if (url) setEditingDissertation(prev => ({ ...prev!, podcast_url: url }));
        } catch (error: any) {
            alert('Erro no áudio: ' + formatError(error, 'podcasts'));
        } finally {
            setPodcastUploading(false);
        }
    };

    const handleSaveBasicInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!professor) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('professors').update({
                name: formData.name,
                title: formData.title,
                mini_bio: formData.mini_bio,
                public_email: formData.public_email,
                lattes_url: formData.lattes_url,
                photo_url: formData.photo_url,
                lines_of_research: formData.lines_of_research,
                updated_at: new Date().toISOString()
            }).eq('user_id', professor.user_id);
            if (error) throw error;
            setMessage({ type: 'success', text: 'Dados do perfil atualizados!' });
            onRefresh();
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Erro ao salvar perfil: ' + formatError(err) });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }
        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Erro ao alterar senha: ' + formatError(err) });
        } finally {
            setPasswordLoading(false);
        }
    };

    const openDissertationModal = (diss?: Dissertation) => {
        if (diss) {
            setEditingDissertation({ ...diss });
        } else {
            setEditingDissertation({
                professor_id: professor?.id,
                title: '', student_name: '', year: new Date().getFullYear(),
                status: 'concluded', advisor_role: 'orientador', summary: '', products: []
            });
        }
        setIsDissertationModalOpen(true);
    };

    const handleAddProduct = () => {
        const products = [...(editingDissertation?.products || [])];
        products.push({ id: Math.random(), title: '', type: 'Artigo', url: '' } as any);
        setEditingDissertation({ ...editingDissertation!, products });
    };

    const handleRemoveProduct = (index: number) => {
        const products = [...(editingDissertation?.products || [])];
        products.splice(index, 1);
        setEditingDissertation({ ...editingDissertation!, products });
    };

    const handleUpdateProduct = (index: number, field: keyof Product, value: string) => {
        const products = [...(editingDissertation?.products || [])];
        products[index] = { ...products[index], [field]: value };
        setEditingDissertation({ ...editingDissertation!, products });
    };

    const handleSaveDissertation = async () => {
        if (!editingDissertation || !professor) return;
        if (!editingDissertation.title?.trim() || !editingDissertation.student_name?.trim()) {
            alert("Preencha o Título e o Nome do Aluno.");
            return;
        }

        setDissertationLoading(true);
        try {
            const isNew = !editingDissertation.id;
            const dissData = {
                professor_id: professor.id,
                title: editingDissertation.title,
                student_name: editingDissertation.student_name,
                year: editingDissertation.year,
                status: editingDissertation.status,
                advisor_role: editingDissertation.advisor_role,
                pdf_url: editingDissertation.pdf_url,
                summary: editingDissertation.summary,
                podcast_url: editingDissertation.podcast_url,
                updated_at: new Date().toISOString()
            };

            let currentDissId = editingDissertation.id;
            if (isNew) {
                const { data, error } = await supabase.from('dissertations').insert(dissData).select().single();
                if (error) throw error;
                currentDissId = data.id;
            } else {
                const { error } = await supabase.from('dissertations').update(dissData).eq('id', currentDissId);
                if (error) throw error;
            }

            // Salvar Produtos
            await supabase.from('products').delete().eq('dissertation_id', currentDissId);
            const validProducts = (editingDissertation.products || []).filter(p => p.title.trim() && p.url.trim());
            if (validProducts.length > 0) {
                const productsToInsert = validProducts.map(p => ({
                    dissertation_id: currentDissId,
                    title: p.title,
                    type: p.type,
                    url: p.url
                }));
                const { error: prodError } = await supabase.from('products').insert(productsToInsert);
                if (prodError) throw prodError;
            }

            setMessage({ type: 'success', text: 'Orientação salva com sucesso!' });
            setIsDissertationModalOpen(false);
            onRefresh();
        } catch (err: any) {
            alert("Erro ao salvar: " + formatError(err));
        } finally {
            setDissertationLoading(false);
        }
    };

    const handleDeleteDissertation = async () => {
        if (!confirmDelete.id) return;
        try {
            const { error } = await supabase.from('dissertations').delete().eq('id', confirmDelete.id);
            if (error) throw error;
            setMessage({ type: 'success', text: 'Orientação excluída.' });
            onRefresh();
        } catch (e) { alert(formatError(e)); }
        finally { setConfirmDelete({ isOpen: false, id: null }); }
    };

    if (!professor) return null;

    const inputClasses = "w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#39A3B0] outline-none transition-all";
    const labelClasses = "block text-sm font-bold text-gray-700 mb-2";

    return (
        <div className="flex-grow bg-gray-50/50 p-4 sm:p-6 overflow-y-auto scroll-container">
            <div className="max-w-4xl mx-auto space-y-8 pb-12">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#034C83] flex items-center gap-2">
                        <EditIcon className="w-6 h-6"/> Painel do Docente
                    </h1>
                    <button onClick={() => onNavigate('home')} className="p-2 rounded-full hover:bg-gray-200 text-gray-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-[#034C83] mb-6 pb-2 border-b border-gray-100">Meu Perfil</h2>
                    <form onSubmit={handleSaveBasicInfo} className="space-y-6">
                        <div className="flex flex-col items-center gap-4 py-4 mb-6">
                            <div className="relative">
                                <img src={formData.photo_url || `https://ui-avatars.com/api/?name=${formData.name}&background=034C83&color=fff`} className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 shadow-md" alt="Foto" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 p-2.5 bg-[#39A3B0] text-white rounded-full shadow-lg hover:scale-110 disabled:opacity-50">
                                    {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CameraIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>Nome Completo</label>
                                <input type="text" className={inputClasses} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </div>
                            <div>
                                <label className={labelClasses}>Título / Função</label>
                                <input type="text" className={inputClasses} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                            </div>
                        </div>

                        <div>
                            <label className={labelClasses}>Minibiografia</label>
                            <textarea className={`${inputClasses} h-28 resize-none`} value={formData.mini_bio} onChange={e => setFormData({...formData, mini_bio: e.target.value})} required />
                        </div>

                        <div>
                            <label className={labelClasses}>Linhas de Pesquisa</label>
                            <div className="space-y-3 mt-3">
                                {RESEARCH_LINES.map(line => (
                                    <label key={line} className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${formData.lines_of_research.includes(line) ? 'border-[#034C83] bg-[#034C83]/5' : 'border-gray-200'}`}>
                                        <input type="checkbox" className="mt-1 w-5 h-5 rounded text-[#034C83] focus:ring-[#39A3B0]" checked={formData.lines_of_research.includes(line)} onChange={() => {
                                            const lines = formData.lines_of_research.includes(line) ? formData.lines_of_research.filter(l => l !== line) : [...formData.lines_of_research, line];
                                            setFormData({...formData, lines_of_research: lines});
                                        }} />
                                        <span className={`text-sm font-semibold ${formData.lines_of_research.includes(line) ? 'text-[#034C83]' : 'text-gray-600'}`}>{line}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>E-mail de Contato</label>
                                <input type="email" className={inputClasses} value={formData.public_email} onChange={e => setFormData({...formData, public_email: e.target.value})} required />
                            </div>
                            <div>
                                <label className={labelClasses}>URL do Lattes</label>
                                <input type="url" className={inputClasses} value={formData.lattes_url} onChange={e => setFormData({...formData, lattes_url: e.target.value})} />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-4 bg-[#034C83] text-white font-bold rounded-xl hover:bg-[#023b66] transition-all shadow-md">
                            {loading ? 'Salvando...' : 'Salvar Alterações do Perfil'}
                        </button>
                    </form>
                </section>

                <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-100">
                        <KeyIcon className="w-5 h-5 text-[#034C83]"/>
                        <h2 className="text-xl font-bold text-[#034C83]">Segurança</h2>
                    </div>
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="password" className={inputClasses} placeholder="Nova Senha" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} required />
                            <input type="password" className={inputClasses} placeholder="Confirmar Nova Senha" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} required />
                        </div>
                        <button type="submit" disabled={passwordLoading} className="px-8 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-black transition-all text-sm">
                            {passwordLoading ? 'Atualizando...' : 'Alterar Senha'}
                        </button>
                    </form>
                </section>

                <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-[#034C83]">Orientações</h2>
                        <button onClick={() => openDissertationModal()} className="px-5 py-2.5 bg-[#39A3B0] text-white text-sm font-bold rounded-lg hover:bg-[#2c8b96]">
                            + Nova Orientação
                        </button>
                    </div>
                    <div className="space-y-4">
                        {dissertations.map(diss => (
                            <div key={diss.id} className="p-5 border border-gray-200 rounded-xl flex justify-between items-center group hover:border-[#39A3B0] transition-colors">
                                <div className="min-w-0 flex-grow pr-4">
                                    <h4 className="font-bold text-[#034C83] truncate">{diss.title}</h4>
                                    <div className="text-xs text-gray-500 mt-1">{diss.student_name} | {diss.year} | {diss.status === 'concluded' ? 'Concluída' : 'Em Andamento'}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openDissertationModal(diss)} className="p-2 text-[#034C83] hover:bg-blue-50 rounded-lg"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => setConfirmDelete({ isOpen: true, id: diss.id })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><XIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {message && (
                    <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl text-sm font-bold border flex items-center gap-3 animate-in slide-in-from-right-10 z-50 ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        <span>{message.text}</span>
                        <button onClick={() => setMessage(null)}>✕</button>
                    </div>
                )}
            </div>

            <Modal isOpen={isDissertationModalOpen} onClose={() => setIsDissertationModalOpen(false)} title={editingDissertation?.id ? "Editar Orientação" : "Nova Orientação"}>
                <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div>
                        <label className={labelClasses}>Título da Dissertação</label>
                        <input type="text" className={inputClasses} value={editingDissertation?.title || ''} onChange={e => setEditingDissertation({...editingDissertation!, title: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Aluno</label>
                            <input type="text" className={inputClasses} value={editingDissertation?.student_name || ''} onChange={e => setEditingDissertation({...editingDissertation!, student_name: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClasses}>Ano</label>
                            <input type="number" className={inputClasses} value={editingDissertation?.year || ''} onChange={e => setEditingDissertation({...editingDissertation!, year: parseInt(e.target.value)})} />
                        </div>
                    </div>
                    
                    {/* NOVOS CAMPOS: PAPEL E STATUS */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Papel na Orientação</label>
                            <select 
                                className={inputClasses}
                                value={editingDissertation?.advisor_role || 'orientador'}
                                onChange={e => setEditingDissertation({...editingDissertation!, advisor_role: e.target.value as any})}
                            >
                                <option value="orientador">Orientador</option>
                                <option value="coorientador">Coorientador</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>Status</label>
                            <select 
                                className={inputClasses}
                                value={editingDissertation?.status || 'concluded'}
                                onChange={e => setEditingDissertation({...editingDissertation!, status: e.target.value as any})}
                            >
                                <option value="concluded">Concluída</option>
                                <option value="in_progress">Em Andamento</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button type="button" onClick={() => pdfInputRef.current?.click()} className={`w-full py-3 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 text-sm font-bold ${editingDissertation?.pdf_url ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                            {pdfUploading ? '...' : editingDissertation?.pdf_url ? <CheckIcon /> : <FileTextIcon className="w-4 h-4" />} PDF
                        </button>
                        <input type="file" ref={pdfInputRef} onChange={handlePdfFileChange} className="hidden" accept=".pdf" />
                        <button type="button" onClick={() => podcastInputRef.current?.click()} className={`w-full py-3 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 text-sm font-bold ${editingDissertation?.podcast_url ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                            {podcastUploading ? '...' : editingDissertation?.podcast_url ? <CheckIcon /> : <MicIcon className="w-4 h-4" />} Áudio
                        </button>
                        <input type="file" ref={podcastInputRef} onChange={handlePodcastFileChange} className="hidden" accept="audio/*" />
                    </div>
                    <div>
                        <label className={labelClasses}>Resumo</label>
                        <textarea className={`${inputClasses} h-32 resize-none`} value={editingDissertation?.summary || ''} onChange={e => setEditingDissertation({...editingDissertation!, summary: e.target.value})} />
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-[#034C83] uppercase tracking-wider">Produtos Educacionais</label>
                            <button onClick={handleAddProduct} className="text-xs font-bold text-[#39A3B0] hover:underline flex items-center gap-1">
                                + Adicionar Produto
                            </button>
                        </div>
                        <div className="space-y-4">
                            {editingDissertation?.products?.map((prod, idx) => (
                                <div key={prod.id || idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative group animate-in slide-in-from-top-2">
                                    <button 
                                        onClick={() => handleRemoveProduct(idx)}
                                        className="absolute -top-2 -right-2 bg-white border border-red-200 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Título do Produto</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm"
                                                value={prod.title}
                                                onChange={e => handleUpdateProduct(idx, 'title', e.target.value)}
                                                placeholder="Ex: Guia de Bolso"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tipo</label>
                                            <select 
                                                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm"
                                                value={prod.type}
                                                onChange={e => handleUpdateProduct(idx, 'type', e.target.value as any)}
                                            >
                                                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">URL do Produto</label>
                                        <input 
                                            type="url" 
                                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm"
                                            value={prod.url}
                                            onChange={e => handleUpdateProduct(idx, 'url', e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            ))}
                            {(editingDissertation?.products?.length || 0) === 0 && (
                                <p className="text-center py-4 text-xs text-gray-400 italic">Nenhum produto adicionado.</p>
                            )}
                        </div>
                    </div>

                    <button onClick={handleSaveDissertation} disabled={dissertationLoading} className="w-full bg-[#39A3B0] text-white font-bold py-4 rounded-xl shadow-xl hover:bg-[#2c8b96] disabled:opacity-50 transition-all">
                        {dissertationLoading ? 'Salvando...' : 'Salvar Orientação'}
                    </button>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={handleDeleteDissertation}
                title="Excluir Orientação?"
                message="Esta ação é irreversível. Todos os dados serão removidos."
                confirmLabel="Sim, Excluir"
                cancelLabel="Não, Manter"
            />
        </div>
    );
};

export default EditProfile;