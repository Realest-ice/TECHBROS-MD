/*
 * TECHBROS-MD
 * Database Connection Manager
 * Supports: SQLite (default) | MongoDB | PostgreSQL
 * This file ONLY handles the connection — schemas live in techbros_data/
 */

require('dotenv').config();

const DB_TYPE   = process.env.DB_TYPE   || 'sqlite';
const MONGO_URL = process.env.MONGO_URL || '';
const DB_URL    = process.env.DATABASE_URL || './techbros.db';

let DATABASE    = null;
let mongoose    = null;
let isConnected = false;

async function connectDB() {
    if (isConnected) return;

    if (DB_TYPE === 'mongodb' && MONGO_URL) {
        // ── MONGODB ────────────────────────────────────────────────
        mongoose = require('mongoose');
        await mongoose.connect(MONGO_URL);
        DATABASE    = mongoose;
        isConnected = true;
        console.log('✅ MongoDB connected');

    } else {
        // ── SQLITE / POSTGRES (Sequelize) ──────────────────────────
        const { Sequelize } = require('sequelize');

        const sequelize = DB_URL.startsWith('postgres')
            ? new Sequelize(DB_URL, {
                dialect: 'postgres',
                dialectOptions: {
                    ssl: { require: true, rejectUnauthorized: false }
                },
                logging: false
            })
            : new Sequelize({
                dialect:  'sqlite',
                storage:  DB_URL,
                logging:  false
            });

        await sequelize.authenticate();
        DATABASE    = sequelize;
        isConnected = true;
        console.log('✅ Database connected —', DB_URL.startsWith('postgres') ? 'PostgreSQL' : 'SQLite (' + DB_URL + ')');
    }
}

function getDB() {
    if (!DATABASE) throw new Error('[DB] Not connected. Call connectDB() first.');
    return DATABASE;
}

function getDBType() {
    return DB_TYPE === 'mongodb' && MONGO_URL ? 'mongodb' : 'sequelize';
}

module.exports = { connectDB, getDB, getDBType };
