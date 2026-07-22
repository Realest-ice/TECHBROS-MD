require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    getContentType,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { commands } = require('./commands');
const { connectDB } = require('./lib/database');
const { syncSettings } = require('./lib/configSync');
const { handleStatusBroadcast, handleStatusReply, handleViewOnce } = require('./lib/statusHandler');
const { handleGroupEvents, handleGroupParticipants } = require('./lib/groupHandler');
const { setupGroupCacheListeners } = require('./lib/groupCache');
const { storeMessage } = require('./techbros_data/messageStore');
const { handleAntiDelete } = require('./lib/antiDelete');
const { handleAntiEdit } = require('./lib/antiEdit');
const { syncSudosToConfig } = require('./techbros_data/sudoData');
const { resolveJid, resolveProfile, cleanJid, learnFromMessage, learnFromGroup, learnFromDM } = require('./lib/identity');
const { isOwner, isSudo, isDev, getRole, isGroup, isAdmin, isBotAdmin } = require('./lib/utils');
const { handleReactions } = require('./lib/reactor');
const { setupConsoleFilters } = require('./lib/consoleFilter');
setupConsoleFilters();

const Logger = require('./lib/logger'); // adjust path to match where you saved it

process.on('uncaughtException', (err) => {
    Logger.error('[FATAL] Uncaught Exception', err);
});

process.on('unhandledRejection', (reason) => {
    Logger.error('[FATAL] Unhandled Rejection', reason);
});

const app = express();
const PORT = config.port || process.env.PORT || 3000;

// =====================
// AUTO-LOAD PLUGINS
// =====================
const pluginPath = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginPath)) {
    fs.readdirSync(pluginPath).forEach(file => {
        if (file.endsWith('.js')) {
            try {
                require(path.join(pluginPath, file));
                if (config.debug) console.log(`[Plugin] Loaded: ${file}`);
            } catch (err) {
                console.error(`[Plugin] Failed to load ${file}:`, err.message);
            }
        }
    });
}

// =====================
// EXTRACT MESSAGE BODY
// =====================
function getBody(msg) {
    const m = msg.message;
    if (!m) return '';

    const type = getContentType(m);

    if (type === 'interactiveResponseMessage') {
        try {
            const parsed = JSON.parse(
                m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '{}'
            );
            return parsed?.id || parsed?.display_text || '';
        } catch { /* silent */ }
    }

    if (type === 'templateButtonReplyMessage') {
        return m.templateButtonReplyMessage?.selectedId || '';
    }

    if (type === 'listResponseMessage') {
        return m.listResponseMessage?.singleSelectReply?.selectedRowId || '';
    }

    if (type === 'buttonsResponseMessage') {
        return m.buttonsResponseMessage?.selectedButtonId || '';
    }

    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.documentMessage?.caption ||
        m[type]?.text ||
        m[type]?.description ||
        ''
    );
}

// =====================
// QUOTED MESSAGE HELPER
// =====================
function getQuoted(msg) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.quotedMessage) return null;
    return {
        key: {
            remoteJid: msg.key.remoteJid,
            id: ctx.stanzaId,
            participant: ctx.participant
        },
        message: ctx.quotedMessage
    };
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');

