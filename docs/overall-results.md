# Overall Test Results

Execute `npm run report` e abra `output/email.html`. Na seção **Overall Test Results**, marque os Test Plans que devem acompanhar o relatório. **Selecionar todos os planos** e **Limpar seleção de planos** atuam apenas nesta seção. Inicialmente, nenhum plano está selecionado.

A seleção é guardada no `localStorage`, por caminho do arquivo, conjunto de PRITs e configuração dos planos. Reabrir o mesmo relatório no mesmo navegador restaura as escolhas. Alterar os PRITs dos planos ou das execuções inicia uma seleção independente. A edição e a cópia continuam disponíveis quando o armazenamento está bloqueado.

O botão **Copiar relatório para o e-mail** inclui somente as tabelas selecionadas, sem o seletor, orientações do editor ou tabelas ocultas. Uma seleção vazia omite toda a seção. O editor é restaurado depois da cópia, inclusive se ela falhar. `report.html` também permite selecionar os planos para visualização e impressão; a impressão omite o seletor. As escolhas de cada arquivo são independentes, como os demais controles do projeto. Os arquivos TXT e JSON continuam sendo os dados detalhados da coleta, sem refletir edições feitas posteriormente no navegador.

## Origem e cálculo

- Os planos vêm de `TEST_PLANS` em `src/config/operations.config.ts`. O nome usa o título obtido do Jira, com o nome da categoria como alternativa, e o PRIT acompanha cada tabela.
- Os vínculos são consultados pela sessão autenticada, usando `GET /rest/api/2/search` e a função [`testPlanTestExecutions`](https://getxraydocs.atlassian.net/wiki/spaces/XRAY770/pages/48955996/Enhanced%2Bquerying%2Bwith%2BJQL) do Xray. A consulta é paginada. Não é feita associação por nomes de planos ou palavras no título.
- O agregado usa **somente execuções da lista `PRITS` que foram coletadas com sucesso**. A consulta dos vínculos não amplia a coleta nem altera o agrupamento por posição.
- PT/SP são identificados exclusivamente no título da execução, sem diferenciar maiúsculas e minúsculas. Espaço, hífen, underscore, colchetes e outras pontuações delimitam as siglas; letras e números não. `SCRIPT`, `PASSPORT`, `PT1` e `SPARE` não identificam mercado. Títulos sem sigla ou com ambas as siglas são excluídos com aviso.
- Cada execução conta uma vez por plano, mesmo que apareça repetida nos dados detalhados. Uma execução vinculada a dois planos contribui uma vez para cada um.
- As quantidades dos status são somadas por plano e mercado. O percentual é `quantidade / soma dos status daquele mercado × 100`, arredondado para uma casa decimal quando necessário. O Total é 100% quando positivo e 0% quando zerado. Não há média de percentuais de execuções.
- Os oito status padrão são apresentados, além de todos os status adicionais encontrados. Espaços e hífens nos nomes são normalizados para underscore; `TO DO` e `TODO` são somados juntos.
- Mercados sem execuções têm zeros e a indicação **Sem execuções**. Falhas na consulta dos vínculos mostram **—** e um aviso de indisponibilidade, para distinguir dados indisponíveis de resultados zerados. Consultas incompletas não publicam agregados parciais.
- Avisos também sinalizam quantidades inválidas e diferenças entre `totalTests` e a soma dos status coletados. Os avisos são registrados no terminal; os de um plano selecionado acompanham a tabela na cópia.

## Validação

`npm test` cobre agregação, classificação, paginação e falhas do Jira simulado, seleção pelo teclado, persistência, armazenamento indisponível, mercados vazios, status adicionais, layouts estreitos, impressão, cópia e restauração dos controles. `npx tsc --noEmit` verifica os tipos. Os testes não acessam o Jira real; a função JQL depende da disponibilidade e das permissões do Xray instalado.
