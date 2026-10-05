
import React, { useState, useEffect, useRef } from 'react';
import { Professor, Dissertation, Product, ProductType, Candidate } from '../types';
import { EditIcon, XIcon, MailIcon, LinkIcon, CameraIcon, BookOpenIcon, FileTextIcon, MicIcon, KeyIcon, TeacherIcon, UserPlusIcon, WhatsAppIcon, CheckCircleIcon, XCircleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { normalizePhotoUrl, getAvatarFallback } from '../utils/photo';

interface EditProfileProps {
    professor: Professor | undefined;
    onNavigate: (page: string) => void;
    onRefresh: () => void;
}

const RESEARCH_LINES = [
    "Comunicação, Ensino e Aprendizagem em Biologia",
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
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const podcastInputRef = useRef<HTMLInputElement>(null);
    
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pdfUploading, setPdfUploading] = useState(false);
    const [podcastUploading, setPodcastUploading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', title: '', mini_bio: '', public_email: '', 
        lattes_url: '', photo_url: '', lines_of_research: [] as string[],
        disponivel: true
    });

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);

    const [dissertations, setDissertations] = useState<Dissertation[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [editingDissertation, setEditingDissertation] = useState<Partial<Dissertation> | null>(null);
    const [isDissertationModalOpen, setIsDissertationModalOpen] = useState(false);
    const [dissertationLoading, setDissertationLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({
        isOpen: false,
        id: null
    });

    const fetchCandidates = async (profId: string) => {
        const { data, error } = await supabase
            .from('candidates')
            .select('*')
            .eq('professor_id', profId)
            .order('created_at', { ascending: false });
        if (!error && data) setCandidates(data);
    };

    useEffect(() => {
        if (professor) {
            setFormData({
                name: professor.name || '',
                title: professor.title || '',
                mini_bio: professor.mini_bio || '',
                public_email: professor.public_email || '',
                lattes_url: professor.lattes_url || '',
                photo_url: professor.photo_url || '',
                lines_of_research: professor.lines_of_research || [],
                disponivel: professor.disponivel ?? true
            });
            setDissertations(professor.dissertations || []);
            fetchCandidates(professor.id);
        }
    }, [professor]);

    const handleCandidateStatus = async (candidate: Candidate, newStatus: 'accepted' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('candidates')
                .update({ status: newStatus })
                .eq('id', candidate.id);
            
            if (error) throw error;
            
            setMessage({ 
                type: 'success', 
                text: `Candidato ${newStatus === 'accepted' ? 'aceito' : 'recusado'}. E-mail enviado para ${candidate.student_email}.` 
            });
            
            if (professor) fetchCandidates(professor.id);
        } catch (err) {
            alert("Erro ao processar candidato: " + (err as any).message);
        }
    };

    const formatError = (err: any, bucketName?: string): string => {
        console.error("Erro original:", err);
        return err?.message || String(err);
    };

    const handleFileUpload = async (file: File, bucket: string) => {
        if (!professor) return null;
        try {
            const rawExt = file.name.split('.').pop()?.toLowerCase() || 'png';
            const fileExt = rawExt === 'jpeg' ? 'jpg' : rawExt;
            const prefix = professor.id || professor.user_id || 'prof';
            const fileName = `${prefix}-${Date.now()}.${fileExt}`;
            
            // Garantir Content-Type correto especialmente para GIFs do Lattes
            let contentType = file.type;
            if (!contentType) {
                if (fileExt === 'gif') contentType = 'image/gif';
                else if (fileExt === 'png') contentType = 'image/png';
                else if (fileExt === 'jpg' || fileExt === 'jpeg') contentType = 'image/jpeg';
                else if (fileExt === 'webp') contentType = 'image/webp';
                else if (fileExt === 'pdf') contentType = 'application/pdf';
                else if (fileExt === 'mp3') contentType = 'audio/mpeg';
            }

            const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, {
                contentType,
                upsert: true
            });
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
            if (url) {
                const normalized = normalizePhotoUrl(url);
                setFormData(prev => ({ ...prev, photo_url: normalized }));
            }
            setMessage({ type: 'success', text: 'Foto (GIF/Imagem) atualizada com sucesso!' });
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
            const updatePayload: any = {
                name: formData.name,
                title: formData.title,
                mini_bio: formData.mini_bio,
                public_email: formData.public_email,
                lattes_url: formData.lattes_url,
                photo_url: formData.photo_url,
                lines_of_research: formData.lines_of_research,
                disponivel: formData.disponivel,
                updated_at: new Date().toISOString()
            };
            if (user?.id && !professor.user_id) {
                updatePayload.user_id = user.id;
            }
            const { error } = await supabase.from('professors').update(updatePayload).eq('id', professor.id);
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
                status: editingDissertation.status || 'concluded',
                advisor_role: editingDissertation.advisor_role || 'orientador',
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

    if (!professor) {
        return (
            <div className="flex-grow flex items-center justify-center p-6 bg-gray-50/50">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-200 text-center animate-in fade-in duration-200">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-[#034C83] mb-2">Perfil não vinculado</h2>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                        Não encontramos um perfil de docente cadastrado para o e-mail <strong>{user?.email}</strong>.
                    </p>
                    <button
                        onClick={() => onNavigate('home')}
                        className="w-full bg-[#034C83] text-white py-2.5 px-4 rounded-xl font-bold hover:bg-[#023b66] transition-all shadow-sm"
                    >
                        Voltar para a página inicial
                    </button>
                </div>
            </div>
        );
    }

    const inputClasses = "w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#39A3B0] outline-none transition-all";
    const labelClasses = "block text-sm font-bold text-gray-700 mb-2";

    const isMasterMode = Boolean(
        user?.id && professor.user_id && professor.user_id !== user.id
    );

    return (
        <div className="flex-grow bg-gray-50/50 p-4 sm:p-6 overflow-y-auto scroll-container">
            <div className="max-w-4xl mx-auto space-y-8 pb-12">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#034C83] flex items-center gap-2">
                        <EditIcon className="w-6 h-6"/> Painel do Docente {isMasterMode ? '(Modo Master)' : ''}
                    </h1>
                    <button onClick={() => onNavigate('home')} className="p-2 rounded-full hover:bg-gray-200 text-gray-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* 1. SEÇÃO MEU PERFIL */}
                <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                      <h2 className="text-xl font-bold text-[#034C83]">Meu Perfil</h2>
                      {/* TOGGLE DE DISPONIBILIDADE */}
                      <label className="inline-flex items-center cursor-pointer">
                        <span className="mr-3 text-sm font-bold text-gray-600">Disponível para orientações?</span>
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={formData.disponivel}
                            onChange={(e) => setFormData({...formData, disponivel: e.target.checked})}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#39A3B0]"></div>
                        </div>
                      </label>
                    </div>

                    <form onSubmit={handleSaveBasicInfo} className="space-y-6">
                        <div className="flex flex-col items-center gap-3 py-4 mb-6">
                            <div className="relative flex-shrink-0">
                                <div className="w-32 h-32 sm:w-36 sm:h-36 aspect-square rounded-full overflow-hidden border-4 border-gray-100 shadow-md bg-gray-50 flex items-center justify-center">
                                    <img 
                                        src={normalizePhotoUrl(formData.photo_url, formData.name)} 
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = getAvatarFallback(formData.name);
                                        }}
                                        className="w-full h-full object-cover object-center aspect-square" 
                                        alt="Foto" 
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()} 
                                    disabled={uploading} 
                                    className="absolute bottom-0 right-0 p-2.5 bg-[#39A3B0] text-white rounded-full shadow-lg hover:scale-110 disabled:opacity-50 transition-transform cursor-pointer"
                                    title="Carregar imagem do computador (GIF, PNG, JPG, WebP)"
                                >
                                    {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CameraIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-semibold text-gray-600">
                                    Aceita arquivos <span className="text-[#034C83] font-bold">.GIF (Lattes)</span>, .PNG, .JPG e .WebP
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Clique no ícone da câmera para enviar o arquivo ou insira o link abaixo
                                </p>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handlePhotoChange} 
                                className="hidden" 
                                accept="image/*, image/gif, image/png, image/jpeg, image/webp, .gif, .png, .jpg, .jpeg, .webp" 
                            />
                        </div>

                        {/* Campo de URL da foto para flexibilidade com Lattes / Supabase */}
                        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                            <label className={labelClasses}>
                                Link / URL da Foto (Lattes, Supabase ou Externa)
                            </label>
                            <input 
                                type="url" 
                                className={inputClasses} 
                                placeholder="https://... (ex: link da foto do Lattes, arquivo .gif ou Supabase Storage)"
                                value={formData.photo_url} 
                                onChange={e => {
                                    const rawVal = e.target.value;
                                    setFormData({ ...formData, photo_url: normalizePhotoUrl(rawVal) });
                                }} 
                            />
                            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                                Dica: Se você copiar o link de uma foto do Lattes (CNPq) ou do Storage do Supabase, o sistema formata automaticamente para exibição direta.
                            </p>
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

                        <button type="submit" disabled={loading} className="w-full py-4 bg-[#034C83] text-white font-bold rounded-xl hover:bg-[#023b66] transition-all shadow-md active:scale-95">
                            {loading ? 'Salvando...' : 'Salvar Perfil'}
                        </button>
                    </form>
                </section>

                {/* 2. SEÇÃO SEGURANÇA */}
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
                        <button type="submit" disabled={passwordLoading} className="px-8 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-black transition-all text-sm active:scale-95">
                            {passwordLoading ? 'Atualizando...' : 'Alterar Senha'}
                        </button>
                    </form>
                </section>

                {/* 3. SEÇÃO CANDIDATOS À ORIENTAÇÃO */}
                <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-100">
                        <UserPlusIcon className="w-5 h-5 text-[#034C83]"/>
                        <h2 className="text-xl font-bold text-[#034C83]">Candidatos à Orientação</h2>
                    </div>
                    <div className="space-y-6">
                        {candidates.length > 0 ? (
                            candidates.map(cand => (
                                <div key={cand.id} className="p-6 border border-gray-100 rounded-2xl bg-gray-50/40 flex flex-col md:flex-row gap-5 items-start relative group shadow-sm">
                                    <div className="w-16 h-16 aspect-square rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-gray-100 flex items-center justify-center">
                                        <img 
                                            src={cand.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cand.student_name)}&background=39A3B0&color=fff`} 
                                            className="w-full h-full object-cover object-center aspect-square"
                                            alt={cand.student_name}
                                        />
                                    </div>
                                    <div className="flex-grow space-y-3 w-full">
                                        <div className="flex items-center justify-between gap-4">
                                            <h4 className="font-bold text-[#034C83] text-lg">{cand.student_name}</h4>
                                            <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm ${
                                                cand.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                cand.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {cand.status === 'pending' ? 'Pendente' : cand.status === 'accepted' ? 'Aceito' : 'Recusado'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium">
                                            <span className="flex items-center gap-1.5"><MailIcon className="w-3.5 h-3.5"/> {cand.student_email}</span>
                                            <span className="flex items-center gap-1.5"><WhatsAppIcon className="w-3.5 h-3.5"/> {cand.student_whatsapp}</span>
                                            <a href={cand.lattes_url} target="_blank" className="flex items-center gap-1.5 text-[#39A3B0] font-bold hover:underline"><LinkIcon className="w-3.5 h-3.5"/> Lattes</a>
                                        </div>
                                        <div className="relative">
                                          <p className="text-xs text-gray-600 leading-relaxed bg-white p-4 rounded-xl border border-gray-100 italic shadow-sm">
                                            "{cand.presentation_text}"
                                          </p>
                                        </div>
                                        
                                        {cand.status === 'pending' && (
                                            <div className="flex flex-wrap gap-3 pt-2">
                                                <button 
                                                    onClick={() => handleCandidateStatus(cand, 'accepted')}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#10b981] text-white text-xs font-bold rounded-xl hover:bg-[#059669] transition-all shadow-md active:scale-95"
                                                >
                                                    <CheckCircleIcon className="w-4 h-4"/> Aceitar Orientação
                                                </button>
                                                <button 
                                                    onClick={() => handleCandidateStatus(cand, 'rejected')}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#ef4444] text-white text-xs font-bold rounded-xl hover:bg-[#dc2626] transition-all shadow-md active:scale-95"
                                                >
                                                    <XCircleIcon className="w-4 h-4"/> Recusar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                              <p className="text-sm text-gray-400 italic font-medium">Nenhum candidato aguardando resposta.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 4. SEÇÃO ORIENTAÇÕES */}
                <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-[#034C83]">Orientações</h2>
                        <button onClick={() => openDissertationModal()} className="px-5 py-2.5 bg-[#39A3B0] text-white text-sm font-bold rounded-lg hover:bg-[#2c8b96] active:scale-95 transition-all">
                            + Nova Orientação
                        </button>
                    </div>
                    <div className="space-y-4">
                        {dissertations.map(diss => (
                            <div key={diss.id} className="p-5 border border-gray-100 rounded-xl flex justify-between items-center group hover:border-[#39A3B0] transition-colors bg-white">
                                <div className="min-w-0 flex-grow pr-4">
                                    <h4 className="font-bold text-[#034C83] truncate text-sm">{diss.title}</h4>
                                    <div className="text-[10px] text-gray-500 mt-1.5 uppercase font-extrabold tracking-widest flex items-center gap-2">
                                        <span>{diss.student_name}</span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span>{diss.year}</span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span className={diss.status === 'concluded' ? 'text-green-600' : 'text-amber-600'}>{diss.status === 'concluded' ? 'Concluída' : 'Em Andamento'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => openDissertationModal(diss)} className="p-2.5 text-[#034C83] hover:bg-blue-50 rounded-xl transition-colors"><EditIcon className="w-4.5 h-4.5"/></button>
                                    <button onClick={() => setConfirmDelete({ isOpen: true, id: diss.id })} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><XIcon className="w-4.5 h-4.5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {message && (
                    <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl text-sm font-bold border flex items-center gap-3 animate-in slide-in-from-right-10 z-[70] ${message.type === 'success' ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'}`}>
                        <span>{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-70 transition-opacity">✕</button>
                    </div>
                )}
            </div>

            <Modal isOpen={isDissertationModalOpen} onClose={() => setIsDissertationModalOpen(false)} title={editingDissertation?.id ? "Editar Orientação" : "Nova Orientação"}>
                <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div>
                        <label className={labelClasses}>Título da Dissertação</label>
                        <input type="text" className={inputClasses} value={editingDissertation?.title || ''} onChange={e => setEditingDissertation({...editingDissertation!, title: e.target.value})} placeholder="Título completo da obra" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Aluno</label>
                            <input type="text" className={inputClasses} value={editingDissertation?.student_name || ''} onChange={e => setEditingDissertation({...editingDissertation!, student_name: e.target.value})} placeholder="Nome do discente" />
                        </div>
                        <div>
                            <label className={labelClasses}>Ano</label>
                            <input type="number" className={inputClasses} value={editingDissertation?.year || ''} onChange={e => setEditingDissertation({...editingDissertation!, year: parseInt(e.target.value)})} placeholder="Ano de defesa" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <button type="button" onClick={() => pdfInputRef.current?.click()} className={`w-full py-3 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${editingDissertation?.pdf_url ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-[#39A3B0] hover:text-[#39A3B0]'}`}>
                            {pdfUploading ? <div className="w-4 h-4 border-2 border-[#39A3B0] border-t-transparent rounded-full animate-spin" /> : editingDissertation?.pdf_url ? <CheckCircleIcon /> : <FileTextIcon className="w-4 h-4" />} 
                            {editingDissertation?.pdf_url ? 'PDF Anexado' : 'Subir PDF'}
                        </button>
                        <input type="file" key={editingDissertation?.id || 'new-pdf'} ref={pdfInputRef} onChange={handlePdfFileChange} className="hidden" accept=".pdf" />
                        
                        <button type="button" onClick={() => podcastInputRef.current?.click()} className={`w-full py-3 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${editingDissertation?.podcast_url ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-[#39A3B0] hover:text-[#39A3B0]'}`}>
                            {podcastUploading ? <div className="w-4 h-4 border-2 border-[#39A3B0] border-t-transparent rounded-full animate-spin" /> : editingDissertation?.podcast_url ? <CheckCircleIcon /> : <MicIcon className="w-4 h-4" />} 
                            {editingDissertation?.podcast_url ? 'Áudio Anexado' : 'Subir Áudio'}
                        </button>
                        <input type="file" key={editingDissertation?.id || 'new-audio'} ref={podcastInputRef} onChange={handlePodcastFileChange} className="hidden" accept="audio/*" />
                    </div>

                    <div>
                        <label className={labelClasses}>Resumo da Dissertação</label>
                        <textarea className={`${inputClasses} h-32 resize-none text-sm leading-relaxed`} value={editingDissertation?.summary || ''} onChange={e => setEditingDissertation({...editingDissertation!, summary: e.target.value})} placeholder="Insira o resumo oficial aqui..." />
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
                                        className="absolute -top-2 -right-2 bg-white border border-red-200 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Título do Produto</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-[#39A3B0]"
                                                value={prod.title}
                                                onChange={e => handleUpdateProduct(idx, 'title', e.target.value)}
                                                placeholder="Ex: Guia Didático"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tipo</label>
                                            <select 
                                                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-[#39A3B0]"
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
                                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-[#39A3B0]"
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

                    <button onClick={handleSaveBasicInfo} disabled={loading} className="w-full bg-[#39A3B0] text-white font-bold py-4 rounded-xl shadow-xl hover:bg-[#2c8b96] disabled:opacity-50 transition-all active:scale-95">
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={handleDeleteDissertation}
                title="Excluir Orientação?"
                message="Esta ação é irreversível. Todos os dados, PDFs e áudios vinculados serão removidos permanentemente."
                confirmLabel="Sim, Excluir"
                cancelLabel="Não, Manter"
            />
        </div>
    );
};

export default EditProfile;
