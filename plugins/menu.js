/*
 * TECHBROS-MD — Help Menu V2
 * Optimized: Clean, Minimalist All-Menu listing only Categories and Command Names.
 */

const { register, getByCategory, getUniqueCommands, commands } = require('../commands');
const { sendInteractiveMessage } = require('gifted-btns');
const config = require('../config');
const { getDateTime } = require('../lib/utils');

// ── IMAGE CONFIG ───────────────────────────────────────────────
const DEFAULT_MENU_IMG = 'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg';

const CAT_IMAGES = {
    general:  '',
    group:    '',
    status:   '',
    settings: '',
    owner:    '',
    fun:      '',
    media:    '',
    admin:    '',
};

const getCatImg = (key) =>
    CAT_IMAGES[key] ? CAT_IMAGES[key] : (config.aliveImg || DEFAULT_MENU_IMG);

// ── CATEGORY CONFIG ────────────────────────────────────────────
const CATEGORIES = [
    { key: 'general',  emoji: '🌐', label: 'General'  },
    { key: 'group',    emoji: '👥', label: 'Group'    },
    { key: 'status',   emoji: '📊', label: 'Status'   },
    { key: 'settings', emoji: '⚙️', label: 'Settings', ownerOnly: true },
    { key: 'owner',    emoji: '👑', label: 'Owner',    ownerOnly: true },
    { key: 'fun',      emoji: '🎉', label: 'Fun'      },
    { key: 'media',    emoji: '🎬', label: 'Media'    },
    { key: 'admin',    emoji: '🛡️', label: 'Admin'    },
];

const getCatEmoji = (cat) => CATEGORIES.find(c => c.key === cat)?.emoji || '📌';
const getCatLabel = (cat) => CATEGORIES.find(c => c.key === cat)?.label || cat;

// ── COMMAND FILTERING HELPER ───────────────────────────────────
const isValidCmd = (c) => 
    !c.desc?.includes('internal') &&
    !c.name.startsWith('edit_') &&
    !c.name.startsWith('help_') &&
    !c.name.startsWith('setting_');

const getVisibleCmds = (cat) => {
    const all = getByCategory()[cat] || [];
    return all.filter(isValidCmd);
};

const getUptime = () => {
    const u = process.uptime();
    const h = Math.floor(u / 3600);
    const m = Math.floor((u % 3600) / 60);
    const s = Math.floor(u % 60);
    return `${h}h ${m}m ${s}s`;
};

// ── SMART SEND — interactive with text fallback ────────────────
async function sendSmartMenu(sock, remoteJid, options, fallbackText, quoted) {
    try {
        await sendInteractiveMessage(sock, remoteJid, options);
    } catch (e) {
        console.error('[Menu] Interactive failed, using text fallback:', e.message);
        await sock.sendMessage(remoteJid, { text: fallbackText }, quoted ? { quoted } : {});
    }
}

// ── 1. MAIN MENU ───────────────────────────────────────────────
register({
    name:    'menu',
    aliases: ['help', 'start', 'h'],
    category: 'general',
    desc:    'Show all categories',
    react:   '📋'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const isOwner = metadata.isOwner || metadata.isDev;
    const prefix  = config.prefix || '.';
    const { time, date, greeting } = getDateTime(config.timezone || 'Africa/Lagos');

    const visibleCats = CATEGORIES.filter(c =>
        (!c.ownerOnly || isOwner) && getVisibleCmds(c.key).length > 0
    );

    const totalCmds = getUniqueCommands().filter(isValidCmd).length;

    const text =
`╔═══════════════════════╗
║   🤖 *TECHBROS MD MENU*  ║
╚═══════════════════════╝

${greeting} *${msg.pushName || metadata.sender.split('@')[0]}*
🕐 *Time:* ${time}
📅 *Date:* ${date}
━━━━━━━━━━━━━━━━━━━━━
⏱️ *Uptime:* ${getUptime()}
💾 *RAM:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB
📦 *Commands:* ${totalCmds}
🔑 *Prefix:* [ ${prefix} ]
🌐 *Mode:* ${(config.mode || 'public').toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━
_Select a category to see commands_`;

    const rows = visibleCats.map(c => ({
        id:          `help_${c.key}`,
        title:       `${c.emoji} ${c.label}`,
        description: `${getVisibleCmds(c.key).length} commands available`
    }));

    rows.push({
        id: 'allmenu',
        title: '📜 All Commands',
        description: 'View the simplified list of all commands'
    });

    await sendSmartMenu(sock, remoteJid, {
        text,
        footer: `Techbros MD • ${prefix}? <cmd> for details`,
        image:  { url: config.aliveImg || DEFAULT_MENU_IMG },
        interactiveButtons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
                title:    '📂 Browse Commands',
                sections: [{ title: '📂 Categories', rows }]
            })
        }]
    }, text, msg);
});

