# T2D na web com GitHub Pages e Actions

## Instalação atual: interface pública e automação privada

- `brunomoscoso/t2d` publica a interface em https://brunomoscoso.github.io/t2d/ com `pages.yml`.
- `brunomoscoso/t2d-automation` executa o workflow `t2d.yml` na branch `main` e guarda os relatórios. Este repositório deve permanecer privado.
- Os secrets `JIRA_URL` e `JIRA_LOGIN_EMAIL` devem ser criados em **Settings → Secrets and variables → Actions** do **t2d-automation**. Os secrets do repositório público não são transferidos.
- A interface usa `brunomoscoso/t2d-automation` por omissão e migra o destino antigo guardado no navegador, preservando todas as PRITs.
- Não se publica Pages a partir do repositório privado. Alterações futuras na extração ou no workflow de execução devem ser enviadas para `t2d-automation`; alterações da interface são publicadas por `t2d`.

Após criar os secrets, abra a interface, copie a configuração e inicie **Run workflow** em https://github.com/brunomoscoso/t2d-automation/actions/workflows/t2d.yml. O teste real de MFA ainda é necessário.

As instruções de instalação abaixo descrevem também o modo alternativo de um único repositório privado com um plano que suporte Pages. Na instalação atual, Pages é configurado apenas no repositório público e os secrets apenas no privado.

Esta versão usa apenas GitHub. A página configura PRITs e prepara o JSON; o utilizador confirma a execução na interface autenticada do Actions. GitHub Pages não executa código de servidor e não pode guardar um segredo para disparar workflows. Por isso, não há token, e-mail corporativo, sessão Jira ou palavra-passe no frontend.

## O que fica disponível

- Editor responsivo de posições, Test Plans, quatro tipos de teste e planos por país.
- Várias PRITs por tipo, normalização de `123` para `PRIT-123`, validação de duplicados e reordenação.
- Gravação automática em `localStorage`, importação e exportação de JSON.
- Configuração recebida pelo workflow substitui `positions.config.ts` durante essa execução, incluindo os links e os agregados dos relatórios.
- Chromium headless no Actions; Edge visível na execução local, por omissão.
- Autenticação sem Enter, progresso no log/resumo e relatórios HTML originais em artefactos.

As PRITs adicionadas só saem da lista ao clicar em **Excluir**, remover a respetiva posição ou confirmar a substituição por uma importação. Executar não limpa a configuração. Limpar os dados do navegador, usar navegação privada ou mudar de dispositivo pode eliminar/separar o armazenamento: conserve uma exportação. Não há sincronização entre computadores ou utilizadores.

## Publicação inicial pelo administrador

1. Envie as alterações desta branch para o GitHub e integre os workflows na branch principal (`main`). O GitHub só apresenta o disparo manual de um workflow que exista na branch padrão.
2. Use um **repositório privado** para a automação corporativa. Os logs e artefactos seguem as permissões do repositório; um repositório público exporia os resultados a pessoas com acesso de leitura. O workflow recusa executar em repositório público.
3. Em **Settings → Secrets and variables → Actions → Secrets**, crie:

   | Secret             | Valor                                             |
   | ------------------ | ------------------------------------------------- |
   | `JIRA_URL`         | URL base HTTPS do Jira corporativo, sem `/browse` |
   | `JIRA_LOGIN_EMAIL` | E-mail corporativo autorizado para esta automação |

   Estes valores são usados apenas pelo processo de automação. A conta Jira é a configurada no secret, independentemente de quem inicia o workflow. Para várias contas, será necessário acrescentar uma associação de utilizadores a contas autorizadas.

4. Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**.
5. Execute **T2D · Publicar interface**. O workflow publica apenas `web/`, nunca `.env`, `src/config`, `output` ou relatórios. A URL verificada aparece no ambiente `github-pages` após o deploy. Para este repositório, sem domínio personalizado, o endereço esperado é `https://brunomoscoso.github.io/t2d/`.
6. Abra a página, confirme o repositório de destino e importe `output/positions.json`, criado com `npm run config:export`. O exportador lê a configuração local atual; não a publica nem a altera.

Pages em repositório privado exige um plano GitHub que suporte essa funcionalidade. O site pode ser público mesmo quando o repositório é privado, dependendo do plano/configuração: a página não inclui dados corporativos de origem. Se o plano não disponibilizar Pages no repositório privado, pode publicar **apenas a pasta `web/`** num repositório público separado e manter o destino da execução no repositório T2D privado. Não torne o repositório corporativo público para habilitar Pages.

Os utilizadores precisam de permissão de escrita no repositório para iniciar o workflow e de leitura para consultar os resultados. Nenhuma autenticação corporativa é contornada; o início no GitHub e o login no Jira são autenticações distintas.

## Utilização diária

