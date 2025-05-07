import { ArrayBufferSink, type SocketHandler } from "bun";
import { PlayerIdentification, DisconnectPlayer, LevelDataChunk, LevelFinalize, LevelInitialize, Ping, ServerIdentification, SetBlockC2S, SetBlockS2C, SpawnPlayer, PositionAndOrientation, Message, UpdateUserType, DespawnPlayer, ExtInfo, ExtEntry } from "./network";
import { Block, World } from "./world";
import type { Extension } from "./extensions";

export interface ServerOptions {
    name: string;
    motd: string;
    extensions?: Extension[];
}

export class Server {
    private players: Map<number, Player> = new Map();
    private playerIdIncrement: number = 0;
    private unusedPlayersId: number[] = [];
    private scheduler;
    private world = new World();

    public constructor(private options: ServerOptions) {
        this.scheduler = setInterval(() => {
            const now = Date.now();
            for (const player of this.players.values()) {
                if (player.lastPing < now - 20000) {
                    player.sendPacket(Ping.serialize({}));
                    player.lastPing = now;
                    continue;
                }
                player.flush();
            }
        }, 1000 / 20);
    }

    public get handler(): SocketHandler<number> {
        return {
            open: this.handleOpen.bind(this),
            close: this.handleClose.bind(this),
            data: this.handleData.bind(this),
        };
    }

    public sendPacketToAll(packet: Buffer): void {
        for (const player of this.players.values()) {
            player.sendPacket(packet);
        }
    }

    public sendPacketToAllExcept(packet: Buffer, except: Player): void {
        for (const player of this.players.values()) {
            if (player !== except) {
                player.sendPacket(packet);
            }
        }
    }

    private handleOpen(socket: Bun.Socket<number>): void {
        const playerId = this.unusedPlayersId.pop() ?? this.playerIdIncrement++;
        socket.data = playerId;
    }

    private handleClose(socket: Bun.Socket<number>): void {
        const playerId = socket.data;
        const username = this.players.get(playerId)?.username;

        this.players.delete(playerId);
        this.unusedPlayersId.push(playerId);

        if (username) {
            this.sendPacketToAll(DespawnPlayer.serialize({ playerId }));
            this.sendPacketToAll(Message.serialize({ playerId: -1, message: `${username} has left the game` }));
        }
    }

    private handleData(socket: Bun.Socket<number>, data: Buffer): void {
        const player = this.players.get(socket.data);

        if (!player) {
            const identification = PlayerIdentification.deserialize(data);
            if (!identification) {
                socket.end();
                return;
            }

            if (identification.protocolVersion !== 0x07) {
                socket.write(DisconnectPlayer.serialize({ reason: "Unsupported protocol version!" }));
                socket.end();
                return;
            }

            const newPlayer = new Player(socket, socket.data, identification.username);
            this.players.set(newPlayer.id, newPlayer);

            if (identification.padding === 0x42) {;
                this.handleExtendedLogin(newPlayer);
            } else {
                this.handleLogin(newPlayer);
            }
            return;
        }

        let byteOffset = 0;
        let numPackets = 0;
        while (byteOffset < data.byteLength) {
            const bytesRead = this.handleSinglePacket(player, socket, data.subarray(byteOffset));
            if (bytesRead === 0) {
                break;
            }
            byteOffset += bytesRead;
            numPackets++;
        }
        console.log(`Handled ${numPackets} packets`);
    }

    private handleSinglePacket(player: Player, socket: Bun.Socket<number>, data: Buffer): number {
        if (ExtInfo.isValid(data)) {
            const packet = ExtInfo.deserialize(data)!;
            player.extensionCount = packet.extensionCount;
            return ExtInfo.packetSize;
        }

        else if (ExtEntry.isValid(data)) {
            const packet = ExtEntry.deserialize(data)!;
            player.extensions.push(packet.name);
            if (player.extensions.length === player.extensionCount) {
                this.handleLogin(player);
            }
            return ExtEntry.packetSize;
        }

        else if (SetBlockC2S.isValid(data)) {
            const packet = SetBlockC2S.deserialize(data)!;

            let blockType = packet.blockType as Block;
            if (packet.mode === 0) {
                blockType = Block.Air;
            }

            this.world.setBlock(packet.x, packet.y, packet.z, blockType);
            this.sendPacketToAll(SetBlockS2C.serialize({
                x: packet.x,
                y: packet.y,
                z: packet.z,
                blockType: blockType,
            }));

            return SetBlockC2S.packetSize;
        }

        else if (PositionAndOrientation.isValid(data)) {
            const packet = PositionAndOrientation.deserialize(data)!;
            player.x = packet.x;
            player.y = packet.y;
            player.z = packet.z;
            player.yaw = packet.yaw;
            player.pitch = packet.pitch;

            this.sendPacketToAllExcept(PositionAndOrientation.serialize({
                playerId: player.id,
                x: packet.x,
                y: packet.y,
                z: packet.z,
                yaw: packet.yaw,
                pitch: packet.pitch,
            }), player);

            return PositionAndOrientation.packetSize;
        }

        else if (Message.isValid(data)) {
            const packet = Message.deserialize(data)!;
            this.sendPacketToAll(Message.serialize({
                playerId: player.id,
                message: `<${player.username}> ${packet.message}`,
            }));

            return Message.packetSize;
        }

        return 0;
    }

