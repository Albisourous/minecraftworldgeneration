import { Camera } from "../../lib/webglutils/Camera.js";
import { Mat4, Vec3 } from "../../lib/TSM.js";
import { Chunk } from "./Chunk.js";
import { Block } from "./Block.js";
import { World } from "./World.js";

/**
 * Handles Mouse and Button events along with
 * the the camera.
 */

export class Player {

    public world: World;

    private static readonly playerHeight: number = 2;
    private static eyelevel: number = Chunk.chunkSize.y + Player.playerHeight;
    private static gravity: number = -1;


    private static readonly wasdScale: number = 0.1;
    private static readonly rotationSpeed: number = 0.5;
    private static readonly creativeSpeed: number = 0.05;
    private static readonly zoomSpeed: number = 0.5;
    private static readonly rollSpeed: number = 0.1;
    private static readonly panSpeed: number = 0.1;
    private static readonly jumpSpeed: number = 0.01;

    private keystate = {
        "KeyW": false,
        "KeyA": false,
        "KeyS": false,
        "KeyD": false,
        "Space": false,
        "ControlLeft": false,
        "ShiftLeft": false,
        "ArrowUp": false,
        "ArrowDown": false
    };

    private camera: Camera;

    // Camera Rotation and Movement Vars
    private fps: boolean;
    private pointerLock: boolean = false;
    private yaw: number = 0;
    private pitch: number = 0;
    private creative: boolean = false;
    private yPos: number = 0;
    private yVel: number = 0;
    private jumping: boolean = false;

    // Mouse Drag Variables
    private dragging: boolean;
    private prevX: number;
    private prevY: number;
    public hoverX: number = 0;
    public hoverY: number = 0;


    // Viewport Height and Width
    // For resetting camera aspect
    private height: number;
    private width: number;

    /**
     *
     * @param canvas required to get the width and height of the canvas
     */
    constructor(canvas: HTMLCanvasElement, world: World) {
        this.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        this.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        this.world = world;

        this.prevX = 0;
        this.prevY = 0;

        this.fps = true;
        this.dragging = false;
        this.camera = new Camera(
            new Vec3([0, Player.eyelevel, 0]),
            new Vec3([0, Player.eyelevel, 1]),
            new Vec3([0, 1, 0]),
            45,
            canvas.width / canvas.height,
            0.1,
            1000.0
        );

        this.registerEventListeners(canvas);
    }

    public getCamera(): Camera { return this.camera; }

    /** Returns the view matrix of the camera */
    public viewMatrix(): Mat4 { return this.camera.viewMatrix(); }

    /** Returns the projection matrix of the camera */
    public projMatrix(): Mat4 { return this.camera.projMatrix(); }

    public playerTick(dT: number): void {
        let keystate = this.keystate;
        let start: Vec3 = this.camera.pos();
        let deltaPos: Vec3 = new Vec3();
        let tempPos: Vec3 = new Vec3();

        if (!this.creative) {
            let speed: number = keystate.ShiftLeft ? Player.wasdScale * Player.playerHeight : Player.wasdScale;
            let start  = this.camera.pos()
            // If w and s are pressed then they should cancel out 
            if (keystate.KeyW != keystate.KeyS) {
                tempPos = keystate.KeyW ? this.camera.forward().negate() : this.camera.forward();
                deltaPos.add(tempPos.scale(speed));
            }
            if (keystate.KeyA != keystate.KeyD) {
                tempPos = keystate.KeyA ? this.camera.right().negate() : this.camera.right()
                deltaPos.add(tempPos.scale(speed));
            }

            let end: Vec3 = deltaPos.add(start);

            // for now
            // end.y = Player.eyelevel;
            // end.y = end.y - Player.playerHeight;
            let highestY = this.world.getHighestSolidBlockY(end);

            if(highestY != -1) {
                end.y = highestY + Player.playerHeight * Player.playerHeight;
            }
            else{
                end.y = Player.eyelevel;
            }

            let pos = this.yPos;
            let vel = this.yVel;

            if (pos == 0 && keystate.Space != keystate.ControlLeft) { 
                if(keystate.Space) {
                    pos = 1;
                    vel = -Player.jumpSpeed;
                }
                if(keystate.ControlLeft) {
                    pos = -1;
                    vel = Player.jumpSpeed;
                }
            }
            if(pos != 0) {
                pos += vel;
            }
            else {
                this.yPos = 0;
                this.yVel = 0;
            }

            end.y += pos;
            this.camera.setPos(end);
        } else {
            let speed = .5;
            if (keystate.KeyW) { this.camera.offset(this.camera.forward().negate(), speed, true); }
            if (keystate.KeyA) { this.camera.offset(this.camera.right().negate(), speed, true); }
            if (keystate.KeyS) { this.camera.offset(this.camera.forward(), speed, true); }
            if (keystate.KeyD) { this.camera.offset(this.camera.right(), speed, true); }
            if (keystate.Space || keystate.ArrowUp) { this.camera.offset(new Vec3([0, 1, 0]), speed, true); }
            if (keystate.ControlLeft || keystate.ArrowDown) { this.camera.offset(new Vec3([0, 1, 0]).negate(), speed, true); }
        }

    }

    public toRadians(angle: number): number { return angle * (Math.PI / 180); }

