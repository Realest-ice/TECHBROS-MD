/*
 * TECHBROS-MD — Anti Delete / Anti Edit Settings DB
 * gc/dm toggles + destination path for both
 */

const { getDB, getDBType } = require('../lib/database');
const { DataTypes } = require('sequelize');

let AntiModel;
let isInit = false;

function defineModel() {
    const db = getDB();
    return db.define('AntiSettings', {
        id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: false, defaultValue: 1 },

        // Anti Delete
        del_gc_status: { type: DataTypes.BOOLEAN, defaultValue: false },
        del_dm_status: { type: DataTypes.BOOLEAN, defaultValue: false },
        del_path:      { type: DataTypes.STRING,  defaultValue: 'log' }, // log = your DM | chat = same chat

        // Anti Edit
        edit_gc_status: { type: DataTypes.BOOLEAN, defaultValue: false },
        edit_dm_status: { type: DataTypes.BOOLEAN, defaultValue: false },
        edit_path:      { type: DataTypes.STRING,  defaultValue: 'log' },

    }, {
        tableName: 'anti_settings',
        timestamps: false,
        hooks: {
            beforeCreate: r => { r.id = 1; },
            beforeBulkCreate: rs => { rs.forEach(r => { r.id = 1; }); }
        }
    });
}

async function initAnti() {
    if (isInit) return;
    if (getDBType() === 'sequelize') {
        AntiModel = defineModel();
        await AntiModel.sync({ alter: true }); // alter:true once to add edit_* + path columns
        await AntiModel.findOrCreate({ where: { id: 1 }, defaults: {} });
    }
    isInit = true;
    console.log('[AntiSettings] DB ready');
}

// ── ANTI DELETE ────────────────────────────────────────────────
async function setAntiDelete(type, status) {
    await initAnti();
    const record = await AntiModel.findByPk(1);
    if (type === 'gc') record.del_gc_status = status;
    else if (type === 'dm') record.del_dm_status = status;
    await record.save();
}

async function getAntiDelete(type) {
    await initAnti();
    const record = await AntiModel.findByPk(1);
    return type === 'gc' ? record.del_gc_status : record.del_dm_status;
}

// ── ANTI EDIT ──────────────────────────────────────────────────
async function setAntiEdit(type, status) {
    await initAnti();
    const record = await AntiModel.findByPk(1);
    if (type === 'gc') record.edit_gc_status = status;
    else if (type === 'dm') record.edit_dm_status = status;
    await record.save();
}

async function getAntiEdit(type) {
    await initAnti();
    const record = await AntiModel.findByPk(1);
    return type === 'gc' ? record.edit_gc_status : record.edit_dm_status;
}

// ── PATH (destination) ────────────────────────────────────────
async function setPath(feature, path) {
    await initAnti();
    const record = await AntiModel.findByPk(1);
    if (feature === 'delete') record.del_path = path;
    else if (feature === 'edit') record.edit_path = path;
    await record.save();
}

async function getPath(feature) {
    await initAnti();
    const record = await AntiModel.findByPk(1);
    return feature === 'delete' ? record.del_path : record.edit_path;
}

// ── GET ALL (for settings display) ─────────────────────────────
async function getAllAntiSettings() {
    await initAnti();
    const record = await AntiModel.findByPk(1);
    return record?.dataValues || {};
}

module.exports = {
    initAnti,
    setAntiDelete, getAntiDelete,
    setAntiEdit, getAntiEdit,
    setPath, getPath,
    getAllAntiSettings
};