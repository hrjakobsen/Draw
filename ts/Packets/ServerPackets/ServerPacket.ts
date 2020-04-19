const enum ServerPacketIDs {
    SetUserID = 0,
    AddUser = 1,
    BeginPath = 2,
    EndPath = 3,
    AddPointsPath = 4,
    DeleteLines = 5,
    MoveLines = 6,
    SetStrokeSize = 7,
    SetStrokeColor = 8,
    RemovedUser = 9,
    StartSharingCursor = 10,
    UpdateCursorPosition = 11,
    StopSharingCursor = 12,
}

class UpdatedLine {
    readonly userID: number;
    readonly lineID: number;
    constructor(userID: number, lineID: number) {
        this.userID = userID;
        this.lineID = lineID;
    }
}

interface ServerPacket {
    getPacketType(): ServerPacketIDs
}

function createPacket(rawMsg: Uint8Array): ServerPacket {
    const type = rawMsg[0];

    switch (type) {
        case ServerPacketIDs.SetUserID:
            return new ServerSetUserID(rawMsg);
        case ServerPacketIDs.AddUser:
            return new ServerAddUserPacket(rawMsg);
        case ServerPacketIDs.BeginPath:
            return new ServerBeginPathPacket(rawMsg);
        case ServerPacketIDs.EndPath:
            return new ServerEndPathPacket(rawMsg);
        case ServerPacketIDs.AddPointsPath:
            return new ServerAddPointsPathPacket(rawMsg);
        case ServerPacketIDs.DeleteLines:
            return new ServerDeleteLinesPacket(rawMsg);
        case ServerPacketIDs.MoveLines:
            return new ServerMoveLinesPacket(rawMsg);
        case ServerPacketIDs.SetStrokeSize:
            return new ServerSetStrokeSizePacket(rawMsg);
        case ServerPacketIDs.SetStrokeColor:
            return new ServerSetStrokeColorPacket(rawMsg);
        case ServerPacketIDs.RemovedUser:
            return new ServerRemovedUserPacket(rawMsg);
        case ServerPacketIDs.StartSharingCursor:
            return new ServerStartSharingCursorPacket(rawMsg);
        case ServerPacketIDs.UpdateCursorPosition:
            return new ServerUpdateCursorPositionPacket(rawMsg);
        case ServerPacketIDs.StopSharingCursor:
            return new ServerStopSharingCursorPacket(rawMsg);
        default:
            break;
    }

    throw "unknown error"
}

