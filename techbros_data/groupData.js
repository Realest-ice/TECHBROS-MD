/*
 * TECHBROS-MD — Group Data
 * Stores: welcome/goodbye settings, warn counts, badwords, antilink, antispam
 */

const { getDB, getDBType } = require('../lib/database');
const { DataTypes } = require('sequelize');

let WelcomeModel, WarnModel, BadWordsModel, GroupSettingsModel;
let isInit = false;


// ── SEQUELIZE MODELS ───────────────────────────────────────────
function defineModels() {
    const db = getDB();
    
    SpamTrackModel = db.define('SpamTrack', {
    id:        { type: DataTypes.STRING, primaryKey: true }, // "groupJid:sender"
    groupJid:  { type: DataTypes.STRING, allowNull: false },
    sender:    { type: DataTypes.STRING, allowNull: false },
    timestamps: { type: DataTypes.TEXT, defaultValue: '[]' } // JSON array of send times
}, { tableName: 'spam_tracker', timestamps: false });
    
    WelcomeModel = db.define('GroupWelcome', {
        groupJid:     { type: DataTypes.STRING, primaryKey: true },
        welcomeOn:    { type: DataTypes.BOOLEAN, defaultValue: false },
        goodbyeOn:    { type: DataTypes.BOOLEAN, defaultValue: false },
        welcomeMsg:   { type: DataTypes.TEXT, defaultValue: '👋 Welcome @user to *@group*!\nEnjoy your stay 🎉' },
        goodbyeMsg:   { type: DataTypes.TEXT, defaultValue: '*GOODBYE 👋*\n\n👤 *User:* @user\n🚪 *Status:* Left the group\n\nWe hope to see you again! ✌️' },
        newsletterLink: { type: DataTypes.TEXT, defaultValue: 'https://whatsapp.com/channel/0029Vb7LyCHEquiRPdrd0d3w' }
    }, { tableName: 'group_welcome', timestamps: false });

    WarnModel = db.define('GroupWarn', {
        id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        groupJid: { type: DataTypes.STRING, allowNull: false },
        userJid:  { type: DataTypes.STRING, allowNull: false },
        count:    { type: DataTypes.INTEGER, defaultValue: 0 },
        maxWarns: { type: DataTypes.INTEGER, defaultValue: 3 },
        reason:   { type: DataTypes.TEXT, defaultValue: '' },
    }, { tableName: 'group_warns', timestamps: false });

    BadWordsModel = db.define('GroupBadWords', {
        groupJid: { type: DataTypes.STRING, primaryKey: true },
        enabled:  { type: DataTypes.BOOLEAN, defaultValue: false },
        words:    { type: DataTypes.TEXT, defaultValue: '' },
    }, { tableName: 'group_badwords', timestamps: false });

    GroupSettingsModel = db.define('GroupSettings', {
        groupJid:    { type: DataTypes.STRING, primaryKey: true },
        antilink:    { type: DataTypes.BOOLEAN, defaultValue: false },
        antispam:    { type: DataTypes.BOOLEAN, defaultValue: false },
        spamMax:     { type: DataTypes.INTEGER, defaultValue: 5 },
        spamSecs:    { type: DataTypes.INTEGER, defaultValue: 5 },
    }, { tableName: 'group_settings', timestamps: false });
}

async function initGroupData() {
    if (isInit) return;
    const type = getDBType();

    if (type === 'sequelize') {
        defineModels();
        // CHANGED HERE: alter is now true for WelcomeModel to fix the missing column
        await SpamTrackModel.sync({ alter: false });
        await WelcomeModel.sync({ alter: true });
        await WarnModel.sync({ alter: false });
        await BadWordsModel.sync({ alter: false });
        await GroupSettingsModel.sync({ alter: false });
    }

    isInit = true;
    console.log('[GroupData] Initialized');
}

// ── SPAM TRACKING ────────────────────────────────────────────
async function getSpamRecord(groupJid, sender) {
    await initGroupData();
    const id = `${groupJid}:${sender}`;
    const [record] = await SpamTrackModel.findOrCreate({
        where: { id }, defaults: { id, groupJid, sender, timestamps: '[]' }
    });
    return record;
}

async function updateSpamRecord(groupJid, sender, timestampsArray) {
    await initGroupData();
    const id = `${groupJid}:${sender}`;
    await SpamTrackModel.upsert({ id, groupJid, sender, timestamps: JSON.stringify(timestampsArray) });
}
// ── WELCOME/GOODBYE ────────────────────────────────────────────
async function getWelcome(groupJid) {
    await initGroupData();
    const [record] = await WelcomeModel.findOrCreate({
        where: { groupJid }, defaults: { groupJid }
    });
    return record;
}

async function setWelcome(groupJid, data) {
    await initGroupData();
    await WelcomeModel.upsert({ groupJid, ...data });
}

// ── WARNS ──────────────────────────────────────────────────────
async function getWarn(groupJid, userJid) {
    await initGroupData();
    const [record] = await WarnModel.findOrCreate({
        where: { groupJid, userJid }, defaults: { groupJid, userJid, count: 0 }
    });
    return record;
}

async function addWarn(groupJid, userJid, reason = '') {
    await initGroupData();
    const record = await getWarn(groupJid, userJid);
    record.count  += 1;
    record.reason  = reason;
    await record.save();
    return record;
}

async function resetWarn(groupJid, userJid) {
    await initGroupData();
    await WarnModel.update({ count: 0, reason: '' }, { where: { groupJid, userJid } });
}

async function getGroupWarns(groupJid) {
    await initGroupData();
    return await WarnModel.findAll({ where: { groupJid } });
}

// ── BAD WORDS ──────────────────────────────────────────────────
async function getBadWords(groupJid) {
    await initGroupData();
    const [record] = await BadWordsModel.findOrCreate({
        where: { groupJid }, defaults: { groupJid }
    });
    return record;
}

async function setBadWords(groupJid, data) {
    await initGroupData();
    await BadWordsModel.upsert({ groupJid, ...data });
}

// ── GROUP SETTINGS ─────────────────────────────────────────────
async function getGroupSettings(groupJid) {
    await initGroupData();
    const [record] = await GroupSettingsModel.findOrCreate({
        where: { groupJid }, defaults: { groupJid }
    });
    return record;
}

async function setGroupSettings(groupJid, data) {
    await initGroupData();
    await GroupSettingsModel.upsert({ groupJid, ...data });
}

module.exports = {
    initGroupData,
    getWelcome, setWelcome,
    getWarn, addWarn, resetWarn, getGroupWarns,
    getBadWords, setBadWords,
    getGroupSettings, setGroupSettings
};