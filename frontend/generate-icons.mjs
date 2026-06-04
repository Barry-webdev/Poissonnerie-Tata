// Script de génération des icônes PWA
// Lance avec : node generate-icons.mjs
import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'

const sizes = [192, 512]
const outDir = './public/icons'

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Fond bleu marine
  ctx.fillStyle = '#1A365D'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.2)
  ctx.fill()

  // Cercle doré
  ctx.strokeStyle = '#ECC94B'
  ctx.lineWidth = size * 0.04
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2)
  ctx.stroke()

  // Texte "PT"
  ctx.fillStyle = '#ECC94B'
  ctx.font = `bold ${size * 0.3}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('PT', size / 2, size / 2)

  const buf = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buf)
  console.log(`✓ icon-${size}.png générée`)
}
console.log('Icônes PWA générées dans public/icons/')
