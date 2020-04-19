class ClientUpdateCursorPosition implements ClientPacket {
    private readonly position: paper.Point;
    constructor(position : paper.Point) {
        this.position = position;
    }

    getPacketAsArray(): Uint8Array {
        const pck = new Uint8Array(1 + 8);
        pck[0] = ClientPacketIDs.updateCursorPosition;
        packetWritePoint(this.position, pck, 1);
        return pck;
    }
}