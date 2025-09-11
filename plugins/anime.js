/*
Techbros md
*/
const axios = require('axios');
const { cmd } = require('../command');

cmd({
    pattern: "anime",
    desc: "Get a random anime image (SFW/NSFW)",
    category: "fun",
    react: "🍷",
    filename: __filename
}, 
async (conn, mek, m, { from, pushname, args, reply }) => {
  try {
    let type = (args[0] && args[0].toLowerCase() === 'nsfw') ? 'nsfw' : 'sfw';

    const categories = {
      sfw: ['waifu', 'neko', 'shinobu', 'megumin'],
      nsfw: ['waifu', 'neko', 'trap', 'blowjob']
    };

    let list = categories[type];
    let category = list[Math.floor(Math.random() * list.length)];

    const res = await axios.get(`https://api.waifu.pics/${type}/${category}`);
    const imgUrl = res.data.url;

    let caption = `👋 Hey ${pushname}!\n\n🖼️ Here’s a random anime — *${category.toUpperCase()}*\n\nWant more? Just type *.anime* again!\n\n> *Powered by TECHBROS-MD 💙*`;

    await conn.sendMessage(from, { 
      image: { url: imgUrl }, 
      caption: caption,
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
    }, { quoted: mek });

  } catch (e) {
    console.log(e);
    reply('❌ Error fetching anime image.');
  }
});