    private handleLogin(player: Player): void {
        player.sendPacket(ServerIdentification.serialize({
            protocolVersion: 0x07,
            serverName: this.options.name,
            serverMotd: this.options.motd,
            userType: player.userType,
        }));

        player.sendPacket(LevelInitialize.serialize({}));

        const worldData = this.world.getCompressedData();
        for (let i = 0; i < worldData.length; i += 1024) {
            const chunk = worldData.slice(i, Math.min(i + 1024, worldData.length));
            player.sendPacket(LevelDataChunk.serialize({
                chunkData: chunk,
                chunkLength: chunk.length,
                percentComplete: (i + chunk.length) / worldData.length,
            }));
        }

        player.sendPacket(LevelFinalize.serialize({ sizeX: 256, sizeY: 256, sizeZ: 256 }));

        player.x = (256 / 2) * 32;
        player.z = (256 / 2) * 32;
        player.y = 2 * 32;

        for (const otherPlayer of this.players.values()) {
            if (otherPlayer !== player) {
                player.sendPacket(SpawnPlayer.serialize({
                    playerId: otherPlayer.id,
                    username: otherPlayer.username,
                    x: otherPlayer.x,
                    y: otherPlayer.y,
                    z: otherPlayer.z,
                    yaw: otherPlayer.yaw,
                    pitch: otherPlayer.pitch,
                }));
                otherPlayer.sendPacket(SpawnPlayer.serialize({
                    playerId: player.id,
                    username: player.username,
                    x: player.x,
                    y: player.y,
                    z: player.z,
                    yaw: player.yaw,
                    pitch: player.pitch,
                }));
            }
        }

        player.sendPacket(PositionAndOrientation.serialize({
            playerId: -1,
            x: player.x,
            y: player.y,
            z: player.z,
            yaw: player.yaw,
            pitch: player.pitch,
        }));

        this.sendPacketToAll(Message.serialize({ playerId: -1, message: `${player.username} has joined the game` }));
    }

    private handleExtendedLogin(player: Player): void {
        const extensions = this.options.extensions ?? [];    
    
        player.sendPacket(ExtInfo.serialize({
            appName: "pistonlite",
            extensionCount: extensions.length,
        }));
        
        for (const extension of extensions) {
            player.sendPacket(ExtEntry.serialize({
                name: extension.name,
                version: extension.version,
            }));
        }
    }
}

export class Player {
    private _writeBuffer = new ArrayBufferSink();
    private _userType: 0x00 | 0x64 = 0;
    
    public x: number = 0;
    public y: number = 0;
    public z: number = 0;
    public yaw: number = 0;
    public pitch: number = 0;
    public lastPing: number = 0;

    public extensionCount: number = 0;
    public readonly extensions: string[] = [];

    public get userType(): 0x00 | 0x64 {
        return this._userType;
    }
    
    public set userType(value: 0x00 | 0x64) {
        this._userType = value;
        this.sendPacket(UpdateUserType.serialize({ userType: value }));
    }

    public constructor(
        private socket: Bun.Socket<number>,
        public readonly id: number,
        public readonly username: string,
    ) {
        this._writeBuffer.start({ stream: true, highWaterMark: 1024 });
    }

    public disconnect(reason: string): void {
        this.socket.write(DisconnectPlayer.serialize({ reason }));
        this.socket.end();
    }

    public sendPacket(packet: Buffer): void {
        this._writeBuffer.write(packet);
    }

    public flush(): void {
        // TODO: "Currently, TCP sockets in Bun do not buffer data." We implement buffering ourselves, but we
        // should switch to using Bun's buffering when it is implemented.
        queueMicrotask(() => {
            const data = this._writeBuffer.flush() as ArrayBuffer;
            const bytesWritten = this.socket.write(data);
            if (bytesWritten < data.byteLength) {
                this._writeBuffer.write(data.slice(bytesWritten));
            }
        });
    }
}