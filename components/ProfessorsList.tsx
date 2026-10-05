
import React, { useState, useMemo } from 'react';
import { Professor } from '../types';
import { SearchIcon } from './icons';
import { normalizePhotoUrl, getAvatarFallback } from '../utils/photo';

interface ProfessorsListProps {
  professors: Professor[];
  selectedProfessorId: string | null;
  onSelectProfessor: (id: string) => void;
  isOpen: boolean;
}

const RESEARCH_LINES = [
    "Todas",
    "Comunicação, Ensino e Aprendizagem em Biologia",
    "Organização e funcionamento dos organismos",
    "Origem da vida, evolução, ecologia e Biodiversidade"
];

const ProfessorsList: React.FC<ProfessorsListProps> = ({ professors, selectedProfessorId, onSelectProfessor, isOpen }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLine, setSelectedLine] = useState('Todas');

  const filteredProfessors = useMemo(() => {
    return professors.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.lines_of_research.some(line => line.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesLine = selectedLine === 'Todas' || p.lines_of_research.includes(selectedLine);
      
      return matchesSearch && matchesLine;
    });
  }, [professors, searchTerm, selectedLine]);

  return (
    <aside className={`absolute md:relative z-20 md:z-auto w-full md:w-80 lg:w-96 bg-white h-full transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex-shrink-0 border-r border-gray-200 flex flex-col shadow-xl md:shadow-none`}>
      <div className="p-4 border-b border-gray-200 bg-gray-50/50 space-y-3">
        <h2 className="text-xl font-bold text-[#034C83]">Docentes</h2>
        
        {/* Filtro por Linha de Pesquisa */}
        <div>
          <label htmlFor="line-filter" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Linha de Pesquisa</label>
          <select
            id="line-filter"
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="w-full px-3 py-2 bg-white text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#39A3B0] focus:border-[#39A3B0] outline-none transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%239ca3af%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
          >
            {RESEARCH_LINES.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>

        {/* Busca por Nome */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#39A3B0] focus:border-[#39A3B0] outline-none transition-all placeholder-gray-400"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-grow bg-white">
        {filteredProfessors.length > 0 ? (
          <ul>
            {filteredProfessors.map(professor => (
              <li key={professor.id} className="border-b border-gray-100">
                <button
                  onClick={() => onSelectProfessor(professor.id)}
                  className={`w-full text-left p-4 flex items-center gap-4 transition-all duration-200 ${selectedProfessorId === professor.id ? 'bg-[#7CBCC5]/20 border-l-4 border-[#034C83]' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-12 h-12 aspect-square rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm bg-gray-50 flex items-center justify-center">
                    <img 
                      src={normalizePhotoUrl(professor.photo_url, professor.name)} 
                      alt={professor.name} 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getAvatarFallback(professor.name);
                      }}
                      className="w-full h-full object-cover object-center aspect-square" 
                    />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h3 className="font-bold text-[#034C83] leading-tight text-sm truncate">{professor.name}</h3>
                    <p className="text-xs text-[#39A3B0] font-medium mt-1 truncate">
                        {professor.title || 'Ensino de Biologia'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 italic text-sm">Nenhum docente encontrado para este filtro.</p>
            <button 
                onClick={() => { setSearchTerm(''); setSelectedLine('Todas'); }}
                className="mt-4 text-[#39A3B0] text-xs font-bold hover:underline"
            >
                Limpar todos os filtros
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ProfessorsList;
