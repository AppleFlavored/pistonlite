package dev.flavored.pistonlite

class World(val width: Int, val length: Int, val height: Int) {
    private val data: Array<Block> = Array(width * length * height) { Block.AIR }

    operator fun get(x: Int, y: Int, z: Int): Block {
        return data[y * (width * length) + (z * width) + x]
    }

    operator fun set(x: Int, y: Int, z: Int, block: Block) {
        data[y * (width * length) + (z * width) + x] = block
    }

    fun getData(): ByteArray {
        return data.map { it.ordinal.toByte() }.toByteArray()
    }
}