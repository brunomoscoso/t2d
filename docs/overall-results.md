# Overall Test Results

Depois de atribuir os PRITs às posições e tipos, execute `npm run report` e abra `output/email.html` ou `output/report.html`. O único seletor **Selecione os postos** é gerado a partir das posições configuradas em `POSITIONS`, incluindo as que ainda não têm execuções, como OPT PT e OPT SP. Cada posto marcado exibe os seus conteúdos no **Estado global**, **Overall Test Results**, defects da sprint, links dos Test Plans e detalhes das execuções. Cada posição representa um Test Plan e tem uma tabela no Overall com as linhas Smoke, Regressão, Certificação e Defect Fixing, sem mercado. O nome da posição é o nome configurado; o título do Test Plan obtido do Jira aparece como informação complementar.

**Selecionar todos** e **Limpar seleção** atuam em todas essas áreas ao mesmo tempo. Inicialmente, apenas os postos com PRIT de Test Plan ou execuções associados ficam selecionados. Os postos sem nenhum PRIT continuam disponíveis, desmarcados. As escolhas manuais guardadas com esta regra são restauradas, inclusive quando a seleção está vazia. A seleção antiga que marcava todos os postos é ignorada; os estados, instalação e notas guardados para a mesma configuração são preservados. Esses dados ficam no `localStorage`, por caminho do arquivo e conjunto de posições, planos e execuções com seus tipos. Mover uma execução para outro tipo ou posição inicia uma seleção independente, mesmo mantendo o conjunto de PRITs. A edição e a cópia continuam disponíveis quando o armazenamento está bloqueado.

Nos dois HTMLs, as tabelas aparecem nesta ordem: **Links da release**, **Overall Test Results**, **Principais bloqueadores**, **Estado global** e os restantes conteúdos. No Estado global, **Concluído** é apresentado sem a bolinha verde, incluindo na cópia para e-mail.

Ao desmarcar um posto, todos os seus conteúdos são ocultados. Quando uma secção fica sem conteúdo selecionado, desaparecem também o título e os cabeçalhos; não é apresentada uma tabela vazia. O seletor continua disponível para voltar a marcar postos. Estado global, instalação e notas são preservados ao ocultar e voltar a mostrar uma posição.

O botão **Copiar relatório para o e-mail** inclui apenas os conteúdos selecionados, com seus avisos e sem controles ou elementos ocultos. O editor é restaurado depois da cópia, inclusive se ela falhar. A impressão respeita a mesma seleção. As escolhas de cada arquivo são independentes. Observações gerais, bloqueadores manuais e dashboard não têm associação a posições e permanecem disponíveis.

Em `email.html`, o botão **Baixar relatório completo** salva uma cópia HTML para consulta offline apenas com as posições selecionadas no momento do download e seus conteúdos. Estados, instalação, notas, bloqueadores e observações editados ficam incorporados como conteúdo do arquivo. Observações gerais, bloqueadores e dashboard disponível permanecem incluídos mesmo com a seleção vazia. A cópia não tem controles de edição nem depende do `localStorage`; a seleção e as edições no relatório original são preservadas.

## Origem e cálculo

