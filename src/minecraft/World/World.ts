import { Mat4, Vec3, Vec4 } from "../../lib/TSM.js";
import { WorldGen } from "./WorldGen.js"
import { Block, BlockType } from "./Block.js";
import { Chunk } from "./Chunk.js";
import { RenderPass } from "../../lib/webglutils/RenderPass.js";
import {
  chunkFSText,
  chunkVSText
} from "../Shaders.js";
import { Player } from "./Player.js";

export class World {

  private static deleteChunksOnMove: boolean = false;

  private player: Player;

  // Renderer Data
  private lightPos: Vec4;
  private extVAO: OES_vertex_array_object;
  private ctx: WebGLRenderingContext;

  // Chunk Rendering Info
  private chunksRowLen: number = 5;
  private totalChunks: number = Math.pow(this.chunksRowLen, 2);

  private chunksOrigin: Vec3;
  private chunks: Chunk[];
  private renderPass: RenderPass;
  private dirty: boolean;

  private currIndices: number[];
  private currPositions: number[];
  private currNormals: number[];
  private currUVs: number[];

  // Array of "tuples" of blockPos and blockType
  private blocksToUpdate = [];

  constructor(canvas: HTMLCanvasElement, lightPos: Vec4, 
              extVAO: OES_vertex_array_object, ctx: WebGLRenderingContext) {
    // Rendering Info
    this.lightPos = lightPos;
    this.extVAO = extVAO;
    this.ctx = ctx;

    this.player = new Player(canvas, this);
    this.dirty = true;

    this.chunks = [];
    this.blocksToUpdate = [];

    this.renderPass = this.getChunkRenderer();
    this.resetBuffers();

    this.update();
  }

  public getPlayer(): Player {
    return this.player;
  }

  /* Coordinate and Chunk Utility Functions */

  // For any position, return the chunk position 
  // in chunk coordinates:
  // i.e., (1,1) in chunk coords correspond to (16, 16)
  public getChunkCoords(position: Vec3): Vec3 {
    let x = Math.floor(position.x / Chunk.chunkSize.x);
    let z = Math.floor(position.z / Chunk.chunkSize.z);

    // Return in "Chunk Coordinates"
    return new Vec3([x, 0, z]);
  }

  // Get origin from the given position (must be in chunk coords)
  public getOriginFromOffset(offset: Vec3): Vec3 {
    let n: number = Math.trunc(this.chunksRowLen / 2);
    let result: Vec3 = Vec3.difference(offset, new Vec3([n, 0, n]));
    return result;
  }

  // Check if chunk present at given position by looping through all chunks.
  // Faster way to do this? Could maybe check mathematically which chunks are
  // bound to still exist 
  public isChunkInBounds(offset: Vec3): boolean {
    // "Shift" offset such that chunksOrigin is at (0, 0)
    let pos: Vec3 = Vec3.difference(offset, this.chunksOrigin);

    return pos.x >= 0 && pos.z >= 0 &&
          pos.x < this.chunksRowLen && 
          pos.z < this.chunksRowLen;
  }

  /* Return index of where chunk at given position would be in chunks array */
  // Don't call without checking offset with isChunkinBounds
  public getChunkIndexFromOffset(offset: Vec3): number {
    let pos: Vec3 = Vec3.difference(offset, this.chunksOrigin);
    return pos.z * this.chunksRowLen + pos.x;
  }

  /* Get chunk offset from chunk index */
  public getChunkOffsetFromIndex(index: number): Vec3 {
    let offset: Vec3 = new Vec3([
      Math.floor(index % this.chunksRowLen),
      0, 
      Math.floor(index / this.chunksRowLen)
    ]);
    
    // this.chunksOrigin.add alters origin itself
    // 10 hours. 10. goddamn. hours.
    let result: Vec3 = Vec3.sum(this.chunksOrigin, offset);
    return result;
  }

  // Get block at world coords
  public getBlockAt(pos: Vec3): Block {
    let chunkCoords: Vec3 = this.getChunkCoords(pos);
    if(!this.isChunkInBounds(chunkCoords)) {
      return null;
    }

    let chunkIndex: number = this.getChunkIndexFromOffset(chunkCoords);
    let chunk: Chunk = this.chunks[chunkIndex];

    let posInChunkCoords: Vec3 = Vec3.difference(pos, chunk.getPosition())
    let blockIndex: number = chunk.getFlatIndex(posInChunkCoords);

    return chunk.getBlockFromIndex(blockIndex);
  }

