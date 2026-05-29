/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chamado } from '../types';

/**
 * Converte chamados passados por parâmetro em uma planilha CSV compatível com Microsoft Excel.
 * Inclui cabeçalho de decodificação UTF-8 BOM (\uFEFF) para que caracteres acentuados da língua portuguesa
 * apareçam corretamente de forma automática.
 */
export function exportarChamadosCSV(chamados: Chamado[]) {
  const headers = [
    'Número',
    'Equipamento',
    'Patrimônio',
    'Setor',
    'Localização',
    'Prioridade',
    'Status',
    'Operador',
    'Mecânico Responsável',
    'Data de Abertura',
    'Data de Início',
    'Data de Encerramento'
  ];

  const escapeCSV = (val: string | undefined | null) => {
    if (val === undefined || val === null) return '';
    const formatted = val.replace(/"/g, '""');
    return formatted.includes(',') || formatted.includes('\n') || formatted.includes('"') 
      ? `"${formatted}"` 
      : formatted;
  };

  const rows = chamados.map(ch => [
    escapeCSV(ch.numero_chamado),
    escapeCSV(ch.equipamento),
    escapeCSV(ch.patrimonio),
    escapeCSV(ch.setor),
    escapeCSV(ch.localizacao),
    escapeCSV(ch.prioridade.toUpperCase()),
    escapeCSV(ch.status.replace('_', ' ').toUpperCase()),
    escapeCSV(ch.operador_nome),
    escapeCSV(ch.mecanico_nome || 'Não atribuído'),
    escapeCSV(ch.data_abertura ? new Date(ch.data_abertura).toLocaleString('pt-BR') : ''),
    escapeCSV(ch.data_inicio ? new Date(ch.data_inicio).toLocaleString('pt-BR') : ''),
    escapeCSV(ch.data_encerramento ? new Date(ch.data_encerramento).toLocaleString('pt-BR') : '')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  // UTF-8 BOM
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const dataFormatada = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_chamados_manutencao_${dataFormatada}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Cria uma janela de impressão estilizada contendo uma tabela limpa e profissional
 * para gerar relatórios e converter diretamente em arquivos PDF usando o gerenciador do sistema operacional.
 */
export function exportarChamadosPDF(chamados: Chamado[], filtrosAtivos: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, ative a liberação de pop-ups em seu navegador para exportar em PDF.');
    return;
  }

  const linhasTabela = chamados.map(ch => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; font-weight: 600; color: #1e293b;">${ch.numero_chamado}</td>
      <td style="padding: 8px;">${ch.equipamento} (${ch.patrimonio})</td>
      <td style="padding: 8px;">${ch.setor}</td>
      <td style="padding: 8px;">
        <span style="
          padding: 2px 6px; 
          border-radius: 4px; 
          font-size: 11px;
          text-transform: uppercase;
          font-weight: bold;
          background-color: ${
            ch.prioridade === 'critica' ? '#fecaca' :
            ch.prioridade === 'alta' ? '#ffedd5' :
            ch.prioridade === 'media' ? '#fef9c3' : '#dcfce7'
          };
          color: ${
            ch.prioridade === 'critica' ? '#991b1b' :
            ch.prioridade === 'alta' ? '#c2410c' :
            ch.prioridade === 'media' ? '#854d0e' : '#166534'
          };
        ">${ch.prioridade}</span>
      </td>
      <td style="padding: 8px;">
        <span style="
          padding: 2px 6px; 
          border-radius: 4px; 
          font-size: 11px;
          text-transform: uppercase;
          font-weight: bold;
          background-color: ${
            ch.status === 'finalizado' ? '#dcfce7' :
            ch.status === 'cancelado' ? '#f1f5f9' : '#dbeafe'
          };
          color: ${
            ch.status === 'finalizado' ? '#166534' :
            ch.status === 'cancelado' ? '#475569' : '#1e40af'
          };
        ">${ch.status.replace('_', ' ')}</span>
      </td>
      <td style="padding: 8px;">${ch.mecanico_nome || '-'}</td>
      <td style="padding: 8px; font-size: 11px;">${new Date(ch.data_abertura).toLocaleDateString('pt-BR')}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relatório de Chamados de Manutenção</title>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #334155; padding: 20px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0; }
          .meta { font-size: 12px; color: #64748b; text-align: right; }
          .filter-badge { background-color: #f1f5f9; padding: 8px; border-radius: 6px; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { background-color: #f8fafc; color: #475569; font-weight: bold; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; font-size: 13px; }
          @media print {
            button { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">GESTÃO DE CHAMADOS - MANUTENÇÃO MECÂNICA</h1>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Relatório Consolidado de Atividades</div>
          </div>
          <div class="meta">
            Gerado em: ${new Date().toLocaleString('pt-BR')}<br>
            Responsável: Sistema Administrativo
          </div>
        </div>

        <div class="filter-badge">
          <strong>Filtros aplicados:</strong> ${filtrosAtivos}
          <span style="float: right;"><strong>Total de chamados:</strong> ${chamados.length}</span>
        </div>

        <table style="font-size: 12px;">
          <thead>
            <tr>
              <th>CHAMADO</th>
              <th>EQUIPAMENTO (PATRIMÔNIO)</th>
              <th>SETOR</th>
              <th>PRIORIDADE</th>
              <th>STATUS</th>
              <th>MECÂNICO</th>
              <th>ABERTURA</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabela}
          </tbody>
        </table>

        <div style="margin-top: 40px; text-align: center; border-top: 1px dotted #cbd5e1; padding-top: 20px; font-size: 11px; color: #94a3b8;">
          Documento técnico gerado eletronicamente para fins de auditoria de linha de fabricação mecânica.
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
