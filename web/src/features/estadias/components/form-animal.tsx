'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Botao } from '../../../components/botoes';
import {
  Campo,
  Dica,
  LinhaSwitch,
  Rodape,
  Secao,
  Seletor,
  SeletorDataHora,
} from '../../../components/campos';
import { useDialogo } from '../../../components/dialogo';
import { Carregando, EstadoErro } from '../../../components/estados';
import { mensagemDeErro } from '../../../lib/erros';
import { useVoltar } from '../../../lib/navegacao';
import {
  useFichaAnimal,
  useSalvarAnimal,
  useSalvarFicha,
  useSalvarTutor,
  useTutores,
} from '../hooks';
import {
  ESPECIES,
  PORTES,
  rotuloEspecie,
  rotuloPorte,
  rotuloSexo,
  SEXOS,
  type EspecieAnimal,
  type PorteAnimal,
  type SexoAnimal,
} from '../types/enums';
import type { ContatoEmergencia, FichaAnimal } from '../types/modelos';

interface ContatoEditavel {
  nome: string;
  parentesco: string;
  telefone: string;
}

/** Cadastro e edicao de cliente: tutor + animal + ficha completa. */
export function FormAnimal({ animalId }: { animalId?: string }) {
  const ficha = useFichaAnimal(animalId ?? '');

  if (animalId && ficha.isPending) return <Carregando />;
  if (animalId && ficha.error) return <EstadoErro mensagem={mensagemDeErro(ficha.error)} />;
  return <Formulario animalId={animalId} original={ficha.data} />;
}

/**
 * Valor inicial de cada campo: o da ficha salva (edicao) ou o padrao
 * (cadastro). Mesmo raciocinio do `form-agendamento`: o formulario so monta
 * com a ficha ja carregada, entao os valores entram direto no `useState`.
 */
function valoresIniciais(f: FichaAnimal | undefined) {
  const t = f?.tutor;
  const a = f?.animal;
  const v = f?.veterinario;
  const an = f?.anamnese;
  return {
    novoTutor: !f,
    tutorId: t?.id ?? null,
    tNome: t?.nomeCompleto ?? '',
    tCpf: t?.cpfCnpj ?? '',
    tRg: t?.rg ?? '',
    tTelefone: t?.telefone ?? '',
    tEmail: t?.email ?? '',
    tEndereco: t?.endereco ?? '',

    aNome: a?.nome ?? '',
    aRaca: a?.raca ?? '',
    aIdade: a?.idade != null ? String(a.idade) : '',
    aPeso: a?.peso != null ? String(a.peso) : '',
    aObs: a?.observacoes ?? '',
    porte: a ? a.porte : null,
    especie: a ? a.especie : ('canina' as EspecieAnimal),
    sexo: a ? a.sexo : null,
    castrado: a?.castrado ?? false,
    docil: a?.docil ?? true,

    vNome: v?.nomeVeterinario ?? '',
    temEspecialidade: v?.temEspecialidade ?? false,
    vEspecialidade: v?.qualEspecialidade ?? '',
    vTelefone: v?.telefoneVeterinario ?? '',
    vClinica: v?.nomeClinica ?? '',
    vTelClinica: v?.telefoneClinica ?? '',
    vEndClinica: v?.enderecoClinica ?? '',

    doenca: an?.doencaPreexistente ?? false,
    anDoenca: an?.doencaQual ?? '',
    anAlergias: an?.alergias ?? '',
    cuidados: an?.cuidadosEspeciais ?? false,
    anCuidados: an?.cuidadosQual ?? '',
    medicacao: an?.tomaMedicacao ?? false,
    anMedicacao: an?.medicacaoQual ?? '',
    vermifugado: an?.vermifugadoUltimoMes ?? false,
    dataVermifugo: an?.dataVermifugo ?? null,
    vacinado: an?.vacinadoEsteAno ?? false,
    dataVacina: an?.dataVacinacao ?? null,
    anObs: an?.observacoes ?? '',

    termoAceito: f?.termo?.aceito ?? false,
    dataAceite: f?.termo?.dataAceite ?? null,
    localAceite: f?.termo?.localAceite ?? '',

    contatos: (f?.contatos ?? []).map(
      (c): ContatoEditavel => ({
        nome: c.nome ?? '',
        parentesco: c.parentesco ?? '',
        telefone: c.telefone ?? '',
      }),
    ),
  };
}

