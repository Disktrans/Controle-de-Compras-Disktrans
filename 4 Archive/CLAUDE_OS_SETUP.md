# CLAUDE_OS_SETUP

Guia de setup do Claude OS, pra ser executado pelo Cowork. Você recebeu este arquivo no chat durante o workshop. Por enquanto, só guarde ele em algum lugar fácil de achar (Área de Trabalho serve). Quando tiver de 30 a 45 minutos com calma, siga daqui.

## Antes de começar (você faz à mão, leva 2 minutos)

1. Crie uma pasta nova chamada `Claude OS` dentro de Documentos (botão direito > Novo > Pasta).
2. Mova este arquivo pra dentro dela.
3. Abra o app do Claude no computador e aponte o Cowork pra essa pasta `Claude OS`.
4. Fale, no Cowork:

> **"Lê o CLAUDE_OS_SETUP.md e me ajuda a montar minha arquitetura."**

Daqui pra frente o Cowork conduz, passo a passo, no seu ritmo. Pode pausar e voltar outro dia: ele lembra de onde parou.

---

## Para o Cowork ler primeiro

Você vai conduzir esse usuário pelos 7 passos abaixo, um por vez. Contexto importante:

- O usuário participou de um workshop online sobre Claude OS e conhece a **metáfora da casa**: a pasta raiz é a casa, as pastas internas são os cômodos, os arquivos são os objetos. Cada cômodo tem um **manual** (CLAUDE.md) e uma **memória** (MEMORY.md). A casa tem ainda um **inventário** (INDEX.md) e um **baú** (ARCHIVE.md). Use essa linguagem ao conduzir, sempre apresentando o nome técnico junto na primeira vez.
- Ele não é técnico. Pode ser a primeira experiência com IA agente.
- Ele está fazendo isso sozinho, depois do workshop. Não tem facilitador do lado. Você é o guia inteiro.
- Tom: acolhedor, paciência infinita, zero jargão desnecessário. Termo técnico só com explicação de uma frase.

Como conduzir:

1. Apresente cada passo em 1 ou 2 frases antes de executar.
2. Quando precisar de input (passos 2, 3, 5 e 6 principalmente), pergunte de forma simples e espere a resposta antes de avançar.
3. Confirme cada passo concluído com mensagem curta de progresso.
4. Se o usuário travar, pause e ofereça simplificar ou pular.
5. Um passo por turno. Não tente fazer tudo de uma vez.
6. Não cite "Passo 1", "Passo 2" pro usuário. Conduza naturalmente.

---

## Passo 1, construir a estrutura da casa

Crie 5 pastas e 4 arquivos vazios na raiz da pasta Claude OS:

```
Claude OS/
├── 0 Inbox/        ← o hall de entrada (tudo chega aqui primeiro)
├── 1 Projects/     ← ala de coisas com prazo e entrega
├── 2 Areas/        ← ala de responsabilidades contínuas
├── 3 Resources/    ← ala de referências que você consulta
├── 4 Archive/      ← ala do que acabou (mas se guarda)
├── CLAUDE.md       ← o manual da casa
├── MEMORY.md       ← a memória da casa
├── INDEX.md        ← o inventário (o que existe e onde)
└── ARCHIVE.md      ← o baú (memórias antigas, fora do caminho)
```

Diga ao usuário: "Vou construir a estrutura da casa: o hall de entrada, as 4 alas e os 4 arquivos especiais da raiz. Confirma?"

Crie tudo. Confirme conclusão e convide o usuário a abrir a pasta no computador e ver a árvore montada.

Tempo estimado: 3 minutos.

---

## Passo 2, conhecer o morador (pesquisa ao vivo)

O objetivo desse passo é o usuário sentir, logo no início, que o sistema está sendo montado pra ELE. Você faz 3 perguntas curtas e, depois de cada resposta, enriquece com pesquisa na internet. Pouca pergunta, muito retorno.

1. Pergunte: "Pra começar, me conta: qual o seu nome e em qual empresa você trabalha?"
   Com a resposta, pesquise a empresa na internet. Devolva um resumo curto (3 a 4 frases): o que a empresa faz, setor, onde opera, o que mais achar de relevante e verificável. Feche confirmando: "É essa mesmo? O que eu descrevi bate com a realidade aí de dentro?"
2. Pergunte: "E qual é o seu cargo ou função lá?"
   Pesquise o que esse papel costuma envolver nesse setor. Proponha de volta: "Então imagino que o seu dia a dia tenha coisas como [3 a 5 responsabilidades prováveis, específicas pro setor]. O que eu acertei? O que faltou?"