  // Returns -1 if no solid block
  // Takes in world coordinates
  public getHighestSolidBlockY(pos: Vec3): number {
    let chunkCoords: Vec3 = this.getChunkCoords(pos);
    if(!this.isChunkInBounds(chunkCoords)) {
      return -1;
    }

    let chunkIndex: number = this.getChunkIndexFromOffset(chunkCoords);
    let chunk: Chunk = this.chunks[chunkIndex];

    let posInChunkCoords: Vec3 = Vec3.difference(pos, chunk.getPosition())
    posInChunkCoords.x = Math.floor(posInChunkCoords.x);
    posInChunkCoords.z = Math.floor(posInChunkCoords.z);
    posInChunkCoords.y = Math.floor(Chunk.chunkSize.y - 1);

    while(posInChunkCoords.y >= 0) {
      let blockIndex = chunk.getFlatIndex(posInChunkCoords);
      let block = chunk.getBlockFromIndex(blockIndex);

      if(block.isSolid())
        return posInChunkCoords.y + 1;
      
      posInChunkCoords.y--;
    }

    console.log("No solid blocks in this column");
    return -1;
  }

  // Called from chunk setBlock, pos must be in world coords
  public setBlock(pos: Vec3, blockType: BlockType) {
    let chunkCoords: Vec3 = this.getChunkCoords(pos);
    if(!this.isChunkInBounds(chunkCoords)) {
      console.log("Out of bounds")
      return;
    }

    this.dirty = true;

    let chunkIndex: number = this.getChunkIndexFromOffset(chunkCoords);
    let chunk: Chunk = this.chunks[chunkIndex];

    // CHunk has not been loaded yet
    if(chunk == null) {
      let arr = [pos, blockType];
      this.blocksToUpdate.push(arr);
      return;
    }

    let posInChunkCoords: Vec3 = Vec3.difference(pos, chunk.getPosition())
    chunk.setBlock(posInChunkCoords, blockType);
  }

  /* Highlighting and Block Placement */
  public placeBlock(): void {
    // TODO
  }

  /* Rendering Functions */ 
  // public updateChunks(pos: Vec3) {
  //   let newChunkOffset: Vec3 = this.getChunkCoords(pos);

  //   let n = this.chunksRowLen;
  //   if(this.chunksOrigin == null || !newChunkOffset.equals(this.chunksOrigin)) {    
  //       this.chunks = [];

  //       let x = newChunkOffset.x - Math.ceil((n - 1) / 2);
  //       let z = newChunkOffset.z + Math.floor((n - 1) / 2);
    
  //       for(let i = 0; i < n; i++) {
  //         for(let j = 0; j < n; j++) {
  //           let newX = x + i;
  //           let newZ = z - j;
    
  //           let chunk: Chunk = new Chunk(new Vec3([newX, 0, newZ]), this);
  //           WorldGen.generateChunk(chunk);
  //           this.chunks.push(chunk);
  //         }
  //       }
        
  //       this.chunksOrigin = newChunkOffset;
  //   } 
  // }

  // Why the heck does this not work.
  // New Chunks Offset is derived from current player position
  // New Chunks Origin is the new origin so that offset in the "middle"
  public updateChunksEfficient(pos: Vec3) {
    let newChunkOffset: Vec3 = this.getChunkCoords(pos);
    let newChunkOrigin: Vec3 = this.getOriginFromOffset(newChunkOffset);

    // No update unless player changes chunk pos
    if(this.chunksOrigin == null || !newChunkOrigin.equals(this.chunksOrigin)) {

      this.chunksOrigin = newChunkOrigin;

      let oldChunks = [];
      for(let i = 0; i < this.totalChunks; i++)
        oldChunks.push(this.chunks[i]);

      this.chunks = [];
      for(let i = 0; i < this.totalChunks; i++)
        this.chunks.push(null);

      // Preserve Old Chunks
      // Why is this breaking so hard
      for(let i = 0; i < this.totalChunks; i++) {
        let tempChunk: Chunk = oldChunks[i];

        if(tempChunk != null) {
          let offset: Vec3 = tempChunk.getOffset();
          if(this.isChunkInBounds(offset)) {
  
            let chunkIndex = this.getChunkIndexFromOffset(offset);
            this.chunks[chunkIndex] = tempChunk;
          }
        }
      }

      this.loadNullChunks();
      this.loadLeftoverBlocks();
      // console.log(this.chunks);
    }
  }

