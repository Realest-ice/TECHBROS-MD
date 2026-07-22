const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

const sessionDir = path.join(__dirname, '../session');
const MAPPING_FILE  = path.join(sessionDir, 'mapping.json');
const PROFILES_FILE = path.join(sessionDir, 'profiles.json');

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

// =====================
// PERSISTENCE
// =====================
let mapping  = {};  // LID/phone → profileId
let profiles = {};  // profileId → { name, phone, lid, joinedAt }

const loadJSON = (file) => {
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { console.error(`[Identity] Failed to load ${path.basename(file)}:`, e.message); }
    return {};
};

mapping  = loadJSON(MAPPING_FILE);
profiles = loadJSON(PROFILES_FILE);

let saveMappingQueued  = false;
let saveProfilesQueued = false;

const saveMapping = async () => {
    if (saveMappingQueued) return;
    saveMappingQueued = true;
    setTimeout(async () => {
        try { await fsPromises.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2)); }
        catch (e) { console.error('[Identity] Save mapping failed:', e.message); }
        finally { saveMappingQueued = false; }
    }, 500);
};

const saveProfiles = async () => {
    if (saveProfilesQueued) return;
    saveProfilesQueued = true;
    setTimeout(async () => {
        try { await fsPromises.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2)); }
        catch (e) { console.error('[Identity] Save profiles failed:', e.message); }
        finally { saveProfilesQueued = false; }
    }, 500);
};

// =====================
// HELPERS
// =====================

/**
 * Strip device suffix: "86252036616270:11@lid" → "86252036616270@lid"
 */
function cleanJid(jid = '') {
    if (!jid) return '';
    return jid.replace(/:\d+@/, '@');
}

function normalizeJid(jid) {
    if (!jid) return '';
    return jidNormalizedUser(cleanJid(jid));
}

// =====================
// PROFILE SYSTEM
// =====================

