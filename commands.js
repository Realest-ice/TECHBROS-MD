const commands = new Map();

/**
 * Register a command and all its aliases into the commands Map.
 *
 * @param {string|object} info  - Command name string or full info object
 * @param {Function}      handler
 */
function register(info, handler) {

    if (typeof info === 'string') {
        info = { name: info };
    }

    const command = {
        name: info.name.toLowerCase(),
        aliases: (info.aliases || []).map(a => a.toLowerCase()),
        category: info.category || 'general',
        desc: info.desc || '',
        groupOnly: info.groupOnly || false,
        adminOnly: info.adminOnly || false,
        ownerOnly: info.ownerOnly || false,
        react: info.react || '⚡',
        handler
    };

    // Register primary name
    commands.set(command.name, command);

    // Register every alias pointing to the same command object
    for (const alias of command.aliases) {
        commands.set(alias, command);
    }
}

/**
 * Get all unique commands (no alias duplicates) for help menus etc.
 */
function getUniqueCommands() {
    const seen = new Set();
    const result = [];

    for (const cmd of commands.values()) {
        if (!seen.has(cmd.name)) {
            seen.add(cmd.name);
            result.push(cmd);
        }
    }

    return result;
}

/**
 * Get commands grouped by category.
 */
function getByCategory() {
    const categories = {};

    for (const cmd of getUniqueCommands()) {
        if (!categories[cmd.category]) {
            categories[cmd.category] = [];
        }
        categories[cmd.category].push(cmd);
    }

    return categories;
}

module.exports = {
    commands,
    register,
    getUniqueCommands,
    getByCategory
};