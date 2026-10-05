import React, { useState, useRef, useEffect } from 'react';
import { BooksIcon, MenuIcon, UserCircleIcon, EditIcon, LogOutIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
    onMenuClick: () => void;
    onNavigate: (page: string) => void;
}

const UserMenu: React.FC<{ onNavigate: (page: string) => void; }> = ({ onNavigate }) => {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-sm font-medium text-[#034C83] hover:bg-[#7CBCC5]/20 p-2 rounded-lg transition-colors min-h-[44px]">
                <UserCircleIcon />
                <span className="hidden md:inline">{user.email}</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-gray-100 py-1">
                    <button 
                        onClick={() => { onNavigate('editProfile'); setIsOpen(false); }}
                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                        <EditIcon className="w-4 h-4"/>
                        Editar Perfil
                    </button>
                    <button
                        onClick={signOut}
                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                        <LogOutIcon className="w-4 h-4"/>
                        Sair
                    </button>
                </div>
            )}
        </div>
    );
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onNavigate }) => {
  const { session } = useAuth();

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-4">
            <button onClick={onMenuClick} className="md:hidden p-2 rounded-md text-[#034C83] hover:bg-gray-100">
                <MenuIcon />
            </button>
            <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => onNavigate('home')}
                aria-label="Voltar para a página inicial"
            >
                <img 
                    src="https://virtual.unemat.br/profbio/pluginfile.php/23/mod_label/intro/profbio-horizontal.png" 
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/profbio-horizontal.png';
                    }}
                    alt="PROFBIO Logo" 
                    className="h-10 sm:h-11 w-auto object-contain" 
                />
                <div className="hidden sm:block">
                    <h1 className="text-sm font-bold text-[#034C83] leading-tight">UFJF/GV</h1>
                    <p className="text-xs text-gray-500 leading-tight">Corpo Docente</p>
                </div>
            </div>
          </div>
          
          {session ? (
            <UserMenu onNavigate={onNavigate} />
          ) : (
            <button onClick={() => onNavigate('login')} className="flex items-center gap-2 text-sm font-medium text-[#034C83] hover:bg-[#7CBCC5]/20 p-2 rounded-lg transition-colors min-h-[44px]">
              <BooksIcon className="w-5 h-5"/>
              <span className="hidden md:inline">Área do Docente</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};

export default Header;