// ── 2. ALL MENU (MINIMALIST LIST) ──────────────────────────────
register({
    name:    'allmenu',
    aliases: ['all', 'list'],
    category: 'general',
    desc:    'Show every single command listed by name and category only',
    react:   '📜'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const isOwner = metadata.isOwner || metadata.isDev;
    const prefix  = config.prefix || '.';

    let fullText = `📜 *TECHBROS MD — ALL COMMANDS*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    let totalCount = 0;

    for (const c of CATEGORIES) {
        if (c.ownerOnly && !isOwner) continue;
        
        const cmds = getVisibleCmds(c.key);
        if (cmds.length === 0) continue;

        totalCount += cmds.length;
        fullText += `*${c.emoji} ${c.label.toUpperCase()}*\n`;
        
        // Lists only the plain prefix + command name
        cmds.forEach(cmd => {
            fullText += `• ${prefix}${cmd.name}\n`;
        });
        fullText += `\n`;
    }

    fullText += `━━━━━━━━━━━━━━━━━━━━━\n📦 *Total Available:* ${totalCount}`;

    await sendSmartMenu(sock, remoteJid, {
        text: fullText,
        footer: `Techbros MD • ${prefix}? <cmd> for details`,
        image:  { url: config.aliveImg || DEFAULT_MENU_IMG },
        interactiveButtons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
                title:    '🔙 Navigate',
                sections: [{
                    title: 'Options',
                    rows:  [{ id: 'menu', title: '🏠 Main Menu', description: 'Go back to categories' }]
                }]
            })
        }]
    }, fullText, msg);
});

// ── 3. CATEGORY PAGES ──────────────────────────────────────────
for (const { key, emoji, label } of CATEGORIES) {
    register({
        name:     `help_${key}`,
        category: 'general',
        desc:     'internal',
        react:    emoji
    }, async (sock, msg, metadata) => {
        const { remoteJid } = metadata;
        const cmds   = getVisibleCmds(key);
        const prefix = config.prefix || '.';

        if (!cmds.length) {
            return sock.sendMessage(remoteJid, {
                text: `${emoji} No commands in *${label}* yet.`
            }, { quoted: msg });
        }

        const text =
`${emoji} *${label.toUpperCase()} COMMANDS*
━━━━━━━━━━━━━━━━━━━━━

${cmds.map(c =>
    `▸ *${prefix}${c.name}*${c.aliases?.length ? ` | ${c.aliases.slice(0,2).map(a => prefix + a).join(', ')}` : ''}
  _${c.desc || 'No description'}_`
).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━
📦 *${cmds.length} command${cmds.length !== 1 ? 's' : ''}*`;

        await sendSmartMenu(sock, remoteJid, {
            text,
            footer: `Techbros MD • ${emoji} ${label}`,
            image:  { url: getCatImg(key) },
            interactiveButtons: [{
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title:    '🔙 Navigate',
                    sections: [{
                        title: 'Go Back',
                        rows:  [{ id: 'menu', title: '🏠 Main Menu', description: 'Back to all categories' }]
                    }]
                })
            }]
        }, text, msg);
    });
}

// ── 4. COMMAND DETAIL ──────────────────────────────────────────
register({
    name:    'helpme',
    aliases: ['?'],
    category: 'general',
    desc:    'Get details on a specific command',
    react:   '❓'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const prefix = config.prefix || '.';
    const query  = args[0]?.toLowerCase().replace(prefix, '');

    if (!query) {
        return sock.sendMessage(remoteJid, {
            text: `❓ *Usage:* ${prefix}? <command>\n*Example:* ${prefix}? kick`
        }, { quoted: msg });
    }

    const cmd = commands.get(query);
    if (!cmd || !isValidCmd(cmd)) {
        return sock.sendMessage(remoteJid, {
            text: `❌ Command *${query}* not found.\n\nUse ${prefix}menu to browse all commands.`
        }, { quoted: msg });
    }

    const catEmoji = getCatEmoji(cmd.category);
    const catLabel = getCatLabel(cmd.category);

    const text =
`📖 *COMMAND INFO*
━━━━━━━━━━━━━━━━━━━━━

🔸 *Name:* ${prefix}${cmd.name}
${cmd.aliases?.length ? `🔸 *Aliases:* ${cmd.aliases.map(a => prefix + a).join(', ')}\n` : ''}🔸 *Category:* ${catEmoji} ${catLabel}
🔸 *Description:* ${cmd.desc || 'No description'}

🔒 *Restrictions*
▸ Owner Only: ${cmd.ownerOnly ? '✅ Yes' : '❌ No'}
▸ Group Only: ${cmd.groupOnly ? '✅ Yes' : '❌ No'}
▸ Admin Only: ${cmd.adminOnly ? '✅ Yes' : '❌ No'}

━━━━━━━━━━━━━━━━━━━━━`;

    await sendSmartMenu(sock, remoteJid, {
        text,
        footer: `Techbros MD • ${catEmoji} ${catLabel}`,
        image:  { url: getCatImg(cmd.category) },
        interactiveButtons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
                title:    '🔙 Navigate',
                sections: [{
                    title: 'Go Back',
                    rows: [
                        { id: `help_${cmd.category}`, title: `${catEmoji} ${catLabel} Commands` },
                        { id: 'menu',                  title: '🏠 Main Menu' }
                    ]
                }]
            })
        }]
    }, text, msg);
});