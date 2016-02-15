//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    flatGrid.ts - builds a GROD 2d layout of sand shapes.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class FlatGrid extends BaseGlVisClass
    {
        //---- all facets info ----
        _maxCountAllFacets = 0;

        _colCount = 0;
        _rowCount = 0;
        _nextIndex = 0;
        _maxShapeWidth = 1;
        _maxShapeHeight = 1;
        _itemSize = 0;

        constructor(view: DataViewClass, gl: any, chartState: any, container: HTMLElement, appMgr: AppMgrClass)
        {
            super("flatGrid", view, gl, chartState, container, appMgr);

            this._hideAxes = true;
        }

        computeFacetStats(dc: DrawContext, nvFacetBuckets: any[])
        {
            this._maxCountAllFacets = ChartUtils.computeMaxCountOverFacets(dc, nvFacetBuckets);
            this._itemSize = dc.itemSize;

            return this._maxCountAllFacets;
        }

        buildScales(nv: NamedVectors, rcxWorld, filteredRecordCount: number, facetCount: number)
        {
            var result = super.buildScales(nv, rcxWorld, filteredRecordCount, facetCount);
            var margin = this._itemSize/4;
            var fp = this._view.flatParams();

            //---- override X and Y scales - force the domain to [0..1] ----
            result.x = utils.makeLinearScale(0, 1, rcxWorld.left + margin, rcxWorld.right - margin);

            if (fp.buildFromTop)
            {
                result.y = utils.makeLinearScale(0, 1, rcxWorld.top - margin, rcxWorld.bottom + margin);
            }
            else
            {
                result.y = utils.makeLinearScale(0, 1, rcxWorld.bottom + margin, rcxWorld.top - margin);
            }

            return result;
        }

        preLayoutLoop(dc: DrawContext)
        {
            var maxCount = this._maxCountAllFacets;

            var fp = this._view.flatParams();
            var colCount = fp.numColumns;

            if (! colCount)
            {
                //---- num of columns not specified by user; compute it so that shapes are square ----
                var aspect = dc.width / dc.height;
                colCount = Math.ceil(Math.sqrt(aspect * maxCount));
            }

            var rowCount = Math.ceil(maxCount / colCount);

            this._colCount = colCount;
            this._rowCount = rowCount;

            //---- use .85 to allow some space between shapes ----
            var spaceFactor = 1 - (.15 * this._view.separationFactor());

            this._maxShapeWidth = spaceFactor * dc.width / this._colCount;
            this._maxShapeHeight = spaceFactor * dc.height / this._rowCount;

            this._nextIndex = 0;
        }

        /** "bufferIndex" in the 0-based indexed into the sorted data buffers. */
        layoutDataForRecord(bufferIndex: number, dc: DrawContext, dr: bps.LayoutResult)
        {
            //---- flat grid layout ----
            var nv = dc.nvData;
            var scales = dc.scales;

            var filtered = (dc.layoutFilterVector && dc.layoutFilterVector[bufferIndex]);

            //---- "layoutIndex" is the index into the FILTERED-IN shapes that are being layed out in this plot. */
            var layoutIndex = 0;

            if (!filtered)
            {
                layoutIndex = this._nextIndex++;
            }

            var xData = layoutIndex % this._colCount;
            var yData = Math.floor(layoutIndex / this._colCount);

            dr.x = scales.x.scale((xData + .5)/this._colCount);
            dr.y = scales.y.scale((yData + .5)/this._rowCount);
            dr.z = 0;      

            var sizeFactor = this.scaleColData(nv.size, bufferIndex, dc.scales.size, 1);
            dr.width = this._maxShapeWidth * sizeFactor;
            dr.height = this._maxShapeHeight * sizeFactor;
            dr.depth = dc.defaultDepth2d      // test out 3d cube in a 2d shape

            dr.colorIndex = this.scaleColData(nv.colorIndex, bufferIndex, scales.colorIndex);
            dr.imageIndex = this.scaleColData(nv.imageIndex, bufferIndex, dc.scales.imageIndex);
        }
    }
}
 