/*
Techbros md 
*/
const config = require('../config');
const { cmd, commands } = require('../command');
const os = require('os');
const moment = require('moment-timezone');

// ======================
// 📦 CONFIGURATION
const categories = [
  { id: 'ai', title: '🧠 AI COMMANDS' },
  { id: 'download', title: '📥 DOWNLOAD COMMANDS' },
  { id: 'group', title: '👥 GROUP COMMANDS' },
  { id: 'fun', title: '🏂 FUN COMMANDS' },
  { id: 'owner', title: '👑 OWNER COMMANDS' },
  { id: 'anim', title: '🐲 ANIME COMMANDS' },
  { id: 'convert', title: '☯️ CONVERT COMMANDS' },
  { id: 'logo', title: '🖼️ LOGO COMMANDS' },
  { id: 'privacy', title: '🔒 PRIVACY COMMANDS' },
  { id: 'other', title: '👊 OTHER COMMANDS' },
  { id: 'list', title: '📜 LIST COMMANDS' },
  { id: 'main', title: '💥 MAIN COMMANDS' },
  { id: 'tools', title: '🛠 TOOLS COMMANDS' },
  { id: 'search', title: '🔍 SEARCH COMMANDS' }
];

const newsletterContext = {
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363344568809272@newsletter',
    newsletterName: 'TECHBROS MD',
    serverMessageId: 143
  }
};

// ======================
// ⏰ TIME FUNCTIONS
const getFancyGreeting = () => {
  const time = moment().tz('Africa/Lagos');
  const hr = time.hour();
  if (hr >= 5 && hr < 12) return '✨🌄  GOOD MORNING — May your hustle shine brighter today!';
  if (hr >= 12 && hr < 16) return '🔥🌞 GOOD AFTERNOON — Keep pushing, greatness awaits!';
  if (hr >= 16 && hr < 20) return '💫🌆  GOOD EVENING — The grind never stops, legend!';
  return '🌙💤 GOOD NIGHT — Rest well, tomorrow is yours!';
};

const getFormattedDateTime = () => {
  const time = moment().tz('Africa/Lagos');
  return {
    date: time.format('dddd, MMMM Do YYYY'),
    time: time.format('hh:mm:ss A')
  };
};

const totalCommands = commands.filter(c => 
  c.pattern && !c.dontAddCommandList
).length;

// ======================
// 🎨 ASCII DESIGN COMPONENTS
const buildHeader = (pushname, greeting, date, time) => `
╭━━━━❍「🤖*GREETING*」 ❍
┃ Hello 👋 ${pushname || 'User'} 
┃ 💬 ${greeting} 
┃ 📅 ${date} 
┃ ⏰ ${time} 
╰━━━━━━━━━━❍
╭━━━━━❍「📦*BOT INFO*」 ❍
┃ 🤖 Name: ${config.BOT_NAME || 'TECHBROS-MD'} 
┃ 🛠️ System: ${os.type()} ${os.release()} 
┃ 🧠 Version: ${config.VERSION || '8.3.5-quantum.7'} 
┃ 💡 Prefix: ${config.PREFIX || '.'} 
┃ 👑 Dev's: TECH BROS 
┃ 📊 Commands: ${totalCommands}
╰━━━━━━━━━━━━━━━━━❍`;

// ======================
// 📱 MAIN MENU COMMAND
cmd({
  pattern: "menu",
  desc: "Show main menu with all commands",
  category: "main",
  alias: ["start", "cmd"],
  react: "📱",
  filename: __filename
}, async (conn, mek, m, { from, pushname, sender }) => {
  try {
    const { date, time } = getFormattedDateTime();
    const greeting = getFancyGreeting();

    let menu = buildHeader(pushname, greeting, date, time);

    categories.forEach((cat, index) => {
      const catCmds = commands
        .filter(c => c.category === cat.id && c.pattern && !c.dontAddCommandList)
        .map(c => `│ ◦ ${config.PREFIX || '.'}${c.pattern}`)
        .join('\n') || '│ No commands found';

      menu += `\n\n╭━━━❍「 ${index + 1}. ${cat.title} 」❍\n${catCmds}\n╰━━━━━━━━━━❍`;
    });

    menu += `\n\n╭━━━❍「 📢 *GUIDE* 」❍ \n│ ✅ Type ${config.PREFIX || '.'}command to use \n│ ✅ Use ${config.PREFIX || '.'}list for all commands with descriptions \n╰━━━━━━━━━━❍\n\n> TECHBROS-MD | 🤟🏻 All rights reserved`;

    // Send menu with image
    await conn.sendMessage(from, {
      image: { url: config.ALIVE_IMG },
      caption: menu,
      contextInfo: { 
        ...newsletterContext, 
        mentionedJid: [sender || m.sender] 
      }
    }, { quoted: mek });

    // Send audio note
    await conn.sendMessage(from, {
      audio: { 
        url: 'https://github.com/Immanuel999-felix/TECHBROS-DATA/raw/refs/heads/main/menu.mp3' 
      },
      mimetype: 'audio/mp4',
      ptt: true
    }, { quoted: mek });
  } catch (e) {
    await conn.sendMessage(from, { 
      text: `❌ Menu Error: ${e.message}` 
    }, { quoted: mek });
  }
});

