/**
 * exportService.ts
 * Service d'export PDF, Excel et Word pour Poissonnerie Tata
 * Charte graphique : #1A365D (bleu marine), #ECC94B (or), #2D3748 (ardoise)
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, TableLayoutType, ImageRun,
} from 'docx'
import type { Produit, Vente, Client } from '../types/pos'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fmt = (n: number) => Number(n).toLocaleString('fr-FR')
const today = () => new Date().toLocaleDateString('fr-FR')
const now   = () => new Date().toLocaleString('fr-FR')

// Convertit une URL image en base64 (pour jsPDF et docx)
export async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Couleurs charte (RGB pour jsPDF)
const BLEU  = [26,  54,  93]  as [number,number,number]
const OR    = [236, 201, 75]  as [number,number,number]
const ARDOISE = [45, 55, 72]  as [number,number,number]
const GRIS  = [247, 250, 252] as [number,number,number]
const BLANC = [255, 255, 255] as [number,number,number]
const ROUGE = [229,  62,  62] as [number,number,number]
const VERT  = [56,  161, 105] as [number,number,number]

// ─────────────────────────────────────────────
// En-tête commune PDF
// ─────────────────────────────────────────────
function pdfHeader(doc: jsPDF, titre: string, sous: string, logoBase64?: string) {
  const W = doc.internal.pageSize.getWidth()

  // Bandeau bleu marine
  doc.setFillColor(...BLEU)
  doc.rect(0, 0, W, 42, 'F')

  // Logo (si disponible)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', 14, 5, 30, 30)
    } catch (_) { /* logo non chargé, on continue */ }
  }

  const textX = logoBase64 ? 50 : 18

  // Titre entreprise
  doc.setTextColor(...BLANC)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('POISSONNERIE TATA', textX, 16)

  // Sous-titre entreprise
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 215, 235)
  doc.text('Conakry — Guinée  |  +224 623 89 73 81', textX, 24)

  // Nom du rapport (droite, fond or)
  doc.setFillColor(...OR)
  doc.roundedRect(W - 80, 6, 72, 14, 3, 3, 'F')
  doc.setTextColor(...BLEU)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(titre.toUpperCase(), W - 44, 14.5, { align: 'center' })

  // Date (droite, sous badge)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(200, 215, 235)
  doc.text(`Généré le ${now()}`, W - 44, 29, { align: 'center' })

  // Sous-titre rapport
  doc.setTextColor(...ARDOISE)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.text(sous, 18, 52)

  // Ligne séparatrice or
  doc.setDrawColor(...OR)
  doc.setLineWidth(0.8)
  doc.line(18, 56, W - 18, 56)

  return 64 // Y de départ pour le contenu
}

// Pied de page PDF
function pdfFooter(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const pages = doc.getNumberOfPages()

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFillColor(245, 247, 250)
    doc.rect(0, H - 14, W, 14, 'F')
    doc.setDrawColor(...BLEU)
    doc.setLineWidth(0.4)
    doc.line(0, H - 14, W, H - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('Poissonnerie Tata — Document officiel', 18, H - 5)
    doc.text(`Page ${i} / ${pages}`, W - 18, H - 5, { align: 'right' })
  }
}

