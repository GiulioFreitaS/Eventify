# Eventify · Desktop

Aplicação local de descoberta, inscrição e organização de eventos. A direção visual parte das telas aprovadas da Eventify. A interface é construída com HTML e CSS, com fotografias extraídas das referências e a logo fornecida.

## Executar

Requisitos: Node.js 24 ou superior e um navegador de desktop atualizado.

Abra o terminal na pasta do projeto e execute:

```powershell
node server.mjs
```

Acesse [http://127.0.0.1:4173](http://127.0.0.1:4173). Mantenha o terminal aberto enquanto navega. O projeto vem com os recursos necessários para rodar offline.

Se a porta estiver ocupada, use outra no PowerShell:

```powershell
$env:EVENTIFY_PORT = '4180'
node server.mjs
```

Abra o endereço mostrado no terminal. Os dados são específicos do navegador, do perfil do navegador e da porta escolhida.

## Fluxos

1. Em **Explorar**, combine busca, categoria, data e bairro. Abra **Som no pátio** para testar inscrição gratuita ou **Oficina de cerâmica** para testar o checkout pago. Confira os ingressos emitidos e baixe um PNG da carteira.
2. Em **Para organizar**, crie um evento, preencha as etapas e publique. Abra a página pública do evento, faça uma inscrição fictícia e copie o código do ingresso. Volte à área do organizador, abra **Check-in**, selecione o evento e confirme o código. A segunda tentativa informa que a entrada já foi registrada.
3. Em **Participantes**, pesquise por nome, e-mail ou código, filtre pelo status da presença e exporte a lista em CSV.
4. Em **Perfil**, edite seus dados e preferências. O projeto inicia na conta de demonstração. Para testar cadastro e entrada, use **Sair da conta** e crie um perfil local com dados fictícios.

Os eventos de exemplo conservam as datas das referências de novembro e dezembro de 2026. Depois dessas datas, os ingressos passam para **Anteriores** e as inscrições dos eventos encerram. Para repetir o fluxo com outra data, crie um evento futuro no organizador.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/model.ts` | Tipos, dados iniciais e funções de domínio |
| `src/repository.ts` | Persistência, inscrição, eventos, perfis e check-in |
| `src/explore.ts`, `src/participant.ts`, `src/organizer.ts` | Telas de descoberta, participante e organizador |
| `src/ui.ts`, `styles.css` | Componentes visuais compartilhados e layout |
| `src/main.ts` | Rotas e eventos da interface |
| `src/ticket-image.ts` | Exportação do ingresso como PNG |
| `assets/` | Logo e fotografias extraídas das referências |
| `server.mjs` | HTTP local e entrega dos módulos TypeScript ao navegador |

O projeto usa módulos nativos e a remoção de anotações TypeScript do Node para executar sem instalar dependências. O arquivo `tsconfig.json` fornece as opções estritas de tipos para editores e ferramentas compatíveis.

## Dados locais e integrações futuras

- Eventos, perfis, favoritos, inscrições e check-ins são gravados no IndexedDB do navegador. A confirmação de vagas e o check-in usam transações para manter os dados consistentes entre abas. Os filtros de Explorar ficam na URL e o último contexto de busca é lembrado durante a sessão.
- A entrada seleciona um perfil demonstrativo por e-mail, sem solicitar senha. O checkout de cartão ou Pix confirma uma inscrição simulada, sem cobrar ou coletar dados de pagamento.
- A próxima integração pode substituir o repositório local por uma API com banco compartilhado, autenticação, autorização do organizador, gateway de pagamento e envio de notificações.
- A execução fica vinculada à interface local. O código está preparado para o teste escolar no desktop.
