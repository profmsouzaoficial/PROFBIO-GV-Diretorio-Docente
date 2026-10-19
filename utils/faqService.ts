import { supabase } from '../supabaseClient';
import type { PerguntaFrequente, ChatResponseJson } from '../types';

// Stop words comuns da língua portuguesa para o cálculo semântico
const PORTUGUESE_STOP_WORDS = new Set([
  'o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'para', 'pra', 'por', 'com',
  'um', 'uma', 'uns', 'umas', 'e', 'ou', 'que', 'se', 'como',
  'qual', 'quais', 'onde', 'quando', 'quem', 'quanto', 'quantos',
  'por que', 'porque', 'sobre', 'ao', 'aos', 'meu', 'minha'
]);

// Normaliza o texto removendo acentos, pontuações e espaços extras
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos/acentos
    .replace(/[^\w\s]/g, ' ') // remove pontuações
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrai tokens relevantes (sem stop words e palavras de 1 letra)
export function getSignificantTokens(text: string): string[] {
  const norm = normalizeText(text);
  return norm
    .split(' ')
    .filter(word => word.length > 1 && !PORTUGUESE_STOP_WORDS.has(word));
}

// Gera n-grams de caracteres para comparação aproximada de frases
function getCharNgrams(str: string, n = 2): Set<string> {
  const padded = ` ${str} `;
  const ngrams = new Set<string>();
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

// Coeficiente Dice-Sørensen entre duas cadeias
export function diceCoefficient(a: string, b: string): number {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  if (a === b) return 1.0;

  const bigramsA = getCharNgrams(a, 2);
  const bigramsB = getCharNgrams(b, 2);
  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  const denom = bigramsA.size + bigramsB.size;
  return denom === 0 ? 0 : (2 * intersection) / denom;
}

// Distância de Levenshtein normalizada (0 a 1)
export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a.length) return b.length === 0 ? 1.0 : 0.0;
  if (!b.length) return 0.0;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return 1 - matrix[a.length][b.length] / maxLen;
}

// Similaridade de tokens de conteúdo significativos
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = getSignificantTokens(a);
  const tokensB = getSignificantTokens(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let matches = 0;
  for (const tok of setA) {
    if (setB.has(tok)) {
      matches++;
    } else {
      // tolerância a pequenas variações morfológicas (ex: concluir vs conclusao)
      for (const tokB of setB) {
        if (diceCoefficient(tok, tokB) >= 0.78) {
          matches += 0.9;
          break;
        }
      }
    }
  }

  const denom = Math.max(setA.size, setB.size);
  return denom === 0 ? 0 : matches / denom;
}

/**
 * Calcula a similaridade semântica / textual entre duas perguntas (retorna valor de 0 a 1).
 * Considera igualdade normalizada, n-grams, tokens de conteúdo e distância de edição.
 */
export function calculateSemanticSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  if (!norm1 || !norm2) return 0.0;
  if (norm1 === norm2) return 1.0;

  const levSim = levenshteinSimilarity(norm1, norm2);
  const diceSim = diceCoefficient(norm1, norm2);
  const tokSim = tokenSimilarity(norm1, norm2);

  // Se os tokens principais baterem completamente (> 0.90) e o Dice for alto, similaridade excelente
  if (tokSim >= 0.95 && diceSim >= 0.85) {
    return Math.max(0.92, (tokSim * 0.5) + (diceSim * 0.4) + (levSim * 0.1));
  }

  // Média ponderada dando maior peso aos tokens de conteúdo e aos n-grams
  const blended = (tokSim * 0.50) + (diceSim * 0.35) + (levSim * 0.15);
  return Math.min(1.0, Math.max(levSim, diceSim, blended));
}

// Função utilitária de embaralhamento (Fisher-Yates)
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sorteia aleatoriamente 5 perguntas organizadas pela coluna 'frequencia'.
 * Realiza sorteio entre as perguntas empatadas para completar as 5 perguntas no total.
 */
