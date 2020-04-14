class Users {
    private userID: number = -1;
    private users: Map<number, User> = new Map<number, User>();

    private ws: WebSocketHandler;

    constructor(ws: WebSocketHandler) {
        this.ws = ws;
    }

    add(userID: number) {
        this.users.set(userID, new User(userID));
    }

    setMyUserID(userID: number) {
        this.users.set(userID, new User(userID));
        this.userID = userID;
    }

    findUserByID(userID: number): User | null {
        const u = this.users.get(userID);
        return u ? u : null;
    }

    getMyUser(): User | null {
        return this.findUserByID(this.userID)
    }

    findAllLines(): DrawLine[] {
        let userLines: DrawLine[] = [];
        this.users.forEach((user) => {
                userLines = userLines.concat(user.getLines())
            }
        );
        return userLines
    }

    findLineByPath(path: paper.Item): DrawLine | null {
        for (let [_, user] of this.users) {
            const res = user.findLine(path);
            if (res != null) {
                return res
            }
        }
        return null
    }

    getMyUserID() {
        return this.userID
    }


    deleteLine(userID: number, lineID: number) {
        const u = this.findUserByID(userID);
        if (!u) {
            return;
        }
        u.deleteLine(lineID);
    }


    handleRemovedUser(userID: number, lineUpdates: LineUpdate[]) {
        const u = this.findUserByID(userID);
        if (!u) {
            return
        }
        this.users.delete(userID);
        const nullUser = this.findUserByID(0);
        if (!nullUser) {
            return
        }

        let lines = u.getLines();
        for (let i = 0; i < lines.length; i++) {
            for (let lineUpdate of lineUpdates) {
                if (lines[i].lineID == lineUpdate.oldLineID) {
                    lines[i] = lines[i].updateLineID(lineUpdate.newLineID);
                    break
                }
            }
        }
        nullUser.setOwner(lines)
    }
}