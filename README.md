<p align="center">
  <img src="https://i.imgur.com/LyHic3i.gif" alt="banner">
</p>

<h1 align="center">🤖 TECHBROS-MD</h1>
<p align="center">A powerful, feature-packed multi-purpose WhatsApp bot built on Baileys.</p>

<p align="center">
  <img src="https://img.shields.io/badge/BUILT%20BY-TECHBROS-red.svg?style=for-the-badge">
  <img src="https://img.shields.io/badge/LICENSE-MIT-blue.svg?style=for-the-badge">
  <img src="https://img.shields.io/badge/STATUS-ACTIVE%20DEV-yellow.svg?style=for-the-badge">
</p>

<p align="center">
  <a href="https://github.com/Realest-ice/TECHBROS-MD/stargazers"><img src="https://img.shields.io/github/stars/Realest-ice/TECHBROS-MD?style=social"></a>
  <a href="https://github.com/Realest-ice/TECHBROS-MD/network/members"><img src="https://img.shields.io/github/forks/Realest-ice/TECHBROS-MD?style=social"></a>
  <a href="https://github.com/Realest-ice/TECHBROS-MD/watchers"><img src="https://img.shields.io/github/watchers/Realest-ice/TECHBROS-MD?style=social"></a>
</p>

<p align="center">
  <img src="https://i.imgur.com/LyHic3i.gif" alt="divider">
</p>

## ✨ Features

✅ **Working & Tested:**
- 🗑️ Anti-delete — recovers deleted messages, including media
- ✏️ Anti-edit — detects and alerts on edited messages/captions
- 👁️ View-once reveal — `.vv` (reply to a view-once message to reveal it)
- 👑 Sudo system — manage trusted users via `.sudo add/remove/list`
- ⚙️ Config validation on startup

🚧 **In Progress:**
- `.vv dm` (send revealed view-once privately)
- Group events (welcome/goodbye/promote/demote)
- Owner utility commands (`.owner`, `.jid`, `.whois`, `.getpp`)
- Antilink, antispam, anti-bad-word moderation
- Auto status view/react/save

⚠️ **Known Issues:**
- Profile picture fetch sometimes returns a placeholder even for public pictures on certain accounts — under investigation

<p align="center">
  <img src="https://i.imgur.com/LyHic3i.gif" alt="divider">
</p>

## 🚀 Setup

<details>
<summary><b>Tap to expand deployment steps</b></summary>

**Requirements:** Node.js 20+, a Linux VPS or bot-hosting panel, Git.

**1. Clone the repo**
```bash
git clone https://github.com/Realest-ice/TECHBROS-MD.git
cd TECHBROS-MD
```

**2. Install dependencies**
```bash
npm install
```

**3. Set environment variables**

Create a `.env` file in the project root:
```env
PHONE_NUMBER=234XXXXXXXXXX
PREFIX=.
OWNER_NUMBER=234XXXXXXXXXX
DB_TYPE=sqlite
```

**4. Start the bot**
```bash
npm start
```

**5. Pair with WhatsApp**

A pairing code appears in the console — enter it under WhatsApp → Linked Devices.

> 🔮 **Coming soon:** Session ID-based pairing as an alternative to phone number setup.

**6. Keep it running with PM2** (recommended)
```bash
npm install -g pm2
pm2 start index.js --name techbros-md
pm2 save
```

</details>

<p align="center">
  <img src="https://i.imgur.com/LyHic3i.gif" alt="divider">
</p>

## 🛠️ Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/Baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white"/>
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white"/>
  <img src="https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white"/>
</p>

<p align="center">
  <img src="https://i.imgur.com/LyHic3i.gif" alt="divider">
</p>

## 📈 Repo Star History

[

![Star History Chart](https://api.star-history.com/svg?repos=Realest-ice/TECHBROS-MD&type=Timeline)

](#)

<p align="center">
  <img src="https://i.imgur.com/LyHic3i.gif" alt="divider">
</p>

## 🙏 Credits

Built by **Realest_ice (Immanuel Felix)** & **Vidz (Hilton)** — TECHBROS.

If you fork this, a credit link back is appreciated 🙏