  // After all the chunks in updateChunks have been "preserved",
  // Remaining chunks are set to null. Find which offsets those
  // chunks should be placed at based on the indices which are
  // null and generate chunks there. 
  public loadNullChunks(): void {
    for(let i = 0; i < this.totalChunks; i++) {
      if(this.chunks[i] == null) {
        // Get where chunk at index i would be
        let offset: Vec3 = this.getChunkOffsetFromIndex(i);
        let chunk: Chunk = new Chunk(offset, this);

        // Generate Chunk
        WorldGen.generateChunk(chunk);
        this.chunks[i] = chunk;
      }
    }
  }

  /* Only call after updating all chunks */
  // Doesn't Work
  public loadLeftoverBlocks(): void {
    for(let i = 0; i < this.blocksToUpdate.length; i++) {
      let arr = this.blocksToUpdate[i];
      console.log(arr);
      this.setBlock(arr[0], arr[1]);
    }
    this.blocksToUpdate =  [];
  }

  // Must be called after *any* alterations to world state
  // ex. breaking or placing blocks
  public update(): void {

    let pos: Vec3 = this.player.getCamera().pos();
    this.updateChunksEfficient(pos);

    if(this.dirty) {
      this.chunks.forEach((chunk) => {
        // TODO: "Async" rendering, only update buffers of one VBO/VAO per frame
        chunk.update();
        this.addChunkAttributes(chunk);
      });
  
      this.renderPass.setIndexBufferData(this.indiciesFlat());
      this.renderPass.setAttribData("vertPosition", this.positionsFlat());
      this.renderPass.setAttribData("aNorm", this.normalsFlat());
      this.renderPass.setAttribData("vertTexCoord", this.uvsFlat());
      this.renderPass.updateDrawCount(this.indiciesFlat().length);

      // Reset Index Buffer based on new data
      this.renderPass.setupIndexBufferData();
      if(World.deleteChunksOnMove) {
        this.resetBuffers();
      }
      this.dirty = false;
    }
    this.renderPass.draw();
  }

  /* Rendering Methods */
  public resetBuffers(): void {
    this.currIndices = [];
    this.currNormals = [];
    this.currPositions = [];
    this.currUVs = [];
  }

  public positionsFlat(): Float32Array {
    return new Float32Array(this.currPositions);
  }

  public indiciesFlat(): Uint32Array {
    return new Uint32Array(this.currIndices);
  }

  public normalsFlat(): Float32Array {
    return new Float32Array(this.currNormals);
  }

  public uvsFlat(): Float32Array {
    return new Float32Array(this.currUVs);
  }

  public addChunkAttributes(chunk: Chunk): void {
    chunk.getPositions().forEach(pos => {
      this.currPositions.push(pos);
    });

    let length = this.currIndices.length;
    chunk.getIndices().forEach(index => {
        this.currIndices.push(length + index);
    });

    chunk.getNormals().forEach(normal => {
        this.currNormals.push(normal);
    });

    chunk.getUVs().forEach(uv => {
      this.currUVs.push(uv);
    });

    chunk.resetBuffers();
  }

  // Return flat array of camera position vector
  public cameraPosFlat() {
    return new Float32Array(this.player.getCamera().pos().xyz);
  }

  // Returns a render pass object with the coordinate
  // transformation matrices obtained from the gui camera
  public getChunkRenderer(): RenderPass {
    let gl = this.ctx;
    let chunkRenderer = new RenderPass(this.extVAO, gl, chunkVSText, chunkFSText);
    chunkRenderer.addTextureMap("atlas.png", chunkVSText, chunkFSText);

    // Set all attributes to empty arrays, will be updated once chunk's
    // on renderChunk() method is called
    chunkRenderer.setIndexBufferData(new Uint32Array([]));
    chunkRenderer.addAttribute("vertPosition", 4, this.ctx.FLOAT, false,
    4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array([]));
    chunkRenderer.addAttribute("aNorm", 4, this.ctx.FLOAT, false,
      4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array([]));
    chunkRenderer.addAttribute("vertTexCoord", 2, this.ctx.FLOAT, false,
      2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array([]));

    chunkRenderer.addUniform("cameraPosition",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform3fv(loc, this.cameraPosFlat());
    });
    chunkRenderer.addUniform("lightPosition",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPos.xyzw);
    });
    chunkRenderer.addUniform("mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
    });
    chunkRenderer.addUniform("mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.player.projMatrix().all()));
    });
    chunkRenderer.addUniform("mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.player.viewMatrix().all()));
    });

    chunkRenderer.setDrawData(this.ctx.TRIANGLES, 0, this.ctx.UNSIGNED_INT, 0);
    chunkRenderer.setup();

    return chunkRenderer;
  }  
}