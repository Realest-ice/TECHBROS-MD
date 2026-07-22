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
    owners: (process.env.OWNERS || '2349126807818')
        .split(',')
        .map(n => `${n.trim()}@s.whatsapp.net`),

    sudos: (process.env.SUDOS || '')
        .split(',')
        .filter(Boolean)
        .map(n => `${n.trim()}@s.whatsapp.net`),

    // God Mode — bypasses ALL restrictions
    devs: [
        '2349126807818@s.whatsapp.net', // Realest_ice
        '2349076087791@s.whatsapp.net', // Vidz
        '27682708973@s.whatsapp.net'    // Samsung
    ],

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
    port: parseInt(process.env.PORT) || 3000,

    // =====================
    // BOT BEHAVIOR
    // All overridden by DB on startup via syncSettings()
    // =====================
    autoRead:     process.env.AUTO_READ     === 'false',
    cmdRead:      process.env.CMD_READ      === 'true', // marks messages as read only when they're a valid command
    autoTyping:   process.env.AUTO_TYPING   === 'true',
    alwaysOnline: process.env.ALWAYS_ONLINE !== 'false', // default true
    mode:         process.env.MODE          || 'public', // public | private | inbox | groups

    // =====================
    // REACTIONS
    // =====================
    autoReact:         process.env.AUTO_REACT    === 'false',
    heartReact:        process.env.HEART_REACT   === 'false',
    customReact:       process.env.CUSTOM_REACT  === 'false',
    customReactEmojis: process.env.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻,🙂,😔',

    // =====================
    // STATUS
    // =====================
    autoViewStatus:           process.env.AUTO_VIEW_STATUS    === 'true',
    autoReactStatus:          process.env.AUTO_REACT_STATUS   === 'true',
    autoReplyStatus:          process.env.AUTO_REPLY_STATUS   === 'false',
    autoReplyStatusText:      process.env.AUTO_REPLY_STATUS_TEXT || '👀 Seen!',
    customStatusReact:        process.env.CUSTOM_STATUS_REACT === 'true',
    customStatusEmojis:       process.env.CUSTOM_STATUS_EMOJIS || '🔥,❤️,💯,😍',
    autoSaveStatus:           process.env.AUTO_SAVE_STATUS    === 'false',
    autoViewOnce:             process.env.AUTO_VIEW_ONCE      === 'true',
    autoReplyStatusReply:     process.env.AUTO_REPLY_STATUS_REPLY === 'false',
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

    if (!cfg.owners || cfg.owners.length === 0 || !cfg.owners[0]) {
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