plugins {
    kotlin("jvm") version "1.9.23"
}

group = "dev.flavored"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("io.ktor:ktor-server-core:2.3.9")
    implementation("io.ktor:ktor-server-netty:2.3.9")
    implementation("io.ktor:ktor-network:2.3.9")
}

kotlin {
    jvmToolchain(21)
}