export function parseWsMessage(raw) {
    try {
        const data = JSON.parse(raw);
        if (!data || typeof data !== "object" || !("type" in data))
            return null;
        return data;
    }
    catch {
        return null;
    }
}
