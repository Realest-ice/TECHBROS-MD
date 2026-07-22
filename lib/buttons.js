/*
 * TECHBROS-MD
 * Buttons wrapper using gifted-btns
 * Central place for all interactive messages
 */

const { sendButtons, sendInteractiveMessage } = require('gifted-btns');

/**
 * Simple quick reply buttons
 */
async function sendQuickButtons(sock, jid, { title, text, footer, image, buttons }) {
    return sendButtons(sock, jid, {
        title,
        text,
        footer,
        image,
        buttons: buttons.map(b => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id })
        }))
    });
}

/**
 * Single select list (dropdown style)
 */
async function sendListButton(sock, jid, { text, footer, btnText, sections }) {
    return sendInteractiveMessage(sock, jid, {
        text,
        footer,
        interactiveButtons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({ title: btnText, sections })
        }]
    });
}

/**
 * URL button
 */
async function sendUrlButton(sock, jid, { text, footer, url, urlText, buttons = [] }) {
    return sendInteractiveMessage(sock, jid, {
        text,
        footer,
        interactiveButtons: [
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: urlText, url }) },
            ...buttons.map(b => ({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id })
            }))
        ]
    });
}

/**
 * Copy button — copies text to clipboard
 */
async function sendCopyButton(sock, jid, { text, footer, copyText, copyLabel, buttons = [] }) {
    return sendInteractiveMessage(sock, jid, {
        text,
        footer,
        interactiveButtons: [
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: copyLabel || '📋 Copy', copy_code: copyText }) },
            ...buttons.map(b => ({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id })
            }))
        ]
    });
}

/**
 * Call button
 */
async function sendCallButton(sock, jid, { text, footer, phone, callLabel, buttons = [] }) {
    return sendInteractiveMessage(sock, jid, {
        text,
        footer,
        interactiveButtons: [
            { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: callLabel || '📞 Call', phone_number: phone }) },
            ...buttons.map(b => ({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id })
            }))
        ]
    });
}

/**
 * Mixed — URL + Copy + Quick replies in one message
 */
async function sendMixedButtons(sock, jid, { text, footer, interactiveButtons }) {
    return sendInteractiveMessage(sock, jid, { text, footer, interactiveButtons });
}

module.exports = {
    sendQuickButtons,
    sendListButton,
    sendUrlButton,
    sendCopyButton,
    sendCallButton,
    sendMixedButtons,
    sendInteractiveMessage,
    sendButtons
};