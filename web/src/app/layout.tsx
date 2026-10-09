import type { Metadata, Viewport } from 'next';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'BGM Daycare', template: '%s · BGM Daycare' },
  description: 'Gestão interna do BGM Daycare.',
  // Interno: nada aqui deve aparecer em buscador.
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'BGM', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  // Pinta a barra de status do celular com a cor do cabecalho.
  themeColor: '#46715c',
  // Ocupa a tela inteira no iPhone; os `env(safe-area-inset-*)` do CSS
  // devolvem o espaco do entalhe e da barra de gestos.
  viewportFit: 'cover',
};

export default function LayoutRaiz({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
