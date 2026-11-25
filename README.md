# Automação de relatórios do Jira

Para incluir defects de vários dashboards, configure a lista em
`src/config/positions.config.ts`:

```ts
export const DASHBOARD_PAGE_IDS: string[] = ['24360', 'ID_DO_SEGUNDO_DASHBOARD'];
```

Substitua o segundo valor pelo ID real. Cada dashboard aparece num bloco próprio
no HTML e no email, com título, total e link. Defects presentes em dois dashboards
aparecem nos dois blocos. IDs repetidos e vazios são ignorados. Se uma coleta
falhar, o erro aparece no terminal e os restantes dashboards continuam.
Na execução normal, `output/dashboard.json` contém uma lista de dashboards.

Cada execution PRIT também fornece o campo **Fix Version/s**: a recolha confirma o texto de
`label[for="fixVersions"]` e lê os links de `#fixfor-val a`. As versões preenchem
“Versão instalada” de cada posto e atualizam a versão no texto inicial do e-mail.
As versões de todas as executions do respetivo posto são incluídas, incluindo as
execuções de Portugal e Espanha da posição Automação.
Versões repetidas são removidas; versões diferentes aparecem juntas. Um campo sem
versões deixa a caixa vazia; se nenhum plano fornecer uma versão, o texto inicial
mostra “versão não informada”. A versão recolhida tem prioridade sobre valores
antigos guardados no navegador. O estado OK/NOK continua a ser definido manualmente.
As labels genéricas das executions não são recolhidas. Quando a automação termina,
o ficheiro `output/email.html` abre automaticamente no navegador padrão.

Esta automação recolhe dados de execuções PRIT e de um dashboard do Jira e gera relatórios por posto e tipo de teste. Os relatórios podem ser consultados no navegador, copiados para e-mail ou usados como ficheiros JSON e texto.

## Tecnologias

- **Node.js e TypeScript** para executar a aplicação.
- **Playwright** para automatizar o Microsoft Edge e recolher os dados do Jira.
- **dotenv** para ler as configurações locais do Jira a partir do ficheiro `.env`.
- **npm** para instalar dependências e executar os comandos do projeto.

## Requisitos

- Node.js 20 ou superior e npm.
- Microsoft Edge instalado.
- Acesso à rede, às issues e ao dashboard do Jira configurados.
- Acesso à autenticação corporativa e ao MFA, quando exigidos pela organização.

### Instalar o Node.js via NVM (Windows)

Em ambientes corporativos onde a instalação direta do Node.js está bloqueada ou restrita, o NVM for Windows pode ser uma alternativa para instalar e gerir versões do Node.js, conforme as permissões disponíveis.

