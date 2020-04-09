class ClientDeleteLines implements ClientPacket {
    private lines: DrawLine[];
    constructor(lines: DrawLine[]) {
        this.lines = lines;
    }

    getPacketAsArray(): Uint8Array {
        const pck = new Uint8Array(1 + 4 + this.lines.length * (1 + 4));
        pck[0] = ClientPacketIDs.deleteLines;
        packetWriteInt32(this.lines.length, pck, 1);
        let offset = 1 + 4;
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