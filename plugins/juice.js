const { register } = require('../commands');
const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');
const config = require('../config');

const API_BASE = 'https://juicewrldapi.com/juicewrld';
const JUICE_THUMB = 'https://i.ibb.co/rK5VWDnN/1782155159710.jpg';

// ==========================================
// 1. MAIN SEARCH COMMAND
// ==========================================
register({
    name: 'juice',
    aliases: ['999', 'jw'],
    category: 'special',
    desc: 'Juice WRLD search system',
    react: '🕊️'
}, async (sock, msg, metadata) => {
    const remoteJid = msg.key.remoteJid;
    const query = metadata.args.join(' ');

    if (!query) return sock.sendMessage(remoteJid, { text: '❌ Provide a song name. Example: .juice wishing well' });

    try {
        if (query.toLowerCase() === 'radio') {
            const res = await axios.get(`${API_BASE}/radio/random/`);
            const songName = res.data?.title || 'Unknown';
            return await sendInteractiveMessage(sock, remoteJid, {
                text: `📻 *999 RADIO*\n\n🎵 ${songName}`,
                footer: 'TECHBROS-MD • 999',
                image: { url: JUICE_THUMB },
                interactiveButtons: [
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 DOWNLOAD', id: `.juiceplay ${songName}` }) },
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📝 LYRICS', id: `.juicelyrics ${songName}` }) }
                ]
            }, { quoted: msg });
        }

        const searchRes = await axios.get(`${API_BASE}/songs/?search=${encodeURIComponent(query)}`);
        const results = searchRes.data?.results || [];
        if (!results.length) return sock.sendMessage(remoteJid, { text: '❌ No songs found in the vault.' });

        const song = results[0];
        const caption = `🕊️ *999 VAULT SEARCH*\n\n🎵 *TRACK:* ${song.name}\n📂 *CATEGORY:* ${song.category || 'VAULT'}\n🎹 *PROD:* ${song.producers || 'Unknown'}\n\n*TECHBROS-MD • 999*`;

        await sendInteractiveMessage(sock, remoteJid, {
            text: caption,
            footer: 'TECHBROS-MD • 999',
            image: { url: song.image || JUICE_THUMB },
            interactiveButtons: [
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 DOWNLOAD', id: `.juiceplay ${song.name}` }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📝 LYRICS', id: `.juicelyrics ${song.name}` }) }
            ]
        }, { quoted: msg });
    } catch (e) {
        sock.sendMessage(remoteJid, { text: '❌ Vault error. API unreachable.' });
    }
});

// ==========================================
// 2. AUDIO DOWNLOADER
// ==========================================
register({
    name: 'juiceplay',
    dontAddCommandList: true
}, async (sock, msg, metadata) => {
    const remoteJid = msg.key.remoteJid;
    const query = metadata.args.join(' ');
    if (!query) return;

    try {
        await sock.sendMessage(remoteJid, { text: `📥 *Locating: ${query}...*` });
        const browseRes = await axios.get(`${API_BASE}/files/browse/?search=${encodeURIComponent(query)}`);
        const audioFile = (browseRes.data.items || []).find(i => i.type === 'file' && i.name.toLowerCase().endsWith('.mp3'));
        
        if (!audioFile) return sock.sendMessage(remoteJid, { text: '❌ File not found.' });

        const res = await axios.get(`${API_BASE}/files/download/?path=${encodeURIComponent(audioFile.path)}`, { responseType: 'arraybuffer' });
        await sock.sendMessage(remoteJid, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg' }, { quoted: msg });
    } catch (e) {
        sock.sendMessage(remoteJid, { text: '❌ Download failed.' });
    }
});

// ==========================================
// 3. LYRICS EXTRACTOR
// ==========================================

   register({
    name: 'juicelyrics',
    dontAddCommandList: true
}, async (sock, msg, metadata) => {
    const remoteJid = msg.key.remoteJid;
    const query = metadata.args.join(' ');
    if (!query) return;

    try {
        await sock.sendMessage(remoteJid, { text: `🔍 *Fetching lyrics for: ${query}...*` });
        
        // Use the same search endpoint that you used for the .juice command
        const res = await axios.get(`https://juicewrldapi.com/juicewrld/songs/?search=${encodeURIComponent(query)}`);
        
        // Look at the console in 1782272720430.jpeg - the data is in res.data.results[0]
        const song = res.data?.results?.[0];

        if (!song || !song.lyrics) {
            return sock.sendMessage(remoteJid, { text: '❌ Lyrics not found in the vault for this song.' });
        }

        // Clean up the formatting (replace \n with actual line breaks)
        const formattedLyrics = song.lyrics.replace(/\\n/g, '\n');

        await sock.sendMessage(remoteJid, { 
            text: `🎵 *${song.name || query}*\n\n${formattedLyrics}\n\n*TECHBROS-MD • 999*` 
        });
    } catch (e) {
        console.error(e);
        sock.sendMessage(remoteJid, { text: '❌ Error retrieving lyrics.' });
    }
});