// KPI box PDF
function pdfKpiBox(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  label: string, valeur: string, couleurVal: [number,number,number]
) {
  doc.setFillColor(...GRIS)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(x, y, w, h, 3, 3, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(label.toUpperCase(), x + w / 2, y + 9, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...couleurVal)
  doc.text(valeur, x + w / 2, y + 20, { align: 'center' })
}

// ═══════════════════════════════════════════════
// ██  EXPORT PDF
// ═══════════════════════════════════════════════

// ── PDF Rapport Caisse ────────────────────────
export async function exportPDFCaisse(
  ventesJour: Vente[],
  especes: number, virement: number, credit: number,
  logoUrl?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const dateAuj = new Date().toISOString().slice(0, 10)

  const logo = logoUrl ? await imageUrlToBase64(logoUrl).catch(() => undefined) : undefined
  let y = pdfHeader(doc, 'Rapport de Caisse', `Journée du ${dateAuj}`, logo)

  // KPIs
  const kpis = [
    { label: 'Total Caisse',     val: `${fmt(especes + virement)} GNF`, color: VERT  },
    { label: 'Espèces',          val: `${fmt(especes)} GNF`,            color: BLEU  },
    { label: 'Virement',         val: `${fmt(virement)} GNF`,           color: [59, 130, 246] as [number,number,number] },
    { label: 'En Crédit',        val: `${fmt(credit)} GNF`,             color: [202, 138, 4] as [number,number,number] },
  ]
  const kw = (W - 36 - 9) / 4
  kpis.forEach((k, i) => pdfKpiBox(doc, 18 + i * (kw + 3), y, kw, 28, k.label, k.val, k.color))
  y += 36

  // Tableau ventes
  autoTable(doc, {
    startY: y,
    head: [['Client', 'Mode', 'Encaissé (GNF)', 'Reste (GNF)', 'Statut']],
    body: ventesJour.map(v => [
      v.clientNom,
      v.modeReglement,
      fmt(v.montantEncaisse),
      fmt(v.resteAPayer),
      v.statut.toUpperCase(),
    ]),
    headStyles: {
      fillColor: BLEU, textColor: BLANC,
      fontSize: 9, fontStyle: 'bold', halign: 'left',
    },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    alternateRowStyles: { fillColor: GRIS },
    bodyStyles: { fontSize: 9, textColor: ARDOISE },
    foot: [[
      { content: `${ventesJour.length} transaction(s)`, colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: `${fmt(especes + virement)} GNF`, styles: { fontStyle: 'bold', textColor: VERT, halign: 'right' } },
      { content: `${fmt(credit)} GNF`, styles: { fontStyle: 'bold', textColor: [202, 138, 4], halign: 'right' } },
      '',
    ]],
    footStyles: { fillColor: [240, 249, 255], fontSize: 9 },
    margin: { left: 18, right: 18 },
  })

  pdfFooter(doc)
  doc.save(`caisse_${dateAuj}.pdf`)
}

// ── PDF Rapport Analytique Ventes ─────────────
export async function exportPDFVentes(
  ventes: Vente[],
  ca: number, marge: number,
  topProduits: { nom: string; qte: number; ca: number }[],
  parMode: { especes: number; virement: number; credit: number },
  periode: { debut: string; fin: string },
  logoUrl?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const label = periode.debut && periode.fin
    ? `Du ${periode.debut} au ${periode.fin}`
    : `Toutes périodes — ${ventes.length} vente(s)`

  const logo = logoUrl ? await imageUrlToBase64(logoUrl).catch(() => undefined) : undefined
  let y = pdfHeader(doc, 'Analytique Ventes', label, logo)

  // KPIs
  const kpis = [
    { label: "Chiffre d'affaires", val: `${fmt(ca)} GNF`,     color: OR         as [number,number,number] },
    { label: 'Marge brute',        val: `${fmt(marge)} GNF`,  color: VERT       },
    { label: 'Nb de ventes',       val: `${ventes.length}`,   color: BLEU       },
    { label: 'Tx marge',           val: ca > 0 ? `${Math.round((marge / ca) * 100)}%` : '0%', color: [202, 138, 4] as [number,number,number] },
  ]
  const kw = (W - 36 - 9) / 4
  kpis.forEach((k, i) => pdfKpiBox(doc, 18 + i * (kw + 3), y, kw, 28, k.label, k.val, k.color))
  y += 36

  // Titre section
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BLEU)
  doc.text('Détail des ventes', 18, y + 6)
  y += 10

  // Tableau ventes
  autoTable(doc, {
    startY: y,
    head: [['#', 'Date', 'Client', 'Mode', 'Total Net (GNF)', 'Encaissé (GNF)', 'Reste (GNF)', 'Statut']],
    body: ventes.map((v, i) => [
      i + 1,
      v.dateStr,
      v.clientNom,
      v.modeReglement,
      fmt(v.totalNet),
      fmt(v.montantEncaisse),
      fmt(v.resteAPayer),
      v.statut.toUpperCase(),
    ]),
    headStyles: { fillColor: BLEU, textColor: BLANC, fontSize: 8, fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'center' },
    },
    alternateRowStyles: { fillColor: GRIS },
    bodyStyles: { fontSize: 8, textColor: ARDOISE },
    foot: [[
      '', '', `${ventes.length} vente(s)`, '',
      { content: `${fmt(ca)} GNF`, styles: { fontStyle: 'bold', textColor: OR, halign: 'right' } },
      { content: `${fmt(parMode.especes + parMode.virement)} GNF`, styles: { fontStyle: 'bold', textColor: VERT, halign: 'right' } },
      { content: `${fmt(parMode.credit)} GNF`, styles: { fontStyle: 'bold', textColor: ROUGE, halign: 'right' } },
      '',
    ]],
    footStyles: { fillColor: [240, 249, 255], fontSize: 8 },
    margin: { left: 18, right: 18 },
  })

  // Top 5 produits
  const afterTable = (doc as any).lastAutoTable?.finalY ?? 180
  if (afterTable < 230) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BLEU)
    doc.text('Top 5 Produits', 18, afterTable + 12)

    autoTable(doc, {
      startY: afterTable + 16,
      head: [['Rang', 'Produit', "Chiffre d'affaires (GNF)", 'Quantité']],
      body: topProduits.map((p, i) => [i + 1, p.nom, fmt(p.ca), p.qte]),
      headStyles: { fillColor: ARDOISE, textColor: BLANC, fontSize: 9, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        2: { halign: 'right' },
        3: { halign: 'center' },
      },
      alternateRowStyles: { fillColor: GRIS },
      bodyStyles: { fontSize: 9 },
      margin: { left: 18, right: 18 },
    })
  }

  pdfFooter(doc)
  doc.save(`ventes_analytique_${new Date().toISOString().slice(0,10)}.pdf`)
}

