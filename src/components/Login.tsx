/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wrench, Lock, User, Eye, EyeOff, AlertCircle, HelpCircle } from 'lucide-react';

export default function Login() {
  const { login, recuperarSenha } = useAuth();
  
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  
  // States for recover password
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [loginRecupe, setLoginRecupe] = useState('');
  const [infoRecupe, setInfoRecupe] = useState<{ sucesso: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!loginInput.trim() || !senhaInput.trim()) {
      setErro('Por favor, preencha todos os campos.');
      return;
    }

    setCarregando(true);
    const sucesso = await login(loginInput, senhaInput);
    setCarregando(false);
    
    if (!sucesso) {
      setErro('Credenciais inválidas! Por favor verifique o login e a senha digitados.');
    }
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoRecupe(null);
    if (!loginRecupe.trim()) {
      setInfoRecupe({ sucesso: false, msg: 'Informe seu login cadastrado.' });
      return;
    }

    const res = await recuperarSenha(loginRecupe);
    setInfoRecupe({ sucesso: res.sucesso, msg: res.mensagem });
  };

  const preencherCredenciais = (perfil: 'operador' | 'mecanico' | 'admin') => {
    setLoginInput(perfil);
    setSenhaInput(perfil === 'admin' ? 'admin123' : perfil === 'mecanico' ? 'mecanico123' : 'operador123');
    setErro('');
  };

  return (
    <div id="login_container" className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Coluna Visual - Apelo Estético de Engenharia */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 justify-center items-center p-12 text-white relative overflow-hidden border-r border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
        <div className="max-w-md space-y-6 relative z-10">
          <div className="inline-flex p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
            <Wrench className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">
              MecanicPro S.A.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Plataforma unificada para ordens de serviço, calibração industrial, diagnóstico avançado de falhas físicas e controle analítico de estoque técnico.
            </p>
          </div>

          <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest">Sincronização Ativa</h4>
            <div className="flex items-center text-xs text-slate-300 gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Canal de Eventos Supabase Realtime estruturado</span>
            </div>
          </div>
          
          <div className="pt-8 text-xs text-slate-500">
            © 2026 MecanicPro S.A. • Gestão de Manutenção Preventiva e Corretiva
          </div>
        </div>
      </div>

      {/* Coluna do Formulário de Acesso */}
      <div className="flex-1 flex justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-100 dark:shadow-none p-8 space-y-6 transition-all">
          
          {/* Logo mobile */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
              <Wrench className="h-6 w-6" />
            </div>
            <span className="font-extrabold text-xl text-slate-900 dark:text-white">MecanicPro</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {modoRecuperar ? 'Recuperar Senha' : 'Acesso ao Sistema'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {modoRecuperar 
                ? 'Informe o login correspondente para recuperar o acesso' 
                : 'Insira suas credenciais técnicas de manutenção mecânica'}
            </p>
          </div>

          {erro && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-lg flex items-start gap-2.5 text-sm text-rose-600 dark:text-rose-400 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {!modoRecuperar ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Login Cadastrado</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="Ex: operador ou mecanico"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Senha Secreta</label>
                  <button
                    type="button"
                    onClick={() => setModoRecuperar(true)}
                    className="text-xs text-sky-500 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senhaInput}
                    onChange={(e) => setSenhaInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-400 text-white font-medium rounded-lg text-sm transition-colors shadow-lg shadow-sky-500/10 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
              >
                {carregando ? 'Validando Acesso...' : 'Autenticar no Sistema'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRecuperar} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Seu Login Cadastrado</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={loginRecupe}
                    onChange={(e) => setLoginRecupe(e.target.value)}
                    placeholder="Ex: operador ou adm_testes"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              {infoRecupe && (
                <div className={`p-3 border rounded-lg text-xs ${
                  infoRecupe.sucesso 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400'
                }`}>
                  {infoRecupe.msg}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModoRecuperar(false);
                    setInfoRecupe(null);
                  }}
                  className="flex-1 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-sky-500/10"
                >
                  Consultar
                </button>
              </div>
            </form>
          )}

          {/* Atalhos para logins rápidos - EXTREMAMENTE ÚTIL para avaliação */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500">
              <span>CONTROLE DE PERFIS DE TESTE</span>
              <HelpCircle className="h-4.5 w-4.5 cursor-pointer hover:text-sky-500Item" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => preencherCredenciais('operador')}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-left hover:border-sky-500 hover:bg-sky-500/5 dark:hover:bg-sky-500/10 transition group"
              >
                <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 group-hover:text-sky-500 uppercase">Operador</div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">Senha: operador123</div>
              </button>
              
              <button
                type="button"
                onClick={() => preencherCredenciais('mecanico')}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-left hover:border-sky-500 hover:bg-sky-500/5 dark:hover:bg-sky-500/10 transition group"
              >
                <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 group-hover:text-sky-500 uppercase">Mecânico</div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">Senha: mecanico123</div>
              </button>

              <button
                type="button"
                onClick={() => preencherCredenciais('admin')}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-left hover:border-sky-500 hover:bg-sky-500/5 dark:hover:bg-sky-500/10 transition group"
              >
                <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 group-hover:text-sky-500 uppercase">Admin</div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">Senha: admin123</div>
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
