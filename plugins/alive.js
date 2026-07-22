/*
 * TECHBROS-MD — Alive / Ping / Status Commands
 */

const { register } = require('../commands');
const { sendInteractiveMessage } = require('gifted-btns');
const { getDateTime } = require('../lib/utils');
const { getContextInfo } = require('../lib/contextInfo');
const config = require('../config');
const os = require('os');

// ── HELPERS ────────────────────────────────────────────────────
const getUptime = () => {
    const u = process.uptime();
    const d = Math.floor(u / 86400);
    const h = Math.floor((u % 86400) / 3600);
    const m = Math.floor((u % 3600) / 60);
    const s = Math.floor(u % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

const getRam = () => {
    const used  = process.memoryUsage().heapUsed / 1024 / 1024;
    const total = os.totalmem() / 1024 / 1024;
    return `${used.toFixed(1)} MB / ${total.toFixed(0)} MB`;
};

const getCpuLoad = () => {
    const cpus = os.cpus();
    const load = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return acc + ((total - cpu.times.idle) / total) * 100;
    }, 0) / cpus.length;
    return `${load.toFixed(1)}%`;
};

const getSpeed = (start) => `${Date.now() - start}ms`;

// ── ALIVE ──────────────────────────────────────────────────────
register({
    name:    'alive',
    aliases: ['bot', 'status'],
    category: 'general',
    desc:    'Check if bot is online with full info',
    react:   '🤖'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const start = Date.now();
    const { time, date, greeting } = getDateTime(config.timezone || 'Africa/Lagos');
    const speed = getSpeed(start);

    const text =
`╔═══════════════════════╗
║   🤖 *TECHBROS MD*   ║
╚═══════════════════════╝

${greeting} *${msg.pushName || 'User'}* 👋

✅ *Bot is Online!*
━━━━━━━━━━━━━━━━━━━━━
⚡ *Speed:* ${speed}
⏱️ *Uptime:* ${getUptime()}
💾 *RAM:* ${getRam()}
🖥️ *CPU:* ${getCpuLoad()}
━━━━━━━━━━━━━━━━━━━━━
🕐 *Time:* ${time}
📅 *Date:* ${date}
🔑 *Prefix:* [ ${config.prefix} ]
🌐 *Mode:* ${(config.mode || 'public').toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━
> _Powered by Techbros MD_ 🚀`;

    try {
        await sendInteractiveMessage(sock, remoteJid, {
            text,
            footer: `Techbros MD • ${speed}`,
            image:  { url: config.aliveImg || 'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg' },
            interactiveButtons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '📋 Menu', id: 'menu' })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '⚙️ Settings', id: 'settings' })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🔗 Channel',
                        url: `https://whatsapp.com/channel/0029Vb7LyCHEquiRPdrd0d3w`
                    })
                }
            ]
        });
    } catch (e) {
        // Text fallback
        await sock.sendMessage(remoteJid, {
            image:   { url: config.aliveImg || 'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg' },
            caption: text,
            contextInfo: getContextInfo()
        }, { quoted: msg });
    }
});

// ── PING ───────────────────────────────────────────────────────
register({
    name:    'ping',
    aliases: ['latency'],
    category: 'general',
    desc:    'Check bot response speed',
    react:   '⚡'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const start  = Date.now();
    const sent   = await sock.sendMessage(remoteJid, { text: '🏓 Pinging...' }, { quoted: msg });
    const speed  = getSpeed(start);

    await sock.sendMessage(remoteJid, {
        text: `⚡ *Pong!*\n\n🏓 *Speed:* ${speed}\n⏱️ *Uptime:* ${getUptime()}\n💾 *RAM:* ${getRam()}`,
        edit: sent.key
    });
});

// ── SYSTEM INFO ────────────────────────────────────────────────
register({
    name:    'sysinfo',
    aliases: ['system', 'specs'],
    category: 'general',
    desc:    'Show server system information',
    ownerOnly: true,
    react:   '🖥️'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const platform  = os.platform();
    const arch      = os.arch();
    const cpuModel  = os.cpus()[0]?.model || 'Unknown';
    const cpuCores  = os.cpus().length;
    const totalRam  = (os.totalmem()  / 1024 / 1024 / 1024).toFixed(2);
    const freeRam   = (os.freemem()   / 1024 / 1024 / 1024).toFixed(2);
    const usedRam   = (totalRam - freeRam).toFixed(2);
    const nodeVer   = process.version;
    const uptime    = getUptime();

    const text =
`╔══════════════════════╗
║   🖥️ *SYSTEM INFO*   ║
╚══════════════════════╝

💻 *Platform:* ${platform} (${arch})
🔧 *CPU:* ${cpuModel}
⚙️ *Cores:* ${cpuCores}
📊 *CPU Load:* ${getCpuLoad()}

💾 *RAM Total:* ${totalRam} GB
📈 *RAM Used:* ${usedRam} GB
📉 *RAM Free:* ${freeRam} GB

🟢 *Node.js:* ${nodeVer}
⏱️ *Uptime:* ${uptime}
🤖 *Bot:* ${config.botName || 'Techbros MD'}`;

    await sock.sendMessage(remoteJid, { text }, { quoted: msg });
});

// ── OWNER INFO ─────────────────────────────────────────────────
register({
    name:    'owner',
    aliases: ['creator', 'dev'],
    category: 'general',
    desc:    'Show bot owner info',
    react:   '👑'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const ownerNum = config.owners?.[0]?.replace('@s.whatsapp.net', '') || 'Unknown';

    try {
        const ppUrl = await sock.profilePictureUrl(
            config.owners?.[0] || '', 'image'
        ).catch(() => null);

        const text =
`╔══════════════════════╗
║   👑 *BOT OWNER*   ║
╚══════════════════════╝

🤖 *Bot:* ${config.botName || 'Techbros MD'}
👤 *Owner:* +${ownerNum}
⚡ *Prefix:* ${config.prefix}
🌐 *Mode:* ${(config.mode || 'public').toUpperCase()}

_Contact the owner for support_`;

        await sendInteractiveMessage(sock, remoteJid, {
            text,
            footer: 'Techbros MD',
            image: ppUrl ? { url: ppUrl } : undefined,
            interactiveButtons: [
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💬 Chat Owner',
                        url: `https://wa.me/${ownerNum}`
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🔗 Channel',
                        url: 'https://whatsapp.com/channel/0029Vb7LyCHEquiRPdrd0d3w'
                    })
                }
            ]
        });
    } catch (e) {
        await sock.sendMessage(remoteJid, {
            text: `👑 *Owner:* +${ownerNum}\n🤖 *Bot:* ${config.botName}`
        }, { quoted: msg });
    }
});