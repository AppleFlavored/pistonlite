package dev.flavored.pistonlite

import io.ktor.util.*
import java.nio.ByteBuffer

fun ByteBuffer.getString(): String {
    val data = this.slice(position(), 64).decodeString().trimEnd()
    position(position() + 64)
    return data
}

fun ByteBuffer.putString(value: String) {
    val data = value.padEnd(64).toByteArray()
    put(data, 0, 64)
}