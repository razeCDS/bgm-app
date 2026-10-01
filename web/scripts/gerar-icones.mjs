// Gera os PNGs do app a partir de `scripts/icone.svg`.
//
//   node scripts/gerar-icones.mjs
//
// So precisa rodar de novo se o desenho mudar — os PNGs ficam versionados.
// O `sharp` nao esta no package.json: ele vem instalado junto com o Next
// (que o usa para otimizar imagens).
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile(new URL('./icone.svg', import.meta.url));

const saidas = [
  // Manifesto do PWA (instalacao no Android/Chrome).
  ['public/icone-192.png', 192],
  ['public/icone-512.png', 512],
  // Convencoes de arquivo do Next: viram <link rel="icon"> e
  // <link rel="apple-touch-icon"> automaticamente.
  ['src/app/icon.png', 192],
  ['src/app/apple-icon.png', 180],
];

for (const [destino, tamanho] of saidas) {
  await sharp(svg, { density: 300 }).resize(tamanho, tamanho).png().toFile(destino);
  console.log(`${destino} (${tamanho}px)`);
}
