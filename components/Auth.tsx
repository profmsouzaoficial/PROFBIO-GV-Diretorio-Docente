import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { TeacherIcon, XIcon } from './icons';

const Auth: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Login bem-sucedido! Redirecionando...');
    }
    setLoading(false);
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-gray-50/50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-200 relative">
        <button 
          onClick={() => onNavigate('home')} 
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Voltar"
        >
          <XIcon className="w-5 h-5" />
        </button>
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-[#034C83] p-3 rounded-full mb-4">
                <TeacherIcon className="w-10 h-10 text-white"/>
            </div>
          <h1 className="text-2xl font-bold text-[#034C83]">Área do Docente</h1>
          <p className="text-gray-500">Acesse para editar seu perfil.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              id="email"
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#39A3B0] focus:border-[#39A3B0] outline-none transition-all placeholder-gray-400"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@ufjf.br"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password"  className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
            <input
              id="password"
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#39A3B0] focus:border-[#39A3B0] outline-none transition-all placeholder-gray-400"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm text-center mb-4 bg-red-50 p-2 rounded border border-red-100">{error}</p>}
          {message && <p className="text-green-600 text-sm text-center mb-4 bg-green-50 p-2 rounded border border-green-100">{message}</p>}

          <div>
            <button
              type="submit"
              className="w-full bg-[#034C83] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#023b66] transition-all disabled:opacity-50 shadow-md"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
        <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
                Esqueceu a senha? <a href="#" className="font-semibold text-[#39A3B0] hover:underline">Fale com o administrador.</a>
            </p>
            <p className="text-xs text-gray-400 mt-4">Cadastro restrito a docentes autorizados.</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
