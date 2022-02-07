import { Vec2 } from "../../lib/TSM.js";
import { Block } from "./Block.js";

export class TextureVectors {
    public static GRASS_TOP: Vec2 = new Vec2([0, 0]);
    public static GRASS_SIDE: Vec2 = new Vec2([0, 1]);
    public static DIRT: Vec2 = new Vec2([0, 2]);
    public static WOOD_SIDE: Vec2 = new Vec2([0, 3]);
    public static BEDROCK: Vec2 = new Vec2([0, 4]);
    public static WOOD_TOP: Vec2 = new Vec2([0, 5]);
    public static SAND: Vec2 = new Vec2([1, 0]);
    public static CLAY: Vec2 = new Vec2([1, 1]);
    public static GRAVEL: Vec2 = new Vec2([1, 2]);
    public static LEAVES: Vec2 = new Vec2([1, 3]);
} 

export class TextureAtlas {
    // Texture Atlas Variables
    // posX: 0, negX: 1, posY: 2
    // negY: 3, posZ: 4, negZ: 5 
    public static atlasWidth: number = 2048;
    public static atlasHeight: number = 2048;
    public static texWidth: number = 256;
    public static texHeight: number = 256;

    // Returns uvs indexed from 0 to 12 for specificed from the texture and face Index 
    public static getUVs(textureIndex: Vec2, faceIndex: number): number[] {
        // arr[0]: left, arr[1]: right, arr[2]: bottom, arr[3]: top 
        let arr: number[] = this.getOffsetsArray(textureIndex.x, textureIndex.y);
        let left: number = arr[0];
        let right: number = arr[1];
        let bottom: number = arr[2];
        let top: number = arr[3];

        switch(faceIndex) {
            case Block.posX: return this.getPosXuvs(left, right, bottom, top);
            case Block.negX: return this.getNegXuvs(left, right, bottom, top);
            case Block.posY: return this.getPosYuvs(left, right, bottom, top);
            case Block.negY: return this.getNegYuvs(left, right, bottom, top);
            case Block.posZ: return this.getPosZuvs(left, right, bottom, top);
            case Block.negZ: return this.getNegZuvs(left, right, bottom, top);
        }

        // Index out of bounds
        return null;
    }

    public static getOffsetsArray(xOffset: number, yOffset: number): number[] {
        let arr: number[] = [];
        
        let left: number = (xOffset * this.texWidth) / this.atlasWidth;
        let right: number = ((xOffset + 1) * this.texWidth) / this.atlasWidth;
        let bottom: number = (yOffset * this.texHeight) / this.atlasHeight;
        let top: number = ((yOffset + 1) * this.texHeight) / this.atlasHeight;

        arr.push(left);
        arr.push(right);
        arr.push(bottom);
        arr.push(top);

        return arr;
    }

    // All of these UVs are hard coded based on the vertex positions specified in Block
    public static getPosXuvs(left: number, right: number, bottom: number, top: number): number[] {
        let currUVs: number[] = [
            left, bottom, 
            right, top,
            right, bottom,

            left, bottom,
            left, top,
            right, top];
        return currUVs;
    }

    public static getNegXuvs(left: number, right: number, bottom: number, top: number): number[] {
        let currUVs: number[] = [
            right, bottom, 
            left, bottom, 
            left, top, 

            right, bottom,
            left, top,
            right, top
        ];
        return currUVs;
    }

    public static getPosYuvs(left: number, right: number, bottom: number, top: number): number[] {
        let currUVs: number[] = [
            right, top, 
            right, bottom, 
            left, bottom, 

            right, top,
            left, bottom,
            left, top
        ];
        return currUVs;
    }

    public static getNegYuvs(left: number, right: number, bottom: number, top: number): number[] {
        let currUVs: number[] = [
            right, top, 
            left, bottom, 
            right, bottom, 

            right, top,
            left, top,
            left, bottom
        ];
        return currUVs;
    }

    public static getPosZuvs(left: number, right: number, bottom: number, top: number): number[] {
        let currUVs: number[] = [
            right, top, 
            right, bottom, 
            left, bottom, 

            left, top,
            right, top,
            left, bottom
        ];
        return currUVs;
    }

    public static getNegZuvs(left: number, right: number, bottom: number, top: number): number[] {
        let currUVs: number[] = [
            right, top, 
            left, bottom, 
            left, top, 

            right, top,
            right, bottom,
            left, bottom
        ];
        return currUVs;
    }
}