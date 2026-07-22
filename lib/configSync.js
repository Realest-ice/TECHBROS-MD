/*
 * TECHBROS-MD — Config Sync
 * Bridges config.js ↔ Dynamic Settings DB
 */

const config = require('../config');
const { setSetting, getSettings } = require('../techbros_data/settings');

// Never sync these — sensitive or non-primitive
const BLACKLIST = [
    'owners', 'sudos', 'devs', 'database', 'mongoUrl',
    'port', 'debug', 'timezone'
];

/**
 * On startup — sync DB ↔ config.
 * DB value exists  → push into config (DB wins)
 * DB value missing → push config's current value into DB (first run)
 */
async function syncSettings() {
    try {
        const dbMap = await getSettings();
        const entries = Object.entries(config);
        let synced = 0;

        for (const [key, value] of entries) {
            if (typeof value === 'function') continue;
            if (typeof value === 'object' && value !== null) continue;
            if (BLACKLIST.includes(key)) continue;

            const dbKey = key.toLowerCase();

            if (dbMap[dbKey] === undefined) {
                // First run — save current config value to DB
                await setSetting(dbKey, value);
            } else {
                // DB has a value — restore it into config (handle bool/number casting)
                const raw = dbMap[dbKey];
                if (raw === 'true')       config[key] = true;
                else if (raw === 'false') config[key] = false;
                else if (!isNaN(raw) && raw !== '' && typeof value === 'number') config[key] = Number(raw);
                else config[key] = raw;
                synced++;
            }
        }

        console.log(`[ConfigSync] Synced ${synced} settings from DB → config`);
        return true;
    } catch (e) {
        console.error('[ConfigSync] Sync error:', e.message);
        return false;
    }
}

/**
 * Runtime update — updates config RAM instantly + persists to DB.
 * key = config camelCase key (e.g. 'autoRead', 'antiDelete')
 */
async function updateConfig(key, value) {
    try {
        config[key] = value;
        await setSetting(key, value);
        console.log(`[ConfigSync] ${key} → ${value}`);
        return true;
    } catch (e) {
        console.error('[ConfigSync] Update error:', e.message);
        return false;
    }
}

module.exports = { syncSettings, updateConfig };