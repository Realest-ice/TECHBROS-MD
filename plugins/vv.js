const { register } = require('../commands');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { updateConfig } = require('../lib/configSync');
const config = require('../config');

register({
    name: 'vv',
    aliases: ['reveal', 'unview'],
    category: 'fun',
    desc: 'Reveal a view-once message you reply to (add "dm" to send privately)',
    react: '👁️'
}, async (sock, msg, metadata) => {
    const { remoteJid, quoted, args } = metadata;
    const sendToDM = args[0]?.toLowerCase() === 'dm';

    if (!quoted) {
        return sock.sendMessage(remoteJid, { text: '❌ Reply to a view-once message with .vv (or .vv dm to send privately)' }, { quoted: msg });
    }

    const m = quoted.message || {};
    let viewOnceMsg = m.viewOnceMessage || m.viewOnceMessageV2;
    let inner = viewOnceMsg?.message;

    if (!inner) {
        if (m.imageMessage?.viewOnce)      inner = { imageMessage: m.imageMessage };
        else if (m.videoMessage?.viewOnce) inner = { videoMessage: m.videoMessage };
        else if (m.audioMessage?.viewOnce) inner = { audioMessage: m.audioMessage };
    }

    if (!inner) {
        return sock.sendMessage(remoteJid, { text: '❌ That message is not a view-once message.' }, { quoted: msg });
    }

    try {
        const actualMsg = inner.imageMessage || inner.videoMessage || inner.audioMessage;
        let type = '';
        if (inner.imageMessage)      type = 'image';
        else if (inner.videoMessage) type = 'video';
        else if (inner.audioMessage) type = 'audio';

        const stream = await downloadContentFromMessage(actualMsg, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        if (buffer.length === 0) throw new Error('Empty buffer — media may have expired.');

        const target = sendToDM ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : remoteJid;

        await sock.sendMessage(target, {
            [type]: buffer,
            caption: '👁️ *View-Once Revealed*'
        }, sendToDM ? {} : { quoted: msg });

        if (sendToDM && remoteJid !== target) {
            await sock.sendMessage(remoteJid, { text: '✅ Sent to your DM privately.' }, { quoted: msg });
        }
    } catch (err) {
        console.error('[VV] Error:', err.message);
        await sock.sendMessage(remoteJid, { text: `❌ Failed to reveal: ${err.message}` }, { quoted: msg });
    }
});

register({
    name: 'autoviewonce',
    aliases: ['avo'],
    category: 'fun',
    desc: 'Toggle automatic silent view-once vaulting',
    ownerOnly: true,
    react: '👁️'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const toggle = args[0]?.toLowerCase();

    if (!toggle || !['on', 'off'].includes(toggle)) {
        return sock.sendMessage(remoteJid, {
            text: `👁️ *Auto View-Once Vaulting*\nCurrent: *${config.autoViewOnce ? 'ON' : 'OFF'}*\n\nUsage: .autoviewonce on/off\n\n_.vv (reply) reveals in chat — .vv dm sends privately_`
        }, { quoted: msg });
    }

    config.autoViewOnce = toggle === 'on';
    await updateConfig({ autoViewOnce: config.autoViewOnce });
    await sock.sendMessage(remoteJid, { text: `👁️ Auto View-Once Vaulting: *${toggle.toUpperCase()}*` }, { quoted: msg });
});

module.exports = {};