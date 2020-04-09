class ServerEndPathPacket implements ServerPacket{
    readonly userID: number;
    readonly lineID: number;

    constructor(rawMsg: Uint8Array) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
    }


    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.EndPath;
    }

}