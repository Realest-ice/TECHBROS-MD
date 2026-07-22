/*
 * TECHBROS-MD — Owner & Profile Utility Commands
 * .owner (vcard) | .whois | .getpp | .jid | .pp (normal cropped profile pic)
 */

const { register } = require('../commands');
const config = require('../config');

// ── SHARED HELPER — resolve a LID to a real phone JID ───────────
async function resolveTargetJid(sock, targetJid, remoteJid, isGroup) {
    if (!targetJid || !targetJid.endsWith('@lid')) return targetJid;

    const identity = require('../lib/identity');
    let resolved = null;

    // 1. Try group metadata first (most reliable — WhatsApp gives phone + lid together)
    if (isGroup) {
        try {
            const groupMeta = await sock.groupMetadata(remoteJid);
            const match = groupMeta?.participants?.find(p => p.lid === targetJid || p.id === targetJid);
            resolved = match?.pn || match?.phoneNumber || null;
        } catch (e) { /* fall through */ }
    }

    // 2. Fall back to your own learned identity cache
    if (!resolved) {
        try {
            const cached = identity.resolveJid(identity.cleanJid(targetJid));
            if (cached && !cached.endsWith('@lid')) resolved = cached;
        } catch (e) { /* fall through */ }
    }

    // 3. Last resort — retry-based live resolution (slower, but tries harder)
    if (!resolved && isGroup) {
        try {
            const profile = await identity.resolveWithRetry(sock, remoteJid, targetJid);
            if (profile?.phone) resolved = profile.phone;
        } catch (e) { /* fall through */ }
    }

    return resolved || targetJid;
}

