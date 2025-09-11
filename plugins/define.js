const axios = require('axios');
const {cmd , commands} = require('../command');

 cmd({
   pattern: "define",
   desc: "📚 Get the definition of a word",
   react: "🔍",
   category: "tool",
   filename: __filename
      },
   async (conn, mek, m, { from, q, reply }) => {
            try {
               if (!q) return reply("❗ Please provide a word to define. Usage: .define [word]");

    const word = q;
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;

    const response = await axios.get(url);
    const definitionData = response.data[0];

  const definition = definitionData.meanings[0].definitions[0].definition;
  const example = definitionData.meanings[0].definitions[0].example || 'No example available';
                                 const synonyms = definitionData.meanings[0].definitions[0].synonyms.join(', ') || 'No synonyms available';

const wordInfo = `
📚 *Word*: ${definitionData.word}
🔍 *Definition*: ${definition}
📝 *Example*: ${example}
🔗 *Synonyms*: ${synonyms}

> *POWERED BY TECHBROS MD*`;

         // Use conn.sendMessage directly to add contextInfo
         await conn.sendMessage(from, { 
            text: wordInfo,
            contextInfo: {
               mentionedJid: [m.sender],
               forwardingScore: 999,
               isForwarded: true,
               forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363344568809272@newsletter',
                  newsletterName: 'TECHBROS-MD',
                  serverMessageId: 999
               }
            }
         }, { quoted: m });

      } catch (e) {
       console.log(e);
       if (e.response && e.response.status === 404) {
          return reply("🚫 Word not found. Please check the spelling and try again.");
       }
       return reply("⚠️ An error occurred while fetching the definition. Please try again later.");
     }
});
