//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    bufferMgr - manages the attributes and gl buffers for a chart.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    /// Note: the actual arrays and buffers are held by each attribute. 
    export class BufferMgrClass extends DataChangerClass
    {
        _gl: WebGLRenderingContext;
        _glInst: ANGLE_instanced_arrays;
        _glAttributes: IAttributes = null;     
        _usingPrimaryBuffers = true;
        _fromBuffersHaveData = false;
        _arrayMemoryBytesInUse = 0;
        _dataMgr: DataMgrClass;
        _baseGlVis: BaseGlVisClass;
        _drawInfos: DrawInfo[];

        constructor(gl: WebGLRenderingContext, glInst: ANGLE_instanced_arrays, dataMgr: DataMgrClass, baseGlVis: BaseGlVisClass)
        {
            super();

            this._gl = gl;
            this._glInst = glInst;
            this._dataMgr = dataMgr;
            this._baseGlVis = baseGlVis;
        }

        getArrayMemoryUsage()
        {
            return this._arrayMemoryBytesInUse;
        }

        createGlAttributes(program, force: boolean)
        {
            if (force || !this._glAttributes)
            {
                var gl = this._gl;
                var glInst = this._glInst;

                var attrs = {};
                this._glAttributes = attrs;

                glUtils.addAttribute(attrs, gl, glInst, program, "xyz", 3);
                glUtils.addAttribute(attrs, gl, glInst, program, "xyz2", 3);
                glUtils.addAttribute(attrs, gl, glInst, program, "size", 3);
                glUtils.addAttribute(attrs, gl, glInst, program, "size2", 3);

                //---- color channel mapping ----
                glUtils.addAttribute(attrs, gl, glInst, program, "rgbBuff", 3, true, true);
                glUtils.addAttribute(attrs, gl, glInst, program, "rgbBuff2", 3, true, true);

                glUtils.addAttribute(attrs, gl, glInst, program, "colorIndex", 1, false, false);
                glUtils.addAttribute(attrs, gl, glInst, program, "colorIndex2", 1, false, false);

                glUtils.addAttribute(attrs, gl, glInst, program, "imageIndex", 1, true, false);
                glUtils.addAttribute(attrs, gl, glInst, program, "imageIndex2", 1, true, false);
                glUtils.addAttribute(attrs, gl, glInst, program, "theta", 1);
                glUtils.addAttribute(attrs, gl, glInst, program, "theta2", 1);

                //---- for these, we only have a single buffer ----
                glUtils.addAttribute(attrs, gl, glInst, program, "vertexId", 1, true, false, false, true);
                glUtils.addAttribute(attrs, gl, glInst, program, "staggerOffset", 1);
                glUtils.addAttribute(attrs, gl, glInst, program, "vectorIndex", 1);
            }
        }

        createAttributeArraysIfNeeded(forceNewArrays: boolean, forceVisualBreak)
        {
            if (forceNewArrays || (this._glAttributes && !this._glAttributes.xyz._array))
            {
                this.createAttributeArrays(forceVisualBreak);
            }
        }

        /** "forceVisualBreak" should be set to true when a new dataFrame has been loaded, so that we do NOT visually connect the from/to plots.
        Also, the number of records may have changed, which would invalid the visuals anyway. */
        createAttributeArrays(forceVisualBreak: boolean)
        {
            var vertexCount = this._baseGlVis.getTotalVertexCount();
            var totalSpace = 0;

            //---- save the FROM vertex data so we can do correct animation (even though the drawingPrimitive is changing) ----
            if (!forceVisualBreak)
            {
                var tempBuffers = this.copyVertexDataToTemp();
            }

            if (vertexCount > 0)
            {
                var attrs = this._glAttributes;

                totalSpace = this.createAttributeArraysCore(attrs, vertexCount);
            }

            this._arrayMemoryBytesInUse = totalSpace;
            this._fromBuffersHaveData = false;

            if (tempBuffers)
            {
                //---- apply temp vertex data to FROM buffers ----
                this.copyTempToFromBuffers(tempBuffers);

                //---- don't reorder, since we built the fromBuffer with the correct order ----
                this._fromBuffersHaveData = false;
            }

            this._baseGlVis.setLastVerticesPerRecord();
        }

        private createAttributeArraysCore(attrs: IAttributes, totalVertexCount: number, arrayMap?: any)
        {
            var keys = vp.utils.keys(attrs);
            var totalSpace = 0;
            var recordCount = this._dataMgr.getDataFrame().getRecordCount();

            //vp.utils.debug("--> createAttributeBuffers: recordCount=" + recordCount +
            //    ", totalVertexCount=" + totalVertexCount);

            for (var i = 0; i < keys.length; i++)
            {
                var name = keys[i];
                var attr = <glUtils.GlAttributeClass>attrs[name];

                if (attr._attrLoc != -1)
                {
                    var myVertexCount = totalVertexCount;
                    if (name == "vertexId" && this._glInst)
                    {
                        //---- only need one copy of the vertex ids - it will be shared with each instance ----
                        myVertexCount = this._baseGlVis.getNumVerticesPerShape();
                    }

                    var numberCount = myVertexCount * attr._sizeInFloats;
                    var array = null;

                    if (attr._isByte)
                    {
                        array = new Int8Array(numberCount);
                        var space = 1 * numberCount;
                    }
                    else
                    {
                        array = new Float32Array(numberCount);
                        var space = 4 * numberCount;
                    }

                    if (arrayMap)
                    {
                        var arrayName = name.substr(0, name.length - 4) + "Array";        // remove last 4 chars
                        arrayMap[arrayName] = array;
                    }
                    else
                    {
                        attr.setArray(array);
                    }

                    //vp.utils.debug("createAttributeBuffers: name=" + name + ", space=" + space);

                    totalSpace += space;
                }
            }

            return totalSpace;
        }

        //dumpVertexBuffers(name: string, verticesPerRecord: number, buffers: NamedBuffers)
        //{
        //    vp.utils.debug("---> dump of: " + name);

        //    for (var i = 0; i < 5; i++)
        //    {
        //        var inx = i * 3 * verticesPerRecord;
        //        var x = buffers.xyzArray[inx + 0];
        //        var y = buffers.xyzArray[inx + 1];
        //        var z = buffers.xyzArray[inx + 2];

        //        vp.utils.debug("  x=" + x + ", y=" + y + ", z=" + z);
        //    }
        //}


        /** make a (single vertex per record) copy of the latest (from/to) vertex data.  */
        copyVertexDataToTemp()
        {
            var fromVerticesPerRecord = this._baseGlVis.getLastVerticesPerRecord();
            var tempBuffers = null;

            if (fromVerticesPerRecord !== null)
            {
                var usePrimBuff = (!this._usingPrimaryBuffers);
                vp.utils.debug("copyVertexDataToTemp: getting FROM data with usePrimBuff=" + usePrimBuff);

                var attributes = this.getAttributesForCycle(usePrimBuff);
                var fromBuffers = this.getNamedBuffers(attributes);
                if (fromBuffers && fromBuffers.xyzArray)
                {
                    var drawIndexes = this.buildRecordToDrawIndexes();
                    var recordCount = fromBuffers.xyzArray.length / (3 * fromVerticesPerRecord);
                    var dataFrame = this._dataMgr.getDataFrame();

                    var primaryKey = dataFrame.getNumericVector(primaryKeyName);
                    var toVerticesPerRecord = 1;

                    //---- create toBuffers ----
                    tempBuffers = new NamedBuffers();
                    this.createAttributeArraysCore(attributes, 1 * recordCount, tempBuffers);

                    this.copyVertexBuffers(fromBuffers, tempBuffers, primaryKey, recordCount, fromVerticesPerRecord, toVerticesPerRecord,
                        drawIndexes);

                    //this.dumpVertexBuffers("fromBuffers", fromVerticesPerRecord, fromBuffers);
                    //this.dumpVertexBuffers("tempBuffers", 1, tempBuffers);
                }
            }

            return tempBuffers;
        }

        /** copy from temp (single vertex per record) to from buffers.  */
        copyTempToFromBuffers(tempBuffers: NamedBuffers)
        {
            var fromVerticesPerRecord = 1;
            var toVerticesPerRecord = this._baseGlVis.getNumVerticesInBuffer();

            var usePrimBuff = (!this._usingPrimaryBuffers);
            vp.utils.debug("copyTempToFromBuffers: getting FROM data with usePrimBuff=" + usePrimBuff);

            var attributes = this.getAttributesForCycle(usePrimBuff);
            var toBuffers = this.getNamedBuffers(attributes);

            var drawIndexes = this.buildRecordToDrawIndexes();
            var recordCount = toBuffers.xyzArray.length / (3 * toVerticesPerRecord);
            var dataFrame = this._dataMgr.getDataFrame();

            var primaryKey = dataFrame.getNumericVector(primaryKeyName);

            this.copyVertexBuffers(tempBuffers, toBuffers, primaryKey, recordCount, fromVerticesPerRecord, toVerticesPerRecord, drawIndexes);

            this.setArraysFromNamedBuffers(attributes, toBuffers);

            //this.dumpVertexBuffers("toBuffers", toVerticesPerRecord, toBuffers);

        }

        /** This rearranges the record values in the "from" buffer to match the current sort order. */
        reorderFromBuffer(fromAttrs, fb: NamedBuffers, nv: NamedVectors, recordCount: number, verticesPerRecord: number)
        {
            //---- the idea is to reorder the entries in fromBuff - to do this, we move entries from fromBuff ----
            //---- to toBuff, and then copy it back to fromBuff when completed.  ----

            var toAttrs = this.getAttributesForCycle(this._usingPrimaryBuffers);
            var tb = this.getNamedBuffers(toAttrs);

            //var isFromPrimary = (fromAttrs.xyzAttr == this._glAttributes.xyz);
            //if (isFromPrimary)
            //{
            //    vp.utils.debug("reorderFromBuffer: moving " + recordCount + " items from PRIMARY to SECONDARY");
            //}
            //else
            //{
            //    vp.utils.debug("reorderFromBuffer: moving " + recordCount + " items from SECONDARY to PRIMARY");
            //}

            var drawIndexes = this.buildRecordToDrawIndexes();

            this.copyVertexBuffers(fb, tb, nv.primaryKey, recordCount, verticesPerRecord, verticesPerRecord, drawIndexes);

            //---- now copy data back, in correct order, from TB to FB ----
            this.arrayCopy(tb.xyzArray, fb.xyzArray);
            this.arrayCopy(tb.sizeArray, fb.sizeArray);
            this.arrayCopy(tb.rgbArray, fb.rgbArray);
            this.arrayCopy(tb.colorArray, fb.colorArray);
            this.arrayCopy(tb.imageIndexArray, fb.imageIndexArray);
            this.arrayCopy(tb.staggerOffsetArray, fb.staggerOffsetArray);

            if (fb.thetaArray)
            {
                this.arrayCopy(tb.thetaArray, fb.thetaArray);
            }

            if (fb.vertexIdArray)
            {
                this.arrayCopy(tb.vertexIdArray, fb.vertexIdArray);
            }

            if (fb.vectorIndexArray)
            {
                this.arrayCopy(tb.vectorIndexArray, fb.vectorIndexArray);
            }
        }

        /** copies 1 multiple of vertex data from "fb" to verticesPerRecord multiples at "tb" */
        copyVertexBuffers(fb: NamedBuffers, tb: NamedBuffers, primaryKey: NumericVector, recordCount: number,
            fromVerticesPerRecord: number, toVerticesPerRecord: number, drawIndexes)
        {
            vp.utils.debug("===> copyVertexBuffers: called (doesn't yet support instancing correctly)");

            for (var ri = 0; ri < recordCount; ri++)
            {
                var vi = (drawIndexes) ? drawIndexes[ri] : ri;

                var ti = toVerticesPerRecord * vi;        // to index
                var ti3 = 3 * ti;                        // to index for xyz and size

                var key = primaryKey.getRawData(ri) + "";
                var fromVi = this._baseGlVis.getPkToDrawIndex(key);     
                var fi = fromVerticesPerRecord * fromVi;    // from index
                var fi3 = 3 * fi;                           // from index for xyz and size

                //if (vi < 4)
                //{
                //    vp.utils.debug("reorderFromBuffer: vi=" + vi + ", key=" + key + ", fromVi=" + fromVi);
                //}

                for (var j = 0; j < toVerticesPerRecord; j++)
                {
                    tb.xyzArray[ti3] = fb.xyzArray[fi3];
                    tb.xyzArray[ti3 + 1] = fb.xyzArray[fi3 + 1];
                    tb.xyzArray[ti3 + 2] = fb.xyzArray[fi3 + 2];

                    tb.sizeArray[ti3] = fb.sizeArray[fi3];
                    tb.sizeArray[ti3 + 1] = fb.sizeArray[fi3 + 1];
                    tb.sizeArray[ti3 + 2] = fb.sizeArray[fi3 + 2];

                    tb.rgbArray[ti3] = fb.rgbArray[fi3];
                    tb.rgbArray[ti3 + 1] = fb.rgbArray[fi3 + 1];
                    tb.rgbArray[ti3 + 2] = fb.rgbArray[fi3 + 2];

                    tb.colorArray[ti] = fb.colorArray[fi];

                    tb.imageIndexArray[ti] = fb.imageIndexArray[fi];
                    tb.staggerOffsetArray[ti] = fb.staggerOffsetArray[fi];

                    if (fb.thetaArray)
                    {
                        tb.thetaArray[ti] = fb.thetaArray[fi];
                    }

                    if (fb.vertexIdArray)
                    {
                        tb.vertexIdArray[ti] = fb.vertexIdArray[fi];
                    }

                    if (fb.vectorIndexArray)
                    {
                        tb.vectorIndexArray[ti] = fb.vectorIndexArray[fi];
                    }

                    ti3 += 3;
                    ti++;

                    //---- to allow code to copy between different verticesPerRecord, we just recopy first vertex of from ----
                    //fi3 += 3;
                    //fi++;
                }
            }

        }

        /** copy a Float32Array or other array type. */
        arrayCopy(fb: Float32Array, tb: Float32Array)
        {
            for (var i = 0; i < fb.length; i++)
            {
                tb[i] = fb[i];
            }
        }

        getAttributesForCycle(usingPrimaryBuffers: boolean)
        {
            var attr: any = {};

            attr.vertexIdAttr = this._glAttributes.vertexId;
            attr.staggerOffsetAttr = this._glAttributes.staggerOffset;
            attr.vectorIndexAttr = this._glAttributes.vectorIndex;

            if (usingPrimaryBuffers)
            {
                attr.xyzAttr = this._glAttributes.xyz;
                attr.sizeAttr = this._glAttributes.size;
                attr.rgbAttr = this._glAttributes.rgbBuff;
                attr.colorAttr = this._glAttributes.colorIndex;
                attr.imageIndexAttr = this._glAttributes.imageIndex;
                attr.thetaAttr = this._glAttributes.theta;

                //vp.utils.debug("filling primary buffers");
            }
            else
            {
                attr.xyzAttr = this._glAttributes.xyz2;
                attr.sizeAttr = this._glAttributes.size2;
                attr.rgbAttr = this._glAttributes.rgbBuff2;
                attr.colorAttr = this._glAttributes.colorIndex2;
                attr.imageIndexAttr = this._glAttributes.imageIndex2;
                attr.thetaAttr = this._glAttributes.theta2;

                //vp.utils.debug("filling secondary buffers");
            }

            return attr;
        }

        getNamedBuffers(attributes: any)
        {
            var buffers = new NamedBuffers();

            buffers.xyzArray = attributes.xyzAttr._array;
            buffers.sizeArray = attributes.sizeAttr._array;
            buffers.rgbArray = attributes.rgbAttr._array;
            buffers.colorArray = attributes.colorAttr._array;
            buffers.imageIndexArray = attributes.imageIndexAttr._array;
            buffers.thetaArray = attributes.thetaAttr._array;

            buffers.staggerOffsetArray = attributes.staggerOffsetAttr._array;
            buffers.vertexIdArray = attributes.vertexIdAttr._array;
            buffers.vectorIndexArray = attributes.vectorIndexAttr._array;

            return buffers;
        }

        setArraysFromNamedBuffers(attributes: any, buffers: NamedBuffers)
        {
            attributes.xyzAttr.setArray(buffers.xyzArray);
            attributes.sizeAttr.setArray(buffers.sizeArray);
            attributes.rgbAttr.setArray(buffers.rgbArray);
            attributes.colorAttr.setArray(buffers.colorArray);
            attributes.imageIndexAttr.setArray(buffers.imageIndexArray);
            attributes.thetaAttr.setArray(buffers.thetaArray);

            if (attributes.staggerOffsetAttr)
            {
                attributes.staggerOffsetAttr.setArray(buffers.staggerOffsetArray);
            }

            if (attributes.vertexIdAttr)
            {
                attributes.vertexIdAttr.setArray(buffers.vertexIdArray);
            }

            if (attributes.vectorIndexAttr)
            {
                attributes.vectorIndexAttr.setArray(buffers.vectorIndexArray);
            }
        }

        flipIsUsingPrimaryBuffers()
        {
            this._usingPrimaryBuffers = (!this._usingPrimaryBuffers);
        }

        glInst(value?: ANGLE_instanced_arrays)
        {
            if (arguments.length == 0)
            {
                return this._glInst;
            }

            if (value != this._glInst)
            {
                this._glInst = value;
                this.onDataChanged("glInst");

                this.updateAttributesWithGlInst();
                //this.createAttributeArrays();
            }
        }

        updateAttributesWithGlInst()
        {
            if (this._glAttributes)
            {
                var keys = vp.utils.keys(this._glAttributes);
                var glInst = this._glInst;

                for (var i = 0; i < keys.length; i++)
                {
                    var name = keys[i];
                    var attr = <glUtils.GlAttributeClass>this._glAttributes[name];

                    attr.glInst(glInst);
                }
            }
        }

        allocateBuffers(drawInfos: DrawInfo[])
        {
            this._drawInfos = drawInfos;
            var keys = vp.utils.keys(this._glAttributes);

            for (var i = 0; i < keys.length; i++)
            {
                var name = keys[i];
                var attr = <glUtils.GlAttributeClass>this._glAttributes[name];

                attr.allocateBuffersForAttr(drawInfos);
            }
        }

        bindBuffersToArrayData(drawIndexes: number[])
        {
            var keys = vp.utils.keys(this._glAttributes);
            var verticesInBuffer = this._baseGlVis.getNumVerticesInBuffer();

            for (var i = 0; i < keys.length; i++)
            {
                var name = keys[i];
                var attr = <glUtils.GlAttributeClass>this._glAttributes[name];

                attr.bindBuffersToArrayData(drawIndexes, verticesInBuffer);
            }
        }

        bindBufferForDrawing(drawInfoIndex: number)
        {
            var keys = vp.utils.keys(this._glAttributes);

            for (var i = 0; i < keys.length; i++)
            {
                var name = keys[i];
                var attr = <glUtils.GlAttributeClass>this._glAttributes[name];

                attr.bindBufferForDrawing(drawInfoIndex);
            }
        }

        rebindBuffersAfterProgramSwitch()
        {
            //this._glAttributes.xyz.rebindBuffer();
        }

        reorderFromBuffers(dc: DrawContext, verticesPerRecord: number)
        {
            var result = null;

            if (this._fromBuffersHaveData)
            {
                var fromAttributes = this.getAttributesForCycle(!this._usingPrimaryBuffers);
                var fromBuffers = this.getNamedBuffers(fromAttributes);

                this.reorderFromBuffer(fromAttributes, fromBuffers, dc.nvData, dc.recordCount, verticesPerRecord);
                result = { attributes: fromAttributes, buffers: fromBuffers };
            }

            return result;
        }

        setFromBufferHasData(value: boolean)
        {
            this._fromBuffersHaveData = value;
        }

        getUsingPrimaryBuffers()
        {
            return this._usingPrimaryBuffers;
        }

        buildRecordToDrawIndexes()
        {
            var drawIndexes = null;
            var facetHelper = this._baseGlVis.getFacetHelper();

            if (facetHelper)
            {
                var bins = facetHelper._binResult.bins;
                var nextDrawIndex = 0;
                drawIndexes = [];

                for (var b = 0; b < bins.length; b++)
                {
                    var bin = bins[b];

                    for (var i = 0; i < bin.rowIndexes.length; i++)
                    {
                        var recordIndex = bin.rowIndexes[i];
                        drawIndexes[recordIndex] = nextDrawIndex++;
                    }
                }
            }

            return drawIndexes;
        }

        fillBuffersForRecord(buffers: NamedBuffers, dr: bps.LayoutResult, facetOffset, nv: NamedVectors, dc: DrawContext,
            verticesPerRecord: number, primaryKey: string, vectorIndex: number, facetRelativeIndex: number, rect: ClientRect)
        {
            var innerLoopCount = 0;
            var staggerOffset = 0;

            //---- find next spot for vertices, based on vectorIndex (keep primary/secondary buffers in sync, in spite of sorting ----
            //---- that is, the GL buffers are always in natural (vectorIndex) order. ----
            var next1 = verticesPerRecord * vectorIndex;

            //if (vectorIndex < 4)
            //{
            //    var isFillingPrimary = (buffers.xyzArray == this._glAttributes.xyz._array);

            //    vp.utils.debug("fillBuffersForRecord: fillingPrimary=" + isFillingPrimary +
            //        ", vectorIndex=" + vectorIndex + ", primaryKey=" + primaryKey + ", next1=" + next1);
            //}

            var next3 = 3 * next1;

            if (vectorIndex == 0)
            {
                //---- this code is NECESSARY to enable JIT-ing (make a DOM API call) ----
                this._baseGlVis.forceDomApiCall();
            }

            for (var j = 0; j < verticesPerRecord; j++)
            {
                buffers.xyzArray[next3] = dr.x;
                buffers.sizeArray[next3] = dr.width;
                buffers.rgbArray[next3] = dr.redChannel;
                next3++;

                buffers.xyzArray[next3] = dr.y;
                buffers.sizeArray[next3] = dr.height;
                buffers.rgbArray[next3] = dr.greenChannel;
                next3++;

                buffers.xyzArray[next3] = dr.z;
                buffers.sizeArray[next3] = dr.depth;
                buffers.rgbArray[next3] = dr.blueChannel;
                next3++;

                buffers.colorArray[next1] = dr.colorIndex;

                if (buffers.imageIndexArray)
                {
                    buffers.imageIndexArray[next1] = dr.imageIndex;
                }

                if (buffers.staggerOffsetArray)
                {
                    buffers.staggerOffsetArray[next1] = dr.staggerOffset;
                }

                if (buffers.thetaArray)
                {
                    buffers.thetaArray[next1] = dr.theta;
                }

                if (buffers.vectorIndexArray)
                {
                    buffers.vectorIndexArray[next1] = vectorIndex;
                }

                //---- special handling for vertexId ----
                if (buffers.vertexIdArray && ! this._glInst)
                {
                    //---- if glInst is off, do the normal filling of vertexId's for each instance ----
                    buffers.vertexIdArray[next1] = j;
                }

                next1++;
                innerLoopCount++;
            }

            //---- special handling for vertexId ----
            if (buffers.vertexIdArray && this._glInst)
            {
                var shapeVertexCount = this._baseGlVis.getNumVerticesPerShape();

                for (var j = 0; j < shapeVertexCount; j++)
                {
                    buffers.vertexIdArray[j] = j;
                }
            }
        }
    }

    export interface IAttributes
    {
        //---- "from" and "to" attribute pairs ----
        xyz?: glUtils.GlAttributeClass;
        xyz2?: glUtils.GlAttributeClass;
        rgbBuff?: glUtils.GlAttributeClass;
        rgbBuff2?: glUtils.GlAttributeClass;
        colorIndex?: glUtils.GlAttributeClass;
        colorIndex2?: glUtils.GlAttributeClass;
        theta?: glUtils.GlAttributeClass;
        theta2?: glUtils.GlAttributeClass;
        size?: glUtils.GlAttributeClass;
        size2?: glUtils.GlAttributeClass;
        imageIndex?: glUtils.GlAttributeClass;
        imageIndex2?: glUtils.GlAttributeClass;

        //---- single attributes ----
        vectorIndex?: glUtils.GlAttributeClass;
        vertexId?: glUtils.GlAttributeClass;
        staggerOffset?: glUtils.GlAttributeClass;
    }
}
 