# Automação de relatórios do Jira

Esta automação acessa issues PRIT e um dashboard do Jira, coleta informações de execução e gera relatórios agrupados por posição e tipo de teste. Cada posição referencia um Test Plan; suas execuções são configuradas explicitamente. O acesso é feito em uma janela do Microsoft Edge, com autenticação corporativa e MFA concluídos manualmente.

## Visão geral do projeto

O fluxo principal segue estas etapas:

1. Lê e valida as posições e o dashboard em `src/config/positions.config.ts` e a configuração do Jira em `.env`.
2. Abre o Jira e aguarda a autenticação corporativa/MFA.
3. Extrai somente os PRITs dos arrays de execução, incluindo título, labels, status e ligações. Test Plans não são execuções.
4. Atribui posição e tipo pela configuração, consulta os títulos dos Test Plans para exibição e coleta os dados do dashboard.
5. Gera as versões HTML, texto e JSON na pasta `output/`.

Pastas principais:

| Pasta             | Responsabilidade                                            |
| ----------------- | ----------------------------------------------------------- |
| `src/config/`     | PRITs da release, Test Plans, posições e seletores do Jira. |
| `src/extractors/` | Navegação no Jira e extração dos campos das issues.         |
| `src/utils/`      | Normalização, agrupamento e cálculos reutilizados.          |
| `src/reports/`    | Montagem e gravação dos relatórios.                         |
| `src/services/`   | Sessão do navegador e autenticação.                         |
| `src/types/`      | Tipos de dados partilhados entre as etapas.                 |
| `src/templates/`  | Template HTML e comportamento dos controles de edição.      |
| `tests/`          | Testes automatizados, incluindo cenários simulados do Jira. |
| `docs/`           | Guias de comportamento de funcionalidades específicas.      |

## Requisitos

- Node.js 20 ou superior e npm.
- Microsoft Edge instalado.
- Acesso ao Jira e permissão para visualizar os PRITs e o dashboard configurados.
- Acesso à autenticação corporativa/MFA da organização.

## Instalação

Clone o repositório e instale as dependências:

```powershell
git clone <URL_DO_REPOSITORIO>
cd t2d
npm ci
```

Crie o arquivo de configuração local a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Edite `.env` e informe a URL base do Jira e o e-mail corporativo usado no login:

```dotenv
JIRA_URL=https://jira.sua-empresa.com
JIRA_LOGIN_EMAIL=seu.email@sua-empresa.com
```

Use a URL base do Jira, sem `/browse` no final. O arquivo `.env` é local e ignorado pelo Git; não o compartilhe nem o versione.

## Executar

Na raiz do projeto, execute:

```powershell
npm run report
```

A automação abre o Microsoft Edge na primeira issue configurada. O e-mail é preenchido automaticamente quando a tela de login da Microsoft é detectada. Conclua o login e o MFA na janela aberta; quando o Jira estiver carregado, volte ao terminal e pressione **Enter** para iniciar a coleta.

Ao terminar, os relatórios ficam na pasta `output/`:

| Arquivo          | Conteúdo                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `report.html`    | Relatório HTML para visualização no navegador.                                                               |
| `report.txt`     | Relatório em texto.                                                                                          |
| `report.json`    | Objeto com `positions` (posição, plano e execuções com `testType`) e `overall` (agregados por posição/tipo). |
| `email.html`     | Versão HTML preparada para uso em e-mail.                                                                    |
| `dashboard.json` | Dados extraídos do dashboard; gerado quando a coleta do dashboard é bem-sucedida.                            |

Uma execução nova substitui os arquivos de relatório anteriores. A pasta `output/` também é ignorada pelo Git.

## Configuração da coleta

As configurações funcionais ficam no código-fonte:

