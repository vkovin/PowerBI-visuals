//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    trueCustom.ts - builds a generalized custom chart from specified parameters.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class TrueCustomClass extends BaseGlVisClass
    {
        //---- all facet results ----
        _xFacetBinResults = null;
        _yFacetBinResults = null;

        _maxCount = 0;
        _nextIndex = 0;         // index to assigned to next unfiltered shape
        _isFlat = false;        // true if no bins are defined 

        _binLefts: number[];
        _binTops: number[];

        _itemWidth: number;
        _itemHeight: number;

        _binIndexesX: number[];
        _binIndexesY: number[];
        _binRelativeIndexes: number[];

        //---- indexed by countKey, holds an array of pts for each bin (produced by bestPoission layout) ----
        _binPts = {};     
        _binRects = {};
        
        _layoutFunc: any;       // the function that will do the inner layout for each bin  

        _hMargin = 0;
        _vMargin = 0;
        _hBetween = 0;
        _vBetween = 0;
        _binCounts: any;
        _xglobalmax = 1;
        _yglobalmax = 1;
        _xspace: number;
        _yspace: number;
        _space: number;
        _maxShapeSize: number;

        constructor(view: DataViewClass, gl: any, chartState: any, container: HTMLElement, appMgr: AppMgrClass)
        {
            super("densityGrid", view, gl, chartState, container, appMgr);
        }

        /** Adjust scales as needed for our chart. */
        computeFacetStats(dc: DrawContext, nvFacetBuckets: any[])
        {
            var facetHelper = dc.facetHelper;
            this._xFacetBinResults = [];
            this._yFacetBinResults = [];

            var xm = this._view.xMapping();
            var ym = this._view.yMapping();
            var cp = <bps.CustomParams>this._view.customParams();

            this._isFlat = (cp.xUsage != bps.CustomColUsage.bin && cp.yUsage != bps.CustomColUsage.bin);

            if (facetHelper)
            {
                var facetCount = facetHelper.facetCount();

                for (var i = 0; i < facetCount; i++)
                {
                    var data = nvFacetBuckets[i];

                    if (cp.xUsage == bps.CustomColUsage.bin)
                    {
                        var xResults = ChartUtils.binTheDataForCount(dc, data, xm, "x");
                        this._xFacetBinResults.push(xResults);
                    }

                    if (cp.yUsage == bps.CustomColUsage.bin)
                    {
                        var yResults = ChartUtils.binTheDataForCount(dc, data, ym, "y");
                        this._yFacetBinResults.push(yResults);
                    }
                }
            }
            else
            {
                if (cp.xUsage == bps.CustomColUsage.bin)
                {
                    var xResults = ChartUtils.binTheDataForCount(dc, dc.nvData, xm, "x");
                    this._xFacetBinResults.push(xResults);
                }

                if (cp.yUsage == bps.CustomColUsage.bin)
                {
                    var yResults = ChartUtils.binTheDataForCount(dc, dc.nvData, ym, "y");
                    this._yFacetBinResults.push(yResults);
                }
            }

            //---- adjust X scale ----
            if (xResults)
            {
                dc.scales.x = ChartUtils.adjustScaleForBin(dc.scales.x, xResults);
            }

            //---- adjust Y scale ----
            if (yResults)
            {
                dc.scales.y = ChartUtils.adjustScaleForBin(dc.scales.y, yResults);
            }

            return dc.filteredRecordCount;
        }

        assignRecordsToBins(nv: NamedVectors, resultX, resultY, dc: DrawContext)
        {
            //---- determine each item's position ("itemIndex") within its bin ----
            //---- for this part, we need to process the items in their sorted order ----

            var filter = dc.layoutFilterVector;
            var isFiltered = (filter != null);

            var allAssignX = (resultX) ? resultX.assignments : null;
            var allAssignY = (resultY) ? resultY.assignments : null;

            var binIndexesX = [];
            var binIndexesY = [];
            var binRelativeIndexes = [];

            this._binCounts = {}              // will use string as our 3d index   (facet, x, y)

            var facetAssignments = (dc.facetHelper) ? dc.facetHelper.binResult().assignments : null;

            for (var i = 0; i < filter.length; i++)
            {
                var shapeIndex = i;     // sri[i];        // process shape indexes, in sorted order

                if (!filter[shapeIndex])
                {
                    //--- assignments must be indexed by the shapeIndex ----
                    var binIndexX = (allAssignX) ? allAssignX[shapeIndex] : 0;
                    var binIndexY = (allAssignY) ? allAssignY[shapeIndex] : 0;

                    binIndexesX[shapeIndex] = binIndexX;
                    binIndexesY[shapeIndex] = binIndexY;

                    //---- we are called once for each facet, so we don't need that in our countKey anymore ----
                    var countKey = binIndexX + "," + binIndexY;

                    if (this._binCounts[countKey] === undefined)
                    {
                        this._binCounts[countKey] = 0;
                    }

                    //binIndexes[shapeIndex] = binCounts[countKey];

                    this._binCounts[countKey] += 1;
                    var binRelativeIndex = this._binCounts[countKey];
                    binRelativeIndexes[shapeIndex] = binRelativeIndex;
                }
                else
                {
                    //---- generate data for these items but don't include in layout ----
                    binIndexesX[shapeIndex] = 0;
                    binIndexesY[shapeIndex] = 0;
                }
            }

            //---- find max # of entries in any bin ----
            var maxCount = 0;
            var keys = vp.utils.keys(this._binCounts);

            for (var k = 0; k < keys.length; k++)
            {
                var key = keys[k];
                var count = this._binCounts[key];
                maxCount = Math.max(count, maxCount);
            }

            var width = dc.width;
            var height = dc.height;

            if (resultX)
            {
                //---- build an array of the bin names for the xScale labels ----
                var binsX = resultX.bins;
                var binNamesX = [];
                for (var i = 0; i < binsX.length; i++)
                {
                    binNamesX[i] = (<any>binsX[i]).name;
                }
            }

            if (resultY)
            {
                var binsY = resultY.bins;
                var binNamesY = [];
                for (var i = 0; i < binsY.length; i++)
                {
                    binNamesY[i] = (<any>binsY[i]).name;
                }
            }

            //---- create bounds ----
            var binLefts: number[] = [];
            var binTops: number[] = [];

            var left = dc.x + this._hMargin;
            var top = dc.y + this._vMargin + this._itemHeight;

            if (binsX)
            {
                for (var i = 0; i < binsX.length; i++)
                {
                    binLefts[i] = left;
                    left += (this._itemWidth + this._hBetween);
                }
            }
            else
            {
                binLefts[0] = left;
            }

            if (binsY)
            {
                for (var i = 0; i < binsY.length; i++)
                {
                    binTops[i] = top;
                    top += (this._itemHeight + this._vBetween);
                }
            }
            else
            {
                binTops[0] = top;
            }

            this._binLefts = binLefts;
            this._binTops = binTops;

            this._binIndexesX = binIndexesX;
            this._binIndexesY = binIndexesY;

            this._binRelativeIndexes = binRelativeIndexes;

            this.prepLayouts(dc, nv, keys);

            return maxCount;
        }

        prepLayouts(dc: DrawContext, nv: NamedVectors, keys: string[])
        {
            //---- poisson/squarify: layout shapes within each bin now ----
            var cp = <bps.CustomParams>this._view.customParams();

            var binPts = {};
            this._binPts = binPts;

            var binRects = {};
            this._binRects = binRects;

            if (cp.layout == bps.CustomLayout.poisson)
            {
                var rc = vp.geom.createRect(0, 0, this._itemWidth, this._itemHeight);

                for (var k = 0; k < keys.length; k++)
                {
                    var key = keys[k];
                    var count = this._binCounts[key];

                    if (count > 0)
                    {
                        var poisson = new BestPoisson();
                        var pts = poisson.layout(rc, count);

                        binPts[key] = pts;
                    }
                }
            }
            else if (cp.layout == bps.CustomLayout.squarify)
            {
                var rc = vp.geom.createRect(0, 0, this._itemWidth, this._itemHeight);

                for (var k = 0; k < keys.length; k++)
                {
                    var key = keys[k];
                    var count = this._binCounts[key];

                    if (count > 0)
                    {
                        var squarifyLayout = new SquarifyLayoutClass();
                        var marginBase = dc.width / 5000;
                        if (this._facetHelper)
                        {
                            marginBase *= 5;
                        }

                        var cellMargin = this._view.separationFactor() * marginBase;
                        var xVector = nv.x.values;

                        var cellArray = squarifyLayout.layout(<number[]><any>xVector, rc, cellMargin);
                        var rects = cellArray.map((d) => d.rect);
                        binRects[key] = rects;
                    }
                }
            }

            //---- set the type of layout now (so we don't have to cacl it each time in layoutRecord) ----
            var layoutFunc = null;

            if (cp.layout == bps.CustomLayout.grid)
            {
                layoutFunc = this.gridLayout;
            }
            else if (cp.layout == bps.CustomLayout.map)
            {
                layoutFunc = this.mapLayout;
            }
            else if (cp.layout == bps.CustomLayout.radial)
            {
                layoutFunc = this.radialLayout;
            }
            else if (cp.layout == bps.CustomLayout.random)
            {
                layoutFunc = this.randomLayout;
            }
            else if (cp.layout == bps.CustomLayout.poisson)
            {
                layoutFunc = this.poissonLayout;
            }
            else if (cp.layout == bps.CustomLayout.squarify)
            {
                layoutFunc = this.squarifyLayout;
            }
            this._layoutFunc = layoutFunc;
        }

        preLayoutLoop(dc: DrawContext)
        {
            var options = <SandDensityOptions>this._chartOptions;
            var nv = dc.nvData;

            //---- use pre-computed bins ----
            var xResult = (this._xFacetBinResults.length) ? this._xFacetBinResults[dc.facetIndex] : null;
            var yResult = (this._yFacetBinResults.length) ? this._yFacetBinResults[dc.facetIndex] : null;

            var xBinCount = (xResult) ? xResult.bins.length : 1;
            var yBinCount = (yResult) ? yResult.bins.length : 1;

            var width = dc.width;
            var height = dc.height;

            var hMargin = 2 * dc.itemSize;
            var hBetween = .1 * (dc.width / xBinCount);

            var vMargin = 2 * dc.itemSize;
            var vBetween = .2 * (dc.height / yBinCount);

            this._hMargin = hMargin;
            this._hBetween = hBetween;

            this._vMargin = vMargin;
            this._vBetween = vBetween;

            //---- compute itemWidth and itemHeight ----
            var itemWidth = (width - 2 * hMargin - (xBinCount - 1) * hBetween) / xBinCount;
            var itemHeight = (height - 2 * vMargin - (yBinCount - 1) * vBetween) / yBinCount;

            var ySpace = .1 * itemHeight;
            var binHeight = itemHeight - ySpace;

            this._itemWidth = itemWidth;
            this._itemHeight = itemHeight;

            var maxRecordsInABin = this.assignRecordsToBins(nv, xResult, yResult, dc);
            this._maxCount = maxRecordsInABin;
            var rcBin = vp.geom.createRect(this._binLefts[0], this._binTops[0], this._itemWidth, this._itemHeight);
            this._xglobalmax = Math.max(Math.ceil(Math.sqrt(this._maxCount)), 1);
            this._yglobalmax = Math.max(Math.ceil(this._maxCount / this._xglobalmax), 1);
            this._xspace = this._itemWidth / (this._xglobalmax);
            this._yspace = this._itemHeight / (this._yglobalmax);
            this._space = Math.min(this._xspace, this._yspace);
            var maxShapeSize = Math.min(.85 * this._itemWidth / this._xglobalmax, .85 * this._itemHeight / this._yglobalmax);
            this._maxShapeSize = maxShapeSize;          //   / dc.transformSizeFactor;

        }

        mapLayout(recordIndex: number, dc: DrawContext, dr: bps.LayoutResult, left: number, top: number, width: number, height: number)
        {
            var nv = dc.nvData;
            var cp = <bps.CustomParams>this._view.customParams();

            if (cp.xUsage == bps.CustomColUsage.map)
            {
                dr.x = this.scaleColData(nv.x, recordIndex, dc.scales.x);
            }

            if (cp.yUsage == bps.CustomColUsage.map)
            {
                dr.y = this.scaleColData(nv.y, recordIndex, dc.scales.y);
            }

            if (cp.zUsage == bps.CustomColUsage.map)
            {
                dr.z = this.scaleColData(nv.z, recordIndex, dc.scales.z);
            }

        }

        radialLayout(recordIndex: number, dc: DrawContext, dr: bps.LayoutResult, left: number, top: number, width: number, height: number)
        {
            var nv = dc.nvData;

            var theta = -(Math.PI / 2 + this.scaleColData(nv.x, recordIndex, dc.scales.x));
            var radius = this.scaleColData(nv.y, recordIndex, dc.scales.y);

            //---- cx and cy are the center of the bin that this shape belongs to ----
            var cx = left + this._itemWidth / 2;
            var cy = top - this._itemHeight / 2;

            dr.x = cx + radius * Math.cos(theta);
            dr.y = cy + radius * Math.sin(theta);
        }

        randomLayout(recordIndex: number, dc: DrawContext, dr: bps.LayoutResult, left: number, top: number, width: number, height: number)
        {
            var nv = dc.nvData;

            dr.x = left + width * nv.randomX.values[recordIndex];
            dr.y = top - height * nv.randomY.values[recordIndex];
        }

        squarifyLayout(recordIndex: number, dc: DrawContext, dr: bps.LayoutResult, left: number, top: number, width: number, height: number)
        {
            var binRelativeIndex = this._binRelativeIndexes[recordIndex] - 1;

            var binIndexX = this._binIndexesX[recordIndex];
            var binIndexY = this._binIndexesY[recordIndex];
            var countKey = binIndexX + "," + binIndexY;

            var rects = this._binRects[countKey];
            var rc = rects[binRelativeIndex];

            dr.x = left + rc.left - rc.width/2;
            dr.y = top - rc.top + rc.height/2;

            dr.width = 3*rc.width;
            dr.height = 3*rc.height;
        }

        poissonLayout(recordIndex: number, dc: DrawContext, dr: bps.LayoutResult, left: number, top: number, width: number, height: number)
        {
            var binRelativeIndex = this._binRelativeIndexes[recordIndex] - 1;

            var binIndexX = this._binIndexesX[recordIndex];
            var binIndexY = this._binIndexesY[recordIndex];
            var countKey = binIndexX + "," + binIndexY;

            var pts = this._binPts[countKey];
            var pt = pts[binRelativeIndex];

            dr.x = left + pt[0];
            dr.y = top - pt[1];
        }

        gridLayout(recordIndex: number, dc: DrawContext, dr: bps.LayoutResult, left: number, top: number, width: number, height: number)
        {
            var binRelativeIndex = this._binRelativeIndexes[recordIndex] - 1;

            var binIndexX = this._binIndexesX[recordIndex];
            var binIndexY = this._binIndexesY[recordIndex];
            var countKey = binIndexX + "," + binIndexY;

            var binCount = 0;
            if (this._binCounts[countKey] === undefined) 
            {
                binCount = 0;
            }
            else
            {
                binCount = this._binCounts[countKey];
            }

            var xlocalmax = Math.max(Math.ceil(Math.sqrt(binCount)), 1);
            var ylocalmax = Math.max(Math.ceil(binCount / xlocalmax), 1);

            var maxWidth = xlocalmax * this._space;
            var maxHeight = ylocalmax * this._space;

            var xrel = binRelativeIndex % xlocalmax;
            var yrel = Math.floor(binRelativeIndex / xlocalmax);

            //---- cx and cy are the center of the bin that this shape belongs to ----
            var cx = left + this._itemWidth / 2;
            var cy = top - this._itemHeight / 2;

            dr.x = cx - maxWidth / 2.0 + xrel * this._space;
            dr.y = cy + maxHeight / 2.0 - yrel * this._space;
        }

        layoutDataForRecord(recordIndex: number, dc: DrawContext, dr: bps.LayoutResult)
        {
            var nv = dc.nvData;
            var rowIndex = 0;

            var layoutFilterVector = dc.layoutFilterVector;
            var filtered = (layoutFilterVector && layoutFilterVector[recordIndex]);

            if (!filtered) {
                rowIndex = this._nextIndex++;
            }

            var binIndexX = this._binIndexesX[recordIndex];
            var binIndexY = this._binIndexesY[recordIndex];

            var left = this._binLefts[binIndexX];
            var top = this._binTops[binIndexY];

            //---- predefine with defaults ----
            dr.x = 0;
            dr.y = 0;
            dr.z = 0;
            dr.width = this._maxShapeSize;
            dr.height = dr.width;
            dr.depth = dc.defaultDepth2d   

            dr.colorIndex = this.scaleColData(nv.colorIndex, recordIndex, dc.scales.colorIndex);
            dr.imageIndex = this.scaleColData(nv.imageIndex, recordIndex, dc.scales.imageIndex);

            //---- let layout override defaults it cares about ----
            this._layoutFunc(recordIndex, dc, dr, left, top, this._itemWidth, this._itemHeight);
        }
    }

}
 