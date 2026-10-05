
import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { supabase } from '../supabaseClient';
import { CameraIcon, MailIcon, WhatsAppIcon, LinkIcon, FileTextIcon, CheckCircleIcon } from './icons';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  professorId: string;
  professorName: string;
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({ isOpen, onClose, professorId, professorName }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    student_name: '',
    student_email: '',
    student_whatsapp: '',
    lattes_url: '',
    presentation_text: '',
    photo_url: ''
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `student-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('candidate_photos').upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('candidate_photos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
    } catch (err) {
      console.error("Erro ao subir foto:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('candidates').insert({
        professor_id: professorId,
        ...formData
      });

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err) {
      alert("Erro ao enviar candidatura: " + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setFormData({
      student_name: '',
      student_email: '',
      student_whatsapp: '',
      lattes_url: '',
      presentation_text: '',
      photo_url: ''
    });
    onClose();
  };

  const inputClasses = "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#39A3B0] outline-none text-sm transition-all";
  const labelClasses = "block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isSubmitted ? "Sucesso!" : `Candidatura para ${professorName}`}>
      {isSubmitted ? (
        <div className="py-8 text-center flex flex-col items-center animate-in zoom-in-95 duration-300">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-[#034C83] mb-2">Candidatura Enviada!</h3>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Sua solicitação foi encaminhada para o(a) docente <strong>{professorName}</strong>.<br/> 
            Fique atento(a) ao seu e-mail para receber o feedback oficial do programa.
          </p>
          <button 
            onClick={handleClose}
            className="w-full bg-[#034C83] text-white font-bold py-3 rounded-xl hover:bg-[#023b66] transition-all shadow-md"
          >
            Entendido
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="relative group flex-shrink-0">
              <div className="w-24 h-24 aspect-square rounded-full overflow-hidden border-2 border-gray-100 shadow-sm bg-gray-50 flex items-center justify-center">
                <img 
                  src={formData.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.student_name || 'Aluno')}&background=39A3B0&color=fff`} 
                  className="w-full h-full object-cover object-center aspect-square"
                  alt="Preview"
                />
              </div>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-[#39A3B0] text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform cursor-pointer"
              >
                {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <CameraIcon className="w-4 h-4" />}
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sua Foto</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelClasses}>Nome Completo</label>
              <input type="text" className={inputClasses} value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} placeholder="Seu nome completo" required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}><MailIcon className="inline w-3 h-3 mr-1"/> Email</label>
                <input type="email" className={inputClasses} value={formData.student_email} onChange={e => setFormData({...formData, student_email: e.target.value})} placeholder="email@exemplo.com" required />
              </div>
              <div>
                <label className={labelClasses}><WhatsAppIcon className="inline w-3 h-3 mr-1"/> WhatsApp</label>
                <input type="tel" className={inputClasses} value={formData.student_whatsapp} onChange={e => setFormData({...formData, student_whatsapp: e.target.value})} placeholder="(00) 00000-0000" required />
              </div>
            </div>

            <div>
              <label className={labelClasses}><LinkIcon className="inline w-3 h-3 mr-1"/> Link Currículo Lattes</label>
              <input type="url" className={inputClasses} value={formData.lattes_url} onChange={e => setFormData({...formData, lattes_url: e.target.value})} placeholder="http://lattes.cnpq.br/..." required />
            </div>

            <div>
              <label className={labelClasses}><FileTextIcon className="inline w-3 h-3 mr-1"/> Carta de Intenção</label>
              <textarea 
                className={`${inputClasses} h-32 resize-none leading-relaxed`} 
                value={formData.presentation_text} 
                onChange={e => setFormData({...formData, presentation_text: e.target.value})} 
                placeholder="Explique por que deseja este orientador(a) especificamente..." 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || uploading} 
            className="w-full bg-[#034C83] text-white font-bold py-4 rounded-xl hover:bg-[#023b66] disabled:opacity-50 transition-all shadow-xl mt-4 active:scale-95"
          >
            {loading ? 'Enviando...' : 'Confirmar Candidatura'}
          </button>
        </form>
      )}
    </Modal>
  );
};

export default ApplicationModal;
