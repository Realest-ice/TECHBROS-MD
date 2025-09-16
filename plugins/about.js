/*
Code by techbros

*/
const config = require('../config')
const {cmd , commands} = require('../command')
cmd({
    pattern: "about",
    alias: ["techbros","creator"], 
    react: "👑",
    desc: "get owner info",
    category: "main",
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
let about = `*Hey there, ${pushname}!* 👋🏻  

Welcome to *TECHBROS-MD* — a multi-device WhatsApp bot powered by *Baileys*.  
Fast, reliable, and built for all your automation needs.

——————  

*🧑🏻‍💻 Developers & Support:*  
• https://wa.me/2349126807818 — *Realest_ice❄️*  
• https://wa.me/2349076087791 — *VIDZ 🤟🏻*  

*🌐 Official Website:*  
https://tech-bros-world-wide.vercel.app

*💻 Source Code (GitHub):*  
https://github.com/Realest-ice/TECHBROS-MD

*✅Stay Updated 
Join Our WhatsApp Channel
https://whatsapp.com/channel/0029VarWtitEgGfDrNnWs83N  

——————  

> *© Powered by TECHBROS-MD 💙*  
_Stay cool & stay smart_. ✌🏻`

await conn.sendMessage(from,{image:{url:`https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg`},caption:about,
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
console.log(e)
reply(`${e}`)
}
})
