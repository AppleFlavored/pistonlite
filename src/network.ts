import { definePacket, fshort, int16, int8, leveldata, string, uint8 } from "./serde";

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface PositionWithView extends Position {
  yaw: number;
  pitch: number;
}

export const PlayerIdentification = definePacket(0x00, {
  protocolVersion: uint8(),
  username: string(),
  verificationKey: string(),
  padding: uint8(),
});

export const ServerIdentification = definePacket(0x00, {
  protocolVersion: uint8(),
  serverName: string(),
  serverMotd: string(),
  userType: uint8(),
});

export const Ping = definePacket(0x01, {});

export const LevelInitialize = definePacket(0x02, {});

export const LevelDataChunk = definePacket(0x03, {
  chunkLength: int16(),
  chunkData: leveldata(),
  percentComplete: uint8(),
});

export const LevelFinalize = definePacket(0x04, {
  sizeX: int16(),
  sizeY: int16(),
  sizeZ: int16(),
});

export const SetBlockC2S = definePacket(0x05, {
  x: int16(),
  y: int16(),
  z: int16(),
  mode: uint8(),
  blockType: uint8(),
});

export const PositionAndOrientation = definePacket(0x08, {
  playerId: int8(),
  x: fshort(),
  y: fshort(),
  z: fshort(),
  yaw: uint8(),
  pitch: uint8(),
});

export const Message = definePacket(0x0d, {
  playerId: int8(),
  message: string(),
});

export const SetBlockS2C = definePacket(0x06, {
  x: int16(),
  y: int16(),
  z: int16(),
  blockType: uint8(),
});

export const SpawnPlayer = definePacket(0x07, {
  playerId: int8(),
  username: string(),
  x: fshort(),
  y: fshort(),
  z: fshort(),
  yaw: uint8(),
  pitch: uint8(),
});

export const PositionAndOrientationUpdate = definePacket(0x09, {
  playerId: int8(),
  deltaX: fshort(),
  deltaY: fshort(),
  deltaZ: fshort(),
  yaw: uint8(),
  pitch: uint8(),
});

export const PositionUpdate = definePacket(0x0a, {
  playerId: int8(),
  deltaX: fshort(),
  deltaY: fshort(),
  deltaZ: fshort(),
});

export const OrientationUpdate = definePacket(0x0b, {
  playerId: int8(),
  yaw: uint8(),
  pitch: uint8(),
});

export const DespawnPlayer = definePacket(0x0c, {
  playerId: int8(),
});

export const DisconnectPlayer = definePacket(0x0e, {
  reason: string(),
});

export const UpdateUserType = definePacket(0x0f, {
  userType: uint8(),
});