// ── OWNER — send vcard contact card ────────────────────────────
register({
    name: 'owner',
    category: 'general',
    desc: 'Get bot owner contact card',
    react: '👑'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;

    try {
        const ownerJid = config.owners?.[0] || '';
        const ownerNumber = ownerJid ? ownerJid.split('@')[0] : 'Unknown';
        const botName = config.botName || 'TECHBROS-MD';

        const vcard =
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${config.ownerName || 'TECHBROS Owner'}\n` +
            `ORG:${botName};\n` +
            `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\n` +
            'END:VCARD';

        await sock.sendMessage(remoteJid, {
            contacts: {
                displayName: config.ownerName || 'TECHBROS Owner',
                contacts: [{ vcard }]
            }
        });
    } catch (err) {
        console.error('[Owner] Error:', err.message);
        await sock.sendMessage(remoteJid, { text: `❌ Failed: ${err.message}` });
    }
});

// ── WHOIS — full profile lookup, resolves LID first ─────────────
register({
    name: 'whois',
    aliases: ['profile'],
    category: 'owner',
    desc: "Get someone's full profile details",
    ownerOnly: true,
    react: '👀'
}, async (sock, msg, metadata) => {
    const { remoteJid, quoted, isGroup } = metadata;

    try {
        let targetJid = quoted?.key?.participant || quoted?.key?.remoteJid || remoteJid;

        if (!targetJid) {
            return sock.sendMessage(remoteJid, { text: '❌ Please reply to a user\'s message!' });
        }

        targetJid = await resolveTargetJid(sock, targetJid, remoteJid, isGroup);

        if (targetJid.endsWith('@lid')) {
            return sock.sendMessage(remoteJid, {
                text: '❌ Can\'t resolve this user\'s real number — no shared group or prior chat history to reference.'
            });
        }

        let profilePictureUrl = 'https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg';
        let statusText = 'Not available';
        let formattedDate = 'Not available';
        let number = targetJid.split('@')[0];
        let businessInfo = '';

        try {
    const pic = await sock.profilePictureUrl(targetJid, 'image');
    if (pic) profilePictureUrl = pic;
} catch (e) {
    console.error('[Whois] profilePictureUrl failed for', targetJid, '-', e.message);
}

        try {
            const statusData = await sock.fetchStatus(targetJid);
            if (statusData?.status) {
                statusText = statusData.status;
                if (statusData.setAt) {
                    const ts = new Date(statusData.setAt);
                    if (!isNaN(ts.getTime())) {
                        formattedDate = ts.toLocaleString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        });
                    }
                }
            }
        } catch (e) { /* can't fetch status */ }

        try {
            const bizProfile = await sock.getBusinessProfile(targetJid);
            if (bizProfile) {
                businessInfo = `\n\n*🏢 Business Info:*\n`;
                if (bizProfile.description) businessInfo += `*• About:* ${bizProfile.description}\n`;
                if (bizProfile.category) businessInfo += `*• Category:* ${bizProfile.category}\n`;
                if (bizProfile.email) businessInfo += `*• Email:* ${bizProfile.email}\n`;
                if (bizProfile.website?.length) businessInfo += `*• Website:* ${bizProfile.website[0]}\n`;
                if (bizProfile.address) businessInfo += `*• Address:* ${bizProfile.address}\n`;
            }
        } catch (e) { /* not a business account */ }

        const caption =
            `*👤 User Profile Information*\n\n` +
            `*• Number:* ${number}\n` +
            `*• About:* ${statusText}\n` +
            `*• Last Updated:* ${formattedDate}` +
            businessInfo;

        try {
            await sock.sendMessage(remoteJid, { image: { url: profilePictureUrl }, caption });
        } catch (sendErr) {
            await sock.sendMessage(remoteJid, { text: caption });
        }

    } catch (err) {
        console.error('[Whois] Unexpected error:', err.message);
        await sock.sendMessage(remoteJid, { text: `❌ Something went wrong: ${err.message}` });
    }
});

// ── GETPP — download someone's profile picture, resolves LID first
register({
    name: 'getpp',
    aliases: ['stealpp', 'snatchpp'],
    category: 'owner',
    desc: "Download someone's profile picture",
    ownerOnly: true,
    react: '👀'
}, async (sock, msg, metadata) => {
    const { remoteJid, quoted, isGroup } = metadata;

    try {
        let targetJid = quoted?.key?.participant || quoted?.key?.remoteJid;
        if (!targetJid) {
            return sock.sendMessage(remoteJid, { text: '❌ Please reply to a user\'s message!' });
        }

        targetJid = await resolveTargetJid(sock, targetJid, remoteJid, isGroup);

        if (targetJid.endsWith('@lid')) {
            return sock.sendMessage(remoteJid, {
                text: '❌ Can\'t resolve this user\'s real number — no shared group or prior chat history to reference.'
            });
        }

        let profilePictureUrl = null;
        try {
            profilePictureUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (e) { /* private or no pic */ }

        if (!profilePictureUrl) {
            return sock.sendMessage(remoteJid, { text: '❌ User has no profile picture or it\'s genuinely set to private!' });
        }

        try {
            await sock.sendMessage(remoteJid, { image: { url: profilePictureUrl }, caption: 'Here is the profile picture' });
        } catch (sendErr) {
            await sock.sendMessage(remoteJid, { text: `❌ Found the picture but failed to send it: ${sendErr.message}` });
        }
    } catch (err) {
        console.error('[GetPP] Unexpected error:', err.message);
        await sock.sendMessage(remoteJid, { text: `❌ Something went wrong: ${err.message}` });
    }
});

// ── JID — get JID for current chat / quoted user / phone number ─
register({
    name: 'jid',
    category: 'owner',
    desc: 'Get user/group JID',
    ownerOnly: true,
    react: '👑'
}, async (sock, msg, metadata) => {
    const { remoteJid, quoted, args, isGroup } = metadata;

    try {
        let result;
        let label;

        const input = args?.[0]?.trim();

        if (input) {
            const phoneMatch = input.match(/^\+?(\d{6,15})$/);
            const groupLinkMatch = input.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);

            if (groupLinkMatch) {
                try {
                    const meta = await sock.groupGetInviteInfo(groupLinkMatch[1]);
                    result = meta?.id;
                    label = 'Group JID';
                } catch (e) { /* handled below */ }

                if (!result) {
                    return sock.sendMessage(remoteJid, { text: '❌ Could not resolve group JID from that link.' });
                }
            } else if (phoneMatch) {
                try {
                    const [check] = await sock.onWhatsApp(phoneMatch[1]);
                    if (check?.exists) {
                        result = check.jid;
                        label = 'User JID';
                    } else {
                        return sock.sendMessage(remoteJid, { text: `❌ ${phoneMatch[1]} is not registered on WhatsApp.` });
                    }
                } catch (e) {
                    result = `${phoneMatch[1]}@s.whatsapp.net`;
                    label = 'User JID (unverified)';
                }
            } else {
                return sock.sendMessage(remoteJid, {
                    text: `❌ Unrecognized input.\n\nUsage:\n• *.jid* — current chat\n• *.jid 2349126807818* — user JID\n• *.jid chat.whatsapp.com/CODE* — group JID\n• Reply to a message`
                });
            }
        } else if (quoted) {
            result = await resolveTargetJid(sock, quoted?.key?.participant || quoted?.key?.remoteJid, remoteJid, isGroup);
            label = 'User JID';
        } else {
            result = remoteJid;
            label = isGroup ? 'Group JID' : 'User JID';
        }

        if (!result) {
            return sock.sendMessage(remoteJid, { text: '❌ Could not determine a JID from that.' });
        }

        await sock.sendMessage(remoteJid, { text: `*${label}*\n\n\`\`\`${result}\`\`\`` });
    } catch (err) {
        console.error('[JID] Unexpected error:', err.message);
        await sock.sendMessage(remoteJid, { text: `❌ Something went wrong: ${err.message}` });
    }
});

// ── PP — set a NORMAL (cropped) bot profile picture ─────────────
register({
    name: 'pp',
    category: 'owner',
    desc: 'Set a normal (cropped square) profile picture',
    ownerOnly: true,
    react: '🖼️'
}, async (sock, msg, metadata) => {
    const { remoteJid, quoted } = metadata;

    try {
        const { downloadMediaMessage } = require('@whiskeysockets/baileys');

        const quotedImg = quoted?.message?.imageMessage || msg.message?.imageMessage;
        if (!quotedImg) {
            return sock.sendMessage(remoteJid, { text: '📸 Quote an image to set as profile picture.' });
        }

        const targetMsg = quoted?.message?.imageMessage ? quoted : msg;

        const buffer = await downloadMediaMessage(
            targetMsg,
            'buffer',
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        try {
            await sock.updateProfilePicture(sock.user.id, buffer);
            await sock.sendMessage(remoteJid, { text: '✅ Profile picture updated!' });
        } catch (modernErr) {
            const iqNode = {
                tag: 'iq',
                attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'w:profile:picture' },
                content: [{ tag: 'picture', attrs: { type: 'image' }, content: buffer }]
            };
            await sock.query(iqNode);
            await sock.sendMessage(remoteJid, { text: '✅ Profile picture updated (legacy method)!' });
        }
    } catch (err) {
        console.error('[PP] Error:', err.message);
        await sock.sendMessage(remoteJid, { text: `❌ Failed to update profile picture: ${err.message}` });
    }
});

module.exports = {};