1. Adicione posições ou importe um JSON. Preencha o ID do dashboard.
2. Introduza PRITs separadas por espaço, vírgula ou ponto e vírgula e clique em **+**. Use as setas para ordenar posições e PRITs dentro de cada tipo. A ordem dos tipos permanece Smoke, Regressão, Certificação e Defect Fixing. Planos por país são recolhidos no fim, como na lógica atual.
3. Clique em **Preparar execução**, **Copiar configuração** e **Abrir GitHub Actions**.
4. No workflow **T2D · Gerar relatório**, clique em **Run workflow**, escolha a branch publicada, cole o JSON em `configuration` e confirme.
5. Abra a execução e a etapa **Executar T2D · acompanhar MFA e progresso aqui**. Confirme o MFA no telemóvel. Se o Authenticator apresentar correspondência numérica reconhecida, o número aparece no log desta execução. Aprove apenas o acesso que acabou de iniciar.
6. A extração começa quando o Playwright deteta a origem do Jira e os elementos `#summary-val` e `#status-val` visíveis. Não há leitura de stdin.
7. Depois de a execução terminar com sucesso, descarregue o artefacto **t2d-relatorios-N-tentativa**, extraia o ZIP e abra `report.html` ou `email.html` no navegador. Os HTML continuam a usar os editores existentes. Os ficheiros JSON/texto também são incluídos.

O botão de preparação **não** envia uma execução automaticamente. O GitHub pede a confirmação final e aplica as permissões. Não há estado fictício de execução na página: o link **Histórico no GitHub** abre a lista real, com logs, resultado e artefactos. Nesta versão, abrir um relatório requer descarregar e extrair o artefacto; não é publicado um link HTML público.

## Progresso e histórico

O processo emite as etapas `initializing`, `authentication`, `extraction` (com contagem de PRITs), `report`, `complete` e `failed`. O log do Actions atualiza durante a execução; o resumo fica disponível ao finalizar a etapa. `output/status.json` guarda o último estado e `output/progress.jsonl` regista as etapas. O artefacto de progresso é publicado também após falhas, quando esses ficheiros existem.

Cada execução tem artefactos próprios, com retenção configurada de **30 dias**, sujeita aos limites do repositório. Faça download se precisar de guardar o relatório por mais tempo. Edições feitas no HTML são locais ao navegador/caminho, como antes; não alteram o artefacto guardado no GitHub. Abrir relatórios em caminhos diferentes pode separar as edições guardadas.

A execução tem limite total de 45 minutos, com cinco minutos para autenticação. O grupo de concorrência permite uma execução ativa por repositório para evitar pedidos MFA simultâneos. O GitHub conserva apenas uma execução pendente nesse grupo; uma nova substitui a anterior pendente, sem cancelar a ativa.

## Compatibilidade MFA: validação obrigatória no ambiente corporativo

O código foi preparado para aguardar a autenticação. Isso não garante que a política corporativa permita um browser novo num runner hospedado pelo GitHub. O login existente apenas preenche o e-mail e continua; não fornece uma palavra-passe nem seleciona métodos alternativos de autenticação.

Na primeira execução de validação:

- Confirme que o runner alcança o Jira e o provedor de identidade. Um Jira interno/VPN normalmente não é acessível diretamente por um runner público.
- Confirme que o login, após o e-mail, envia efetivamente a aprovação para o telemóvel sem pedir interação adicional no browser remoto.
- Se for pedida palavra-passe num campo HTML padrão, o modo headless termina com uma mensagem explicativa. Se houver CAPTCHA, passkey, seleção de método, aprovação adicional no navegador ou bloqueio por dispositivo/IP, a espera pode atingir o tempo limite. Esses fluxos não são automatizados nesta versão.
- A correspondência numérica só é detetada nos elementos específicos `#idRichContext_DisplaySign` e `#idRemoteNGC_DisplaySign`. Se o provedor usar outro fluxo, será necessário adaptar e validar os seletores; não se captura nem transmite a página de login.
- Confirme que, depois da aprovação, o browser regressa à issue e os dois elementos esperados ficam visíveis. Se a instância Jira tiver outro layout, adapte os seletores e os testes.

Se a política bloquear o runner público, valide uma solução com a equipa de identidade/rede. Um runner corporativo aprovado pode ser configurado pela variável de repositório `T2D_RUNNER_LABEL` (label exclusiva da máquina), mantendo a orquestração no GitHub Actions. Esse runner precisa do agente Actions atualizado para ações Node 24, das dependências de sistema do Playwright e de Chromium previamente instalado, ou de Edge com `T2D_BROWSER_CHANNEL=msedge`. O workflow instala Node.js 22 para o projeto. Use um runner dedicado e descarte o workspace entre execuções. A aprovação da política e o acesso à rede continuam necessários; um runner próprio não garante MFA compatível.

Não se guardam cookies, storageState, perfis autenticados, screenshots do login ou palavras-passe nos artefactos. O número transitório de correspondência do Authenticator pode constar no log do workflow privado.

## Desenvolvimento e verificações

```powershell
npm run web:preview
npm run config:export
npx tsc --noEmit
node --import tsx --test tests/run-config.test.ts tests/jira-auth.test.ts tests/web-interface.test.ts
```

O preview serve `http://127.0.0.1:4173`. O frontend é HTML/CSS/JavaScript estático, sem instalação adicional. Os testes de autenticação usam páginas simuladas: não contactam o Jira nem comprovam o MFA corporativo. Os testes de interface verificam persistência, ordem, exclusão, importação, preparação da configuração e largura móvel.

Referências: [GitHub Pages é hospedagem estática](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [disparo manual de workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), [acesso a artefactos](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts), [Playwright em CI](https://playwright.dev/docs/ci), [correspondência numérica do Authenticator](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-number-match).
