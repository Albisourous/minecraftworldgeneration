import { Vec2 } from "../tsm/Vec2.js"
import { Vec3 } from "../tsm/Vec3.js"
import { PRNG } from "./PRNG.js";
import { Chunk } from "../../minecraft/World/Chunk.js";
import "./PRNG.js"

export class GovindNoise {
    private static topLeft: Vec2 = new Vec2([0, 1]);
    private static topRight: Vec2 = new Vec2([1, 1]);
    private static bottomRight: Vec2 = new Vec2([1, 0]);
    private static bottomLeft: Vec2 = new Vec2([0, 0]);

    // Return noise value, x and z between 0 and 1
    public static govindNoise(x: number, z: number, worldPos: Vec3): number {
        let point: Vec2 = new Vec2([x / Chunk.chunkSize.x, z / Chunk.chunkSize.z]);
        let u = point.x;
        let v = point.y;

        let rng = new PRNG(worldPos.x * worldPos.y);

        let vec1: Vec2 = new Vec2([rng.nextFloat(), rng.nextFloat()]);
        let vec2: Vec2 = new Vec2([rng.nextFloat(), rng.nextFloat()]);
        let vec3: Vec2 = new Vec2([rng.nextFloat(), rng.nextFloat()]);
        let vec4: Vec2 = new Vec2([rng.nextFloat(), rng.nextFloat()]);

        let _vec1: Vec2 = Vec2.difference(point, this.topLeft);
        let _vec2: Vec2 = Vec2.difference(point, this.topRight);
        let _vec3: Vec2 = Vec2.difference(point, this.bottomRight);
        let _vec4: Vec2 = Vec2.difference(point, this.bottomLeft);

        let a = Vec2.dot(vec1, _vec1);
        let b = Vec2.dot(vec2, _vec2);
        let c = Vec2.dot(vec3, _vec3);
        let d = Vec2.dot(vec4, _vec4);

        let result = (1 - v) * ((1 - u) * a + (u * b))
                    + v * ((1 - u) * d + (u * c));
        return result;
    }
}