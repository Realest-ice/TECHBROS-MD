const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('../config');
const { resolveJid, cleanJid, isBot } = require('./identity');

// =====================
// NORMALIZE
// Resolves LID → phone then normalizes
// =====================
const normalize = (jid) => {
    if (!jid) return '';
    const cleaned = cleanJid(jid);
    const resolved = resolveJid(cleaned);
    return jidNormalizedUser(resolved);
};

// =====================
// PERMISSIONS
// =====================
const isOwner = (jid) => {
    return config.owners.includes(normalize(jid));
};

const isSudo = (jid) => {
    const id = normalize(jid);
    return config.sudos.includes(id) || isOwner(id);
};

const isDev = (jid) => {
    return config.devs.includes(normalize(jid));
};

const getRole = (jid) => {
    if (isDev(jid))   return 'dev';
    if (isOwner(jid)) return 'owner';
    if (isSudo(jid))  return 'sudo';
    return 'user';
};

const isGroup = (jid) => {
    return jid?.endsWith('@g.us');
};

/**
 * Uses identity.isBot() — checks both phone JID and LID.
 * Replaces the old isMe(jid, botId) that only checked phone.
 */
const isMe = (jid, sock) => {
    return isBot(jid, sock);
};

/**
 * LID-aware admin check.
 * Checks participant by phone JID, LID, and cleaned LID (strips :60 suffix).
 */
const isAdmin = async (sock, jid, groupJid) => {
    if (!isGroup(groupJid)) return false;

    try {
        const meta = await sock.groupMetadata(groupJid);
        const target = normalize(jid);

        // Also get the raw cleaned JID in case it's a LID that isn't mapped yet
        const targetClean = cleanJid(jid);

        const participant = meta.participants.find(p => {
            const pNorm     = normalize(p.id);
            const pLidNorm  = p.lid ? normalize(p.lid) : null;
            const pLidClean = p.lid ? cleanJid(p.lid) : null;

            return (
                pNorm === target ||
                pLidNorm === target ||
                pLidClean === targetClean ||
                // reverse: target might be a LID, participant id is phone
                normalize(p.id) === normalize(resolveJid(targetClean))
            );
        });

        if (!participant) return false;

        return (
            participant.admin === 'admin' ||
            participant.admin === 'superadmin'
        );
    } catch (err) {
        console.error('[Utils] isAdmin error:', err.message);
        return false;
    }
};

/**
 * LID-aware bot admin check.
 * Checks sock.user.id AND sock.user.lid against group admins.
 */
const isBotAdmin = async (sock, groupJid) => {
    if (!isGroup(groupJid)) return false;

    try {
        const meta = await sock.groupMetadata(groupJid);
        const botPhone = jidNormalizedUser(cleanJid(sock.user.id));
        const botLid   = sock.user.lid ? cleanJid(sock.user.lid) : null;

        const botParticipant = meta.participants.find(p => {
            const pNorm    = jidNormalizedUser(cleanJid(p.id));
            const pLidNorm = p.lid ? jidNormalizedUser(cleanJid(p.lid)) : null;

            return (
                pNorm === botPhone ||
                (botLid && pLidNorm === jidNormalizedUser(botLid)) ||
                (botLid && jidNormalizedUser(cleanJid(p.id)) === jidNormalizedUser(botLid))
            );
        });

        if (!botParticipant) return false;

        return (
            botParticipant.admin === 'admin' ||
            botParticipant.admin === 'superadmin'
        );
    } catch (err) {
        console.error('[Utils] isBotAdmin error:', err.message);
        return false;
    }
};

// =====================
// EXTRA UTILITIES
// =====================

const getGroupAdmins = (participants = []) => {
    return participants
        .filter(p => p.admin)
        .map(p => p.id);
};

const getMentionedUsers = (msg) => {
    return (
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
        []
    );
};

const getQuotedUser = (msg) => {
    return (
        msg.message?.extendedTextMessage?.contextInfo?.participant ||
        null
    );
};

const getText = (msg) => {
    return (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        ''
    );
};

const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

const formatRuntime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

const parseJid = (jid) => {
    return cleanJid(jid).split('@')[0];
};

// =====================
// TIME & DATE UTILS
// =====================

/**
 * Get greeting based on hour
 */
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 🌅';
    if (hour < 17) return 'Good Afternoon ☀️';
    if (hour < 21) return 'Good Evening 🌆';
    return 'Good Night 🌙';
};

/**
 * Get formatted current time
 * e.g. 10:19 PM
 */
const getTime = (timezone = 'Africa/Lagos') => {
    return new Date().toLocaleTimeString('en-US', {
        hour:     '2-digit',
        minute:   '2-digit',
        hour12:   true,
        timeZone: timezone
    });
};

/**
 * Get formatted current date
 * e.g. Friday, June 26 2026
 */
const getDate = (timezone = 'Africa/Lagos') => {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year:    'numeric',
        month:   'long',
        day:     'numeric',
        timeZone: timezone
    });
};

/**
 * Get both time and date formatted
 */
const getDateTime = (timezone = 'Africa/Lagos') => {
    return {
        time:     getTime(timezone),
        date:     getDate(timezone),
        greeting: getGreeting()
    };
};

// =====================
// EXPORTS
// =====================
module.exports = {
    getGreeting,
    getTime,
    getDate,
    getDateTime,
    isOwner,
    isSudo,
    isDev,
    getRole,
    isGroup,
    isMe,
    isAdmin,
    isBotAdmin,
    getGroupAdmins,
    getMentionedUsers,
    getQuotedUser,
    getText,
    formatRuntime,
    formatBytes,
    sleep,
    parseJid,
    normalize
};