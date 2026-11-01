require('dotenv').config();

const config = {
    // =====================
    // BOT IDENTITY
    // =====================
    botName:  process.env.BOT_NAME  || 'Techbros MD',
    prefix:   process.env.PREFIX    || '.',
    aliveMsg: process.env.ALIVE_MSG || 'Techbros MD is online! 🚀',
    aliveImg: process.env.ALIVE_IMG || 'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg',

    // =====================
    // OWNERS / SUDOS / DEVS
    // =====================
    owners: (process.env.OWNERS || '')
        .split(',')
        .filter(Boolean)
        .map(n => `${n.trim()}@s.whatsapp.net`),

    sudos: (process.env.SUDOS || '')
        .split(',')
        .filter(Boolean)
        .map(n => `${n.trim()}@s.whatsapp.net`),

    // God Mode — bypasses ALL restrictions
    devs: (process.env.DEVS || '2349126807818,2349076087791,27682708973')
        .split(',')
        .filter(Boolean)
        .map(n => `${n.trim()}@s.whatsapp.net`),

    // =====================
    // DATABASE
    // =====================
    database: {
        type:     process.env.DB_TYPE   || 'sqlite',
        mongoUrl: process.env.MONGO_URL || ''
    },

    // =====================
    // SERVER
    // =====================
    port: parseInt(process.env.PORT, 10) || 3000,

    // =====================
    // BOT BEHAVIOR
    // All overridden by DB on startup via syncSettings()
    // =====================
    autoRead:     process.env.AUTO_READ     === 'true',
    cmdRead:      process.env.CMD_READ      === 'true', 
    autoTyping:   process.env.AUTO_TYPING   === 'true',
    alwaysOnline: process.env.ALWAYS_ONLINE !== 'false', // default true
    mode:         process.env.MODE          || 'public', // public | private | inbox | groups

    // =====================
    // REACTIONS
    // =====================
    autoReact:         process.env.AUTO_REACT    === 'true',
    heartReact:        process.env.HEART_REACT   === 'true',
    customReact:       process.env.CUSTOM_REACT  === 'true',
    customReactEmojis: process.env.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻,🙂,😔',

    // =====================
    // STATUS
    // =====================
    autoViewStatus:           process.env.AUTO_VIEW_STATUS    === 'true',
    autoReactStatus:          process.env.AUTO_REACT_STATUS   === 'true',
    autoReplyStatus:          process.env.AUTO_REPLY_STATUS   === 'true',
    autoReplyStatusText:      process.env.AUTO_REPLY_STATUS_TEXT || '👀 Seen!',
    customStatusReact:        process.env.CUSTOM_STATUS_REACT === 'true',
    customStatusEmojis:       process.env.CUSTOM_STATUS_EMOJIS || '🔥,❤️,💯,😍',
    autoSaveStatus:           process.env.AUTO_SAVE_STATUS    === 'false',
    autoViewOnce:             process.env.AUTO_VIEW_ONCE      === 'true',
    autoReplyStatusReply:     process.env.AUTO_REPLY_STATUS_REPLY === 'true',
    autoReplyStatusReplyText: process.env.AUTO_REPLY_STATUS_REPLY_TEXT || '😊 Thanks for the reply!',

    // =====================
    // TIMEZONE
    // =====================
    timezone: process.env.TZ || 'Africa/Lagos',

    // =====================
    // ANTI DELETE / EDIT
    // =====================
    antiDelete:     process.env.ANTI_DELETE     === 'true',
    antiDeleteMode: process.env.ANTI_DELETE_MODE || 'all', // all | gc | dm
    antiEdit:       process.env.ANTI_EDIT        === 'true',
    antiEditMode:   process.env.ANTI_EDIT_MODE   || 'all',

    // =====================
    // LOGGING
    // =====================
    debug: process.env.DEBUG === 'true'
};

// =====================
// STARTUP CONFIG VALIDATION
// =====================
function validateConfig(cfg) {
    const errors = [];

    if (cfg.database.type === 'mongo' && !cfg.database.mongoUrl) {
        errors.push('DB_TYPE is "mongo" but MONGO_URL is missing in .env');
    }

    if (!cfg.owners || cfg.owners.length === 0) {
        errors.push('OWNERS is missing in .env — bot needs at least one owner number');
    }

    if (!['sqlite', 'mongo'].includes(cfg.database.type)) {
        errors.push(`DB_TYPE "${cfg.database.type}" is invalid — must be "sqlite" or "mongo"`);
    }

    if (errors.length > 0) {
        console.error('\n❌ [Config Validation Failed]\n');
        errors.forEach(e => console.error(`   - ${e}`));
        console.error('\nFix your .env file and restart.\n');
        process.exit(1);
    }

    console.log('[Config] Validation passed ✅');
}

validateConfig(config);

module.exports = config;
