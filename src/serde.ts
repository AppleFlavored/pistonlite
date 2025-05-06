type Field<T> = {
    size: number;
    serialize(buffer: Buffer, offset: number, value: T): void;
    deserialize(buffer: Buffer, offset: number): T;
};

export function uint8(): Field<number> {
    return {
        size: 1,
        serialize: (buffer: Buffer, offset: number, value: number): void => {
            buffer.writeUInt8(value, offset);
        },
        deserialize: (buffer: Buffer, offset: number): number => {
            return buffer.readUInt8(offset);
        },
    };
}

type FieldRecord = { [key: string]: Field<any> };

export function int8(): Field<number> {
    return {
        size: 1,
        serialize: (buffer: Buffer, offset: number, value: number): void => {
            buffer.writeInt8(value, offset);
        },
        deserialize: (buffer: Buffer, offset: number): number => {
            return buffer.readInt8(offset);
        },
    };
}

export function fbyte(): Field<number> {
    return {
        size: 1,
        serialize: (buffer: Buffer, offset: number, value: number): void => {
            buffer.writeUInt8(value, offset)
        },
        deserialize: (buffer: Buffer, offset: number): number => {
            return buffer.readUInt8(offset);
        },
    };
}

export function int16(): Field<number> {
    return {
        size: 2,
        serialize: (buffer: Buffer, offset: number, value: number): void => {
            buffer.writeInt16BE(value, offset);
        },
        deserialize: (buffer: Buffer, offset: number): number => {
            return buffer.readInt16BE(offset);
        },
    };
}

export function fshort(): Field<number> {
    return {
        size: 2,
        serialize: (buffer: Buffer, offset: number, value: number): void => {
            buffer.writeInt16BE(value, offset);
        },
        deserialize: (buffer: Buffer, offset: number): number => {
            return buffer.readInt16BE(offset);
        },
    };
}

export function string(): Field<string> {
    return {
        size: 64,
        serialize: (buffer: Buffer, offset: number, value: string): void => {
            const encoder = new TextEncoder();
            encoder.encodeInto(value.padEnd(64), buffer.subarray(offset, offset + 64));
        },
        deserialize: (buffer: Buffer, offset: number): string => {
            return buffer.toString("utf8", offset, offset + 64).trimEnd();
        },
    };
}

export function leveldata(): Field<Uint8Array> {
    return {
        size: 1024,
        serialize: (buffer: Buffer, offset: number, value: Uint8Array): void => {
            buffer.set(value, offset);
        },
        deserialize: (buffer: Buffer, offset: number): Uint8Array => {
            return buffer.subarray(offset, offset + 1024);
        },
    };
}

interface Packet<T extends FieldRecord> {
    readonly id: number;
    serialize(data: InferPacketModel<T>): Buffer;
    deserialize(buffer: Buffer): InferPacketModel<T> | null;
    isValid(buffer: Buffer): boolean;
}

type InferPacketModel<T extends FieldRecord> = {
    [K in keyof T]: T[K] extends Field<infer U> ? U : never;
};

export function definePacket<T extends FieldRecord>(id: number, model: T): Packet<T> {
    const fields = Object.entries(model);
    let packetSize = 1;
    for (const type of Object.values(model)) {
        packetSize += type.size;
    }

    return {
        id,
        serialize: (data: InferPacketModel<T>): Buffer => {
            const buffer = Buffer.alloc(packetSize);
            buffer.writeUInt8(id, 0);
            let offset = 1;
            for (const [key, type] of fields) {
                type.serialize(buffer, offset, data[key]);
                offset += type.size;
            }
            return buffer;
        },
        deserialize: (buffer: Buffer): InferPacketModel<T> | null => {
            if (buffer.length !== packetSize) {
                return null;
            }
            if (buffer.readUInt8(0) !== id) {
                return null;
            }
            let offset = 1;
            const result: Record<string, any> = {};
            for (const [key, type] of fields) {
                result[key] = type.deserialize(buffer, offset);
                offset += type.size;
            }
            return result as InferPacketModel<T>;
        },
        isValid: (buffer: Buffer): boolean => {
            return buffer.length === packetSize && buffer.readUInt8(0) === id;
        },
    };
}