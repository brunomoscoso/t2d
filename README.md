# Automação de relatórios do Jira

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

As edições das tabelas **Estado global** e **Principais Bloqueadores** são guardadas automaticamente no armazenamento local do navegador. Elas continuam disponíveis quando executar `npm run report` novamente, mesmo que os PRITs recolhidos mudem. No final de `email.html`, use **Limpar dados de Estado global e Principais Bloqueadores** para apagar essas edições no navegador atual, por exemplo, no início de uma nova release. Os dados ficam associados ao navegador/perfil e ao caminho do relatório; não são gravados nos ficheiros de saída nem partilhados com outros navegadores ou computadores.

## Comandos úteis

| Comando                | Descrição                                                 |
| ---------------------- | --------------------------------------------------------- |
| `npm run report`       | Executa a recolha e gera os relatórios.                   |
| `npm test`             | Executa os testes automatizados, sem aceder ao Jira real. |
| `npm run format:check` | Verifica a formatação do código e da documentação.        |

## Problemas comuns

- **Erro de configuração:** confirme se `JIRA_URL` e `JIRA_LOGIN_EMAIL` estão preenchidos no `.env`.
- **Nenhuma execução encontrada:** confirme que o Test Plan está configurado e que a tabela de execuções está visível. Os títulos das execuções precisam incluir um dos tipos aceitos.
- **Edge ou Jira não abre:** confirme que o Microsoft Edge está instalado, que tem acesso à rede corporativa e que a URL do Jira está correta.
- **Dashboard indisponível:** os relatórios das execuções ainda podem ser gerados; o ficheiro `dashboard.json` só é criado quando a recolha do dashboard tem sucesso.
