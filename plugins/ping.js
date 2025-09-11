/*
Techbros md
  */
const { cmd } = require('../command');
const { runtime } = require('../lib/functions');
const os = require('os');

// This is the ONE and ONLY command for ping functionality.
// All aliases are consolidated here.
cmd({
    pattern: "ping",
    // All aliases from all other files are now combined here.
    alias: ["speed", "pong", "ping2", "ping3", "ping4", "latency"],
    desc: "Check bot's speed and status.",
    category: "main",
    react: "⚡️",
    filename: __filename
},
async(conn, mek, m, { from, sender, reply }) => {
    // ... all the cool code from the previous example
    try {
        const start = Date.now();
        const placeholder = await conn.sendMessage(from, { text: '*_Pinging..._*' }, { quoted: mek });
        const end = Date.now();
        const pingTime = end - start;
        const totalRam = (os.totalmem() / 1024 / 1024).toFixed(2);
        const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const uptime = runtime(process.uptime());
        const cpuModel = os.cpus()[0].model;

        const responseMessage = `
*⚡️ PONG!*
*🌐 Latency:* \`${pingTime} ms\`
*⏰ Uptime:* \`${uptime}\`
*🧠 RAM Usage:* \`${ramUsed} MB / ${totalRam} MB\`
*💻 CPU:* \`${cpuModel}\`
*🛡️ Status:* _⚡BOT RUNNING⚡_
_Techbros-MD_
`;
        
        await conn.sendMessage(from, {
            text: responseMessage,
            edit: placeholder.key,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: "TECHBROS-MD",
                    body: "Online and Ready!",
                    mediaType: 1,
                    sourceUrl: "https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg",
                    thumbnailUrl: 'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg',
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            }
        });
    } catch (e) {
        console.error(e);
        reply(`An error occurred: ${e.message}`);
    }
});