// ======================
// 📋 LIST COMMAND (WITH DESCRIPTIONS)
cmd({
  pattern: "list",
  desc: "Show all commands with descriptions",
  category: "list",
  alias: ["commands", "cmds"],
  react: "📜",
  filename: __filename
}, async (conn, mek, m, { args, prefix, pushname }) => {
  try {
    // Show full command list with descriptions
    if (!args[0]) {
      let listText = `╭━━━━━❍「 📜 ${config.BOT_NAME || 'TECHBROS-MD'} COMMAND LIST 」❍\n`;
      listText += `│ Total Commands: ${totalCommands}\n╰━━━━━━━━━━❍\n\n`;
      
      categories.forEach(cat => {
        const catCmds = commands
          .filter(cmd => cmd.category === cat.id && !cmd.dontAddCommandList)
          .map(cmd => {
            const cmdText = `${prefix}${cmd.pattern}`;
            const padding = ' '.repeat(15 - cmdText.length > 0 ? 15 - cmdText.length : 1);
            return `⦿ ${cmdText}${padding}→ ${cmd.desc || 'No description'}`;
          })
          .join('\n');
          
        if (catCmds) {
          listText += `╭━━━━❍「 ${cat.title} 」\n${catCmds}\n╰━━━━━━━━❍\n\n`;
        }
      });
      
      listText += `╭━━━━❍「ℹ️*USAGE GUIDE*」❍\n│ ▶️ Use ${prefix}list [command] for details\n│ ▶️ Example: ${prefix}list menu\n╰━━━━━━━━━━❍\n\n> 🤟🏻 TECHBROS-MD | All rights reserved`;
      
      return await conn.sendMessage(m.from, { 
        text: listText,
        contextInfo: newsletterContext 
      }, { quoted: mek });
    }
    
    // Show command details
    const cmdName = args[0].toLowerCase();
    const command = commands.find(
      c => c.pattern === cmdName || (c.alias && c.alias.includes(cmdName))
    );
    
    if (!command) {
      return await conn.sendMessage(m.from, {
        text: `❌ Command "${cmdName}" not found! Use ${prefix}list to see all commands`,
        contextInfo: newsletterContext
      }, { quoted: mek });
    }
    
    const details = `╭━━━━━❍「🔍*COMMAND DETAILS*」❍\n` +
                   `│ 🪄 *Command:* ${prefix}${command.pattern}\n` +
                   `│ 📚 *Category:* ${command.category || 'General'}\n` +
                   `│ ℹ️ *Description:* ${command.desc || 'No description available'}\n` +
                   (command.alias ? `│ 🔤 *Aliases:* ${command.alias.map(a => prefix + a).join(', ')}\n` : '') +
                   (command.use ? `│ 💡 *Usage:* ${command.use.replace(/%prefix/g, prefix)}\n` : '') +
                   (command.filename ? `│ 📁 *File:* ${command.filename}\n` : '') +
                   `╰━━━━━━━━━━━━❍`;
    
    await conn.sendMessage(m.from, {
      text: details,
      contextInfo: newsletterContext
    }, { quoted: mek });
    
  } catch (e) {
    await conn.sendMessage(m.from, {
      text: `❌ List Error: ${e.message}`
    }, { quoted: mek });
  }
});

