import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SendIcon, XIcon, SparklesIcon, FileTextIcon, ExternalLinkIcon, ChevronDownIcon } from './icons';
import { supabase } from '../supabaseClient';
import { marked } from 'marked';

interface ChatReference {
  titulo: string;
  link: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  fullText?: string;
  references?: ChatReference[];
  timestamp: Date;
  isTyping?: boolean;
}

const QUICK_QUESTIONS = [
  "Qual o prazo máximo para conclusão do mestrado?",
  "Como solicitar prorrogação de prazo?",
  "Quais são as regras para bolsa CAPES?",
  "Qual a frequência mínima obrigatória nas disciplinas?"
];

// Imagem fixa da Fachada da Secretaria Virtual solicitada para o cabeçalho
const HEADER_BANNER_URL = "https://zvrrrakybjzelyavrqhc.supabase.co/storage/v1/object/public/secretaria_virtual/faxada-secretaria-virtual.jpeg";

// Lista com todos os 16 avatares virtuais realistas do bucket secretaria_virtual
const DEFAULT_VIRTUAL_AVATARS = [
  'secretario_01.png',
  'secretario_02.png',
  'secretario_03.png',
  'secretario_04.png',
  'secretario_05.png',
  'secretario_06.png',
  'secretario_07.png',
  'secretario_08.png',
  'secretario_09.png',
  'secretario_10.png',
  'secretario_11.png',
  'secretario_12.png',
  'secretario_13.png',
  'secretario_14.png',
  'secretario_15.png',
  'secretario_16.png'
];

const getSupabaseAvatarUrl = (fileName: string) => {
  const { data } = supabase.storage.from('secretaria_virtual').getPublicUrl(fileName);
  return data.publicUrl;
};

const getRandomAvatarUrl = () => {
  const randomFile = DEFAULT_VIRTUAL_AVATARS[Math.floor(Math.random() * DEFAULT_VIRTUAL_AVATARS.length)];
  return getSupabaseAvatarUrl(randomFile);
};

// Fallback caso alguma imagem do bucket falhe
const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&auto=format&fit=crop";

// Configurações do parser Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

