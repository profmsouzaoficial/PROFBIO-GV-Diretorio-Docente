
import React, { useState, useMemo } from 'react';
import { Professor } from '../types';
import DissertationCard from './DissertationCard';
import { ExternalLinkIcon, MailIcon, EditIcon, UserPlusIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import ApplicationModal from './ApplicationModal';
import { supabase } from '../supabaseClient';

interface ProfessorDetailProps {
  professor: Professor | null;
  onNavigate: (page: string, params: object) => void;
}

const WelcomeMessage: React.FC = () => (
    <div className="text-center p-8 flex flex-col items-center justify-center h-full">
        <div>
            <h2 className="text-2xl font-bold text-[#034C83] mb-4">Bem-vindo ao Diretório Docente</h2>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                O PROFBIO é um mestrado profissional em Rede Nacional para formação continuada de professores de Biologia em exercício na educação básica. Nosso corpo docente é composto por pesquisadores engajados na produção de conhecimento e na sua aplicação no contexto escolar.
            </p>
            <p className="mt-4 text-gray-500">Selecione um docente na lista para ver seu perfil e produções.</p>
        </div>
    </div>
);

const ProfessorDetail: React.FC<ProfessorDetailProps> = ({ professor, onNavigate }) => {
  const { user } = useAuth();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Efeito para verificar se o usuário logado é admin
  React.useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.from('professors').select('is_admin').eq('user_id', user.id).single();
      if (data) setIsAdmin(data.is_admin);
    };
    checkAdmin();
  }, [user]);
  
  if (!professor) {
    return <WelcomeMessage />;
  }

  const isSelf = user && user.id === professor.user_id;
  const canEdit = isSelf || isAdmin;

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 bg-gray-50/50 min-h-full">
      <header className="flex flex-col md:flex-row items-start gap-6 md:gap-8 mb-8">
        <img
          src={professor.photo_url}
          alt={`Foto de ${professor.name}`}
          className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-lg border-4 border-white"
        />
        <div className="mt-4 md:mt-0 flex-grow w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#034C83]">{professor.name}</h2>
                <p className="text-lg text-[#39A3B0] font-medium mt-1">{professor.title}</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
                {canEdit ? (
                    <button 
                        onClick={() => onNavigate('editProfile', { professorId: professor.id })}
                        className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#39A3B0] rounded-lg hover:bg-[#2c8b96] transition-colors shadow-sm min-h-[44px] justify-center"
                    >
                        <EditIcon className="w-4 h-4"/>
                        <span>Editar Perfil {isAdmin && !isSelf && '(Master)'}</span>
                    </button>
                ) : professor.disponivel && (
                    <button 
                        onClick={() => setIsApplyModalOpen(true)}
                        className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#034C83] rounded-lg hover:bg-[#023b66] transition-all shadow-md min-h-[44px] justify-center"
                    >
                        <UserPlusIcon className="w-4 h-4"/>
                        <span>Candidatar-se à Orientação</span>
                    </button>
                )}
                {!canEdit && !professor.disponivel && (
                  <span className="px-4 py-2 text-sm font-bold text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed">
                    Indisponível para novas orientações
                  </span>
                )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6 text-sm">
             <a href={`mailto:${professor.public_email}`} className="flex items-center gap-2 text-[#034C83] hover:text-[#39A3B0] font-medium transition-colors">
                <MailIcon className="w-5 h-5"/>
                <span>{professor.public_email}</span>
             </a>
             <a href={professor.lattes_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#034C83] hover:text-[#39A3B0] font-medium transition-colors">
                <ExternalLinkIcon className="w-5 h-5"/>
                <span>Currículo Lattes</span>
             </a>
          </div>
        </div>
      </header>

      <section className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
        <h3 className="text-xl font-bold text-[#034C83] mb-3">Sobre</h3>
        <p className="text-gray-700 leading-relaxed text-justify">{professor.mini_bio}</p>
        <div className="mt-4">
            <h4 className="font-semibold text-gray-700 mb-2">Linhas de Pesquisa:</h4>
            <div className="flex flex-wrap gap-2">
            {professor.lines_of_research.map(line => (
                <span key={line} className="bg-[#7CBCC5]/30 text-[#034C83] text-xs font-semibold px-3 py-1.5 rounded-full">
                {line}
                </span>
            ))}
            </div>
        </div>
      </section>
      
      <section>
        <h3 className="text-2xl font-bold text-[#034C83] mb-4">Orientações e Produções</h3>
        <div>
          {professor.dissertations.length > 0 ? (
              professor.dissertations.map(diss => (
                <DissertationCard key={diss.id} dissertation={diss} />
              ))
          ) : (
              <p className="text-gray-500 italic text-sm p-4 bg-white rounded-lg border border-dashed border-gray-300">Nenhuma orientação listada publicamente até o momento.</p>
          )}
        </div>
      </section>

      <ApplicationModal 
        isOpen={isApplyModalOpen} 
        onClose={() => setIsApplyModalOpen(false)} 
        professorId={professor.id} 
        professorName={professor.name}
      />
    </div>
  );
};

export default ProfessorDetail;
