//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    xBand.ts - builds a horizontal rug plot (a 1D scatterplot)
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class XBandClass extends BaseGlVisClass
    {
        _maxShapeSize = 0;
        _halfSizeSize = 0;
        _z = 0;

        constructor(view: DataViewClass, gl: any, chartState: any, container: HTMLElement, appMgr: AppMgrClass)
        {
            super("scatterPlotClass", view, gl, chartState, container, appMgr);

            this._hideAxes = "y";
        }

        computeFacetStats(dc: DrawContext, nvFacetBuckets: any[])
        {
            //---- this call modifies the PREPASS scales (for use by the chart frame) ----
            this.modifyXYScales(dc);

            return dc.filteredRecordCount;
        }

        modifyXYScales(dc: DrawContext, halfShapeSize?: number)
        {
            //---- add spacing on both sides of X and Y scales to keep shapes within the borders ----
            if (!halfShapeSize)
            {
                halfShapeSize = (dc.maxShapeSize / 2);      //  * dc.transformSizeFactor;       //  dc.combinedSizeFactor;

                //---- this is not yet correct, but getting closer ----
                //halfShapeSize *= .8;           .3;
            }

            //---- note: expandSpace() for scale in specifed in range units (world units, in this case) ----
            dc.scales.x
                .expandSpace(halfShapeSize);

            dc.scales.y
                .expandSpace(halfShapeSize);

            this._halfSizeSize = halfShapeSize;
        }

        preLayoutLoop(dc: DrawContext)
        {
            //---- this call modifies the FINAL scales (for use by our X/Y mapping) ----
            this.modifyXYScales(dc, this._halfSizeSize);

            this._maxShapeSize = dc.maxShapeSize;     

            //---- place our 2D place in middle of Z space ----
            this._z =  dc.z + dc.depth/2; 
        }

        /** "bufferIndex" in the 0-based indexed into the sorted data buffers. */
        layoutDataForRecord(bufferIndex: number, dc: DrawContext, dr: bps.LayoutResult)
        {
            var nv = dc.nvData;
            var scales = dc.scales;

            dr.x = this.scaleColData(nv.x, bufferIndex, scales.x);
            dr.y = 0;
            dr.z = this._z;         // for correct rotation about Y axis

            var usingShape = (this._view.shapeImageName() != "none");
            if (usingShape)
            {
                dr.height = this._maxShapeSize * this.scaleColData(nv.size, bufferIndex, scales.size, 1);
                dr.width = dr.height;
            }
            else
            {
                dr.height = 30 * this._maxShapeSize;
                dr.width = .1 * this._maxShapeSize;
            }

            dr.depth = dc.defaultDepth2d   

            dr.colorIndex = this.scaleColData(nv.colorIndex, bufferIndex, scales.colorIndex);
            dr.imageIndex = this.scaleColData(nv.imageIndex, bufferIndex, dc.scales.imageIndex);
        }
    }
}
 