1. Descarregue e instale o [NVM for Windows v2.0.1](https://github.com/nvm-windows/nvm/releases/tag/v2.0.1).
2. Abra o PowerShell ou o CMD.
3. Instale e ative o Node.js 22 e confirme as versões:

   ```powershell
   nvm install 22
   nvm use 22
   node -v
   npm -v
   ```

O NVM permite alternar entre diferentes versões do Node.js. A instalação e a alteração de versões podem exigir permissões de administrador, especialmente em computadores corporativos.

## Instalação

1. Clone o repositório e entre na pasta do projeto:

   ```powershell
   git clone https://github.com/brunomoscoso/t2d.git
   cd t2d
   ```

2. Instale as dependências:

   ```powershell
   npm install
   ```

3. Crie o ficheiro local de configuração:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Abra o ficheiro `.env` e preencha a URL base do Jira e o seu e-mail corporativo:

   ```dotenv
   JIRA_URL=https://jira.sua-empresa.com
   JIRA_LOGIN_EMAIL=seu.email@sua-empresa.com
   ```

   Use a URL base, sem `/browse` no final. O `.env` contém dados locais e não deve ser partilhado nem enviado para o repositório.

5. Abra `src/config/positions.config.ts` e configure o ID do dashboard, os postos e o PRIT do Test Plan de cada posto. As execuções são descobertas na tabela do Test Plan; o título de cada uma deve conter `Smoke`, `Regression`, `Certification` ou `Defect Fixing` para ser classificado automaticamente.

## Executar a automação

No Windows, depois de concluir a instalação e configuração, dê duplo clique em
`executar.bat`. Também pode iniciá-lo pelo PowerShell com `./executar.bat`.
O ficheiro usa a pasta do projeto mesmo quando aberto a partir de outra pasta e
mantém a janela aberta no final para consultar o resultado ou eventuais erros.
O Node.js, o npm e o Microsoft Edge continuam a ser necessários; o `.bat` não
instala dependências nem configura o `.env` automaticamente.

Como alternativa, na pasta do projeto, execute:

```powershell
npm run report
```

O Microsoft Edge abre no primeiro Test Plan configurado (ou numa execução, se não houver Test Plan padrão). Conclua a autenticação e o MFA na janela do navegador. A automação aguarda até 10 minutos pelo regresso à issue do Jira e até 90 segundos pelo título visível, descobre e classifica as execuções dos Test Plans e só então inicia a recolha, sem precisar de pressionar **Enter** no terminal.

No fim, os ficheiros são gravados em `output/`:

- `report.html`: relatório interativo para consultar no navegador.
- `email.html`: versão do relatório preparada para e-mail.
- `report.txt`: versão em texto.
- `report.json`: dados estruturados do relatório.
- `dashboard.json`: dados do dashboard, se a recolha for bem-sucedida.

Uma nova execução substitui os relatórios anteriores. A pasta `output/` não é incluída no repositório.

### Atualizar apenas uma posição

Para atualizar qualquer posição configurada e gerar novamente o relatório completo:

```powershell
npm run report -- --position "COCO PT"
npm run report -- --position "Tangerina"
npm run report -- --position "Automação"
```

Cada comando atualiza apenas a posição indicada. Para consultar todos os nomes disponíveis:

```powershell
npm run report -- --list-positions
```

Por exemplo, se já gerou o relatório completo e apenas Tangerina tem novos estados no
Jira, execute `npm run report -- --position "Tangerina"`. Os detalhes de Tangerina e os
seus resultados no **Overall** passam a refletir a nova extração. As restantes posições
continuam no relatório com os dados guardados. Pode repetir este processo para qualquer
outra posição que tenha um Test Plan ou execuções configuradas.

Também pode usar `./executar.bat --position "COCO PT"`. Use aspas nos nomes com espaços.
O comando sem argumentos continua a executar a recolha completa.

É necessário manter `output/report.json` de uma execução anterior. A automação volta a
descobrir as execuções e recolhe os dados apenas da posição escolhida, substitui os seus
dados e recalcula o **Overall**. As outras posições e os dashboards mantêm os dados da
extração anterior, sem novos acessos ao Jira. HTML, email, texto e JSON são regenerados.
Para atualizar também os dashboards, execute a recolha completa.

Relatórios antigos também são aceites: nesse caso, os dashboards são lidos de
`output/dashboard.json`. Nos novos relatórios, os dashboards e os links ficam guardados
no próprio `report.json`. Se faltar o relatório, estiver inválido ou a configuração de
outras posições tiver mudado, o comando pede uma recolha completa antes de continuar.
Uma falha na extração gera um relatório parcial com avisos por posição, PRIT e campo.
Na posição atualizada, dados em falta não são substituídos silenciosamente pelos antigos.

As edições das tabelas **Estado global** e **Principais Bloqueadores** são guardadas automaticamente no armazenamento local do navegador. Elas continuam disponíveis quando executar `npm run report` novamente, mesmo que os PRITs recolhidos mudem. No final de `email.html`, use **Limpar dados de Estado global e Principais Bloqueadores** para apagar essas edições no navegador atual, por exemplo, no início de uma nova release. Os dados ficam associados ao navegador/perfil e ao caminho do relatório; não são gravados nos ficheiros de saída nem partilhados com outros navegadores ou computadores.

## Comandos úteis

### Recolha com duas páginas

As executions são recolhidas em até duas páginas em paralelo, na mesma sessão
autenticada. A ordem dos resultados é preservada. Após as tentativas de recolha,
o relatório é gerado mesmo com falhas, com os dados disponíveis e avisos explícitos.
O terminal mostra o tempo total desta etapa.

Os campos dos Issue Links são lidos numa única chamada ao navegador. A recolha
confere os campos da página com a API autenticada do Jira e os testes paginados
da API Xray Server/Data Center. A estabilidade durante 500 ms já não é usada
como prova de completude. Também confirma a lista de execuções do Test Plan.
APIs indisponíveis, diferenças, campos ausentes e alterações durante a recolha
ficam identificados como dados não extraídos ou não confirmados.

HTML, e-mail e TXT incluem a secção **Relatório parcial**, com o posto, PRIT,
campo e motivo. O JSON guarda `extractionWarnings` e a data de recolha de cada
execution. Falhas de descoberta e de dashboards também são indicadas. Totais e
estados não confirmados deixam o respetivo Overall indisponível: nunca são
convertidos em zero ou em ausência de defeitos. Dados lidos mas não confirmados
podem continuar visíveis nos detalhes, acompanhados dos avisos.

| Comando                                          | Descrição                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `npm run report`                                 | Executa a recolha e gera os relatórios.                                                                    |
| `npm run report -- --position "Nome da posição"` | Atualiza uma posição e recalcula o Overall, gerando o relatório completo com os restantes dados guardados. |
| `npm run report -- --list-positions`             | Lista os nomes das posições disponíveis, sem aceder ao Jira.                                               |
| `npm test`                                       | Executa os testes automatizados, sem aceder ao Jira real.                                                  |
| `npm run format:check`                           | Verifica a formatação do código e da documentação.                                                         |

## Problemas comuns

- **Erro de configuração:** confirme se `JIRA_URL` e `JIRA_LOGIN_EMAIL` estão preenchidos no `.env`.
- **Nenhuma execução encontrada:** confirme que o Test Plan está configurado e que a tabela de execuções está visível. Os títulos das execuções precisam incluir um dos tipos aceitos.
- **Edge ou Jira não abre:** confirme que o Microsoft Edge está instalado, que tem acesso à rede corporativa e que a URL do Jira está correta.
- **Dashboard indisponível:** os relatórios das execuções ainda podem ser gerados; o ficheiro `dashboard.json` só é criado quando a recolha do dashboard tem sucesso.
