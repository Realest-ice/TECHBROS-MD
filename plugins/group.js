/*
 * TECHBROS-MD — Group Management
 */

const { register } = require('../commands');
const { react } = require('../lib/reactor');
const { resolveJid } = require('../lib/identity');
const { getGroupAdmins, parseJid } = require('../lib/utils');
const {
    getWelcome, setWelcome,
    getWarn, addWarn, resetWarn, getGroupWarns,
    getBadWords, setBadWords,
    getGroupSettings, setGroupSettings
} = require('../techbros_data/groupData');
const { getContextInfo } = require('../lib/contextInfo');
const config = require('../config');

const FALLBACK_IMG = 'https://i.ibb.co/d0Fv6ZS9/IMG-20250425-WA0004.jpg';
// ── HELPERS ────────────────────────────────────────────────────
const getTarget = (msg, metadata) => {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted    = metadata.quoted?.key?.participant;
    const argNum    = metadata.args[0]?.replace(/[^0-9]/g, '');
    const fromArg   = argNum ? `${argNum}@s.whatsapp.net` : null;
    return resolveJid(mentioned || quoted || fromArg || null);
};

const reply = (sock, remoteJid, text, msg, mentions = []) =>
    sock.sendMessage(remoteJid, { text, mentions }, { quoted: msg });

const getMeta = async (sock, jid) => {
    try { return await sock.groupMetadata(jid); } catch { return null; }
};

const formatMsg = (template, user, group) =>
    template.replace(/@user/g, `@${parseJid(user)}`).replace(/@group/g, group);

// ── PROMOTE ────────────────────────────────────────────────────
register({
    name: 'promote', aliases: ['makeadmin'],
    category: 'group', desc: 'Promote member to admin',
    groupOnly: true, adminOnly: true, react: '⬆️'
}, async (sock, msg, metadata) => {
    const { remoteJid, botIsAdmin } = metadata;
    if (!botIsAdmin) return reply(sock, remoteJid, '❌ I need to be admin to promote.', msg);
    const target = getTarget(msg, metadata);
    if (!target) return reply(sock, remoteJid, '❌ Tag or reply to a user.', msg);
    try {
        await sock.groupParticipantsUpdate(remoteJid, [target], 'promote');
        await react(sock, msg, '⬆️');
        await sock.sendMessage(remoteJid, { text: `⬆️ @${parseJid(target)} promoted to admin!`, mentions: [target] });
    } catch (e) { reply(sock, remoteJid, `❌ Failed: ${e.message}`, msg); }
});

// ── DEMOTE ─────────────────────────────────────────────────────
register({
    name: 'demote', aliases: ['removeadmin'],
    category: 'group', desc: 'Demote admin to member',
    groupOnly: true, adminOnly: true, react: '⬇️'
}, async (sock, msg, metadata) => {
    const { remoteJid, botIsAdmin } = metadata;
    if (!botIsAdmin) return reply(sock, remoteJid, '❌ I need to be admin to demote.', msg);
    const target = getTarget(msg, metadata);
    if (!target) return reply(sock, remoteJid, '❌ Tag or reply to a user.', msg);
    try {
        await sock.groupParticipantsUpdate(remoteJid, [target], 'demote');
        await react(sock, msg, '⬇️');
        await sock.sendMessage(remoteJid, { text: `⬇️ @${parseJid(target)} demoted.`, mentions: [target] });
    } catch (e) { reply(sock, remoteJid, `❌ Failed: ${e.message}`, msg); }
});

// ── KICK ───────────────────────────────────────────────────────
register({
    name: 'kick', aliases: ['remove', 'ban'],
    category: 'group', desc: 'Remove a member from group',
    groupOnly: true, adminOnly: true, react: '👢'
}, async (sock, msg, metadata) => {
    const { remoteJid, botIsAdmin } = metadata;
    if (!botIsAdmin) return reply(sock, remoteJid, '❌ I need to be admin to kick.', msg);
    const target = getTarget(msg, metadata);
    if (!target) return reply(sock, remoteJid, '❌ Tag or reply to a user.', msg);
    try {
        await react(sock, msg, '👢');
        await sock.groupParticipantsUpdate(remoteJid, [target], 'remove');
        await sock.sendMessage(remoteJid, { text: `👢 @${parseJid(target)} has been removed.`, mentions: [target] });
    } catch (e) { reply(sock, remoteJid, `❌ Failed: ${e.message}`, msg); }
});

