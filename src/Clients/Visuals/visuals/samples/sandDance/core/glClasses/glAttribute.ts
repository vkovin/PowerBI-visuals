//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    glAttribute.ts - small class to manage a webGL attribute.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module glUtils
{
    export class GlAttributeClass
    {
        _gl: any;
        _program: any;
        _attrLoc: any;
       _glBuffers: any[];
        _sizeInFloats: number;
        _array: Float32Array;       //  number[];
        _nameInShader: string;
        _isByte: boolean;
        _normalizeOnGpu: boolean;
        _isVertexCommon: boolean;
        _isSingleBuffer: boolean;
        _glInst: any;
        _drawInfos: beachParty.DrawInfo[];

        constructor(gl: any, glInst: any, program: any, nameInShader: string, sizeInFloats: number,
            isByte?: boolean, normalizeOnGpu?: boolean, isVertexCommon = true, isSingleBuffer?: boolean)
        {
            this._gl = gl;
            this._glInst = glInst;
            this._program = program;
            this._sizeInFloats = sizeInFloats;
            this._nameInShader = nameInShader;
            this._isByte = isByte;
            this._normalizeOnGpu = normalizeOnGpu;

            this._isVertexCommon = isVertexCommon;
            this._array = null;
            this._isSingleBuffer = isSingleBuffer;

            var attrLoc = gl.getAttribLocation(program, nameInShader);
            this._attrLoc = attrLoc;
            this._glBuffers = [];

            if (attrLoc == -1)
            {
                //----for debugging/development purposes, ignore this error ----
                if (nameInShader != "size2" && nameInShader != "theta" && nameInShader != "theta2")        // experiment
                {
                    //glUtils.error("Cannot locate shader attribute: " + nameInShader);
                }
            }
            else
            {
                if (isSingleBuffer)
                {
                    var glBuffer = gl.createBuffer();
                    this._glBuffers.push(glBuffer);

                    //this.bindBufferForDrawing(glBuffer);
                }
            }
        }

        glInst(value?: ANGLE_instanced_arrays)
        {
            if (arguments.length == 0)
            {
                return this._glInst;
            }

            this._glInst = value;
            //this.onDataChanged("glInst");
        }

        allocateBuffersForAttr(drawInfos: beachParty.DrawInfo[])
        {
            var gl = this._gl;
            this._drawInfos = drawInfos;

            if (! this._isSingleBuffer)
            {
                if (this._glBuffers.length != drawInfos.length)
                {
                    //---- deallocate previous buffers ----
                    for (var i = 0; i < this._glBuffers.length; i++)
                    {
                        var oldBuff = this._glBuffers[i];
                        gl.deleteBuffer(oldBuff);
                    }

                    //---- allocate NEW buffers ----
                    this._glBuffers = [];

                    for (var i = 0; i < drawInfos.length; i++)
                    {
                        var glBuffer = gl.createBuffer();
                        this._glBuffers.push(glBuffer);
                    }
                }
            }
        }

        bindBuffersToArrayData(drawIndexes: number[], verticesInBuffer: number)
        {
            var gl = this._gl;
            var drawInfos = this._drawInfos;

            if (this._isSingleBuffer)
            {
                var glBuffer = this._glBuffers[0];

                gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, this._array, gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                //vp.utils.debug("bindBuffers for singleBuffer: attr=" + this._nameInShader + ", length=" + this._array.length);
            }
            else
            {
                //---- bind a buffer to the specified subset, so that we can draw this subset using instancing ----
                if (this._attrLoc !== undefined && this._attrLoc != -1 && this._array != undefined)
                {
                    //---- bind buffers to subArrays ----
                    var mySizeInFloats = this._sizeInFloats;

                    if (! (this._glInst && this._isVertexCommon))
                    {
                        mySizeInFloats *= verticesInBuffer;
                    }

                    for (var i = 0; i < drawIndexes.length; i++)
                    {
                        var drawIndex = drawIndexes[i];
                        var drawInfo = drawInfos[drawIndex];

                        var glBuffer = this._glBuffers[drawIndex];

                        var start = drawInfo.instOffset;
                        var end = start + drawInfo.instCount;     // - 1;

                        var subarrayView = this._array.subarray(start * mySizeInFloats, end * mySizeInFloats);

                        //vp.utils.debug("bindBuffers: attr=" + this._nameInShader + ", drawIndex=" + drawIndex +
                        //    ", offset=" + drawInfo.instOffset + ", length=" + subarrayView.length);

                        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
                        gl.bufferData(gl.ARRAY_BUFFER, subarrayView, gl.STATIC_DRAW);
                        gl.bindBuffer(gl.ARRAY_BUFFER, null);
                    }
                }
            }
        }

        bindBufferForDrawing(drawInfoIndex: number)
        {
            if (this._isSingleBuffer)
            {
                drawInfoIndex = 0;
            }

            var buffer = this._glBuffers[drawInfoIndex];
            this.bindAttributeToBuffer(buffer);
        }

        private bindAttributeToBuffer(buffer: any)
        {
            var gl = this._gl;

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(this._attrLoc);

            var dataType = (this._isByte) ? gl.UNSIGNED_BYTE : gl.FLOAT;
            var normalize = this._normalizeOnGpu;

            gl.vertexAttribPointer(this._attrLoc, this._sizeInFloats, dataType, normalize, 0, 0);

            if (this._isVertexCommon && this._glInst)
            {
                this._glInst.vertexAttribDivisorANGLE(this._attrLoc, 1);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        setArray(array: any)
        {
            var gl = this._gl;
            this._array = array;

            //if (this._attrLoc !== undefined && this._attrLoc != -1 && array != undefined)
            //{
            //    gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
            //    gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
            //    gl.bindBuffer(gl.ARRAY_BUFFER, null);
            //}
        }

    }
}

 