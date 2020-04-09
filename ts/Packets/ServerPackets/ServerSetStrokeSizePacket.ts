class ServerSetStrokeSizePacket implements ServerPacket {
    readonly userID: number;
    readonly lineID: number;
    readonly size: number;
    constructor(rawMsg: Uint8Array) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
        this.size = packetReadInt32(rawMsg, 6);
    }

    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.SetStrokeSize;
    }
}