function Formulario({ animalId, original }: { animalId?: string; original?: FichaAnimal }) {
  const router = useRouter();
  const voltar = useVoltar(animalId ? `/estadias/animal/${animalId}` : '/estadias/clientes');
  const { avisar } = useDialogo();
  const editando = !!animalId;

  const tutores = useTutores();
  const salvarTutor = useSalvarTutor();
  const salvarAnimal = useSalvarAnimal();
  const salvarFicha = useSalvarFicha();

  const [ini] = useState(() => valoresIniciais(original));

  // Tutor
  const [novoTutor, setNovoTutor] = useState(ini.novoTutor);
  const [tutorId, setTutorId] = useState<string | null>(ini.tutorId);
  const [tNome, setTNome] = useState(ini.tNome);
  const [tCpf, setTCpf] = useState(ini.tCpf);
  const [tRg, setTRg] = useState(ini.tRg);
  const [tTelefone, setTTelefone] = useState(ini.tTelefone);
  const [tEmail, setTEmail] = useState(ini.tEmail);
  const [tEndereco, setTEndereco] = useState(ini.tEndereco);

  // Animal
  const [aNome, setANome] = useState(ini.aNome);
  const [aRaca, setARaca] = useState(ini.aRaca);
  const [aIdade, setAIdade] = useState(ini.aIdade);
  const [aPeso, setAPeso] = useState(ini.aPeso);
  const [aObs, setAObs] = useState(ini.aObs);
  const [porte, setPorte] = useState<PorteAnimal | null>(ini.porte);
  const [especie, setEspecie] = useState<EspecieAnimal | null>(ini.especie);
  const [sexo, setSexo] = useState<SexoAnimal | null>(ini.sexo);
  const [castrado, setCastrado] = useState(ini.castrado);
  const [docil, setDocil] = useState(ini.docil);

  // Veterinario
  const [vNome, setVNome] = useState(ini.vNome);
  const [temEspecialidade, setTemEspecialidade] = useState(ini.temEspecialidade);
  const [vEspecialidade, setVEspecialidade] = useState(ini.vEspecialidade);
  const [vTelefone, setVTelefone] = useState(ini.vTelefone);
  const [vClinica, setVClinica] = useState(ini.vClinica);
  const [vTelClinica, setVTelClinica] = useState(ini.vTelClinica);
  const [vEndClinica, setVEndClinica] = useState(ini.vEndClinica);

  // Anamnese
  const [doenca, setDoenca] = useState(ini.doenca);
  const [anDoenca, setAnDoenca] = useState(ini.anDoenca);
  const [anAlergias, setAnAlergias] = useState(ini.anAlergias);
  const [cuidados, setCuidados] = useState(ini.cuidados);
  const [anCuidados, setAnCuidados] = useState(ini.anCuidados);
  const [medicacao, setMedicacao] = useState(ini.medicacao);
  const [anMedicacao, setAnMedicacao] = useState(ini.anMedicacao);
  const [vermifugado, setVermifugado] = useState(ini.vermifugado);
  const [dataVermifugo, setDataVermifugo] = useState<Date | null>(ini.dataVermifugo);
  const [vacinado, setVacinado] = useState(ini.vacinado);
  const [dataVacina, setDataVacina] = useState<Date | null>(ini.dataVacina);
  const [anObs, setAnObs] = useState(ini.anObs);

  // Termo
  const [termoAceito, setTermoAceito] = useState(ini.termoAceito);
  const [dataAceite, setDataAceite] = useState<Date | null>(ini.dataAceite);
  const [localAceite, setLocalAceite] = useState(ini.localAceite);

  // Contatos
  const [contatos, setContatos] = useState<ContatoEditavel[]>(ini.contatos);

  const txt = (v: string) => (v.trim() === '' ? null : v.trim());

  async function salvar() {
    // O CPF/CNPJ e obrigatorio por decisao de negocio (o banco tambem exige).
    if (!tNome.trim()) return avisar('Verifique os dados', 'Informe o nome do tutor.');
    if (!tCpf.trim()) return avisar('Verifique os dados', 'Informe o CPF/CNPJ do tutor.');
    if (!aNome.trim()) return avisar('Verifique os dados', 'Informe o nome do animal.');
    if (aIdade.trim() && Number.isNaN(Number(aIdade))) {
      return avisar('Verifique os dados', 'A idade deve ser um número.');
    }

    try {
      // 1) Tutor — cria um novo ou reaproveita o selecionado.
      const tutor = await salvarTutor.mutateAsync({
        id: novoTutor ? '' : (tutorId ?? ''),
        nomeCompleto: tNome.trim(),
        cpfCnpj: txt(tCpf),
        rg: txt(tRg),
        telefone: txt(tTelefone),
        email: txt(tEmail),
        endereco: txt(tEndereco),
      });

      // 2) Animal.
      const animal = await salvarAnimal.mutateAsync({
        id: animalId ?? '',
        tutorId: tutor.id,
        nome: aNome.trim(),
        raca: txt(aRaca),
        idade: aIdade.trim() ? Number(aIdade) : null,
        porte,
        peso: aPeso.trim() ? Number(aPeso.replace(',', '.')) : null,
        especie,
        sexo,
        castrado,
        docil,
        observacoes: txt(aObs),
      });

      // 3) Ficha (veterinario, anamnese, termo, contatos).
      const temVeterinario = !!vNome.trim() || !!vClinica.trim();

      await salvarFicha.mutateAsync({
        animal,
        tutor,
        veterinario: temVeterinario
          ? {
              id: '',
              animalId: animal.id,
              nomeVeterinario: txt(vNome),
              temEspecialidade,
              qualEspecialidade: temEspecialidade ? txt(vEspecialidade) : null,
              telefoneVeterinario: txt(vTelefone),
              nomeClinica: txt(vClinica),
              telefoneClinica: txt(vTelClinica),
              enderecoClinica: txt(vEndClinica),
            }
          : null,
        anamnese: {
          id: '',
          animalId: animal.id,
          doencaPreexistente: doenca,
          doencaQual: doenca ? txt(anDoenca) : null,
          alergias: txt(anAlergias),
          cuidadosEspeciais: cuidados,
          cuidadosQual: cuidados ? txt(anCuidados) : null,
          tomaMedicacao: medicacao,
          medicacaoQual: medicacao ? txt(anMedicacao) : null,
          vermifugadoUltimoMes: vermifugado,
          dataVermifugo: vermifugado ? dataVermifugo : null,
          vacinadoEsteAno: vacinado,
          dataVacinacao: vacinado ? dataVacina : null,
          observacoes: txt(anObs),
        },
        termo: {
          id: '',
          animalId: animal.id,
          aceito: termoAceito,
          dataAceite: termoAceito ? (dataAceite ?? new Date()) : null,
          localAceite: termoAceito ? txt(localAceite) : null,
        },
        contatos: contatos.map(
          (c, i): ContatoEmergencia => ({
            id: '',
            animalId: animal.id,
            nome: txt(c.nome),
            parentesco: txt(c.parentesco),
            telefone: txt(c.telefone),
            ordem: i + 1,
          }),
        ),
      });

      // Edicao: volta para a ficha de onde veio. Um `replace` aqui empilharia
      // uma segunda ficha igual, e o "voltar" seguinte nao sairia do lugar.
      // Cadastro: troca o formulario pela ficha recem-criada.
      if (editando) voltar();
      else router.replace(`/estadias/animal/${animal.id}`);
    } catch (e) {
      await avisar('Não foi possível salvar', mensagemDeErro(e));
    }
  }

  const salvando = salvarTutor.isPending || salvarAnimal.isPending || salvarFicha.isPending;

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 pb-6">
        <Secao titulo="Tutor">
          {!editando ? (
            <div className="mb-3 flex rounded-campo bg-neutra-clara p-[3px]" role="radiogroup">
              {(
                [
                  [true, 'Novo tutor'],
                  [false, 'Tutor existente'],
                ] as const
              ).map(([valor, texto]) => (
                <button
                  key={texto}
                  type="button"
                  role="radio"
                  aria-checked={novoTutor === valor}
                  onClick={() => setNovoTutor(valor)}
                  className={`flex-1 rounded-lg py-2.5 text-[13px] ${
                    novoTutor === valor
                      ? 'bg-primaria font-bold text-white'
                      : 'text-texto-escuro'
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
          ) : null}

          {!novoTutor && !editando ? (
            <Seletor
              rotulo="Selecione o tutor *"
              valor={tutorId}
              opcoes={(tutores.data ?? []).map((t) => t.id)}
              rotuloDe={(id) => tutores.data?.find((t) => t.id === id)?.nomeCompleto ?? id}
              aoSelecionar={(id) => {
                setTutorId(id);
                const t = tutores.data?.find((x) => x.id === id);
                if (t) {
                  setTNome(t.nomeCompleto);
                  setTCpf(t.cpfCnpj ?? '');
                  setTRg(t.rg ?? '');
                  setTTelefone(t.telefone ?? '');
                  setTEmail(t.email ?? '');
                  setTEndereco(t.endereco ?? '');
                }
              }}
            />
          ) : (
            <>
              <Campo rotulo="Nome completo *" valor={tNome} aoMudar={setTNome} />
              {/* Teclado padrao, e nao numerico: o CNPJ passou a aceitar
                  letras (formato alfanumerico, desde jul/2026). */}
              <Campo rotulo="CPF/CNPJ *" valor={tCpf} aoMudar={setTCpf} />
              <Campo rotulo="RG" valor={tRg} aoMudar={setTRg} />
              <Campo
                rotulo="Telefone"
                valor={tTelefone}
                aoMudar={setTTelefone}
                teclado="telefone"
              />
              <Campo rotulo="E-mail" valor={tEmail} aoMudar={setTEmail} teclado="email" />
              <Campo rotulo="Endereço" valor={tEndereco} aoMudar={setTEndereco} />
            </>
          )}
        </Secao>

        <Secao titulo="Animal">
          <Campo rotulo="Nome *" valor={aNome} aoMudar={setANome} />
          <Campo rotulo="Raça" valor={aRaca} aoMudar={setARaca} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Campo
                rotulo="Idade (anos)"
                valor={aIdade}
                aoMudar={setAIdade}
                teclado="numerico"
              />
            </div>
            <div className="flex-1">
              <Campo rotulo="Peso (kg)" valor={aPeso} aoMudar={setAPeso} teclado="decimal" />
            </div>
          </div>
          <Seletor
            rotulo="Espécie"
            valor={especie}
            opcoes={ESPECIES}
            rotuloDe={(e) => rotuloEspecie[e]}
            aoSelecionar={setEspecie}
          />
          <Seletor
            rotulo="Porte"
            valor={porte}
            opcoes={PORTES}
            rotuloDe={(p) => rotuloPorte[p]}
            aoSelecionar={setPorte}
          />
          <Seletor
            rotulo="Sexo"
            valor={sexo}
            opcoes={SEXOS}
            rotuloDe={(x) => rotuloSexo[x]}
            aoSelecionar={setSexo}
          />
          <LinhaSwitch titulo="Castrado" valor={castrado} aoMudar={setCastrado} />
          <LinhaSwitch titulo="Dócil" valor={docil} aoMudar={setDocil} />
          <Campo rotulo="Observações" valor={aObs} aoMudar={setAObs} multilinha />
        </Secao>

        <Secao titulo="Veterinário">
          <Campo rotulo="Nome do veterinário" valor={vNome} aoMudar={setVNome} />
          <LinhaSwitch
            titulo="Possui especialidade"
            valor={temEspecialidade}
            aoMudar={setTemEspecialidade}
          />
          {temEspecialidade ? (
            <Campo
              rotulo="Qual especialidade"
              valor={vEspecialidade}
              aoMudar={setVEspecialidade}
            />
          ) : null}
          <Campo
            rotulo="Telefone do veterinário"
            valor={vTelefone}
            aoMudar={setVTelefone}
            teclado="telefone"
          />
          <Campo rotulo="Nome da clínica" valor={vClinica} aoMudar={setVClinica} />
          <Campo
            rotulo="Telefone da clínica"
            valor={vTelClinica}
            aoMudar={setVTelClinica}
            teclado="telefone"
          />
          <Campo rotulo="Endereço da clínica" valor={vEndClinica} aoMudar={setVEndClinica} />
        </Secao>

        <Secao titulo="Contatos de emergência">
          {contatos.map((c, i) => (
            <div key={i} className="mb-3 rounded-campo bg-neutra-clara p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-texto-escuro">Contato {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setContatos(contatos.filter((_, j) => j !== i))}
                  className="text-[13px] font-semibold text-erro"
                >
                  Remover
                </button>
              </div>
              {/* Campos sobre fundo cinza: a caixa do campo fica branca
                  aqui para nao sumir contra o cartao. */}
              <div className="[&_input]:bg-white">
                <Campo
                  rotulo="Nome"
                  valor={c.nome}
                  aoMudar={(v) => atualizarContato(setContatos, contatos, i, { nome: v })}
                />
                <Campo
                  rotulo="Parentesco"
                  valor={c.parentesco}
                  aoMudar={(v) => atualizarContato(setContatos, contatos, i, { parentesco: v })}
                />
                <Campo
                  rotulo="Telefone"
                  valor={c.telefone}
                  teclado="telefone"
                  aoMudar={(v) => atualizarContato(setContatos, contatos, i, { telefone: v })}
                />
              </div>
            </div>
          ))}
          <Botao
            variante="secundario"
            className="w-full"
            onClick={() =>
              setContatos([...contatos, { nome: '', parentesco: '', telefone: '' }])
            }
          >
            + Adicionar contato
          </Botao>
        </Secao>

        <Secao titulo="Anamnese">
          <LinhaSwitch titulo="Doença preexistente" valor={doenca} aoMudar={setDoenca} />
          {doenca ? (
            <Campo rotulo="Qual doença" valor={anDoenca} aoMudar={setAnDoenca} />
          ) : null}
          <Campo rotulo="Alergias" valor={anAlergias} aoMudar={setAnAlergias} />
          <LinhaSwitch titulo="Cuidados especiais" valor={cuidados} aoMudar={setCuidados} />
          {cuidados ? (
            <Campo rotulo="Quais cuidados" valor={anCuidados} aoMudar={setAnCuidados} />
          ) : null}
          <LinhaSwitch titulo="Toma medicação" valor={medicacao} aoMudar={setMedicacao} />
          {medicacao ? (
            <Campo rotulo="Qual medicação" valor={anMedicacao} aoMudar={setAnMedicacao} />
          ) : null}
          <LinhaSwitch
            titulo="Vermifugado no último mês"
            valor={vermifugado}
            aoMudar={setVermifugado}
          />
          {vermifugado ? (
            <SeletorDataHora
              rotulo="Data do vermífugo"
              apenasData
              valor={dataVermifugo}
              aoMudar={setDataVermifugo}
              aoLimpar={() => setDataVermifugo(null)}
            />
          ) : null}
          <LinhaSwitch titulo="Vacinado este ano" valor={vacinado} aoMudar={setVacinado} />
          {vacinado ? (
            <SeletorDataHora
              rotulo="Data da vacinação"
              apenasData
              valor={dataVacina}
              aoMudar={setDataVacina}
              aoLimpar={() => setDataVacina(null)}
            />
          ) : null}
          <Campo
            rotulo="Observações da anamnese"
            valor={anObs}
            aoMudar={setAnObs}
            multilinha
          />
        </Secao>

        <Secao titulo="Termo de consentimento">
          <div className="mb-2">
            <Dica>
              Registro informativo. Os itens do termo são conferência manual da equipe e
              não bloqueiam agendamentos.
            </Dica>
          </div>
          <LinhaSwitch titulo="Termo aceito" valor={termoAceito} aoMudar={setTermoAceito} />
          {termoAceito ? (
            <>
              <SeletorDataHora
                rotulo="Data do aceite"
                apenasData
                valor={dataAceite}
                aoMudar={setDataAceite}
                aoLimpar={() => setDataAceite(null)}
              />
              <Campo rotulo="Local do aceite" valor={localAceite} aoMudar={setLocalAceite} />
            </>
          ) : null}
        </Secao>
      </main>

      <Rodape>
        <Botao className="w-full" carregando={salvando} onClick={() => void salvar()}>
          {editando ? 'Salvar alterações' : 'Cadastrar'}
        </Botao>
      </Rodape>
    </>
  );
}

function atualizarContato(
  set: (v: ContatoEditavel[]) => void,
  lista: ContatoEditavel[],
  i: number,
  patch: Partial<ContatoEditavel>,
) {
  set(lista.map((c, j) => (j === i ? { ...c, ...patch } : c)));
}
