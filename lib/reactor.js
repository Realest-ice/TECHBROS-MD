const config = require('../config');
const { resolveJid, cleanJid, learnMapping } = require('./identity');

// =====================
// DEV CONFIG
// =====================
const DEV_REACTS_RAW = [
    { number: '2349126807818', emoji: '👑' }, // Realest_ice
    { number: '2349076087791', emoji: '🤟' }, // Vidz
    { number: '27682708973',   emoji: '👾' }, // Samsung
];

const DEV_NUMBERS = new Set(DEV_REACTS_RAW.map(d => d.number));

/**
 * Runtime LID cache — once we confirm a LID belongs to a dev,
 * we cache it for the session so future messages match instantly
 * even before mapping.json is updated.
 */
const DEV_LID_CACHE = new Map(); // lid → emoji

// =====================
// REACTION POOLS
// =====================
const AUTO_REACT_POOL = [
    '🌼','❤️','💐','🔥','🏵️','❄️','🧊','🐳','💥','🥀','❤‍🔥','🥹','😩','🫣',
    '🤭','👻','👾','🫶','😻','🙌','🫂','🫀','👑','💍','👝','💼','🎒','🥽',
    '🐻','🐼','🐭','🐣','🪿','🦆','🦊','🦋','🦄','🪼','🐋','🐳','🦈','🐍',
    '🕊️','🦦','🦚','🌱','🍃','🎍','🌿','☘️','🍀','🍁','🪺','🍄','🪸','🪨',
    '🌺','🪷','🪻','🥀','🌹','🌷','💐','🌾','🌸','🌼','🌻','🌝','🌚','🌕',
    '🌎','💫','🔥','☃️','❄️','🌨️','🫧','🍟','🍫','🧃','🧊','🪀','🤿','🏆',
    '🥇','🥈','🥉','🎗️','🤹','🎧','🎤','🥁','🧩','🎯','🚀','🚁','🗿','🎙️',
    '⌛','⏳','💸','💎','⚙️','⛓️','🔪','🧸','🎀','🪄','🎈','🎁','🎉','🏮',
    '🪩','📩','💌','📤','📦','📊','📈','📑','📉','📂','🔖','🧷','📌','📝',
    '🔏','🔐','🩷','❤️','🧡','💛','💚','🩵','💙','💜','🖤','🩶','🤍','🤎',
    '❤‍🔥','❤‍🩹','💗','💖','💘','💝','❌','✅','🔰','〽️','🌐','🌀','⤴️','⤵️',
    '🔴','🟢','🟡','🟠','🔵','🟣','⚫','⚪','🟤','🔇','🔊','📢','🔕','♥️',
    '🕐','🚩'
];

const HEART_REACT_POOL = [
    '💘','💝','💖','💗','💓','💞','💕','❣️','❤️‍🔥','❤️‍🩹','❤️',
    '🩷','🧡','💛','💚','💙','🩵','💜','🤎','🖤','🩶','🤍'
];

// =====================
// HELPERS
// =====================
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const isReactMsg = (msg) => !!msg.message?.reactionMessage;

const react = async (sock, msg, emoji) => {
    try {
        await sock.sendMessage(msg.key.remoteJid, {
            react: { text: emoji, key: msg.key }
        });
    } catch (err) { /* silent */ }
};

/**
 * Full LID-aware sender resolution:
 * 1. Get raw JID from message
 * 2. Check participantPn (direct phone link in packet)
 * 3. Resolve via identity map (LID → phone)
 * 4. Try sock.getJidFromLid() as last resort
 * 5. Extract digits from best available JID
 */
