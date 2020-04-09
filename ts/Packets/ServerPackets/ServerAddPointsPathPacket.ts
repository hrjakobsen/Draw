class ServerAddPointsPathPacket implements ServerPacket {
    readonly userID: number;
    readonly lineID: number;
    readonly points: paper.Point[];
    constructor(rawMsg: Uint8Array) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
        const size = packetReadInt32(rawMsg, 2 + 4);
        this.points = [];
        for(let i = 0; i < size; i++) {
            const p = readPoint(rawMsg, 2 + 4 + 4 + i * 8);
            this.points.push(p);
        }
    }


    getPacketType(): ServerPacketIDs {
        return ServerPacketIDs.AddPointsPath;
    }
}