// ── ADD ────────────────────────────────────────────────────────
register({
    name: 'add',
    category: 'group', desc: 'Add a member to the group',
    groupOnly: true, adminOnly: true, react: '➕'
}, async (sock, msg, metadata) => {
    const { remoteJid, botIsAdmin, args } = metadata;
    if (!botIsAdmin) return reply(sock, remoteJid, '❌ I need to be admin to add members.', msg);
    const num = args[0]?.replace(/[^0-9]/g, '');
    if (!num) return reply(sock, remoteJid, `❌ Usage: ${config.prefix}add <number>`, msg);
    const jid = `${num}@s.whatsapp.net`;
    try {
        await react(sock, msg, '➕');
        const res    = await sock.groupParticipantsUpdate(remoteJid, [jid], 'add');
        const status = res?.find?.(p => p.id === jid)?.status;
        if (status === '200')      await reply(sock, remoteJid, `✅ +${num} added successfully.`, msg);
        else if (status === '403') await reply(sock, remoteJid, `❌ +${num} has privacy settings blocking this.`, msg);
        else if (status === '408') await reply(sock, remoteJid, `❌ +${num} must be invited via group link.`, msg);
        else if (status === '409') await reply(sock, remoteJid, `⚠️ +${num} is already in the group.`, msg);
        else await reply(sock, remoteJid, `✅ Request sent for +${num}.`, msg);
    } catch (e) { reply(sock, remoteJid, `❌ Failed: ${e.message}`, msg); }
});

// ── GROUP LINK / REVOKE ────────────────────────────────────────
register({
    name: 'grouplink', aliases: ['gl', 'invitelink'],
    category: 'group', desc: 'Get group invite link',
    groupOnly: true, adminOnly: true, react: '🔗'
}, async (sock, msg, metadata) => {
    const { remoteJid, botIsAdmin } = metadata;
    if (!botIsAdmin) return reply(sock, remoteJid, '❌ I need to be admin.', msg);
    try {
        const code = await sock.groupInviteCode(remoteJid);
        await reply(sock, remoteJid, `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}`, msg);
    } catch (e) { reply(sock, remoteJid, `❌ Failed: ${e.message}`, msg); }
});

register({
    name: 'revokelink', aliases: ['resetlink', 'rl'],
    category: 'group', desc: 'Reset group invite link',
    groupOnly: true, adminOnly: true, react: '🔄'
}, async (sock, msg, metadata) => {
    const { remoteJid, botIsAdmin } = metadata;
    if (!botIsAdmin) return reply(sock, remoteJid, '❌ I need to be admin.', msg);
    try {
        const code = await sock.groupRevokeInvite(remoteJid);
        await react(sock, msg, '✅');
        await reply(sock, remoteJid, `✅ Link reset!\n\n🔗 https://chat.whatsapp.com/${code}`, msg);
    } catch (e) { reply(sock, remoteJid, `❌ Failed: ${e.message}`, msg); }
});

// ── TAGALL / HIDETAG ───────────────────────────────────────────
register({
    name: 'tagall', aliases: ['everyone', 'mentionall'],
    category: 'group', desc: 'Tag all group members',
    groupOnly: true, adminOnly: true, react: '📢'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const meta = await getMeta(sock, remoteJid);
    if (!meta) return reply(sock, remoteJid, '❌ Could not fetch group info.', msg);
    const participants = meta.participants.map(p => p.id);
    const text = `${args.join(' ') || '📢 Attention!'}\n\n${participants.map(p => `@${parseJid(p)}`).join('\n')}`;
    await react(sock, msg, '📢');
    await sock.sendMessage(remoteJid, { text, mentions: participants });
});

register({
    name: 'hidetag', aliases: ['ht', 'stag'],
    category: 'group', desc: 'Tag all members silently',
    groupOnly: true, adminOnly: true, react: '👻'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const meta = await getMeta(sock, remoteJid);
    if (!meta) return reply(sock, remoteJid, '❌ Could not fetch group info.', msg);
    await react(sock, msg, '👻');
    await sock.sendMessage(remoteJid, {
        text:     args.join(' ') || '👻',
        mentions: meta.participants.map(p => p.id)
    });
});

// ── MUTE / UNMUTE ──────────────────────────────────────────────
register({
    name: 'mute', aliases: ['close', 'lock'],
    category: 'group', desc: 'Mute group — admins only',
    groupOnly: true, adminOnly: true, react: '🔇'
}, async (sock, msg, metadata) => {
    const { remoteJid, botIsAdmin } = metadata;
    if (!botIsAdmin) return reply(sock, remoteJid, '❌ I need to be admin.', msg);
    try {
        await sock.groupSettingUpdate(remoteJid, 'announcement');
        await react(sock, msg, '🔇');
        await reply(sock, remoteJid, '🔇 Group muted — only admins can send.', msg);
    } catch (e) { reply(sock, remoteJid, `❌ Failed: ${e.message}`, msg); }
});

