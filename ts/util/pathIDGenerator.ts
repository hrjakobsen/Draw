
class PathIDGenerator {
    private nextPathID: number;
    constructor(start: number) {
        this.nextPathID = start;
    }

    getNext() : number {
        return this.nextPathID++
    }
}