- **Posições, planos e execuções:** edite `POSITIONS` em [`src/config/positions.config.ts`](src/config/positions.config.ts). Cada posição tem `name`, `testPlanPrit` e os arrays `executions.smoke`, `executions.regression`, `executions.certification` e `executions.defectFixing`. Esta é a única fonte da associação entre PRIT, posição e tipo.
- **Dashboard:** altere `DASHBOARD_PAGE_ID` em [`src/config/positions.config.ts`](src/config/positions.config.ts), junto de `POSITIONS`. Use o ID da página, não a URL completa.
- **Planos de teste:** `testPlanPrit` é uma referência/link opcional. Seu título é consultado no Jira, sem consultar vínculos para descobrir ou classificar execuções. Pode ficar vazio (`''`), mesmo quando há execuções. Postos sem plano e sem execuções, incluindo **OPT PT** e **OPT SP**, não bloqueiam a automação nem geram avisos de plano ausente; a coleta continua com os PRITs das outras posições. Use arrays vazios (`[]`) para os tipos sem execuções.
- **Texto do link do dashboard:** o nome é extraído automaticamente usando `DASHBOARD_PAGE_ID`, independentemente da coleta dos defects.
- **Ordem e nomes:** a ordem de `POSITIONS` define a apresentação dos postos. Os tipos seguem `TEST_TYPES` em [`src/config/test-types.config.ts`](src/config/test-types.config.ts); dentro de cada tipo, vale a ordem do array de PRITs. Títulos e labels não classificam nem ordenam execuções.
- **Estrutura e seletores do Jira:** se a interface do Jira mudar, os seletores usados na coleta ficam em [`src/config/selectors.ts`](src/config/selectors.ts).

Formato de uma posição (substitua os marcadores por PRITs confirmados; este exemplo não atribui nenhum PRIT existente):

```typescript
{
  name: 'COCO PT',
  testPlanPrit: 'PRIT-<plano-confirmado>',
  executions: {
    smoke: ['PRIT-<execução-smoke>'],
    regression: ['PRIT-<execução-regressão>'],
    certification: [],
    defectFixing: [],
  },
},
```

As chaves de issues aceitam o formato `PROJETO-1234` (por exemplo, `PRIT-1234` ou `IERL-23569`) ou somente o número, que é convertido para `PRIT-1234`; espaços externos e maiúsculas/minúsculas são normalizados. Uma execução só pode ocorrer uma vez na configuração, inclusive dentro do mesmo array. Duplicidades entre posições/tipos interrompem a coleta com a chave e os dois locais em conflito. Um Test Plan configurado não pode constar em nenhum array de execução.

A caixa **Links da release** lista um Test Plan por posição nos dois HTMLs e é a primeira tabela do relatório. É seguida por **Overall Test Results**, **Principais bloqueadores**, **Estado global** e os restantes conteúdos. As URLs usam `JIRA_URL`: `/browse/<PRIT>` para os planos e `/secure/Dashboard.jspa?selectPageId=<ID>` para o dashboard. Planos vazios aparecem como **Não informado** quando o posto é selecionado manualmente. O link do dashboard continua disponível mesmo se a coleta dos seus dados falhar.

