//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    drawSvg - draws child elements of an SVG parent onto the specified canvas.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export function drawSvgChildren(ctx: CanvasRenderingContext2D, parent: SVGSVGElement, xOffset = 0, yOffset = 0)
    {
        var flipY = false;

        //---- offset all children by the location of the group ----
        if (parent.tagName == "g")
        {
            if (false)
            {
                var rc = parent.getBoundingClientRect();
                xOffset = rc.left;
                yOffset = (flipY) ? (innerHeight - rc.top) : rc.top;         // flipped

                //vp.utils.debug("group: xOffset=" + xOffset + ", yOffset=" + yOffset +
                //    ", childCount=" + parent.childElementCount  +", id=" + parent.id);
            }
            else
            {
                var transform = parent.getAttribute("transform");
                if (transform)
                {
                    var str = transform.substr(10, transform.length - 11);
                    if (str && str != "" && str != "0")
                    {
                        var parts = str.split(" ");
                        var xt = +parts[0];
                        var yt = +parts[1];

                        xOffset += xt;
                        yOffset += (flipY) ? (innerHeight - yt) : yt;          // flipped
                    }
                }
            }
        }

        for (var i = 0; i < parent.childElementCount; i++)
        {
            var child = <SVGSVGElement>parent.childNodes[i];

            var isHidden = false;
            if (child.getAttribute)
            {
                isHidden = (child.getAttribute("visibility") == "hidden");
            }
            if (!isHidden && child.style)
            {
                isHidden = (child.style.visibility == "hidden");
            }

            if (!isHidden)
            {
                drawSvgElement(ctx, child, xOffset, yOffset, false);

                if (child.childElementCount > 0)
                {
                    drawSvgChildren(ctx, child, xOffset, yOffset);
                }
            }
        }
    }

    function drawSvgElement(ctx: CanvasRenderingContext2D, elem: SVGSVGElement, xOffset: number, yOffset: number, flipY: boolean)
    {
        var tagName = elem.tagName;

        if (tagName != "g" && tagName !== undefined)
        {
            //vp.utils.debug("drawSvgElement: elem.tagName=" + tagName);

            if (elem.getBBox || elem.getBoundingClientRect)
            {
                var elemW = vp.select(elem);

                //var rc = elemW.getBounds(false);
                var rc = elem.getBoundingClientRect();

                if (rc.width)
                {
                    if (tagName == "text" && elem.textContent)
                    {
                        var style = getComputedStyle(elem);
                        var text = elem.firstChild.textContent;         // otherwise we get doubled text

                        //---- draw border of element ----
                        //ctx.strokeStyle = "gray";
                        //var left = rc.left;
                        //var top = rc.top - 12;          // todo: compute this based on font size, text offset...
                        //ctx.strokeRect(left, top, rc.width, rc.height);

                        //vp.utils.debug("   text=" + text);

                        ctx.font = style.fontSize + " " + style.fontFamily;
                        ctx.fillStyle = style.fill;
                        ctx.strokeStyle = style.stroke;
                        ctx.globalAlpha = +style.opacity;
                        var left = rc.left;
                        var top = rc.top;   // + 12;

                        ctx.fillText(text, left, top);
                    }
                    else if (tagName == "line")
                    {
                        var style = getComputedStyle(elem);
                        yOffset -= 12;      // why??

                        var x1 = +elem.getAttribute("x1");
                        var x2 = +elem.getAttribute("x2");

                        //----- on lines, the Y values are flipped ----
                        var y1 = +elem.getAttribute("y1");
                        var y2 = +elem.getAttribute("y2");

                        if (flipY)
                        {
                            y1 = innerHeight - y1;
                            y2 = innerHeight - y2;
                        }

                        x1 += xOffset;
                        x2 += xOffset;
                        y1 += yOffset;
                        y2 += yOffset;

                        ctx.fillStyle = style.fill;
                        ctx.strokeStyle = style.stroke;
                        ctx.lineWidth = +style.strokeWidth;
                        ctx.globalAlpha = +style.opacity;

                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                    else if (tagName == "rect")
                    {
                        var style = getComputedStyle(elem);
                        yOffset -= 12;      // why??

                        var x = +elem.getAttribute("x");
                        var y = +elem.getAttribute("y");
                        var width = +elem.getAttribute("width");
                        var height = +elem.getAttribute("height");

                        if (flipY)
                        {
                            y = innerHeight - y;
                        }

                        ////---- why are these adjustments needed for rects? ----
                        x += xOffset;
                        y += yOffset;

                        ctx.fillStyle = style.fill;
                        ctx.strokeStyle = style.stroke;
                        ctx.lineWidth = +style.strokeWidth;
                        ctx.globalAlpha = +style.opacity;

                        if (style.fill != "none")
                        {
                            ctx.fillRect(x, y, width, height);
                        }

                        if (style.stroke != "none")
                        {
                            ctx.strokeRect(x, y, width, height);
                        }
                    }
                }
            }
        }
    }
}