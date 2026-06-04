import type { Vente, Client } from '../types/pos'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

// ── Reçu thermique 80mm ───────────────────────────────────────
export function imprimerRecu(vente: Vente): void {
  const lignesHtml = vente.lignes.map(l => `
    <tr>
      <td style="padding:2px 0">${l.produitNom}</td>
      <td style="text-align:center;padding:2px 4px">${l.type === 'Carton' ? 'C' : 'Kg'}</td>
      <td style="text-align:center;padding:2px 4px">${l.qte}</td>
      <td style="text-align:right;padding:2px 0">${fmt(l.prixUnit)}</td>
      <td style="text-align:right;padding:2px 0;font-weight:bold">${fmt(l.total)}</td>
    </tr>`).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Reçu #${vente.id}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          width: 72mm;
          margin: 0 auto;
          color: #000;
        }
        .center  { text-align: center; }
        .bold    { font-weight: bold; }
        .sep     { border-top: 1px dashed #000; margin: 4px 0; }
        .sep2    { border-top: 2px solid #000; margin: 4px 0; }
        table    { width: 100%; border-collapse: collapse; }
        th       { font-size: 10px; text-align: left; border-bottom: 1px solid #000; padding-bottom: 2px; }
        .total-row td { font-size: 13px; font-weight: bold; padding-top: 4px; }
        .reste td { background: #000; color: #fff; padding: 3px; font-weight: bold; font-size: 13px; }
        .footer  { font-size: 9px; text-align: center; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="center bold" style="font-size:16px;margin-bottom:2px">Poissonnerie Tata</div>
      <div class="center" style="font-size:9px">Conakry — Guinée</div>
      <div class="sep2"></div>
      <div>Date : <b>${vente.dateStr}</b></div>
      <div>Client : <b>${vente.clientNom}</b></div>
      <div>Caissier : ${vente.caissier}</div>
      <div class="sep"></div>
      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th style="text-align:center">U</th>
            <th style="text-align:center">Qté</th>
            <th style="text-align:right">P.U</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${lignesHtml}</tbody>
      </table>
      <div class="sep"></div>
      <table>
        <tr class="total-row">
          <td>TOTAL NET</td>
          <td style="text-align:right">${fmt(vente.totalNet)} GNF</td>
        </tr>
        <tr>
          <td>Encaissé (${vente.modeReglement})</td>
          <td style="text-align:right">${fmt(vente.montantEncaisse)} GNF</td>
        </tr>
      </table>
      ${vente.resteAPayer > 0 ? `
      <div class="sep"></div>
      <table><tr class="reste">
        <td>RESTE À PAYER</td>
        <td style="text-align:right">${fmt(vente.resteAPayer)} GNF</td>
      </tr></table>` : `
      <div class="sep"></div>
      <div class="center bold" style="font-size:12px">✓ PAYÉ INTÉGRALEMENT</div>`}
      <div class="sep2"></div>
      <div class="footer">
        Merci pour votre confiance !<br/>
        Reçu #${vente.id} — Poissonnerie Tata
      </div>
    </body>
    </html>`

  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) { alert('Autorisez les popups pour imprimer'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 300)
}

// ── Facture officielle A4 ─────────────────────────────────────
export function imprimerFactureA4(vente: Vente, client?: Client | null): void {
  const lignesHtml = vente.lignes.map((l, i) => `
    <tr style="background:${i % 2 === 0 ? '#f8f9fa' : '#fff'}">
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${l.produitNom}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${l.type}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${l.qte}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(l.prixUnit)} GNF</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${fmt(l.total)} GNF</td>
    </tr>`).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Facture #${vente.id}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a202c; margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .brand  { color: #1A365D; font-size: 28px; font-weight: 900; letter-spacing: 2px; }
        .brand-sub { color: #4A5568; font-size: 12px; }
        .badge  { background: #1A365D; color: #fff; padding: 6px 16px; border-radius: 6px; font-size: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
        .info-box  { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }
        .info-box h4 { color: #4A5568; font-size: 10px; text-transform: uppercase; font-weight: 700; margin: 0 0 8px; }
        .info-box p  { margin: 3px 0; font-size: 13px; color: #1a202c; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead tr { background: #1A365D; color: #fff; }
        thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        thead th:last-child { text-align: right; }
        .totaux { max-width: 320px; margin-left: auto; }
        .totaux table { margin-bottom: 0; }
        .totaux td { padding: 6px 12px; border-bottom: 1px solid #e2e8f0; }
        .totaux .grand-total td { font-size: 15px; font-weight: 900; color: #1A365D; border-top: 2px solid #1A365D; }
        .reste-box { background: #ECC94B; color: #1A365D; border-radius: 10px; padding: 14px 18px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; }
        .reste-box .label { font-size: 14px; font-weight: 700; }
        .reste-box .montant { font-size: 22px; font-weight: 900; }
        .pied { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #718096; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">🐟 POISSONNERIE TATA</div>
          <div class="brand-sub">Conakry — Guinée &nbsp;|&nbsp; +224 623 89 73 81</div>
        </div>
        <div>
          <div class="badge">FACTURE #${vente.id.toUpperCase()}</div>
          <div style="text-align:right;margin-top:8px;font-size:12px;color:#4A5568">Date : <b>${vente.dateStr}</b></div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h4>Client</h4>
          <p><b>${vente.clientNom}</b></p>
          ${client?.telephone ? `<p>Tél : ${client.telephone}</p>` : ''}
        </div>
        <div class="info-box">
          <h4>Détails transaction</h4>
          <p>Mode de règlement : <b>${vente.modeReglement}</b></p>
          <p>Caissier : <b>${vente.caissier}</b></p>
          <p>Statut : <b>${vente.statut.toUpperCase()}</b></p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Désignation</th>
            <th style="text-align:center">Unité</th>
            <th style="text-align:center">Qté</th>
            <th style="text-align:right">Prix unitaire</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${lignesHtml}</tbody>
      </table>

      <div class="totaux">
        <table>
          <tr><td>Total Net</td><td style="text-align:right;font-weight:700">${fmt(vente.totalNet)} GNF</td></tr>
          <tr><td>Montant encaissé</td><td style="text-align:right;color:#38a169">${fmt(vente.montantEncaisse)} GNF</td></tr>
          <tr class="grand-total">
            <td>TOTAL FACTURÉ</td>
            <td style="text-align:right">${fmt(vente.totalNet)} GNF</td>
          </tr>
        </table>
        ${vente.resteAPayer > 0 ? `
        <div class="reste-box">
          <div class="label">⚠️ RESTE À PAYER</div>
          <div class="montant">${fmt(vente.resteAPayer)} GNF</div>
        </div>` : `
        <div style="background:#c6f6d5;color:#276749;border-radius:10px;padding:12px 18px;margin-top:12px;text-align:center;font-weight:700;font-size:15px">
          ✓ INTÉGRALEMENT RÉGLÉE
        </div>`}
      </div>

      <div class="pied">
        Poissonnerie Tata — Facture officielle générée le ${new Date().toLocaleDateString('fr-FR')}<br/>
        Ce document fait foi de paiement.
      </div>
    </body>
    </html>`

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) { alert('Autorisez les popups pour imprimer'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 400)
}
