const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, truthy = 'true') {
    return String(text).toLowerCase() === String(truthy).toLowerCase();
}

module.exports = {
    // SESSION & BOT INFO
    SESSION_ID: process.env.SESSION_ID || "TECHBROS-MD~CJ8zRASJ#E3BZ3kElDeUyYjMzqiQELeT7RDoNORR7aDq-Sz0ysTg",
    BOT_NAME: process.env.BOT_NAME || "TECHBROS MD",
    OWNER_NAME: process.env.OWNER_NAME || "TECH BROS",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "27682708973", // Bot owner's number
    DEV: process.env.DEV || "2349126807818",                // Developer's WhatsApp number

    // REACTIONS & CAPTIONS
    HEART_REACT: process.env.HEART_REACT || "false",
    AUTO_REACT: process.env.AUTO_REACT || "false",
    CUSTOM_REACT: process.env.CUSTOM_REACT || "false",
    CUSTOM_REACT_EMOJIS: process.env.CUSTOM_REACT_EMOJIS || "💝,💖,💗,❤️‍🩹,❤️,💛,💚,💙,💜,🤎,🖤,🤍",
    CAPTION: process.env.CAPTION || "*> POWERED BY TECHBROS*",

    // STATUS & PRESENCE
    ALWAYS_ONLINE: process.env.ALWAYS_ONLINE || "true",
    AUTO_TYPING: process.env.AUTO_TYPING || "true",
    CURRENT_STATUS: process.env.CURRENT_STATUS || "false",
    AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || "true",
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "`YOUR STATUS HAS BEEN SEEN JUST NOW BY TECHBROS MD`",

    // AUTO-FEATURES
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "true",
    READ_MESSAGE: process.env.READ_MESSAGE || "false", // Auto-read configuration
    AUTO_VOICE: process.env.AUTO_VOICE || "false",
    AUTO_STICKER: process.env.AUTO_STICKER || "false",
    AUTO_REPLY: process.env.AUTO_REPLY || "true",
    FAKE_RECORDING: process.env.FAKE_RECORDING || "true",

    // ANTI-FEATURES
    ANTI_LINK: process.env.ANTI_LINK || "true",
    ANTI_BAD: process.env.ANTI_BAD || "true",
    ANTI_VV: process.env.ANTI_VV || "true",
    ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "log", // Use 'same' to resend deleted messages in the same chat

    // ALIVE
    ALIVE_IMG: process.env.ALIVE_IMG || "https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg",
    ALIVE_MSG: process.env.ALIVE_MSG || "HELLO I'M TECHBROS-MD AND I'M ACTIVE NOW🙂",

    // PACK INFO
    AUTHOR: (process.env.PACK_INFO?.split(';') || [])[0] || 'TECHBROS MD',
    PACKNAME: (process.env.PACK_INFO?.split(';') || [])[1] || '💙TECHBROS💙',

    // GENERAL
    PREFIX: process.env.PREFIX || ".",
    MODE: process.env.MODE || "public",
    OMDB_API_KEY: process.env.OMDB_API_KEY || "76cb7f39" // omdbapi.com
};
