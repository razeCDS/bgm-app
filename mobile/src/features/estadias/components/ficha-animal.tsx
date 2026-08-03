import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Carregando, EstadoErro } from '../../../components/estados';
import { formatarDataOuNulo } from '../../../lib/formatadores';
import { cores } from '../../../theme/cores';
import { espaco, estilos } from '../../../theme/estilos';
import { useFichaAnimal } from '../hooks';
import {
  rotuloEspecie,
  rotuloPorte,
  rotuloSexo,
} from '../types/enums';
import type { FichaAnimal } from '../types/modelos';

type Linha = [string, string | null];

const sn = (v: boolean | null | undefined) =>
  v == null ? null : v ? 'Sim' : 'Não';

/**
 * Ficha completa do animal: dados do animal, tutor, veterinario, contatos
 * de emergencia, anamnese e termo de consentimento.
 */
export function VisaoFichaAnimal({ animalId }: { animalId: string }) {
  const router = useRouter();
  const { data, isPending, error, refetch } = useFichaAnimal(animalId);

  if (isPending) return <Carregando />;
  if (error) {
    return <EstadoErro mensagem={String(error)} aoTentarNovamente={() => refetch()} />;
  }

  return (
    <View style={estilos.tela}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Blocos ficha={data} />
      </ScrollView>
      <View style={s.rodape}>
        <Pressable
          style={estilos.botaoPrimario}
          onPress={() => router.push(`/estadias/animal/${animalId}/editar`)}
        >
          <Text style={estilos.botaoPrimarioTexto}>Editar ficha</Text>
        </Pressable>
      </View>
    </View>
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
          ['Peso', a.peso != null ? `${a.peso} kg` : null],
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

      <View style={[estilos.cartao, s.bloco]}>
        <Text style={s.tituloBloco}>📞 Contatos de emergência</Text>
        <View style={s.divisor} />
        {ficha.contatos.length === 0 ? (
          <Text style={s.vazio}>Nenhum contato cadastrado.</Text>
        ) : (
          ficha.contatos.map((c) => (
            <View key={c.id} style={s.contato}>
              <View style={s.ordem}>
                <Text style={s.ordemTexto}>{c.ordem ?? 0}</Text>
              </View>
              <View style={s.flex}>
                <Text style={s.contatoNome}>{c.nome ?? '—'}</Text>
                <Text style={s.contatoInfo}>
                  {[c.parentesco, c.telefone].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

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
    <View style={[estilos.cartao, s.bloco]}>
      <Text style={s.tituloBloco}>
        {icone} {titulo}
      </Text>
      <View style={s.divisor} />
      {preenchidas.length === 0 ? (
        <Text style={s.vazio}>{textoVazio ?? 'Sem informações.'}</Text>
      ) : (
        preenchidas.map(([rotulo, valor]) => (
          <View key={rotulo} style={s.linha}>
            <Text style={s.rotulo}>{rotulo}</Text>
            <Text style={s.valor}>{valor}</Text>
          </View>
        ))
      )}
      {rodape ? <Text style={s.rodapeBloco}>{rodape}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: espaco.lg, gap: espaco.md + 2 },
  flex: { flex: 1 },
  bloco: { gap: 0 },
  tituloBloco: {
    fontSize: 16,
    fontWeight: '700',
    color: cores.primariaEscura,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: cores.neutra,
    marginVertical: espaco.md,
  },
  vazio: { color: cores.textoSuave },
  linha: { flexDirection: 'row', marginBottom: espaco.sm, gap: espaco.sm },
  rotulo: { width: 130, fontSize: 13, color: cores.textoSuave },
  valor: { flex: 1, fontSize: 14, color: cores.textoEscuro },
  rodapeBloco: { fontSize: 12, color: cores.textoSuave, marginTop: espaco.sm },
  contato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    marginBottom: espaco.md,
  },
  ordem: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordemTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: cores.primariaEscura,
  },
  contatoNome: { fontWeight: '600', color: cores.textoEscuro },
  contatoInfo: { fontSize: 12, color: cores.textoSuave },
  rodape: {
    padding: espaco.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.neutra,
    backgroundColor: cores.branco,
  },
});
