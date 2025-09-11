/*
Techbros-md
*/
const config = require('../config');
const { cmd } = require('../command');
const os = require('os');
const moment = require('moment-timezone');
const { runtime } = require('../lib/functions');

cmd({
    pattern: "system",
    react: "",
    alias: ["uptime2", "status", "runtime2"],
    desc: "Check bot uptime and system status",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const date = moment().tz('Africa/Lagos').format('ddd, MMM D YYYY');
        const time = moment().tz('Africa/Lagos').format('hh:mm A');
        const uptime = runtime(process.uptime());
        const usedMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
        const hostname = os.hostname();
        const platform = os.platform();
        const cpu = os.cpus()[0].model;

        let msg = `*📊 BOT SYSTEM STATUS*\n\n`;
        msg += `🕒 *Date*: ${date}\n`;
        msg += `🕙 *Time*: ${time}\n`;
        msg += `⏱️ *Uptime*: ${uptime}\n`;
        msg += `💾 *RAM*: ${usedMem}MB / ${totalMem}MB\n`;
        msg += `🖥️ *Host*: ${hostname}\n`;
        msg += `💻 *Platform*: ${platform}\n`;
        msg += `⚙️ *CPU*: ${cpu}\n`;
        msg += `👨‍💻 *Developer*: TECHBROS\n`;

        await conn.sendMessage(from, {
            image: { url: config.ALIVE_IMG },
            caption: msg,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363344568809272@newsletter',
                    newsletterName: 'TECH BROS',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e}`);
    }
});
