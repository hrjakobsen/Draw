class LineUpdate {
    readonly oldLineID: number;
    readonly newLineID: number;

    constructor(oldLineID: number, newLineID: number) {
        this.oldLineID = oldLineID;
        this.newLineID = newLineID;
    }
}

class ServerRemovedUserPacket implements ServerPacket {
    readonly userID: number;
    readonly lines: LineUpdate[] = [];

    constructor(rawMsg: Uint8Array) {
        this.userID = rawMsg[1];
        const len = packetReadInt32(rawMsg, 2);
        let offset = 6;
        for (let i = 0; i < len; i++) {
            const oldLineID = packetReadInt32(rawMsg, offset);
            offset += 4;
            const newLineID = packetReadInt32(rawMsg, offset);
            offset += 4;
            this.lines.push(
                new LineUpdate(oldLineID, newLineID)
            )
        }
    }

    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.RemovedUser;
    }

}