register({
    name: 'unmute', aliases: ['open', 'unlock'],
    category: 'group', desc: 'Unmute group — everyone can send',
    groupOnly: true, adminOnly: true, react: '🔊'
}, async (sock, msg, metadata) => {
    const { remoteJid, botIsAdmin } = metadata;
    if (!botIsAdmin) return reply(sock, remoteJid, '❌ I need to be admin.', msg);
    try {
        await sock.groupSettingUpdate(remoteJid, 'not_announcement');
        await react(sock, msg, '🔊');
        await reply(sock, remoteJid, '🔊 Group unmuted — everyone can send.', msg);
    } catch (e) { reply(sock, remoteJid, `❌ Failed: ${e.message}`, msg); }
});

// ── GROUP INFO ─────────────────────────────────────────────────
register({
    name: 'groupinfo', aliases: ['ginfo', 'gc'],
    category: 'group', desc: 'Show group info with image',
    groupOnly: true, react: 'ℹ️'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const meta = await getMeta(sock, remoteJid);
    if (!meta) return reply(sock, remoteJid, '❌ Could not fetch group info.', msg);

    const admins  = getGroupAdmins(meta.participants);
    const created = meta.creation
        ? new Date(meta.creation * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Unknown';

    const text =
`╔══════════════════════╗
║   👥 *GROUP INFO*   ║
╚══════════════════════╝

📌 *Name:* ${meta.subject}
👤 *Members:* ${meta.participants.length}
👑 *Admins:* ${admins.length}
📅 *Created:* ${created}
🔒 *Locked:* ${meta.announce ? '✅ Yes' : '❌ No'}
🌐 *ID:* ${remoteJid.split('@')[0]}

📝 *Description:*
${meta.desc || '_No description_'}`;

    const ppUrl = await sock.profilePictureUrl(remoteJid, 'image').catch(() => null);
    if (ppUrl) {
        await sock.sendMessage(remoteJid, { image: { url: ppUrl }, caption: text }, { quoted: msg });
    } else {
        await reply(sock, remoteJid, text, msg);
    }
});

// ── ADMINS LIST ────────────────────────────────────────────────
register({
    name: 'admins', aliases: ['adminlist'],
    category: 'group', desc: 'List all group admins',
    groupOnly: true, react: '👑'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const meta = await getMeta(sock, remoteJid);
    if (!meta) return reply(sock, remoteJid, '❌ Could not fetch group info.', msg);
    const admins = getGroupAdmins(meta.participants);
    if (!admins.length) return reply(sock, remoteJid, '❌ No admins found.', msg);
    const text = `👑 *GROUP ADMINS* (${admins.length})\n\n${admins.map((a, i) => `${i + 1}. @${parseJid(a)}`).join('\n')}`;
    await sock.sendMessage(remoteJid, { text, mentions: admins }, { quoted: msg });
});

// ── WELCOME ────────────────────────────────────────────────────
register({
    name: 'welcome', aliases: ['setwelcome'],
    category: 'group', desc: 'Toggle/set welcome message',
    groupOnly: true, adminOnly: true, react: '👋'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const sub = args[0]?.toLowerCase();

    if (sub === 'set') {
        const newMsg = args.slice(1).join(' ');
        if (!newMsg) return reply(sock, remoteJid, '❌ Usage: .welcome set Welcome @user to @group! 🎉', msg);
        await setWelcome(remoteJid, { welcomeMsg: newMsg });
        return reply(sock, remoteJid, `✅ Welcome message set!\n\n_${newMsg}_`, msg);
    }
    if (sub === 'on' || sub === 'off') {
        await setWelcome(remoteJid, { welcomeOn: sub === 'on' });
        await react(sock, msg, sub === 'on' ? '✅' : '❌');
        return reply(sock, remoteJid, `👋 Welcome: *${sub.toUpperCase()}*`, msg);
    }
    const w = await getWelcome(remoteJid);
    const d = w?.dataValues || w || {};
    return reply(sock, remoteJid,
        `👋 *Welcome*\nStatus: *${d.welcomeOn ? '✅ ON' : '❌ OFF'}*\nMessage: _${d.welcomeMsg}_\n\n▸ .welcome on/off\n▸ .welcome set <message>\n\n_@user = member name, @group = group name_`, msg);
});

// ── GOODBYE ────────────────────────────────────────────────────
register({
    name: 'goodbye', aliases: ['setgoodbye', 'bye'],
    category: 'group', desc: 'Toggle/set goodbye message',
    groupOnly: true, adminOnly: true, react: '👋'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const sub = args[0]?.toLowerCase();

    if (sub === 'set') {
        const newMsg = args.slice(1).join(' ');
        if (!newMsg) return reply(sock, remoteJid, '❌ Usage: .goodbye set @user has left @group 👋', msg);
        await setWelcome(remoteJid, { goodbyeMsg: newMsg });
        return reply(sock, remoteJid, `✅ Goodbye message set!\n\n_${newMsg}_`, msg);
    }
    if (sub === 'on' || sub === 'off') {
        await setWelcome(remoteJid, { goodbyeOn: sub === 'on' });
        await react(sock, msg, sub === 'on' ? '✅' : '❌');
        return reply(sock, remoteJid, `👋 Goodbye: *${sub.toUpperCase()}*`, msg);
    }
    const w = await getWelcome(remoteJid);
    const d = w?.dataValues || w || {};
    return reply(sock, remoteJid,
        `👋 *Goodbye*\nStatus: *${d.goodbyeOn ? '✅ ON' : '❌ OFF'}*\nMessage: _${d.goodbyeMsg}_\n\n▸ .goodbye on/off\n▸ .goodbye set <message>\n\n_@user = member name, @group = group name_`, msg);
});

// ── WARN ───────────────────────────────────────────────────────
register({
    name: 'warn',
    category: 'group', desc: 'Warn a member (auto-kick after max warns)',
    groupOnly: true, adminOnly: true, react: '⚠️'
}, async (sock, msg, metadata) => {
    const { remoteJid, botIsAdmin, args } = metadata;
    if (!botIsAdmin) return reply(sock, remoteJid, '❌ I need to be admin to warn.', msg);
    const target = getTarget(msg, metadata);
    if (!target) return reply(sock, remoteJid, '❌ Tag or reply to a user.', msg);
    const reason   = args.slice(1).join(' ') || 'No reason given';
    const record   = await addWarn(remoteJid, target, reason);
    const maxWarns = record.maxWarns || 3;
    await react(sock, msg, '⚠️');
    if (record.count >= maxWarns) {
        try {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'remove');
            await sock.sendMessage(remoteJid, {
                text: `⚠️ @${parseJid(target)} reached *${maxWarns} warnings* and was removed!\n📝 Reason: ${reason}`,
                mentions: [target]
            });
            await resetWarn(remoteJid, target);
        } catch (e) {
            await reply(sock, remoteJid, `⚠️ @${parseJid(target)} hit max warns but I couldn't kick them.`, msg, [target]);
        }
    } else {
        await sock.sendMessage(remoteJid, {
            text: `⚠️ *Warning ${record.count}/${maxWarns}*\n👤 @${parseJid(target)}\n📝 Reason: ${reason}\n\n_${maxWarns - record.count} warning(s) left until kick_`,
            mentions: [target]
        });
    }
});

