import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Campo,
  LinhaSwitch,
  Secao,
  Seletor,
  SeletorDataHora,
} from '../../../components/campos';
import { Carregando, EstadoErro } from '../../../components/estados';
import { cores } from '../../../theme/cores';
import { espaco, estilos, raio } from '../../../theme/estilos';
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
import type { ContatoEmergencia } from '../types/modelos';

interface ContatoEditavel {
  nome: string;
  parentesco: string;
  telefone: string;
}

/** Cadastro e edicao de cliente: tutor + animal + ficha completa. */
export function FormAnimal({ animalId }: { animalId?: string }) {
  const router = useRouter();
  const editando = !!animalId;

  const ficha = useFichaAnimal(animalId ?? '');
  const tutores = useTutores();
  const salvarTutor = useSalvarTutor();
  const salvarAnimal = useSalvarAnimal();
  const salvarFicha = useSalvarFicha();

  // Tutor
  const [novoTutor, setNovoTutor] = useState(true);
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [tNome, setTNome] = useState('');
  const [tCpf, setTCpf] = useState('');
  const [tRg, setTRg] = useState('');
  const [tTelefone, setTTelefone] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tEndereco, setTEndereco] = useState('');

  // Animal
  const [aNome, setANome] = useState('');
  const [aRaca, setARaca] = useState('');
  const [aIdade, setAIdade] = useState('');
  const [aPeso, setAPeso] = useState('');
  const [aObs, setAObs] = useState('');
  const [porte, setPorte] = useState<PorteAnimal | null>(null);
  const [especie, setEspecie] = useState<EspecieAnimal | null>('canina');
  const [sexo, setSexo] = useState<SexoAnimal | null>(null);
  const [castrado, setCastrado] = useState(false);
  const [docil, setDocil] = useState(true);

  // Veterinario
  const [vNome, setVNome] = useState('');
  const [temEspecialidade, setTemEspecialidade] = useState(false);
  const [vEspecialidade, setVEspecialidade] = useState('');
  const [vTelefone, setVTelefone] = useState('');
  const [vClinica, setVClinica] = useState('');
  const [vTelClinica, setVTelClinica] = useState('');
  const [vEndClinica, setVEndClinica] = useState('');

  // Anamnese
  const [doenca, setDoenca] = useState(false);
  const [anDoenca, setAnDoenca] = useState('');
  const [anAlergias, setAnAlergias] = useState('');
  const [cuidados, setCuidados] = useState(false);
  const [anCuidados, setAnCuidados] = useState('');
  const [medicacao, setMedicacao] = useState(false);
  const [anMedicacao, setAnMedicacao] = useState('');
  const [vermifugado, setVermifugado] = useState(false);
  const [dataVermifugo, setDataVermifugo] = useState<Date | null>(null);
  const [vacinado, setVacinado] = useState(false);
  const [dataVacina, setDataVacina] = useState<Date | null>(null);
  const [anObs, setAnObs] = useState('');

  // Termo
  const [termoAceito, setTermoAceito] = useState(false);
  const [dataAceite, setDataAceite] = useState<Date | null>(null);
  const [localAceite, setLocalAceite] = useState('');

  // Contatos
  const [contatos, setContatos] = useState<ContatoEditavel[]>([]);

  const [preenchido, setPreenchido] = useState(false);

  useEffect(() => {
    const f = ficha.data;
    if (!editando || !f || preenchido) return;

    setNovoTutor(false);
    setTutorId(f.tutor.id);
    setTNome(f.tutor.nomeCompleto);
    setTCpf(f.tutor.cpfCnpj ?? '');
    setTRg(f.tutor.rg ?? '');
    setTTelefone(f.tutor.telefone ?? '');
    setTEmail(f.tutor.email ?? '');
    setTEndereco(f.tutor.endereco ?? '');

    const a = f.animal;
    setANome(a.nome);
    setARaca(a.raca ?? '');
    setAIdade(a.idade != null ? String(a.idade) : '');
    setAPeso(a.peso != null ? String(a.peso) : '');
    setAObs(a.observacoes ?? '');
    setPorte(a.porte);
    setEspecie(a.especie);
    setSexo(a.sexo);
    setCastrado(a.castrado ?? false);
    setDocil(a.docil ?? true);

    const v = f.veterinario;
    setVNome(v?.nomeVeterinario ?? '');
    setTemEspecialidade(v?.temEspecialidade ?? false);
    setVEspecialidade(v?.qualEspecialidade ?? '');
    setVTelefone(v?.telefoneVeterinario ?? '');
    setVClinica(v?.nomeClinica ?? '');
    setVTelClinica(v?.telefoneClinica ?? '');
    setVEndClinica(v?.enderecoClinica ?? '');

    const an = f.anamnese;
    setDoenca(an?.doencaPreexistente ?? false);
    setAnDoenca(an?.doencaQual ?? '');
    setAnAlergias(an?.alergias ?? '');
    setCuidados(an?.cuidadosEspeciais ?? false);
    setAnCuidados(an?.cuidadosQual ?? '');
    setMedicacao(an?.tomaMedicacao ?? false);
    setAnMedicacao(an?.medicacaoQual ?? '');
    setVermifugado(an?.vermifugadoUltimoMes ?? false);
    setDataVermifugo(an?.dataVermifugo ?? null);
    setVacinado(an?.vacinadoEsteAno ?? false);
    setDataVacina(an?.dataVacinacao ?? null);
    setAnObs(an?.observacoes ?? '');

    setTermoAceito(f.termo?.aceito ?? false);
    setDataAceite(f.termo?.dataAceite ?? null);
    setLocalAceite(f.termo?.localAceite ?? '');

    setContatos(
      f.contatos.map((c) => ({
        nome: c.nome ?? '',
        parentesco: c.parentesco ?? '',
        telefone: c.telefone ?? '',
      })),
    );

    setPreenchido(true);
  }, [ficha.data, editando, preenchido]);

  const txt = (v: string) => (v.trim() === '' ? null : v.trim());

  async function salvar() {
    // O CPF/CNPJ e obrigatorio por decisao de negocio; a coluna aceita nulo.
    if (!tNome.trim()) return Alert.alert('Verifique os dados', 'Informe o nome do tutor.');
    if (!tCpf.trim()) return Alert.alert('Verifique os dados', 'Informe o CPF/CNPJ do tutor.');
    if (!aNome.trim()) return Alert.alert('Verifique os dados', 'Informe o nome do animal.');
    if (aIdade.trim() && Number.isNaN(Number(aIdade))) {
      return Alert.alert('Verifique os dados', 'A idade deve ser um número.');
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

      router.replace(`/estadias/animal/${animal.id}`);
    } catch (e) {
      Alert.alert('Não foi possível salvar', String(e));
    }
  }

  if (editando && ficha.isPending) return <Carregando />;
  if (editando && ficha.error) return <EstadoErro mensagem={String(ficha.error)} />;

  const salvando =
    salvarTutor.isPending || salvarAnimal.isPending || salvarFicha.isPending;

  return (
    <View style={estilos.tela}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Secao titulo="Tutor">
          {!editando ? (
            <View style={s.alternador}>
              <Pressable
                style={[s.opcaoAlt, novoTutor && s.opcaoAltAtiva]}
                onPress={() => setNovoTutor(true)}
              >
                <Text style={[s.opcaoAltTexto, novoTutor && s.opcaoAltTextoAtivo]}>
                  Novo tutor
                </Text>
              </Pressable>
              <Pressable
                style={[s.opcaoAlt, !novoTutor && s.opcaoAltAtiva]}
                onPress={() => setNovoTutor(false)}
              >
                <Text style={[s.opcaoAltTexto, !novoTutor && s.opcaoAltTextoAtivo]}>
                  Tutor existente
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!novoTutor && !editando ? (
            <Seletor
              rotulo="Selecione o tutor *"
              valor={tutorId}
              opcoes={(tutores.data ?? []).map((t) => t.id)}
              rotuloDe={(id) =>
                tutores.data?.find((t) => t.id === id)?.nomeCompleto ?? id
              }
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
              <Campo rotulo="CPF/CNPJ *" valor={tCpf} aoMudar={setTCpf} />
              <Campo rotulo="RG" valor={tRg} aoMudar={setTRg} />
              <Campo
                rotulo="Telefone"
                valor={tTelefone}
                aoMudar={setTTelefone}
                teclado="phone-pad"
              />
              <Campo
                rotulo="E-mail"
                valor={tEmail}
                aoMudar={setTEmail}
                teclado="email-address"
              />
              <Campo rotulo="Endereço" valor={tEndereco} aoMudar={setTEndereco} />
            </>
          )}
        </Secao>

        <Secao titulo="Animal">
          <Campo rotulo="Nome *" valor={aNome} aoMudar={setANome} />
          <Campo rotulo="Raça" valor={aRaca} aoMudar={setARaca} />
          <View style={s.linha}>
            <View style={s.flex}>
              <Campo
                rotulo="Idade (anos)"
                valor={aIdade}
                aoMudar={setAIdade}
                teclado="number-pad"
              />
            </View>
            <View style={s.flex}>
              <Campo
                rotulo="Peso (kg)"
                valor={aPeso}
                aoMudar={setAPeso}
                teclado="decimal-pad"
              />
            </View>
          </View>
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
          <Campo
            rotulo="Observações"
            valor={aObs}
            aoMudar={setAObs}
            multilinha
          />
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
            teclado="phone-pad"
          />
          <Campo rotulo="Nome da clínica" valor={vClinica} aoMudar={setVClinica} />
          <Campo
            rotulo="Telefone da clínica"
            valor={vTelClinica}
            aoMudar={setVTelClinica}
            teclado="phone-pad"
          />
          <Campo
            rotulo="Endereço da clínica"
            valor={vEndClinica}
            aoMudar={setVEndClinica}
          />
        </Secao>

        <Secao titulo="Contatos de emergência">
          {contatos.map((c, i) => (
            <View key={i} style={s.contato}>
              <View style={s.contatoTopo}>
                <Text style={s.contatoTitulo}>Contato {i + 1}</Text>
                <Pressable
                  onPress={() =>
                    setContatos(contatos.filter((_, j) => j !== i))
                  }
                  hitSlop={8}
                >
                  <Text style={s.remover}>Remover</Text>
                </Pressable>
              </View>
              <Campo
                rotulo="Nome"
                valor={c.nome}
                aoMudar={(v) => atualizarContato(setContatos, contatos, i, { nome: v })}
              />
              <Campo
                rotulo="Parentesco"
                valor={c.parentesco}
                aoMudar={(v) =>
                  atualizarContato(setContatos, contatos, i, { parentesco: v })
                }
              />
              <Campo
                rotulo="Telefone"
                valor={c.telefone}
                teclado="phone-pad"
                aoMudar={(v) =>
                  atualizarContato(setContatos, contatos, i, { telefone: v })
                }
              />
            </View>
          ))}
          <Pressable
            style={estilos.botaoSecundario}
            onPress={() =>
              setContatos([...contatos, { nome: '', parentesco: '', telefone: '' }])
            }
          >
            <Text style={estilos.botaoSecundarioTexto}>+ Adicionar contato</Text>
          </Pressable>
        </Secao>

        <Secao titulo="Anamnese">
          <LinhaSwitch
            titulo="Doença preexistente"
            valor={doenca}
            aoMudar={setDoenca}
          />
          {doenca ? (
            <Campo rotulo="Qual doença" valor={anDoenca} aoMudar={setAnDoenca} />
          ) : null}
          <Campo rotulo="Alergias" valor={anAlergias} aoMudar={setAnAlergias} />
          <LinhaSwitch
            titulo="Cuidados especiais"
            valor={cuidados}
            aoMudar={setCuidados}
          />
          {cuidados ? (
            <Campo
              rotulo="Quais cuidados"
              valor={anCuidados}
              aoMudar={setAnCuidados}
            />
          ) : null}
          <LinhaSwitch
            titulo="Toma medicação"
            valor={medicacao}
            aoMudar={setMedicacao}
          />
          {medicacao ? (
            <Campo
              rotulo="Qual medicação"
              valor={anMedicacao}
              aoMudar={setAnMedicacao}
            />
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
          <LinhaSwitch
            titulo="Vacinado este ano"
            valor={vacinado}
            aoMudar={setVacinado}
          />
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
          <Text style={s.dica}>
            Registro informativo. Os itens do termo são conferência manual da
            equipe e não bloqueiam agendamentos.
          </Text>
          <LinhaSwitch
            titulo="Termo aceito"
            valor={termoAceito}
            aoMudar={setTermoAceito}
          />
          {termoAceito ? (
            <>
              <SeletorDataHora
                rotulo="Data do aceite"
                apenasData
                valor={dataAceite}
                aoMudar={setDataAceite}
                aoLimpar={() => setDataAceite(null)}
              />
              <Campo
                rotulo="Local do aceite"
                valor={localAceite}
                aoMudar={setLocalAceite}
              />
            </>
          ) : null}
        </Secao>
      </ScrollView>

      <View style={s.rodape}>
        <Pressable
          style={[estilos.botaoPrimario, salvando && estilos.desabilitado]}
          onPress={salvar}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <Text style={estilos.botaoPrimarioTexto}>
              {editando ? 'Salvar alterações' : 'Cadastrar'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
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

const s = StyleSheet.create({
  conteudo: { padding: espaco.lg, paddingBottom: espaco.xxl },
  flex: { flex: 1 },
  linha: { flexDirection: 'row', gap: espaco.md },
  dica: { fontSize: 12, color: cores.textoSuave, marginBottom: espaco.sm },
  alternador: {
    flexDirection: 'row',
    backgroundColor: cores.neutraClara,
    borderRadius: raio.md,
    padding: 3,
    marginBottom: espaco.md,
  },
  opcaoAlt: {
    flex: 1,
    paddingVertical: espaco.sm + 2,
    alignItems: 'center',
    borderRadius: raio.sm,
  },
  opcaoAltAtiva: { backgroundColor: cores.primaria },
  opcaoAltTexto: { fontSize: 13, color: cores.textoEscuro },
  opcaoAltTextoAtivo: { color: cores.branco, fontWeight: '700' },
  contato: {
    backgroundColor: cores.neutraClara,
    borderRadius: raio.md,
    padding: espaco.md,
    marginBottom: espaco.md,
  },
  contatoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espaco.sm,
  },
  contatoTitulo: { fontWeight: '600', color: cores.textoEscuro },
  remover: { color: cores.erro, fontSize: 13, fontWeight: '600' },
  rodape: {
    padding: espaco.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.neutra,
    backgroundColor: cores.branco,
  },
});
