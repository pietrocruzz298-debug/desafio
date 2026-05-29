/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, ParametrosSistema } from '../types';
import { DatabaseService } from '../services/db';

interface AuthContextType {
  usuario: Usuario | null;
  carregando: boolean;
  modoEscuro: boolean;
  parametros: ParametrosSistema | null;
  login: (loginText: string, senhaText: string) => Promise<boolean>;
  logout: () => void;
  recuperarSenha: (login: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  alternarModoEscuro: () => void;
  atualizarParametros: (novos: ParametrosSistema) => Promise<void>;
  atualizarPerfil: (nome: string, loginText: string, senhaText?: string) => Promise<void>;
  recarregarUsuarios: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modoEscuro, setModoEscuro] = useState(false);
  const [parametros, setParametros] = useState<ParametrosSistema | null>(null);

  useEffect(() => {
    // 1. Recover Session
    const usuarioSalvo = localStorage.getItem('mecanica_token_usuario');
    if (usuarioSalvo) {
      try {
        setUsuario(JSON.parse(usuarioSalvo));
      } catch (e) {
        localStorage.removeItem('mecanica_token_usuario');
      }
    }

    // 2. Recover Dark Mode
    const darkSaved = localStorage.getItem('mecanica_modo_escuro') === 'true';
    setModoEscuro(darkSaved);
    if (darkSaved) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 3. Load System Parameters
    async function loadConfig() {
      try {
        const params = await DatabaseService.getParametros();
        setParametros(params);
      } catch (err) {
        console.error('Erro ao buscar parametros do sistema:', err);
      } finally {
        setCarregando(false);
      }
    }
    loadConfig();
  }, []);

  const login = async (loginText: string, senhaText: string): Promise<boolean> => {
    try {
      const usuarios = await DatabaseService.getUsuarios();
      
      // Case insensitive match for convenience
      const userMatch = usuarios.find(
        u => u.login.toLowerCase() === loginText.toLowerCase() && u.senha === senhaText
      );

      if (userMatch) {
         // Save to state & local
         const sessionUser = { ...userMatch };
         delete sessionUser.senha; // safety
         setUsuario(sessionUser);
         localStorage.setItem('mecanica_token_usuario', JSON.stringify(sessionUser));
         return true;
      }
      return false;
    } catch (e) {
      console.error('Erro no fluxo de login:', e);
      return false;
    }
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem('mecanica_token_usuario');
  };

  const recuperarSenha = async (loginStr: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    // Standard mock recover sequence
    const usuarios = await DatabaseService.getUsuarios();
    const user = usuarios.find(u => u.login.toLowerCase() === loginStr.toLowerCase());
    if (user) {
      return {
        sucesso: true,
        mensagem: `Aviso enviado ao Administrador. A senha provisória padrão para o perfil ${user.perfil.toUpperCase()} é "${user.perfil}123".`
      };
    }
    return {
      sucesso: false,
      mensagem: "O login informado não foi encontrado em nossa base de usuários cadastrados."
    };
  };

  const alternarModoEscuro = () => {
    const novoValor = !modoEscuro;
    setModoEscuro(novoValor);
    localStorage.setItem('mecanica_modo_escuro', String(novoValor));
    if (novoValor) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const atualizarParametros = async (novos: ParametrosSistema) => {
    const salvos = await DatabaseService.salvarParametros(novos);
    setParametros(salvos);
  };

  const atualizarPerfil = async (nome: string, loginText: string, senhaText?: string) => {
    if (!usuario) return;

    const list = await DatabaseService.getUsuarios();
    const index = list.findIndex(u => u.id === usuario.id);
    if (index === -1) return;

    // Validation login already in use by other
    const loginDiferente = list.find(u => u.login.toLowerCase() === loginText.toLowerCase() && u.id !== usuario.id);
    if (loginDiferente) {
      throw new Error('Este login já está sendo utilizado por outro usuário no sistema.');
    }

    const original = list[index];
    const atualizado: Usuario = {
      ...original,
      nome,
      login: loginText,
    };
    if (senhaText) {
      atualizado.senha = senhaText;
    }

    list[index] = atualizado;
    localStorage.setItem('mecanica_usuarios', JSON.stringify(list));

    const sessionUser = { ...atualizado };
    delete sessionUser.senha;
    setUsuario(sessionUser);
    localStorage.setItem('mecanica_token_usuario', JSON.stringify(sessionUser));
  };

  const recarregarUsuarios = async () => {
    // Helper if database resets or changes outside
    const usuarioSalvo = localStorage.getItem('mecanica_token_usuario');
    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
    }
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      carregando,
      modoEscuro,
      parametros,
      login,
      logout,
      recuperarSenha,
      alternarModoEscuro,
      atualizarParametros,
      atualizarPerfil,
      recarregarUsuarios
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
