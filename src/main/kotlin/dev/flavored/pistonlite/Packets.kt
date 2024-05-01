package dev.flavored.pistonlite

import java.nio.ByteBuffer

interface SendablePacket {
    fun write(buffer: ByteBuffer)
    fun getPacketSize(): Int
}

class ServerIdentification(
    private val protocolVersion: Byte,
    private val username: String,
    private val motd: String,
    private val userType: Byte
): SendablePacket {
    override fun write(buffer: ByteBuffer) {
        assert(buffer.capacity() >= 131)
        buffer.put(0x00) // Packet ID
        buffer.put(protocolVersion)
        buffer.putString(username)
        buffer.putString(motd)
        buffer.put(userType)
    }

    override fun getPacketSize(): Int = 131
}

class LevelInitialize: SendablePacket {
    override fun write(buffer: ByteBuffer) {
        assert(buffer.capacity() >= 1)
        buffer.put(0x02) // Packet ID
    }

    override fun getPacketSize(): Int = 1
}

class LevelDataChunk(
    private val chunkLength: Short,
    private val chunkData: ByteArray,
    private val percentComplete: Byte
): SendablePacket {
    override fun write(buffer: ByteBuffer) {
        assert(buffer.capacity() >= 1028)
        buffer.put(0x03) // Packet ID
        buffer.putShort(chunkLength)
        buffer.put(chunkData)
        buffer.put(percentComplete)
    }

    override fun getPacketSize(): Int = 1028
}

class LevelFinalize(
    private val xSize: Short,
    private val ySize: Short,
    private val zSize: Short
): SendablePacket {
    override fun write(buffer: ByteBuffer) {
        assert(buffer.capacity() >= 7)
        buffer.put(0x04) // Packet ID
        buffer.putShort(xSize)
        buffer.putShort(ySize)
        buffer.putShort(zSize)
    }

    override fun getPacketSize(): Int = 7
}

class SpawnPlayer(
    private val playerId: Byte,
    private val username: String,
    private val x: Short,
    private val y: Short,
    private val z: Short,
    private val yaw: Byte,
    private val pitch: Byte
) : SendablePacket {
    override fun write(buffer: ByteBuffer) {
        assert(buffer.capacity() >= 74)
        buffer.put(0x07) // Packet ID
        buffer.put(playerId)
        buffer.putString(username)
        buffer.putShort(x)
        buffer.putShort(y)
        buffer.putShort(z)
        buffer.put(yaw)
        buffer.put(pitch)
    }

    override fun getPacketSize(): Int = 74
}

class SetPositionAndRotation(
    private val playerId: Byte,
    private val x: Short,
    private val y: Short,
    private val z: Short,
    private val yaw: Byte,
    private val pitch: Byte
) : SendablePacket {
    override fun write(buffer: ByteBuffer) {
        assert(buffer.capacity() >= 10)
        buffer.put(0x08) // Packet ID
        buffer.put(playerId)
        buffer.putShort(x)
        buffer.putShort(y)
        buffer.putShort(z)
        buffer.put(yaw)
        buffer.put(pitch)
    }

    override fun getPacketSize(): Int = 10
}

class DisconnectPlayer(
    private val reason: String
): SendablePacket {
    override fun write(buffer: ByteBuffer) {
        assert(buffer.capacity() >= 65)
        buffer.put(0x0E) // Packet ID
        buffer.putString(reason)
    }

    override fun getPacketSize(): Int = 65
}