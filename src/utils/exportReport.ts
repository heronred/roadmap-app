import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';
import { UploadedDataset } from '../types';
import { computeAnalytics } from './analytics';

/**
 * Export current dashboard dataset as a structured multi-page PDF document using SUPERAPP identity
 */
export async function exportDashboardToPDF(
  dataset: UploadedDataset,
  fileName: string = 'Relatorio_Ondas',
  onProgress?: (progress: number, statusText: string) => void
): Promise<void> {
  try {
    onProgress?.(5, 'Montando estrutura do relatório...');
    const analytics = computeAnalytics(dataset.rows);
    const formattedDate = new Date().toLocaleDateString('pt-BR');

    // Create offscreen container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0px';
    container.style.width = '1120px';
    container.style.backgroundColor = '#020617'; // Slate 950
    container.style.color = '#ffffff';
    container.style.fontFamily = 'Arial, Helvetica, sans-serif';

    // Helper to generate a slide page header
    const createPageHeader = (title: string) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background-color:#020617; padding:12px 20px; border-bottom:2px solid #059669; margin-bottom:20px; border-radius:6px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="background-color:#059669; color:#ffffff; font-weight:bold; font-size:12px; padding:4px 10px; border-radius:4px; letter-spacing:1px;">SUPERAPP</span>
          <span style="color:#ffffff; font-size:15px; font-weight:bold; letter-spacing:0.5px;">ANALYTICS POR ONDAS</span>
        </div>
        <div style="color:#10b981; font-weight:bold; font-size:13px; text-transform:uppercase;">
          ${title}
        </div>
      </div>
    `;

    const createPageFooter = (pageStr: string) => `
      <div style="position:absolute; bottom:16px; left:40px; right:40px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #1e293b; padding-top:10px; font-size:11px; color:#64748b;">
        <div>SUPERAPP Analytics • Base: ${dataset.metadata.fileName}</div>
        <div>Gerado em ${formattedDate}</div>
        <div style="font-weight:bold; color:#10b981;">${pageStr}</div>
      </div>
    `;

    // -----------------------------------------------------------------
    // PAGE 1: Cover & High Level KPIs & Progress Overview
    // -----------------------------------------------------------------
    const page1 = document.createElement('div');
    page1.className = 'pdf-slide-page';
    page1.style.width = '1120px';
    page1.style.height = '790px';
    page1.style.padding = '30px 40px';
    page1.style.boxSizing = 'border-box';
    page1.style.backgroundColor = '#0f172a';
    page1.style.position = 'relative';

    page1.innerHTML = `
      ${createPageHeader('Relatório Executivo')}
      
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 26px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0;">RELATÓRIO DE PROGRESSO E GESTÃO POR ONDA</h1>
        <p style="font-size: 13px; color: #94a3b8; margin: 0;">
          Arquivo Base: <strong style="color:#38bdf8;">${dataset.metadata.fileName}</strong> • ${analytics.totalOndas} Ondas Mapeadas • ${analytics.totalRows} Funcionalidades Analisadas
        </p>
      </div>

      <!-- KPI Cards -->
      <div style="display: flex; gap: 16px; margin-bottom: 28px;">
        <div style="flex: 1; background-color: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px;">
          <div style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Avanço Médio Geral</div>
          <div style="font-size: 38px; font-weight: 800; color: #10b981; margin-top: 6px;">${analytics.overallAvgProgress}%</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Média ponderada das funcionalidades</div>
        </div>

        <div style="flex: 1; background-color: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px;">
          <div style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Concluídos (100%)</div>
          <div style="font-size: 38px; font-weight: 800; color: #38bdf8; margin-top: 6px;">${analytics.completedItems}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Items totalmente entregues</div>
        </div>

        <div style="flex: 1; background-color: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px;">
          <div style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Em Andamento</div>
          <div style="font-size: 38px; font-weight: 800; color: #f59e0b; margin-top: 6px;">${analytics.inProgressItems}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Entre 1% e 99% de progresso</div>
        </div>

        <div style="flex: 1; background-color: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px;">
          <div style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Não Iniciados</div>
          <div style="font-size: 38px; font-weight: 800; color: #ef4444; margin-top: 6px;">${analytics.notStartedItems}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Com 0% de progresso</div>
        </div>
      </div>

      <!-- Ondas Visual Bars -->
      <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px;">
        <h3 style="font-size: 14px; font-weight: bold; color: #ffffff; margin: 0 0 16px 0;">Visão Geral de Progresso por Onda</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${analytics.ondaSummaries.slice(0, 6).map(o => `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                <span style="font-weight: bold; color: #10b981;">${o.onda}</span>
                <span style="color: #ffffff; font-weight: bold;">${o.avgPorcentagem}% (${o.completedCount}/${o.totalFuncionalidades} Concluídos)</span>
              </div>
              <div style="width: 100%; height: 10px; background-color: #0f172a; border-radius: 5px; overflow: hidden;">
                <div style="width: ${o.avgPorcentagem}%; height: 100%; background-color: ${o.avgPorcentagem >= 80 ? '#10b981' : o.avgPorcentagem >= 40 ? '#38bdf8' : '#f59e0b'}; border-radius: 5px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      ${createPageFooter('Página 1')}
    `;
    container.appendChild(page1);

    // -----------------------------------------------------------------
    // PAGE 2: Deadline Analytics & Schedule Health Proportion
    // -----------------------------------------------------------------
    if (analytics.deadlineAnalytics) {
      const dl = analytics.deadlineAnalytics;
      const totalDl = dl.overdueCount + dl.dueSoonCount + dl.noStartDateCount + dl.onTrackCount + dl.completedCount;
      const overduePct = totalDl > 0 ? Math.round((dl.overdueCount / totalDl) * 100) : 0;
      const dueSoonPct = totalDl > 0 ? Math.round((dl.dueSoonCount / totalDl) * 100) : 0;
      const noStartPct = totalDl > 0 ? Math.round((dl.noStartDateCount / totalDl) * 100) : 0;
      const onTrackPct = totalDl > 0 ? Math.round(((dl.onTrackCount + dl.completedCount) / totalDl) * 100) : 0;

      const pageDeadline = document.createElement('div');
      pageDeadline.className = 'pdf-slide-page';
      pageDeadline.style.width = '1120px';
      pageDeadline.style.height = '790px';
      pageDeadline.style.padding = '30px 40px';
      pageDeadline.style.boxSizing = 'border-box';
      pageDeadline.style.backgroundColor = '#0f172a';
      pageDeadline.style.position = 'relative';

      pageDeadline.innerHTML = `
        ${createPageHeader('Análise de Prazos e Saúde do Cronograma')}
        
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 20px; font-weight: bold; color: #ffffff; margin: 0 0 4px 0;">SAÚDE DO CRONOGRAMA & RISCOS TEMPORAIS</h2>
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            Acompanhamento de prazos previstos (Coluna E) vs Data de Referência
          </p>
        </div>

        <!-- 4 Deadline KPI Cards -->
        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
          <div style="flex: 1; background-color: #1e293b; border: 1px solid #ef4444; border-radius: 10px; padding: 16px;">
            <div style="font-size: 11px; font-weight: bold; color: #f87171; text-transform: uppercase;">Atrasadas (Vencidas)</div>
            <div style="font-size: 36px; font-weight: 800; color: #ef4444; margin-top: 4px;">${dl.overdueCount}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Término previsto expirado</div>
          </div>

          <div style="flex: 1; background-color: #1e293b; border: 1px solid #f59e0b; border-radius: 10px; padding: 16px;">
            <div style="font-size: 11px; font-weight: bold; color: #fbbf24; text-transform: uppercase;">Próximas (≤ 15 Dias)</div>
            <div style="font-size: 36px; font-weight: 800; color: #f59e0b; margin-top: 4px;">${dl.dueSoonCount}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Vencimento nos próximos dias</div>
          </div>

          <div style="flex: 1; background-color: #1e293b; border: 1px solid #64748b; border-radius: 10px; padding: 16px;">
            <div style="font-size: 11px; font-weight: bold; color: #cbd5e1; text-transform: uppercase;">Sem Data de Início</div>
            <div style="font-size: 36px; font-weight: 800; color: #94a3b8; margin-top: 4px;">${dl.noStartDateCount}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Sem estimativa definida</div>
          </div>

          <div style="flex: 1; background-color: #1e293b; border: 1px solid #10b981; border-radius: 10px; padding: 16px;">
            <div style="font-size: 11px; font-weight: bold; color: #34d399; text-transform: uppercase;">No Prazo / Concluídas</div>
            <div style="font-size: 36px; font-weight: 800; color: #10b981; margin-top: 4px;">${dl.onTrackCount + dl.completedCount}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Dentro do cronograma</div>
          </div>
        </div>

        <!-- Visual Proportion Stacked Bar -->
        <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: bold; color: #ffffff; margin: 0 0 12px 0;">Proporção de Saúde do Cronograma</h3>
          
          <!-- Stacked Bar -->
          <div style="width: 100%; height: 20px; background-color: #020617; border-radius: 6px; overflow: hidden; display: flex;">
            <div style="width: ${overduePct}%; height: 100%; background-color: #ef4444;" title="Atrasadas: ${dl.overdueCount}"></div>
            <div style="width: ${dueSoonPct}%; height: 100%; background-color: #f59e0b;" title="Próximas: ${dl.dueSoonCount}"></div>
            <div style="width: ${noStartPct}%; height: 100%; background-color: #64748b;" title="Sem Data: ${dl.noStartDateCount}"></div>
            <div style="width: ${onTrackPct}%; height: 100%; background-color: #10b981;" title="No Prazo: ${dl.onTrackCount + dl.completedCount}"></div>
          </div>

          <!-- Legend Grid -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 14px; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; background-color: #ef4444; border-radius: 3px;"></div>
              <div><strong style="color: #ef4444;">Atrasadas:</strong> ${dl.overdueCount} (${overduePct}%)</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; background-color: #f59e0b; border-radius: 3px;"></div>
              <div><strong style="color: #f59e0b;">Próximas (≤15d):</strong> ${dl.dueSoonCount} (${dueSoonPct}%)</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; background-color: #64748b; border-radius: 3px;"></div>
              <div><strong style="color: #94a3b8;">Sem Data:</strong> ${dl.noStartDateCount} (${noStartPct}%)</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; background-color: #10b981; border-radius: 3px;"></div>
              <div><strong style="color: #10b981;">No Prazo:</strong> ${dl.onTrackCount + dl.completedCount} (${onTrackPct}%)</div>
            </div>
          </div>
        </div>

        <!-- Onda Breakdown Table -->
        <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 10px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
            <thead>
              <tr style="background-color: #020617; color: #38bdf8; border-bottom: 2px solid #334155;">
                <th style="padding: 10px 12px; font-weight: bold;">ONDA</th>
                <th style="padding: 10px 12px; font-weight: bold; text-align: center; color: #ef4444;">ATRASADAS</th>
                <th style="padding: 10px 12px; font-weight: bold; text-align: center; color: #f59e0b;">PRÓXIMAS (≤15d)</th>
                <th style="padding: 10px 12px; font-weight: bold; text-align: center; color: #94a3b8;">SEM DATA</th>
                <th style="padding: 10px 12px; font-weight: bold; text-align: center; color: #10b981;">NO PRAZO</th>
                <th style="padding: 10px 12px; font-weight: bold; text-align: center;">TOTAL ITENS</th>
              </tr>
            </thead>
            <tbody>
              ${dl.ondaDeadlineSummaries.map((od, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? '#1e293b' : '#0f172a'}; border-bottom: 1px solid #334155; color: #ffffff;">
                  <td style="padding: 10px 12px; font-weight: bold; color: #38bdf8;">${od.onda}</td>
                  <td style="padding: 10px 12px; text-align: center; font-weight: bold; color: ${od.overdueCount > 0 ? '#ef4444' : '#64748b'};">${od.overdueCount}</td>
                  <td style="padding: 10px 12px; text-align: center; font-weight: bold; color: ${od.dueSoonCount > 0 ? '#f59e0b' : '#64748b'};">${od.dueSoonCount}</td>
                  <td style="padding: 10px 12px; text-align: center; color: #94a3b8;">${od.noStartDateCount}</td>
                  <td style="padding: 10px 12px; text-align: center; font-weight: bold; color: #10b981;">${od.onTrackCount + od.completedCount}</td>
                  <td style="padding: 10px 12px; text-align: center; font-weight: bold; color: #ffffff;">${od.totalWithDates}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${createPageFooter('Página 2')}
      `;
      container.appendChild(pageDeadline);
    }

    // -----------------------------------------------------------------
    // PAGE 3: Summary Table for All Ondas
    // -----------------------------------------------------------------
    const page2 = document.createElement('div');
    page2.className = 'pdf-slide-page';
    page2.style.width = '1120px';
    page2.style.height = '790px';
    page2.style.padding = '30px 40px';
    page2.style.boxSizing = 'border-box';
    page2.style.backgroundColor = '#0f172a';
    page2.style.position = 'relative';

    const ondaTableHtml = `
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
        <thead>
          <tr style="background-color: #020617; color: #10b981; border-bottom: 2px solid #334155;">
            <th style="padding: 12px; font-weight: bold;">ONDA</th>
            <th style="padding: 12px; font-weight: bold; text-align: center;">TOTAL ITENS</th>
            <th style="padding: 12px; font-weight: bold; text-align: center;">AVANÇO MÉDIO</th>
            <th style="padding: 12px; font-weight: bold; text-align: center;">CONCLUÍDOS (100%)</th>
            <th style="padding: 12px; font-weight: bold; text-align: center;">EM ANDAMENTO</th>
            <th style="padding: 12px; font-weight: bold; text-align: center;">NÃO INICIADOS</th>
          </tr>
        </thead>
        <tbody>
          ${analytics.ondaSummaries.map((o, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#1e293b' : '#0f172a'}; border-bottom: 1px solid #334155; color: #ffffff;">
              <td style="padding: 12px; font-weight: bold; color: #10b981;">${o.onda}</td>
              <td style="padding: 12px; text-align: center;">${o.totalFuncionalidades}</td>
              <td style="padding: 12px; text-align: center; font-weight: bold; color: ${o.avgPorcentagem >= 80 ? '#10b981' : o.avgPorcentagem >= 40 ? '#38bdf8' : '#f59e0b'};">${o.avgPorcentagem}%</td>
              <td style="padding: 12px; text-align: center; color: #38bdf8; font-weight: bold;">${o.completedCount}</td>
              <td style="padding: 12px; text-align: center; color: #f59e0b;">${o.inProgressCount}</td>
              <td style="padding: 12px; text-align: center; color: #ef4444;">${o.notStartedCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    page2.innerHTML = `
      ${createPageHeader('Resumo Consolidado')}
      <h2 style="font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 16px;">Consolidado de Indicadores por Onda</h2>
      <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 10px; overflow: hidden;">
        ${ondaTableHtml}
      </div>
      ${createPageFooter('Página 2')}
    `;
    container.appendChild(page2);

    // -----------------------------------------------------------------
    // PAGES 3+: Detailed Items for Each Onda (Chunked 11 rows per page)
    // -----------------------------------------------------------------
    const PDF_ITEMS_PER_PAGE = 11;
    let pageCount = 2;

    analytics.ondaSummaries.forEach((ondaSummary) => {
      const rows = ondaSummary.rows;
      const totalOndaPages = Math.max(1, Math.ceil(rows.length / PDF_ITEMS_PER_PAGE));

      for (let pIdx = 0; pIdx < totalOndaPages; pIdx++) {
        pageCount++;
        const chunk = rows.slice(pIdx * PDF_ITEMS_PER_PAGE, (pIdx + 1) * PDF_ITEMS_PER_PAGE);

        const pageEl = document.createElement('div');
        pageEl.className = 'pdf-slide-page';
        pageEl.style.width = '1120px';
        pageEl.style.height = '790px';
        pageEl.style.padding = '30px 40px';
        pageEl.style.boxSizing = 'border-box';
        pageEl.style.backgroundColor = '#0f172a';
        pageEl.style.position = 'relative';

        const pageTitleText = `Detalhamento: ${ondaSummary.onda} ${totalOndaPages > 1 ? `(${pIdx + 1}/${totalOndaPages})` : ''}`;

        const rowsHtml = chunk.map((r, rIdx) => {
          const displayPct = r.calculatedPorcentagem ?? r.porcentagem;
          const isParent = Boolean(r.isParent);
          let badgeBg = '#334155';
          let badgeColor = '#94a3b8';
          let statusText = '0%';
          if (displayPct === 100) {
            badgeBg = '#065f46';
            badgeColor = '#34d399';
            statusText = '100% Concluído';
          } else if (displayPct >= 50) {
            badgeBg = '#1e40af';
            badgeColor = '#60a5fa';
            statusText = `${displayPct}% Em Andamento`;
          } else if (displayPct > 0) {
            badgeBg = '#92400e';
            badgeColor = '#fbbf24';
            statusText = `${displayPct}% Inicial`;
          } else {
            badgeBg = '#7f1d1d';
            badgeColor = '#fca5a5';
            statusText = '0% Pendente';
          }

          const level = r.level || 1;
          const indentSpace = level > 1 ? '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level - 1) + '└─ ' : '';

          return `
            <tr style="background-color: ${isParent ? '#1e293b' : rIdx % 2 === 0 ? '#1f293d' : '#0f172a'}; border-bottom: 1px solid #334155; font-size: 11px;">
              <td style="padding: 10px 12px; color: ${isParent ? '#38bdf8' : '#ffffff'}; font-weight: ${isParent ? 'bold' : 'normal'}; width: 40%;">
                ${indentSpace}${r.funcionalidade} ${isParent ? '<span style="color:#10b981; font-size:10px;">(Pai)</span>' : ''}
              </td>
              <td style="padding: 10px 12px; color: #94a3b8; text-align: center; width: 15%;">${r.inicioEstimativa || '—'}</td>
              <td style="padding: 10px 12px; color: #94a3b8; text-align: center; width: 15%;">${r.terminoEstimativa || '—'}</td>
              <td style="padding: 10px 12px; color: #e2e8f0; width: 15%;">${r.etapa}</td>
              <td style="padding: 10px 12px; text-align: center; width: 15%;">
                <span style="background-color: ${badgeBg}; color: ${badgeColor}; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 10px; display: inline-block;">
                  ${statusText} ${isParent ? '*' : ''}
                </span>
              </td>
            </tr>
          `;
        }).join('');

        pageEl.innerHTML = `
          ${createPageHeader(pageTitleText)}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="font-size: 16px; font-weight: bold; color: #10b981; margin: 0;">${ondaSummary.onda}</h3>
            <span style="font-size: 12px; color: #94a3b8; font-weight: bold;">
              Avanço Geral: <span style="color: #10b981;">${ondaSummary.avgPorcentagem}%</span> | Concluídos: ${ondaSummary.completedCount}/${ondaSummary.totalFuncionalidades}
            </span>
          </div>

          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #020617; color: #38bdf8; border-bottom: 2px solid #334155; font-size: 11px;">
                  <th style="padding: 10px 12px; font-weight: bold;">FUNCIONALIDADE</th>
                  <th style="padding: 10px 12px; font-weight: bold; text-align: center;">INÍCIO</th>
                  <th style="padding: 10px 12px; font-weight: bold; text-align: center;">TÉRMINO</th>
                  <th style="padding: 10px 12px; font-weight: bold;">ETAPA</th>
                  <th style="padding: 10px 12px; font-weight: bold; text-align: center;">AVANÇO (%)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
          ${createPageFooter(`Página ${pageCount}`)}
        `;

        container.appendChild(pageEl);
      }
    });

    document.body.appendChild(container);

    onProgress?.(15, 'Inicializando renderização das páginas...');

    // Initialize jsPDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const pages = Array.from(container.querySelectorAll<HTMLElement>('.pdf-slide-page'));
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const startPct = Math.round(15 + (i / totalPages) * 75);
      onProgress?.(startPct, `Processando página ${i + 1} de ${totalPages}...`);

      const pageEl = pages[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      if (i > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const endPct = Math.round(15 + ((i + 1) / totalPages) * 75);
      onProgress?.(endPct, `Página ${i + 1} de ${totalPages} concluída`);
    }

    onProgress?.(95, 'Gerando arquivo PDF para download...');

    document.body.removeChild(container);

    const cleanName = fileName.replace('.xlsx', '').replace('.xls', '');
    pdf.save(`SUPERAPP_${cleanName}_Relatorio_Ondas.pdf`);

    onProgress?.(100, 'Download concluído!');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Erro ao gerar o PDF.');
  }
}

/**
 * Export dataset and analytical summaries as a Microsoft PowerPoint (.pptx) presentation deck with SUPERAPP Identity
 */
export async function exportToPowerPoint(dataset: UploadedDataset): Promise<void> {
  try {
    const pptx = new pptxgen();
    const analytics = computeAnalytics(dataset.rows);

    // Explicitly define 16:9 layout coordinates (13.33 x 7.5 inches)
    pptx.defineLayout({ name: 'SUPERAPP_16x9', width: 13.33, height: 7.5 });
    pptx.layout = 'SUPERAPP_16x9';
    pptx.author = 'SUPERAPP';
    pptx.company = 'SUPERAPP Analytics';
    pptx.title = `SUPERAPP - Relatório Executivo - ${dataset.metadata.fileName}`;

    // Master Design Palette
    const BG_DARK = '0B132B'; // Rich Deep Navy/Slate
    const CARD_BG = '1E293B'; // Slate-800
    const CARD_BORDER = '334155'; // Slate-700
    const ACCENT_EMERALD = '10B981';
    const ACCENT_BLUE = '38BDF8';
    const ACCENT_AMBER = 'F59E0B';
    const ACCENT_ROSE = 'F43F5E';
    const TEXT_WHITE = 'FFFFFF';
    const TEXT_MUTED = '94A3B8';

    const formattedDate = new Date().toLocaleDateString('pt-BR');

    // Helper to apply SUPERAPP Executive Header & Footer
    const applySlideHeaderFooter = (slide: any, slideTitle: string) => {
      // Top Accent Line
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 0.08,
        fill: { color: ACCENT_EMERALD },
      });

      // Header Bar Banner
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0.08,
        w: 13.33,
        h: 0.72,
        fill: { color: '020617' },
      });

      slide.addText('SUPERAPP ANALYTICS', {
        x: 0.8,
        y: 0.22,
        w: 3.5,
        h: 0.4,
        fontSize: 14,
        fontFace: 'Arial',
        color: ACCENT_EMERALD,
        bold: true,
      });

      slide.addText(slideTitle.toUpperCase(), {
        x: 4.5,
        y: 0.22,
        w: 8.0,
        h: 0.4,
        fontSize: 11,
        fontFace: 'Arial',
        color: TEXT_WHITE,
        align: 'right',
        bold: true,
      });

      // Footer
      slide.addShape(pptx.ShapeType.line, {
        x: 0.8,
        y: 6.9,
        w: 11.73,
        h: 0,
        line: { color: CARD_BORDER, width: 0.5 },
      });

      slide.addText(`SUPERAPP • Relatório Executivo de Progresso • Base: ${dataset.metadata.fileName} • ${formattedDate}`, {
        x: 0.8,
        y: 6.98,
        w: 11.73,
        h: 0.3,
        fontSize: 8.5,
        fontFace: 'Arial',
        color: TEXT_MUTED,
      });
    };

    // -----------------------------------------------------------------
    // SLIDE 1: Executive Cover Slide
    // -----------------------------------------------------------------
    const slide1 = pptx.addSlide();
    slide1.background = { color: BG_DARK };

    // Top Brand Accent Strip
    slide1.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.12,
      fill: { color: ACCENT_EMERALD },
    });

    // Brand Badge
    slide1.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 0.8,
      w: 3.4,
      h: 0.38,
      fill: { color: '064E3B' },
      line: { color: ACCENT_EMERALD, width: 1 },
      rectRadius: 0.08,
    });
    slide1.addText('SUPERAPP ANALYTICS • PAINEL EXECUTIVO', {
      x: 0.8,
      y: 0.84,
      w: 3.4,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: '34D399',
      bold: true,
      align: 'center',
    });

    // Main Title
    slide1.addText('RELATÓRIO EXECUTIVO DE PROGRESSO POR ONDA', {
      x: 0.8,
      y: 1.35,
      w: 11.73,
      h: 0.65,
      fontSize: 22,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true,
    });

    // Subtitle Info Box
    slide1.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 2.15,
      w: 11.73,
      h: 0.7,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.05,
    });
    slide1.addText(
      `Arquivo Analisado: ${dataset.metadata.fileName}  |  Aba: CRONOGRAMA  |  Data: ${formattedDate}\nMapeamento: ${analytics.totalOndas} Ondas • ${analytics.totalRows} Funcionalidades Analisadas`,
      {
        x: 1.0,
        y: 2.23,
        w: 11.33,
        h: 0.55,
        fontSize: 10.5,
        fontFace: 'Arial',
        color: TEXT_MUTED,
      }
    );

    // 4 KPI Summary Cards (Width 2.75 in each, fitting cleanly inside 13.33 in)
    const cardY = 3.15;
    const cardW = 2.75;
    const cardH = 2.2;
    const cardGap = 0.24;

    const kpis = [
      {
        label: 'PROGRESSO MÉDIO GERAL',
        value: `${analytics.overallAvgProgress}%`,
        sub: 'Média Ponderada Global',
        accent: ACCENT_EMERALD,
        topBar: '10B981',
      },
      {
        label: 'CONCLUÍDOS (100%)',
        value: `${analytics.completedItems}`,
        sub: `${Math.round((analytics.completedItems / analytics.totalRows) * 100)}% das Funcionalidades`,
        accent: ACCENT_BLUE,
        topBar: '38BDF8',
      },
      {
        label: 'EM ANDAMENTO',
        value: `${analytics.inProgressItems}`,
        sub: `${Math.round((analytics.inProgressItems / analytics.totalRows) * 100)}% das Funcionalidades`,
        accent: ACCENT_AMBER,
        topBar: 'F59E0B',
      },
      {
        label: 'A INICIAR',
        value: `${analytics.notStartedItems}`,
        sub: `${Math.round((analytics.notStartedItems / analytics.totalRows) * 100)}% das Funcionalidades`,
        accent: ACCENT_ROSE,
        topBar: 'F43F5E',
      },
    ];

    kpis.forEach((kpi, idx) => {
      const cardX = 0.8 + idx * (cardW + cardGap);

      // Card Background Box
      slide1.addShape(pptx.ShapeType.roundRect, {
        x: cardX,
        y: cardY,
        w: cardW,
        h: cardH,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.08,
      });

      // Top Colored Accent Bar
      slide1.addShape(pptx.ShapeType.rect, {
        x: cardX,
        y: cardY,
        w: cardW,
        h: 0.08,
        fill: { color: kpi.topBar },
      });

      // Label
      slide1.addText(kpi.label, {
        x: cardX + 0.15,
        y: cardY + 0.25,
        w: cardW - 0.3,
        h: 0.3,
        fontSize: 9,
        fontFace: 'Arial',
        color: TEXT_MUTED,
        bold: true,
      });

      // Metric Big Value
      slide1.addText(kpi.value, {
        x: cardX + 0.15,
        y: cardY + 0.6,
        w: cardW - 0.3,
        h: 0.8,
        fontSize: 32,
        fontFace: 'Arial',
        color: kpi.accent,
        bold: true,
      });

      // Subtext
      slide1.addText(kpi.sub, {
        x: cardX + 0.15,
        y: cardY + 1.5,
        w: cardW - 0.3,
        h: 0.4,
        fontSize: 8.5,
        fontFace: 'Arial',
        color: TEXT_MUTED,
      });
    });

    // Footer on Cover
    slide1.addText(`SUPERAPP Analytics • Documentação de Acompanhamento Executivo`, {
      x: 0.8,
      y: 6.95,
      w: 11.73,
      h: 0.3,
      fontSize: 8.5,
      fontFace: 'Arial',
      color: TEXT_MUTED,
    });

    // -----------------------------------------------------------------
    // SLIDE 2: Consolidado Geral de Ondas (Resumo Executivo)
    // -----------------------------------------------------------------
    const slide2 = pptx.addSlide();
    slide2.background = { color: BG_DARK };
    applySlideHeaderFooter(slide2, 'Consolidado Executivo de Progresso por Onda');

    // Section Intro Banner
    slide2.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.0,
      w: 11.73,
      h: 0.5,
      fill: { color: '1E293B' },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.05,
    });
    slide2.addText(
      `SÍNTESE DO PROJETO • Progresso Global: ${analytics.overallAvgProgress}%  |  ${analytics.completedItems} Concluídos • ${analytics.inProgressItems} Em Andamento • ${analytics.notStartedItems} A Iniciar`,
      {
        x: 1.0,
        y: 1.08,
        w: 11.33,
        h: 0.35,
        fontSize: 10,
        fontFace: 'Arial',
        color: ACCENT_EMERALD,
        bold: true,
      }
    );

    const ondaTableRows: any[] = [
      [
        { text: 'ONDA DO PROJETO', options: { bold: true, fill: '020617', color: ACCENT_BLUE, align: 'left' } },
        { text: 'TOTAL ITENS', options: { bold: true, fill: '020617', color: TEXT_WHITE, align: 'center' } },
        { text: 'AVANÇO MÉDIO (%)', options: { bold: true, fill: '020617', color: ACCENT_EMERALD, align: 'center' } },
        { text: 'CONCLUÍDOS (100%)', options: { bold: true, fill: '020617', color: '34D399', align: 'center' } },
        { text: 'EM ANDAMENTO', options: { bold: true, fill: '020617', color: 'FBBF24', align: 'center' } },
        { text: 'A INICIAR', options: { bold: true, fill: '020617', color: 'F87171', align: 'center' } },
      ],
    ];

    analytics.ondaSummaries.forEach((o, oIdx) => {
      const rowBg = oIdx % 2 === 0 ? '1E293B' : '162032';
      const pctColor = o.avgPorcentagem >= 80 ? '10B981' : o.avgPorcentagem >= 40 ? '38BDF8' : 'F59E0B';

      ondaTableRows.push([
        { text: o.onda, options: { bold: true, fill: rowBg, color: TEXT_WHITE } },
        { text: String(o.totalFuncionalidades), options: { fill: rowBg, color: TEXT_WHITE, align: 'center' } },
        { text: `${o.avgPorcentagem}%`, options: { bold: true, fill: rowBg, color: pctColor, align: 'center' } },
        { text: String(o.completedCount), options: { bold: true, fill: rowBg, color: '10B981', align: 'center' } },
        { text: String(o.inProgressCount), options: { bold: true, fill: rowBg, color: 'F59E0B', align: 'center' } },
        { text: String(o.notStartedCount), options: { fill: rowBg, color: TEXT_MUTED, align: 'center' } },
      ]);
    });

    // Total Row
    ondaTableRows.push([
      { text: 'TOTAL GERAL / MÉDIA', options: { bold: true, fill: '020617', color: ACCENT_EMERALD } },
      { text: String(analytics.totalRows), options: { bold: true, fill: '020617', color: TEXT_WHITE, align: 'center' } },
      { text: `${analytics.overallAvgProgress}%`, options: { bold: true, fill: '020617', color: ACCENT_EMERALD, align: 'center' } },
      { text: String(analytics.completedItems), options: { bold: true, fill: '020617', color: '10B981', align: 'center' } },
      { text: String(analytics.inProgressItems), options: { bold: true, fill: '020617', color: 'F59E0B', align: 'center' } },
      { text: String(analytics.notStartedItems), options: { bold: true, fill: '020617', color: 'F43F5E', align: 'center' } },
    ]);

    slide2.addTable(ondaTableRows, {
      x: 0.8,
      y: 1.65,
      w: 11.73,
      colW: [3.2, 1.7, 2.0, 1.7, 1.7, 1.43],
      fontSize: 10,
      color: TEXT_WHITE,
      border: { pt: 0.5, color: CARD_BORDER },
    });

    // -----------------------------------------------------------------
    // SLIDE 3: Distribuição por Etapa Atual do Projeto
    // -----------------------------------------------------------------
    const slide3 = pptx.addSlide();
    slide3.background = { color: BG_DARK };
    applySlideHeaderFooter(slide3, 'Distribuição do Progresso por Etapa');

    slide3.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.0,
      w: 11.73,
      h: 0.5,
      fill: { color: '1E293B' },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.05,
    });
    slide3.addText(
      'Mapeamento consolidado das fases operacionais e do percentual de conclusão por Etapa.',
      {
        x: 1.0,
        y: 1.08,
        w: 11.33,
        h: 0.35,
        fontSize: 10,
        fontFace: 'Arial',
        color: ACCENT_BLUE,
        bold: true,
      }
    );

    const etapaTableRows: any[] = [
      [
        { text: 'ETAPA / FASE', options: { bold: true, fill: '020617', color: ACCENT_BLUE } },
        { text: 'QTD. TAREFAS', options: { bold: true, fill: '020617', color: TEXT_WHITE, align: 'center' } },
        { text: 'AVANÇO MÉDIO (%)', options: { bold: true, fill: '020617', color: ACCENT_EMERALD, align: 'center' } },
        { text: 'STATUS E DETALHAMENTO', options: { bold: true, fill: '020617', color: TEXT_WHITE } },
      ],
    ];

    // Show top 10 Etapas max to prevent vertical scrolling/overflow
    const topEtapas = analytics.etapaSummaries.slice(0, 9);
    topEtapas.forEach((et, eIdx) => {
      const rowBg = eIdx % 2 === 0 ? '1E293B' : '162032';
      const pctColor = et.avgPorcentagem === 100 ? '10B981' : et.avgPorcentagem > 0 ? '38BDF8' : '94A3B8';

      etapaTableRows.push([
        { text: et.etapa, options: { bold: true, fill: rowBg, color: TEXT_WHITE } },
        { text: `${et.count} itens`, options: { fill: rowBg, color: TEXT_WHITE, align: 'center' } },
        { text: `${et.avgPorcentagem}%`, options: { bold: true, fill: rowBg, color: pctColor, align: 'center' } },
        {
          text: `${et.completedCount} Concluídos  •  ${et.inProgressCount} Em Andamento  •  ${et.notStartedCount} A Iniciar`,
          options: { fill: rowBg, color: TEXT_MUTED, fontSize: 9 },
        },
      ]);
    });

    slide3.addTable(etapaTableRows, {
      x: 0.8,
      y: 1.65,
      w: 11.73,
      colW: [3.8, 1.8, 2.0, 4.13],
      fontSize: 9.5,
      color: TEXT_WHITE,
      border: { pt: 0.5, color: CARD_BORDER },
    });

    // -----------------------------------------------------------------
    // SLIDE 3B: Análise de Prazos e Riscos do Cronograma (Colunas D & E)
    // -----------------------------------------------------------------
    if (analytics.deadlineAnalytics) {
      const slideDeadline = pptx.addSlide();
      slideDeadline.background = { color: BG_DARK };
      applySlideHeaderFooter(slideDeadline, 'Análise de Prazos & Saúde do Cronograma');

      const dl = analytics.deadlineAnalytics;

      // 4 Deadline KPI Cards across top
      const kpiDlY = 0.95;
      const kpiDlW = 2.75;
      const kpiDlH = 1.25;
      const kpiDlGap = 0.24;

      const deadlineKpis = [
        {
          label: 'ATRASADAS (VENCIDAS)',
          value: String(dl.overdueCount),
          sub: 'Término previsto expirado',
          accent: 'EF4444',
          topBar: 'EF4444',
        },
        {
          label: 'PRÓXIMAS (≤15 DIAS)',
          value: String(dl.dueSoonCount),
          sub: 'Vencimento nos próximos dias',
          accent: 'F59E0B',
          topBar: 'F59E0B',
        },
        {
          label: 'SEM DATA DE INÍCIO',
          value: String(dl.noStartDateCount),
          sub: 'Sem estimativa definida',
          accent: 'CBD5E1',
          topBar: '64748B',
        },
        {
          label: 'NO PRAZO / CONCLUÍDAS',
          value: String(dl.onTrackCount + dl.completedCount),
          sub: 'Dentro do cronograma',
          accent: '10B981',
          topBar: '10B981',
        },
      ];

      deadlineKpis.forEach((kpi, idx) => {
        const cardX = 0.8 + idx * (kpiDlW + kpiDlGap);

        slideDeadline.addShape(pptx.ShapeType.roundRect, {
          x: cardX,
          y: kpiDlY,
          w: kpiDlW,
          h: kpiDlH,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1 },
          rectRadius: 0.08,
        });

        slideDeadline.addShape(pptx.ShapeType.rect, {
          x: cardX,
          y: kpiDlY,
          w: kpiDlW,
          h: 0.06,
          fill: { color: kpi.topBar },
        });

        slideDeadline.addText(kpi.label, {
          x: cardX + 0.12,
          y: kpiDlY + 0.12,
          w: kpiDlW - 0.24,
          h: 0.25,
          fontSize: 8.5,
          fontFace: 'Arial',
          color: TEXT_MUTED,
          bold: true,
        });

        slideDeadline.addText(kpi.value, {
          x: cardX + 0.12,
          y: kpiDlY + 0.35,
          w: kpiDlW - 0.24,
          h: 0.55,
          fontSize: 26,
          fontFace: 'Arial',
          color: kpi.accent,
          bold: true,
        });

        slideDeadline.addText(kpi.sub, {
          x: cardX + 0.12,
          y: kpiDlY + 0.9,
          w: kpiDlW - 0.24,
          h: 0.25,
          fontSize: 8,
          fontFace: 'Arial',
          color: TEXT_MUTED,
        });
      });

      // Chart on Left: Proporção de Saúde do Cronograma
      const chartValues = [dl.overdueCount, dl.dueSoonCount, dl.noStartDateCount, dl.onTrackCount + dl.completedCount];
      const hasChartData = chartValues.some((v) => v > 0);

      if (hasChartData) {
        slideDeadline.addChart(
          pptx.ChartType.doughnut,
          [
            {
              name: 'Saúde do Cronograma',
              labels: ['Atrasadas', 'Próximas (≤15d)', 'Sem Data', 'No Prazo'],
              values: chartValues,
            },
          ],
          {
            x: 0.8,
            y: 2.35,
            w: 4.8,
            h: 4.3,
            chartColors: ['EF4444', 'F59E0B', '64748B', '10B981'],
            showLegend: true,
            legendPos: 'b',
            legendColor: TEXT_WHITE,
            legendFontSize: 8.5,
            showPercent: true,
            showValue: false,
            title: 'PROPORÇÃO DE SAÚDE DO CRONOGRAMA',
            titleColor: TEXT_WHITE,
            titleFontSize: 10,
            titleFontFace: 'Arial',
          }
        );
      }

      // Table on Right: Critical items / alerts
      const criticalItems = [...dl.overdueItems, ...dl.dueSoonItems, ...dl.noStartDateItems].slice(0, 8);

      const tableX = hasChartData ? 5.8 : 0.8;
      const tableW = hasChartData ? 6.73 : 11.73;

      const deadlineTableRows: any[] = [
        [
          { text: 'STATUS', options: { bold: true, fill: '020617', color: ACCENT_BLUE } },
          { text: 'FUNCIONALIDADE', options: { bold: true, fill: '020617', color: TEXT_WHITE } },
          { text: 'ONDA', options: { bold: true, fill: '020617', color: TEXT_WHITE } },
          { text: 'TÉRMINO', options: { bold: true, fill: '020617', color: ACCENT_EMERALD, align: 'center' } },
          { text: 'AVANÇO', options: { bold: true, fill: '020617', color: TEXT_WHITE, align: 'center' } },
        ],
      ];

      if (criticalItems.length === 0) {
        deadlineTableRows.push([
          { text: 'Nenhum alerta de prazo! Todas as tarefas estão rigorosamente no prazo.', options: { fill: '1E293B', color: '10B981', colspan: 5, align: 'center' } }
        ]);
      } else {
        criticalItems.forEach((item, cIdx) => {
          const rowBg = cIdx % 2 === 0 ? '1E293B' : '162032';
          const statusColor = item.status === 'OVERDUE' ? 'EF4444' : item.status === 'DUE_SOON' ? 'F59E0B' : '94A3B8';

          deadlineTableRows.push([
            { text: item.statusLabel, options: { bold: true, fill: rowBg, color: statusColor } },
            { text: item.row.funcionalidade, options: { bold: true, fill: rowBg, color: TEXT_WHITE } },
            { text: item.row.onda, options: { fill: rowBg, color: TEXT_MUTED } },
            { text: item.row.terminoEstimativa || '—', options: { bold: true, fill: rowBg, color: TEXT_WHITE, align: 'center' } },
            { text: `${item.row.porcentagem}%`, options: { bold: true, fill: rowBg, color: statusColor, align: 'center' } },
          ]);
        });
      }

      slideDeadline.addTable(deadlineTableRows, {
        x: tableX,
        y: 2.35,
        w: tableW,
        colW: hasChartData ? [1.5, 2.53, 1.1, 0.9, 0.7] : [2.2, 4.83, 2.3, 1.4, 1.0],
        fontSize: 8.5,
        color: TEXT_WHITE,
        border: { pt: 0.5, color: CARD_BORDER },
      });
    }

    // -----------------------------------------------------------------
    // SLIDES 4+: Visão Executiva por Módulo / Bloco Funcional por Onda
    // Max 6 Macro Items per Slide for spacious, pristine executive layout!
    // -----------------------------------------------------------------
    const MAX_ITEMS_PER_SLIDE = 6;

    analytics.ondaSummaries.forEach((ondaSummary) => {
      const ondaMacroItems = analytics.macroSummaries.filter(
        (m) => m.onda === ondaSummary.onda || (!m.onda && ondaSummary.onda === 'ONDA 1')
      );

      if (ondaMacroItems.length > 0) {
        const totalPages = Math.max(1, Math.ceil(ondaMacroItems.length / MAX_ITEMS_PER_SLIDE));

        for (let pIdx = 0; pIdx < totalPages; pIdx++) {
          const slide = pptx.addSlide();
          slide.background = { color: BG_DARK };

          const slideTitle = totalPages > 1
            ? `Resumo de Módulos: ${ondaSummary.onda} (${pIdx + 1}/${totalPages})`
            : `Resumo de Módulos: ${ondaSummary.onda}`;

          applySlideHeaderFooter(slide, slideTitle);

          // Sub-header stats banner
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: 0.95,
            w: 11.73,
            h: 0.45,
            fill: { color: '1E293B' },
            line: { color: CARD_BORDER, width: 1 },
            rectRadius: 0.05,
          });

          slide.addText(
            `ONDA: ${ondaSummary.onda}  |  Avanço da Onda: ${ondaSummary.avgPorcentagem}%  |  ${ondaSummary.totalFuncionalidades} Tarefas (${ondaSummary.completedCount} Concluídas, ${ondaSummary.inProgressCount} Em Andamento)`,
            {
              x: 1.0,
              y: 1.02,
              w: 11.33,
              h: 0.3,
              fontSize: 10,
              fontFace: 'Arial',
              color: ACCENT_EMERALD,
              bold: true,
            }
          );

          const chunk = ondaMacroItems.slice(pIdx * MAX_ITEMS_PER_SLIDE, (pIdx + 1) * MAX_ITEMS_PER_SLIDE);

          const macroTableRows: any[] = [
            [
              { text: 'MÓDULO / GRUPO FUNCIONAL', options: { bold: true, fill: '020617', color: ACCENT_BLUE } },
              { text: 'QTD. ITENS', options: { bold: true, fill: '020617', color: TEXT_WHITE, align: 'center' } },
              { text: 'STATUS DE SUB-TAREFAS', options: { bold: true, fill: '020617', color: TEXT_WHITE } },
              { text: 'PROGRESSO DO MÓDULO', options: { bold: true, fill: '020617', color: ACCENT_EMERALD, align: 'center' } },
            ],
          ];

          chunk.forEach((macro, mIdx) => {
            const rowBg = mIdx % 2 === 0 ? '1E293B' : '162032';
            const pct = macro.calculatedPorcentagem;
            const pctColor = pct === 100 ? '10B981' : pct >= 50 ? '38BDF8' : pct > 0 ? 'F59E0B' : '94A3B8';

            const statusDetail = macro.subitemsCount > 0
              ? `${macro.completedSubitemsCount} Concluídos  •  ${macro.inProgressSubitemsCount} Em Andamento  •  ${macro.notStartedSubitemsCount} A Iniciar`
              : (macro.etapa || 'Em Acompanhamento');

            macroTableRows.push([
              {
                text: `${macro.wbsCode ? `${macro.wbsCode} ` : ''}${macro.title}`,
                options: { bold: true, fill: rowBg, color: TEXT_WHITE },
              },
              {
                text: macro.subitemsCount > 0 ? `${macro.subitemsCount} itens` : '1 item',
                options: { fill: rowBg, color: TEXT_WHITE, align: 'center' },
              },
              {
                text: statusDetail,
                options: { fill: rowBg, color: TEXT_MUTED, fontSize: 9 },
              },
              {
                text: `${pct}%`,
                options: {
                  bold: true,
                  fill: rowBg,
                  align: 'center',
                  color: pctColor,
                },
              },
            ]);
          });

          slide.addTable(macroTableRows, {
            x: 0.8,
            y: 1.5,
            w: 11.73,
            colW: [4.2, 1.6, 4.33, 1.6],
            fontSize: 9.5,
            color: TEXT_WHITE,
            border: { pt: 0.5, color: CARD_BORDER },
          });
        }
      } else {
        // Fallback if Onda has no macro parent rows: display max 6 representative items
        const rows = ondaSummary.rows;
        const totalDetailPages = Math.max(1, Math.ceil(rows.length / MAX_ITEMS_PER_SLIDE));

        for (let pageIdx = 0; pageIdx < totalDetailPages; pageIdx++) {
          const slide = pptx.addSlide();
          slide.background = { color: BG_DARK };

          const slideTitle = totalDetailPages > 1
            ? `Visão Executiva: ${ondaSummary.onda} (${pageIdx + 1}/${totalDetailPages})`
            : `Visão Executiva: ${ondaSummary.onda}`;

          applySlideHeaderFooter(slide, slideTitle);

          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: 0.95,
            w: 11.73,
            h: 0.45,
            fill: { color: '1E293B' },
            line: { color: CARD_BORDER, width: 1 },
            rectRadius: 0.05,
          });

          slide.addText(
            `Avanço da Onda: ${ondaSummary.avgPorcentagem}%  |  ${ondaSummary.completedCount} de ${ondaSummary.totalFuncionalidades} Concluídos`,
            {
              x: 1.0,
              y: 1.02,
              w: 11.33,
              h: 0.3,
              fontSize: 10,
              fontFace: 'Arial',
              color: ACCENT_EMERALD,
              bold: true,
            }
          );

          const chunkRows = rows.slice(pageIdx * MAX_ITEMS_PER_SLIDE, (pageIdx + 1) * MAX_ITEMS_PER_SLIDE);

          const itemsTableRows: any[] = [
            [
              { text: 'FUNCIONALIDADE / ENTREGÁVEL', options: { bold: true, fill: '020617', color: ACCENT_BLUE } },
              { text: 'ETAPA ATUAL', options: { bold: true, fill: '020617', color: TEXT_WHITE } },
              { text: 'INÍCIO / TÉRMINO ESTIMADO', options: { bold: true, fill: '020617', color: TEXT_WHITE, align: 'center' } },
              { text: 'AVANÇO (%)', options: { bold: true, fill: '020617', color: ACCENT_EMERALD, align: 'center' } },
            ],
          ];

          chunkRows.forEach((row, rIdx) => {
            const rowBg = rIdx % 2 === 0 ? '1E293B' : '162032';
            const displayPct = row.calculatedPorcentagem ?? row.porcentagem;
            const datesText = (row.inicioEstimativa || row.terminoEstimativa)
              ? `${row.inicioEstimativa || '—'} a ${row.terminoEstimativa || '—'}`
              : '—';

            itemsTableRows.push([
              { text: row.funcionalidade, options: { bold: Boolean(row.isParent), fill: rowBg, color: TEXT_WHITE } },
              { text: row.etapa || '—', options: { fill: rowBg, color: TEXT_MUTED } },
              { text: datesText, options: { fill: rowBg, color: TEXT_MUTED, align: 'center' } },
              {
                text: `${displayPct}%`,
                options: {
                  bold: true,
                  fill: rowBg,
                  align: 'center',
                  color: displayPct === 100 ? '10B981' : displayPct >= 50 ? '38BDF8' : displayPct > 0 ? 'F59E0B' : '94A3B8',
                },
              },
            ]);
          });

          slide.addTable(itemsTableRows, {
            x: 0.8,
            y: 1.5,
            w: 11.73,
            colW: [4.73, 3.2, 2.3, 1.5],
            fontSize: 9.5,
            color: TEXT_WHITE,
            border: { pt: 0.5, color: CARD_BORDER },
          });
        }
      }
    });

    // -----------------------------------------------------------------
    // FINAL SLIDE: Closing & Access Note
    // -----------------------------------------------------------------
    const slideEnd = pptx.addSlide();
    slideEnd.background = { color: BG_DARK };
    applySlideHeaderFooter(slideEnd, 'Acompanhamento Integrado');

    slideEnd.addShape(pptx.ShapeType.roundRect, {
      x: 1.5,
      y: 2.0,
      w: 10.33,
      h: 3.2,
      fill: { color: CARD_BG },
      line: { color: ACCENT_EMERALD, width: 1.5 },
      rectRadius: 0.1,
    });

    slideEnd.addText('SISTEMA SUPERAPP ANALYTICS', {
      x: 2.0,
      y: 2.4,
      w: 9.33,
      h: 0.4,
      fontSize: 16,
      fontFace: 'Arial',
      color: ACCENT_EMERALD,
      bold: true,
      align: 'center',
    });

    slideEnd.addText(
      'Para consultar o detalhamento completo em nível de item, sub-tarefa e matriz de acompanhamento de todas as funcionalidades mapeadas, acesse o painel web interativo ou faça o download do Relatório em formato PDF.',
      {
        x: 2.2,
        y: 3.0,
        w: 8.93,
        h: 1.2,
        fontSize: 12,
        fontFace: 'Arial',
        color: TEXT_WHITE,
        align: 'center',
      }
    );

    // Save presentation file
    const cleanFileName = dataset.metadata.fileName.replace('.xlsx', '').replace('.xls', '');
    await pptx.writeFile({ fileName: `SUPERAPP_${cleanFileName}_Apresentacao_Ondas.pptx` });
  } catch (error) {
    console.error('Error generating PowerPoint presentation:', error);
    alert('Erro ao gerar apresentação em PowerPoint.');
  }
}


