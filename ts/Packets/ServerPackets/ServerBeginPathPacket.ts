class ServerBeginPathPacket implements ServerPacket {
    readonly userID: number;
    readonly lineID: number;
    readonly pos: paper.Point;
    readonly strokeWidth: number;
    readonly strokeColor: paper.Color;

    constructor(rawMsg: Uint8Array) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
        this.pos = readPoint(rawMsg, 2 + 4);
        this.strokeWidth = rawMsg[2 + 4 + 8];
        const r = rawMsg[2 + 4 + 8 + 1];
        const g = rawMsg[2 + 4 + 8 + 2];
        const b = rawMsg[2 + 4 + 8 + 3];
        this.strokeColor = new paper.Color(r, g, b)
    }

    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.BeginPath;
    }
}