- `POSITIONS`, em `src/config/positions.config.ts`, define o Test Plan de cada posição e os arrays de PRITs por tipo. O mesmo arquivo configura `DASHBOARD_PAGE_ID`. A ordem das posições segue esse arquivo, a ordem dos tipos segue `TEST_TYPES` e a ordem das execuções segue cada array.
- Somente os PRITs desses arrays são coletados. `testPlanPrit` é referência/link, nunca execução. O extrator de títulos usa a sessão autenticada e mantém o identificador como alternativa quando o Jira não retorna um título.
- Não se consultam vínculos Xray para determinar o agrupamento. Títulos, labels, aliases e palavras como PT/SP não atribuem posição ou tipo, nem alteram a ordem. Os dados do Jira continuam disponíveis para exibição, status, atividades e ligações com defeitos.
- A coluna **Grupo de Testes** do Overall identifica Smoke, Regressão, Certificação e Defect Fixing, com uma linha para cada grupo dentro da posição. Não há um segundo nível de mercado PT/SP: essas informações podem fazer parte do nome da posição.
- Uma execução repetida em qualquer array, inclusive no mesmo tipo/posição, torna a configuração inválida. A mensagem identifica o PRIT normalizado e os locais em conflito; não há deduplicação silenciosa. Dados de coleta repetidos ou sem configuração também são rejeitados. Um Test Plan não pode constar como execução em nenhuma posição.
- Cada posição com execuções precisa de `testPlanPrit`. Posições em rascunho podem ter plano vazio e todos os arrays vazios. Os relatórios mostram as posições sem execuções e os links ainda não informados.
- As quantidades dos status são somadas por posição e tipo. O percentual é `quantidade / soma dos status daquele tipo na posição × 100`, arredondado para uma casa decimal quando necessário. O Total é 100% quando positivo e 0% quando zerado. Não há média de percentuais das execuções.
- Os oito status padrão são apresentados, além dos adicionais encontrados naquela posição. Espaços e hífens nos nomes são normalizados para underscore; `TO DO` e `TODO` são somados juntos.
- Um array vazio mostra zeros, sem mensagem adicional junto ao tipo de teste. Os blocos detalhados de posições sem execuções são omitidos. O Overall usa células compactas, com deslocamento horizontal em ecrãs pequenos; a cópia para e-mail mantém o espaçamento reduzido. Se houver execução configurada sem dados coletados, o tipo mostra **—**, **Dados indisponíveis** e um aviso, evitando publicar um agregado parcial. No fluxo normal, falhas de coleta são tentadas até três vezes e interrompem a geração de novos relatórios.
- Avisos também indicam status/quantidades inválidos e diferenças entre `totalTests` e a soma dos status. São registrados no terminal e acompanham a tabela selecionada na cópia. A indisponibilidade do título do Test Plan não afeta os cálculos.

## Configuração e demais relatórios

Configure cada execução em exatamente um array de `POSITIONS`, após confirmar a posição e o tipo. Confirme separadamente o Test Plan da posição: os planos antigos eram organizados por tipo e podem não representar as novas posições. A aplicação usa somente `POSITIONS`, sem inventário de pendências ou avisos de migração. Sem execuções atribuídas, encerra antes de abrir o navegador ou escrever arquivos; relatórios antigos podem continuar em `output/`.

HTML, e-mail e TXT mostram posição, plano e tipo; os blocos detalhados preservam os títulos, os status e os vínculos. O TXT também inclui as labels. A tabela Atividades por posto foi removida dos relatórios; estado global, instalação, notas e bloqueadores manuais permanecem editáveis. A identificação do relatório para persistência inclui posição, plano e tipo, além dos PRITs.

Os defects da sprint são identificados pela relação `created` e a tabela inclui apenas as prioridades **Alta** (`High`) e **Crítica** (`Highest`), com uma linha por defect. As restantes prioridades continuam nos dados recolhidos e nos detalhes das execuções, mas não aparecem nesta tabela. Um defect partilhado aparece enquanto pelo menos uma das suas posições estiver selecionada; a coluna de posições mostra apenas as selecionadas. A secção desaparece quando não existem defects de Alta/Crítica associados aos postos marcados. O título completo conserva tags como `PROD` e locais adicionais, sem usá-los para classificar posições. O dashboard continua independente desse agrupamento e sua falha não impede os relatórios das execuções.

`report.json` passa a ser um objeto com:

- `positions`: lista de posições com `position`, `testPlanPrit` e `reports`; cada execução tem `position`, `testType` e os dados do Jira. A lista está ordenada por tipo e pela ordem configurada dos PRITs.
- `overall`: posições/Test Plans com resultados em `types`, incluindo `testType`, `counts`, `total`, `executions` e `available`, além de status e avisos. Consumidores devem respeitar `available` ao apresentar valores.

Consumidores do antigo array na raiz do JSON precisam passar a ler `positions`. TXT e JSON não refletem edições posteriores feitas no navegador.

## Referência da configuração anterior

Este registro histórico preserva os 42 identificadores que constavam como execuções e os quatro Test Plans antigos, incluindo alterações locais. Não é uma lista de pendências: não precisa ser atualizada ao configurar posições e não é lida pela aplicação. Confirme a natureza e a associação de cada PRIT no Jira antes de usá-lo em `POSITIONS`.

```text
PRIT-8329 PRIT-8328 PRIT-8327 PRIT-8198 PRIT-8197 PRIT-8196
PRIT-8160 PRIT-8159 PRIT-8158 PRIT-7621 PRIT-7620 PRIT-8311
PRIT-8280 PRIT-8164 PRIT-8163 PRIT-8162 PRIT-8319 PRIT-8301
PRIT-8294 PRIT-8292 PRIT-8291 PRIT-8207 PRIT-8206 PRIT-8205
PRIT-8170 PRIT-8169 PRIT-8168 PRIT-8167 PRIT-8166 PRIT-8287
PRIT-8286 PRIT-8265 PRIT-8264 PRIT-8243 PRIT-8237 PRIT-8236
PRIT-8235 PRIT-8234 PRIT-8233 PRIT-8232 PRIT-8325 PRIT-8268
```

