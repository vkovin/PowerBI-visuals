//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    vector.ts - helper functions for working with vectors (of dataFrame).
//      - the vector can be a Float32Array or a number[].
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module vector
{
    /** return the number of entries that are true (or == 1). */
    export function countOn(vector: any)
    {
        var count = 0;

        for (var i = 0; i < vector.length; i++)
        {
            if (vector[i])
            {
                count++;
            }
        }

        return count;
    }

    /** return the number of entries that are false (or == 0). */
    export function countOff(vector: any)
    {
        var count = 0;

        for (var i = 0; i < vector.length; i++)
        {
            if (! vector[i])
            {
                count++;
            }
        }

        return count;
    }

    /** set each entry to 0. */
    export function clear(vector: any)
    {
        for (var i = 0; i < vector.length; i++)
        {
            vector[i] = 0;
        }
    }

     /** copy contents of source to dest. */
    export function copy(dest: any, source: any)
    {
        for (var i = 0; i < dest.length; i++)
        {
            dest[i] = source[i];
        }
    }

    /** compare contents of vector to vector2. */
    export function compare(vector: any, vector2: any)
    {
        var isDiff = (vector.length != vector2.length);

        if (!isDiff)
        {
            for (var i = 0; i < vector.length; i++)
            {
                if (vector[i] != vector2[i])
                {
                    isDiff = true;
                    break;
                }
            }
        }

        return isDiff;
    }
}
 