function generateId() {
    return 'u_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Core resolver — takes primary JID (LID or phone) + optional alt JID + pushName.
 * Auto-creates profile on first contact. Links both JIDs to same profile.
 * Returns the profile object.
 */
function resolveProfile(primaryJid, altJid, pushName) {
    const primary = normalizeJid(primaryJid);
    const alt     = altJid ? normalizeJid(altJid) : null;

    // Step 1: Check primary JID
    let profileId = mapping[primary];

    // Step 2: Check alt JID — if found, link primary to same profile
    if (!profileId && alt) {
        profileId = mapping[alt];
        if (profileId) {
            mapping[primary] = profileId;
            saveMapping();

            // Update profile with newly discovered phone/LID
            if (profiles[profileId]) {
                if (primary.endsWith('@s.whatsapp.net') && !profiles[profileId].phone) {
                    profiles[profileId].phone = primary;
                    saveProfiles();
                }
                if (primary.endsWith('@lid') && !profiles[profileId].lid) {
                    profiles[profileId].lid = primary;
                    saveProfiles();
                }
            }
            console.log(`[Identity] Linked new JID ${primary} → profile ${profileId}`);
        }
    }

    // Step 3: Brand new user — auto-create profile
    if (!profileId) {
        profileId = generateId();
        const name = pushName || 'WhatsApp User';

        profiles[profileId] = {
            name,
            phone: primary.endsWith('@s.whatsapp.net') ? primary : (alt?.endsWith('@s.whatsapp.net') ? alt : null),
            lid:   primary.endsWith('@lid') ? primary : (alt?.endsWith('@lid') ? alt : null),
            joinedAt: new Date().toISOString()
        };

        mapping[primary] = profileId;
        if (alt) mapping[alt] = profileId;

        saveMapping();
        saveProfiles();
        console.log(`[Identity] Auto-registered: "${name}" → ${profileId} (${primary})`);
    }

    return profiles[profileId];
}

/**
 * Resolve a JID to its canonical phone JID.
 * Falls back to the normalized JID if unmapped.
 */
function resolveJid(jid) {
    if (!jid) return null;
    const normalized = normalizeJid(jid);
    // Check if we have a profile with a phone for this JID
    const profileId = mapping[normalized];
    if (profileId && profiles[profileId]?.phone) {
        return profiles[profileId].phone;
    }
    // Fall back to old flat mapping for backwards compat
    return mapping[normalized] || normalized;
}

/**
 * Learn a direct LID → phone mapping (legacy flat map, still useful).
 */
function learnMapping(lid, phoneJid) {
    if (!lid || !phoneJid) return;
    const cleanLid   = cleanJid(lid);
    const cleanPhone = cleanJid(phoneJid);
    if (!cleanLid.endsWith('@lid')) return;
    if (!cleanPhone.endsWith('@s.whatsapp.net')) return;

    const nLid   = normalizeJid(cleanLid);
    const nPhone = normalizeJid(cleanPhone);

    // Sync into profile system too
    const profileId = mapping[nLid] || mapping[nPhone];
    if (profileId) {
        if (!profiles[profileId].lid)   { profiles[profileId].lid   = nLid;   saveProfiles(); }
        if (!profiles[profileId].phone) { profiles[profileId].phone = nPhone; saveProfiles(); }
        mapping[nLid]   = profileId;
        mapping[nPhone] = profileId;
    } else {
        // Plain flat map entry (will be upgraded when resolveProfile is called)
        mapping[nLid] = nPhone;
    }

    saveMapping();
}

/**
 * THE MAIN ENTRY POINT — call this on every message.
 * Extracts all identity signals from the raw Baileys message
 * and resolves/creates the user profile automatically.
 */
function learnFromMessage(msg) {
    const key     = msg.key || {};
    const message = msg.message || {};
    const pushName = msg.pushName || null;

    // Primary JID: participant (groups) or remoteJid (DMs)
    const primaryJid = key.participant || key.remoteJid || '';

    // Alt JID: senderPn is the hidden field Baileys sometimes exposes
    // linking LID directly to phone in the same message
    const altJid = key.participantPn || key.senderPn || key.remoteJidAlt || null;

    if (primaryJid) {
        resolveProfile(primaryJid, altJid, pushName);
    }

    // Also scrape contextInfo from all message types for LID→phone pairs
    const msgTypes = [
        'extendedTextMessage', 'imageMessage', 'videoMessage', 'audioMessage',
        'documentMessage', 'stickerMessage', 'reactionMessage',
        'buttonsResponseMessage', 'templateButtonReplyMessage', 'listResponseMessage'
    ];

    for (const type of msgTypes) {
        const ctx = message[type]?.contextInfo;
        if (!ctx) continue;
        if (ctx.participant && ctx.remoteJid) {
            resolveProfile(ctx.participant, ctx.remoteJid, null);
        }
    }

    // reactionMessage key
    const reactKey = message.reactionMessage?.key;
    if (reactKey?.participant && reactKey?.remoteJid) {
        resolveProfile(reactKey.participant, reactKey.remoteJid, null);
    }
}

/**
 * GROUP STRATEGY: groupMetadata has p.id + p.lid on same participant object.
 */
async function learnFromGroup(sock, groupJid) {
    try {
        const meta = await sock.groupMetadata(groupJid);
        if (!meta?.participants) return;

        let learned = 0;
        for (const p of meta.participants) {
            if (p.lid && p.id) {
                const before = Object.keys(mapping).length;
                resolveProfile(p.id, p.lid, null);
                if (Object.keys(mapping).length > before) learned++;
            }
        }
        if (learned > 0) console.log(`[Identity] learnFromGroup: ${learned} new profiles from ${groupJid}`);
    } catch (err) { /* silent */ }
}

/**
 * DM STRATEGY: Query WA servers to resolve LID → phone directly.
 */
async function learnFromDM(sock, lidJid) {
    if (!lidJid?.endsWith('@lid')) return;
    const normalized = normalizeJid(lidJid);
    const profileId = mapping[normalized];
    if (profileId && profiles[profileId]?.phone) return; // already resolved

    try {
        const results = await sock.onWhatsApp(lidJid);
        if (!results?.length) return;
        for (const result of results) {
            if (result.jid?.endsWith('@s.whatsapp.net') && result.exists) {
                resolveProfile(lidJid, result.jid, null);
                return;
            }
        }
    } catch (err) { /* silent */ }
}

/**
 * Check if JID is the bot itself (phone or LID).
 */
function isBot(jid, sock) {
    if (!jid || !sock.user) return false;
    const cleaned  = cleanJid(jid);
    const botPhone = jidNormalizedUser(cleanJid(sock.user.id));
    const botLid   = sock.user.lid ? jidNormalizedUser(cleanJid(sock.user.lid)) : null;
    return (
        jidNormalizedUser(cleaned) === botPhone ||
        (botLid && jidNormalizedUser(cleaned) === botLid)
    );
}

function getBotLid(sock) {
    return sock.user?.lid ? cleanJid(sock.user.lid) : null;
}

function forceMapping(lid, phoneJid) {
    const nLid   = lid.includes('@')     ? normalizeJid(lid)     : `${lid}@lid`;
    const nPhone = phoneJid.includes('@') ? normalizeJid(phoneJid) : `${phoneJid}@s.whatsapp.net`;
    resolveProfile(nLid, nPhone, null);
    console.log(`[Identity] Force-mapped: ${nLid} → ${nPhone}`);
}

/**
 * Resolve with retries — use this in group event handlers (join/leave/promote)
 * before firing the message, so foreign numbers get a fair chance to resolve.
 */
async function resolveWithRetry(sock, groupJid, jid, maxRetries = 3) {
    const normalized = normalizeJid(jid);

    for (let i = 0; i < maxRetries; i++) {
        const profileId = mapping[normalized];
        if (profileId && profiles[profileId]?.phone) {
            return profiles[profileId]; // resolved
        }
        // Try both strategies again
        await learnFromGroup(sock, groupJid);
        if (normalized.endsWith('@lid')) {
            await learnFromDM(sock, normalized);
        }
        if (i < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1500)); // wait 1.5s between tries
        }
    }

    // Give up — return whatever we have (auto-creates a basic profile if needed)
    return resolveProfile(jid, null, null);
}

function getMappings()  { return { ...mapping }; }
function getProfiles()  { return { ...profiles }; }
function clearMappings() { mapping = {}; profiles = {}; saveMapping(); saveProfiles(); }

module.exports = {
    resolveJid,
    resolveProfile,
    cleanJid,
    learnMapping,
    learnFromMessage,
    learnFromGroup,
    learnFromDM,
    isBot,
    getBotLid,
    forceMapping,
    getMappings,
    getProfiles,
    clearMappings,
    resolveWithRetry
};