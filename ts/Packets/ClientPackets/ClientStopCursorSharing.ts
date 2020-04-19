class ClientStopCursorSharing implements ClientPacket {
    getPacketAsArray(): Uint8Array {
        const pck = new Uint8Array(1);
        pck[0] = ClientPacketIDs.stopShareCursor
        return pck;
    }
}