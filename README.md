# Neon-Grid-Strider

Jogo multiplayer em tempo real usando **Node.js + Express + Socket.IO + SQLite**.

## Requisitos
- Node.js 18+

## Instalação
```bash
npm install
```

## Rodar em desenvolvimento
```bash
npm run dev
```

Abra: `http://localhost:3000`

## Estrutura
- `server.js`: servidor HTTP, Socket.IO e persistência SQLite.
- `public/index.html`: interface do jogo.
- `public/game.js`: lógica de cliente/render/movimento.
- `public/styles.css`: estilo visual neon.