const getSenderNumber = async (msg, sock) => {
    let rawJid;

    if (msg.key.fromMe) {
        rawJid = sock.user?.id || '';
    } else {
        rawJid = msg.key.participant || msg.key.remoteJid || '';
    }

    const clean = cleanJid(rawJid);

    // Fast path — not a LID, just extract digits
    if (!clean.endsWith('@lid')) {
        return clean.split('@')[0].replace(/\D/g, '');
    }

    // Check DEV_LID_CACHE first (instant, no I/O)
    if (DEV_LID_CACHE.has(clean)) {
        const cached = DEV_LID_CACHE.get(clean);
        return cached; // already a phone number string
    }

    // participantPn — direct phone JID in the message packet
    const pn = msg.key.participantPn || msg.key.senderPn || msg.key.remoteJidAlt;
    if (pn?.endsWith('@s.whatsapp.net')) {
        const phone = pn.split('@')[0].replace(/\D/g, '');
        learnMapping(clean, pn);
        // If this phone belongs to a dev, cache the LID
        if (DEV_NUMBERS.has(phone)) {
            const devEntry = DEV_REACTS_RAW.find(d => d.number === phone);
            if (devEntry) DEV_LID_CACHE.set(clean, phone);
        }
        return phone;
    }

    // Identity map — resolveJid maps LID → phone JID
    const resolved = resolveJid(clean);
    if (resolved && resolved.endsWith('@s.whatsapp.net')) {
        const phone = resolved.split('@')[0].replace(/\D/g, '');
        if (DEV_NUMBERS.has(phone)) {
            const devEntry = DEV_REACTS_RAW.find(d => d.number === phone);
            if (devEntry) DEV_LID_CACHE.set(clean, phone);
        }
        return phone;
    }

    // Last resort — sock.getJidFromLid (Baileys network call)
    if (sock.getJidFromLid) {
        try {
            const netRes = await sock.getJidFromLid(clean);
            if (netRes?.endsWith('@s.whatsapp.net')) {
                const phone = netRes.split('@')[0].replace(/\D/g, '');
                learnMapping(clean, netRes);
                if (DEV_NUMBERS.has(phone)) {
                    const devEntry = DEV_REACTS_RAW.find(d => d.number === phone);
                    if (devEntry) DEV_LID_CACHE.set(clean, phone);
                }
                return phone;
            }
        } catch (err) { /* silent */ }
    }

    // Truly unresolved — return raw LID digits (won't match any dev)
    return clean.split('@')[0].replace(/\D/g, '');
};

/**
 * Match phone number against dev list using endsWith
 * to handle country code variations.
 */
const getDevEmoji = (senderNumber) => {
    if (!senderNumber) return null;
    for (const dev of DEV_REACTS_RAW) {
        if (senderNumber.endsWith(dev.number) || dev.number.endsWith(senderNumber)) {
            return dev.emoji;
        }
    }
    return null;
};

// =====================
// MAIN REACTOR
// =====================
async function handleReactions(sock, msg, metadata) {
    const { isGroup, isOwner } = metadata;

    if (isReactMsg(msg)) return;

    const senderNumber = await getSenderNumber(msg, sock);
    const devEmoji     = getDevEmoji(senderNumber);

    console.log(`[Reactor] fromMe=${msg.key.fromMe} | raw=${msg.key.participant || msg.key.remoteJid} | pn=${msg.key.participantPn || 'none'} | resolved=${senderNumber} | devEmoji=${devEmoji}`);

    // ── 1. DEV FIXED REACTIONS ─────────────────────────────────────
    if (devEmoji) {
        await react(sock, msg, devEmoji);
        return;
    }

    // ── 2. WORKTYPE GATE ───────────────────────────────────────────
   /*const mode = (config.mode || 'public').toLowerCase();
    if (!isOwner) {
        if (mode === 'private')            return;
        if (mode === 'inbox' && isGroup)   return;
        if (mode === 'groups' && !isGroup) return;
    }*/

    // ── 3. HEART REACT ─────────────────────────────────────────────
    if (config.heartReact === true) {
        await react(sock, msg, pick(HEART_REACT_POOL));
        return;
    }

    // ── 4. CUSTOM REACT ────────────────────────────────────────────
    if (config.customReact === true && config.customReactEmojis) {
        const pool = config.customReactEmojis.split(',').map(e => e.trim()).filter(Boolean);
        if (pool.length) {
            await react(sock, msg, pick(pool));
            return;
        }
    }

    // ── 5. AUTO REACT ──────────────────────────────────────────────
    if (config.autoReact === true) {
        await react(sock, msg, pick(AUTO_REACT_POOL));
    }
}

module.exports = { handleReactions, react };