// helper function here

function packetWriteInt32(val: number, array: Uint8Array, offset: number) {
    const b1 = val & 0xFF;
    const b2 = val >> 8 & 0xFF;
    const b3 = val >> 16 & 0xFF;
    let b4 = val >> 24 & 0xFF;
    array[offset + 0] = b1;
    array[offset + 1] = b2;
    array[offset + 2] = b3;
    array[offset + 3] = b4;
}

function packetWritePoint(point: paper.Point, array: Uint8Array, offset: number) {
    packetWriteInt32(point.x, array, offset);
    packetWriteInt32(point.y, array, offset + 4);
}

function packetReadInt32(array: Uint8Array, offset: number): number {
    const b1 = array[offset + 0];
    const b2 = array[offset + 1];
    const b3 = array[offset + 2];
    const b4 = array[offset + 3];

    return b1 | (b2 << 8) | (b3 << 16) | (b4 << 24)

}

function readPoint(array: Uint8Array, offset: number): paper.Point {
    const x = packetReadInt32(array, offset);
    const y = packetReadInt32(array, offset + 4);
    return new paper.Point(x, y)
}

