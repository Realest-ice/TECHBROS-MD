const NodeCache = require('node-cache');

const groupCache = new NodeCache({
    stdTTL: 5 * 60,       // 5 minutes
    useClones: false,
    checkperiod: 60
});

/**
 * Get group metadata — cached, falls back to live fetch.
 */
async function getCachedGroupMetadata(sock, groupJid) {
    if (!groupJid?.endsWith('@g.us')) return null;

    const cached = groupCache.get(groupJid);
    if (cached) return cached;

    try {
        const metadata = await sock.groupMetadata(groupJid);
        if (metadata) groupCache.set(groupJid, metadata);
        return metadata;
    } catch (err) {
        console.error('[GroupCache] Fetch failed:', err.message);
        return null;
    }
}

function updateGroupCache(groupJid, metadata) {
    if (groupJid && metadata) groupCache.set(groupJid, metadata);
}

function invalidateGroupCache(groupJid) {
    groupCache.del(groupJid);
}

/**
 * Call once at startup — keeps cache fresh automatically on any group change.
 */
function setupGroupCacheListeners(sock) {
    sock.ev.on('groups.update', async ([event]) => {
        if (!event?.id) return;
        try {
            const metadata = await sock.groupMetadata(event.id);
            updateGroupCache(event.id, metadata);
        } catch (err) {
            invalidateGroupCache(event.id);
        }
    });

    sock.ev.on('group-participants.update', async (event) => {
        if (!event?.id) return;
        try {
            const metadata = await sock.groupMetadata(event.id);
            updateGroupCache(event.id, metadata);
        } catch (err) {
            invalidateGroupCache(event.id);
        }
    });
}

module.exports = {
    getCachedGroupMetadata,
    updateGroupCache,
    invalidateGroupCache,
    setupGroupCacheListeners
};