import { gzipSync } from "bun";

export const Block = {
    Air: 0,
    Stone: 1,
    Grass: 2,
    Dirt: 3,
    Cobblestone: 4,
    Planks: 5,
    Sapling: 6,
    Bedrock: 7,
    FlowingWater: 8,
    StationaryWater: 9,
    FlowingLava: 10,
    StationaryLava: 11,
    Sand: 12,
    Gravel: 13,
    GoldOre: 14,
    IronOre: 15,
    CoalOre: 16,
    Wood: 17,
    Leaves: 18,
    Sponge: 19,
    Glass: 20,
    RedWool: 21,
    OrangeWool: 22,
    YellowWool: 23,
    ChartreuseWool: 24,
    GreenWool: 25,
    SpringGreenWool: 26,
    CyanWool: 27,
    CapriWool: 28,
    UltramarineWool: 29,
    PurpleWool: 30,
    VioletWool: 31,
    MagentaWool: 32,
    RoseWool: 33,
    DarkGrayWool: 34,
    LightGrayWool: 35,
    WhiteWool: 36,
    Flower: 37,
    Rose: 38,
    BrownMushroom: 39,
    RedMushroom: 40,
    GoldBlock: 41,
    IronBlock: 42,
    DoubleStoneSlab: 43,
    StoneSlab: 44,
    BrickBlock: 45,
    TNT: 46,
    Bookshelf: 47,
    MossyCobblestone: 48,
    Obsidian: 49,
    // Extended blocks (level 1)
    CobblestoneSlab: 50,
    Rope: 51,
    Sandstone: 52,
    Snow: 53,
    Fire: 54,
    LightPinkWool: 55,
    ForestGreenWool: 56,
    BrownWool: 57,
    DeepBlueWool: 58,
    TurquoiseWool: 59,
    Ice: 60,
    CeramicTile: 61,
    Magma: 62,
    Pillar: 63,
    Crate: 64,
    StoneBrick: 65,
} as const;
export type Block = typeof Block[keyof typeof Block];

export class World {
    public blocks: Block[];

    public constructor() {
        this.blocks = new Array(256 * 256 * 256).fill(Block.Air);
    }
    
    public setBlock(x: number, y: number, z: number, block: Block): void {
        this.blocks[getBlockIndex(x, y, z)] = block;
    }

    public getBlock(x: number, y: number, z: number): Block {
        return this.blocks[getBlockIndex(x, y, z)];
    }

    public getCompressedData(): Uint8Array {
        const data = Buffer.alloc(4 + this.blocks.length);
        data.writeInt32BE(this.blocks.length, 0);
        data.set(this.blocks, 4);
        return gzipSync(data);
    }
}

function getBlockIndex(x: number, y: number, z: number): number {
    if (x < 0 || x > 255 || y < 0 || y > 255 || z < 0 || z > 255) {
        return 0;
    }
    return (y * 256 * 256) + (z * 256) + x;
}