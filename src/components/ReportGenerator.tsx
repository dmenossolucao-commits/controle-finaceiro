import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category, FlowType, CashClosure } from '../types';
import { LucideIcon } from './Icon';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getClosures } from '../lib/dbService';

interface ReportGeneratorProps {
  transactions: Transaction[];
  categories: Category[];
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  transactions,
  categories
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to current month 'YYYY-MM'
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportFlow, setReportFlow] = useState<FlowType | 'combinado'>('combinado');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'mensal' | 'fechamentos'>('mensal');
  
  // Cash Closures states
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [loadingClosures, setLoadingClosures] = useState(false);
  const [closuresMonthOnly, setClosuresMonthOnly] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load cash closures from DB on mount
  useEffect(() => {
    const fetchClosures = async () => {
      setLoadingClosures(true);
      try {
        const data = await getClosures();
        setClosures(data);
      } catch (err) {
        console.error('Erro ao buscar fechamentos para relatórios:', err);
      } finally {
        setLoadingClosures(false);
      }
    };
    fetchClosures();
  }, [transactions]); // reload if transactions refresh

  const showLocalStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Format YYYY-MM to readable month name (Portuguese)
  const getMonthLabel = (mKey: string) => {
    const [year, month] = mKey.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[parseInt(month, 10) - 1]} de ${year}`;
  };

  // Filter list of months that have data
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    // Pre-populate with current month so it is always selectable
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthKey);

    transactions.forEach(t => {
      monthsSet.add(t.date.slice(0, 7));
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Filter transactions based on selection for preview/export (Monthly Report)
  const reportTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchMonth = t.date.slice(0, 7) === selectedMonth;
      const matchFlow = reportFlow === 'combinado' || t.flowType === reportFlow;
      return matchMonth && matchFlow;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedMonth, reportFlow]);

  // Statistics for the selected report filters (Monthly Report)
  const stats = useMemo(() => {
    let totalReceitas = 0;
    let totalDespesas = 0;
    const catTotals: Record<string, number> = {};

    reportTransactions.forEach(t => {
      if (t.type === 'receita') {
        totalReceitas += t.amount;
      } else {
        totalDespesas += t.amount;
        catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
      }
    });

    const categoriesBreakdown = Object.entries(catTotals).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId) || { name: 'Sem Categoria' };
      return {
        name: cat.name,
        amount
      };
    }).sort((a, b) => b.amount - a.amount);

    return {
      receitas: totalReceitas,
      despesas: totalDespesas,
      saldo: totalReceitas - totalDespesas,
      categoriesBreakdown
    };
  }, [reportTransactions, categories]);

  // -------------------------------------------------------------
  // CASH CLOSURE STATISTICS & REPORT CALCULATIONS
  // -------------------------------------------------------------
  const processedClosures = useMemo(() => {
    return closures.map(c => {
      // Find transactions linked to this closure via closureId or within c.transactionIds list
      const linkedTx = transactions.filter(t => t.closureId === c.id || (c.transactionIds && c.transactionIds.includes(t.id)));

      const revenues = linkedTx.filter(t => t.type === 'receita');
      const vales = linkedTx.filter(t => t.type === 'despesa');

      let dinheiro = 0;
      let pix = 0;
      let credito = 0;
      let debito = 0;
      let outros = 0;

      revenues.forEach(r => {
        const method = r.paymentMethod || 'outro';
        if (method === 'dinheiro') dinheiro += r.amount;
        else if (method === 'pix') pix += r.amount;
        else if (method === 'cartao_credito') credito += r.amount;
        else if (method === 'cartao_debito') debito += r.amount;
        else outros += r.amount;
      });

      const totalVales = vales.reduce((sum, v) => sum + v.amount, 0);

      // Fallback if no linked transactions are fetched/available (older records safety)
      if (revenues.length === 0) {
        pix = c.totalPix || 0;
        dinheiro = c.totalCash || 0;
        credito = c.totalCards || 0;
      }

      // Card discount amount
      const cardsTotal = credito + debito;
      const descTaxa = cardsTotal * ((c.cardDiscountRate || 0) / 100);

      const totalBruto = dinheiro + pix + cardsTotal + outros;
      const liquidoFinal = totalBruto - descTaxa - totalVales;

      return {
        ...c,
        dinheiro,
        pix,
        credito,
        debito,
        outros,
        totalVales,
        descTaxa,
        totalBruto,
        liquidoFinal
      };
    });
  }, [closures, transactions]);

  // Filter closures by month option
  const filteredClosures = useMemo(() => {
    return processedClosures.filter(c => {
      if (closuresMonthOnly) {
        return c.date.slice(0, 7) === selectedMonth;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [processedClosures, closuresMonthOnly, selectedMonth]);

  // Sum of individual payment totals across all filtered closures
  const closureTotals = useMemo(() => {
    let totDinheiro = 0;
    let totPix = 0;
    let totCredito = 0;
    let totDebito = 0;
    let totOutros = 0;
    let totVales = 0;
    let totDesc = 0;
    let totBruto = 0;
    let totLiquido = 0;

    filteredClosures.forEach(c => {
      totDinheiro += c.dinheiro;
      totPix += c.pix;
      totCredito += c.credito;
      totDebito += c.debito;
      totOutros += c.outros;
      totVales += c.totalVales;
      totDesc += c.descTaxa;
      totBruto += c.totalBruto;
      totLiquido += c.liquidoFinal;
    });

    return {
      dinheiro: totDinheiro,
      pix: totPix,
      credito: totCredito,
      debito: totDebito,
      outros: totOutros,
      vales: totVales,
      descTaxa: totDesc,
      totalBruto: totBruto,
      liquidoFinal: totLiquido
    };
  }, [filteredClosures]);

  // PDF Export execution (Monthly Report)
  const exportPDF = () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 14;

      // 1. HEADER (Styled)
      doc.setFillColor(15, 23, 42); // deep slate/black (#0f172a)
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('CONTROLE FINANCEIRO', margin, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Relatório de Desempenho Mensal', margin, 26);

      // Date information (aligned right in header)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(getMonthLabel(selectedMonth).toUpperCase(), pageWidth - margin - 60, 18, { align: 'left' });
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      const flowText = reportFlow === 'combinado' 
        ? 'Fluxo: Pessoal & Comércio (Combinado)' 
        : reportFlow === 'pessoal' ? 'Fluxo: Contabilidade Pessoal' : 'Fluxo: Meu Comércio';
      doc.text(flowText, pageWidth - margin - 60, 26, { align: 'left' });

      // 2. SUMMARY SECTION (KPIs)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('Resumo Financeiro do Período', margin, 52);

      // Draw neat KPI Grid
      const colWidth = (pageWidth - (margin * 2)) / 3;
      
      // KPI 1: Receitas
      doc.setFillColor(240, 253, 244); // light green
      doc.roundedRect(margin, 57, colWidth - 2, 22, 3, 3, 'F');
      doc.setTextColor(22, 101, 52); // dark green
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.text('ENTRADAS (RECEITAS)', margin + 4, 63);
      doc.setFontSize(13);
      doc.text(formatCurrency(stats.receitas), margin + 4, 72);

      // KPI 2: Despesas
      doc.setFillColor(254, 242, 242); // light red
      doc.roundedRect(margin + colWidth, 57, colWidth - 2, 22, 3, 3, 'F');
      doc.setTextColor(153, 27, 27); // dark red
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.text('SAÍDAS (DESPESAS)', margin + colWidth + 4, 63);
      doc.setFontSize(13);
      doc.text(formatCurrency(stats.despesas), margin + colWidth + 4, 72);

      // KPI 3: Saldo
      const isPositive = stats.saldo >= 0;
      if (isPositive) {
        doc.setFillColor(239, 246, 255); // blue
      } else {
        doc.setFillColor(254, 242, 242); // light red
      }
      doc.roundedRect(margin + (colWidth * 2), 57, colWidth, 22, 3, 3, 'F');
      if (isPositive) {
        doc.setTextColor(30, 64, 175); // blue
      } else {
        doc.setTextColor(153, 27, 27); // red
      }
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.text('SALDO LÍQUIDO', margin + (colWidth * 2) + 4, 63);
      doc.setFontSize(13);
      doc.text(formatCurrency(stats.saldo), margin + (colWidth * 2) + 4, 72);

      let currentY = 92;

      // 3. CATEGORIES BREAKDOWN
      if (stats.categoriesBreakdown.length > 0) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text('Distribuição de Despesas por Categoria', margin, currentY);

        const categoryRows = stats.categoriesBreakdown.map(item => [
          item.name,
          formatCurrency(item.amount),
          `${((item.amount / (stats.despesas || 1)) * 100).toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: currentY + 4,
          head: [['Categoria', 'Total Gasto', 'Representação']],
          body: categoryRows,
          theme: 'striped',
          headStyles: { fillColor: [71, 85, 105], fontSize: 10 },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right', fontStyle: 'bold' },
            2: { halign: 'right' }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Check page height limit to avoid placing header on bottom of page
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      // 4. TRANSACTION DETAILS
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('Detalhamento de Lançamentos do Período', margin, currentY);

      const txRows = reportTransactions.map(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const [year, month, day] = t.date.split('-');
        return [
          `${day}/${month}`,
          t.title,
          cat?.name || 'Geral',
          t.flowType.toUpperCase(),
          t.type === 'receita' ? 'Entrada' : 'Saída',
          `${t.type === 'receita' ? '+' : '-'} ${formatCurrency(t.amount)}`
        ];
      });

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Data', 'Descrição', 'Categoria', 'Fluxo', 'Tipo', 'Valor']],
        body: txRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
        columnStyles: {
          0: { halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { fontStyle: 'normal' },
          3: { halign: 'center', fontStyle: 'bold' },
          4: { halign: 'center' },
          5: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const val = data.cell.text[0];
            if (val.startsWith('+')) {
              data.cell.styles.textColor = [22, 101, 52]; // green
            } else {
              data.cell.styles.textColor = [15, 23, 42]; // black/neutral
            }
          }
        }
      });

      // Footer signature
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Relatório exportado em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')} - Desenvolvido por Controle Financeiro IA`,
        pageWidth / 2,
        finalY > 275 ? 285 : finalY,
        { align: 'center' }
      );

      // Save PDF
      const pdfName = `Relatorio_${selectedMonth}_${reportFlow}.pdf`;
      doc.save(pdfName);
      showLocalStatus('Relatório PDF exportado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      showLocalStatus('Erro ao gerar relatório em PDF.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------------------------------------------
  // DETAILED CASH CLOSURE EXPORTS (PDF & EXCEL)
  // -------------------------------------------------------------
  const exportClosuresPDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape (l) for many columns
      const pageWidth = doc.internal.pageSize.width;
      const margin = 14;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('RELATÓRIO DE FECHAMENTO DE CAIXA DETALHADO', margin, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Totais de Dinheiro, PIX, Cartão de Crédito, Cartão de Débito e Descontos/Vales', margin, 26);

      // Period Indicator
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      const periodLabel = closuresMonthOnly ? getMonthLabel(selectedMonth).toUpperCase() : 'TODOS OS FECHAMENTOS DE CAIXA';
      doc.text(periodLabel, pageWidth - margin - 85, 22, { align: 'left' });

      // Build data rows
      const tableRows = filteredClosures.map(c => [
        c.date,
        formatCurrency(c.dinheiro),
        formatCurrency(c.pix),
        formatCurrency(c.credito),
        formatCurrency(c.debito),
        formatCurrency(c.outros),
        formatCurrency(c.totalVales),
        formatCurrency(c.descTaxa),
        formatCurrency(c.totalBruto),
        formatCurrency(c.liquidoFinal)
      ]);

      // Grand totals row
      const totalsRow = [
        'GRANDES TOTAIS',
        formatCurrency(closureTotals.dinheiro),
        formatCurrency(closureTotals.pix),
        formatCurrency(closureTotals.credito),
        formatCurrency(closureTotals.debito),
        formatCurrency(closureTotals.outros),
        formatCurrency(closureTotals.vales),
        formatCurrency(closureTotals.descTaxa),
        formatCurrency(closureTotals.totalBruto),
        formatCurrency(closureTotals.liquidoFinal)
      ];

      autoTable(doc, {
        startY: 50,
        head: [[
          'Data',
          'Dinheiro (Bruto)',
          'PIX',
          'C. Crédito',
          'C. Débito',
          'Outros',
          'Vales (Saídas)',
          'Taxas Cartão',
          'Total Bruto',
          'Líquido Final'
        ]],
        body: [...tableRows, totalsRow],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], fontSize: 8.5 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'center' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right', textColor: [153, 27, 27] }, // dark red for vales
          7: { halign: 'right' },
          8: { halign: 'right', fontStyle: 'bold' },
          9: { halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] } // dark green for net final
        },
        didParseCell: (data) => {
          // Highlight totals row
          if (data.row.index === tableRows.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249]; // slate-100
            if (data.column.index === 9) {
              data.cell.styles.textColor = [22, 101, 52];
            }
          }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Documento exportado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} - Sistema de Gestão Inteligente`,
        pageWidth / 2,
        finalY > 185 ? 195 : finalY,
        { align: 'center' }
      );

      const fileSuffix = closuresMonthOnly ? `_${selectedMonth}` : '_completo';
      doc.save(`Fechamento_Caixa_Detalhado${fileSuffix}.pdf`);
      showLocalStatus('Relatório Detalhado de Fechamentos (PDF) baixado com sucesso!');
    } catch (err) {
      console.error(err);
      showLocalStatus('Erro ao exportar fechamentos em PDF.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportClosuresExcel = () => {
    try {
      const headers = [
        'Data',
        'Dinheiro Bruto',
        'PIX',
        'Cartao Credito',
        'Cartao Debito',
        'Outros',
        'Vales / Saidas',
        'Taxas Cartao',
        'Total Bruto',
        'Liquido Final',
        'Observacoes'
      ];

      const rows = filteredClosures.map(c => [
        c.date,
        c.dinheiro.toFixed(2).replace('.', ','),
        c.pix.toFixed(2).replace('.', ','),
        c.credito.toFixed(2).replace('.', ','),
        c.debito.toFixed(2).replace('.', ','),
        c.outros.toFixed(2).replace('.', ','),
        c.totalVales.toFixed(2).replace('.', ','),
        c.descTaxa.toFixed(2).replace('.', ','),
        c.totalBruto.toFixed(2).replace('.', ','),
        c.liquidoFinal.toFixed(2).replace('.', ','),
        (c.notes || '').replace(/[\n\r;]/g, ' ')
      ]);

      // Semicolon summary line at the bottom
      const totalsRow = [
        'TOTAIS',
        closureTotals.dinheiro.toFixed(2).replace('.', ','),
        closureTotals.pix.toFixed(2).replace('.', ','),
        closureTotals.credito.toFixed(2).replace('.', ','),
        closureTotals.debito.toFixed(2).replace('.', ','),
        closureTotals.outros.toFixed(2).replace('.', ','),
        closureTotals.vales.toFixed(2).replace('.', ','),
        closureTotals.descTaxa.toFixed(2).replace('.', ','),
        closureTotals.totalBruto.toFixed(2).replace('.', ','),
        closureTotals.liquidoFinal.toFixed(2).replace('.', ','),
        ''
      ];

      const csvContent = [
        headers.join(';'),
        ...rows.map(r => r.join(';')),
        totalsRow.join(';')
      ].join('\n');

      // Use BOM \uFEFF to make sure Excel detects UTF-8 correctly
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      const fileSuffix = closuresMonthOnly ? `_mes_${selectedMonth}` : '_geral';
      downloadAnchor.setAttribute('download', `relatorio_detalhado_fechamentos${fileSuffix}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showLocalStatus('Relatório Excel (CSV) gerado e baixado com sucesso!');
    } catch (err) {
      console.error(err);
      showLocalStatus('Erro ao exportar para Excel.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner inside the component */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-md animate-fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <LucideIcon name={statusMessage.type === 'success' ? 'CheckCircle2' : 'AlertOctagon'} size={18} />
          <span className="text-xs font-bold leading-tight">{statusMessage.text}</span>
        </div>
      )}

      {/* REPORT TYPE SELECTOR PILLS */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-lg shadow-inner">
        <button
          type="button"
          onClick={() => setActiveReportTab('mensal')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${
            activeReportTab === 'mensal'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LucideIcon name="TrendingUp" size={14} />
          Relatório Mensal Financeiro
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('fechamentos')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${
            activeReportTab === 'fechamentos'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LucideIcon name="History" size={14} />
          Relatório Detalhado de Fechamentos
        </button>
      </div>

      {activeReportTab === 'mensal' ? (
        /* ========================================== */
        /* TAB 1: MONTHLY PERFORMANCE REPORT (EXISTING) */
        /* ========================================== */
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-slate-100 p-1.5 rounded-lg text-slate-700">
                <LucideIcon name="FileText" size={18} />
              </span>
              Exportador de Relatórios em PDF
            </h3>
            <p className="text-xs text-slate-500 mt-1">Gere demonstrativos detalhados, juntos ou separados, prontos para download.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FILTERS COLUMN */}
            <div className="space-y-4 md:col-span-1 border-r border-slate-100 pr-0 md:pr-6">
              {/* SELECT PERIOD */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Selecione o Mês / Período
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 font-mono bg-white"
                >
                  {availableMonths.map(m => {
                    const [year, month] = m.split('-');
                    const monthNames = [
                      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                    ];
                    return (
                      <option key={m} value={m}>
                        {monthNames[parseInt(month, 10) - 1]} de {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* SELECT REPORT FLOW */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Escopo do Relatório
                </label>
                <div className="flex flex-col space-y-2">
                  <button
                    type="button"
                    onClick={() => setReportFlow('combinado')}
                    className={`w-full py-2.5 px-3 text-xs font-semibold rounded-xl border text-left flex items-center gap-2 transition-all ${
                      reportFlow === 'combinado'
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${reportFlow === 'combinado' ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    Relatório Combinado (Tudo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportFlow('pessoal')}
                    className={`w-full py-2.5 px-3 text-xs font-semibold rounded-xl border text-left flex items-center gap-2 transition-all ${
                      reportFlow === 'pessoal'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${reportFlow === 'pessoal' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    Apenas Contabilidade Pessoal
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportFlow('comercio')}
                    className={`w-full py-2.5 px-3 text-xs font-semibold rounded-xl border text-left flex items-center gap-2 transition-all ${
                      reportFlow === 'comercio'
                        ? 'border-slate-800 bg-slate-900 text-white font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${reportFlow === 'comercio' ? 'bg-slate-800' : 'bg-slate-300'}`} />
                    Apenas Meu Comércio
                  </button>
                </div>
              </div>

              <button
                onClick={exportPDF}
                disabled={isGenerating || reportTransactions.length === 0}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Gerando demonstrativo...
                  </>
                ) : (
                  <>
                    <LucideIcon name="Download" size={16} />
                    Exportar Relatório PDF
                  </>
                )}
              </button>
            </div>

            {/* PREVIEW COLUMN */}
            <div className="md:col-span-2 flex flex-col justify-between bg-slate-50/50 rounded-xl p-5 border border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Prévia do Demonstrativo</h4>
                
                {reportTransactions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-1">
                    <LucideIcon name="AlertTriangle" size={28} className="text-slate-300 mb-1" />
                    <span className="text-xs font-semibold">Nenhum lançamento neste período</span>
                    <span className="text-[10px] text-slate-400 max-w-xs leading-normal">
                      Selecione outro mês ou lance novas transações no painel para habilitar a exportação deste relatório.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Receitas</span>
                        <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(stats.receitas)}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Despesas</span>
                        <p className="text-sm font-bold text-rose-600 mt-0.5">{formatCurrency(stats.despesas)}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Saldo Líquido</span>
                        <p className={`text-sm font-bold mt-0.5 ${stats.saldo >= 0 ? 'text-slate-800' : 'text-rose-700'}`}>
                          {formatCurrency(stats.saldo)}
                        </p>
                      </div>
                    </div>

                    {/* Categories Preview list */}
                    {stats.categoriesBreakdown.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Despesas de Maior Peso</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {stats.categoriesBreakdown.slice(0, 4).map(item => (
                            <div key={item.name} className="bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-600 truncate mr-2">{item.name}</span>
                              <span className="font-mono font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Últimas Transações Deste Lote ({reportTransactions.length} totais)
                      </span>
                      <div className="bg-white rounded-lg border border-slate-100 max-h-32 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {reportTransactions.slice(-3).map(t => (
                          <div key={t.id} className="p-2.5 flex items-center justify-between">
                            <span className="font-medium text-slate-700 truncate max-w-[150px] sm:max-w-xs">{t.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                {t.flowType}
                              </span>
                              <span className={`font-mono font-bold ${t.type === 'receita' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <LucideIcon name="Check" size={12} className="text-emerald-500" />
                  Geração 100% segura no navegador
                </span>
                <span>Estilo Profissional com Tabelas</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================== */
        /* TAB 2: DETAILED CASH CLOSURES REPORT (NEW) */
        /* ========================================== */
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-emerald-50 p-1.5 rounded-lg text-emerald-700">
                <LucideIcon name="History" size={18} />
              </span>
              Relatório Detalhado de Fechamentos de Caixa
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gere demonstrativos analíticos individuais para Dinheiro, PIX, Cartão de Crédito, Cartão de Débito, Vales (Saídas) e descontos operacionais.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Filter & Export Actions */}
            <div className="lg:col-span-1 space-y-4 border-r border-slate-100 pr-0 lg:pr-6">
              
              {/* Selected Month selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mês Base
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400 font-mono bg-white"
                >
                  {availableMonths.map(m => {
                    const [year, month] = m.split('-');
                    const monthNames = [
                      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                    ];
                    return (
                      <option key={m} value={m}>
                        {monthNames[parseInt(month, 10) - 1]} de {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Filter scope toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Filtro de Período
                </label>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setClosuresMonthOnly(true)}
                    className={`w-full py-2.5 px-3 text-xs font-semibold rounded-xl border text-left flex items-center gap-2 transition-all ${
                      closuresMonthOnly
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${closuresMonthOnly ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                    Apenas do Mês Selecionado ({getMonthLabel(selectedMonth)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setClosuresMonthOnly(false)}
                    className={`w-full py-2.5 px-3 text-xs font-semibold rounded-xl border text-left flex items-center gap-2 transition-all ${
                      !closuresMonthOnly
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${!closuresMonthOnly ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    Todo o Histórico (Todos os Fechamentos)
                  </button>
                </div>
              </div>

              {/* Download actions */}
              <div className="pt-2 space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Exportar Dados Consolidados
                </label>
                
                {/* PDF Export button */}
                <button
                  onClick={exportClosuresPDF}
                  disabled={isGenerating || filteredClosures.length === 0}
                  className="w-full py-3 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Gerando Relatório...
                    </>
                  ) : (
                    <>
                      <LucideIcon name="FileText" size={15} />
                      Exportar Relatório PDF (A4)
                    </>
                  )}
                </button>

                {/* Excel Export button */}
                <button
                  onClick={exportClosuresExcel}
                  disabled={filteredClosures.length === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <LucideIcon name="FileSpreadsheet" size={15} />
                  Exportar para Excel (CSV)
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-[10px] text-slate-500 leading-relaxed">
                <strong>Dica de Uso:</strong> O arquivo Excel exportado vem em formato de valores separados por ponto e vírgula (;), ideal para visualização rápida em programas de planilha ou importações para contabilidade.
              </div>
            </div>

            {/* Right Detailed Preview of Closures & Individual Payment Methods */}
            <div className="lg:col-span-2 space-y-6">
              
              {loadingClosures ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <span className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mb-2"></span>
                  <p className="text-xs">Carregando dados dos fechamentos...</p>
                </div>
              ) : filteredClosures.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl">
                  <LucideIcon name="AlertTriangle" size={32} className="text-slate-300 mb-2" />
                  <span className="text-xs font-semibold">Nenhum fechamento registrado neste filtro</span>
                  <span className="text-[10px] text-slate-400 mt-1 max-w-sm">
                    {closuresMonthOnly 
                      ? "Não há fechamentos de caixa salvos no mês selecionado. Mude o filtro para visualizar todo o histórico."
                      : "Nenhum fechamento de caixa foi registrado no sistema ainda."}
                  </span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* METRIC SUMMARIES */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3.5">
                    <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider block">
                      📊 Totais Acumulados do Período ({filteredClosures.length} fechamentos)
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">💵 Dinheiro</span>
                        <span className="text-xs font-bold font-mono text-slate-800 block mt-0.5">{formatCurrency(closureTotals.dinheiro)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">⚡ PIX</span>
                        <span className="text-xs font-bold font-mono text-slate-800 block mt-0.5">{formatCurrency(closureTotals.pix)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">💳 C. Crédito</span>
                        <span className="text-xs font-bold font-mono text-slate-800 block mt-0.5">{formatCurrency(closureTotals.credito)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">💳 C. Débito</span>
                        <span className="text-xs font-bold font-mono text-slate-800 block mt-0.5">{formatCurrency(closureTotals.debito)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                        <span className="text-[8px] font-bold text-rose-500 uppercase tracking-wider block">🎟️ Vales/Saídas</span>
                        <span className="text-xs font-bold font-mono text-rose-600 block mt-0.5">-{formatCurrency(closureTotals.vales)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-200/60 pt-3">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Faturamento Bruto</span>
                        <span className="text-sm font-black font-mono text-slate-700 block mt-0.5">{formatCurrency(closureTotals.totalBruto)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider block">Resultado Líquido</span>
                        <span className="text-base font-black font-mono text-emerald-600 block mt-0.5">{formatCurrency(closureTotals.liquidoFinal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* PREVIEW OF INDIVIDUAL ROWS */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Visualização dos Fechamentos ({filteredClosures.length})
                    </span>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white text-xs">
                      {filteredClosures.map(c => (
                        <div key={c.id} className="p-3 hover:bg-slate-50/50 transition-all space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 font-mono">📅 {c.date}</span>
                            <span className="font-black font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                              Líq: {formatCurrency(c.liquidoFinal)}
                            </span>
                          </div>

                          <div className="grid grid-cols-5 gap-1.5 text-[10px] text-slate-500 font-mono bg-slate-50 p-2 rounded-xl">
                            <div>
                              <span className="text-[8px] block text-slate-400 uppercase">Dinheiro</span>
                              <span className="font-semibold text-slate-700">{formatCurrency(c.dinheiro)}</span>
                            </div>
                            <div>
                              <span className="text-[8px] block text-slate-400 uppercase">PIX</span>
                              <span className="font-semibold text-slate-700">{formatCurrency(c.pix)}</span>
                            </div>
                            <div>
                              <span className="text-[8px] block text-slate-400 uppercase">Crédito</span>
                              <span className="font-semibold text-slate-700">{formatCurrency(c.credito)}</span>
                            </div>
                            <div>
                              <span className="text-[8px] block text-slate-400 uppercase">Débito</span>
                              <span className="font-semibold text-slate-700">{formatCurrency(c.debito)}</span>
                            </div>
                            <div>
                              <span className="text-[8px] block text-rose-400 uppercase">Vales</span>
                              <span className="font-semibold text-rose-600">-{formatCurrency(c.totalVales)}</span>
                            </div>
                          </div>

                          {c.notes && (
                            <p className="text-[9px] text-slate-400 italic leading-tight truncate">
                              &ldquo;{c.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
