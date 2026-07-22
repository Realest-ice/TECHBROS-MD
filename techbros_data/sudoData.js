// techbros_data/sudoData.js
const { getDB, getDBType } = require('../lib/database');
const { DataTypes } = require('sequelize');

let SudoModel;
let isInit = false;

function defineModel() {
    const db = getDB();
    return db.define('Sudo', {
        jid: { type: DataTypes.STRING, primaryKey: true }
    }, { tableName: 'sudo_users', timestamps: false });
}

async function initSudo() {
    if (isInit) return;
    if (getDBType() === 'sequelize') {
        SudoModel = defineModel();
        await SudoModel.sync({ alter: false });
    }
    isInit = true;
}

async function addSudo(jid) {
    await initSudo();
    await SudoModel.findOrCreate({ where: { jid } });
}

async function removeSudo(jid) {
    await initSudo();
    await SudoModel.destroy({ where: { jid } });
}

async function getSudoList() {
    await initSudo();
    const rows = await SudoModel.findAll();
    return rows.map(r => r.jid);
}

async function syncSudosToConfig(config) {
    const list = await getSudoList();
    config.sudos = [...new Set([...config.sudos, ...list])];
}

module.exports = { addSudo, removeSudo, getSudoList, initSudo, syncSudosToConfig };