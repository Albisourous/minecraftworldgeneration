import { Mat4, Vec2, Vec3 } from "../../lib/TSM.js";
import { TextureAtlas, TextureVectors } from "./Textures.js";

export enum BlockType {
    AIR,
    GRASS,
    DIRT,
    BEDROCK,
    PLANK,
    GRAVEL,
    SAND,
    CLAY,
    COAL,
    COPPER,
    WATER,
    LEAVES
}

export class Block {
    // posX: 0, negX: 1, posY: 2
    // negY: 3, posZ: 4, negZ: 5 
    public static posX: number = 0;
    public static negX: number = 1;
    public static posY: number = 2;
    public static negY: number = 3;
    public static posZ: number = 4;
    public static negZ: number = 5;
    public static l: number = 1;

    // Other "magic" numbers
    public static numFaces: number = 6;
    public static vertsPerFace: number = 6;
    public static coordDim: number = 4;
    public static uvDim: number = 2;

    // These are immutable
    private currPositions: number[];
    private currIndices: number[];
    private currNormals: number[];
    private currUVs: number[];

    // Face States
    // 0 -> posX, 1 -> negX, ...
    private faceIndices: number[];

    // Having each block store its texture indices 
    // seems wasteful; thousands of blocks will have
    // the same texture indices. How to rectify?
    // TODO:
    private textureIndices: Vec2[];
    private blockType: BlockType;
    private transparent: boolean;
    private solid: boolean;

    // Location
    // This info is already retrievable from chunk offset and index
    // How to optimize away?
    private x: number;
    private y: number;
    private z: number;
    private l: number;

    // Creates new voxel at (x,y,z) with length l
    // Assumes creation of all faces
    // Position in world coordinates
    constructor(position: Vec3, l: number, blockType: BlockType) {
        this.currPositions = [];
        this.currIndices = [];
        this.currNormals = [];
        this.currUVs = [];
        this.textureIndices = [];

        this.x = position.x;
        this.y = position.y;
        this.z = position.z;
        this.l = l;

        this.setBlockType(blockType);

        // No faces initialized
        this.faceIndices = [];
        for(let i = 0; i < Block.numFaces; i++) {
            this.faceIndices[i] = -1;
        }
    }

    public setTextureIndices(textureIndices: Vec2[]): void {
        this.textureIndices = textureIndices;
    }

    // 0 is posX, 1 is negX, and so on
    public createFaces(faces: boolean[]): void {
        if(this.blockType == BlockType.AIR) {
            // No faces to create for air, textureIndices array is empty
            return;
        }

        if (faces.length != Block.numFaces) {
            console.log("Must have 6 faces");
            return;
        }

        for(let i = 0; i < Block.numFaces; i++) {
            if(faces[i]) {
                this.createFace(this.x, this.y, this.z, this.l, i, this.textureIndices[i]);
            }
        }
    }

    // faceIndex uses convention created above
    public createFace(x: number, y: number, z: number, l: number, 
                    faceIndex: number, textureIndex: Vec2): void {
        // Create Faces
        if(this.faceIndices[faceIndex] != -1) {
            console.log("Face already exists");
            return;
        }

        let verts: number[];
        switch(faceIndex) {
            case Block.posX: {
                // Compute Positions
                verts = [
                    x + l, y, z, 1.0,
                    x + l, y + l, z + l, 1.0,
                    x + l, y, z + l, 1.0,
            
                    x + l, y, z, 1.0,
                    x + l, y + l, z, 1.0,
                    x + l, y + l, z + l, 1.0
                ];
                break;
            }
            case Block.negX: {
                verts = [
                    x, y, z, 1.0,
                    x, y, z + l, 1.0,
                    x, y + l, z + l, 1.0,
            
                    x, y, z, 1.0,
                    x, y + l, z + l, 1.0,
                    x, y + l, z, 1.0,
                ];
                break;
            } 
            case Block.posY: {
                verts = [
                    x + l, y + l, z + l, 1.0,
                    x + l, y + l, z, 1.0,
                    x, y + l, z, 1.0,
            
                    x + l, y + l, z + l, 1.0,
                    x, y + l, z, 1.0,
                    x, y + l, z + l, 1.0,
                ];
                break;
            } 
            case Block.negY: {
                verts = [
                    x + l, y, z + l, 1.0,
                    x, y, z, 1.0,
                    x + l, y, z, 1.0,
            
                    x + l, y, z + l, 1.0,
                    x, y, z + l, 1.0,
                    x, y, z, 1.0,
                ];
                break;
            } 
            case Block.posZ: {
                verts = [
                    x, y + l, z + l, 1.0,
                    x, y, z + l, 1.0,
                    x + l, y, z + l, 1.0,
            
                    x + l, y + l, z + l, 1.0,
                    x, y + l, z + l, 1.0,
                    x + l, y, z + l, 1.0
                ];
                break;
            } 
            case Block.negZ: {
                verts = [
                    x + l, y + l, z, 1.0,
                    x, y, z, 1.0,
                    x, y + l, z, 1.0,
            
                    x + l, y + l, z, 1.0,
                    x + l, y, z, 1.0,
                    x, y, z, 1.0,
                ];
                break;
            }  
        }

        // Calculations identical for all cube faces
        verts.forEach(vert => {
            this.currPositions.push(vert);
        });

        // Compute Normals
        for (let i = 0; i < verts.length; i += Block.coordDim * 3) {
            let a: Vec3 = new Vec3([verts[i], verts[i + 1], verts[i + 2]]);
            let b: Vec3 = new Vec3([verts[i + 4], verts[i + 5], verts[i + 6]]);
            let c: Vec3 = new Vec3([verts[i + 8], verts[i + 9], verts[i + 10]]);

            let normal = Vec3.cross(Vec3.difference(b, a), Vec3.difference(c, a));

            // Same normal for all three verts
            for (let j = 0; j < 3; j++)
                this.currNormals.push(normal.x, normal.y, normal.z, 0.0);
        }

        // Compute Textures
        let uvs: number[] = TextureAtlas.getUVs(textureIndex, faceIndex);
        uvs.forEach(uv => {
            this.currUVs.push(uv);
        });

        // Compute Indices
        let offset = this.currIndices.length;
        for(let i = 0; i < Block.vertsPerFace; i++) {
            this.currIndices.push(i + offset);
        }
        this.faceIndices[faceIndex] = offset;
    }

