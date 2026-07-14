# Controle de Compras Disktrans — Migração para Supabase

Resumo para validação antes de seguir para o frontend.

**Projeto Supabase:** `Disktrans's Project` (`anjimmaupmuxwzusrpfy`, região `sa-east-1`, Postgres 17)
**URL da API:** `https://anjimmaupmuxwzusrpfy.supabase.co`

---

## 1. Estrutura criada

### `public.pedidos`
Campos: `id`, `mes` (1–12), `data`, `descricao_item`, `fornecedor`, `valor`, `solicitante`, `departamento`, `status` (enum `concluido` / `aguardando_aprovacao` / `reprovado`), `link_compra`, `dados_planilha_raw` (jsonb, ver seção 3), `criado_por` (FK `auth.users`, nullable), `criado_em`, `atualizado_em`.

### `public.perfis`
1:1 com `auth.users`: `id`, `nome`, `email` (único), `papel` (enum `solicitante` / `aprovador` / `admin`), `ativo`, `criado_em`, `atualizado_em`. Um perfil `solicitante` é criado automaticamente (trigger `on_auth_user_created`) sempre que um novo usuário se cadastra no Supabase Auth — depois disso, um admin promove para `aprovador`/`admin` manualmente.

### `public.historico_aprovacoes`
`id`, `pedido_id` (FK `pedidos`), `acao` (enum `aprovado` / `reprovado`), `usuario_id` (FK `auth.users`, **NOT NULL** — nenhuma aprovação pode ser anônima), `data_hora`, `observacao`.

### Função `public.registrar_decisao_pedido(pedido_id, acao, observacao)`
RPC que atualiza o status do pedido **e** grava o histórico numa única transação atômica, com `usuario_id = auth.uid()` sempre definido pelo servidor (nunca pelo cliente). Recomendo que o frontend use essa função para aprovar/reprovar, em vez de fazer `UPDATE` + `INSERT` separados — evita inconsistência se uma das duas operações falhar.

---

## 2. Mapeamento de status (decisão a validar)

O pedido original tinha 5 estados no dashboard (Concluído, Entregue, Aprovado, Pendente Entrega, Aguardando Aprovação, Reprovado). O novo schema pede só 3. Mapeei assim:

| Status no dashboard antigo | Status no Supabase |
|---|---|
| Concluído, Entregue, Pendente Entrega, Aprovado | `concluido` |
| Aguardando Aprovação | `aguardando_aprovacao` |
| Reprovado | `reprovado` |

Ou seja, `concluido` passou a significar "aprovado", não necessariamente "entregue" — o novo schema não tem campos de rastreio de entrega (NF, produto entregue etc.), então essa informação ficou só dentro de `dados_planilha_raw`, não como coluna própria. **Se isso não for o que você queria, me avisa que ajusto.**

## 3. Outras decisões de migração (a validar)

- **`solicitante`**: a planilha não tinha um campo limpo "nome do solicitante" — o texto era uma mistura de departamento + pessoa (ex: "Logistica (Guilherme) Op (Thifany)"). Migrei o texto bruto como está para `solicitante`, e mantive `departamento` com a mesma classificação aproximada por palavra-chave que já existia no dashboard.
- **`data`**: a planilha só tinha o mês (aba), não o dia exato da compra. Usei o dia 1 de cada mês como aproximação. `criado_em` também foi ajustado para essa data (em vez de "agora"), pra não distorcer a linha do tempo.
- **`criado_por`**: fica `NULL` nos 177 registros migrados — são históricos, anteriores ao controle de acesso, e não há como vincular a um usuário autenticado real. Novos pedidos criados pelo app já vão preencher isso automaticamente.
- **`dados_planilha_raw`** (jsonb): guardei marca, quantidade, valor unitário, texto bruto do motivo/aprovação e status original do dashboard — para não perder informação da planilha que não tinha coluna correspondente no novo schema.

