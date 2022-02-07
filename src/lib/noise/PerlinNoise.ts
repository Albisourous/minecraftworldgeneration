import { PRNG } from "./PRNG.js";

// Author: Stefan Gustavson, 2003-2005
// Contact: stefan.gustavson@liu.se
//
// This code was GPL licensed until February 2011.
// As the original author of this code, I hereby
// release it into the public domain.
// Please feel free to use it for whatever you want.
// Credit is appreciated where appropriate, and I also
// appreciate being told where this code finds any use,
// but you may do as you like.

/*
 * This implementation is "Improved Noise" as presented by
 * Ken Perlin at Siggraph 2002. The 3D function is a direct port
 * of his Java reference code which was once publicly available
 * on www.noisemachine.com (although I cleaned it up, made it
 * faster and made the code more readable), but the 1D, 2D and
 * 4D functions were implemented from scratch by me.
 *
 * This is a backport to C of my improved noise class in C++
 * which was included in the Aqsis renderer project.
 * It is highly reusable without source code modifications.
 *
 */

/**
 * Adapted by Govind Joshi for TypeScript
 */

export class PerlinNoise {

    // This is the new and improved, C(2) continuous interpolant
    public static fade(t: number): number {
       return (t * t * t * (t * (t * 6 - 15) + 10)); 
    }

    public static fastFloor(x: number): number {
        return (Math.trunc(x) < x) ? Math.trunc(x) : (Math.trunc(x) - 1);
    }

    public static lerp(t: number, a: number, b: number): number {
        return (a + t * (b - a));
    }

    /*
    * Permutation table. This is just a random jumble of all numbers 0-255,
    * repeated twice to avoid wrapping the index at 255 for each lookup.
    * This needs to be exactly the same for all instances on all platforms,
    * so it's easiest to just keep it as static explicit data.
    * This also removes the need for any initialisation of this class.
    *
    * Note that making this an int[] instead of a char[] might make the
    * code run faster on platforms with a high penalty for unaligned single
    * byte addressing. Intel x86 is generally single-byte-friendly, but
    * some other CPUs are faster with 4-aligned reads.
    * However, a char[] is smaller, which avoids cache trashing, and that
    * is probably the most important aspect on most architectures.
    * This array is accessed a *lot* by the noise functions.
    * A vector-valued noise over 3D accesses it 96 times, and a
    * float-valued 4D noise 64 times. We want this to fit in the cache!
    */
    public static perm: Uint8Array = new Uint8Array([151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
    151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]);

    /*
    * Helper functions to compute gradients-dot-residualvectors (1D to 4D)
    * Note that these generate gradients of more than unit length. To make
    * a close match with the value range of classic Perlin noise, the final
    * noise values need to be rescaled. To match the RenderMan noise in a
    * statistical sense, the approximate scaling values (empirically
    * determined from test renderings) are:
    * 1D noise needs rescaling with 0.188
    * 2D noise needs rescaling with 0.507
    * 3D noise needs rescaling with 0.936
    * 4D noise needs rescaling with 0.87
    * Note that these noise functions are the most practical and useful
    * signed version of Perlin noise. To return values according to the
    * RenderMan specification from the SL noise() and pnoise() functions,
    * the noise values need to be scaled and offset to [0,1], like this:
    * float SLnoise = (noise3(x,y,z) + 1.0) * 0.5;
    */

    public static grad1(hash: number, x: number) {
        let h = hash & 15;
        let grad = 1.0 + (h & 7);       // Gradient value 1.0, 2.0, ..., 8.0
        if(h & 8) 
            grad = -grad;               // and a random sign for the gradient
        return ( grad * x );            // Multiply the gradient with the distance
    }

    public static grad2(hash: number, x: number, y: number) {
        let h = hash & 7;       // Convert low 3 bits of hash code
        let u = h < 4 ? x : y;  // into 8 simple gradient directions,
        let v = h < 4 ? y : x;  // and compute the dot product with (x,y).
        return ((h & 1) ? -u : u) + ((h & 2) ? -2.0*v : 2.0*v);
    }