    // Might be obsolete since chunk checks for transparent
    // neighbors each time it's updated
    public removeFace(faceIndex: number): void {
        if(faceIndex < 0 
        || faceIndex > 6
        || this.faceIndices[faceIndex] == -1) {
            console.log("Out of Bounds, or No face to remove...");
            return;
        }

        // This is the offset into the index array 
        // which tells us position of face attributes
        let index = this.faceIndices[faceIndex];
        
        this.currPositions.splice(index * Block.coordDim, Block.vertsPerFace * Block.coordDim);
        this.currNormals.splice(index * Block.coordDim, Block.vertsPerFace * Block.coordDim);
        this.currUVs.splice(index * Block.uvDim, Block.vertsPerFace * Block.uvDim);
        
        // Need to edit index values as well
        // Shift everything down by 6 (vertsPerFace) at the point of removal
        this.currIndices.splice(index, Block.vertsPerFace);
        for(let i = index; i < this.currIndices.length; i++) {
            this.currIndices[i] -= Block.vertsPerFace;
        }
    }

    // Experimental: Currently, better for blocks to individually set textures.
    public retextureFace(faceIndex: number, textureIndex: Vec2): void {
        if(faceIndex < 0
            || faceIndex > 6
            || this.faceIndices[faceIndex] == -1) {
                console.log("Face doesn't exist yet...");
                return;
            }
        
        let newUVs: number[] = TextureAtlas.getUVs(textureIndex, faceIndex);

        let firstUVIndex = this.faceIndices[faceIndex] * Block.uvDim;
        for(let i = firstUVIndex; i < Block.uvDim * Block.vertsPerFace; i++) {
            this.currUVs[i] = newUVs[i - firstUVIndex];
        }
    }

    // Reset all buffers
    public resetBuffers(): void {
        this.currPositions = [];
        this.currIndices = [];
        this.currNormals = [];
        this.currUVs = [];
    }

    /* Getters and Setters */
    
    /* Returns an array of the voxel's vertex positions */
    public getPositions(): number[] {
        return this.currPositions;
    }

    /**
     * Returns an array of the voxel's face indices
     */
    public getIndices(): number[] {
        return this.currIndices;
    }

    /**
     * Returns an array of the voxel's normals
     */
    public getNormals(): number[] {
        return this.currNormals;
    }

    // Based on vertex positions above
    public getUVs(): number[] {
        return this.currUVs;
    }

    /**
     * Returns the model matrix of the voxel
     */
    public uMatrix(): Mat4 {
        // TODO: change this, if it's useful
        const ret: Mat4 = new Mat4().setIdentity();

        return ret;
    }

    public isTransparent(): boolean {
        return this.transparent;
    }

    public isSolid(): boolean {
        return this.solid;
    }

    /* Get Different types of Blocks */ 
    private setBlockType(blockType: BlockType): void {
        this.blockType = blockType;
        let texIdx: Vec2[] = [];
        this.transparent = false; // Mostly false
        this.solid = true; // Mostly True

        switch(blockType) {
            case BlockType.AIR: {
                this.transparent = true;
                this.solid = false;
                break;
            }
            case BlockType.GRASS: {
                texIdx = [
                    TextureVectors.GRASS_SIDE,
                    TextureVectors.GRASS_SIDE,
                    TextureVectors.GRASS_TOP,
                    TextureVectors.DIRT,
                    TextureVectors.GRASS_SIDE,
                    TextureVectors.GRASS_SIDE
                ];
                break;
            }
            case BlockType.DIRT: {
                for(let i = 0; i < Block.numFaces; i++) {
                    texIdx[i] = TextureVectors.DIRT;
                }
                break;
            }
            case BlockType.BEDROCK: {
                for(let i = 0; i < Block.numFaces; i++) {
                    texIdx[i] = TextureVectors.BEDROCK;
                }
                break;
            }
            case BlockType.PLANK: {
                texIdx = [
                    TextureVectors.WOOD_SIDE,
                    TextureVectors.WOOD_SIDE,
                    TextureVectors.WOOD_TOP,
                    TextureVectors.WOOD_TOP,
                    TextureVectors.WOOD_SIDE,
                    TextureVectors.WOOD_SIDE
                ];
                break;
            }
            case BlockType.SAND: {
                for(let i = 0; i < Block.numFaces; i++) {
                    texIdx[i] = TextureVectors.SAND;
                }
                break;
            }
            case BlockType.CLAY: {
                for(let i = 0; i < Block.numFaces; i++) {
                    texIdx[i] = TextureVectors.CLAY;
                }
                break;
            }
            case BlockType.GRAVEL: {
                for(let i = 0; i < Block.numFaces; i++) {
                    texIdx[i] = TextureVectors.GRAVEL;
                }
                break;
            }
            case BlockType.LEAVES: {
                for(let i = 0; i < Block.numFaces; i++) {
                    texIdx[i] = TextureVectors.LEAVES;
                }
                break;
            }
            default: {
                console.log("Invalid BlockType...");
                return null;
            }
        }

        this.setTextureIndices(texIdx);
    }
}
