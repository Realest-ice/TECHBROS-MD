/*
Techbros 
*/

Const config = require('../config')
let fs = require('fs')
const os = require("os")
const { cmd, commands } = require('../command')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')

cmd({
    pattern: "ping",
    react: "⚡️",
    alias: ["speed", "ping2", "ping3"],
    desc: "Check the bot's speed and status.",
    category: "main",
    use: '.ping',
    filename: __filename
},
async(conn, mek, m, { from, reply }) => {
    try {
        // Record the start time before sending the message.
        const start = Date.now();
        
        // Send a temporary "Pinging..." message to let the user know something is happening.
        const message = await conn.sendMessage(from, { text: '*_Pinging..._*' });
        
        // Record the end time after the message is successfully sent and acknowledged by the server.
        const end = Date.now();
        
        // Calculate the round-trip time in milliseconds.
        const pingTime = end - start;
        
        // Get system information to make the response more detailed.
        const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024).toFixed(2);
        const cpuModel = os.cpus()[0].model;
        const uptime = runtime(process.uptime()); // Assumes a `runtime` function to format uptime.
        const osPlatform = os.platform();

        // Prepare the final message with a cool, stylized format.
        const responseMessage = `
        *⚡️ PONG!*

        *🚀 Latency:* _${pingTime} ms_
        *⏰ Uptime:* _${uptime}_
        *🧠 RAM Usage:* _${ramUsed} MB / ${totalRam} MB_
        *💻 CPU:* _${cpuModel}_
        *⚙️ Platform:* _${osPlatform}_
         `;
        
        // Edit the original message to show the results, making it feel fast and responsive.
        await conn.sendMessage(from, { text: responseMessage }, { quoted: message });
    } catch (e) {
        // If an error occurs, log it and send a friendly error message to the user.
        console.error(e);
        reply('An error occurred while trying to check the ping. Please try again!');
    }
});
