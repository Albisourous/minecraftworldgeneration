// NOTICE 2020-04-18
// Please see the comments below about why this is not a great PRNG.

// Read summary by @bryc here:
// https://github.com/bryc/code/blob/master/jshash/PRNGs.md

// Have a look at js-arbit which uses Alea:
// https://github.com/blixt/js-arbit

/**
 * Creates a pseudo-random value generator. The seed must be an integer.
 *
 * Uses an optimized version of the Park-Miller PRNG.
 * http://www.firstpr.com.au/dsp/rand31/
 */

export class PRNG {

    private _seed: number;

    constructor(seed: number) {
        this._seed = seed % 2147483647;
        if (this._seed <= 0) this._seed += 2147483646;
    }
      
    /**
     * Returns a pseudo-random value between 1 and 2^32 - 2.
     */
    public next(): number {
        return this._seed = this._seed * 16807 % 2147483647;
    };
    
    
    /**
     * Returns a pseudo-random floating point number in range [0, 1).
     */
    public nextFloat(): number {
        // We know that result of next() will be 1 to 2147483646 (inclusive).
        return (this.next() - 1) / 2147483646;
    };
}