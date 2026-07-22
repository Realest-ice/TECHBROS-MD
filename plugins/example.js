const { register } = require('../commands');
register('hello', async (sock, msg) => {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Hello, world!' });
});