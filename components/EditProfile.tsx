
import React, { useState, useEffect, useRef } from 'react';
import { Professor, Dissertation, Product, ProductType } from '../types';
import { EditIcon, XIcon, MailIcon, LinkIcon, CameraIcon, BookOpenIcon, FileTextIcon, MicIcon, KeyIcon } from './icons';
import { supabase } from '../supabaseClient';
import Modal from './Modal';

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

    // Estado para alteração de senha
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
        console.error("Erro original capturado:", err);
        if (!err) return "Erro desconhecido";
        
        let msg = "";
        if (typeof err === 'string') {
            msg = err;
        } else {
            const parts = [];
            if (err.message) parts.push(err.message);
            if (err.details) parts.push(`Detalhes: ${err.details}`);
            if (err.hint) parts.push(`Dica: ${err.hint}`);
            if (err.code) parts.push(`Código: ${err.code}`);
            
            if (parts.length > 0) {
                msg = parts.join(" | ");
            } else {
                try {
                    msg = JSON.stringify(err);
                    if (msg === "{}") msg = err.toString();
                } catch (e) {
                    msg = String(err);
                }
            }
        }

        if (msg.toLowerCase().includes("bucket not found") && bucketName) {
            return `O bucket '${bucketName}' não existe ou está inacessível. No painel do Supabase, vá em Storage -> New Bucket e crie um chamado '${bucketName}' como PUBLIC.`;
        }
        return msg;
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
        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ 
                password: passwordData.newPassword 
            });
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

    const handleSaveDissertation = async () => {
        if (!editingDissertation || !professor) return;
        if (!editingDissertation.title?.trim() || !editingDissertation.student_name?.trim()) {
            alert("Preencha o Título e o Nome do Discente.");
            return;
        }

        const numericYear = parseInt(String(editingDissertation.year), 10);
        if (isNaN(numericYear) || numericYear < 1900) {
            alert("O ano de defesa é inválido.");
            return;
        }

        setDissertationLoading(true);
        try {
            const isNew = !editingDissertation.id;
            const dissData = {
                professor_id: professor.id,
                title: editingDissertation.title.trim(),
                student_name: editingDissertation.student_name.trim(),
                year: numericYear,
                status: editingDissertation.status || 'concluded',
                advisor_role: editingDissertation.advisor_role || 'orientador',
                pdf_url: editingDissertation.pdf_url || null,
                summary: editingDissertation.summary?.trim() || '',
                podcast_url: editingDissertation.podcast_url || null,
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

            if (editingDissertation.products) {
                const validProducts = editingDissertation.products.filter(p => p.title?.trim() && p.url?.trim());
                await supabase.from('products').delete().eq('dissertation_id', currentDissId);
                if (validProducts.length > 0) {
                    const productsToInsert = validProducts.map(p => ({
                        dissertation_id: currentDissId,
                        title: p.title.trim(), type: p.type || 'Outro', url: p.url.trim()
                    }));
                    const { error: prodError } = await supabase.from('products').insert(productsToInsert);
                    if (prodError) throw prodError;
                }
            }

            setMessage({ type: 'success', text: 'Orientação salva!' });
            setIsDissertationModalOpen(false);
            onRefresh();
        } catch (err: any) {
            alert("Erro ao salvar orientação: " + formatError(err));
        } finally {
            setDissertationLoading(false);
        }
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

                {/* SEÇÃO DE PERFIL */}
                <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-[#034C83] mb-6 pb-2 border-b border-gray-100">Meu Perfil</h2>
                    <form onSubmit={handleSaveBasicInfo} className="space-y-6">
                        <div className="flex flex-col items-center gap-4 py-4 mb-6">
                            <div className="relative">
                                <img 
                                    src={formData.photo_url || `https://ui-avatars.com/api/?name=${formData.name}&background=034C83&color=fff`} 
                                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 shadow-md" alt="Foto" 
                                />
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

                        {/* LINHAS DE PESQUISA COM CHECKBOX */}
                        <div>
                            <label className={labelClasses}>Linhas de Pesquisa</label>
                            <div className="space-y-3 mt-3">
                                {RESEARCH_LINES.map(line => (
                                    <label 
                                        key={line} 
                                        className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${formData.lines_of_research.includes(line) ? 'border-[#034C83] bg-[#034C83]/5' : 'border-gray-200'}`}
                                    >
                                        <input 
                                            type="checkbox" 
                                            className="mt-1 w-5 h-5 rounded text-[#034C83] focus:ring-[#39A3B0] cursor-pointer"
                                            checked={formData.lines_of_research.includes(line)}
                                            onChange={() => {
                                                const lines = formData.lines_of_research.includes(line)
                                                    ? formData.lines_of_research.filter(l => l !== line)
                                                    : [...formData.lines_of_research, line];
                                                setFormData({...formData, lines_of_research: lines});
                                            }}
                                        />
                                        <span className={`text-sm font-semibold ${formData.lines_of_research.includes(line) ? 'text-[#034C83]' : 'text-gray-600'}`}>
                                            {line}
                                        </span>
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
                                <input type="url" className={inputClasses} value={formData.lattes_url} onChange={e => setFormData({...formData, lattes_url: e.target.value})} placeholder="http://lattes.cnpq.br/..." />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-4 bg-[#034C83] text-white font-bold rounded-xl hover:bg-[#023b66] transition-all disabled:opacity-50 shadow-md">
                            {loading ? 'Salvando...' : 'Salvar Alterações do Perfil'}
                        </button>
                    </form>
                </section>

                {/* SEÇÃO DE SEGURANÇA (ALTERAR SENHA) */}
                <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-100">
                        <KeyIcon className="w-5 h-5 text-[#034C83]"/>
                        <h2 className="text-xl font-bold text-[#034C83]">Segurança</h2>
                    </div>
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>Nova Senha</label>
                                <input 
                                    type="password" 
                                    className={inputClasses} 
                                    placeholder="Mínimo 6 caracteres"
                                    value={passwordData.newPassword}
                                    onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Confirmar Nova Senha</label>
                                <input 
                                    type="password" 
                                    className={inputClasses} 
                                    placeholder="Repita a nova senha"
                                    value={passwordData.confirmPassword}
                                    onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={passwordLoading} className="px-8 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50 shadow-sm text-sm">
                            {passwordLoading ? 'Atualizando...' : 'Alterar Senha de Acesso'}
                        </button>
                    </form>
                </section>

                {/* SEÇÃO DE ORIENTAÇÕES */}
                <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-[#034C83]">Orientações</h2>
                        <button onClick={() => openDissertationModal()} className="px-5 py-2.5 bg-[#39A3B0] text-white text-sm font-bold rounded-lg hover:bg-[#2c8b96]">
                            + Nova Orientação
                        </button>
                    </div>
                    <div className="space-y-4">
                        {dissertations.length === 0 ? (
                            <p className="text-center py-10 text-gray-400 italic">Nenhuma orientação cadastrada ainda.</p>
                        ) : (
                            dissertations.map(diss => (
                                <div key={diss.id} className="p-5 border border-gray-200 rounded-xl flex justify-between items-center group transition-colors hover:border-[#39A3B0]">
                                    <div className="min-w-0 flex-grow pr-4">
                                        <h4 className="font-bold text-[#034C83] truncate group-hover:text-[#39A3B0]">{diss.title}</h4>
                                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500 mt-1 uppercase font-bold tracking-tighter">
                                            <span>{diss.student_name}</span>
                                            <span className="text-gray-300">|</span>
                                            <span>{diss.year}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openDissertationModal(diss)} className="p-2 text-[#034C83] hover:bg-blue-50 rounded-lg"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={async () => {
                                            if (!confirm("Excluir esta orientação?")) return;
                                            try {
                                                const { error } = await supabase.from('dissertations').delete().eq('id', diss.id);
                                                if (error) throw error;
                                                onRefresh();
                                            } catch (e) { alert(formatError(e)); }
                                        }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><XIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {message && (
                    <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl text-sm font-bold border flex items-center gap-3 animate-in slide-in-from-right-10 z-50 ${message.type === 'success' ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'}`}>
                        <span>{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-2 hover:bg-white/20 rounded p-1">✕</button>
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
                            <input type="number" className={inputClasses} value={editingDissertation?.year ?? ''} onChange={e => setEditingDissertation({...editingDissertation!, year: e.target.value === '' ? undefined : parseInt(e.target.value, 10)})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button type="button" onClick={() => pdfInputRef.current?.click()} disabled={pdfUploading} className={`w-full py-3 px-4 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm font-bold transition-all ${editingDissertation?.pdf_url ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                            {pdfUploading ? <div className="w-5 h-5 border-2 border-[#39A3B0] border-t-transparent rounded-full animate-spin" /> : editingDissertation?.pdf_url ? <CheckIcon /> : <FileTextIcon className="w-5 h-5" />}
                            {editingDissertation?.pdf_url ? 'PDF Vinculado' : 'Subir PDF'}
                        </button>
                        <input type="file" ref={pdfInputRef} onChange={handlePdfFileChange} className="hidden" accept=".pdf" />
                        <button type="button" onClick={() => podcastInputRef.current?.click()} disabled={podcastUploading} className={`w-full py-3 px-4 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm font-bold transition-all ${editingDissertation?.podcast_url ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                            {podcastUploading ? <div className="w-5 h-5 border-2 border-[#39A3B0] border-t-transparent rounded-full animate-spin" /> : editingDissertation?.podcast_url ? <CheckIcon /> : <MicIcon className="w-5 h-5" />}
                            {editingDissertation?.podcast_url ? 'Áudio Vinculado' : 'Subir Áudio'}
                        </button>
                        <input type="file" ref={podcastInputRef} onChange={handlePodcastFileChange} className="hidden" accept="audio/*" />
                    </div>
                    <div>
                        <label className={labelClasses}>Resumo da Dissertação</label>
                        <textarea className={`${inputClasses} h-32 resize-none text-sm`} value={editingDissertation?.summary || ''} onChange={e => setEditingDissertation({...editingDissertation!, summary: e.target.value})} />
                    </div>
                    <button onClick={handleSaveDissertation} disabled={dissertationLoading || pdfUploading || podcastUploading} className="w-full bg-[#39A3B0] text-white font-bold py-4 rounded-xl shadow-xl hover:bg-[#2c8b96] disabled:opacity-50 transition-all">
                        {dissertationLoading ? 'Salvando...' : 'Salvar Orientação'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default EditProfile;
