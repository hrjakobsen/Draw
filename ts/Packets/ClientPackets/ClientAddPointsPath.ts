class clientAddPointsPath implements ClientPacket
{
    private readonly points: paper.Point[];
    private readonly id: number;
    constructor(id: number, points: paper.Point[]) {
        this.id = id;
        this.points = points;
    }

    getPacketAsArray(): Uint8Array {
        const count = this.points.length;
        const pck = new Uint8Array(1 + 4 + 4 + count*8);
        pck[0] = ClientPacketIDs.addPointsPath;
        packetWriteInt32(this.id, pck, 1);
        packetWriteInt32(count, pck, 1+4);
        this.points.forEach((value, index) => {
                const point = this.points[index];
                const x = point.x;
                const y = point.y;
                packetWriteInt32(x, pck, 1 + 4 + 4 + index * 8);
                packetWriteInt32(y, pck, 1 + 4 + 4 + index * 8 + 4);
            }
        );
        return pck;
    }
}