Const fs = require("fs");
const { cmd } = require("../command");
const os = require('os');

// Helper function to get the greeting based on the time of day
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
        return "Good morning ☀️";
    }
    if (hour < 18) {
        return "Good afternoon 🌇";
    }
    if (hour < 21) {
        return "Good evening 🌙";
    }
    return "Goodnight 😴";
};

// Command to get greetings, time, and date
cmd({
    pattern: "time",
    alias: ["date", "greeting"],
    desc: "Get the current time, date, and a greeting.",
    category: "main",
    react: "⏰",
    filename: __filename
},
async (conn, mek, m, { from, reply, sender, pushname }) => {
    try {
        const greeting = getGreeting();
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        const formattedDate = now.toLocaleString('en-US', options);

        const message = `
*${greeting}, ${pushname}!*

📅 *Date:* ${formattedDate}
        `;

        await reply(message);

    } catch (e) {
        console.error("Time command error:", e);
        reply(`An error occurred while fetching the time and date: ${e.message}`);
    }
});
