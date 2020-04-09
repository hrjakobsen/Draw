class ServerMoveLinesPacket implements ServerPacket {
    readonly lines: UpdatedLine[] = [];
    readonly delta: paper.Point;

    constructor(rawMsg: Uint8Array) {
        this.delta = readPoint(rawMsg, 1);
        let count = packetReadInt32(rawMsg, 1 + 8);
        let offset = 1 + 8 + 4;
        for(let i = 0; i < count; i++) {
            let userID = rawMsg[offset];
            offset++;
            let lineID = packetReadInt32(rawMsg, offset);
            offset += 4;
            this.lines.push(new UpdatedLine(userID,lineID));
        }
    }

    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.MoveLines;
    }
}