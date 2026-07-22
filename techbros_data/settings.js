/*
 * TECHBROS-MD — Dynamic Settings DB
 * Universal key-value store for all runtime config
 * Dev: Realest_ice❄️🤟
 */

const { getDB, getDBType } = require('../lib/database');
const { DataTypes } = require('sequelize');

let SettingsModel;
let isInit = false;

// ── SEQUELIZE ──────────────────────────────────────────────────
function defineSequelizeModel() {
    const db = getDB();
    return db.define('DynamicSettings', {
        key:   { type: DataTypes.STRING, primaryKey: true, allowNull: false },
        value: { type: DataTypes.TEXT,   allowNull: true }
    }, { tableName: 'bot_settings_dynamic', timestamps: false });
}

// ── MONGOOSE ───────────────────────────────────────────────────
function defineMongoModel() {
    const mongoose = getDB();
    const schema   = new mongoose.Schema({
        key:   { type: String, required: true, unique: true },
        value: { type: String, default: null }
    });
    return mongoose.models.DynamicSettings || mongoose.model('DynamicSettings', schema);
}

async function initSettings() {
    if (isInit) return;
    const type = getDBType();
    if (type === 'mongodb') {
        SettingsModel = defineMongoModel();
    } else {
        SettingsModel = defineSequelizeModel();
        await SettingsModel.sync({ alter: false });
    }
    isInit = true;
    console.log('[Settings] Dynamic DB ready');
}

// ── SAVE ONE SETTING ───────────────────────────────────────────
async function setSetting(key, value) {
    await initSettings();
    const k = key.toLowerCase().trim();
    const v = String(value);
    try {
        if (getDBType() === 'mongodb') {
            await SettingsModel.findOneAndUpdate({ key: k }, { value: v }, { upsert: true });
        } else {
            await SettingsModel.upsert({ key: k, value: v });
        }
    } catch (e) {
        console.error('[Settings] Save error:', e.message);
    }
}

// ── GET ALL SETTINGS → flat map { key: value } ─────────────────
async function getSettings() {
    await initSettings();
    try {
        if (getDBType() === 'mongodb') {
            const docs = await SettingsModel.find({});
            return Object.fromEntries(docs.map(d => [d.key, d.value]));
        } else {
            const rows = await SettingsModel.findAll();
            return Object.fromEntries(rows.map(r => [r.key, r.value]));
        }
    } catch (e) {
        console.error('[Settings] Fetch error:', e.message);
        return {};
    }
}

// ── GET ONE SETTING ────────────────────────────────────────────
async function getSetting(key) {
    await initSettings();
    const k = key.toLowerCase().trim();
    try {
        if (getDBType() === 'mongodb') {
            const doc = await SettingsModel.findOne({ key: k });
            return doc?.value ?? null;
        } else {
            const row = await SettingsModel.findOne({ where: { key: k } });
            return row?.value ?? null;
        }
    } catch (e) {
        return null;
    }
}

module.exports = { setSetting, getSettings, getSetting, initSettings };
