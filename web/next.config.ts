import type { NextConfig } from "next";

/**
 * Cabecalhos de seguranca em todas as respostas (paginas, manifesto,
 * icones). Sem CSP completa de proposito: o Next injeta scripts inline, e
 * uma CSP de verdade exigiria nonce em todo render — muito custo para um app
 * interno sem conteudo de terceiros.
 */
const cabecalhosSeguranca = [
  // Nenhum site pode carregar o app num iframe (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // O navegador respeita o Content-Type, sem "adivinhar" o tipo do arquivo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Para outros sites, so a origem — nunca o caminho (ids na URL).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O app nao usa camera, microfone nem localizacao.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Nao anuncia o framework no cabecalho `X-Powered-By`.
  poweredByHeader: false,
  headers() {
    return [{ source: "/:path*", headers: cabecalhosSeguranca }];
  },
};

export default nextConfig;
