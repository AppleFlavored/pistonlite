import { Server } from "./server";

const server = new Server({
    name: "Test Server",
    motd: "Super cool server",
});

const serverSocket = Bun.listen<number>({
    hostname: "0.0.0.0",
    port: 25565,
    socket: server.handler,
});

serverSocket.reload({
    socket: server.handler,
});