register({
    name: 'resetwarn', aliases: ['clearwarn', 'unwarn'],
    category: 'group', desc: 'Reset warnings for a member',
    groupOnly: true, adminOnly: true, react: '✅'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const target = getTarget(msg, metadata);
    if (!target) return reply(sock, remoteJid, '❌ Tag or reply to a user.', msg);
    await resetWarn(remoteJid, target);
    await react(sock, msg, '✅');
    await sock.sendMessage(remoteJid, { text: `✅ Warnings cleared for @${parseJid(target)}`, mentions: [target] });
});

register({
    name: 'warnlist', aliases: ['warns'],
    category: 'group', desc: 'Show all warnings in group',
    groupOnly: true, adminOnly: true, react: '📋'
}, async (sock, msg, metadata) => {
    const { remoteJid } = metadata;
    const warns  = await getGroupWarns(remoteJid);
    const active = warns.filter(w => w.count > 0);
    if (!active.length) return reply(sock, remoteJid, '✅ No active warnings.', msg);
    const text     = `⚠️ *WARN LIST* (${active.length})\n\n${active.map((w, i) => `${i + 1}. @${parseJid(w.userJid)} — *${w.count}/${w.maxWarns}*\n   📝 ${w.reason || 'No reason'}`).join('\n\n')}`;
    const mentions = active.map(w => w.userJid);
    await sock.sendMessage(remoteJid, { text, mentions }, { quoted: msg });
});

