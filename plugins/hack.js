const { cmd, commands } = require('../command');

cmd({
    pattern: "hack",
    desc: "Simulates a dynamic and realistic-looking 'hacking' sequence for fun.",
    category: "fun",
    react: "👨‍💻",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        const target = q || 'target_system';
        const delay = 1000; // 1 second delay between messages
        const initialMessages = [
            `💻 *Initializing Hack on ${target}...* 💻`,
            `🔎 *Scanning for vulnerabilities on ${target}...* 🌐`,
            `🔓 *Attempting to bypass firewall...* 🚧`,
            `🕵️‍♂️ *Enumerating user accounts...* 👥`,
        ];

        for (const message of initialMessages) {
            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await new Promise(resolve => setTimeout(resolve, delay / 2));
        }

        // Simulating progress bar with random percentages
        const progressMessages = [
            '```[██░░░░░░░░] 10% - Accessing main directories...```',
            '```[████░░░░░░] 40% - Decrypting encrypted files...```',
            '```[██████░░░░] 60% - Bypassing root permissions...```',
            '```[████████░░] 85% - Injecting malicious payload...```',
            '```[██████████] 100% - Exploit successful!```',
        ];

        for (const message of progressMessages) {
            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Final summary messages
        const finalMessages = [
            `✅ *System Breach Complete!* 🔐`,
            `💡 *Gathering sensitive data from ${target}...* 💾`,
            `✅ *Data Extraction Successful!* 📥`,
            `🧹 *Covering tracks...* 🤫`,
            '***--- HACK COMPLETED ---***',
            `❗ *Disclaimer:* This is a simulation. All data is for demonstration purposes only.`,
        ];

        for (const message of finalMessages) {
            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await new Promise(resolve => setTimeout(resolve, delay));
        }

    } catch (e) {
        console.error("Error during hacking simulation:", e);
        reply(`❌ *Hacking simulation failed!* An error occurred: ${e.message}`);
    }
});
