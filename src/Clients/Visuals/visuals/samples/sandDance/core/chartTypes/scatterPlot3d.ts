//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    scatterplot3d.ts - builds a 3D scatter plot.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class ScatterPlot3dClass extends BaseGlVisClass
    {
        _maxShapeSize = 0;

        constructor(view: DataViewClass, gl: any, chartState: any, container: HTMLElement, appMgr: AppMgrClass)
        {
            super("scatterPlot3dClass", view, gl, chartState, container, appMgr);

            var transformMgr = this._view.getTransformMgr();

            //---- zoom camera out a bit so we can see full bounding box ----
            transformMgr.scaleCameraRelative(1 / 1.3, { x: 0, y: 0 });
        }

        preLayoutLoop(dc: DrawContext)
        {
            this._maxShapeSize = dc.maxShapeSize;       //  chartUtils.getScatterShapeSize(dc);
        }

        layoutDataForRecord(i: number, dc: DrawContext, dr: bps.LayoutResult)
        {
            var nv = dc.nvData;
            var scales = dc.scales;

            dr.x = this.scaleColData(nv.x, i, scales.x);
            dr.y = this.scaleColData(nv.y, i, scales.y);
            dr.z = this.scaleColData(nv.z, i, scales.z);

            dr.width = this._maxShapeSize * this.scaleColData(nv.size, i, scales.size, 1);
            dr.height = dr.width;
            dr.depth = dr.width;          // .1 / dc.combinedSizeFactor;

            dr.colorIndex = this.scaleColData(nv.colorIndex, i, scales.colorIndex);
            dr.imageIndex = this.scaleColData(nv.imageIndex, i, dc.scales.imageIndex);
        }
    }
}
 