// ── ANTILINK ───────────────────────────────────────────────────
register({
    name: 'antilink', aliases: ['al'],
    category: 'group', desc: 'Delete WhatsApp group links',
    groupOnly: true, adminOnly: true, react: '🔗'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const toggle   = args[0]?.toLowerCase();
    const settings = await getGroupSettings(remoteJid);
    if (!toggle || !['on', 'off'].includes(toggle)) {
        return reply(sock, remoteJid, `🔗 *Antilink*\nCurrent: *${settings.antilink ? '✅ ON' : '❌ OFF'}*\n\nUsage: .antilink on/off`, msg);
    }
    await setGroupSettings(remoteJid, { antilink: toggle === 'on' });
    await react(sock, msg, toggle === 'on' ? '✅' : '❌');
    await reply(sock, remoteJid, `🔗 Antilink: *${toggle.toUpperCase()}*`, msg);
});

// ── ANTISPAM ───────────────────────────────────────────────────
register({
    name: 'antispam', aliases: ['as'],
    category: 'group', desc: 'Kick members who spam',
    groupOnly: true, adminOnly: true, react: '🛡️'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const toggle   = args[0]?.toLowerCase();
    const max      = parseInt(args[1]) || 5;
    const secs     = parseInt(args[2]) || 5;
    const settings = await getGroupSettings(remoteJid);
    if (!toggle || !['on', 'off'].includes(toggle)) {
        return reply(sock, remoteJid, `🛡️ *Antispam*\nCurrent: *${settings.antispam ? '✅ ON' : '❌ OFF'}*\nMax: ${settings.spamMax} msgs / ${settings.spamSecs}s\n\nUsage: .antispam on [max] [secs]\nExample: .antispam on 5 5`, msg);
    }
    await setGroupSettings(remoteJid, { antispam: toggle === 'on', spamMax: max, spamSecs: secs });
    await react(sock, msg, toggle === 'on' ? '✅' : '❌');
    await reply(sock, remoteJid, `🛡️ Antispam: *${toggle.toUpperCase()}*${toggle === 'on' ? `\nKick after ${max} msgs in ${secs}s` : ''}`, msg);
});

// ── ANTI BAD WORD ──────────────────────────────────────────────
register({
    name: 'antibadword', aliases: ['abw', 'badword'],
    category: 'group', desc: 'Delete messages with bad words',
    groupOnly: true, adminOnly: true, react: '🤬'
}, async (sock, msg, metadata) => {
    const { remoteJid, args } = metadata;
    const sub = args[0]?.toLowerCase();
    const bw  = await getBadWords(remoteJid);
    const d   = bw?.dataValues || bw || {};

    if (!sub || !['on', 'off', 'add', 'remove', 'list'].includes(sub)) {
        return reply(sock, remoteJid, `🤬 *Anti Bad Word*\nStatus: *${d.enabled ? '✅ ON' : '❌ OFF'}*\nWords: ${d.words || '_none_'}\n\n▸ .abw on/off\n▸ .abw add word1,word2\n▸ .abw remove word\n▸ .abw list`, msg);
    }
    if (sub === 'on' || sub === 'off') {
        await setBadWords(remoteJid, { enabled: sub === 'on' });
        await react(sock, msg, sub === 'on' ? '✅' : '❌');
        return reply(sock, remoteJid, `🤬 Anti Bad Word: *${sub.toUpperCase()}*`, msg);
    }
    if (sub === 'add') {
        const newWords = args.slice(1).join(' ').toLowerCase().split(',').map(w => w.trim()).filter(Boolean);
        if (!newWords.length) return reply(sock, remoteJid, '❌ Example: .abw add word1,word2', msg);
        const existing = d.words ? d.words.split(',') : [];
        const merged   = [...new Set([...existing, ...newWords])].join(',');
        await setBadWords(remoteJid, { words: merged });
        return reply(sock, remoteJid, `✅ Added: *${newWords.join(', ')}*`, msg);
    }
    if (sub === 'remove') {
        const word    = args[1]?.toLowerCase().trim();
        if (!word) return reply(sock, remoteJid, '❌ Specify a word.', msg);
        const updated = (d.words || '').split(',').filter(w => w !== word).join(',');
        await setBadWords(remoteJid, { words: updated });
        return reply(sock, remoteJid, `✅ Removed: *${word}*`, msg);
    }
    if (sub === 'list') {
        const words = d.words ? d.words.split(',').filter(Boolean) : [];
        return reply(sock, remoteJid, words.length ? `🤬 *Bad Words* (${words.length})\n\n${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}` : '❌ No bad words set.', msg);
    }
});

module.exports = {};