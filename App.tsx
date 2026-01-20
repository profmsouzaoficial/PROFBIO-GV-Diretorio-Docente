
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ProfessorsList from './components/ProfessorsList';
import ProfessorDetail from './components/ProfessorDetail';
import Auth from './components/Auth';
import EditProfile from './components/EditProfile';
import { Professor } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './supabaseClient';
import { professorsData } from './data';

interface ViewState {
  page: 'home' | 'login' | 'editProfile';
  params?: { [key: string]: any };
}

const AppContent: React.FC = () => {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfessorId, setSelectedProfessorId] = useState<string | null>(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const [view, setView] = useState<ViewState>({ page: 'home' });

  const { session } = useAuth();

  const fetchProfessors = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      
      const { data, error: dbError } = await supabase
        .from('professors')
        .select(`
          *,
          dissertations (
            *,
            products (*)
          )
        `)
        .order('name', { ascending: true });
      
      if (dbError) {
        console.warn("Database error encountered. Falling back to local data:", dbError);
        setProfessors(professorsData as Professor[]);
        setError("Nota: Conexão com banco de dados indisponível. Exibindo dados de demonstração.");
        return;
      }

      if (!data || data.length === 0) {
        setProfessors(professorsData as Professor[]);
        return;
      }

      const sortedData = data.map(prof => ({
          ...prof,
          dissertations: (prof.dissertations || []).sort((a: any, b: any) => (b.year || 0) - (a.year || 0))
      }));

      setProfessors(sortedData as Professor[]);
    } catch (err: any) {
      console.error("Unexpected error fetching professors:", err);
      setProfessors(professorsData as Professor[]);
      setError("Erro ao carregar dados remotos. Exibindo catálogo local.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfessors();
  }, [fetchProfessors]);

  useEffect(() => {
    if (session && view.page === 'login') {
      setView({ page: 'home' });
    }
    if (!session && view.page === 'editProfile') {
        setView({ page: 'home' });
    }
  }, [session, view.page]);

  useEffect(() => {
    if (view.page === 'home' && !selectedProfessorId && !isLoading && professors.length > 0) {
        if (window.innerWidth >= 768) {
            setSelectedProfessorId(professors[0].id);
        }
    }
  }, [view.page, professors, selectedProfessorId, isLoading]);

  const selectedProfessor = useMemo(() => {
    if (!selectedProfessorId) return null;
    return professors.find(p => p.id === selectedProfessorId) || null;
  }, [selectedProfessorId, professors]);

  const handleSelectProfessor = (id: string) => {
    setSelectedProfessorId(id);
    setIsListOpen(false);
  };
  
  const handleMenuClick = () => setIsListOpen(!isListOpen);
  const handleBackdropClick = () => isListOpen && setIsListOpen(false);
  const handleNavigate = (page: string, params = {}) => setView({ page: page as ViewState['page'], params });
  
  const renderLoading = () => (
    <div className="flex-grow flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#39A3B0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#034C83] font-medium animate-pulse">Carregando Corpo Docente...</p>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isLoading && view.page === 'home') return renderLoading();

    switch (view.page) {
      case 'login':
        return <Auth onNavigate={handleNavigate} />;
      case 'editProfile':
        const currentUserProf = professors.find(p => p.user_id === session?.user?.id);
        const isAdmin = currentUserProf?.is_admin === true;
        
        // Se for admin e tiver um professorId nos params, edita o selecionado.
        // Caso contrário, edita o perfil do próprio usuário logado.
        const professorToEdit = (isAdmin && view.params?.professorId) 
          ? professors.find(p => p.id === view.params?.professorId)
          : currentUserProf;

        return (
          <EditProfile 
            professor={professorToEdit} 
            onNavigate={handleNavigate} 
            onRefresh={() => fetchProfessors(false)} 
          />
        );
      case 'home':
      default:
        return (
          <div className="flex-grow flex relative overflow-hidden">
            {isListOpen && <div onClick={handleBackdropClick} className="fixed inset-0 bg-black/30 z-10 md:hidden" />}
            <ProfessorsList
              professors={professors}
              selectedProfessorId={selectedProfessorId}
              onSelectProfessor={handleSelectProfessor}
              isOpen={isListOpen}
            />
            <div className="flex-grow overflow-y-auto w-full bg-white md:bg-gray-50/30">
              {error && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mx-4 mt-4 rounded shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1-1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-amber-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              <ProfessorDetail professor={selectedProfessor} onNavigate={handleNavigate} />
            </div>
          </div>
        );
    }
  }

  return (
    <div className="h-screen w-screen bg-white text-[#034C83] flex flex-col antialiased overflow-hidden">
      <Header onMenuClick={handleMenuClick} onNavigate={handleNavigate} />
      <main className="flex-grow flex flex-col relative overflow-hidden">
          {renderContent()}
      </main>
    </div>
  );
};


const App: React.FC = () => (
    <AuthProvider>
        <AppContent />
    </AuthProvider>
);

export default App;