    public dragStart(mouse: MouseEvent): void {
        this.dragging = true;
        this.prevX = mouse.screenX;
        this.prevY = mouse.screenY;
    }

    public dragEnd(mouse: MouseEvent): void {
        this.dragging = false;
        this.prevX = 0;
        this.prevY = 0;
    }

    public drag(mouse: MouseEvent): void {
        if (this.pointerLock) { this.dragStart(mouse); }

        if (this.dragging) {
            let dx = (mouse.movementX) || (mouse.screenX - this.prevX);
            let dy = (mouse.movementY) || (mouse.screenY - this.prevY);
            this.prevX = mouse.screenX;
            this.prevY = mouse.screenY;

            if (dx === 0 && dy === 0) { return; }

            if (mouse.buttons == 1 || this.pointerLock) {
                if (this.fps) {
                    if (!this.creative) {
                        dx *= Player.rotationSpeed;
                        dy *= Player.rotationSpeed;
                        this.yaw = dx;
                        this.pitch = dy;

                        if (this.yaw < 0.0) { this.yaw += 360.0; }
                        if (this.yaw > 360.0) { this.yaw -= 360.0; }
                        if (this.pitch > 89.0) { this.pitch = 89.0; }
                        if (this.pitch < -89.0) { this.pitch = -89.0; }

                        let radYaw = this.toRadians(this.yaw);
                        let radPitch = this.toRadians(this.pitch);

                        if (radYaw === 0 && radPitch === 0) { return; }
                        this.camera.yaw(radYaw, true);
                        this.camera.pitch(radPitch, true);
                    }
                    else {
                        const mouseDir: Vec3 = this.camera.right();
                        mouseDir.scale(-dx);
                        mouseDir.add(this.camera.up().scale(dy));
                        mouseDir.normalize();
                        let rotAxis: Vec3 = Vec3.cross(this.camera.forward(), mouseDir);
                        rotAxis = rotAxis.normalize();
                        this.camera.rotate(rotAxis, Player.creativeSpeed);
                    }
                }
            }
            if (mouse.buttons == 2) {
                // Do stuff
            }
            if (this.pointerLock) { this.dragEnd(mouse); }
        }
    }

    /* JavaScript doesn't have a isKeyDown function,
       so the best alternative is to save keystates.
       these next few functions do just that; they
       set states to true and false so that playerTick
       can move the player accordingly 
    */

    /**
     * Callback function for a key press event
     * @param key
     * 
     * Set and Save Keystates
     */
    public onKeydown(key: KeyboardEvent): void {
        switch (key.code) {
            case "KeyC": {
                this.creative = !this.creative;
                console.log("switching creative/real")
                break;
            }
            case "KeyP": {
                this.pointerLock = !this.pointerLock;
                document.exitPointerLock();
                console.log("switching pointer")
                break;
            }
            case "KeyW": { this.keystate.KeyW = true; break; }
            case "KeyA": { this.keystate.KeyA = true; break; }
            case "KeyS": { this.keystate.KeyS = true; break; }
            case "KeyD": { this.keystate.KeyD = true; break; }
            case "Space": { this.keystate.Space = true; break; }
            case "ControlLeft": { this.keystate.ControlLeft = true; break; }
            case "ShiftLeft": { this.keystate.ShiftLeft = true; break; }
            case "ArrowUp": { this.keystate.ArrowUp = true; break; }
            case "ArrowDown": { this.keystate.ArrowDown = true; break; }
            default: {
                console.log("Key : '", key.code, "' was pressed.");
                break;
            }
        }
    }

    public onKeyup(key: KeyboardEvent): void {
        switch (key.code) {
            case "KeyW": { this.keystate.KeyW = false; break; }
            case "KeyA": { this.keystate.KeyA = false; break; }
            case "KeyS": { this.keystate.KeyS = false; break; }
            case "KeyD": { this.keystate.KeyD = false; break; }
            case "Space": { this.keystate.Space = false; break; }
            case "ControlLeft": { this.keystate.ControlLeft = false; break; }
            case "ShiftLeft": { this.keystate.ShiftLeft = false; break; }
            case "ArrowUp": { this.keystate.ArrowUp = false; break; }
            case "ArrowDown": { this.keystate.ArrowDown = false; break; }
            default: {
                console.log("Key : '", key.code, "' was unpressed.");
                break;
            }
        }
    }

    /**
     * Registers all event listeners for the Player
     * @param canvas The canvas being used
     */
    private registerEventListeners(canvas: HTMLCanvasElement): void {
        /* Event listener for key controls */
        window.addEventListener("keydown", (key: KeyboardEvent) => this.onKeydown(key));

        window.addEventListener("keyup", (key: KeyboardEvent) => this.onKeyup(key));

        /* Event listener for mouse controls */
        canvas.addEventListener("mousedown", (mouse: MouseEvent) => {
            this.dragStart(mouse);
            if (this.pointerLock) { canvas.requestPointerLock(); }
        });

        canvas.addEventListener("mousemove", (mouse: MouseEvent) => this.drag(mouse));

        canvas.addEventListener("mouseup", (mouse: MouseEvent) => this.dragEnd(mouse));

        /* Event listener to stop the right click menu */
        canvas.addEventListener("contextmenu", (event: any) => event.preventDefault());

        canvas.addEventListener("resize", () => {
            this.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            this.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            this.camera.setAspect(this.width / this.height);
        });
    }
}
