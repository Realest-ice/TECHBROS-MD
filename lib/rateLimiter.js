// lib/rateLimiter.js
// Simple per-chat send queue to avoid WhatsApp spam-flagging on bursts

const queues = new Map(); // groupJid -> { queue: [], processing: false }

function enqueueSend(sock, jid, content, delayMs = 800) {
    return new Promise((resolve, reject) => {
        if (!queues.has(jid)) queues.set(jid, { queue: [], processing: false });
        const q = queues.get(jid);
        q.queue.push({ content, resolve, reject });
        processQueue(sock, jid, delayMs);
    });
}

async function processQueue(sock, jid, delayMs) {
    const q = queues.get(jid);
    if (q.processing) return;
    q.processing = true;

    while (q.queue.length > 0) {
        const { content, resolve, reject } = q.queue.shift();
        try {
            const result = await sock.sendMessage(jid, content);
            resolve(result);
        } catch (e) {
            reject(e);
        }
        if (q.queue.length > 0) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    q.processing = false;
}

module.exports = { enqueueSend };