3. Feche com: "Dessas responsabilidades, qual é a que mais toma seu tempo ou te dá dor de cabeça hoje?"

Regras desse passo:

- Se a pesquisa achar pouco (empresa pequena, cargo incomum), use só o que achou e pergunte o resto. NUNCA invente fato sobre a empresa ou a pessoa.
- Guarde tudo que for confirmado ou corrigido: vira a seção "Sobre mim" da memória, no passo 4.

Tempo estimado: 7 minutos.

---

## Passo 3, escrever o manual da casa (CLAUDE.md raiz)

O arquivo mais importante. Define como o Claude trabalha pra esse usuário, em qualquer cômodo. Faça só estas 2 perguntas, uma por vez, esperando resposta:

1. "Como você prefere que eu escreva pra você no dia a dia: mais direto e conversacional, ou mais formal e detalhado?"
2. "Tem algum hábito ou preferência que eu deva seguir sempre? Por exemplo: nunca usar travessão, sempre citar fonte, sempre traduzir termos em inglês."

Pro resto, use padrões sensatos e avise: "Qualquer coisa que te incomodar no caminho, fala 'lembre disso' que eu ajusto o manual."

Escreva o CLAUDE.md raiz usando este template (preencha a seção Preferências com as 2 respostas; mantenha o resto como está):

```markdown
# CLAUDE.md (o manual da casa)

## Início de toda sessão

Leia, nesta ordem, antes de qualquer coisa:
1. `MEMORY.md`, pra saber o que está acontecendo no meu mundo
2. `INDEX.md`, pra saber quais arquivos de referência existem

Use o que encontrar pra informar seu trabalho. Não anuncie o que leu.

Quando eu disser "lembre disso", escreva a informação no `MEMORY.md`
imediatamente e confirme.

## Onde salvar o quê (2 testes)

- **Prescreve comportamento?** ("sempre", "nunca", "antes de X faça Y")
  → vai pro CLAUDE.md do nível certo.
- **É um fato que pode mudar?** (contato, status, decisão)
  → vai pro MEMORY.md do nível certo.
- Na dúvida, sugira onde acha que vai e me pergunte.

## Regras do MEMORY.md

1. Cada entrada: máximo 2 frases.
2. Teto de 150 linhas. Passou: comprima as entradas verbosas e mova as
   obsoletas pro `ARCHIVE.md` (o baú). Nunca suba o teto.
3. Quando um projeto terminar ou uma entrada envelhecer, mova pro
   `ARCHIVE.md` automaticamente.
4. O `ARCHIVE.md` nunca é lido no início da sessão. Só quando eu
   perguntar sobre algo do passado.

## Regra da casa e regra do cômodo

Cada área ou projeto pode ter seu próprio CLAUDE.md (manual do cômodo)
e MEMORY.md (memória do cômodo). Regra da casa vale em todo cômodo.
Regra do cômodo vale só nele. Nenhum nível repete o que já está acima.

## Como criar um cômodo novo

- **Área** (responsabilidade contínua, sem prazo): pasta em `2 Areas/`
  com CLAUDE.md (manual), MEMORY.md (memória) e subpasta `Recursos/`.
- **Projeto** (resultado com prazo): pasta em `1 Projects/` (ou dentro
  de `2 Areas/[area]/Projetos/` se pertencer a uma área) com CLAUDE.md
  (briefing) e MEMORY.md (estado).
- Teste rápido: "isso continua existindo daqui a um ano?" Sim → área.
  Não → projeto.
- Sempre que criar um cômodo ou arquivo de referência, adicione uma
  linha no `INDEX.md` (o inventário).

## Mapa de roteamento

| Pasta | Roteie pra cá quando eu... |
|---|---|
| (o Cowork preenche conforme as áreas forem criadas) | |

## Preferências

- Tom: [da pergunta 1]
- Listas em bullets, raciocínio em parágrafos.
- Recomendação direta quando a escolha for clara; opções com prós e
  contras quando houver trade-off real.
- Outras: [da pergunta 2]
- (Esta seção se ajusta pelo uso: "lembre disso" adiciona regra nova.)

## Auditoria de sessão

Quando eu disser "audite essa sessão", varra a conversa procurando
preferências novas, decisões importantes e correções que eu ensinei.
Adicione o que for novo no MEMORY.md certo e confirme o que adicionou.
```

Mostre o arquivo pro usuário antes de salvar e pergunte: "Esse manual te representa? Algo pra ajustar?"

Tempo estimado: 6 minutos.

---

## Passo 4, criar a memória, o inventário e o baú

Crie o MEMORY.md **já preenchido** com o que o passo 2 revelou:

