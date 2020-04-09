class ClientSetStrokeColor implements ClientPacket {
    private color: paper.Color;
    private line: DrawLine;

    constructor(line: DrawLine, color: paper.Color) {
        this.line = line;
        this.color = color;
    }

    getPacketAsArray(): Uint8Array {
        const pck = new Uint8Array(1 + 1 + 4 + 3);
        pck[0] = ClientPacketIDs.setStrokeColor;
        pck[1] = this.line.userID;
        packetWriteInt32(this.line.lineID, pck, 2);
        pck[2 + 4 + 0] = this.color.red;
        pck[2 + 4 + 1] = this.color.green;
        pck[2 + 4 + 2] = this.color.blue;
        console.log("client set color", this.color);
        return pck;
    }


}