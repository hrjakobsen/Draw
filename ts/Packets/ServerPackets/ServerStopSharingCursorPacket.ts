class ServerStopSharingCursorPacket implements ServerPacket {
    readonly userID: number;
    constructor(rawMsg: Uint8Array) {
        this.userID = rawMsg[1]
    }
    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.StopSharingCursor;
    }

}