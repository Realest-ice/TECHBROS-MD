/*
 * TECHBROS-MD — Group Handler
 * Welcome, Goodbye, Promote, Demote events
 * Fast: parallel fetches, group pp fallback, proper mentions
 */

const { isJidGroup } = require('@whiskeysockets/baileys');
const { parseJid } = require('./utils');
const { getWelcome, getBadWords, getGroupSettings, getSpamRecord, updateSpamRecord } = require('../techbros_data/groupData');
const { getDateTime } = require('./utils');
const config = require('../config');
const identity = require('./identity'); // adjust path if identity.js isn't in the same folder
const enqueueSend = require('./rateLimiter');
const { getCachedGroupMetadata } = require('./groupCache');

// ── FALLBACK IMAGES ────────────────────────────────────────────
const FALLBACK_IMGS = [
    'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg',
    config.aliveImg || 'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg',
];
const randomFallback = () => FALLBACK_IMGS[Math.floor(Math.random() * FALLBACK_IMGS.length)];

// ── SAFE PROFILE PIC ───────────────────────────────────────────
const getPP = async (sock, jid) => {
    try { return await sock.profilePictureUrl(jid, 'image'); }
    catch { return null; }
};

// ── FORMAT MESSAGE ─────────────────────────────────────────────
const fmt = (template, userNum, groupName) =>
    template
        .replace(/@user/g,  `@${userNum}`)
        .replace(/@group/g, groupName);

// =====================
// MAIN GROUP EVENT HANDLER
// =====================
async function handleGroupParticipants(sock, event) {
    const { id: groupJid, participants, action, author } = event;
    if (!isJidGroup(groupJid)) return;

    const participantJids = participants.map(p =>
    typeof p === 'string' ? p : p?.phoneNumber || p?.id
).filter(Boolean);

    const [metaResult, groupPpResult, ...ppResults] = await Promise.allSettled([
        getCachedGroupMetadata(sock, groupJid),
        getPP(sock, groupJid),
        ...participantJids.map(jid => getPP(sock, jid))
    ]);

    const meta          = metaResult.status === 'fulfilled' ? metaResult.value : null;
    const groupName     = meta?.subject || 'the group';
    const memberCount   = meta?.participants?.length || 0;
    const groupDesc     = meta?.desc || 'No description';
    const groupPp       = groupPpResult.status === 'fulfilled' ? groupPpResult.value : null;
    const { time, date } = getDateTime(config.timezone || 'Africa/Lagos');

    for (let i = 0; i < participantJids.length; i++) {
        const participant = participantJids[i];

        let userNum;
if (participant.endsWith('@lid')) {
    const profile = await identity.resolveWithRetry(sock, groupJid, participant);
    userNum = profile?.phone ? parseJid(profile.phone) : parseJid(participant);
} else {
    userNum = parseJid(participant); // already a phone number — instant
}

        const userPp   = ppResults[i]?.status === 'fulfilled' ? ppResults[i].value : null;
        const thumbUrl = userPp || groupPp || randomFallback();

        try {
            // ── WELCOME ───────────────────────────────────────
            if (action === 'add') {
                const w = await getWelcome(groupJid).catch(() => null);
                const d = w?.dataValues || w || {};
                if (!d.welcomeOn) continue;

                const template = d.welcomeMsg ||
                    `👋 Welcome @user to *@group*!\n\nYou are member *#${memberCount}*\n📅 ${date} • 🕐 ${time}\n\n📝 *Description:*\n${groupDesc}`;

                const text = fmt(template, userNum, groupName);

                await enqueueSend(sock, groupJid, {
                  image:   { url: thumbUrl },
                  caption: text,
                  mentions: [participant]
             });
            }

            // ── GOODBYE ───────────────────────────────────────
            else if (action === 'remove') {
                const w = await getWelcome(groupJid).catch(() => null);
                const d = w?.dataValues || w || {};
                if (!d.goodbyeOn) continue;

                const template = d.goodbyeMsg ||
                    `👋 @user has left *@group*\n\n📅 ${date} • 🕐 ${time}\n\nThe group now has *${memberCount} members*. Goodbye! 😔`;

                const text = fmt(template, userNum, groupName);

                await enqueueSend(sock,groupJid, {
                    image:   { url: thumbUrl },
                    caption: text,
                    mentions: [participant]
                });
            }

            // ── PROMOTE ───────────────────────────────────────
            else if (action === 'promote') {
                const authorNum = author ? parseJid(author) : null;
                const mentions  = author ? [participant, author] : [participant];

                const text =
`👑 *ADMIN PROMOTED*

🎉 @${userNum} is now an *Admin!*
${authorNum ? `👤 Promoted by: @${authorNum}` : ''}
🏠 Group: ${groupName}
👥 Members: ${memberCount}
📅 ${date} • 🕐 ${time}

_Congratulations! 🎊_`;

                await enqueueSend(sock, groupJid, {
                    image:   { url: thumbUrl },
                    caption: text,
                    mentions
                });
            }

            // ── DEMOTE ────────────────────────────────────────
            else if (action === 'demote') {
                const authorNum = author ? parseJid(author) : null;
                const mentions  = author ? [participant, author] : [participant];

                const text =
`📉 *ADMIN DEMOTED*

😔 @${userNum} is no longer an *Admin*
${authorNum ? `👤 Demoted by: @${authorNum}` : ''}
🏠 Group: ${groupName}
👥 Members: ${memberCount}
📅 ${date} • 🕐 ${time}`;

                await enqueueSend(sock, groupJid, {
                    image:   { url: thumbUrl },
                    caption: text,
                    mentions
                });
            }

        } catch (e) {
            console.error(`[GroupEvent:${action}]`, e.message);
        }
    }
}

