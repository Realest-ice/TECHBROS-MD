const { downloadContentFromMessage, downloadMediaMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('../config');

// Database Import
let techbros_getUserAutoStatus;
try {
    const db = require('../techbros_data/statusSettings');
    techbros_getUserAutoStatus = db.techbros_getUserAutoStatus;
} catch (e) {
    console.warn('[StatusHandler] User DB not found, falling back to global config.');
}

const KEYWORDS = ['send', 'give', 'give me', 'save', 'dn', 'sent', 'please', 'dm', 'pls send', 'abeg send'];

function getReplyText(msg) {
    const m = msg.message || {};
    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        ''
    ).toLowerCase().trim();
}

// =====================
// AUTO VIEW ONCE RECOVER
// (kept active with debug logs — silent vault detection has been
//  unreliable so far, but leaving this live in case a future
//  WhatsApp/Baileys update fixes it. Use .vv for reliable reveal.)
// =====================
async function handleViewOnce(sock, msg) {
    if (!config.autoViewOnce) return;

    let m = msg.message || {};

    // 1. Fully unwrap nested messages (Disappearing Msgs & Linked Devices)
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    if (m.deviceSentMessage?.message) m = m.deviceSentMessage.message;

    let viewOnceMsg = m.viewOnceMessage || m.viewOnceMessageV2 || m.viewOnceMessageV2Extension;

if (!viewOnceMsg) {
    if (m.imageMessage?.viewOnce)      viewOnceMsg = { message: { imageMessage: m.imageMessage } };
    else if (m.videoMessage?.viewOnce) viewOnceMsg = { message: { videoMessage: m.videoMessage } };
    else if (m.audioMessage?.viewOnce) viewOnceMsg = { message: { audioMessage: m.audioMessage } };
}

if (!viewOnceMsg) return;

    console.log('[ViewOnce] View-once DETECTED, proceeding to download...');

    try {
        const inner = viewOnceMsg.message;
        if (!inner) return;

        const actualMsg = inner.imageMessage || inner.videoMessage || inner.audioMessage || inner.audioMessageV2;
        if (!actualMsg) return;

        let type = '';
        if (inner.imageMessage)      type = 'image';
        else if (inner.videoMessage) type = 'video';
        else if (inner.audioMessage || inner.audioMessageV2) type = 'audio';

        const stream = await downloadContentFromMessage(actualMsg, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        if (buffer.length === 0) {
            console.log('[ViewOnce] Buffer was empty after download attempt');
            return;
        }

        const { saveToVault } = require('../techbros_data/vvVault');
        const senderJid = msg.key.participant || msg.key.remoteJid || '';
        const caption    = actualMsg.caption || '';

        await saveToVault(senderJid, msg.key.remoteJid, type, buffer, caption);
        console.log(`[ViewOnce] Silently vaulted ${type} from ${senderJid.split('@')[0]}`);
    } catch (err) {
        console.error('[ViewOnce] Failed to process or vault media:', err.message);
    }
}

// =====================
// STATUS BROADCAST (WITH DB CHECKS)
// =====================
async function handleStatusBroadcast(sock, msg) {
    if (msg.key.remoteJid !== 'status@broadcast') return false;
    if (!msg.key.participant) return true;

    try {
        const statusOwner = jidNormalizedUser(msg.key.participant);
        const myJid       = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const meJid       = jidNormalizedUser(sock.user.id);

        if (statusOwner === meJid) return true;

        let userSettings = null;
        if (techbros_getUserAutoStatus) {
            userSettings = await techbros_getUserAutoStatus(config.sessionId || 'session', statusOwner);
        }

        const shouldAutoView = userSettings?.autoStatusSeen ?? config.autoViewStatus;
        const shouldReact    = userSettings?.autoStatusReact ?? config.autoReactStatus;
        const shouldSave     = config.autoSaveStatus;

        if (shouldAutoView) {
            try {
                await sock.readMessages([msg.key]);
                console.log(`👁️ Auto-viewing: ${statusOwner.split('@')[0]}`);
            } catch (e) {}
        }

        if (shouldReact) {
            try {
                const pool = (config.customStatusReact && config.customStatusEmojis)
                    ? config.customStatusEmojis.split(',').map(e => e.trim()).filter(Boolean)
                    : ['❤️','🔥','✨','💯'];
                const emoji = pool[Math.floor(Math.random() * pool.length)];
                await sock.sendMessage('status@broadcast', { react: { text: emoji, key: msg.key } }, { statusJidList: [statusOwner] });
            } catch (e) {}
        }

        if (shouldSave && msg.message) {
            try {
                await sock.sendMessage(myJid, { forward: msg });
            } catch (e) {}
        }
    } catch (e) {}
    
    return true;
}

// =====================
// STATUS REPLY HANDLER
// =====================
async function handleStatusReply(sock, msg) {
    const statusCtx = msg.message?.extendedTextMessage?.contextInfo;
    if (statusCtx?.remoteJid !== 'status@broadcast') return false;

    const replyText = getReplyText(msg);
    const wantsSend = KEYWORDS.some(k => replyText === k || replyText.includes(k));

    if (!wantsSend) return true;

    try {
        let target = statusCtx.quotedMessage;
        if (!target) return true;

        if (target.viewOnceMessageV2?.message) target = target.viewOnceMessageV2.message;
        if (target.viewOnceMessage?.message)   target = target.viewOnceMessage.message;

        const isImage = !!target.imageMessage;
        const isVideo = !!target.videoMessage;
        const remoteJid = msg.key.remoteJid;

        if (isImage || isVideo) {
            const buffer = await downloadMediaMessage(
                { message: target },
                'buffer',
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );

            if (buffer) {
                await sock.sendMessage(remoteJid, {
                    [isImage ? 'image' : 'video']: buffer,
                    caption: target[isImage ? 'imageMessage' : 'videoMessage']?.caption || ''
                }, { quoted: msg });
            }
        }
    } catch (err) {
        console.error('[StatusReply] Failed:', err.message);
    }

    return true;
}

module.exports = { handleStatusBroadcast, handleStatusReply, handleViewOnce, getReplyText };