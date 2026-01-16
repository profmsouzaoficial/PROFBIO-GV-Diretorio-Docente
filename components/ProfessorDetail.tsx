import React from 'react';
import { Professor } from '../types';
import DissertationCard from './DissertationCard';
import { ExternalLinkIcon, MailIcon, EditIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';

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
  
  if (!professor) {
    return <WelcomeMessage />;
  }

  // A user can edit if they are logged in and their ID matches the professor's user_id.
  // In a real app, you might also check for an 'admin' role.
  const canEdit = user && user.id === professor.user_id;

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 bg-gray-50/50 min-h-full">
      <header className="flex flex-col md:flex-row items-start gap-6 md:gap-8 mb-8">
        <img
          src={professor.photo_url}
          alt={`Foto de ${professor.name}`}
          className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-lg border-4 border-white"
        />
        <div className="mt-4 md:mt-0 flex-grow">
          <div className="flex justify-between items-start">
            <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#034C83]">{professor.name}</h2>
                <p className="text-lg text-[#39A3B0] font-medium mt-1">{professor.title}</p>
            </div>
            {canEdit && (
                <button 
                    onClick={() => onNavigate('editProfile', { professorId: professor.id })}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#39A3B0] rounded-lg hover:bg-[#2c8b96] transition-colors shadow-sm min-w-[44px] min-h-[44px] justify-center"
                >
                    <EditIcon className="w-4 h-4"/>
                    <span className="hidden sm:inline">Editar Perfil</span>
                </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
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
        <p className="text-gray-700 leading-relaxed">{professor.mini_bio}</p>
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
          {professor.dissertations.map(diss => (
            <DissertationCard key={diss.id} dissertation={diss} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProfessorDetail;
