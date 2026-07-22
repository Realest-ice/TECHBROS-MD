/* ＴＥＣＨＢＲＯＳ-ＭＤ ＳＹＳＴＥＭ ＥＮＧＩＮＥ 🔧 
   Dev: Realest_ice
*/

const { register } = require('../commands');
const { sendInteractiveMessage } = require('gifted-btns');
const config = require('../config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { getDateTime, formatRuntime, formatBytes } = require('../lib/utils');
const { getDBType } = require('../lib/database');

const getDbStatus = () => {
    try {
        const type = getDBType();
        return `CONNECTED 🟢 (${type.toUpperCase()})`;
    } catch (e) {
        return "DISCONNECTED 🔴";
    }
};

const getRandomImagePath = () => {
    try {
        const assetsPath = path.resolve(__dirname, '../Techbros_assets'); 
        if (!fs.existsSync(assetsPath)) return null;
        const images = fs.readdirSync(assetsPath).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
        if (images.length === 0) return null;
        return path.join(assetsPath, images[Math.floor(Math.random() * images.length)]);
    } catch (err) { return null; }
};

register({
    name: "system",
    alias: ["uptime", "botstatus"],
    category: "main",
    desc: "Check TECHBROS-MD Core Performance",
    react: "🛰️"
}, async (sock, msg, metadata) => {
    try {
        // Prepare performance metrics
        const usedRam = formatBytes(process.memoryUsage().heapUsed);
        const totalRam = formatBytes(os.totalmem());
        const uptime = formatRuntime(process.uptime());
        const dbStatus = getDbStatus();
        
        // Final Status Message
        const statusMessage = `*ＴＥＣＨＢＲＯＳ-ＭＤ ＳＹＳＴＥＭ* 🛰️\n\n` +
            `⚡ *ENGINE:* V${config.VERSION || '1.0.0'}\n` +
            `🕒 *UPTIME:* ${uptime}\n` +
            `📟 *RAM:* ${usedRam} / ${totalRam}\n` +
            `🖥️ *PLATFORM:* ${os.platform().toUpperCase()}\n\n` +
            `📶 *STATUS:* ONLINE 🟢\n` +
            `🗃️ *DATABASE:* ${dbStatus}\n\n` +
            `👥 *DEV:* Realest_ice & VIDZ 🧬`;

        const imagePath = getRandomImagePath();
        let finalImage = imagePath && fs.existsSync(imagePath) 
            ? { buffer: fs.readFileSync(imagePath) } 
            : { url: "https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg" };

        await sendInteractiveMessage(sock, metadata.remoteJid, {
            text: statusMessage,
            footer: "TECHBROS-MD ENGINE",
            image: finalImage,
            interactiveButtons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📜 MENU",
                        id: `menu`
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📢 JOIN CHANNEL",
                        url: "https://whatsapp.com/channel/0029Vb7LyCHEquiRPdrd0d3w"
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "👨‍💻 SUPPORT GROUP",
                        url: "https://chat.whatsapp.com/Ibm3i6aw6nh29JELrLqh3a?mode=hq1tcla"
                    })
                }
            ]
        });

    } catch (e) {
        console.error("System Error:", e);
        await sock.sendMessage(metadata.remoteJid, { text: "❌ UI Error" }, { quoted: msg });
    }
});