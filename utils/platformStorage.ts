import { Professor, Dissertation, Product } from '../types';

const STORAGE_KEY = 'profbio_platform_store_v2';

interface PlatformStore {
  modifiedProfessors: Record<string, Partial<Professor>>;
  customDissertations: Record<string, Dissertation[]>; // professor_id -> dissertations
  lastSavedAt: string | null;
}

const getInitialStore = (): PlatformStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao ler platformStorage:', e);
  }
  return {
    modifiedProfessors: {},
    customDissertations: {},
    lastSavedAt: null
  };
};

let memoryStore: PlatformStore = getInitialStore();

export const saveStore = (store: PlatformStore) => {
  memoryStore = store;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e);
  }
};

/**
 * Registra e arquiva alterações de perfil de um docente na plataforma
 */
export const registerProfessorUpdate = (
  professorId: string, 
  updates: Partial<Professor>
): PlatformStore => {
  const store = { ...memoryStore };
  const existing = store.modifiedProfessors[professorId] || {};
  
  store.modifiedProfessors[professorId] = {
    ...existing,
    ...updates,
    id: professorId
  };
  store.lastSavedAt = new Date().toISOString();
  saveStore(store);
  return store;
};

/**
 * Registra e arquiva uma dissertação/orientação para um docente
 */
export const registerDissertation = (
  professorId: string, 
  dissertation: Dissertation
): Dissertation[] => {
  const store = { ...memoryStore };
  const currentList = store.customDissertations[professorId] ? [...store.customDissertations[professorId]] : [];
  
  const existingIndex = currentList.findIndex(d => d.id === dissertation.id);
  if (existingIndex >= 0) {
    currentList[existingIndex] = dissertation;
  } else {
    currentList.unshift(dissertation);
  }
  
  store.customDissertations[professorId] = currentList;
  store.lastSavedAt = new Date().toISOString();
  saveStore(store);
  return currentList;
};

/**
 * Remove e arquiva a exclusão de uma orientação
 */
export const deleteRegisteredDissertation = (
  professorId: string, 
  dissertationId: string
): Dissertation[] => {
  const store = { ...memoryStore };
  const currentList = store.customDissertations[professorId] ? [...store.customDissertations[professorId]] : [];
  
  const filtered = currentList.filter(d => d.id !== dissertationId);
  store.customDissertations[professorId] = filtered;
  store.lastSavedAt = new Date().toISOString();
  saveStore(store);
  return filtered;
};

/**
 * Mescla os dados recebidos (do Supabase ou catálogo padrão) com os dados
 * arquivados e registrados na plataforma local
 */
export const mergeProfessorsWithPlatformStore = (
  baseProfessors: Professor[]
): Professor[] => {
  const store = memoryStore;

  return baseProfessors.map(prof => {
    const profUpdates = store.modifiedProfessors[prof.id] || {};
    const localDissertations = store.customDissertations[prof.id];

    // Mescla dissertações: as do banco de dados + as registradas localmente
    let mergedDissertations = [...(prof.dissertations || [])];
    
    if (localDissertations && localDissertations.length > 0) {
      // Se tiver dissertações registradas na plataforma, elas se sobrepõem ou completam
      const dissMap = new Map<string, Dissertation>();
      mergedDissertations.forEach(d => dissMap.set(d.id, d));
      localDissertations.forEach(d => dissMap.set(d.id, d));
      mergedDissertations = Array.from(dissMap.values());
    }

    // Ordenar decrescente por ano
    mergedDissertations.sort((a, b) => (b.year || 0) - (a.year || 0));

    return {
      ...prof,
      ...profUpdates,
      dissertations: mergedDissertations
    };
  });
};

export const getLastSavedAt = (): string | null => {
  return memoryStore.lastSavedAt;
};
