/* 
 * TECHBROS-MD — ANTI-DELETE ENGINE V2
 * Architect: Realest_ice❄️ & TECHBROS
 * Protocol: Dual-Lane Routing + Deep Unwrapping + Memory Isolation
 */

const { isJidGroup, jidNormalizedUser } = require('@whiskeysockets/baileys');
const { getStoredMessage } = require('../techbros_data/messageStore');
const { getAntiDelete, getPath } = require('../techbros_data/antiDeleteDB');

const UI = {
    header:    `*🛑 ＴＥＣＨＢＲＯＳ ＡＮＴＩ-ＤＥＬＥＴＥ 🛑*`,
    divider:   `━━━━━━━━━━━━━━━━━━━━`,
    content:   `*📩 RECOVERED CONTENT:*`,
    media_tag: `*[ 📸 Recovered by TECHBROS MD ]*`
};

const getCoreMessage = (msgObj) => {
    let m = msgObj || {};
    const wrappers = ['ephemeralMessage', 'viewOnceMessageV2', 'viewOnceMessage', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage'];
    while (Object.keys(m).length > 0) {
        const type = Object.keys(m)[0];
        if (wrappers.includes(type) && m[type]?.message) m = m[type].message;
        else break;
    }
    return m;
};

const recoverText = async (sock, stored, jid, info, mentions) => {
    const core = getCoreMessage(stored.message);
    const text = core.conversation || core.extendedTextMessage?.text || '_Unknown content_';
    await sock.sendMessage(jid, {
        text:        `${info}\n${text}`,
        contextInfo: { mentionedJid: mentions }
    }, { quoted: stored });
};

const recoverMedia = async (sock, stored, jid, info, mentions) => {
    const core = getCoreMessage(stored.message);
    const type = Object.keys(core)[0];
    if (!type || !core[type]) return;

    const caption = core[type].caption || '';
    const fullCaption = `${info}${caption ? '\n\n*📝 Caption:* ' + caption : ''}\n\n${UI.media_tag}`;

    // Use cached buffer if we have it — this is the reliable path
    if (stored.mediaBuffer) {
        try {
            const sendPayload = { caption: fullCaption, contextInfo: { mentionedJid: mentions } };

            if (type === 'imageMessage') {
                sendPayload.image = stored.mediaBuffer;
            } else if (type === 'videoMessage' || type === 'ptvMessage') {
                sendPayload.video = stored.mediaBuffer;
            } else if (type === 'documentMessage') {
                sendPayload.document = stored.mediaBuffer;
                sendPayload.fileName = core[type].fileName || 'file';
                sendPayload.mimetype = core[type].mimetype;
            } else {
                sendPayload.image = stored.mediaBuffer; // fallback
            }

            await sock.sendMessage(jid, sendPayload, { quoted: stored });
            return;
        } catch (e) {
            console.error('[AntiDelete] Send from buffer failed:', e.message);
        }
    }

    // No cached buffer available — fallback to text-only notice
    await sock.sendMessage(jid, {
        text:        `${info}\n${UI.media_tag}\n\n_⚠️ Media unavailable (not cached or too large)_`,
        contextInfo: { mentionedJid: mentions }
    });
};

// Single update handler — called once per deleted message
async function handleAntiDelete(sock, update) {
    try {
        if (!update?.key?.remoteJid) return;

        const chatJid = update.key.remoteJid;
        const msgId   = update.key.id;
        if (!chatJid || !msgId) return;

        const stored = await getStoredMessage(chatJid, msgId);
        if (!stored?.message) {
            console.log(`[AntiDelete] No stored copy for ${msgId}`);
            return;
        }

        const isGroup  = isJidGroup(chatJid);
        const isStatus = chatJid === 'status@broadcast';
        const origin   = isStatus ? 'dm' : (isGroup ? 'gc' : 'dm');

        const enabled = await getAntiDelete(origin);
        if (!enabled) return;

        const myJid = jidNormalizedUser(sock.user.id);

        let senderJid = stored.key?.fromMe
            ? myJid
            : jidNormalizedUser(stored.key?.participant || stored.key?.remoteJid || chatJid);

        let deleterJid = update.key?.fromMe
            ? myJid
            : jidNormalizedUser(update.key?.participant || senderJid);

        // Skip recovery if you deleted your own message yourself
        if (senderJid === myJid && deleterJid === myJid) {
            console.log('[AntiDelete] Skipped — self-deletion by bot owner');
            return;
        }

        const senderNum  = senderJid?.split('@')[0] || 'Unknown';
        const deleterNum = deleterJid?.split('@')[0] || 'Unknown';

        const time = new Date().toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        let groupLine = '';
        if (isGroup) {
            const meta = await sock.groupMetadata(chatJid).catch(() => null);
            groupLine  = `*👥 Group:* ${meta?.subject || 'Unknown'}\n`;
        }

        const info =
`${UI.header}
${UI.divider}
${groupLine}*👤 Sender:* @${senderNum}
*🗑️ Deleted by:* @${deleterNum}
*🕒 Time:* ${time}
${UI.divider}
${UI.content}`;

        const mentions  = [senderJid, deleterJid].filter(Boolean);
        const path      = await getPath('delete');
        const targetJid = isStatus || path === 'log' ? myJid : chatJid;

        const coreMsg = getCoreMessage(stored.message);
        const msgType = Object.keys(coreMsg)[0] || '';
        const isText  = msgType === 'conversation' || msgType === 'extendedTextMessage';

        if (isText) {
            await recoverText(sock, stored, targetJid, info, mentions);
        } else {
            await recoverMedia(sock, stored, targetJid, info, mentions);
        }

        console.log(`[AntiDelete] ✅ Recovered ${msgType} from +${senderNum}`);
    } catch (e) {
        console.error('[AntiDelete] Failed:', e.message);
    }
}

module.exports = { handleAntiDelete };