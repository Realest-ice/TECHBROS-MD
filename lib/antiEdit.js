/*
 * TECHBROS-MD — Anti Edit
 * Catches edited messages via messages.update protocolMessage type 14
 * Handles both text edits and media caption edits
 */

const { isJidGroup } = require('@whiskeysockets/baileys');
const { getStoredMessage } = require('../techbros_data/messageStore');
const { getAntiEdit, getPath } = require('../techbros_data/antiDeleteDB');

const extractContent = (msgObj) => {
    if (!msgObj) return '';
    return (
        msgObj.conversation ||
        msgObj.extendedTextMessage?.text ||
        msgObj.imageMessage?.caption ||
        msgObj.videoMessage?.caption ||
        msgObj.documentMessage?.caption ||
        ''
    );
};

async function handleAntiEdit(sock, msg) {
    const proto           = msg.message?.protocolMessage;
    const isEditProtocol  = proto?.type === 14 || proto?.type === 'MESSAGE_EDIT';
    const editedWrapper   = msg.message?.editedMessage;

    if (!isEditProtocol && !editedWrapper) return;

    const chatJid = msg.key.remoteJid;
    if (!chatJid) return;

    const isGroup = isJidGroup(chatJid);
    const anti    = await getAntiEdit(isGroup ? 'gc' : 'dm');
    if (!anti) return;

    const originalKey = proto?.key || editedWrapper?.key;
    if (!originalKey?.id) return;

    const stored = await getStoredMessage(chatJid, originalKey.id);
    if (!stored) {
        console.log(`[AntiEdit] No stored copy for ${originalKey.id}`);
        return;
    }

    const originalText = extractContent(stored.message);
    const newMsg        = proto?.editedMessage || editedWrapper?.message;
    const newText        = extractContent(newMsg);

    if (!originalText || !newText || originalText === newText) return;

    const editTime  = new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const senderJid = stored.key.participant || stored.key.remoteJid;
    const senderNum = senderJid?.split('@')[0];
    const myJid     = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const path      = await getPath('edit'); // log | chat

    const isCaption = !!(
        stored.message?.imageMessage?.caption ||
        stored.message?.videoMessage?.caption ||
        stored.message?.documentMessage?.caption
    );
    const label = isCaption ? 'Caption' : 'Message';

    let header, mentions;

    if (isGroup) {
        const meta      = await sock.groupMetadata(chatJid).catch(() => null);
        const groupName = meta?.subject || 'Unknown Group';
        header   = `✏️ *AntiEdit Detected*\n\n*Time:* ${editTime}\n*Group:* ${groupName}\n*Edited by:* @${senderNum}`;
    } else {
        header   = `✏️ *AntiEdit Detected*\n\n*Time:* ${editTime}\n*Edited by:* @${senderNum}`;
    }
    mentions = [senderJid];

    const targetJid = path === 'log' ? myJid : chatJid;

    try {
        await sock.sendMessage(targetJid, {
            text: `${header}\n\n*Before ${label}:*\n${originalText}\n\n*After ${label}:*\n${newText}`,
            mentions
        });
        console.log(`[AntiEdit] Caught ${label.toLowerCase()} edit from +${senderNum}`);
    } catch (e) {
        console.error('[AntiEdit] Send failed:', e.message);
    }
}

module.exports = { handleAntiEdit };