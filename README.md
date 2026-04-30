# Neon Grid Strider

Um jogo multiplayer em tempo real **exclusivamente para dispositivos móveis**, desenvolvido com **Node.js + Express + Socket.IO + SQLite**.

## 🎮 Características

*   **Joystick Virtual**: Controle analógico responsivo em 360 graus
*   **Trilhas Neon**: Rastros de luz que seguem cada jogador
*   **Chat Global**: Comunique-se com outros jogadores em tempo real
*   **Multiplayer em Tempo Real**: Até 100+ jogadores simultâneos
*   **Persistência de Dados**: Posições salvas no SQLite

## 📱 Requisitos

*   Dispositivo móvel (smartphone ou tablet)
*   Navegador moderno com suporte a WebSocket
*   Node.js 18+ (para executar o servidor)

## 🚀 Instalação

```bash
pnpm install
```

## ▶️ Executar em Desenvolvimento

```bash
pnpm dev
```

Acesse no seu dispositivo móvel: `http://seu-ip-local:3000`

## 📁 Estrutura do Projeto

```
├── server.js                    # Servidor Express + Socket.IO
├── src/
│   ├── config/database.js      # Configuração SQLite
│   ├── controllers/gameController.js  # Lógica de eventos
│   ├── models/Player.js        # Modelo de dados
│   └── utils/helpers.js        # Funções auxiliares
└── public/
    ├── index.html              # Interface mobile
    ├── css/styles.css          # Estilos responsivos
    └── js/
        ├── game.js             # Loop principal do jogo
        ├── joystick.js         # Controle do joystick
        ├── renderer.js         # Renderização Canvas
        └── constants.js        # Configurações globais
```

## 🎯 Como Jogar

1. Abra o jogo no seu dispositivo móvel
2. Digite seu nome e escolha uma cor
3. Clique em "Entrar no jogo"
4. Use o **joystick no canto inferior direito** para se mover
5. Converse com outros jogadores usando o **chat**

## 🔧 Controles

*   **Joystick**: Movimento em todas as direções
*   **Chat**: Pressione Enter para enviar mensagens

## 📊 Tecnologias

*   **Backend**: Node.js, Express, Socket.IO
*   **Database**: SQLite3
*   **Frontend**: HTML5 Canvas, ES6 Modules, CSS3
*   **Comunicação**: WebSocket em tempo real

## 📝 Licença

Este projeto é de código aberto e pode ser utilizado livremente.
