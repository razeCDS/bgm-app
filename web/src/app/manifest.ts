import type { MetadataRoute } from 'next';

/**
 * Manifesto do PWA: e o que permite "Instalar app" / "Adicionar a tela de
 * inicio" e abrir sem a barra do navegador.
 *
 * Nao ha service worker de proposito. Ele so serviria para cache offline,
 * e os dados vivem no Supabase: uma agenda servida do cache poderia estar
 * desatualizada sem ninguem perceber. Instalar nao depende dele.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BGM Daycare',
    short_name: 'BGM',
    description: 'Gestão interna do BGM Daycare.',
    lang: 'pt-BR',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#46715c',
    theme_color: '#46715c',
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