| Test Plan antigo | Rótulo histórico |
| ---------------- | ---------------- |
| PRIT-8161        | Smokes           |
| PRIT-8157        | Certification    |
| PRIT-8165        | Regression       |
| PRIT-8171        | Defect Fixing    |

## Validações pendentes

A suíte ainda contém imports de funções/configurações removidas e expectativas do modelo anterior; precisa de adaptação ao agrupamento explícito por posição/tipo. Em `tests/report-layout.test.ts`, o import de `DASHBOARD_PAGE_ID` também precisa passar a apontar para `positions.config.ts`; `operations.config.ts` foi removido.

Os testes exclusivos da inferência de posições por títulos/labels e da descoberta de execuções por vínculos de Test Plans foram removidos. Os dois testes ainda relevantes de extração de status foram preservados, sem alterações, em `tests/execution-status.test.ts`. Os testes dos relatórios, layout e cálculos continuam necessários e devem ser adaptados ao modelo atual.

`tests/position-selection.test.ts` cobre a seleção global nos dois HTMLs: seleção inicial conforme os PRITs associados, secções vazias ocultas, defects partilhados de Alta/Crítica, ordem das tabelas, Concluído sem bolinha, persistência, teclado, ecrã estreito, impressão, cópia e restauração após falha, configuração vazia e armazenamento bloqueado.

Após distribuir os PRITs no novo formato, atualizar e executar:

| Área / arquivos                                                                                                                           | Adaptação e cenários necessários                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validação e agrupamento de posições                                                                                                       | Cobrir o modelo explícito de posições/tipos: normalização de PRIT, duplicidade no mesmo array/entre tipos/entre posições, Test Plan usado como execução, nomes repetidos, tipo inválido, plano ausente e coleta sem execuções atribuídas.                                                                                                                                                                                                                                                                       |
| `tests/overall-results.test.ts`                                                                                                           | Remover cenários de mercado e vínculos. Cobrir agregação por posição/tipo, títulos e labels contraditórios à configuração, arrays vazios, ausência de dados, status adicionais/inválidos, diferenças de total, percentuais e bloqueio de duplicados.                                                                                                                                                                                                                                                            |
| `tests/execution-status.test.ts`                                                                                                          | Contém os testes preservados de fallback e status ausentes. Ampliar a cobertura para dados estruturados inválidos e reprocessamento.                                                                                                                                                                                                                                                                                                                                                                            |
| `tests/release-links.test.ts`                                                                                                             | Usar Test Plans por posição; cobrir plano vazio, normalização, títulos e falhas do Jira, links do dashboard e impossibilidade de ampliar a coleta a partir de um plano.                                                                                                                                                                                                                                                                                                                                         |
| `tests/position-activities.test.ts`, `tests/position-defects.test.ts`                                                                     | Adaptar fixtures com plano/tipo; conferir atividades pelo status e tipo configurado, defects partilhados pelas execuções, relação `created`, preservação de títulos e notas ON HOLD.                                                                                                                                                                                                                                                                                                                            |
| `tests/email-report.test.ts`, `tests/report-layout.test.ts`, `tests/report-editors.test.ts`, interface em `tests/overall-results.test.ts` | Adaptar fixtures, seletores e textos. Cobrir o único seletor de postos em ambos os HTMLs: marcar/desmarcar, selecionar todos/limpar, seleção por teclado, restauração dos postos salvos, notas e instalação preservadas, ausência de seletor de Test Plans e sincronização entre Estado global e Overall. Conferir mudanças de tipo com mesmos PRITs, armazenamento indisponível, cópia e restauração (inclusive falha), seleção vazia, avisos de dados incompletos, impressão, layout estreito e bloqueadores. |
| Saídas e integração                                                                                                                       | Conferir agrupamento e links em HTML/TXT/e-mail, o novo contrato JSON e seus consumidores, falhas/tentativas de coleta, dashboard e autenticação.                                                                                                                                                                                                                                                                                                                                                               |

Depois dessas adaptações, executar `npm test`, `npx tsc --noEmit` e `npm run format:check`; aplicar `npm run format` na etapa de validação. O projeto não possui comando de build ou lint dedicado no `package.json`. A coleta real deve ser conferida com a configuração confirmada, acesso ao Jira e MFA manual.
