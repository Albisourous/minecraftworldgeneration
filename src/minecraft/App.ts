import { Debugger } from "../lib/webglutils/Debugging.js";
import {
  CanvasAnimation,
  WebGLUtilities,
} from "../lib/webglutils/CanvasAnimation.js";
import { World } from "./World/World.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import {
  crosshairFSText,
  crosshairVSText
} from "./Shaders.js"

export class App extends CanvasAnimation {

  private readonly oneDay: number = 60.0;
  private readonly numberOfStarts: number = 60;
  private stars = [];
  private startColor = new Vec4([134.47265625, 205.1953125, 255, 1.0]);
  private endColor = new Vec4([0, 0, 0, 1.0]); //[38, 48, 73, 1.0]
  private firstHalf = true;
  private generateStars = false;
  private ticker: number = 0.0;
  private w: number = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  private h: number = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  private millis: number;

  /* World Voxels Render Pass Info */
  private world: World;
  public static playerInitPos: Vec3 = new Vec3([0, 2.5, 0]);

  /* Crosshair */

  /* Global Rendering Info */
  private lightPosition: Vec4;
  private backgroundColor: Vec4;

  private canvas2d: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.canvas2d = document.getElementById("glCanvas") as HTMLCanvasElement;
    this.ctx = Debugger.makeDebugContext(this.ctx);
    this.lightPosition = new Vec4([-10, 100, -10, 1]);
    //134.47265625, 205.1953125, 255
    //this.backgroundColor = new Vec4([0.52734375, 0.8046875, 1, 1.0]);
    this.backgroundColor = new Vec4([0.52734375, 0.8046875, 1, 1.0]);
    this.world = new World(this.canvas2d, this.lightPosition, this.extVAO, this.ctx);
    this.millis = new Date().getTime();
  }

  public reset() { this.world = new World(this.canvas2d, this.lightPosition, this.extVAO, this.ctx); }

  public draw(): void {
    let curr = new Date().getTime();
    let deltaT = curr - this.millis;
    this.millis = curr;
    deltaT /= 1000;

    this.getDayNight(deltaT);
    this.drawBackground();

    // if (this.generateStars) {
    //   this.makeStars();
    // }

    this.w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    this.h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    this.drawScene(0, 0, this.w, this.h);
    this.world.getPlayer().playerTick(deltaT);
  }

  // private makeStars(): void {
  //   const gl: WebGLRenderingContext = this.ctx;

  //   for (let i = 0; i < this.numberOfStarts; i++) {

  //   }
  // }

  private drawBackground(): void {
    const gl: WebGLRenderingContext = this.ctx;
    const bg: Vec4 = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
  }


  private getDayNight(dt): void {
    this.ticker += dt;
    // let time = this.ticker;
    // //time /= 1000;
    //let value:number = (this.ticker % this.oneDay) / this.oneDay;

    let value: number = this.ticker / this.oneDay;
    //console.log(value);

    let start = this.startColor;
    let end = this.endColor;

    let dx = (value * ((end.x - start.x)));
    let dy = (value * ((end.y - start.y)));
    let dz = (value * ((end.z - start.z)));


    let curr: Vec4 = new Vec4();

    if (this.firstHalf) {
      curr.x = (start.x + dx);
      curr.y = (start.y + dy);
      curr.z = (start.z + dz);
      if (value > .5) {
        this.generateStars = true;
      }
      else {
        this.generateStars = false;
      }
    }
    if (!this.firstHalf) {
      curr.x = (end.x - dx);
      curr.y = (end.y - dy);
      curr.z = (end.z - dz);
      if (value < .5) {
        this.generateStars = true;
      }
      else {
        this.generateStars = false;
      }
    }
    curr.w = 1.0;
    if (this.ticker >= this.oneDay) {
      this.ticker = 0;
      this.firstHalf = !this.firstHalf;
      console.log("POG");
    }
    else {
      this.backgroundColor = this.scaleRgb(curr);
    }
  }

  private hexToRgb(hex): Vec4 {
    let value = parseInt(hex, 16);
    let color = new Vec4();
    color.x = (value >> 16) & 255;
    color.y = (value >> 8) & 255;
    color.z = value & 255;
    color.w = 1.0;
    return this.scaleRgb(color);
  }

  private scaleRgb(vec): Vec4 {
    let scaled = new Vec4();
    scaled.x = vec.x / 255;
    scaled.y = vec.y / 255;
    scaled.z = vec.z / 255;
    scaled.w = 1;
    return scaled;
  }

  private drawScene(x: number, y: number, width: number, height: number): void {
    const gl: WebGLRenderingContext = this.ctx;
    gl.viewport(x, y, width, height);
    this.world.update();
  }
}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  const canvasAnimation: App = new App(canvas);
  canvasAnimation.start();
  let audio = new Audio();
  audio.loop = true;
  audio.autoplay = true;
  audio.crossOrigin = "anonymous";
  audio.src = "https://www.cs.utexas.edu/~as89652/background.mp3";
  audio.load();
  audio.play();
};


