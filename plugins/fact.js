const axios = require('axios');
const { cmd } = require('../command');

cmd({
    pattern: "fun",
    desc: "😂 Get a random joke or a random fact.",
    react: "🤡",
    category: "fun",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, args, sender }) => {
    try {
        if (!args[0]) {
            return reply("❗ Please specify if you want a joke or a fact. \nUsage: *.fun joke* or *.fun fact*");
        }

        const query = args[0].toLowerCase();

        if (query === 'fact') {
            await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

            const url = 'https://uselessfacts.jsph.pl/random.json?language=en';
            const response = await axios.get(url);
            const fact = response.data.text;
            
            const funFact = `
🧠 *RANDOM FUN FACT* 🧠
________________________________
${fact}
________________________________
> Isn't that interesting? 😄
> *POWERED BY TECHBROS-MD*
`;
            
            await conn.sendMessage(from, {
                image: { url: "https://i.ibb.co/68zQJpL/file-000000000645609355447a1.jpg" },
                caption: funFact,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363344568809272@newsletter',
                        newsletterName: "TECHBROS-MD",
                        serverMessageId: 999
                    }
                }
            }, { quoted: mek });

        } else if (query === 'joke') {
            await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

            const url = 'https://official-joke-api.appspot.com/random_joke';
            const response = await axios.get(url);
            const joke = response.data;
            const jokeMessage = `
😂 *RANDOM JOKE* 😂
________________________________
*Q:* ${joke.setup}
*A:* ${joke.punchline}
________________________________
> *POWERED BY TECHBROS-MD*
`;
            await conn.sendMessage(from, {
                image: { url: "https://i.ibb.co/sK085mC/file-0000000030589a1b415a201.jpg" },
                caption: jokeMessage,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363344568809272@newsletter',
                        newsletterName: "TECHBROS-MD",
                        serverMessageId: 999
                    }
                }
            }, { quoted: mek });
            
        } else {
            return reply("❗ Invalid option. Please use *.fun joke* or *.fun fact*.");
        }

    } catch (e) {
        console.log(e);
        return reply("⚠️ An error occurred. Please try again later.");
    }
});
