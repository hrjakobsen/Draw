
class WebSocketHandler
{
    private static IP = "ws://localhost:5011/ws";

    private socket: WebSocket | null = null;
    private isConnectionOpen = false;

    public onConnected: () => void = () => {};
    public onPacketReceived: (pck: ServerPacket) => void = () => {};

    private queuedPackets: Uint8Array[] = [];

    connect() {
        const socket = new WebSocket(WebSocketHandler.IP + window.location.pathname);
        socket.binaryType = "arraybuffer";
        this.socket = socket;

        socket.onerror = ev => this.onError(ev);
        socket.onclose = ev => this.onClose(ev);
        socket.onopen = ev => this.onOpen(ev);
        socket.onmessage = ev => this.onMessage(ev);
    }

    private onMessage(ev: MessageEvent) {
        const rawData = new Uint8Array(ev.data);
        const pck = createPacket(rawData);
        this.onPacketReceived(pck)
    }

    private onError(ev: Event) {
        console.log("web socket error" + ev)
    }

    private onClose(ev: CloseEvent) {
        this.isConnectionOpen = false;
        console.log("web socket closed" + ev)
    }

    private onOpen(ev: Event) {
        console.log("web socket open" + ev);
        console.log(this.socket?.readyState);
        this.isConnectionOpen = true;
        this.onConnected();
        this.queuedPackets.forEach(pck => {
                this.socket?.send(pck)
            }
        )
    }

    sendPacket(pck: ClientPacket) {
        const rawPck = pck.getPacketAsArray();
        if (!this.isConnectionOpen) {
            this.queuedPackets.push(rawPck)
        } else {
            // we know it is not null
            console.log(this.socket?.readyState);
            this.socket?.send(rawPck)
        }
    }



}