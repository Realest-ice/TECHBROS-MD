const { connectDB } = require('./database');
const { handleStatusBroadcast, handleStatusReply, handleViewOnce } = require('./statusHandler');
const { resolveJid, resolveProfile, cleanJid, learnFromMessage, learnFromGroup, learnFromDM, isBot, forceMapping } = require('./identity');
const { isOwner, isSudo, isDev, getRole, isGroup, isAdmin } = require('./utils');
const { handleReactions } = require('./reactor');

module.exports = { 
    connectDB,
    handleStatusBroadcast,
    handleStatusReply,
    handleViewOnce,
    resolveJid,
    resolveProfile,
    cleanJid,
    learnFromMessage,
    learnFromGroup,
    learnFromDM,
    isBot,
    forceMapping,
    isOwner,
    isSudo,
    isDev,
    getRole,
    isGroup,
    isAdmin,
    handleReactions,
 };   