    public static grad3(hash: number, x: number, y: number, z: number) {
        let h = hash & 15;      // Convert low 4 bits of hash code into 12 simple
        let u = h < 8 ? x : y;    // gradient directions, and compute dot product.
        let v = h < 4 ? y : h == 12 || h == 14 ? x : z; // Fix repeats at h = 12 to 15
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    public static grad4(hash: number, x: number, y: number, z: number, t: number) {
        let h = hash & 31;      // Convert low 5 bits of hash code into 32 simple
        let u = h < 24 ? x : y; // gradient directions, and compute dot product.
        let v = h < 16 ? y : z;
        let w = h < 8 ? z : t;
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v) + ((h & 4) ? -w : w);
    }

    //---------------------------------------------------------------------
    /** 1D float Perlin noise, SL "noise()"
     */
    public static noise1(x: number): number {
        let ix0: number, // ints
            ix1: number, 
            fx0: number, // floats
            fx1: number, 
            s: number, 
            n0: number, 
            n1: number;

        ix0 = this.fastFloor(x);    // Integer part of x
        fx0 = x - ix0;              // Fractional part of x
        fx1 = fx0 - 1.0;
        ix1 = ( ix0+1 ) & 0xff;
        ix0 = ix0 & 0xff;            // Wrap to 0..255

        s = this.fade(fx0);

        n0 = this.grad1(this.perm[ix0], fx0 );
        n1 = this.grad1(this.perm[ix1], fx1);
        return 0.188 * (this.lerp( s, n0, n1));
    }

    //---------------------------------------------------------------------
    /** 1D float Perlin periodic noise, SL "pnoise()"
     */
     public static pnoise1(x: number, px: number): number {
        let ix0: number, // ints
            ix1: number, 
            fx0: number, // floats
            fx1: number, 
            s: number, 
            n0: number, 
            n1: number;

        ix0 = this.fastFloor(x);    // Integer part of x
        fx0 = x - ix0;              // Fractional part of x
        fx1 = fx0 - 1.0;
        ix1 = (( ix0 + 1 ) % px) & 0xff; // Wrap to 0..px-1 *and* wrap to 0..255
        ix0 = ( ix0 % px ) & 0xff;      // (because px might be greater than 256)

        s = this.fade(fx0);

        n0 = this.grad1(this.perm[ix0], fx0 );
        n1 = this.grad1(this.perm[ix1], fx1);
        return 0.188 * (this.lerp( s, n0, n1));
    }

    //---------------------------------------------------------------------
    /** 2D float Perlin noise.
     */
    public static noise2(x: number, y: number) {
        let prng = new PRNG(Math.pow(x, y) * (x * y));
        x = x / 16;
        y = y / 16;

        let ix0: number, // ints
        iy0: number,
        ix1: number,
        iy1: number,
        fx0: number, // floats
        fy0: number,
        fx1: number, 
        fy1: number,
        s: number, 
        t: number, 
        nx0: number, 
        nx1: number,
        n0: number, 
        n1: number;

        ix0 = this.fastFloor(x);    // Integer part of x
        iy0 = this.fastFloor(y);    // Integer part of y
        fx0 = x - ix0;              // Fractional part of x
        fy0 = y - iy0;              // Fractional part of y
        fx1 = fx0 - 1.0;
        fy1 = fy0 - 1.0;
        ix1 = (ix0 + 1) & 0xff;     // Wrap to 0..255
        iy1 = (iy0 + 1) & 0xff;
        ix0 = ix0 & 0xff;
        iy0 = iy0 & 0xff;
        
        t = this.fade(fy0);
        s = this.fade(fx0);

        nx0 = this.grad2(this.perm[ix0 + this.perm[iy0]], fx0, fy0);
        nx1 = this.grad2(this.perm[ix0 + this.perm[iy1]], fx0, fy1);
        n0 = this.lerp(t, nx0, nx1);

        nx0 = this.grad2(this.perm[ix1 + this.perm[iy0]], fx1, fy0);
        nx1 = this.grad2(this.perm[ix1 + this.perm[iy1]], fx1, fy1);
        n1 = this.lerp(t, nx0, nx1);

        return 0.507 * ( this.lerp( s, n0, n1 ) );
    }

