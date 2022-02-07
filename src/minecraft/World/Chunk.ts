import { Mat4, Vec2, Vec3 } from "../../lib/TSM.js";
import { Block, BlockType } from "./Block.js"
import { World } from "./World.js";

export class Chunk {

  public static neighbors: Vec3[] = [
    new Vec3([1, 0, 0]),  // posX
    new Vec3([-1, 0, 0]), // negX
    new Vec3([0, 1, 0]),  // posY 
    new Vec3([0, -1, 0]), // negY
    new Vec3([0, 0, 1]),  // posZ
    new Vec3([0, 0, -1])  // negZ
  ];

  // Constants
  public static chunkSize: Vec3 = new Vec3([16, 32, 16]);
  public static blockLength: number = 1;

  // These are immutable
  private currPositions: number[];
  private currIndices: number[];
  private currNormals: number[];
  private currUVs: number[];
  private blocks: Block[];

  // Offset in "chunk" coordinates
  private world: World;
  private offset: Vec3;
  private dirty: boolean;

  constructor(offset: Vec3, world: World) {
    this.resetBuffers();

    this.offset = offset;
    this.world = world;
    this.dirty = true;

    this.blocks = [];
    let totalBlocks = Chunk.chunkSize.x * Chunk.chunkSize.z * Chunk.chunkSize.y;
    for(let i = 0; i < totalBlocks; i++) {
      this.blocks.push(null);
    }

    // Must call generateChunk from world gen on this chunk
  }

  // Getters and Setters

  // Chunk position in Chunk Coordinates
  public getOffset(): Vec3 {
    return this.offset;
  }

  // Chunk position in World Coordinates
  public getPosition(): Vec3 {
    return Vec3.product(this.offset, Chunk.chunkSize);
  }

  // Block at i
  public getBlockFromIndex(i: number): Block {
    return this.blocks[i];
  }

  // Block at (x, y, z)
  public getBlock(pos: Vec3): Block {
    return this.blocks[this.getFlatIndex(pos)];
  }

  public setBlock(pos: Vec3, blockType: BlockType): void {
    let index = this.getFlatIndex(pos);
    let worldPos: Vec3 = this.getWorldPosition(pos);

    if(index == -1) {
      // Attempt placing this block from world
      this.world.setBlock(worldPos, blockType);
      return;
    } 

    this.blocks[index] = new Block(worldPos, Chunk.blockLength, blockType);
    this.dirty = true;
  }

  // Get world position of specified block position in chunk
  public getWorldPosition(pos: Vec3): Vec3 {
    // Allow getting out of bounds positions so that
    // transparentNeighbors can get blocks from other chunks

    let result: Vec3 = Vec3.sum(pos, this.getPosition());
    return result;
  }

  // The block coordinate must be in chunk coordinates;
  // (0, 0, 0) corresponds to index 0
  public getFlatIndex(point: Vec3): number {
    if(this.outOfBounds(point)) {
      return -1;
    }
      
    let index: number = (point.y * (Chunk.chunkSize.x * Chunk.chunkSize.z))
                      + (point.z * Chunk.chunkSize.z)
                      + point.x;
    return index;
  }

  // Return block coordinates of block at index i
  // If worldCoords is false, return point in chunk coordinates
  // i.e., index 0 corresponds to (0, 0, 0)
  // If worldCoords is true, return in world coordinates using
  // chunk position
  public getXYZIndex(i: number, worldCoords: boolean): Vec3 {
    let point: Vec3 = new Vec3([0, 0, 0]);

    point.y = Math.floor(i / (Chunk.chunkSize.x * Chunk.chunkSize.z));

    let offset = i - (point.y * Chunk.chunkSize.x * Chunk.chunkSize.z); 
    point.x = offset % Chunk.chunkSize.x;
    point.z = Math.floor(offset / Chunk.chunkSize.z);

    if(!worldCoords)
      return point;

    point = Vec3.sum(point, Vec3.product(this.offset, Chunk.chunkSize));
    return point;
  }

  // Returns true if pos is less than ChunksSize
  // Thus pos is interpreted to be in Chunk coords
  public outOfBounds(pos: Vec3): boolean {
    let x = pos.x;
    let y = pos.y;
    let z = pos.z;

    if(x < 0 || x >= Chunk.chunkSize.x
      || y < 0 || y >= Chunk.chunkSize.y
      || z < 0 || z >= Chunk.chunkSize.z) {
        return true; // Out of bounds
      }

    return false;
  }

  /* Rendering Methods */

  public resetBuffers(): void {
    this.currIndices = [];
    this.currNormals = [];
    this.currPositions = [];
    this.currUVs = [];
  }

  public addBlockAttributes(block: Block): void {
    block.getPositions().forEach(pos => {
      this.currPositions.push(pos);
    });

    let length = this.currIndices.length;
    block.getIndices().forEach(index => {
        this.currIndices.push(length + index);
    });

    block.getNormals().forEach(normal => {
        this.currNormals.push(normal);
    });

    block.getUVs().forEach(uv => {
      this.currUVs.push(uv);
    });

    // I just realized that after the faces for 
    // each block are created and added to the chunk
    // buffers, we don't need to store them anymore
    // because they'll be regenerated when the
    // chunk is marked as dirty and updated
    block.resetBuffers();
  }

  // Returns a boolean array of length 6
  // True if the neighbor is transparent (or null) 
  // Will not hide vertices for adjacent chunks
  public transparentNeighbors(index: number): boolean[] {
    let arr: boolean[] = [];
    let point: Vec3 = this.getXYZIndex(index, false);

    Chunk.neighbors.forEach((vec, index) => {
      let p = Vec3.sum(point, vec);
      let block: Block = this.getBlock(p);

      // Check for neighboring blocks in other chunks
      if(this.outOfBounds(p)) {
        // this.getWorldPosition should theoretically return the
        // the correct world coordinates for blocks outside 
        // local chunk bounds 
        block = this.world.getBlockAt(this.getWorldPosition(p));
      }

      arr[index] = false;
      if(block == null || block.isTransparent()) {
        arr[index] = true;
      } 
    });

    return arr;
  }

  // Must be called after *any* alterations to world state
  // ex. breaking or placing blocks
  public update(): void {
    if(this.isDirty()) {
      this.resetBuffers();
      this.blocks.forEach((block, index) => {
          block.createFaces(this.transparentNeighbors(index));
          this.addBlockAttributes(block);
      });
      this.setState(false);
    }
  }

  // Rendering Data
  public isDirty(): boolean {
    return this.dirty;
  }

  public setState(dirty: boolean): void {
    this.dirty = dirty;
  }

  public getPositions(): number[] {
    return this.currPositions;
  }

  public getIndices(): number[] {
    return this.currIndices;
  }

  public getNormals(): number[] {
    return this.currNormals;
  }

  public getUVs(): number[] {
    return this.currUVs;
  }

  /**
   * Returns the model matrix of the Chunk
   */
  public uMatrix(): Mat4 {
    const ret: Mat4 = new Mat4().setIdentity();
    return ret;
  }
}