// ── PDF Balance Crédits ───────────────────────
export async function exportPDFCredits(
  clients: Client[],
  totalEncours: number,
  logoUrl?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  const bloques = clients.filter(c => c.statut === 'bloque').length
  const logo = logoUrl ? await imageUrlToBase64(logoUrl).catch(() => undefined) : undefined
  let y = pdfHeader(doc, 'Balance Crédits', `Balance âgée des crédits clients — ${today()}`, logo)

  // KPIs
  const kpis = [
    { label: 'Clients concernés', val: `${clients.length}`,        color: OR    as [number,number,number] },
    { label: 'Encours total',     val: `${fmt(totalEncours)} GNF`, color: ROUGE },
    { label: 'Comptes bloqués',   val: `${bloques}`,               color: ROUGE },
    { label: 'Comptes en retard', val: `${clients.length - bloques}`, color: [202,138,4] as [number,number,number] },
  ]
  const kw = (W - 36 - 9) / 4
  kpis.forEach((k, i) => pdfKpiBox(doc, 18 + i * (kw + 3), y, kw, 28, k.label, k.val, k.color))
  y += 36

  const sorted = [...clients].sort((a, b) => b.creditEnCours - a.creditEnCours)

  autoTable(doc, {
    startY: y,
    head: [['Client', 'Téléphone', 'Encours (GNF)', 'Plafond (GNF)', 'Utilisation', 'Statut']],
    body: sorted.map(c => {
      const pct = Math.round((c.creditEnCours / c.plafondCredit) * 100)
      return [
        c.nom,
        c.telephone || '—',
        fmt(c.creditEnCours),
        fmt(c.plafondCredit),
        `${pct}%`,
        c.statut.toUpperCase(),
      ]
    }),
    headStyles: { fillColor: BLEU, textColor: BLANC, fontSize: 9, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right', textColor: ROUGE, fontStyle: 'bold' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    alternateRowStyles: { fillColor: GRIS },
    bodyStyles: { fontSize: 9, textColor: ARDOISE },
    foot: [[
      `${clients.length} client(s)`, '',
      { content: `${fmt(totalEncours)} GNF`, styles: { fontStyle: 'bold', textColor: ROUGE, halign: 'right' } },
      '', '', '',
    ]],
    footStyles: { fillColor: [255, 245, 245], fontSize: 9 },
    margin: { left: 18, right: 18 },
  })

  pdfFooter(doc)
  doc.save(`credits_balance_${new Date().toISOString().slice(0,10)}.pdf`)
}

// ── PDF Inventaire Frigo ──────────────────────
export async function exportPDFInventaire(produits: Produit[], valorisation: number, logoUrl?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  const alertes = produits.filter(p => p.stockCart <= p.seuilAlerte).length
  const stockKgTotal = produits.reduce((s, p) => s + p.stockKg, 0)

  const logo = logoUrl ? await imageUrlToBase64(logoUrl).catch(() => undefined) : undefined
  let y = pdfHeader(doc, 'Inventaire Frigo', `État des stocks — ${today()}`, logo)

  const kpis = [
    { label: 'Valorisation totale', val: `${fmt(valorisation)} GNF`,  color: OR    as [number,number,number] },
    { label: 'Stock total',         val: `${fmt(stockKgTotal)} Kg`,   color: [6, 182, 212] as [number,number,number] },
    { label: 'Nb produits',         val: `${produits.length}`,        color: BLEU  },
    { label: 'Alertes rupture',     val: `${alertes}`,                color: ROUGE },
  ]
  const kw = (W - 36 - 9) / 4
  kpis.forEach((k, i) => pdfKpiBox(doc, 18 + i * (kw + 3), y, kw, 28, k.label, k.val, k.color))
  y += 36

  const sorted = [...produits].sort((a, b) => a.stockCart - b.stockCart)

  autoTable(doc, {
    startY: y,
    head: [['Produit', 'Catégorie', 'Stock Cartons', 'Stock Kg', 'PAMP/Cart (GNF)', 'Prix Vente/Cart (GNF)', 'Valorisation (GNF)', 'État']],
    body: sorted.map(p => {
      const critique = p.stockCart <= p.seuilAlerte
      return [
        p.nom,
        p.categorie,
        p.stockCart,
        fmt(p.stockKg),
        fmt(p.pampCart),
        fmt(p.prixCart),
        fmt(p.stockCart * p.pampCart),
        critique ? 'RUPTURE' : 'OK',
      ]
    }),
    headStyles: { fillColor: BLEU, textColor: BLANC, fontSize: 8.5, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold', textColor: [202, 138, 4] },
      7: { halign: 'center' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = data.cell.text[0]
        if (val === 'RUPTURE') {
          doc.setTextColor(...ROUGE)
        } else {
          doc.setTextColor(...VERT)
        }
      }
    },
    alternateRowStyles: { fillColor: GRIS },
    bodyStyles: { fontSize: 8.5, textColor: ARDOISE },
    foot: [[
      `${produits.length} produit(s)`, '', '', `${fmt(stockKgTotal)} Kg`, '', '',
      { content: `${fmt(valorisation)} GNF`, styles: { fontStyle: 'bold', textColor: OR, halign: 'right' } },
      '',
    ]],
    footStyles: { fillColor: [240, 249, 255], fontSize: 8.5 },
    margin: { left: 18, right: 18 },
  })

  pdfFooter(doc)
  doc.save(`inventaire_frigo_${new Date().toISOString().slice(0,10)}.pdf`)
}


// ═══════════════════════════════════════════════
// ██  EXPORT EXCEL
// ═══════════════════════════════════════════════

function xlsxApplyStyles(ws: XLSX.WorkSheet, range: string, style: any) {
  // SheetJS open-source ne supporte pas les styles natifs,
  // on utilise les commentaires de cellule comme métadonnées
  // Pour le style réel, l'utilisateur peut ouvrir dans Excel
  void ws; void range; void style
}

// ── Excel Caisse ──────────────────────────────
export function exportExcelCaisse(
  ventesJour: Vente[],
  especes: number, virement: number, credit: number
) {
  const wb = XLSX.utils.book_new()
  const dateAuj = new Date().toISOString().slice(0, 10)

  // Feuille 1 : Résumé
  const resume = [
    ['POISSONNERIE TATA — RAPPORT DE CAISSE', '', '', ''],
    [`Journée du ${dateAuj}`, '', '', `Généré le ${now()}`],
    [],
    ['INDICATEURS', '', '', ''],
    ['Total Caisse Physique (GNF)', especes + virement, '', ''],
    ['dont Espèces (GNF)',          especes,            '', ''],
    ['dont Virement (GNF)',         virement,           '', ''],
    ['En Crédit (hors caisse) (GNF)', credit,           '', ''],
    ['Nombre de transactions',      ventesJour.length,  '', ''],
  ]
  const wsResume = XLSX.utils.aoa_to_sheet(resume)
  wsResume['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé')

  // Feuille 2 : Détail des ventes
  const header = ['Client', 'Mode de Règlement', 'Total Net (GNF)', 'Encaissé (GNF)', 'Reste à Payer (GNF)', 'Statut', 'Caissier']
  const rows = ventesJour.map(v => [
    v.clientNom,
    v.modeReglement,
    v.totalNet,
    v.montantEncaisse,
    v.resteAPayer,
    v.statut,
    v.caissier,
  ])

  // Ligne de total
  rows.push([
    'TOTAL', '',
    ventesJour.reduce((s, v) => s + v.totalNet, 0),
    especes + virement,
    credit,
    '', '',
  ])

  const wsDetail = XLSX.utils.aoa_to_sheet([header, ...rows])
  wsDetail['!cols'] = [
    { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Détail Transactions')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `caisse_${dateAuj}.xlsx`)
}

// ── Excel Ventes ──────────────────────────────
export function exportExcelVentes(
  ventes: Vente[],
  ca: number, marge: number,
  topProduits: { nom: string; qte: number; ca: number }[],
  parMode: { especes: number; virement: number; credit: number },
  periode: { debut: string; fin: string }
) {
  const wb = XLSX.utils.book_new()

  // Feuille 1 : KPIs
  const dateLabel = periode.debut && periode.fin ? `${periode.debut} → ${periode.fin}` : 'Toutes périodes'
  const kpis = [
    ['POISSONNERIE TATA — ANALYTIQUE VENTES', ''],
    [`Période : ${dateLabel}`, `Généré le ${now()}`],
    [],
    ['INDICATEURS CLÉS', ''],
    ["Chiffre d'affaires (GNF)",  ca],
    ['Marge brute estimée (GNF)', marge],
    ['Taux de marge (%)',         ca > 0 ? Math.round((marge / ca) * 100) : 0],
    ['Nombre de ventes',         ventes.length],
    [],
    ['RÉPARTITION PAR MODE', ''],
    ['Espèces (GNF)',   parMode.especes],
    ['Virement (GNF)',  parMode.virement],
    ['Crédit (GNF)',    parMode.credit],
  ]
  const wsKpi = XLSX.utils.aoa_to_sheet(kpis)
  wsKpi['!cols'] = [{ wch: 30 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsKpi, 'KPIs')

  // Feuille 2 : Détail ventes
  const header = ['#', 'Date', 'Client', 'Mode', 'Total Net (GNF)', 'Encaissé (GNF)', 'Reste (GNF)', 'Caissier', 'Statut']
  const rows = ventes.map((v, i) => [
    i + 1, v.dateStr, v.clientNom, v.modeReglement,
    v.totalNet, v.montantEncaisse, v.resteAPayer,
    v.caissier, v.statut,
  ])
  rows.push(['TOTAL', '', `${ventes.length} ventes`, '', ca, parMode.especes + parMode.virement, parMode.credit, '', ''])

  const wsVentes = XLSX.utils.aoa_to_sheet([header, ...rows])
  wsVentes['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, wsVentes, 'Détail Ventes')

  // Feuille 3 : Top produits
  const headerTop = ['Rang', 'Produit', "CA (GNF)", 'Quantité vendue']
  const rowsTop = topProduits.map((p, i) => [i + 1, p.nom, p.ca, p.qte])
  const wsTop = XLSX.utils.aoa_to_sheet([headerTop, ...rowsTop])
  wsTop['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsTop, 'Top Produits')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `ventes_analytique_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── Excel Crédits ─────────────────────────────
export function exportExcelCredits(clients: Client[], totalEncours: number) {
  const wb = XLSX.utils.book_new()

  const header = ['Client', 'Téléphone', 'Crédit en Cours (GNF)', 'Plafond (GNF)', 'Utilisation (%)', 'Statut']
  const sorted = [...clients].sort((a, b) => b.creditEnCours - a.creditEnCours)
  const rows = sorted.map(c => [
    c.nom, c.telephone || '—',
    c.creditEnCours, c.plafondCredit,
    Math.round((c.creditEnCours / c.plafondCredit) * 100),
    c.statut,
  ])
  rows.push(['TOTAL', '', totalEncours, '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet([
    ['POISSONNERIE TATA — BALANCE CRÉDITS', '', '', '', '', ''],
    [`Généré le ${now()}`, '', '', '', '', ''],
    [],
    header,
    ...rows,
  ])
  ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Crédits')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `credits_balance_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── Excel Inventaire ──────────────────────────
export function exportExcelInventaire(produits: Produit[], valorisation: number) {
  const wb = XLSX.utils.book_new()

  const header = ['Produit', 'Catégorie', 'Stock Cartons', 'Stock Kg', 'PAMP/Cart (GNF)', 'Prix Vente/Cart (GNF)', 'Prix Vente/Kg (GNF)', 'Valorisation (GNF)', 'Seuil Alerte', 'État']
  const sorted = [...produits].sort((a, b) => a.stockCart - b.stockCart)
  const rows = sorted.map(p => [
    p.nom, p.categorie, p.stockCart, p.stockKg,
    p.pampCart, p.prixCart, p.prixKg,
    p.stockCart * p.pampCart,
    p.seuilAlerte,
    p.stockCart <= p.seuilAlerte ? 'RUPTURE' : 'OK',
  ])
  rows.push(['TOTAL', '', '', produits.reduce((s,p)=>s+p.stockKg,0), '', '', '', valorisation, '', ''])

  const ws = XLSX.utils.aoa_to_sheet([
    ['POISSONNERIE TATA — INVENTAIRE FRIGO', '', '', '', '', '', '', '', '', ''],
    [`Généré le ${now()}`, '', '', '', '', '', '', '', '', ''],
    [],
    header,
    ...rows,
  ])
  ws['!cols'] = [
    { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Inventaire Frigo')

  // Feuille alertes
  const alertes = sorted.filter(p => p.stockCart <= p.seuilAlerte)
  if (alertes.length > 0) {
    const headerA = ['Produit', 'Stock Actuel (Cartons)', 'Seuil Alerte', 'Déficit']
    const rowsA = alertes.map(p => [p.nom, p.stockCart, p.seuilAlerte, p.seuilAlerte - p.stockCart])
    const wsA = XLSX.utils.aoa_to_sheet([headerA, ...rowsA])
    wsA['!cols'] = [{ wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, wsA, '⚠ Alertes Rupture')
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `inventaire_frigo_${new Date().toISOString().slice(0,10)}.xlsx`)
}


// ═══════════════════════════════════════════════
// ██  EXPORT WORD
// ═══════════════════════════════════════════════

// Helpers Word
const cellBleu = (text: string, bold = true) => new TableCell({
  shading: { type: ShadingType.SOLID, color: '1A365D' },
  children: [new Paragraph({
    children: [new TextRun({ text, bold, color: 'FFFFFF', size: 18 })],
    alignment: AlignmentType.CENTER,
  })],
})

const cellData = (text: string, bg = 'FFFFFF', bold = false, align = AlignmentType.LEFT) => new TableCell({
  shading: bg !== 'FFFFFF' ? { type: ShadingType.SOLID, color: bg } : undefined,
  children: [new Paragraph({
    children: [new TextRun({ text, bold, size: 18, color: '2D3748' })],
    alignment: align,
  })],
})

const cellRight = (text: string, bg = 'FFFFFF', bold = false) =>
  cellData(text, bg, bold, AlignmentType.RIGHT)

function wordHeader(titre: string, sous: string, logoBase64?: string): Paragraph[] {
  const logoParas: Paragraph[] = []

  if (logoBase64) {
    try {
      const base64Data = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64
      const binaryStr = atob(base64Data)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

      logoParas.push(new Paragraph({
        children: [new ImageRun({
          data: bytes,
          transformation: { width: 80, height: 80 },
          type: 'jpg',
        })],
        alignment: AlignmentType.CENTER,
      }))
    } catch (_) { /* logo ignoré si erreur */ }
  }

  return [
    ...logoParas,
    new Paragraph({
      children: [new TextRun({ text: 'POISSONNERIE TATA', bold: true, size: 36, color: '1A365D' })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Conakry — Guinée  |  +224 623 89 73 81', size: 18, color: '718096' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [] }),
    new Paragraph({
      children: [new TextRun({ text: titre, bold: true, size: 28, color: 'ECC94B' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: sous, size: 20, color: '4A5568', italics: true })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `Généré le ${now()}`, size: 16, color: '94A3B8' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [] }),
  ]
}

function wordKpiTable(kpis: { label: string; valeur: string }[]): Table {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: kpis.map(k => cellBleu(k.label, true)),
      }),
      new TableRow({
        children: kpis.map(k => new TableCell({
          shading: { type: ShadingType.SOLID, color: 'F7FAFC' },
          children: [new Paragraph({
            children: [new TextRun({ text: k.valeur, bold: true, size: 24, color: '1A365D' })],
            alignment: AlignmentType.CENTER,
          })],
        })),
      }),
    ],
  })
}

// ── Word Caisse ───────────────────────────────
export async function exportWordCaisse(
  ventesJour: Vente[],
  especes: number, virement: number, credit: number,
  logoUrl?: string
) {
  const dateAuj = new Date().toISOString().slice(0, 10)
  const logo = logoUrl ? await imageUrlToBase64(logoUrl).catch(() => undefined) : undefined

  const kpiTable = wordKpiTable([
    { label: 'Total Caisse',  valeur: `${fmt(especes + virement)} GNF` },
    { label: 'Espèces',       valeur: `${fmt(especes)} GNF`            },
    { label: 'Virement',      valeur: `${fmt(virement)} GNF`           },
    { label: 'En Crédit',     valeur: `${fmt(credit)} GNF`             },
  ])

  const venteRows = ventesJour.map((v, i) => new TableRow({
    children: [
      cellData(v.clientNom,                  i % 2 === 0 ? 'FFFFFF' : 'F7FAFC'),
      cellData(v.modeReglement,              i % 2 === 0 ? 'FFFFFF' : 'F7FAFC'),
      cellRight(`${fmt(v.montantEncaisse)} GNF`, i % 2 === 0 ? 'FFFFFF' : 'F7FAFC'),
      cellRight(`${fmt(v.resteAPayer)} GNF`,     i % 2 === 0 ? 'FFFFFF' : 'F7FAFC'),
      cellData(v.statut.toUpperCase(),       i % 2 === 0 ? 'FFFFFF' : 'F7FAFC', false, AlignmentType.CENTER),
    ],
  }))

  const venteTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cellBleu('Client'), cellBleu('Mode'), cellBleu('Encaissé'),
          cellBleu('Reste'), cellBleu('Statut'),
        ],
      }),
      ...venteRows,
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { type: ShadingType.SOLID, color: 'EBF8FF' },
            children: [new Paragraph({ children: [new TextRun({ text: `${ventesJour.length} transaction(s)`, bold: true, size: 18, color: '1A365D' })] }) ],
          }),
          cellRight(`${fmt(especes + virement)} GNF`, 'EBF8FF', true),
          cellRight(`${fmt(credit)} GNF`, 'EBF8FF', true),
          cellData('', 'EBF8FF'),
        ],
      }),
    ],
  })

  const doc = new Document({
    sections: [{
      children: [
        ...wordHeader('RAPPORT DE CAISSE', `Journée du ${dateAuj}`, logo),
        kpiTable,
        new Paragraph({ children: [] }),
        new Paragraph({ children: [new TextRun({ text: 'Détail des transactions', bold: true, size: 22, color: '1A365D' })] }),
        new Paragraph({ children: [] }),
        venteTable,
        new Paragraph({ children: [] }),
        new Paragraph({
          children: [new TextRun({ text: `Poissonnerie Tata — Document officiel — ${now()}`, size: 16, color: '94A3B8', italics: true })],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } },
        }),
      ],
    }],
  })

  const buf = await Packer.toBlob(doc)
  saveAs(buf, `caisse_${dateAuj}.docx`)
}

