import React, { useState, useRef, useEffect } from 'react';
import { BotIcon, MessageSquareIcon, SendIcon, XIcon, SparklesIcon, FileTextIcon, ExternalLinkIcon, ChevronDownIcon } from './icons';

interface ChatReference {
  titulo: string;
  link: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  references?: ChatReference[];
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "Qual o prazo máximo para conclusão do mestrado?",
  "Como solicitar prorrogação de prazo?",
  "Quais são as regras para bolsa CAPES?",
  "Qual a frequência mínima obrigatória nas disciplinas?"
];

// Helper to format assistant text with markdown (bold, lists, paragraphs)
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const paragraphs = content.split(/\n\s*\n/);

  const formatInline = (text: string) => {
    // Split by bold (**text**)
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-gray-800">
      {paragraphs.map((paragraph, pIdx) => {
        const lines = paragraph.split('\n').filter(l => l.trim().length > 0);
        
        // Check if paragraph is a list of items
        const isList = lines.length > 0 && lines.every(line => /^\s*[-*•]\s+/.test(line));

        if (isList) {
          return (
            <ul key={pIdx} className="space-y-1.5 pl-4 list-disc marker:text-[#39A3B0]">
              {lines.map((line, lIdx) => {
                const itemContent = line.replace(/^\s*[-*•]\s+/, '');
                return <li key={lIdx}>{formatInline(itemContent)}</li>;
              })}
            </ul>
          );
        }

        // Check if paragraph contains some bullet items mixed in
        const hasBullets = lines.some(l => /^\s*[-*•]\s+/.test(l));
        if (hasBullets) {
          return (
            <div key={pIdx} className="space-y-1.5">
              {lines.map((line, lIdx) => {
                if (/^\s*[-*•]\s+/.test(line)) {
                  const itemContent = line.replace(/^\s*[-*•]\s+/, '');
                  return (
                    <div key={lIdx} className="flex items-start gap-2 pl-2">
                      <span className="text-[#39A3B0] font-bold mt-1 text-xs">•</span>
                      <span>{formatInline(itemContent)}</span>
                    </div>
                  );
                }
                return <p key={lIdx}>{formatInline(line)}</p>;
              })}
            </div>
          );
        }

        return (
          <p key={pIdx}>
            {formatInline(paragraph)}
          </p>
        );
      })}
    </div>
  );
};

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Olá! Sou o assistente virtual do **PROFBIO UFJF-GV**. Estou aqui para esclarecer suas dúvidas sobre normas regimentais, prazos de dissertação, bancas examinadoras, bolsas CAPES e regulamentos acadêmicos.\n\nComo posso ajudar você hoje?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openReferencesFor, setOpenReferencesFor] = useState<{ [msgId: string]: boolean }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setShowBadge(false);
      setTimeout(() => {
        scrollToBottom();
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('https://chatprofbio.sparklingtech.com.br/chat', {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mensagem: text })
      });

      if (!response.ok) {
        throw new Error(`Servidor retornou status ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.texto_resposta || 'Não foi possível obter uma resposta adequada para esta consulta no momento.',
        references: Array.isArray(data.referencias) ? data.referencias : undefined,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Erro na API de Chat:', err);
      const errorMessage: Message = {
        id: `assistant-error-${Date.now()}`,
        sender: 'assistant',
        text: 'Desculpe, ocorreu um erro ao consultar as normas do PROFBIO. Por favor, tente novamente em instantes.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'Olá! Conversa reiniciada. Em que posso te ajudar a respeito das normas e regimentos do PROFBIO?',
        timestamp: new Date()
      }
    ]);
  };

  const toggleReferences = (msgId: string) => {
    setOpenReferencesFor(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center">
        {/* Tooltip / Teaser Badge when closed */}
        {!isOpen && showBadge && (
          <div className="hidden sm:flex items-center gap-2 mr-3 px-3.5 py-2 bg-white text-[#034C83] rounded-full shadow-lg border border-gray-200 text-xs font-semibold animate-in fade-in slide-in-from-right-3 duration-300">
            <SparklesIcon className="w-4 h-4 text-[#39A3B0] animate-pulse" />
            <span>Tire dúvidas sobre o PROFBIO</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowBadge(false); }}
              className="text-gray-400 hover:text-gray-600 ml-1 p-0.5"
              aria-label="Fechar dica"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Fechar assistente virtual" : "Abrir assistente virtual"}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#39A3B0]/40 ${
            isOpen 
              ? 'bg-[#023b66] rotate-90' 
              : 'bg-[#034C83] hover:bg-[#023b66]'
          }`}
        >
          {isOpen ? (
            <XIcon className="w-6 h-6 transition-transform" />
          ) : (
            <div className="relative">
              <BotIcon className="w-7 h-7" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#034C83] rounded-full animate-pulse"></span>
            </div>
          )}
        </button>
      </div>

      {/* Mini Chat Screen */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl border border-gray-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-label="Assistente Virtual PROFBIO"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#034C83] to-[#0461a3] text-white p-4 flex items-center justify-between shadow-sm select-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white relative">
                <BotIcon className="w-6 h-6 text-[#72d6e3]" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#034C83] rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold text-base leading-snug tracking-tight flex items-center gap-1.5">
                  Assistente PROFBIO
                </h3>
                <p className="text-[11px] text-white/80 font-normal">
                  Regimentos & Normas Acadêmicas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title="Reiniciar conversa"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Reiniciar conversa"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Minimizar janela de chat"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-container">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[90%] shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[#034C83] text-white rounded-tr-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'assistant' ? (
                    <FormattedMessage content={msg.text} />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {/* Document references accordion */}
                  {msg.references && msg.references.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => toggleReferences(msg.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-[#034C83] hover:text-[#39A3B0] py-1 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileTextIcon className="w-3.5 h-3.5 text-[#39A3B0]" />
                          Documentos consultados ({msg.references.length})
                        </span>
                        <ChevronDownIcon 
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            openReferencesFor[msg.id] ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>

                      {openReferencesFor[msg.id] && (
                        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {msg.references.map((ref, idx) => (
                            <a
                              key={idx}
                              href={ref.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-blue-50/60 hover:bg-blue-100/70 border border-blue-100/80 text-xs text-[#034C83] transition-colors group"
                            >
                              <span className="truncate font-medium group-hover:underline">
                                {ref.titulo}
                              </span>
                              <ExternalLinkIcon className="w-3 h-3 text-[#39A3B0] flex-shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {/* Quick questions pills (shown after welcome message when conversation is short) */}
            {messages.length === 1 && !isLoading && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Dúvidas Frequentes:
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(question)}
                      className="text-left text-xs bg-white hover:bg-gray-100 text-[#034C83] hover:text-[#023b66] border border-gray-200 rounded-xl px-3 py-2 font-medium transition-all shadow-xs flex items-center justify-between group"
                    >
                      <span>{question}</span>
                      <span className="text-[#39A3B0] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-[#39A3B0] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-[#39A3B0] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-[#39A3B0] rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium pl-1">Consultando regimentos...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre prazos, bancas, bolsas..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none max-h-24 min-h-[42px] px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#39A3B0] focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-gray-900"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="w-10 h-10 rounded-xl bg-[#034C83] text-white flex items-center justify-center hover:bg-[#023b66] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                aria-label="Enviar mensagem"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Respostas fundamentadas nos documentos oficiais do PROFBIO.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
