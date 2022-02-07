import { Chunk } from "./Chunk.js"
import { BlockType } from "./Block.js"
import { Vec2, Vec3 } from "../../lib/TSM.js";
import { GovindNoise } from "../../lib/noise/GovindNoise.js";
import { PerlinNoise } from "../../lib/noise/PerlinNoise.js";
import { PRNG } from "../../lib/noise/PRNG.js";

export enum Biome {
    OCEAN,
    PLAINS,
    BEACH
}

export class WorldGen {

    public static rockLevel = 5;
    public static maxTreeHeight = 10;

    public static generateChunk(chunk: Chunk) {
        let width = Chunk.chunkSize.x;
        let length = Chunk.chunkSize.z;
        let height = Chunk.chunkSize.y;

        let rand = new PRNG(chunk.getPosition().z);

        for(let x = 0; x < width; x++) {
            for(let z = 0; z < length; z++) {
                let worldPos: Vec3 = chunk.getWorldPosition(new Vec3([x, 0, z]));
                //let noiseHeight = Math.floor(GovindNoise.govindNoise(worldPos.x, worldPos.z, worldPos));
                let noiseHeight = PerlinNoise.noise2(worldPos.x, worldPos.z) * Chunk.chunkSize.y;
                noiseHeight = Math.floor(Math.abs(noiseHeight));
                // console.log(randCheck);

                for(let y = 0; y < height; y++) {
                    let type: BlockType = BlockType.AIR;
                    if(y == noiseHeight) {
                        type = BlockType.GRASS;
                    } else if(y < noiseHeight && y > noiseHeight / 2) {
                        type = BlockType.DIRT;
                    } else if(y <= noiseHeight / 2 && y > noiseHeight / 6) {
                        type = BlockType.SAND;
                    } else if(y <= noiseHeight / 6) {
                        type = BlockType.BEDROCK;
                    }

                    chunk.setBlock(new Vec3([x, y, z]), type);
                }

                let randCheck = Math.floor(rand.nextFloat() * 1000);
                if(randCheck < 3 && noiseHeight < height - this.maxTreeHeight) {
                    let treePos = new Vec3([x, noiseHeight + 1, z]);
                    this.addTree(treePos, chunk);
                } 
            }
        }
    }

    // How to preserve across chunk boundaries?
    public static addTree(pos: Vec3, chunk: Chunk) {
        // Wood
        let add: Vec3 = new Vec3([-1, 0, -1]);
        for(let i = 0; i <= 3; i++) {
            add.y = i;
            chunk.setBlock(Vec3.sum(pos, add), BlockType.PLANK);
        }

        // Leaves
        for(let x = -2; x <= 0; x++) {
            for(let y = 4; y < 7; y++) {
                for(let z = -2; z <= 0; z++) {
                    add.x = x;
                    add.y = y;
                    add.z = z;
                    //console.log(add);
                    chunk.setBlock(Vec3.sum(add, pos), BlockType.LEAVES);
                }
            }
        }
    }
}