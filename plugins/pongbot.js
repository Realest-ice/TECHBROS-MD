const config = require('../config');
const { cmd } = require('../command');
const { runtime } = require('../lib/functions');
const os = require('os')
cmd({
    pattern: "pong",
    alias: ["🚀", "pong"],
    use: '.ping4',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        const start = Date.now();

        // Emojis for spice
        const reactionEmojis = ['⚡', '🚀', '🔥', '💨', '✨'];
        const chosenReact = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];

        // Send reaction emoji
        await conn.sendMessage(from, {
            react: { text: chosenReact, key: mek.key }
        });

        const end = Date.now();
        const responseTime = end - start;

        const uptime = runtime(process.uptime());
        const finalMsg = `*👋 HELLO @${sender.split('@')[0]}!*
        
*🤖 TECHBROS-MD IS ONLINE!*
*📡 PING:* \`${responseTime} MS\`
*⏱ UPTIME:* \`${uptime}\`
*📟 Ram usage*: \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${(os.totalmem() / 1024 / 1024).toFixed(2)}MB\`
*🛡 STATUS:* _⚡BOT RUNNING⚡_

💙 *ᴛᴇᴄʜʙʀᴏꜱ ᴍᴅ*
`;

        await conn.sendMessage(from, {
            text: finalMsg,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Ping command error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
  
