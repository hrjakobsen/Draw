class ServerUpdateCursorPositionPacket implements ServerPacket {
    readonly userID: number;
    readonly position: paper.Point;

    constructor(rawMsg: Uint8Array) {
        this.userID = rawMsg[1]
        this.position = readPoint(rawMsg, 2)
    }

    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.UpdateCursorPosition;
    }
}