```markdown
# MEMORY.md (a memória da casa)

_Entradas de no máximo 2 frases. Teto de 150 linhas. O que envelhecer
vai pro ARCHIVE.md (o baú)._

## Sobre mim
(preencha com os fatos confirmados no passo 2: nome, empresa, o que
ela faz, cargo, principais responsabilidades, a maior dor de cabeça
citada)

## Pessoas importantes
(equipe, contatos chave, clientes recorrentes)

## Projetos e áreas ativas
(o que está acontecendo agora)

## Decisões e regras recentes
(coisas pra eu lembrar)
```

Mostre o "Sobre mim" preenchido na tela e diga: "Olha a memória da casa: ela já nasce sabendo quem você é. Toda conversa nova começa comigo lendo isso. E quando você falar 'lembre disso', é aqui que a informação entra."

Crie o INDEX.md com o catálogo inicial:

```markdown
# INDEX.md (o inventário da casa)

_Uma linha por item: o que é e onde está. O Cowork mantém._

## Arquivos da raiz
- CLAUDE.md, o manual da casa
- MEMORY.md, a memória da casa
- ARCHIVE.md, o baú de memórias antigas
- CLAUDE_OS_SETUP.md, o guia que montou a casa (vai pro 4 Archive
  no fim do setup)

## Cômodos
(preenchido conforme áreas e projetos forem criados)
```

E o ARCHIVE.md:

```markdown
# ARCHIVE.md (o baú)

_Memórias antigas e projetos encerrados. Nunca lido no início da
sessão; consultado só quando você perguntar sobre o passado._
```

Diga: "O inventário diz o que existe na casa e onde. O baú guarda o que envelheceu sem atravancar a memória. Você nunca precisa editar nenhum dos dois à mão, eu cuido deles."

Tempo estimado: 4 minutos.

---

## Passo 5, escolher uma voz (opcional)

Define a voz de quem escreve coisas que outras pessoas leem: emails importantes, posts, relatórios, mensagens pra cliente.

Pergunte: "De vez em quando você vai me pedir pra escrever coisas que outras pessoas leem: email, mensagem pra cliente, relatório. Quer escolher agora um ponto de partida pro seu tom de voz? Leva 2 minutos, e dá pra trocar depois."

Se SIM, mostre **a mesma mensagem-teste escrita em 4 vozes** e pergunte: "Qual dessas soa mais como você?" A mensagem-teste: avisar um cliente que a visita de manutenção de amanhã precisou ser remarcada pra quinta.

**1. Direto ao ponto.** Conclusão primeiro, frases curtas, zero enfeite.
> "Oi, Carlos. Precisei remarcar a visita de amanhã pra quinta às 9h, o técnico teve um imprevisto. Quinta funciona pra você?"

**2. Próximo e caloroso.** A relação vem antes do assunto, tom de conversa.
> "Oi, Carlos, tudo bem? Vou precisar te pedir uma flexibilidade: o técnico de amanhã teve um imprevisto e a visita vai pra quinta às 9h. Desculpa a mudança em cima da hora. Quinta fica bom pra vocês?"

**3. Formal e preciso.** Protocolo, registro por escrito, sem ambiguidade.
> "Prezado Carlos, informo que a visita técnica agendada para amanhã precisou ser reagendada para quinta-feira, às 9h, por indisponibilidade do técnico responsável. Peço a gentileza de confirmar a nova data."

**4. Didático.** Explica o contexto e o porquê, antecipa a próxima dúvida.
> "Oi, Carlos. A visita de amanhã vai precisar mudar: o técnico que atende a sua região teve um imprevisto e não consegui substituto a tempo. A nova data é quinta às 9h, mesmo escopo combinado. Se quinta não der, me avisa que encontro outro horário ainda nesta semana."

Com a escolha, escreva `3 Resources/voice-principles.md` carregando os traços do arquétipo escolhido:

- Tom em uma frase.
- Como abre e como fecha uma mensagem.
- Estrutura típica de frase e parágrafo.
- 3 coisas que essa voz nunca faz (ex: a voz "direto ao ponto" nunca abre com rodeio; a "calorosa" nunca manda imperativo seco; a "formal" nunca usa gíria; a "didática" nunca entrega conclusão sem o porquê).
- A mensagem-teste escolhida, como exemplo de referência.

E feche o arquivo com esta seção fixa, em qualquer arquétipo:

```markdown
## Em construção

Este arquivo é um ponto de partida, não um retrato pronto. Toda vez
que o usuário corrigir um texto meu, registro aqui a correção como
regra nova. A voz real se forma pelo uso.
```