Os títulos vêm dos endpoints de consulta de [issues e dashboards da API REST do Jira](https://docs.atlassian.com/software/jira/docs/api/REST/9.12.2/), usando a sessão já autenticada do navegador. Se uma consulta falhar, a automação registra um aviso e mantém o link com o PRIT ou ID, sem impedir a geração do relatório.

Use **Selecione os postos** para controlar todos os conteúdos associados a posições em `email.html` e `report.html`: Estado global, Overall Test Results, defects da sprint, links dos Test Plans e detalhes das execuções. A lista segue `POSITIONS`, incluindo posições sem execuções, como **OPT PT** e **OPT SP**, disponíveis para configurar. Inicialmente, apenas os postos com PRIT de Test Plan ou execuções associados ficam marcados; os restantes podem ser selecionados manualmente. Desmarcar um posto oculta os seus conteúdos; secções sem conteúdos selecionados desaparecem por completo, sem tabelas vazias. **Selecionar todos** e **Limpar seleção** aplicam-se ao relatório inteiro. As escolhas manuais são guardadas no navegador junto dos estados e notas. A cópia para e-mail e a impressão incluem apenas os conteúdos selecionados, sem os controles. No Estado global, **Concluído** aparece sem a bolinha verde. Consulte o [guia do Overall](docs/overall-results.md) para as regras de agregação e tratamento de avisos.

A tabela **Atividades por posto** foi removida. Os detalhes das execuções continuam disponíveis por posição e tipo de teste.

Em **Estado global**, a coluna **Status de instalação** inclui um seletor compacto (`--`, `OK`, `NOK`) e o campo opcional **Versão instalada** ao lado. A versão é guardada por posição junto dos restantes estados e acompanha a cópia para e-mail e o download dos postos selecionados. Em telas estreitas, o campo aparece abaixo do seletor.

Em `email.html`, **Baixar relatório completo**, ao lado de copiar, salva `P23002 - Retail 4.0 - AAAA-MM-DD.html`, usando a data do download no fuso `Europe/Lisbon`: uma cópia para consulta no navegador, inclusive offline, com apenas os postos selecionados no momento do download, seus resultados, links, defects, notas, estados e instalação. As observações gerais, os bloqueadores preenchidos e o dashboard disponível também são incluídos, mesmo com a seleção vazia. Os valores editados ficam incorporados no arquivo, sem depender do armazenamento do navegador. O download preserva a seleção e as edições do relatório aberto.

O posto **Reseller** usa a nova designação também nos títulos de execuções e resumos de defects apresentados nos relatórios; as issues no Jira não são alteradas.

A tabela **Defects criados na sprint** inclui apenas a relação `created` e as prioridades **Alta** (`High`) e **Crítica** (`Highest`). Um defect partilhado aparece uma vez, associado às posições configuradas das execuções que o referenciam. O título completo é preservado, inclusive tags como `PROD`, mas essas tags não determinam o agrupamento. O estado global, as notas e os bloqueadores manuais continuam disponíveis.

## Preenchimento das posições

Configure os planos e as execuções diretamente em `POSITIONS`; confirme a posição e o tipo de cada execução antes de adicioná-la. Os identificadores da configuração anterior estão preservados apenas como [referência histórica](docs/overall-results.md#referência-da-configuração-anterior), sem alimentar a coleta, gerar avisos ou bloquear atribuições.

Enquanto nenhuma execução estiver atribuída, o comando encerra antes de abrir o navegador ou gerar relatórios. Arquivos antigos em `output/` não são substituídos nesse caso.

O JSON é um objeto com `positions` e `overall`; consumidores do antigo array na raiz precisam passar a ler `positions`.

## Desenvolvimento

Instale as dependências com `npm ci`. Use os comandos seguintes a partir da raiz:

| Comando                | Uso                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `npm run report`       | Executa a coleta e gera os relatórios.                                                  |
| `npm test`             | Executa a suíte automatizada. Os testes usam dados simulados e não acessam o Jira real. |
| `npm run format`       | Formata o TypeScript, os testes e a documentação Markdown com Prettier.                 |
| `npm run format:check` | Verifica a formatação sem modificar arquivos.                                           |
| `npx tsc --noEmit`     | Verifica os tipos do código TypeScript.                                                 |

Ao alterar uma extração, mantenha o seletor em `src/config/selectors.ts` e cubra os casos relevantes nos testes. Ao adicionar uma posição ou mudar seu Test Plan, atualize somente `POSITIONS`. Um novo tipo de teste exige atualizar `TestType`, a configuração de tipos e os arrays de todas as posições.

A suíte ainda contém testes com imports e expectativas do modelo anterior e precisa de adaptação ao agrupamento explícito por posição/tipo. Consulte as [validações pendentes](docs/overall-results.md#validações-pendentes).

## Solução de problemas

- **Variáveis do Jira não configuradas:** confirme que existe um `.env` na raiz e que `JIRA_URL` e `JIRA_LOGIN_EMAIL` estão preenchidos.
- **Nenhuma execução atribuída:** preencha os arrays de PRITs por posição e tipo em `POSITIONS`.
- **Configuração inválida:** corrija os PRITs duplicados, o plano ausente de uma posição com execuções ou um Test Plan usado como execução. O erro informa o conflito antes da coleta.
- **Edge não inicia:** instale o Microsoft Edge e tente executar novamente.
- **A página não abre ou a coleta falha:** verifique a conexão à rede corporativa, o acesso ao Jira e as permissões para as issues e o dashboard configurados.
- **Um PRIT apresenta erro durante a execução:** confira o terminal para identificar a issue. A automação tenta a coleta até três vezes; se a falha persistir, encerra sem gerar novos relatórios. Os arquivos de uma execução anterior podem continuar em `output/`.
- **Overall Execution Status não encontrado:** a execução é considerada incompleta, o PRIT é tentado novamente e a geração é interrompida se as tentativas falharem. Confirme que a seção de resultados terminou de carregar no Jira e que a issue é uma execução com status disponíveis.
- **O dashboard falha:** a coleta dos PRITs continua independente. Nesse caso, os relatórios principais ainda são gerados, mas `dashboard.json` não é criado e o dashboard não é incluído nos HTMLs.
