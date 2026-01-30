# 🐄 La Vaquita

> Telegram Mini App for group savings using Openfort embedded wallets

## What is La Vaquita?

"La Vaquita" is a Latin American slang for when a group of people pool money together for a common goal (party, gift, trip, etc.).

This app allows creating group money pools directly in Telegram, using:
- **Openfort Embedded Wallets** - No seed phrases, login with Telegram
- **Gasless Transactions** - Users don't pay gas fees
- **Stablecoins (USDC)** - No volatility

## Features

- `/start` - Create wallet (opens Mini App)
- `/crear "name" amount` - Create a new vaquita
- `/unirse CODE` - Join an existing vaquita
- `/aportar amount` - Contribute to the pool
- `/estado` - View pool status
- `/retirar` - Withdraw funds (creator only, when goal reached)

## Tech Stack

```
├── bot/                  # Telegram Bot (Node.js + Grammy)
│   ├── TypeScript
│   ├── MongoDB (Mongoose)
│   └── Grammy.js
│
└── webapp/               # Mini App (React + Vite)
    ├── React 18
    ├── Openfort SDK
    ├── TailwindCSS
    └── Telegram WebApp API
```

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB Atlas account
- Telegram Bot Token (from @BotFather)
- Openfort account (openfort.io)

### Setup

1. Clone and install:
```bash
git clone https://github.com/your-repo/la-vaquita
cd la-vaquita
npm install
cd bot && npm install
cd ../webapp && npm install
```

2. Configure environment:
```bash
# Bot
cp bot/.env.example bot/.env
# Edit bot/.env with your values

# Webapp
cp webapp/.env.example webapp/.env
# Edit webapp/.env with your values
```

3. Run development:
```bash
# Terminal 1 - Bot
cd bot && npm run dev

# Terminal 2 - Webapp
cd webapp && npm run dev
```

4. Use ngrok to expose webapp for Telegram:
```bash
ngrok http 5173
# Update bot/.env WEBAPP_URL with ngrok URL
```

## Environment Variables

### Bot (`bot/.env`)
```env
TELEGRAM_BOT_TOKEN=your_bot_token
MONGODB_URI=mongodb+srv://...
WEBAPP_URL=https://your-ngrok-url.ngrok.io
```

### Webapp (`webapp/.env`)
```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_live_xxxxx
```

## Deployment

### Bot
Deploy to Railway, Render, or any Node.js host.

### Webapp
Deploy to Vercel:
```bash
cd webapp
vercel
```

## Hackathon

Built for **Openfort Builder Bounties LATAM**

### Evaluation Criteria
- Technical correctness (30%)
- Clarity & documentation (25%)
- Usefulness (25%)
- Video quality (10%)
- Community impact (10%)

## License

MIT

## Team

UltravioletaDAO