const FormattedMessage: React.FC<{ 
  content: string; 
  isTyping?: boolean;
  onSkip?: () => void;
}> = ({ content, isTyping, onSkip }) => {
  const htmlContent = useMemo(() => {
    try {
      return marked.parse(content || '', { async: false, breaks: true, gfm: true }) as string;
    } catch {
      return content || '';
    }
  }, [content]);

  return (
    <div className="relative">
      <div 
        className="chat-markdown"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      {isTyping && (
        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-xs select-none">
          <span className="flex items-center gap-1.5 text-[#034C83] font-medium text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39A3B0] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#034C83]"></span>
            </span>
            Digitando resposta...
          </span>
          {onSkip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSkip();
              }}
              className="text-[11px] text-[#034C83] hover:text-[#39A3B0] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
              title="Exibir resposta completa imediatamente"
            >
              Exibir tudo
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string>(() => getRandomAvatarUrl());

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Olá! Faço parte da secretaria virtual do **PROFBIO UFJF-GV**. Estou aqui para esclarecer suas dúvidas sobre normas regimentais, prazos de dissertação, bancas examinadoras, bolsas CAPES e regulamentos acadêmicos.\n\nComo posso ajudar você hoje?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [openReferencesFor, setOpenReferencesFor] = useState<{ [msgId: string]: boolean }>({});

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tentativa de carregar dinamicamente a lista de avatares caso o bucket tenha novas imagens ou RLS SELECT habilitado
  useEffect(() => {
    let isMounted = true;
    const fetchStorageAvatars = async () => {
      try {
        const { data, error } = await supabase.storage.from('secretaria_virtual').list();
        if (!error && data && data.length > 0 && isMounted) {
          const validImages = data.filter(f => f.name && !f.name.startsWith('.') && /\.(jpe?g|png|webp|gif)$/i.test(f.name));
          if (validImages.length > 0) {
            const picked = validImages[Math.floor(Math.random() * validImages.length)].name;
            const fullUrl = getSupabaseAvatarUrl(picked);
            setAvatarUrl(fullUrl);
          }
        }
      } catch {
        // Mantém a seleção randômica dos avatares pré-definidos
      }
    };
    fetchStorageAvatars();
    return () => { isMounted = false; };
  }, []);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const maybeAutoScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Só acompanha se o usuário já estiver bem próximo do final (<= 60px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
    if (isNearBottom) {
      chatContainerRef.current.scrollTop = scrollHeight;
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  // Ao abrir o chatbot, garante que a barra de rolagem fique no início para leitura
  useEffect(() => {
    if (isOpen) {
      setShowBadge(false);
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }
      const timer = setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSkipTyping = (msgId: string, fullText: string) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, text: fullText, isTyping: false } : m)
    );
    setIsTyping(false);
  };

  const startTypewriter = (fullText: string, references?: ChatReference[]) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const msgId = `assistant-${Date.now()}`;
    const initialMessage: Message = {
      id: msgId,
      sender: 'assistant',
      text: '',
      fullText,
      references,
      timestamp: new Date(),
      isTyping: true
    };

    setMessages(prev => [...prev, initialMessage]);
    setIsTyping(true);

    const totalChars = fullText.length;
    // Cadência de digitação fluida e claramente visível (~1.6s a 2.8s)
    const intervalMs = 28;
    const targetDurationMs = Math.min(2800, Math.max(1400, totalChars * 2.0));
    const totalSteps = targetDurationMs / intervalMs;
    const stepSize = Math.max(2, Math.ceil(totalChars / totalSteps));
    let currentLength = 0;

    typingTimerRef.current = setInterval(() => {
      currentLength += stepSize;
      if (currentLength >= totalChars) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setMessages(prev =>
          prev.map(m => m.id === msgId ? { ...m, text: fullText, isTyping: false } : m)
        );
        setIsTyping(false);
      } else {
        const partial = fullText.slice(0, currentLength);
        setMessages(prev =>
          prev.map(m => m.id === msgId ? { ...m, text: partial } : m)
        );
      }
      maybeAutoScroll();
    }, intervalMs);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading || isTyping) return;

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
      setMessages(prev => prev.map(m => m.isTyping ? { ...m, isTyping: false } : m));
      setIsTyping(false);
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Rola suavemente para baixo para mostrar a mensagem do usuário e o loader
    setTimeout(() => {
      scrollToBottom();
    }, 50);

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
      const fullAnswer = data.texto_resposta || 'Não foi possível obter uma resposta adequada para esta consulta no momento.';
      const refs = Array.isArray(data.referencias) ? data.referencias : undefined;

      // Inicia o efeito de digitação nítido e fluido
      startTypewriter(fullAnswer, refs);
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
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'Olá! Faço parte da secretaria virtual do **PROFBIO UFJF-GV**. Estou aqui para esclarecer suas dúvidas sobre normas regimentais, prazos de dissertação, bancas examinadoras, bolsas CAPES e regulamentos acadêmicos.\n\nComo posso ajudar você hoje?',
        timestamp: new Date()
      }
    ]);
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
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
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#39A3B0]/40 relative overflow-visible ${
            isOpen 
              ? 'bg-[#023b66] rotate-90' 
              : 'bg-white p-0.5 border-2 border-[#034C83] ring-2 ring-[#39A3B0]/30'
          }`}
        >
          {isOpen ? (
            <XIcon className="w-6 h-6 transition-transform text-white" />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center overflow-visible">
              {/* Foto do avatar em container circular com overflow-hidden restrito apenas à foto */}
              <div className="w-full h-full rounded-full aspect-square overflow-hidden flex items-center justify-center bg-gray-100">
                <img 
                  src={avatarUrl} 
                  alt="Assistente Virtual PROFBIO" 
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FALLBACK_AVATAR) {
                      target.src = FALLBACK_AVATAR;
                    }
                  }}
                  className="w-full h-full object-cover aspect-square rounded-full block select-none"
                  loading="eager"
                />
              </div>
              {/* Bolinha pulsante completa, sobreposta com z-30 sem nenhum corte pelo círculo da foto */}
              <span className="absolute -bottom-0.5 -right-0.5 z-30 flex h-4 w-4 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-md"></span>
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Mini Chat Screen */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[calc(100vh-6.5rem)] bg-white rounded-2xl shadow-2xl border border-gray-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-label="Secretaria Virtual PROFBIO"
        >
          {/* Header com a Imagem Fixa da Fachada da Secretaria Virtual */}
          <div className="relative w-full h-32 sm:h-36 bg-[#034C83] overflow-hidden flex-shrink-0 select-none border-b border-gray-200/80 shadow-xs">
            <img 
              src={HEADER_BANNER_URL} 
              alt="Secretaria Virtual PROFBIO" 
              className="w-full h-full object-cover object-center block"
              loading="eager"
            />
            {/* Gradiente sutil superior para contraste nítido dos botões de ação */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none" />

            {/* Botões de Ação Flutuantes (Reiniciar Conversa e Fechar Janela) */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
              <button
                onClick={handleClearHistory}
                title="Reiniciar conversa"
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-95 border border-white/25"
                aria-label="Reiniciar conversa"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Fechar janela de chat"
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-95 border border-white/25"
                aria-label="Minimizar janela de chat"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-container"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start items-start gap-2.5'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full aspect-square overflow-hidden border border-gray-200 shadow-2xs flex-shrink-0 mt-0.5 bg-white">
                    <img
                      src={avatarUrl}
                      alt="Assistente"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== FALLBACK_AVATAR) {
                          target.src = FALLBACK_AVATAR;
                        }
                      }}
                      className="w-full h-full object-cover aspect-square rounded-full block"
                    />
                  </div>
                )}
                <div
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start max-w-[85%]'}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#034C83] text-white rounded-tr-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none w-full'
                    }`}
                  >
                    {msg.sender === 'assistant' ? (
                      <FormattedMessage 
                        content={msg.text} 
                        isTyping={msg.isTyping} 
                        onSkip={msg.isTyping && msg.fullText ? () => handleSkipTyping(msg.id, msg.fullText!) : undefined}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {/* Document references accordion (exibido apenas quando a mensagem termina de ser digitada) */}
                    {!msg.isTyping && msg.references && msg.references.length > 0 && (
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
              </div>
            ))}

            {/* Quick questions pills (mostradas após mensagem inicial quando não está digitando) */}
            {messages.length === 1 && !isLoading && !isTyping && (
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
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full aspect-square overflow-hidden border border-gray-200 shadow-2xs flex-shrink-0 mt-0.5 bg-white">
                  <img
                    src={avatarUrl}
                    alt="Assistente"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== FALLBACK_AVATAR) {
                        target.src = FALLBACK_AVATAR;
                      }
                    }}
                    className="w-full h-full object-cover aspect-square rounded-full block"
                  />
                </div>
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
                disabled={isLoading || isTyping}
                className="flex-1 resize-none max-h-24 min-h-[42px] px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#39A3B0] focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-gray-900 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isLoading || isTyping || !inputText.trim()}
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