**Total migrado: 177 pedidos, R$ 219.245,36 — confere com o valor informado.**

---

## 4. Políticas de RLS (todas as 3 tabelas com RLS ativo)

### `pedidos`

| Papel | Ação | Regra |
|---|---|---|
| solicitante | SELECT | só pedidos onde `criado_por = auth.uid()` |
| solicitante | INSERT | só pode criar com `criado_por = auth.uid()` |
| solicitante | UPDATE | **nenhuma política → sempre bloqueado** |
| aprovador | SELECT | todos os pedidos |
| aprovador | UPDATE | qualquer pedido, mas só pode alterar a coluna `status` — reforçado por trigger (`enforce_aprovador_status_only`), porque RLS não restringe coluna, só linha |
| admin | SELECT / INSERT / UPDATE / DELETE | acesso total |

### `perfis`

| Papel | Ação | Regra |
|---|---|---|
| qualquer usuário | SELECT | só o próprio perfil (`id = auth.uid()`) |
| admin | ALL | acesso total (único papel que gerencia perfis de outros) |

### `historico_aprovacoes`

| Papel | Ação | Regra |
|---|---|---|
| aprovador, admin | SELECT | histórico completo |
| solicitante | — | **sem acesso** (não implementado — avise se quiser que o solicitante veja o histórico dos próprios pedidos) |
| aprovador | INSERT | só com `usuario_id = auth.uid()` |
| admin | INSERT | só com `usuario_id = auth.uid()` |
| qualquer papel | UPDATE / DELETE | **bloqueado para todos** — trilha de auditoria imutável por design |

Nenhuma policy concede nada a `anon` — usuário não autenticado tem acesso zero às 3 tabelas.

---

## 5. Revisão de segurança (advisors do Supabase)

Corrigido:
- `search_path` fixo nas funções de trigger (mitiga sequestro de schema)
- Removido acesso público (`anon`/`authenticated`) à função de trigger `handle_new_user`
- Removido acesso `anon` à função `get_my_role`
- Índice ausente na FK `historico_aprovacoes.usuario_id`
- Chamadas de `auth.uid()` otimizadas nas políticas (`(select auth.uid())`, evita reavaliação por linha)

Aceito conscientemente:
- `get_my_role()` continua chamável por qualquer usuário autenticado — é intencional, é assim que o frontend descobre o próprio papel; a função só lê o papel do próprio usuário, nunca de terceiros.
- Índices novos aparecem como "não usados" — esperado, a tabela é nova e ainda não recebeu tráfego real.
- Múltiplas políticas permissivas por ação (ex: solicitante + aprovador em SELECT de `pedidos`) — daria um pouco mais de performance combinar em uma só política por ação, mas separei por papel de propósito, pra ficar claro qual regra é de quem. Dado o volume (centenas de pedidos, uso interno), não é um problema real de performance.

---

## 6. Regras de segurança do frontend (não negociável)

- A **service role key nunca** vai para o repositório ou para código do navegador — não foi gerada/exposta nesta conversa.
- O frontend usa só a **anon/publishable key** (abaixo) + o token de sessão do usuário autenticado. A barreira real de acesso é o RLS, não o frontend.
- Publishable key (pode ir no frontend): `sb_publishable_tyXxaIVd2DJABFLHdH81jg_5crf7-_W`
- Anon key legada (compatibilidade, mesma função): também pode ir no frontend, mas prefira a publishable key em código novo.

---

## Pontos abertos para você confirmar

1. Mapeamento de status (seção 2) — ok ou precisa distinguir "entregue" de "aprovado, aguardando entrega"?
2. Solicitante deveria ver o histórico dos próprios pedidos em `historico_aprovacoes`? Hoje não vê.
3. Quer que eu já crie os primeiros usuários/perfis (`aprovador`, `admin`) ou isso fica para quando o pessoal se cadastrar pelo app?
