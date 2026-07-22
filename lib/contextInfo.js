/*
 * TECHBROS-MD — Newsletter Context Info
 * Adds Techbros newsletter watermark to all bot messages
 * Hardcoded — users never need to touch this
 */

const NEWSLETTER_JID  = '120363423517044685@newsletter';
const NEWSLETTER_NAME = 'TECHBROS MD';

/**
 * Returns contextInfo that adds the newsletter forward tag
 * to any message, making it show the channel name/link.
 *
 * Usage:
 *   await sock.sendMessage(jid, {
 *       text: 'Hello!',
 *       contextInfo: getContextInfo()
 *   });
 *
 *   // With mentions:
 *   await sock.sendMessage(jid, {
 *       text: '@user hello',
 *       contextInfo: getContextInfo([userJid])
 *   });
 */
function getContextInfo(mentionedJid = []) {
    return {
        mentionedJid,
        forwardingScore:  1,
        isForwarded:      true,
        forwardedNewsletterMessageInfo: {
            newsletterJid:     NEWSLETTER_JID,
            newsletterName:    NEWSLETTER_NAME,
            serverMessageId:   -1
        }
    };
}

module.exports = { getContextInfo, NEWSLETTER_JID, NEWSLETTER_NAME };