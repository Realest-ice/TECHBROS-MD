const { getDB, getDBType } = require('../lib/database');
const { DataTypes } = require('sequelize');

let VaultModel;
let isInit = false;

async function initVault() {
    if (isInit) return;
    if (getDBType() === 'sequelize') {
        const db = getDB();
        VaultModel = db.define('VVVault', {
            id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            senderJid:  { type: DataTypes.STRING, allowNull: false },
            chatJid:    { type: DataTypes.STRING, allowNull: false },
            type:       { type: DataTypes.STRING, allowNull: false }, // image | video | audio
            mediaBase64:{ type: DataTypes.TEXT, allowNull: false },
            caption:    { type: DataTypes.TEXT, defaultValue: '' },
            timestamp:  { type: DataTypes.BIGINT, allowNull: false }
        }, { tableName: 'vv_vault', timestamps: false });
        await VaultModel.sync({ alter: false });
    }
    isInit = true;
}

const MAX_VAULT = 100; // keep last 100 items total

async function saveToVault(senderJid, chatJid, type, buffer, caption = '') {
    await initVault();
    await VaultModel.create({
        senderJid, chatJid, type,
        mediaBase64: buffer.toString('base64'),
        caption, timestamp: Date.now()
    });

    const count = await VaultModel.count();
    if (count > MAX_VAULT) {
        const old = await VaultModel.findAll({ order: [['timestamp', 'ASC']], limit: count - MAX_VAULT });
        for (const o of old) await o.destroy();
    }
}

async function listVault() {
    await initVault();
    return await VaultModel.findAll({ order: [['timestamp', 'DESC']] });
}

async function getVaultItem(id) {
    await initVault();
    return await VaultModel.findOne({ where: { id } });
}

async function deleteVaultItem(id) {
    await initVault();
    await VaultModel.destroy({ where: { id } });
}

module.exports = { saveToVault, listVault, getVaultItem, deleteVaultItem };