// =====================
// MESSAGE EVENT HANDLER
// Antilink, antispam, antibadword
// =====================
async function handleGroupEvents(sock, msg, metadata) {
    const { remoteJid, sender, isAdmin: senderIsAdmin, botIsAdmin, isDev, isOwner } = metadata;
    if (!remoteJid?.endsWith('@g.us')) return;
    if (isDev || isOwner || senderIsAdmin) return;

    const body = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption || ''
    ).toLowerCase();

    const settings = await getGroupSettings(remoteJid).catch(() => null);
    if (!settings) return;
    const s = settings?.dataValues || settings || {};

    // ANTILINK
    if (s.antilink && botIsAdmin) {
        if (/chat\.whatsapp\.com\/[A-Za-z0-9]+/i.test(body)) {
            try {
                await sock.sendMessage(remoteJid, { delete: msg.key });
                await sock.sendMessage(remoteJid, {
                    text:     `⚠️ @${parseJid(sender)} links are not allowed here!`,
                    mentions: [sender]
                });
            } catch (e) { console.error('[Antilink]', e.message); }
            return;
        }
    }

  // ANTISPAM
    if (s.antispam && botIsAdmin) {
        const now      = Date.now();
        const interval = (s.spamSecs || 5) * 1000;

        const record = await getSpamRecord(remoteJid, sender);
        const msgs   = JSON.parse(record.timestamps || '[]').filter(t => now - t < interval);
        msgs.push(now);

        if (msgs.length >= (s.spamMax || 5)) {
            await updateSpamRecord(remoteJid, sender, []); // reset after kicking
            try {
                await sock.groupParticipantsUpdate(remoteJid, [sender], 'remove');
                await sock.sendMessage(remoteJid, {
                    text:     `🛡️ @${parseJid(sender)} removed for spamming.`,
                    mentions: [sender]
                });
            } catch (e) { console.error('[Antispam]', e.message); }
            return;
        } else {
            await updateSpamRecord(remoteJid, sender, msgs); // save updated count
        }
    }
    
    // ANTI BAD WORD
    if (botIsAdmin) {
        const bw    = await getBadWords(remoteJid).catch(() => null);
        const bd    = bw?.dataValues || bw || {};
        const words = bd.enabled ? (bd.words || '').split(',').filter(Boolean) : [];
        if (words.length && words.some(w => body.includes(w))) {
            try {
                await sock.sendMessage(remoteJid, { delete: msg.key });
                await sock.sendMessage(remoteJid, {
                    text:     `⚠️ @${parseJid(sender)} watch your language!`,
                    mentions: [sender]
                });
            } catch (e) { console.error('[AntiBadWord]', e.message); }
        }
    }
}

module.exports = { handleGroupEvents, handleGroupParticipants };