// ======================
// ❓ HELP COMMAND
cmd({
  pattern: "help",
  desc: "Show command details or get assistance",
  category: "list",
  alias: ["support", "info"],
  react: "❓",
  filename: __filename
}, async (conn, mek, m, { args, prefix, pushname }) => {
  try {
    // Without arguments - show help menu
    if (!args[0]) {
      const helpText = `
╭━━━━━━━❍「❓ *TECHBROS-MD HELP*」 ❍
│ Welcome to ${config.BOT_NAME || 'TECHBROS-MD'}!
│ ⭐ Main Commands:
│   ${prefix}menu - Show full command menu
│   ${prefix}list - List all commands with descriptions
│   ${prefix}help [command] - Show command details
│ 📚 Command Categories:
│   ${categories.map(c => `${c.title}`).join('\n│   ')}
│ 🛠️ Support: Contact developers for assistance
╰━━━━━━━━━━━━━━❍
╭━━━━❍「ℹ️ *USAGE EXAMPLES*」 ❍
│ ▶️ ${prefix}help menu
│ ▶️ ${prefix}list download
│ ▶️ ${prefix}menu
╰━━━━━━━━━━━━❍
      `.trim();
      
      return await conn.sendMessage(m.from, {
        text: helpText,
        contextInfo: newsletterContext
      }, { quoted: mek });
    }
    
    // Show command details (same as list command)
    const cmdName = args[0].toLowerCase();
    const command = commands.find(
      c => c.pattern === cmdName || (c.alias && c.alias.includes(cmdName))
    );
    
    if (!command) {
      return await conn.sendMessage(m.from, {
        text: `❌ Command "${cmdName}" not found! Use ${prefix}list to see all commands`,
        contextInfo: newsletterContext
      }, { quoted: mek });
    }
    
    const details = `╭━━━━━━❍「🔍*COMMAND DETAILS*」❍\n` +
                   `│ 🪄 *Command:* ${prefix}${command.pattern}\n` +
                   `│ 📚 *Category:* ${command.category || 'General'}\n` +
                   `│ ℹ️ *Description:* ${command.desc || 'No description available'}\n` +
                   (command.alias ? `│ 🔤 *Aliases:* ${command.alias.map(a => prefix + a).join(', ')}\n` : '') +
                   (command.use ? `│ 💡 *Usage:* ${command.use.replace(/%prefix/g, prefix)}\n` : '') +
                   (command.filename ? `│ 📁 *File:* ${command.filename}\n` : '') +
                   `╰━━━━━━━━━━━━❍`;
    
    await conn.sendMessage(m.from, {
      text: details,
      contextInfo: newsletterContext
    }, { quoted: mek });
    
  } catch (e) {
    await conn.sendMessage(m.from, {
      text: `❌ Help Error: ${e.message}`
    }, { quoted: mek });
  }
});

// ======================
// 🗂️ CATEGORY SUBMENUS
const createSubmenu = (pattern, category, title) => {
  cmd({ pattern }, async (conn, mek, m, { from, pushname, sender }) => {
    try {
      const { date, time } = getFormattedDateTime();
      const greeting = getFancyGreeting();

      const catCmds = commands
        .filter(c => c.category === category && c.pattern && !c.dontAddCommandList)
        .map(c => `│ ◦ ${config.PREFIX || '.'}${c.pattern}`)
        .join('\n') || '│ No commands found';

      const menu = `${buildHeader(pushname, greeting, date, time)}\n\n╭───❍「 ${title} 」\n${catCmds}\n╰───────────❍\n\n> TECHBROS-MD | 🤟🏻 All rights reserved`;

      await conn.sendMessage(from, {
        image: { url: config.ALIVE_IMG },
        caption: menu,
        contextInfo: { 
          ...newsletterContext,
          mentionedJid: [sender || m.sender]
        }
      }, { quoted: mek });

    } catch (e) {
      await conn.sendMessage(from, {
        text: `❌ Submenu Error: ${e.message}`
      }, { quoted: mek });
    }
  });
};

// Generate submenus only for non-conflict categories
categories.forEach(c => {
  if (c.id !== 'list' && c.id !== 'main') {
    createSubmenu(`${c.id}menu`, c.id, c.title);
  }
});

console.log(`✅ TECHBROS-MD Menu System Loaded Successfully!`);
