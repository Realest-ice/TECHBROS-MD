/*
 * TECHBROS-MD — Dynamic Settings Panel
 * Auto-generates handlers from whatever is in config.js
 */

const { register } = require('../commands');
const { getSettings } = require('../techbros_data/settings');
const { updateConfig } = require('../lib/configSync');
const { sendInteractiveMessage } = require('gifted-btns');
const config = require('../config');

// ── BLACKLIST — never expose these ─────────────────────────────
const BLACKLIST = ['owners', 'sudos', 'devs', 'database', 'mongoUrl', 'port', 'debug', 'timezone'];

// ── MANUAL LANE — needs text input, not a toggle ───────────────
const MANUAL_SETTINGS = [
    'mode', 'botName', 'prefix', 'aliveMsg', 'aliveImg',
    'customReactEmojis', 'customStatusEmojis',
    'autoReplyStatusText', 'autoReplyStatusReplyText',
    'antiDeleteMode', 'antiEditMode'
];

const IMAGES_MENU = config.aliveImg || 'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg';

const formatLabel = (key) =>
    key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();

const getType = (key, value) => {
    if (MANUAL_SETTINGS.includes(key)) return 'value';
    if (value === true || value === false) return 'toggle';
    return 'text';
};

const fmtDisplay = (val) => {
    if (val === true)  return '✅ ON';
    if (val === false) return '❌ OFF';
    return `📝 ${String(val).toUpperCase()}`;
};

// ── MASTER PANEL ────────────────────────────────────────────────
register({
    name: 'settings',
    aliases: ['panel', 'config'],
    category: 'settings',
    desc: 'Bot settings dashboard',
    ownerOnly: true,
    react: '⚙️'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;

    try {
        let summary = `*⚙️ ${config.botName || 'TECHBROS-MD'} DASHBOARD*\n\n`;
        summary += `*Status:* Online 🟢\n`;
        summary += `*User:* ${msg.pushName || 'Admin'}\n`;
        summary += `───────────────────\n\n`;

        const rows    = [];
        const entries = Object.entries(config);

        for (const [key, value] of entries) {
            if (typeof value === 'function') continue;
            if (typeof value === 'object' && value !== null) continue;
            if (BLACKLIST.includes(key)) continue;

            const label = formatLabel(key);
            const type  = getType(key, value);
            const disp  = fmtDisplay(value);

            summary += `• *${label}:* ${disp}\n`;

            rows.push({
                title:       label,
                description: `Current: ${disp}`,
                id:          `edit_${key.toLowerCase()}`
            });
        }

        summary += `\n_Tap a setting to toggle or view manual instructions._`;

        await sendInteractiveMessage(sock, remoteJid, {
            text:   summary,
            footer: 'Techbros MD Runtime Controller',
            image:  { url: config.aliveImg || IMAGES_MENU },
            interactiveButtons: [{
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title:    '🛠️ MODIFY SETTINGS',
                    sections: [{ title: 'System Variables', rows }]
                })
            }]
        });

    } catch (e) {
        console.error('[Settings] Panel error:', e.message);
        await sock.sendMessage(remoteJid, {
            text: '❌ Settings panel failed.'
        }, { quoted: msg });
    }
});

// ── AUTO-GENERATED HANDLERS — registered synchronously ──────────
// Reads whatever keys exist in config.js right now and builds
// edit_<key> + <key> commands for each
const configKeys = Object.keys(config).filter(key => {
    const value = config[key];
    if (typeof value === 'function') return false;
    if (typeof value === 'object' && value !== null) return false;
    if (BLACKLIST.includes(key)) return false;
    return true;
});

for (const key of configKeys) {
    const label   = formatLabel(key);
    const safeKey = key.toLowerCase();

    // ── BUTTON CLICK HANDLER (edit_<key>) ──────────────────────
    register({
        name:     `edit_${safeKey}`,
        category: 'settings',
        desc:     'internal',
        ownerOnly: true,
        react:    '⚙️'
    }, async (sock, msg, metadata) => {
        const { remoteJid } = metadata;
        const currentVal = config[key];
        const type       = getType(key, currentVal);

        if (type === 'toggle') {
            const next = !currentVal;
            await updateConfig(key, next);
            await sock.sendMessage(remoteJid, {
                text: `✅ *${label}* updated to: *${next ? 'ON' : 'OFF'}*`
            }, { quoted: msg });

        } else {
            await sock.sendMessage(remoteJid, {
                text: `✏️ *EDITING ${label.toUpperCase()}*\n\nCurrent: *${String(currentVal).toUpperCase()}*\n\nType manually:\n*${config.prefix}${safeKey} <value>*\n\n_Example: ${config.prefix}${safeKey} ${safeKey === 'mode' ? 'private' : 'your value here'}_`
            }, { quoted: msg });
        }
    });

    // ── TEXT INPUT HANDLER (<key>) ──────────────────────────────
    register({
        name:     safeKey,
        category: 'settings',
        desc:     `Set ${label}`,
        ownerOnly: true,
        react:    '✏️'
    }, async (sock, msg, metadata) => {
        const { remoteJid, args } = metadata;
        const q = args.join(' ').trim();

        if (!q) {
            return sock.sendMessage(remoteJid, {
                text: `⚠️ *${label}*\nCurrent: *${String(config[key]).toUpperCase()}*\n\nUsage: ${config.prefix}${safeKey} <value>`
            }, { quoted: msg });
        }

        await updateConfig(key, q);
        await sock.sendMessage(remoteJid, {
            text: `✅ *${label}* set to:\n*${q.toUpperCase()}*`
        }, { quoted: msg });
    });
}

console.log(`[Settings] ${configKeys.length * 2} dynamic handlers registered`);
