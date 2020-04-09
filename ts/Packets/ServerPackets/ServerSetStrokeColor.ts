class ServerSetStrokeColor implements ServerPacket {
    readonly userID: number;
    readonly lineID: number;
    readonly color: Color;

    constructor(rawMsg: Uint8Array) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
        const r = rawMsg[6 + 0];
        const g = rawMsg[6 + 1];
        const b = rawMsg[6 + 2];
        this.color = new paper.Color(r, g, b);
    }

    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.SetStrokeColor;
    }
}
