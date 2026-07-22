const { register } = require('../commands');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Jimp } = require('jimp');

register({
    name: 'fullpp',
    aliases: ['setfullpp', 'setppfull'],
    category: 'owner',
    desc: 'Set full profile picture without cropping',
    ownerOnly: true,
    react: '🖼️'
}, async (sock, msg, metadata) => {
    const { remoteJid, quoted } = metadata;

    const quotedImg = quoted?.message?.imageMessage || msg.message?.imageMessage;
    if (!quotedImg) {
        return sock.sendMessage(remoteJid, { text: '📸 Quote an image to set as profile picture.' }, { quoted: msg });
    }

    try {
        const targetMsg = quoted?.message?.imageMessage ? quoted : msg;

        const buffer = await downloadMediaMessage(
            targetMsg,
            'buffer',
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        const image = await Jimp.read(buffer);
        image.scaleToFit({ w: 720, h: 720 });
        const finalBuffer = await image.getBuffer('image/jpeg');

        const iqNode = {
            tag: 'iq',
            attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'w:profile:picture' },
            content: [{ tag: 'picture', attrs: { type: 'image' }, content: finalBuffer }]
        };

        await sock.query(iqNode);

        await sock.sendMessage(remoteJid, { text: '✅ Profile picture updated (raw method, no crop).' }, { quoted: msg });
    } catch (err) {
        console.error('[SetPP] Error:', err.message);
        await sock.sendMessage(remoteJid, { text: `❌ Failed.\nError: ${err.message}` }, { quoted: msg });
    }
});

module.exports = {};