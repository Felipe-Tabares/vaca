# 🐄 La Vaquita

<div align="center">

![La Vaquita Banner](https://img.shields.io/badge/La%20Vaquita-Group%20Savings%20on%20Telegram-green?style=for-the-badge&logo=telegram)

**Telegram Mini App for group savings pools using Openfort embedded wallets**

[Demo Bot](https://t.me/openfort_vaca_bot) • [Video Demo](#video-demo) • [How It Works](#how-it-works)

[![Built with Openfort](https://img.shields.io/badge/Built%20with-Openfort-blue?style=flat-square)](https://openfort.io)
[![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-0052FF?style=flat-square)](https://base.org)
[![USDC](https://img.shields.io/badge/Currency-USDC-2775CA?style=flat-square)](https://circle.com)

</div>

---

## 🎯 The Problem

In Latin America, **"hacer una vaquita"** is a common practice where groups of friends pool money together for shared goals - birthday gifts, trips, parties, or emergencies. Currently, this is done through:

- Cash (inconvenient, no tracking)
- Bank transfers (fees, different banks, slow)
- Payment apps (limited to same country, no transparency)

**None of these solutions provide transparency, automatic tracking, or work across borders.**

## 💡 The Solution

**La Vaquita** brings group savings to Telegram with:

| Feature | Benefit |
|---------|---------|
| 🔐 **No seed phrases** | Openfort embedded wallets - login with Telegram |
| ⛽ **Gasless transactions** | Sponsored by Openfort policies - users pay $0 gas |
| 💵 **USDC stablecoins** | No crypto volatility - $1 = $1 |
| 📱 **Native Telegram** | No app downloads - works in any Telegram chat |
| 🌎 **Cross-border** | Friends anywhere can contribute |

---

## 🎬 Video Demo

> 📹 [Watch the demo video on YouTube](#) *(link to be added)*

---

## 🚀 How It Works

### User Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   /start    │────▶│  Connect    │────▶│   /crear    │────▶│  Share      │
│             │     │   Wallet    │     │  "Trip" 50  │     │   Code      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│  /retirar   │◀────│   Goal      │◀────│  /aportar   │◀───────────┘
│  (creator)  │     │  Reached!   │     │     25      │   Friends join
└─────────────┘     └─────────────┘     └─────────────┘   & contribute
```

### Bot Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Register & connect wallet | `/start` |
| `/crear` | Create a new vaquita | `/crear "Beach Trip" 100` |
| `/unirse` | Join existing vaquita | `/unirse ABC123` |
| `/aportar` | Contribute USDC | `/aportar 25` |
| `/estado` | View pool status | `/estado` |
| `/mis` | List your vaquitas | `/mis` |
| `/balance` | Check your USDC balance | `/balance` |
| `/retirar` | Withdraw funds (creator) | `/retirar` |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         TELEGRAM                                    │
│  ┌──────────────┐                        ┌──────────────────────┐  │
│  │  User Chat   │◀──────────────────────▶│  La Vaquita Bot      │  │
│  └──────────────┘                        │  (Grammy.js)         │  │
│         │                                └──────────┬───────────┘  │
│         │ Opens Mini App                            │              │
│         ▼                                           │              │
│  ┌──────────────────────┐                          │              │
│  │  Telegram Mini App   │                          │              │
│  │  (React + Vite)      │                          │              │
│  └──────────┬───────────┘                          │              │
└─────────────┼──────────────────────────────────────┼──────────────┘
              │                                       │
              ▼                                       ▼
┌─────────────────────────┐              ┌─────────────────────────┐
│      OPENFORT           │              │       MONGODB           │
│  ┌───────────────────┐  │              │  ┌───────────────────┐  │
│  │ Embedded Wallets  │  │              │  │ Users             │  │
│  │ (No seed phrases) │  │              │  │ Vaquitas          │  │
│  ├───────────────────┤  │              │  │ Contributions     │  │
│  │ Gas Sponsorship   │  │              │  └───────────────────┘  │
│  │ (Policy-based)    │  │              └─────────────────────────┘
│  ├───────────────────┤  │
│  │ Smart Accounts    │  │              ┌─────────────────────────┐
│  │ (ERC-4337)        │  │              │    BASE SEPOLIA         │
│  └───────────────────┘  │              │  ┌───────────────────┐  │
└─────────────────────────┘              │  │ USDC Contract     │  │
                                         │  │ Pool Wallets      │  │
                                         │  └───────────────────┘  │
                                         └─────────────────────────┘
```

---

## 🔧 Tech Stack

### Backend (Bot)
- **Runtime:** Node.js 20+
- **Framework:** [Grammy.js](https://grammy.dev/) (Telegram Bot)
- **Database:** MongoDB Atlas
- **Language:** TypeScript
- **Blockchain:** [Openfort Node SDK](https://www.openfort.io/docs)

### Frontend (Mini App)
- **Framework:** React 18 + Vite
- **Styling:** TailwindCSS
- **Wallet:** [Openfort JS SDK](https://www.openfort.io/docs) (Embedded Wallets)
- **API:** Telegram WebApp API

### Blockchain
- **Network:** Base Sepolia (Testnet)
- **Token:** USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`)
- **Wallets:** Openfort Smart Accounts (ERC-4337)
- **Gas:** Sponsored via Openfort Policies

---

## 🔑 Key Integrations

### Openfort Embedded Wallets

Users get a **non-custodial wallet** without seed phrases:

```typescript
// User authenticates with email derived from Telegram ID
const email = `vaquita.user.${telegramId}@gmail.com`;
await openfort.auth.signUpWithEmailPassword({ email, password });

// Configure embedded wallet on Base Sepolia
await openfort.embeddedWallet.configure({
  chainId: 84532, // Base Sepolia
  recoveryParams: {
    recoveryMethod: RecoveryMethod.PASSWORD,
    password: recoveryPassword,
  },
});
```

### Gas Sponsorship

All transactions are **gasless** for users:

```typescript
// Get provider with sponsorship policy
const provider = await openfort.embeddedWallet.getEthereumProvider({
  policy: 'pol_xxxxx', // Openfort sponsorship policy
});

// User sends USDC without paying gas
await provider.request({
  method: 'eth_sendTransaction',
  params: [{ to: poolWallet, data: transferData, value: '0x0' }],
});
```

---

## 📦 Installation

### Prerequisites

- Node.js 20+
- MongoDB Atlas account
- Telegram Bot Token ([@BotFather](https://t.me/BotFather))
- [Openfort Account](https://dashboard.openfort.io)

### 1. Clone Repository

```bash
git clone https://github.com/Felipe-Tabares/vaca.git
cd vaca
```

### 2. Install Dependencies

```bash
# Bot
cd bot && npm install

# Webapp
cd ../webapp && npm install
```

### 3. Configure Environment

**Bot (`bot/.env`):**
```env
TELEGRAM_BOT_TOKEN=your_bot_token
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lavaquita
WEBAPP_URL=https://your-webapp-url.com
OPENFORT_API_KEY=sk_test_xxxxx
OPENFORT_POLICY_ID=pol_xxxxx
USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
BASE_RPC_URL=https://sepolia.base.org
```

**Webapp (`webapp/.env`):**
```env
VITE_OPENFORT_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY=xxxxx
VITE_OPENFORT_POLICY_ID=pol_xxxxx
VITE_BOT_API_URL=https://your-bot-api.com
VITE_USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### 4. Run Development

```bash
# Terminal 1 - Bot
cd bot && npm run dev

# Terminal 2 - Webapp
cd webapp && npm run dev

# Terminal 3 - Expose webapp (for Telegram)
npx localtunnel --port 5173
```

---

## 🌐 Deployment

### Bot (Render)
1. Create Web Service on [Render](https://render.com)
2. Connect GitHub repo, select `bot/` directory
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Add environment variables

### Webapp (Render Static Site)
1. Create Static Site on Render
2. Connect GitHub repo, select `webapp/` directory
3. Build: `npm install && npm run build`
4. Publish: `dist`
5. Add environment variables

---

## 🎪 Live Demo

| Resource | Link |
|----------|------|
| 🤖 **Telegram Bot** | [@openfort_vaca_bot](https://t.me/openfort_vaca_bot) |
| 🌐 **Webapp** | [vaca-webapp.onrender.com](https://vaca-webapp.onrender.com) |
| 📹 **Video Demo** | [YouTube](#) |

### Test Flow

1. Open [@openfort_vaca_bot](https://t.me/openfort_vaca_bot) in Telegram
2. Send `/start` and connect your wallet
3. Get testnet USDC from [faucet.circle.com](https://faucet.circle.com) (Base Sepolia)
4. Create a vaquita: `/crear "Test Pool" 5`
5. Share the code with a friend
6. Contribute: `/aportar 5`
7. When goal reached, creator can `/retirar`

---

## 🏆 Hackathon

**Built for [Openfort Builder Bounties LATAM](https://openfort.io)**

### Why Openfort?

- **Embedded Wallets:** Non-custodial wallets without seed phrases - perfect for mainstream users
- **Gas Sponsorship:** Policies allow sponsoring gas for specific contracts/functions
- **ERC-4337:** Smart accounts with programmable security and recovery
- **Multi-chain:** Same wallet works across EVM chains

### Evaluation Criteria

| Criteria | Weight | How We Address It |
|----------|--------|-------------------|
| Technical correctness | 30% | Full E2E flow working, Openfort integration |
| Clarity & documentation | 25% | Comprehensive README, code comments |
| Usefulness | 25% | Solves real problem for LATAM users |
| Video quality | 10% | Clear demo showing all features |
| Community impact | 10% | Open source, reusable patterns |

---

## 🗺️ Roadmap

- [x] Basic bot commands
- [x] Openfort wallet integration
- [x] USDC contributions
- [x] Gas sponsorship
- [ ] Multi-member tracking
- [ ] Recurring contributions
- [ ] Mainnet deployment (Base)
- [ ] Multi-language support (ES/PT/EN)

---

## 👥 Team

**UltravioletaDAO** - Building Web3 for Latin America

- 🐦 [@F3l1p3_z](https://twitter.com/F3l1p3_z)
- 🌐 [ultravioletadao.xyz](https://ultravioletadao.xyz)

---

## 📄 License

MIT License - feel free to fork and build!

---

<div align="center">

**Made with 🐄 for LATAM**

*"Hacer la vaquita" - the Web3 way*

</div>
