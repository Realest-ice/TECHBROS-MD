const { register } = require('../commands');
const { addSudo, removeSudo, getSudoList } = require('../techbros_data/sudoData');
const { parseJid } = require('../lib/utils');
const config = require('../config');


register({
    name: 'sudo',
    category: 'owner',
    desc: 'Manage sudo users',
    ownerOnly: true,
    react: '👑'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const sub = args[0]?.toLowerCase();

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted     = metadata.quoted?.key?.participant;
    const argNum     = args[1]?.replace(/[^0-9]/g, '');
    const target      = mentioned || quoted || (argNum ? `${argNum}@s.whatsapp.net` : null);

    if (sub === 'add') {
    if (!target) return sock.sendMessage(remoteJid, { text: '❌ Tag, reply, or give a number.' }, { quoted: msg });
    await addSudo(target);
    if (!config.sudos.includes(target)) config.sudos.push(target);
    return sock.sendMessage(remoteJid, { text: `✅ @${parseJid(target)} added as sudo.`, mentions: [target] }, { quoted: msg });
}

if (sub === 'remove' || sub === 'del') {
    if (!target) return sock.sendMessage(remoteJid, { text: '❌ Tag, reply, or give a number.' }, { quoted: msg });
    await removeSudo(target);
    config.sudos = config.sudos.filter(j => j !== target);
    return sock.sendMessage(remoteJid, { text: `✅ @${parseJid(target)} removed from sudo.`, mentions: [target] }, { quoted: msg });
}

    if (sub === 'list') {
        const list = await getSudoList();
        if (!list.length) return sock.sendMessage(remoteJid, { text: '❌ No sudo users.' }, { quoted: msg });
        return sock.sendMessage(remoteJid, {
            text: `👑 *SUDO USERS* (${list.length})\n\n${list.map((j, i) => `${i + 1}. @${parseJid(j)}`).join('\n')}`,
            mentions: list
        }, { quoted: msg });
    }

    return sock.sendMessage(remoteJid, {
        text: `👑 *Sudo Management*\n\n▸ .sudo add <tag/reply/number>\n▸ .sudo remove <tag/reply/number>\n▸ .sudo list`
    }, { quoted: msg });
});

module.exports = {};