const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: ['Ubuntu', 'Chrome', '124.0.0.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: true,
    fireInitQueries: true,
    getMessage: async (key) => {
        return { conversation: '' };
    }
});

    sock.ev.on('creds.update', saveCreds);
    setupGroupCacheListeners(sock);

    // Anti-delete — triggers when message payload is wiped to null
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update?.message === null) {
                await handleAntiDelete(sock, update).catch(e =>
                    console.error('[AntiDelete Core]', e.message)
                );
            }
        }
    });

    // Group participant events (welcome/goodbye/promote/demote)
    sock.ev.on('group-participants.update', async (event) => {
        await handleGroupParticipants(sock, event).catch(err =>
            console.error('[GroupParticipants] Error:', err.message)
        );
    });

    // =====================
    // PAIRING LOGIC
    // =====================
    if (!sock.authState.creds.registered) {
        const phoneNumber = process.env.PHONE_NUMBER || config.owners[0]?.replace('@s.whatsapp.net', '');
        if (phoneNumber) {
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
                    console.log(`\n🔑 PAIRING CODE: ${code}\n`);
                } catch (err) {
                    console.error('[Pairing] Error:', err.message);
                }
            }, 5000);
        } else {
            console.warn('[Pairing] No phone number set. Set PHONE_NUMBER in .env');
        }
    }

    // =====================
    // ALWAYS ONLINE
    // =====================
    if (config.alwaysOnline) {
        sock.ev.on('connection.update', async ({ connection }) => {
            if (connection === 'open') {
                await sock.sendPresenceUpdate('available').catch(() => {});
            }
        });
    }

    // =====================
    // MESSAGE HANDLER
    // =====================
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            if (type !== 'notify' && type !== 'append') return;

            const msg = messages[0];
            if (!msg?.message) return;

            const remoteJid = msg.key.remoteJid;
            if (!remoteJid) return;

            // ── STATUS BROADCAST (auto view/react/save) ───────────────
            if (remoteJid === 'status@broadcast') {
                await handleStatusBroadcast(sock, msg);
                return;
            }

            // ── VIEW ONCE RECOVER (disabled — see statusHandler.js) ────
            await handleViewOnce(sock, msg);

            // ── STATUS REPLY DETECTION ─────────────────────────────────
            if (await handleStatusReply(sock, msg)) return;

            const isOutgoing = msg.key.fromMe === true;

            const participant = isOutgoing
                ? (sock.user?.id || remoteJid)
                : (msg.key.participant || remoteJid);

            storeMessage(msg).catch(() => {});

            if (msg.message?.editedMessage || msg.message?.protocolMessage?.type === 14) {
                await handleAntiEdit(sock, msg).catch(() => {});
            }

            learnFromMessage(msg);

            if (msg.key.remoteJid?.endsWith('@g.us') && msg.key.participant?.endsWith('@lid')) {
                learnFromGroup(sock, msg.key.remoteJid).catch(() => {});
            }

            if (msg.key.remoteJid?.endsWith('@lid') && !msg.key.fromMe) {
                learnFromDM(sock, msg.key.remoteJid).catch(() => {});
            }

            const primaryJid = msg.key.participant || msg.key.remoteJid || '';
            const altJid     = msg.key.participantPn || msg.key.senderPn || msg.key.remoteJidAlt || null;
            const userProfile = resolveProfile(primaryJid, altJid, msg.pushName || null);

            const sender = resolveJid(cleanJid(participant));

            if (config.autoRead && !isOutgoing) {
                await sock.readMessages([msg.key]).catch(() => {});
            }

            if (config.autoTyping && !isOutgoing && !isGroup(remoteJid)) {
                await sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});
            }

            const inGroup = isGroup(remoteJid);
            const ownerStatus = isOwner(sender);
            const sudoStatus = isSudo(sender);
            const devStatus = isDev(sender);

            await handleReactions(sock, msg, {
                sender,
                isGroup: inGroup,
                isOwner: ownerStatus,
                isSudo: sudoStatus,
                isDev: devStatus
            });

            const isInteractiveResponse = !!(
                msg.message?.listResponseMessage ||
                msg.message?.interactiveResponseMessage ||
                msg.message?.buttonsResponseMessage ||
                msg.message?.templateButtonReplyMessage
            );

            if (isOutgoing && !devStatus && !ownerStatus && !isInteractiveResponse) return;

            const body = getBody(msg);
            if (config.debug && body?.startsWith(config.prefix)) {
                console.log('[CMD Debug] sender:', sender, '| owner:', ownerStatus, '| dev:', devStatus, '| isOutgoing:', isOutgoing, '| cmd:', body);
            }

            if (!body.startsWith(config.prefix) && !isInteractiveResponse) return;

            const rawInput = body.startsWith(config.prefix)
                ? body.slice(config.prefix.length)
                : body;

            const [cmd, ...args] = rawInput.trim().split(/\s+/);
            if (!cmd) return;

            const command = commands.get(cmd.toLowerCase());
            if (!command) return;

            // Mark as read — only for valid, recognized commands
            if (config.cmdRead && !isOutgoing) {
                await sock.readMessages([msg.key]).catch(() => {});
            }

            const metadata = {
                userProfile,
                sender,
                remoteJid,
                isGroup: inGroup,
                isDev: devStatus,
                isOwner: ownerStatus,
                isSudo: sudoStatus,
                role: getRole(sender),
                isAdmin: inGroup ? await isAdmin(sock, sender, remoteJid) : false,
                botIsAdmin: inGroup ? await isBotAdmin(sock, remoteJid) : false,
                args,
                body,
                cmd: cmd.toLowerCase(),
                quoted: getQuoted(msg),
                prefix: config.prefix
            };

            // ── COMMAND RESTRICTIONS ───────────────────────────────────
            if (command.groupOnly && !inGroup) {
                return sock.sendMessage(remoteJid, {
                    text: '❌ This command can only be used in groups.'
                }, { quoted: msg });
            }

            if (command.ownerOnly && !ownerStatus && !devStatus) {
                return sock.sendMessage(remoteJid, {
                    text: '❌ Owner only command.'
                }, { quoted: msg });
            }

            if (command.adminOnly && !metadata.isAdmin && !devStatus && !sudoStatus) {
                return sock.sendMessage(remoteJid, {
                    text: '❌ Admin only command.'
                }, { quoted: msg });
            }

            if (inGroup) await handleGroupEvents(sock, msg, metadata).catch(() => {});

            try {
    await command.handler(sock, msg, metadata);
} catch (err) {
    Logger.error(`[CMD] ${cmd} failed`, err);
    if (config.debug) console.error(err.stack);
}

            if (config.autoTyping && !inGroup) {
                await sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
            }
        } catch (err) {
            console.error('[MessagesUpsert] Unhandled error:', err.message);
            if (config.debug) console.error(err.stack);
        }
    });

    // =====================
    // CONNECTION HANDLER
    // =====================
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut;

            console.log(`[Connection] Closed. Code: ${code}. Reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) {
                setTimeout(() => startBot(), 3000);
            } else {
                console.log('[Connection] Logged out. Clear session to re-pair.');
            }
        } else if (connection === 'open') {
            console.log(`[Bot] ${config.botName} is online ✅`);

            const { getDateTime } = require('./lib/utils');
            const { getContextInfo } = require('./lib/contextInfo');
            const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const { time, date } = getDateTime(config.timezone || 'Africa/Lagos');

            setTimeout(async () => {
                try {
                    await sock.sendMessage(myJid, {
                        image:   { url: config.aliveImg || 'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg' },
                        caption: `╔══════════════════════╗
║  🤖 *TECHBROS MD*  ║
╚══════════════════════╝

✅ *Bot is Online!*

🕐 *Time:* ${time}
📅 *Date:* ${date}
🔑 *Prefix:* ${config.prefix}
🌐 *Mode:* ${(config.mode || 'public').toUpperCase()}
⏱️ *Uptime:* Fresh start

_TECHBROS MD is ready_ 🚀`,
                        contextInfo: getContextInfo()
                    });
                } catch (e) { /* silent */ }
            }, 3000);
        } else if (connection === 'connecting') {
            console.log('[Bot] Connecting...');
        }
    });

    return sock;
}

// =====================
// WEB SERVER
// =====================
app.get('/', (req, res) => res.json({ status: 'online', bot: config.botName }));

app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));

// Init database, load persisted settings, then start bot
connectDB()
    .then(() => syncSettings())
    .then(() => syncSudosToConfig(config))
    .then(() => startBot())
    .catch(err => {
        console.error('[Fatal] Startup failed:', err);
        process.exit(1);
    });