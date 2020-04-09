const enum ClientPacketIDs {
    beginPath = 0,
    endPath = 1,
    addPointsPath = 2,
    deleteLines = 3,
    moveLines = 4,
    setStrokeSize = 5,
    setStrokeColor = 6,
}

interface ClientPacket {
    getPacketAsArray(): Uint8Array
}

