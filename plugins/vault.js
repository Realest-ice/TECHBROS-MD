const { register } = require('../commands');
const { listVault, getVaultItem, deleteVaultItem } = require('../techbros_data/vvVault');
const { parseJid } = require('../lib/utils');

register({
    name: 'listvv',
    aliases: ['vault', 'vvlist'],
    category: 'owner',
    desc: 'List all vaulted view-once media',
    ownerOnly: true,
    react: '🗄️'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const items = await listVault();

    if (!items.length) {
        return sock.sendMessage(remoteJid, { text: '📭 Vault is empty.' }, { quoted: msg });
    }

    const list = items.map(i =>
        `*#${i.id}* — ${i.type} from @${parseJid(i.senderJid)} — ${new Date(i.timestamp).toLocaleString()}`
    ).join('\n');

    await sock.sendMessage(remoteJid, {
        text: `🗄️ *VV VAULT* (${items.length})\n\n${list}\n\nUse .vget <id> to view, .vvdel <id> to delete.`,
        mentions: items.map(i => i.senderJid)
    }, { quoted: msg });
});

register({
    name: 'vget',
    aliases: ['vvget', 'viewvault'],
    category: 'owner',
    desc: 'View a vaulted item by ID',
    ownerOnly: true,
    react: '👁️'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const id = parseInt(args[0]);
    if (!id) return sock.sendMessage(remoteJid, { text: '❌ Usage: .vget <id> (see .listvv)' }, { quoted: msg });

    const item = await getVaultItem(id);
    if (!item) return sock.sendMessage(remoteJid, { text: '❌ No vault item with that ID.' }, { quoted: msg });

    const buffer = Buffer.from(item.mediaBase64, 'base64');
    await sock.sendMessage(remoteJid, {
        [item.type]: buffer,
        caption: `🗄️ Vault #${item.id}\nFrom: @${parseJid(item.senderJid)}${item.caption ? `\n📝 ${item.caption}` : ''}`,
        mentions: [item.senderJid]
    }, { quoted: msg });
});

register({
    name: 'vvdel',
    aliases: ['deletevv'],
    category: 'owner',
    desc: 'Delete a vaulted item by ID',
    ownerOnly: true,
    react: '🗑️'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const id = parseInt(args[0]);
    if (!id) return sock.sendMessage(remoteJid, { text: '❌ Usage: .vvdel <id>' }, { quoted: msg });

    await deleteVaultItem(id);
    await sock.sendMessage(remoteJid, { text: `🗑️ Deleted vault item #${id}` }, { quoted: msg });
});

// Temporary — add to any plugin file, run once, then remove
register({
    name: 'clearvault',
    ownerOnly: true,
    category: 'owner'
}, async (sock, msg, metadata) => {
    const { getDB } = require('../lib/database');
    await getDB().query('DELETE FROM vv_vault');
    await sock.sendMessage(metadata.remoteJid, { text: '🗑️ Vault cleared.' }, { quoted: msg });
});
module.exports = {};