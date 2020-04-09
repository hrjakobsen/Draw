class ClientMoveLines implements ClientPacket {
    private readonly lines: DrawLine[];
    private readonly delta: paper.Point;
    constructor(lines: DrawLine[], delta: paper.Point) {
        this.lines = lines;
        this.delta = delta;
    }

    getPacketAsArray(): Uint8Array {
        const pck = new Uint8Array(1 + 8 + 4 + this.lines.length * (1 + 4));
        pck[0] = ClientPacketIDs.moveLines;
        packetWritePoint(this.delta, pck, 1);
        packetWriteInt32(this.lines.length, pck, 1 + 8);
        let offset = 1 + 8 + 4;
        this.lines.forEach( l => {
                pck[offset] = l.userID;
                offset += 1;
                packetWriteInt32(l.lineID, pck, offset);
                offset += 4;
            }
        );
        return pck;
    }

}