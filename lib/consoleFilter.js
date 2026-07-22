const originalConsoleInfo = console.info;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const suppressedPatterns = [
    /Closing session/i,
    /Closing open session/i,
    /Removing old closed session/i,
    /Decrypted message with closed session/i,
    /in favor of incoming/i,
    /prekey bundle/i,
    /SessionEntry/i,
    /failed to decrypt/i,
    /Bad MAC/i,
    /Session error/i,
    /libsignal/i,
    /session_cipher/i,
    /_chains/i,
    /ephemeralKeyPair/i,
    /rootKey/i,
    /baseKey/i,
    /pendingPreKey/i,
    /indexInfo/i,
    /currentRatchet/i,
    /registrationId/i,
    /remoteIdentityKey/i,
    /lastRemoteEphemeralKey/i,
];

const argToString = (a) => {
    if (typeof a === "string") return a;
    if (a instanceof Error) return a.message + " " + (a.stack || "");
    if (a && typeof a === "object") {
        try { return JSON.stringify(a); } catch (_) {}
        try { return String(a); } catch (_) {}
    }
    return String(a ?? "");
};

const shouldSuppress = (args) => {
    const str = args.map(argToString).join(" ");
    if (suppressedPatterns.some((p) => p.test(str))) return true;
    if (args.some((a) => a && typeof a === "object" && (a._chains || a.indexInfo || a.currentRatchet))) return true;
    return false;
};

function setupConsoleFilters() {
    console.info = (...args) => {
        if (shouldSuppress(args)) return;
        originalConsoleInfo.apply(console, args);
    };
    console.log = (...args) => {
        if (shouldSuppress(args)) return;
        originalConsoleLog.apply(console, args);
    };
    console.error = (...args) => {
        if (shouldSuppress(args)) return;
        originalConsoleError.apply(console, args);
    };
    console.warn = (...args) => {
        if (shouldSuppress(args)) return;
        originalConsoleWarn.apply(console, args);
    };
}

module.exports = { setupConsoleFilters };