class ClientChangeStrokeSize implements ClientPacket {
    private line: DrawLine;
    private size: number;
    constructor(line: DrawLine, size: number) {
        this.line = line;
        this.size = size;
    }

    getPacketAsArray(): Uint8Array {
        const pck = new Uint8Array(1 + 1 + 4 + 1);
        pck[0] = ClientPacketIDs.setStrokeSize;
        pck[1] = this.line.userID;
        packetWriteInt32(this.line.lineID, pck, 2);
        pck[6] = this.size;
        return pck;
    }

}