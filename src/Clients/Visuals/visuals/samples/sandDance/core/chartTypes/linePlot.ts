//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    linePlot.ts - builds a 2D line plot, with multiple series of lines identified by an "id" column.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    var useLinePrim = true;

    export class LinePlotClass extends BaseGlVisClass
    {
        _ptLast = null;
        _inverseSizeFactor = 0;

        constructor(view: DataViewClass, gl: any, chartState: any, container: HTMLElement, appMgr: AppMgrClass)
        {
            super("linePlotClass", view, gl, chartState, container, appMgr);

            if (useLinePrim)
            {
                this._view.drawingPrimitive(bps.DrawPrimitive.linePairs);
            }
        }

        preLayoutLoop(dc: DrawContext)
        {
            this._ptLast = null;
            this._inverseSizeFactor = 1 / dc.userSizeFactor;    // / dc.combinedSizeFactor;

            //this._uniformsChanged.lines = true;
        }

        positionLine(x1, y1, x2, y2)
        {
            var xdiff = x1 - x2;
            var ydiff = y1 - y2;

            var width = Math.sqrt(xdiff * xdiff + ydiff * ydiff);

            var cx = (x1 + x2) / 2;
            var cy = (y1 + y2) / 2;

            var theta = Math.atan2(ydiff, xdiff);

            return { cx: cx, cy: cy, width: width, theta: theta };
        }

        layoutDataForRecord(i: number, dc: DrawContext, dr: bps.LayoutResult)
        {
            var nv = dc.nvData;
            var scales = dc.scales;

            var sx = this.scaleColData(nv.x, i, scales.x);
            var sy = this.scaleColData(nv.y, i, scales.y);

            var sz = this.scaleColData(nv.size, i, scales.size, 1);

            if (useLinePrim)
            {
                dr.x = sx;
                dr.y = sy;
                dr.width = sz;
                dr.height = dr.width;
            }
            else
            {
                if (this._ptLast == null)
                {
                    dr.x = 0;
                    dr.y = 0;
                    dr.width = 0;
                    dr.height = 0;
                }
                else
                {
                    var result = this.positionLine(sx, sy, this._ptLast.x, this._ptLast.y);

                    dr.x = result.cx;
                    dr.y = result.cy;
                    dr.width = sz * this._inverseSizeFactor * result.width;     // prevent shader from scaling this width
                    dr.height = .005;            // 1;
                    dr.theta = result.theta;

                    ////---- rotate about z ----
                    //var sin = Math.sin(dr.theta);
                    //var cos = Math.cos(dr.theta);
                    //dr.x = dr.x * cos - dr.y * sin;
                    //dr.y = dr.x * sin + dr.y * cos;
                }
            }

            dr.z = -0;     // for correct rotation about Y axis
            dr.depth = dc.defaultDepth2d      // test out 3d cube in a 2d shape

            dr.colorIndex = this.scaleColData(nv.colorIndex, i, scales.colorIndex);
            dr.imageIndex = this.scaleColData(nv.imageIndex, i, dc.scales.imageIndex);

            this._ptLast = { x: sx, y: sy };
        }
    }
}
 