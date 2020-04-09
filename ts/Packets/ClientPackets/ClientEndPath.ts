class ClientEndPath implements ClientPacket
{
    private readonly id: number;
    constructor(id: number) {
        this.id = id;
    }

    getPacketAsArray(): Uint8Array {
        const pck = new Uint8Array(1 + 4);
        pck[0] = ClientPacketIDs.endPath;
        packetWriteInt32(this.id, pck, 1);
        return pck;
    }
}