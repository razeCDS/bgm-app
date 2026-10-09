'use client';

import Link from 'next/link';

import { Rodape } from '../../../components/campos';
import { Carregando, EstadoErro } from '../../../components/estados';
import { mensagemDeErro } from '../../../lib/erros';
import { formatarDataOuNulo } from '../../../lib/formatadores';
import { useFichaAnimal } from '../hooks';
import { rotuloEspecie, rotuloPorte, rotuloSexo } from '../types/enums';
import type { FichaAnimal } from '../types/modelos';

type Linha = [string, string | null];

const sn = (v: boolean | null | undefined) => (v == null ? null : v ? 'Sim' : 'Não');

/**
 * Ficha completa do animal: dados do animal, tutor, veterinario, contatos
 * de emergencia, anamnese e termo de consentimento.
 */
export function VisaoFichaAnimal({ animalId }: { animalId: string }) {
  const { data, isPending, error, refetch } = useFichaAnimal(animalId);

  if (isPending) return <Carregando />;
  if (error) {
    return (
      <EstadoErro mensagem={mensagemDeErro(error)} aoTentarNovamente={() => refetch()} />
    );
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3.5 p-4">
        <Blocos ficha={data} />
      </main>
      <Rodape>
        <Link
          href={`/estadias/animal/${animalId}/editar`}
          className="flex items-center justify-center rounded-campo bg-primaria px-5 py-3.5 text-[15px] font-semibold text-white hover:bg-primaria-escura"
        >
          Editar ficha
        </Link>
      </Rodape>
    </>
  );
}

function Blocos({ ficha }: { ficha: FichaAnimal }) {
  const { animal: a, tutor, veterinario: v, anamnese: an, termo: t } = ficha;

  return (
    <>
      <Bloco
        titulo="Animal"
        icone="🐾"
        linhas={[
          ['Nome', a.nome],
          ['Raça', a.raca],
          ['Espécie', a.especie ? rotuloEspecie[a.especie] : null],
          ['Porte', a.porte ? rotuloPorte[a.porte] : null],
          ['Sexo', a.sexo ? rotuloSexo[a.sexo] : null],
          ['Idade', a.idade != null ? `${a.idade} ano(s)` : null],
          ['Peso', a.peso != null ? `${a.peso.toLocaleString('pt-BR')} kg` : null],
          ['Castrado', sn(a.castrado)],
          ['Dócil', sn(a.docil)],
          ['Observações', a.observacoes],
        ]}
      />

      <Bloco
        titulo="Tutor"
        icone="👤"
        linhas={[
          ['Nome', tutor.nomeCompleto],
          ['CPF/CNPJ', tutor.cpfCnpj],
          ['RG', tutor.rg],
          ['Telefone', tutor.telefone],
          ['E-mail', tutor.email],
          ['Endereço', tutor.endereco],
        ]}
      />

      <Bloco
        titulo="Veterinário"
        icone="🏥"
        textoVazio="Nenhuma informação de veterinário cadastrada."
        linhas={[
          ['Veterinário', v?.nomeVeterinario ?? null],
          ['Especialidade', v?.temEspecialidade ? v.qualEspecialidade : null],
          ['Telefone', v?.telefoneVeterinario ?? null],
          ['Clínica', v?.nomeClinica ?? null],
          ['Telefone da clínica', v?.telefoneClinica ?? null],
          ['Endereço da clínica', v?.enderecoClinica ?? null],
        ]}
      />

      <Cartao titulo="Contatos de emergência" icone="📞">
        {ficha.contatos.length === 0 ? (
          <p className="text-texto-suave">Nenhum contato cadastrado.</p>
        ) : (
          ficha.contatos.map((c) => (
            <div key={c.id} className="mb-3 flex items-center gap-3 last:mb-0">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-acento text-xs font-bold text-primaria-escura">
                {c.ordem ?? 0}
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-texto-escuro">{c.nome ?? '—'}</span>
                <span className="block text-xs text-texto-suave">
                  {[c.parentesco, c.telefone].filter(Boolean).join(' · ')}
                </span>
              </span>
            </div>
          ))
        )}
      </Cartao>

      <Bloco
        titulo="Anamnese"
        icone="💉"
        textoVazio="Anamnese ainda não preenchida."
        linhas={[
          [
            'Doença preexistente',
            an?.doencaPreexistente ? (an.doencaQual ?? 'Sim') : sn(an?.doencaPreexistente),
          ],
          ['Alergias', an?.alergias ?? null],
          [
            'Cuidados especiais',
            an?.cuidadosEspeciais ? (an.cuidadosQual ?? 'Sim') : sn(an?.cuidadosEspeciais),
          ],
          [
            'Medicação',
            an?.tomaMedicacao ? (an.medicacaoQual ?? 'Sim') : sn(an?.tomaMedicacao),
          ],
          ['Vermifugado no último mês', sn(an?.vermifugadoUltimoMes)],
          ['Data do vermífugo', formatarDataOuNulo(an?.dataVermifugo)],
          ['Vacinado este ano', sn(an?.vacinadoEsteAno)],
          ['Data da vacinação', formatarDataOuNulo(an?.dataVacinacao)],
          ['Observações', an?.observacoes ?? null],
        ]}
      />

      <Bloco
        titulo="Termo de consentimento"
        icone="📄"
        textoVazio="Termo ainda não registrado."
        rodape="Os itens do termo (vacinas, vermífugo, antipulgas, castração) são conferência manual da equipe e não bloqueiam agendamentos."
        linhas={[
          ['Aceito', sn(t?.aceito)],
          ['Data do aceite', formatarDataOuNulo(t?.dataAceite)],
          ['Local', t?.localAceite ?? null],
        ]}
      />
    </>
  );
}

function Cartao({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutra bg-white p-4">
      <h2 className="text-base font-bold text-primaria-escura">
        {icone} {titulo}
      </h2>
      <hr className="my-3 border-neutra" />
      {children}
    </section>
  );
}

function Bloco({
  titulo,
  icone,
  linhas,
  textoVazio,
  rodape,
}: {
  titulo: string;
  icone: string;
  linhas: Linha[];
  textoVazio?: string;
  rodape?: string;
}) {
  const preenchidas = linhas.filter(([, v]) => v != null && v !== '');

  return (
    <Cartao titulo={titulo} icone={icone}>
      {preenchidas.length === 0 ? (
        <p className="text-texto-suave">{textoVazio ?? 'Sem informações.'}</p>
      ) : (
        <dl>
          {preenchidas.map(([rotulo, valor]) => (
            <div key={rotulo} className="mb-2 flex gap-2">
              <dt className="w-32 shrink-0 text-[13px] text-texto-suave">{rotulo}</dt>
              <dd className="flex-1 text-sm text-texto-escuro">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
      {rodape ? <p className="mt-2 text-xs text-texto-suave">{rodape}</p> : null}
    </Cartao>
  );
}
