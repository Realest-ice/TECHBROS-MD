const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

const logsDir = path.join(__dirname, '../logs');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {

    static timestamp() {
        return new Date().toLocaleTimeString();
    }

    // Async write — won't block the bot's event loop
    static async write(type, message) {
        const date = new Date().toISOString().split('T')[0];
        const line = `[${new Date().toISOString()}] [${type}] ${message}\n`;

        try {
            await fsPromises.appendFile(
                path.join(logsDir, `${date}.log`),
                line
            );
        } catch (err) {
            // Silent fail — don't let a log error crash the bot
            console.error('[Logger] Write failed:', err.message);
        }
    }

    static info(message) {
        console.log(chalk.cyan(`[INFO ${this.timestamp()}]`), message);
        this.write('INFO', message);
    }

    static success(message) {
        console.log(chalk.green(`[SUCCESS ${this.timestamp()}]`), message);
        this.write('SUCCESS', message);
    }

    static warning(message) {
        console.log(chalk.yellow(`[WARNING ${this.timestamp()}]`), message);
        this.write('WARNING', message);
    }

    static error(message, err) {
        console.log(chalk.red(`[ERROR ${this.timestamp()}]`), message);
        if (err) console.log(chalk.red(err.stack || err));
        this.write('ERROR', `${message}\n${err?.stack || err || ''}`);
    }

    static command(command, sender) {
        const senderId = sender.split('@')[0];
        console.log(
            chalk.magenta('[CMD]'),
            chalk.white(command),
            chalk.gray('from'),
            chalk.green(senderId)
        );
        this.write('COMMAND', `${command} | ${senderId}`);
    }

    static message(sender, text) {
        const senderId = sender.split('@')[0];
        console.log(
            chalk.blue('[MSG]'),
            chalk.green(senderId),
            ':',
            chalk.white(text.slice(0, 100))
        );
        this.write('MESSAGE', `${senderId}: ${text}`);
    }
}

module.exports = Logger;