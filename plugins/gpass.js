const crypto = require('crypto');
const { cmd } = require('../command');

cmd({
    pattern: "gpass",
    desc: "Generate a strong, secure password.",
    category: "tools",
    react: "🔑",
    filename: __filename
},
async (conn, mek, m, { args, from, reply, quoted }) => {
    try {
        let length = parseInt(args[0]);

        // Validate the length argument
        if (isNaN(length) || length < 8 || length > 64) {
            return reply('Please specify a password length between 8 and 64 characters. e.g., !gpass 16');
        }

        // Define the character set
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

        // Use a more secure and efficient method to generate the password
        const password = Array.from({ length }, () =>
            charset[crypto.randomInt(0, charset.length)]
        ).join('');

        const message = `🔐 *Password Generated* 🔐\n\n`
            + `*Length:* ${length} characters\n\n`
            + `\`\`\`${password}\`\`\`\n\n`
            + `_Keep this password safe and secure._`;

        await conn.sendMessage(from, { text: message }, { quoted: mek });

    } catch (e) {
        console.error("Error in password generation:", e);
        reply(`❌ An unexpected error occurred: ${e.message}`);
    }
});
