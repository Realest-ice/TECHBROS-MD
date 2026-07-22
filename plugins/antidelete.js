/*
 * TECHBROS-MD — Anti Delete / Anti Edit Commands V2
 */

const { register } = require('../commands');
const {
    setAntiDelete, getAntiDelete,
    setAntiEdit, getAntiEdit,
    setPath, getPath,
    getAllAntiSettings
} = require('../techbros_data/antiDeleteDB');

// ── ANTI DELETE ────────────────────────────────────────────────
register({
    name: 'antidelete', aliases: ['ad'],
    category: 'general', desc: 'Toggle anti delete for groups/dms/status',
    ownerOnly: true, react: '🗑️'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const type = args[0]?.toLowerCase(); // gc | dm | status
    const sub  = args[1]?.toLowerCase(); // on | off

    if (!type || !['gc', 'dm', 'status'].includes(type) || !sub || !['on', 'off'].includes(sub)) {
        const s = await getAllAntiSettings();
        
        // Handling potential variations in your DB schema naming for the new status toggle
        const statusState = s.del_status_status ?? s.del_status ?? false;

        return sock.sendMessage(remoteJid, {
            text: `🗑️ *TECHBROS Anti-Delete*\n\n` +
                  `Groups: *${s.del_gc_status ? '✅ ON' : '❌ OFF'}*\n` +
                  `DMs: *${s.del_dm_status ? '✅ ON' : '❌ OFF'}*\n` +
                  `Status: *${statusState ? '✅ ON' : '❌ OFF'}*\n` +
                  `Destination: *${(s.del_path || 'log').toUpperCase()}*\n\n` +
                  `*Usage:*\n` +
                  `.ad gc on/off\n` +
                  `.ad dm on/off\n` +
                  `.ad status on/off\n` +
                  `.adpath log/chat\n\n` +
                  `_log = sends to your DM, chat = sends back to the same chat_`
        }, { quoted: msg });
    }

    await setAntiDelete(type, sub === 'on');
    await sock.sendMessage(remoteJid, {
        text: `🗑️ Anti Delete (*${type.toUpperCase()}*): *${sub.toUpperCase()}*`
    }, { quoted: msg });
});

// ── ANTI DELETE PATH ───────────────────────────────────────────
register({
    name: 'adpath',
    category: 'general', desc: 'Set anti delete destination (log/chat)',
    ownerOnly: true, react: '📍'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const path = args[0]?.toLowerCase();

    if (!path || !['log', 'chat'].includes(path)) {
        const current = await getPath('delete');
        return sock.sendMessage(remoteJid, {
            text: `📍 *Anti Delete Destination*\n\nCurrent: *${(current || 'log').toUpperCase()}*\n\n*Usage:*\n.adpath log/chat\n\n_log = sends to your DM\nchat = sends back to the same chat_`
        }, { quoted: msg });
    }

    await setPath('delete', path);
    await sock.sendMessage(remoteJid, {
        text: `📍 Anti Delete Destination: *${path.toUpperCase()}*`
    }, { quoted: msg });
});

// ── ANTI EDIT ──────────────────────────────────────────────────
register({
    name: 'antiedit', aliases: ['ae'],
    category: 'general', desc: 'Toggle anti edit for groups/dms',
    ownerOnly: true, react: '✏️'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const type = args[0]?.toLowerCase(); // gc | dm
    const sub  = args[1]?.toLowerCase(); // on | off

    if (!type || !['gc', 'dm'].includes(type) || !sub || !['on', 'off'].includes(sub)) {
        const s = await getAllAntiSettings();
        return sock.sendMessage(remoteJid, {
            text: `✏️ *TECHBROS Anti-Edit*\n\n` +
                  `Groups: *${s.edit_gc_status ? '✅ ON' : '❌ OFF'}*\n` +
                  `DMs: *${s.edit_dm_status ? '✅ ON' : '❌ OFF'}*\n` +
                  `Destination: *${(s.edit_path || 'log').toUpperCase()}*\n\n` +
                  `*Usage:*\n` +
                  `.ae gc on/off\n` +
                  `.ae dm on/off\n` +
                  `.aepath log/chat`
        }, { quoted: msg });
    }

    await setAntiEdit(type, sub === 'on');
    await sock.sendMessage(remoteJid, {
        text: `✏️ Anti Edit (*${type.toUpperCase()}*): *${sub.toUpperCase()}*`
    }, { quoted: msg });
});

// ── ANTI EDIT PATH ─────────────────────────────────────────────
register({
    name: 'aepath',
    category: 'general', desc: 'Set anti edit destination (log/chat)',
    ownerOnly: true, react: '📍'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const path = args[0]?.toLowerCase();

    if (!path || !['log', 'chat'].includes(path)) {
        const current = await getPath('edit');
        return sock.sendMessage(remoteJid, {
            text: `📍 *Anti Edit Destination*\n\nCurrent: *${(current || 'log').toUpperCase()}*\n\n*Usage:*\n.aepath log/chat`
        }, { quoted: msg });
    }

    await setPath('edit', path);
    await sock.sendMessage(remoteJid, {
        text: `📍 Anti Edit Destination: *${path.toUpperCase()}*`
    }, { quoted: msg });
});