// ── Word Ventes ───────────────────────────────
export async function exportWordVentes(
  ventes: Vente[],
  ca: number, marge: number,
  topProduits: { nom: string; qte: number; ca: number }[],
  parMode: { especes: number; virement: number; credit: number },
  periode: { debut: string; fin: string },
  logoUrl?: string
) {
  const dateLabel = periode.debut && periode.fin ? `${periode.debut} → ${periode.fin}` : 'Toutes périodes'
  const logo = logoUrl ? await imageUrlToBase64(logoUrl).catch(() => undefined) : undefined

  const kpiTable = wordKpiTable([
    { label: "Chiffre d'affaires", valeur: `${fmt(ca)} GNF`    },
    { label: 'Marge brute',        valeur: `${fmt(marge)} GNF` },
    { label: 'Nb ventes',          valeur: `${ventes.length}`  },
    { label: 'Taux marge',         valeur: ca > 0 ? `${Math.round((marge / ca) * 100)}%` : '0%' },
  ])

  const venteRows = ventes.slice(0, 50).map((v, i) => new TableRow({
    children: [
      cellData(`${i+1}`, i%2===0?'FFFFFF':'F7FAFC', false, AlignmentType.CENTER),
      cellData(v.dateStr,        i%2===0?'FFFFFF':'F7FAFC'),
      cellData(v.clientNom,      i%2===0?'FFFFFF':'F7FAFC'),
      cellData(v.modeReglement,  i%2===0?'FFFFFF':'F7FAFC', false, AlignmentType.CENTER),
      cellRight(`${fmt(v.totalNet)} GNF`, i%2===0?'FFFFFF':'F7FAFC'),
      cellData(v.statut.toUpperCase(), i%2===0?'FFFFFF':'F7FAFC', false, AlignmentType.CENTER),
    ],
  }))

  const venteTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cellBleu('#'), cellBleu('Date'), cellBleu('Client'), cellBleu('Mode'), cellBleu('Total Net'), cellBleu('Statut')] }),
      ...venteRows,
    ],
  })

  const topRows = topProduits.map((p, i) => new TableRow({
    children: [
      cellData(`${i+1}`, i%2===0?'FFFFFF':'F7FAFC', false, AlignmentType.CENTER),
      cellData(p.nom,    i%2===0?'FFFFFF':'F7FAFC'),
      cellRight(`${fmt(p.ca)} GNF`, i%2===0?'FFFFFF':'F7FAFC', true),
      cellRight(`${p.qte}`, i%2===0?'FFFFFF':'F7FAFC'),
    ],
  }))

  const topTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cellBleu('Rang'), cellBleu('Produit'), cellBleu("CA (GNF)"), cellBleu('Quantité')] }),
      ...topRows,
    ],
  })

  const doc = new Document({
    sections: [{
      children: [
        ...wordHeader('ANALYTIQUE VENTES', `Période : ${dateLabel}`, logo),
        kpiTable,
        new Paragraph({ children: [] }),
        new Paragraph({ children: [new TextRun({ text: 'Détail des ventes', bold: true, size: 22, color: '1A365D' })] }),
        new Paragraph({ children: [] }),
        venteTable,
        new Paragraph({ children: [] }),
        new Paragraph({ children: [new TextRun({ text: 'Top 5 Produits', bold: true, size: 22, color: '1A365D' })] }),
        new Paragraph({ children: [] }),
        topTable,
        new Paragraph({ children: [] }),
        new Paragraph({
          children: [new TextRun({ text: `Poissonnerie Tata — Document officiel — ${now()}`, size: 16, color: '94A3B8', italics: true })],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  })

  const buf = await Packer.toBlob(doc)
  saveAs(buf, `ventes_analytique_${new Date().toISOString().slice(0,10)}.docx`)
}

// ── Word Crédits ──────────────────────────────
export async function exportWordCredits(clients: Client[], totalEncours: number, logoUrl?: string) {
  const sorted = [...clients].sort((a, b) => b.creditEnCours - a.creditEnCours)
  const logo = logoUrl ? await imageUrlToBase64(logoUrl).catch(() => undefined) : undefined

  const kpiTable = wordKpiTable([
    { label: 'Clients concernés', valeur: `${clients.length}`        },
    { label: 'Encours total',     valeur: `${fmt(totalEncours)} GNF` },
    { label: 'Comptes bloqués',   valeur: `${clients.filter(c=>c.statut==='bloque').length}` },
    { label: 'En retard',         valeur: `${clients.filter(c=>c.statut==='retard').length}` },
  ])

  const rows = sorted.map((c, i) => {
    const pct = Math.round((c.creditEnCours / c.plafondCredit) * 100)
    return new TableRow({
      children: [
        cellData(c.nom,          i%2===0?'FFFFFF':'F7FAFC', true),
        cellData(c.telephone||'—', i%2===0?'FFFFFF':'F7FAFC'),
        cellRight(`${fmt(c.creditEnCours)} GNF`, i%2===0?'FFFFFF':'FFF5F5', true),
        cellRight(`${fmt(c.plafondCredit)} GNF`, i%2===0?'FFFFFF':'F7FAFC'),
        cellData(`${pct}%`, i%2===0?'FFFFFF':'F7FAFC', false, AlignmentType.CENTER),
        cellData(c.statut.toUpperCase(), c.statut==='bloque'?'FFF5F5':'FFFFF0', true, AlignmentType.CENTER),
      ],
    })
  })

  const table = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cellBleu('Client'), cellBleu('Téléphone'), cellBleu('Encours'), cellBleu('Plafond'), cellBleu('Utilisation'), cellBleu('Statut')] }),
      ...rows,
      new TableRow({
        children: [
          new TableCell({ columnSpan: 2, shading: { type: ShadingType.SOLID, color: 'EBF8FF' }, children: [new Paragraph({ children: [new TextRun({ text: `${clients.length} client(s)`, bold: true, size: 18 })] })] }),
          cellRight(`${fmt(totalEncours)} GNF`, 'EBF8FF', true),
          cellData('', 'EBF8FF'),
          cellData('', 'EBF8FF'),
          cellData('', 'EBF8FF'),
        ],
      }),
    ],
  })

  const doc = new Document({
    sections: [{
      children: [
        ...wordHeader('BALANCE ÂGÉE DES CRÉDITS', `Situation au ${today()}`, logo),
        kpiTable,
        new Paragraph({ children: [] }),
        table,
        new Paragraph({ children: [] }),
        new Paragraph({
          children: [new TextRun({ text: `Poissonnerie Tata — Document officiel — ${now()}`, size: 16, color: '94A3B8', italics: true })],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  })

  const buf = await Packer.toBlob(doc)
  saveAs(buf, `credits_balance_${new Date().toISOString().slice(0,10)}.docx`)
}

// ── Word Inventaire ───────────────────────────
export async function exportWordInventaire(produits: Produit[], valorisation: number, logoUrl?: string) {
  const sorted = [...produits].sort((a, b) => a.stockCart - b.stockCart)
  const stockKgTotal = produits.reduce((s, p) => s + p.stockKg, 0)
  const logo = logoUrl ? await imageUrlToBase64(logoUrl).catch(() => undefined) : undefined

  const kpiTable = wordKpiTable([
    { label: 'Valorisation',    valeur: `${fmt(valorisation)} GNF`   },
    { label: 'Stock Total',     valeur: `${fmt(stockKgTotal)} Kg`    },
    { label: 'Nb Produits',     valeur: `${produits.length}`         },
    { label: 'Alertes Rupture', valeur: `${produits.filter(p=>p.stockCart<=p.seuilAlerte).length}` },
  ])

  const rows = sorted.map((p, i) => {
    const critique = p.stockCart <= p.seuilAlerte
    const bg = critique ? 'FFF5F5' : (i%2===0?'FFFFFF':'F7FAFC')
    return new TableRow({
      children: [
        cellData(p.nom,         bg, true),
        cellData(p.categorie,   bg),
        cellData(`${p.stockCart}`, bg, critique, AlignmentType.CENTER),
        cellRight(`${fmt(p.stockKg)} Kg`, bg),
        cellRight(`${fmt(p.pampCart)} GNF`, bg),
        cellRight(`${fmt(p.stockCart * p.pampCart)} GNF`, bg, true),
        cellData(critique ? '⚠ RUPTURE' : '✓ OK', bg, true, AlignmentType.CENTER),
      ],
    })
  })

  const table = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cellBleu('Produit'), cellBleu('Catégorie'), cellBleu('Stock Cart'), cellBleu('Stock Kg'), cellBleu('PAMP'), cellBleu('Valorisation'), cellBleu('État')] }),
      ...rows,
      new TableRow({
        children: [
          new TableCell({ columnSpan: 2, shading: { type: ShadingType.SOLID, color: 'EBF8FF' }, children: [new Paragraph({ children: [new TextRun({ text: `${produits.length} produit(s)`, bold: true, size: 18 })] })] }),
          cellData('', 'EBF8FF'),
          cellRight(`${fmt(stockKgTotal)} Kg`, 'EBF8FF', true),
          cellData('', 'EBF8FF'),
          cellRight(`${fmt(valorisation)} GNF`, 'EBF8FF', true),
          cellData('', 'EBF8FF'),
        ],
      }),
    ],
  })

  const doc = new Document({
    sections: [{
      children: [
        ...wordHeader("INVENTAIRE FRIGO", `État des stocks au ${today()}`, logo),
        kpiTable,
        new Paragraph({ children: [] }),
        table,
        new Paragraph({ children: [] }),
        new Paragraph({
          children: [new TextRun({ text: `Poissonnerie Tata — Document officiel — ${now()}`, size: 16, color: '94A3B8', italics: true })],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  })

  const buf = await Packer.toBlob(doc)
  saveAs(buf, `inventaire_frigo_${new Date().toISOString().slice(0,10)}.docx`)
}
