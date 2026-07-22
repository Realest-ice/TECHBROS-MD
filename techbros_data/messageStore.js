/*
 * TECHBROS-MD — Message Store
 * Persists recent messages to DB for anti-delete/anti-edit recovery
 */

const { getDB, getDBType } = require('../lib/database');
const { DataTypes } = require('sequelize');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

let MessageModel;
let isInit = false;

const MAX_PER_CHAT = 200;
const MAX_MEDIA_SIZE = 8 * 1024 * 1024; // 8MB

// ── SAFE JSON — properly preserves Buffers through stringify/parse ──
function safeStringify(obj) {
    return JSON.stringify(obj, (_, v) => {
        if (v instanceof Uint8Array || Buffer.isBuffer(v)) {
            return { __type: 'Buffer', data: Buffer.from(v).toString('base64') };
        }
        return v;
    });
}

function safeParse(str) {
    return JSON.parse(str, (_, v) => {
        if (v && typeof v === 'object' && v.__type === 'Buffer' && v.data) {
            return Buffer.from(v.data, 'base64');
        }
        return v;
    });
}

function defineModel() {
    const db = getDB();
    return db.define('StoredMessage', {
        id:          { type: DataTypes.STRING, primaryKey: true },
        chatJid:     { type: DataTypes.STRING, allowNull: false },
        senderJid:   { type: DataTypes.STRING, allowNull: false },
        content:     { type: DataTypes.TEXT,   allowNull: true },
        msgType:     { type: DataTypes.STRING, allowNull: true },
        mediaBase64: { type: DataTypes.TEXT,   allowNull: true },
        timestamp:   { type: DataTypes.BIGINT, allowNull: false },
    }, { tableName: 'stored_messages', timestamps: false });
}

async function initStore() {
    if (isInit) return;
    if (getDBType() === 'sequelize') {
        MessageModel = defineModel();
        await MessageModel.sync({ alter: false });
    }
    isInit = true;
    console.log('[MessageStore] Initialized');
}

async function storeMessage(msg) {
    await initStore();
    if (!msg.key?.id || !msg.key?.remoteJid) return;
    if (msg.key.fromMe) return;

    const type = Object.keys(msg.message || {})[0] || 'unknown';
    const mediaTypes = ['imageMessage', 'videoMessage', 'documentMessage', 'ptvMessage'];

    let mediaBase64 = null;
    if (mediaTypes.includes(type)) {
        try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            if (buffer.length <= MAX_MEDIA_SIZE) {
                mediaBase64 = buffer.toString('base64');
            }
        } catch (e) {
            console.error('[MessageStore] Media download failed:', e.message);
        }
    }

    try {
        await MessageModel.upsert({
            id:          msg.key.id,
            chatJid:     msg.key.remoteJid,
            senderJid:   msg.key.participant || msg.key.remoteJid,
            content:     safeStringify(msg), // ← now Buffer-safe
            msgType:     type,
            mediaBase64,
            timestamp:   Date.now()
        });

        const count = await MessageModel.count({ where: { chatJid: msg.key.remoteJid } });
        if (count > MAX_PER_CHAT) {
            const old = await MessageModel.findAll({
                where: { chatJid: msg.key.remoteJid },
                order: [['timestamp', 'ASC']],
                limit: count - MAX_PER_CHAT
            });
            for (const o of old) await o.destroy();
        }
    } catch (e) {
        console.error('[MessageStore] Save failed:', e.message);
    }
}

async function getStoredMessage(chatJid, msgId) {
    await initStore();
    try {
        const record = await MessageModel.findOne({ where: { chatJid, id: msgId } });
        if (!record) return null;

        const message = safeParse(record.content); // ← now Buffer-safe
        const mediaBuffer = record.mediaBase64
            ? Buffer.from(record.mediaBase64, 'base64')
            : null;

        return { ...message, mediaBuffer };
    } catch (e) {
        console.error('[MessageStore] Get failed:', e.message);
        return null;
    }
}

async function deleteStoredMessage(chatJid, msgId) {
    await initStore();
    try {
        await MessageModel.destroy({ where: { chatJid, id: msgId } });
    } catch (e) { /* silent */ }
}

module.exports = { initStore, storeMessage, getStoredMessage, deleteStoredMessage };