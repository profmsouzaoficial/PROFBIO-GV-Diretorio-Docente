
import React, { useState } from 'react';
import { Dissertation, Product } from '../types';
import Modal from './Modal';
import { BookOpenIcon, FileTextIcon, LinkIcon, MicIcon } from './icons';

interface DissertationCardProps {
  dissertation: Dissertation;
}

const ProductLink: React.FC<{ product: Product }> = ({ product }) => {
    const iconMap: Record<string, React.ReactNode> = {
        'Artigo': <FileTextIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Conjunto de Dados': <LinkIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Repositório': <LinkIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Apresentação': <FileTextIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Aplicativo': <LinkIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Livro': <BookOpenIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Revista em Quadrinhos': <BookOpenIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Jogo Digital': <LinkIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Sequência Didática': <FileTextIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Automação de Processos Pedagógicos': <LinkIcon className="w-4 h-4 text-[#39A3B0]"/>,
        'Outro': <LinkIcon className="w-4 h-4 text-[#39A3B0]"/>,
    }
    return (
        <a 
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#034C83] hover:text-[#39A3B0] hover:underline transition-colors py-1"
        >
            {iconMap[product.type] || iconMap['Outro']}
            <span className="font-medium">{product.title}</span>
            <span className="text-[10px] text-gray-400 font-normal">({product.type})</span>
        </a>
    )
}

const DissertationCard: React.FC<DissertationCardProps> = ({ dissertation }) => {
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 mb-4 transform transition-shadow duration-300 hover:shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div className="flex-grow">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase rounded-full ${dissertation.status === 'concluded' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {dissertation.status === 'concluded' ? 'Concluída' : 'Em Andamento'}
                    </span>
                    <span className="bg-[#034C83] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                        {dissertation.advisor_role === 'orientador' ? 'Orientador' : 'Coorientador'}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-[#034C83]">{dissertation.title}</h3>
                <p className="text-gray-600 mt-1 font-medium italic">{dissertation.student_name} • {dissertation.year}</p>
                
                {/* Podcast Player */}
                {dissertation.podcast_url && (
                    <div className="mt-4 bg-gray-50 p-2 rounded-xl border border-gray-100 max-w-sm flex flex-col gap-1">
                        <div className="flex items-center gap-2 px-2 py-1">
                            <MicIcon className="w-3.5 h-3.5 text-[#39A3B0]" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Ouvir Podcast</span>
                        </div>
                        <audio controls className="w-full h-8 custom-audio-player">
                            <source src={dissertation.podcast_url} type="audio/mpeg" />
                            Seu navegador não suporta o elemento de áudio.
                        </audio>
                        <style>{`
                            .custom-audio-player::-webkit-media-controls-panel {
                                background-color: #f9fafb;
                            }
                            .custom-audio-player::-webkit-media-controls-play-button,
                            .custom-audio-player::-webkit-media-controls-current-time-display,
                            .custom-audio-player::-webkit-media-controls-time-remaining-display {
                                filter: invert(20%) sepia(80%) saturate(500%) hue-rotate(180deg);
                            }
                        `}</style>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0 sm:flex-shrink-0">
                <button 
                    onClick={() => setIsSummaryOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#39A3B0] rounded-lg hover:bg-[#2c8b96] transition-colors shadow-sm min-w-[44px] min-h-[44px] justify-center"
                >
                    <BookOpenIcon className="w-4 h-4" />
                    Resumo
                </button>
                {dissertation.pdf_url && (
                    <a href={dissertation.pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#034C83] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-w-[44px] min-h-[44px] justify-center">
                        <FileTextIcon className="w-4 h-4" />
                        PDF
                    </a>
                )}
            </div>
        </div>

        {dissertation.products && dissertation.products.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h4 className="font-bold text-sm text-gray-700 mb-3 uppercase tracking-wider">Produtos Educacionais</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {dissertation.products.map((product) => (
                <ProductLink key={product.id || Math.random()} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} title="Resumo da Dissertação">
        <p className="text-gray-700 leading-relaxed text-justify whitespace-pre-line">{dissertation.summary}</p>
      </Modal>
    </>
  );
};

export default DissertationCard;
