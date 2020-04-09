class ClientBeginPath implements ClientPacket
{
    private readonly id: number;
    private readonly point: paper.Point;
    private readonly strokeWidth: number;
    private strokeColor: paper.Color;

    constructor(id: number, p: paper.Point, strokeWidth: number, strokeColor: paper.Color) {
        this.id = id;
        this.point = p;
        this.strokeWidth = strokeWidth;
        this.strokeColor = strokeColor;
    }

    getPacketAsArray(): Uint8Array {
        const pck = new Uint8Array(1 + 4 + 8 + 1 + 3);
        pck[0] = ClientPacketIDs.beginPath;
        packetWriteInt32(this.id, pck, 1);
        packetWritePoint(this.point, pck, 1 + 4);
        pck[1 + 4 + 8] = this.strokeWidth;
        pck[1 + 4 + 8 + 1] = this.strokeColor.red;
        pck[1 + 4 + 8 + 2] = this.strokeColor.green;
        pck[1 + 4 + 8 + 3] = this.strokeColor.blue;
        return pck;
    }
}