export function selectTop5WithTies(items: PerguntaFrequente[]): PerguntaFrequente[] {
  if (!items || items.length === 0) return [];
  if (items.length <= 5) return shuffleArray(items);

  // Agrupa as perguntas pela sua frequência
  const groups = new Map<number, PerguntaFrequente[]>();
  for (const item of items) {
    const freq = Number(item.frequencia) || 0;
    if (!groups.has(freq)) {
      groups.set(freq, []);
    }
    groups.get(freq)!.push(item);
  }

  // Ordena as frequências de forma decrescente (as mais frequentes primeiro)
  const sortedFreqs = Array.from(groups.keys()).sort((a, b) => b - a);

  const selected: PerguntaFrequente[] = [];

  for (const freq of sortedFreqs) {
    const group = groups.get(freq)!;
    const slotsNeeded = 5 - selected.length;
    if (slotsNeeded <= 0) break;

    if (group.length <= slotsNeeded) {
      // Todo o grupo cabe, adiciona com embaralhamento interno
      selected.push(...shuffleArray(group));
    } else {
      // O grupo tem mais perguntas do que vagas disponíveis:
      // Realiza sorteio aleatório entre as perguntas empatadas nessa frequência!
      const shuffledGroup = shuffleArray(group);
      selected.push(...shuffledGroup.slice(0, slotsNeeded));
      break;
    }
  }

  return selected;
}

/**
 * Busca a melhor pergunta no banco de dados com similaridade >= threshold (90%)
 */
export function findBestMatchingFaq(
  userQuery: string,
  faqs: PerguntaFrequente[],
  threshold = 0.90
): { faq: PerguntaFrequente; similarity: number } | null {
  if (!userQuery || !faqs || faqs.length === 0) return null;

  let bestMatch: PerguntaFrequente | null = null;
  let bestSim = 0;

  for (const item of faqs) {
    if (!item.pergunta) continue;
    const sim = calculateSemanticSimilarity(userQuery, item.pergunta);
    if (sim > bestSim) {
      bestSim = sim;
      bestMatch = item;
    }
  }

  if (bestMatch && bestSim >= threshold) {
    return { faq: bestMatch, similarity: bestSim };
  }

  return null;
}

/**
 * Converte com segurança o campo resposta para ChatResponseJson
 */
export function parseFaqResponse(raw: any): ChatResponseJson {
  if (!raw) {
    return {
      texto_resposta: 'Não foi possível carregar a resposta para esta pergunta no momento.',
      referencias: []
    };
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parseFaqResponse(parsed);
    } catch {
      return {
        texto_resposta: raw,
        referencias: []
      };
    }
  }

  return {
    texto_resposta: raw.texto_resposta || raw.text || raw.resposta || String(raw),
    referencias: Array.isArray(raw.referencias) ? raw.referencias : []
  };
}

