import { GuardSessao } from '@/features/auth/components/guard-sessao';

/**
 * `(app)` e um "grupo de rotas": os parenteses tiram o nome da URL. Serve so
 * para pendurar o guard em todas as telas logadas de uma vez, deixando
 * `/login` de fora.
 */
export default function LayoutApp({ children }: LayoutProps<'/'>) {
  return <GuardSessao>{children}</GuardSessao>;
}