    //---------------------------------------------------------------------
    /** 2D float Perlin periodic noise.
     */
     public static pnoise2(x: number, y: number, px: number, py: number) {
        let ix0: number, // ints
        iy0: number,
        ix1: number,
        iy1: number,
        fx0: number, // floats
        fy0: number,
        fx1: number, 
        fy1: number,
        s: number, 
        t: number, 
        nx0: number, 
        nx1: number,
        n0: number, 
        n1: number;

        ix0 = this.fastFloor(x);    // Integer part of x
        iy0 = this.fastFloor(y);    // Integer part of y
        fx0 = x - ix0;              // Fractional part of x
        fy0 = y - iy0;              // Fractional part of y
        fx1 = fx0 - 1.0;
        fy1 = fy0 - 1.0;
        ix1 = (( ix0 + 1 ) % px) & 0xff;  // Wrap to 0..px-1 and wrap to 0..255
        iy1 = (( iy0 + 1 ) % py) & 0xff;  // Wrap to 0..py-1 and wrap to 0..255
        ix0 = ix0 & 0xff;
        iy0 = iy0 & 0xff;
        
        t = this.fade(fy0);
        s = this.fade(fx0);

        nx0 = this.grad2(this.perm[ix0 + this.perm[iy0]], fx0, fy0);
        nx1 = this.grad2(this.perm[ix0 + this.perm[iy1]], fx0, fy1);
        n0 = this.lerp(t, nx0, nx1);

        nx0 = this.grad2(this.perm[ix1 + this.perm[iy0]], fx1, fy0);
        nx1 = this.grad2(this.perm[ix1 + this.perm[iy1]], fx1, fy1);
        n1 = this.lerp(t, nx0, nx1);

        return 0.507 * ( this.lerp( s, n0, n1 ) );
    }

    //---------------------------------------------------------------------
    /** 3D float Perlin noise.
     */
     public static noise3(x: number, y: number, z: number) {
        let ix0, iy0, ix1, iy1, iz0, iz1;   // ints
        let fx0, fy0, fz0, fx1, fy1, fz1;   // floats
        let s, t, r;
        let nxy0, nxy1, nx0, nx1, n0, n1;

        ix0 = this.fastFloor( x );  // Integer part of x
        iy0 = this.fastFloor( y );  // Integer part of y
        iz0 = this.fastFloor( z );  // Integer part of z
        fx0 = x - ix0;              // Fractional part of x
        fy0 = y - iy0;              // Fractional part of y
        fz0 = z - iz0;              // Fractional part of z
        fx1 = fx0 - 1.0;
        fy1 = fy0 - 1.0;
        fz1 = fz0 - 1.0;
        ix1 = ( ix0 + 1 ) & 0xff; // Wrap to 0..255
        iy1 = ( iy0 + 1 ) & 0xff;
        iz1 = ( iz0 + 1 ) & 0xff;
        ix0 = ix0 & 0xff;
        iy0 = iy0 & 0xff;
        iz0 = iz0 & 0xff;
        
        r = this.fade( fz0 );
        t = this.fade( fy0 );
        s = this.fade( fx0 );

        nxy0 = this.grad3(this.perm[ix0 + this.perm[iy0 + this.perm[iz0]]], fx0, fy0, fz0);
        nxy1 = this.grad3(this.perm[ix0 + this.perm[iy0 + this.perm[iz1]]], fx0, fy0, fz1);
        nx0 = this.lerp( r, nxy0, nxy1 );

        nxy0 = this.grad3(this.perm[ix0 + this.perm[iy1 + this.perm[iz0]]], fx0, fy1, fz0);
        nxy1 = this.grad3(this.perm[ix0 + this.perm[iy1 + this.perm[iz1]]], fx0, fy1, fz1);
        nx1 = this.lerp( r, nxy0, nxy1 );

        n0 = this.lerp( t, nx0, nx1 );

        nxy0 = this.grad3(this.perm[ix1 + this.perm[iy0 + this.perm[iz0]]], fx1, fy0, fz0);
        nxy1 = this.grad3(this.perm[ix1 + this.perm[iy0 + this.perm[iz1]]], fx1, fy0, fz1);
        nx0 = this.lerp( r, nxy0, nxy1 );

        nxy0 = this.grad3(this.perm[ix1 + this.perm[iy1 + this.perm[iz0]]], fx1, fy1, fz0);
        nxy1 = this.grad3(this.perm[ix1 + this.perm[iy1 + this.perm[iz1]]], fx1, fy1, fz1);
        nx1 = this.lerp( r, nxy0, nxy1 );

        n1 = this.lerp( t, nx0, nx1 );
        
        return 0.936 * ( this.lerp( s, n0, n1 ) );
    }

