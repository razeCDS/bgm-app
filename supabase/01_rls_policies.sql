-- ---------------------------------------------------------------------------
-- BGM Daycare — RLS
--
-- Regra desta fase: quem esta autenticado tem acesso total; `anon` nao le
-- nem escreve nada. Sem papeis granulares (owner vs equipe) ainda.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- Rode no SQL Editor do painel do Supabase.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  tabelas text[] := array[
    'tutores',
    'animais',
    'veterinarios_info',
    'contatos_emergencia',
    'anamneses',
    'termos_consentimento',
    'agendamentos',
    'planos_estadia',
    'pertences_deixados'
  ];
begin
  foreach t in array tabelas loop
    -- Habilita RLS (no-op se ja estiver habilitada).
    execute format('alter table public.%I enable row level security;', t);

    -- Remove a policy antes de recriar, para o script ser reexecutavel.
    execute format(
      'drop policy if exists "acesso_autenticado" on public.%I;', t
    );

    execute format($f$
      create policy "acesso_autenticado" on public.%I
        for all
        to authenticated
        using (true)
        with check (true);
    $f$, t);
  end loop;
end $$;

-- Conferencia: lista o estado de RLS e as policies resultantes.
select
  c.relname                as tabela,
  c.relrowsecurity         as rls_habilitada,
  coalesce(p.policyname, '(sem policy)') as policy,
  p.roles
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in (
    'tutores', 'animais', 'veterinarios_info', 'contatos_emergencia',
    'anamneses', 'termos_consentimento', 'agendamentos',
    'planos_estadia', 'pertences_deixados'
  )
order by tabela;