// Perguntas iniciais oficiais fundamentadas nas normas do PROFBIO para seeding e fallback
export const INITIAL_SEED_FAQS: PerguntaFrequente[] = [
  {
    id: 'seed-1',
    pergunta: 'Quais são as modalidades de acesso da dissertação na página pública?',
    resposta: {
      texto_resposta: '# Modalidades de acesso da dissertação na página pública\n\nApós a conclusão do curso e a finalização de todas as etapas do processo, a dissertação será exibida na página pública conforme a modalidade de acesso autorizada no sistema. Conforme o **TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO.pdf** e o **TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO_-_COORDENACAO_LOCAL.pdf**, são três modalidades:\n\n## 1. Acesso Aberto\n\n**Disponibilização imediata do trabalho para acesso mundial.**\n\n## 2. Acesso Embargado\n\n**Trabalho indisponível durante o período de embargo (36 meses)**, por motivo de registro de patente. Após o término do prazo estipulado, fica **automaticamente autorizado o acesso mundial**.\n\n## 3. Acesso Restrito\n\n**Disponibilização parcial do trabalho por até 12 meses**, a contar da data da defesa, **podendo ser renovado**. Nessa modalidade, deverá ser encaminhada também a **versão eletrônica do trabalho sem os itens interditados** (versão restrita).\n\n---\n\n**Resumo:**\n\n| Modalidade | Prazo | Característica |\n|---|---|---|\n| **Acesso Aberto** | Imediato | Disponibilização imediata para acesso mundial |\n| **Acesso Embargado** | 36 meses | Indisponível por motivo de registro de patente; após o prazo, liberação automática |\n| **Acesso Restrito** | Até 12 meses (renovável) | Disponibilização parcial; exige envio da versão restrita sem os itens interditados |\n\n*Fonte: TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO.pdf e TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO_-_COORDENACAO_LOCAL.pdf.*',
      referencias: [
        {
          titulo: 'TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO.PDF?src=31436'
        },
        {
          titulo: 'TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO_-_COORDENACAO_LOCAL.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO_-_COORDENACAO_LOCAL.PDF?src=3412'
        },
        {
          titulo: 'DISCENTES.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/DISCENTES.PDF?src=10400'
        },
        {
          titulo: 'REGIMENTO_GERAL_PROFBIO_2025.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/REGIMENTO_GERAL_PROFBIO_2025.PDF?src=18204'
        }
      ]
    },
    frequencia: 1
  },
  {
    id: 'seed-2',
    pergunta: 'Qual o prazo máximo para conclusão do mestrado?',
    resposta: {
      texto_resposta: '# Prazo para Conclusão do Mestrado (PROFBIO)\n\nConforme o **Regimento Geral do PROFBIO (2025)** e as normas acadêmicas vigentes:\n\n- O prazo regular para a conclusão do curso de Mestrado Profissional em Ensino de Biologia em Rede Nacional (PROFBIO) é de **24 (vinte e quatro) meses**, contados a partir da data da matrícula inicial do discente.\n- Em situações excepcionais e devidamente justificadas, com parecer favorável do orientador, o discente poderá solicitar prorrogação de prazo junto ao Colegiado Delegado / Coordenação Local, respeitado o limite regulamentar do programa.',
      referencias: [
        {
          titulo: 'REGIMENTO_GERAL_PROFBIO_2025.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/REGIMENTO_GERAL_PROFBIO_2025.PDF?src=18204'
        },
        {
          titulo: 'DISCENTES.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/DISCENTES.PDF?src=10400'
        }
      ]
    },
    frequencia: 1
  },
  {
    id: 'seed-3',
    pergunta: 'Como solicitar prorrogação de prazo para a defesa da dissertação?',
    resposta: {
      texto_resposta: '# Solicitação de Prorrogação de Prazo para Defesa\n\nPara solicitar prorrogação do prazo para conclusão e defesa da dissertação no PROFBIO:\n\n1. O discente deve formalizar o pedido à Coordenação da Associação Local via formulário/requerimento institucional.\n2. O requerimento deve conter a **justificativa fundamentada**, o **cronograma detalhado** das atividades pendentes e a **anuência expressa do orientador**.\n3. O pedido é submetido à análise e deliberação da Comissão Gestora / Colegiado Local.\n4. Recomenda-se encaminhar a solicitação com antecedência mínima de 30 a 60 dias antes do encerramento do prazo regulamentar.',
      referencias: [
        {
          titulo: 'REGIMENTO_GERAL_PROFBIO_2025.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/REGIMENTO_GERAL_PROFBIO_2025.PDF?src=18204'
        },
        {
          titulo: 'TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/TUTOTIAL_DO_SISTEMA_OPERACIONAL_DO_PROFBIO.PDF?src=31436'
        }
      ]
    },
    frequencia: 1
  },
  {
    id: 'seed-4',
    pergunta: 'Quais são as regras para concessão e manutenção de bolsa CAPES?',
    resposta: {
      texto_resposta: '# Regras de Concessão e Manutenção de Bolsa CAPES\n\nConforme as diretrizes da **Portaria CAPES 209** e os regulamentos do PROFBIO:\n\n- O bolsista deve dedicar-se às atividades do curso e da docência na Educação Básica conforme edital específico.\n- Manter rendimento acadêmico satisfatório sem reprovação em disciplinas.\n- Comprovar proficiência em língua estrangeira nos prazos regimentais.\n- Cumprir os prazos de qualificação do projeto e de defesa da dissertação e produto educacional.',
      referencias: [
        {
          titulo: 'PORTARIA_CAPES_209.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/PORTARIA_CAPES_209.PDF?src=6811'
        },
        {
          titulo: 'REGIMENTO_GERAL_PROFBIO_2025.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/REGIMENTO_GERAL_PROFBIO_2025.PDF?src=18204'
        }
      ]
    },
    frequencia: 1
  },
  {
    id: 'seed-5',
    pergunta: 'Qual a frequência mínima obrigatória nas disciplinas do PROFBIO?',
    resposta: {
      texto_resposta: '# Frequência Mínima Obrigatória nas Disciplinas\n\nDe acordo com o **Regimento Geral do PROFBIO**:\n\n- É obrigatória a frequência mínima de **75% (setenta e cinco por cento)** da carga horária programada em cada disciplina ou atividade acadêmica.\n- O não atendimento à frequência mínima enseja reprovação por infrequência (conceito I ou equivalente), com as sanções regimentais correspondentes.',
      referencias: [
        {
          titulo: 'REGIMENTO_GERAL_PROFBIO_2025.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/REGIMENTO_GERAL_PROFBIO_2025.PDF?src=18204'
        },
        {
          titulo: 'DISCENTES.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/DISCENTES.PDF?src=10400'
        }
      ]
    },
    frequencia: 1
  },
  {
    id: 'seed-6',
    pergunta: 'Até quando o discente deve comprovar proficiência em língua estrangeira?',
    resposta: {
      texto_resposta: '# Comprovação de Proficiência em Língua Estrangeira\n\nConforme o **Regimento Geral do PROFBIO** e normas locais:\n\n- O discente deve comprovar proficiência em língua inglesa preferencialmente no primeiro ano de curso, sendo pré-requisito indispensável para a realização do Exame de Qualificação do Projeto de Dissertação e para a homologação do título de mestre.',
      referencias: [
        {
          titulo: 'REGIMENTO_GERAL_PROFBIO_2025.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/REGIMENTO_GERAL_PROFBIO_2025.PDF?src=18204'
        },
        {
          titulo: 'DISCENTES.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/DISCENTES.PDF?src=10400'
        }
      ]
    },
    frequencia: 1
  },
  {
    id: 'seed-7',
    pergunta: 'Como funciona a prorrogação da bolsa em caso de licença-maternidade?',
    resposta: {
      texto_resposta: '# Prorrogação de Bolsa em Caso de Licença-Maternidade\n\nDe acordo com a **Portaria CAPES 209** e normas de direitos das discentes:\n\n- Em caso de parto, adoção ou guarda judicial ocorrida durante a vigência da bolsa, o prazo regulamentar da bolsa de estudo poderá ser prorrogado por até **4 (quatro) meses** (120 dias).\n- O benefício deve ser solicitado mediante apresentação da certidão de nascimento ou termo judicial de adoção à coordenação do curso.',
      referencias: [
        {
          titulo: 'PORTARIA_CAPES_209.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/PORTARIA_CAPES_209.PDF?src=6811'
        },
        {
          titulo: 'REGIMENTO_GERAL_PROFBIO_2025.pdf',
          link: 'https://sistemaprofbio.icb.ufmg.br/adm/docshp/REGIMENTO_GERAL_PROFBIO_2025.PDF?src=18204'
        }
      ]
    },
    frequencia: 1
  }
];

