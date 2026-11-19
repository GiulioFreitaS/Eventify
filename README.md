# Eventify · Web e celular

Aplicação local de descoberta, inscrição e organização de eventos. A interface é construída com HTML e CSS, a arte original da abertura e fotografias reais de alta resolução nas capas dos eventos e nas outras telas.

## Executar

Requisitos: Node.js 24 ou superior e um navegador atualizado.

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

## Abrir no celular

Com o PC e o celular no mesmo Wi-Fi, abra o terminal na pasta do projeto e rode:

```powershell
node server.mjs --lan
```

Abra no navegador do celular o endereço identificado como **Celular na mesma rede**. O menu inferior leva a **Explorar**, **Ingressos**, **Salvos** e **Perfil**. Use **Organizar** no cabeçalho para entrar no modo organizador. Na carteira, deslize os ingressos do mesmo evento para folhear e toque em **Abrir ingresso** para ver o código.

O acesso pelo IP da rede é uma prévia por HTTP. Para instalar na tela inicial e usar offline, abra a versão web por HTTPS ou em localhost. O acesso offline fica disponível após o primeiro carregamento completo. Ingressos, favoritos e eventos criados ficam no navegador usado em cada dispositivo.

## Fluxos

1. Em **Explorar**, combine busca, categoria, data e bairro. Abra **Som no pátio** para testar inscrição gratuita ou **Oficina de cerâmica** para testar o checkout pago. Em **Minha agenda**, arraste para o lado, use os controles da pilha ou pressione as setas do teclado para folhear ingressos do mesmo evento. A prévia e o PNG acompanham o ingresso selecionado.
2. Em **Para organizar**, crie um evento, preencha as etapas e publique. Abra a página pública do evento, faça uma inscrição fictícia e copie o código do ingresso. Volte à área do organizador, abra **Check-in**, selecione o evento e confirme o código. A segunda tentativa informa que a entrada já foi registrada.
3. Em **Participantes**, pesquise por nome, e-mail ou código, filtre pelo status da presença e exporte a lista em CSV.
4. Em **Perfil**, edite seus dados e preferências. O projeto inicia na conta de demonstração. Para testar cadastro e entrada, use **Sair da conta** e crie um perfil local com dados fictícios.

Os eventos de exemplo conservam as datas das referências de novembro e dezembro de 2026. Depois dessas datas, os ingressos passam para **Anteriores** e as inscrições dos eventos encerram. Para repetir o fluxo com outra data, crie um evento futuro no organizador.

No desktop, role a página para baixo e volte um pouco para cima para acessar o menu flutuante. Ao voltar ao topo, o cabeçalho ocupa a largura da página.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/model.ts` | Tipos, dados iniciais e funções de domínio |
| `src/repository.ts` | Persistência, inscrição, eventos, perfis e check-in |
| `src/explore.ts`, `src/participant.ts`, `src/organizer.ts` | Telas de descoberta, participante e organizador |
| `src/ui.ts`, `styles.css`, `mobile.css` | Componentes visuais e layouts de desktop e celular |
| `src/main.ts` | Rotas e eventos da interface |
| `src/motion.ts` | Transições de navegação, entrada de elementos e feedback visual |
| `src/navigation.ts`, `src/ticket-deck.ts` | Barra flutuante e controles da pilha de ingressos |
| `src/ticket-image.ts` | Exportação do ingresso como PNG |
| `assets/` | Logo, arte da abertura e fotografias ilustrativas dos eventos |
| `manifest.webmanifest`, `sw.js` | Instalação como app web e acesso offline |
| `server.mjs` | HTTP local e entrega dos módulos TypeScript ao navegador |

O projeto usa módulos nativos e a remoção de anotações TypeScript do Node para executar sem instalar dependências. O arquivo `tsconfig.json` fornece as opções estritas de tipos para editores e ferramentas compatíveis.

A interface usa as APIs de animação do navegador. Quando a transição entre telas não está disponível, a navegação usa uma entrada simples. A interface respeita a preferência de movimento reduzido do sistema.

## Créditos das imagens

A logo e a arte da abertura desktop vêm do material fornecido para a Eventify. As fotos abaixo são ilustrativas e fazem parte do projeto sob a [licença Pexels](https://www.pexels.com/license/).

| Uso | Fotografia |
| --- | --- |
| Som no pátio | [Diana GP](https://www.pexels.com/photo/woman-singing-and-playing-on-guitar-on-a-street-15603500/) |
| Oficina de cerâmica | [Letícia Alvares](https://www.pexels.com/photo/hands-shaping-clay-on-pottery-wheel-in-studio-36717713/) |
| Cinema no terraço | [Son Tung Tran](https://www.pexels.com/photo/people-sitting-on-chairs-in-an-outdoor-cinema-6521573/) |
| Feira de arte independente | [AS Photography](https://www.pexels.com/photo/people-looking-at-assorted-type-paintings-1028636/) |
| Jazz no jardim | [Gustavo Anacleto](https://www.pexels.com/photo/photo-of-man-playing-saxophone-3364190/) |
| Tela de entrada | [Cristhian David Duarte](https://www.pexels.com/photo/woman-playing-the-guitar-and-singing-19138692/) |
| Capa do perfil | [Huỳnh Như Mavi](https://www.pexels.com/photo/cozy-outdoor-terrace-with-string-lights-and-greenery-37564033/) |
| Chamada para organizar | [A. S.](https://www.pexels.com/photo/close-up-shot-of-microphone-12092846/) |

## Dados locais e integrações futuras

- Eventos, perfis, favoritos, inscrições e check-ins são gravados no IndexedDB do navegador. A confirmação de vagas e o check-in usam transações para manter os dados consistentes entre abas. Os filtros de Explorar ficam na URL e o último contexto de busca é lembrado durante a sessão.
- A entrada seleciona um perfil demonstrativo por e-mail, sem solicitar senha. O checkout de cartão ou Pix confirma uma inscrição simulada, sem cobrar ou coletar dados de pagamento.
- A próxima integração pode substituir o repositório local por uma API com banco compartilhado, autenticação, autorização do organizador, gateway de pagamento e envio de notificações.
- A execução fica vinculada à interface local. O código está preparado para o teste escolar no desktop.
