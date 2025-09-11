const { cmd } = require('../command');
const { sleep } = require('../lib/functions');
const config = require('../config'); 

cmd({
    pattern: "restart",
    desc: "Restart the bot",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { reply, senderNumber, isOwner }) => {
    try {
        if (!isOwner) {
            return reply("📛 Only the bot owner can use this command.");
        }

        const { exec } = require("child_process");
        
        // Let the user know the command is being executed.
        await reply("🔄 Restarting the bot...");

        // Use a short delay before restarting to allow the reply to be sent.
        // This is a stylistic choice, not a technical requirement for the restart itself.
        await sleep(500); 

        // Execute the PM2 restart command.
        // This will kill the current process, and PM2 will automatically start it back up.
        exec("pm2 restart all");
    } catch (e) {
        // Log the error for debugging purposes.
        console.error(e);
        
        // Reply to the user with the error message.
        reply(`An error occurred: ${e.message}`);
    }
});