/**
 * Carrega a lista completa de perguntas frequentes do Supabase.
 * Se a tabela estiver vazia, faz o seed automático e retorna as perguntas.
 */
export async function fetchFaqsFromSupabase(): Promise<PerguntaFrequente[]> {
  try {
    console.log('[Supabase PROFBIO] Conectando ao projeto zvrrrakybjzelyavrqhc (tabela perguntas_frequentes)...');
    const { data, error } = await supabase
      .from('perguntas_frequentes')
      .select('*')
      .order('frequencia', { ascending: false });

    if (error) {
      console.warn('[Supabase PROFBIO] Erro ao buscar perguntas_frequentes:', error.message);
    }

    if (!error && data && data.length > 0) {
      console.log(`[Supabase PROFBIO] ${data.length} perguntas carregadas com sucesso da tabela perguntas_frequentes do seu banco:`, data.map(d => d.pergunta));
      return data.map(row => ({
        id: row.id,
        pergunta: row.pergunta,
        resposta: parseFaqResponse(row.resposta),
        frequencia: Number(row.frequencia) || 1,
        created_at: row.created_at
      }));
    }

    // Se o banco estiver vazio ou sem linhas ainda, tenta semear com as perguntas iniciais
    if (!error && (!data || data.length === 0)) {
      console.log('[Supabase PROFBIO] Tabela perguntas_frequentes está vazia. Tentando semear perguntas iniciais...');
      try {
        const seedPayload = INITIAL_SEED_FAQS.map(item => ({
          pergunta: item.pergunta,
          resposta: item.resposta,
          frequencia: item.frequencia || 1
        }));
        const { data: insertedData, error: insertError } = await supabase
          .from('perguntas_frequentes')
          .insert(seedPayload)
          .select();

        if (!insertError && insertedData && insertedData.length > 0) {
          console.log(`[Supabase PROFBIO] ${insertedData.length} perguntas iniciais semeadas no seu banco.`);
          return insertedData.map(row => ({
            id: row.id,
            pergunta: row.pergunta,
            resposta: parseFaqResponse(row.resposta),
            frequencia: Number(row.frequencia) || 1,
            created_at: row.created_at
          }));
        }
      } catch {
        // Ignora se RLS estiver ativo e aguardando política
      }
    }
  } catch (err) {
    console.warn('[Supabase PROFBIO] Exceção ao consultar perguntas_frequentes no Supabase:', err);
  }

  console.log('[Supabase PROFBIO] Usando fallback em memória de perguntas frequentes.');
  return INITIAL_SEED_FAQS.map(item => ({
    ...item,
    resposta: parseFaqResponse(item.resposta)
  }));
}