    //---------------------------------------------------------------------
    /** 3D float Perlin periodic noise.
     */
    //---------------------------------------------------------------------
    /** 3D float Perlin noise.
     */
     public static pnoise3(x: number, y: number, z: number,
                        px: number, py: number, pz: number) {
        let ix0, iy0, ix1, iy1, iz0, iz1;   // ints
        let fx0, fy0, fz0, fx1, fy1, fz1;   // floats
        let s, t, r;
        let nxy0, nxy1, nx0, nx1, n0, n1;

        ix0 = this.fastFloor( x );  // Integer part of x
        iy0 = this.fastFloor( y );  // Integer part of y
        iz0 = this.fastFloor( z );  // Integer part of z
        fx0 = x - ix0;              // Fractional part of x
        fy0 = y - iy0;              // Fractional part of y
        fz0 = z - iz0;              // Fractional part of z
        fx1 = fx0 - 1.0;
        fy1 = fy0 - 1.0;
        fz1 = fz0 - 1.0;
        ix1 = (( ix0 + 1 ) % px ) & 0xff; // Wrap to 0..px-1 and wrap to 0..255
        iy1 = (( iy0 + 1 ) % py ) & 0xff; // Wrap to 0..py-1 and wrap to 0..255
        iz1 = (( iz0 + 1 ) % pz ) & 0xff; // Wrap to 0..pz-1 and wrap to 0..255
        ix0 = ix0 & 0xff;
        iy0 = iy0 & 0xff;
        iz0 = iz0 & 0xff;
        
        r = this.fade( fz0 );
        t = this.fade( fy0 );
        s = this.fade( fx0 );

        nxy0 = this.grad3(this.perm[ix0 + this.perm[iy0 + this.perm[iz0]]], fx0, fy0, fz0);
        nxy1 = this.grad3(this.perm[ix0 + this.perm[iy0 + this.perm[iz1]]], fx0, fy0, fz1);
        nx0 = this.lerp( r, nxy0, nxy1 );

        nxy0 = this.grad3(this.perm[ix0 + this.perm[iy1 + this.perm[iz0]]], fx0, fy1, fz0);
        nxy1 = this.grad3(this.perm[ix0 + this.perm[iy1 + this.perm[iz1]]], fx0, fy1, fz1);
        nx1 = this.lerp( r, nxy0, nxy1 );

        n0 = this.lerp( t, nx0, nx1 );

        nxy0 = this.grad3(this.perm[ix1 + this.perm[iy0 + this.perm[iz0]]], fx1, fy0, fz0);
        nxy1 = this.grad3(this.perm[ix1 + this.perm[iy0 + this.perm[iz1]]], fx1, fy0, fz1);
        nx0 = this.lerp( r, nxy0, nxy1 );

        nxy0 = this.grad3(this.perm[ix1 + this.perm[iy1 + this.perm[iz0]]], fx1, fy1, fz0);
        nxy1 = this.grad3(this.perm[ix1 + this.perm[iy1 + this.perm[iz1]]], fx1, fy1, fz1);
        nx1 = this.lerp( r, nxy0, nxy1 );

        n1 = this.lerp( t, nx0, nx1 );
        
        return 0.936 * ( this.lerp( s, n0, n1 ) );
    }

    /* 4D Not Implemented, not needed for my project */    
}