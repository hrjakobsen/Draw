
class ServerDeleteLinesPacket implements ServerPacket {
    readonly lines: UpdatedLine[] = [];

    constructor(rawMsg: Uint8Array) {
        let count = packetReadInt32(rawMsg, 1);
        let offset = 5;
        for(let i = 0; i < count; i++) {
            let userID = rawMsg[offset];
            offset++;
            let lineID = packetReadInt32(rawMsg, offset);
            offset += 4;
            this.lines.push(new UpdatedLine(userID,lineID));
        }
    }

    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.DeleteLines;
    }
}