Adicione a linha no INDEX.md e acrescente ao CLAUDE.md raiz, na seção Preferências: "Antes de escrever qualquer texto em meu nome, leia `3 Resources/voice-principles.md`."

Avise: "Escolheu e depois achou que não era você? Sem drama: é só me falar que eu troco a voz ou misturo duas."

Se NÃO, pule.

Tempo estimado: 5 minutos.

---

## Passo 6, criar os primeiros cômodos (o passo mais importante)

É aqui que o sistema vira o sistema DESSE usuário.

Retome o passo 2: "Lá no começo você confirmou que o seu dia a dia envolve [responsabilidades confirmadas no passo 2]. Quais dessas merecem um cômodo próprio na casa? Escolhe de 1 a 3 pra gente começar. E vale vida pessoal também: finanças, saúde, estudos."

Espere a resposta. Pra cada área citada, crie a pasta em `2 Areas/` (nome em minúsculas, ex: `2 Areas/frota/`) com:

- `CLAUDE.md` (manual do cômodo), com as seções: **Identidade** (um parágrafo: o que essa área é e o que roteia pra cá), **Regras** (abre com "Siga o manual da casa. Além dele:" e lista regras específicas, se houver)
- `MEMORY.md` (memória do cômodo), com as seções **Contatos** e **Decisões-chave**
- Subpasta `Recursos/` vazia

Pergunte por área: "Pra [nome], tem alguma regra que vale só ali? Por exemplo: 'relatório de frota sempre nesse formato', 'cliente X só recebe às terças'."

Depois, projetos: "E coisa com prazo definido, que vai acabar em algum momento? Uma renovação de contrato, um evento, uma mudança de processo. Me cita 1 pra já começarmos."

Crie a pasta em `1 Projects/` com `CLAUDE.md` (briefing: nome, prazo, objetivo, entregáveis) e `MEMORY.md` (estado atual).

Pra fechar o passo:

1. Atualize o `MEMORY.md` raiz com o que aprendeu de novo sobre o usuário nas conversas. Mostre antes de salvar.
2. Atualize o `INDEX.md` com os cômodos criados.
3. Preencha o **mapa de roteamento** no CLAUDE.md raiz com uma linha por cômodo (ex: `2 Areas/frota/` | "Falar de transpaletes, manutenção, rotas, locação de equipamento").

Tempo estimado: 10 minutos.

---

## Passo 7, arquivar este arquivo e primeira tarefa real

Ofereça: "O setup está completo. Quer que eu mova o CLAUDE_OS_SETUP.md pro `4 Archive/`? Ele cumpriu a função." Se SIM, mova e atualize a linha dele no INDEX.md.

Depois, mensagem final:

> Pronto. Sua casa está de pé:
> - O hall de entrada e as 4 alas (estrutura PARA)
> - O manual, a memória, o inventário e o baú
> - A memória já sabe quem você é, onde trabalha e o que pesa no seu dia
> - [N] cômodos com manual e memória próprios
> - Uma voz escolhida pra textos em seu nome (se aplicável)
>
> A partir de agora, toda conversa nova comigo começa com eu entrando
> na casa e lendo o manual, a memória e o inventário. Eu já sei quem
> você é.
>
> Sugestão pra agora: me dá uma tarefa real de 10 minutos no cômodo
> que você criou. Pode ser organizar 2 ou 3 arquivos que você jogar
> na pasta, ou começar um relatório que você já ia fazer essa semana.
> É o uso real que faz o sistema valer.

Se a primeira tarefa envolver gerar Word, Excel, PowerPoint ou PDF, confira antes com o usuário se as skills `docx`, `xlsx`, `pptx` e `pdf` estão ativas nas configurações do Cowork. Se ele não achar o caminho, siga sem: dá pra ativar depois, e você avisa quando fizer falta.

E ensine o hábito de ouro: "Duas frases pra guardar: **'lembre disso'** grava algo na memória na hora. **'Audite essa sessão'** no fim de uma conversa importante faz eu extrair sozinho tudo que vale guardar."

---

## Notas finais pro Cowork

- Se o usuário ficar confuso ou quiser pausar, pause. O sistema funciona mesmo incompleto: passos 1 a 4 já entregam uma casa funcional.
- Se algo falhar (criar arquivo, ler arquivo, pesquisar na internet), explique em uma frase e ofereça caminho alternativo. Pesquisa indisponível no passo 2: faça as mesmas perguntas e siga só com as respostas.
- O passo 5 é pulável sem prejuízo. Os outros são a fundação.
- Ritmo do usuário acima de completude. Ele pode voltar amanhã e continuar de onde parou: você vai lembrar.
