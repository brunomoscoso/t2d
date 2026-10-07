# Automação de relatórios do Jira

Esta automação acessa issues PRIT e um dashboard do Jira, coleta informações de execução e gera relatórios agrupados por posição. O acesso é feito em uma janela do Microsoft Edge, com autenticação corporativa e MFA concluídos manualmente.

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

| Arquivo | Conteúdo |
| --- | --- |
| `report.html` | Relatório HTML para visualização no navegador. |
| `report.txt` | Relatório em texto. |
| `report.json` | Dados estruturados dos PRITs agrupados por posição. |
| `email.html` | Versão HTML preparada para uso em e-mail. |
| `dashboard.json` | Dados extraídos do dashboard; gerado quando a coleta do dashboard é bem-sucedida. |

Uma execução nova substitui os arquivos de relatório anteriores. A pasta `output/` também é ignorada pelo Git.

## Configuração da coleta

As configurações funcionais ficam no código-fonte:

- **Issues PRIT:** edite a lista `PRITS` em [`src/config/operations.config.ts`](src/config/operations.config.ts).
- **Dashboard:** altere `DASHBOARD_PAGE_ID` no mesmo arquivo. Use o ID da página do dashboard, não a URL completa.
<<<<<<< HEAD
- **Grupos e nomes reconhecidos:** edite `POSITIONS` e `DEFAULT_POSITION` em [`src/config/positions.config.ts`](src/config/positions.config.ts). Os aliases ajudam a associar os nomes encontrados nos títulos ou labels às posições do relatório.
- **Estrutura e seletores do Jira:** se a interface do Jira mudar, os seletores usados na coleta ficam em [`src/config/selectors.ts`](src/config/selectors.ts).

=======
- **Links dos planos de teste:** preencha `TEST_PLANS` no mesmo arquivo com o PRIT de Smokes, Certificação, Regressão e Defect Fixing (por exemplo, `'8161'` ou `'PRIT-8161'`). Os títulos são extraídos automaticamente do Jira na sessão autenticada. Estes planos são apenas referências e não entram nos totais de execução.
- **Texto do link do dashboard:** o nome é extraído automaticamente usando `DASHBOARD_PAGE_ID`, independentemente da coleta dos defects.
- **Grupos e nomes reconhecidos:** edite `POSITIONS` e `DEFAULT_POSITION` em [`src/config/positions.config.ts`](src/config/positions.config.ts). Os aliases ajudam a associar os nomes encontrados nos títulos ou labels às posições do relatório.
- **Estrutura e seletores do Jira:** se a interface do Jira mudar, os seletores usados na coleta ficam em [`src/config/selectors.ts`](src/config/selectors.ts).

Por exemplo, para configurar o link de Smokes:

```typescript
smokes: { prit: 'PRIT-8161' },
```

A caixa **Links da release** aparece no `email.html`, logo após **Principais bloqueadores**, e acompanha a cópia para o e-mail. As URLs usam `JIRA_URL`: `/browse/<PRIT>` para os planos e `/secure/Dashboard.jspa?selectPageId=<ID>` para o dashboard. Planos com `prit` vazio aparecem como **Não informado**. O link do dashboard continua disponível mesmo se a coleta dos seus dados falhar.

Os títulos vêm dos endpoints de consulta de [issues e dashboards da API REST do Jira](https://docs.atlassian.com/software/jira/docs/api/REST/9.12.2/), usando a sessão já autenticada do navegador. Se uma consulta falhar, a automação registra um aviso e mantém o link com o PRIT ou ID, sem impedir a geração do relatório.

>>>>>>> a397f40 (Add titulo relatorio)
## Testes

Para executar os testes existentes:

```powershell
npm test
```

## Solução de problemas

- **Variáveis do Jira não configuradas:** confirme que existe um `.env` na raiz e que `JIRA_URL` e `JIRA_LOGIN_EMAIL` estão preenchidos.
- **Edge não inicia:** instale o Microsoft Edge e tente executar novamente.
- **A página não abre ou a coleta falha:** verifique a conexão à rede corporativa, o acesso ao Jira e as permissões para as issues e o dashboard configurados.
- **Um PRIT apresenta erro durante a execução:** confira o terminal para identificar a issue. A automação registra a falha e continua processando as demais; portanto, os relatórios podem ser gerados mesmo que uma issue não tenha sido coletada.
- **O dashboard falha:** a coleta dos PRITs continua independente. Nesse caso, os relatórios principais ainda são gerados, mas `dashboard.json` não é criado e o dashboard não é incluído nos HTMLs.