/**
 * Incrementa a frequência de uma pergunta no Supabase (+1)
 */
export async function incrementFaqFrequency(faq: PerguntaFrequente): Promise<number> {
  const newFreq = (Number(faq.frequencia) || 1) + 1;
  faq.frequencia = newFreq; // atualiza na memória imediatamente

  if (faq.id && String(faq.id).startsWith('seed-') === false) {
    try {
      await supabase
        .from('perguntas_frequentes')
        .update({ frequencia: newFreq })
        .eq('id', faq.id);
    } catch (err) {
      console.warn('Erro ao incrementar frequência no Supabase:', err);
    }
  }

  return newFreq;
}

/**
 * Envia uma pergunta para o DeepSeek (via endpoint oficial do PROFBIO)
 * solicitando uma versão enxuta e culta da pergunta original feita pelo usuário.
 */
export async function refineQuestionWithDeepSeek(originalQuery: string): Promise<string> {
  const trimmed = originalQuery.trim();
  if (!trimmed) return originalQuery;

  try {
    const prompt = `Reescreva apenas a seguinte pergunta na norma culta da língua portuguesa, de forma direta e enxuta, sem introdução e sem responder: "${trimmed}"`;

    const response = await fetch('https://chatprofbio.sparklingtech.com.br/chat', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mensagem: prompt })
    });

    if (response.ok) {
      const data = await response.json();
      let refined = (data.texto_resposta || '').trim();

      // Limpa aspas, travessões ou eventuais prefixos como "Pergunta:"
      refined = refined
        .replace(/^["'«»“](.*)["'«»”]$/s, '$1')
        .replace(/^(pergunta|reescrita|versao culta|versão culta):\s*/i, '')
        .trim();

      if (refined.length > 5) {
        if (!refined.endsWith('?') && !refined.endsWith('.')) {
          refined += '?';
        }
        return refined;
      }
    }
  } catch (err) {
    console.warn('Falha na chamada DeepSeek para refino da pergunta:', err);
  }

  // Fallback caso a requisição falhe: formata a pergunta original
  let fallback = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (!fallback.endsWith('?')) fallback += '?';
  return fallback;
}

/**
 * Salva uma nova pergunta e sua resposta oficial no banco de dados Supabase:
 * - Refina a pergunta para a norma culta via DeepSeek
 * - Frequência inicial = 1
 * - JSON da resposta na coluna 'resposta'
 */
export async function saveNewFaq(
  originalQuery: string,
  answerJson: ChatResponseJson,
  existingFaqs: PerguntaFrequente[]
): Promise<PerguntaFrequente | null> {
  try {
    // 1. Gera versão culta e enxuta
    const refinedQuestion = await refineQuestionWithDeepSeek(originalQuery);

    // 2. Se já existir pergunta idêntica ou quase idêntica no banco, só incrementa a existente
    const match = findBestMatchingFaq(refinedQuestion, existingFaqs, 0.95);
    if (match) {
      await incrementFaqFrequency(match.faq);
      return match.faq;
    }

    // 3. Insere a nova pergunta no Supabase
    const payload = {
      pergunta: refinedQuestion,
      resposta: answerJson,
      frequencia: 1
    };

    const { data, error } = await supabase
      .from('perguntas_frequentes')
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      const createdItem: PerguntaFrequente = {
        id: data.id,
        pergunta: data.pergunta,
        resposta: parseFaqResponse(data.resposta),
        frequencia: Number(data.frequencia) || 1,
        created_at: data.created_at
      };
      existingFaqs.unshift(createdItem);
      return createdItem;
    }

    // Se o banco estiver com RLS pendente, adiciona na memória para a sessão atual
    const inMemoryItem: PerguntaFrequente = {
      id: `local-${Date.now()}`,
      pergunta: refinedQuestion,
      resposta: answerJson,
      frequencia: 1
    };
    existingFaqs.unshift(inMemoryItem);
    return inMemoryItem;
  } catch (err) {
    console.warn('Aviso ao salvar nova pergunta frequente:', err);
    return null;
  }
}
