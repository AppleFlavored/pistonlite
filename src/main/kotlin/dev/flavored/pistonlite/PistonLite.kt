package dev.flavored.pistonlite

import io.ktor.network.selector.*
import io.ktor.network.sockets.*
import io.ktor.utils.io.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.util.*
import java.util.zip.GZIPOutputStream

private val world = World(256, 256, 64)

fun getPacketSize(packetId: Byte): Int {
    return when (packetId.toInt()) {
        0x00 -> 130
        0x05 -> 8
        0x08 -> 9
        0x0D -> 65
        else -> -1
    }
}

suspend fun sendPacket(writeChannel: ByteWriteChannel, packet: SendablePacket) {
    val writeBuffer = ByteBuffer.allocate(packet.getPacketSize())
    packet.write(writeBuffer)
    writeBuffer.flip()
    writeChannel.writeFully(writeBuffer)
}

suspend fun handlePacket(writeChannel: ByteWriteChannel, packetId: Byte, buffer: ByteBuffer) {
    when (packetId.toInt()) {
        0x00 -> {
            val protocolVersion = buffer.get()
            val username = buffer.getString()
            val verificationKey = buffer.getString()
            buffer.get()

            println("Protocol Version: $protocolVersion, Username: $username, Verification Key: $verificationKey")
            sendPacket(writeChannel, ServerIdentification(
                protocolVersion,
                "PistonLite",
                "Welcome to the Kotlin Classic Server!",
                0)
            )
            sendPacket(writeChannel, LevelInitialize())

            withContext(Dispatchers.IO) {
                val compressionOutput = ByteArrayOutputStream()
                val outputStream = GZIPOutputStream(compressionOutput)

                val worldSize = world.width * world.depth * world.height
                outputStream.write(worldSize shr 24)
                outputStream.write(worldSize shr 16)
                outputStream.write(worldSize shr 8)
                outputStream.write(worldSize)

                outputStream.write(world.getData())
                outputStream.close()

                val compressedData = compressionOutput.toByteArray()
                compressionOutput.close()

                for (i in 0 until compressionOutput.size() step 1024) {
                    val chunk = Arrays.copyOfRange(compressedData, i, i + 1024)
                    val chunkData = LevelDataChunk(chunk.size.toShort(), chunk, (i * 100 / compressedData.size).toByte())
                    sendPacket(writeChannel, chunkData)
                }
            }

            sendPacket(writeChannel, LevelFinalize(world.width.toShort(), world.height.toShort(), world.depth.toShort()))
            sendPacket(writeChannel, SpawnPlayer(-1, username, (world.width / 2 shl 5).toShort(), (world.height + 1 shl 5).toShort(), (world.depth / 2 shl 5).toShort(), 0, 0))
        }
    }
}

suspend fun handleClient(socket: Socket) {
    val readChannel = socket.openReadChannel()
    val writeChannel = socket.openWriteChannel(autoFlush = true)

    while (true) {
        val packetId = readChannel.readByte()
        val packetSize = getPacketSize(packetId)
        println("Packet ID: $packetId, Packet Size: $packetSize")

        if (packetSize == -1) {
            println("Invalid packet size for packet ID: $packetId")
            sendPacket(writeChannel, DisconnectPlayer("Invalid packet size for packet ID: $packetId"))
            break
        }

        val packetBuffer = ByteBuffer.allocate(packetSize)
        readChannel.readFully(packetBuffer)
        packetBuffer.flip()
        handlePacket(writeChannel, packetId, packetBuffer)
    }

    withContext(Dispatchers.IO) {
        socket.close()
    }
}

fun main(args: Array<String>) = runBlocking {
    val selectorManager = SelectorManager(Dispatchers.IO)
    val serverSocket = aSocket(selectorManager).tcp().bind("0.0.0.0", 25565)

    for (i in 0 until world.width) {
        for (j in 0 until world.depth) {
            for (k in 0 until world.height / 2) {
                world[i, k, j] = Block.GRASS
            }
        }
    }

    while (true) {
        val socket = serverSocket.accept()
        launch {
            val result = runCatching { handleClient(socket) }
            if (result.isFailure) {
                println("Connection lost for ${socket.remoteAddress}")
            }
        }
    }
}