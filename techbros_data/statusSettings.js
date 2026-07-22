// techbros_data/statusSettings.js
const { getDB, getDBType } = require('../lib/database'); // Adjust path to point to your DB connection file

let StatusModel = null;

// Initialize the model based on the active database type
function initModel() {
    if (StatusModel) return StatusModel;

    const db = getDB();
    const type = getDBType();

    if (type === 'mongodb') {
        // ── MONGODB SCHEMA ───────────────────────────────────
        const mongoose = require('mongoose');
        const schema = new mongoose.Schema({
            sessionId: String,
            jid: String,
            autoStatusSeen: { type: Boolean, default: null },
            autoStatusReact: { type: Boolean, default: null }
        });
        StatusModel = mongoose.models.StatusSettings || mongoose.model('StatusSettings', schema);
        
    } else {
        // ── SEQUELIZE SCHEMA (SQLite / Postgres) ─────────────
        const { DataTypes } = require('sequelize');
        StatusModel = db.define('StatusSettings', {
            sessionId: { type: DataTypes.STRING, allowNull: false },
            jid: { type: DataTypes.STRING, allowNull: false },
            autoStatusSeen: { type: DataTypes.BOOLEAN, allowNull: true },
            autoStatusReact: { type: DataTypes.BOOLEAN, allowNull: true }
        }, {
            indexes: [
                { unique: true, fields: ['sessionId', 'jid'] }
            ]
        });
        // Ensure table exists
        StatusModel.sync({ alter: true }).catch(() => {});
    }

    return StatusModel;
}

// ==========================================
// THE FUNCTIONS YOUR STATUS HANDLER USES
// ==========================================

// 1. READ (Get Settings)
async function techbros_getUserAutoStatus(sessionId, jid) {
    const model = initModel();
    const type = getDBType();

    if (type === 'mongodb') {
        return await model.findOne({ sessionId, jid });
    } else {
        return await model.findOne({ where: { sessionId, jid } });
    }
}

// 2. WRITE (Update Settings)
async function techbros_setUserAutoStatus(sessionId, jid, updates) {
    const model = initModel();
    const type = getDBType();

    if (type === 'mongodb') {
        // Mongoose Upsert
        return await model.findOneAndUpdate(
            { sessionId, jid },
            { $set: updates },
            { new: true, upsert: true }
        );
    } else {
        // Sequelize Find-or-Create / Update logic
        let record = await model.findOne({ where: { sessionId, jid } });
        if (record) {
            return await record.update(updates);
        } else {
            return await model.create({ sessionId, jid, ...updates });
        }
    }
}

module.exports = { techbros_getUserAutoStatus, techbros_setUserAutoStatus };