//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    drawHtml - draws the specified element and all of its children  of an HTML or SVG parent onto the specified canvas.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export function drawHtmlChildren(ctx: CanvasRenderingContext2D, parent: HTMLElement, drawInfo?: any)
    {
        if (parent)
        {
            var className = parent.getAttribute("class");
            if (className != "numAdjuster")
            {
                drawHtmlElement(ctx, parent, drawInfo);

                for (var i = 0; i < parent.childElementCount; i++)
                {
                    var child = <HTMLElement>parent.children[i];
                    drawHtmlChildren(ctx, child, drawInfo);
                }
            }
        }
    }

    function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number)
    {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    function isSizeSet(str: string)
    {
        return (str != null && str != "" && str != "0" && str != "0px");
    }

    function toNum(str: string)
    {
        if (str.endsWith("px"))
        {
            str = str.substr(0, str.length - 2);
        }

        var value = +str;
        return value;
    }

    function drawHtmlElement(ctx: CanvasRenderingContext2D, elem: HTMLElement, drawInfo: any)
    {
        var rc = elem.getBoundingClientRect();
        var style = getComputedStyle(elem);

        ctx.lineWidth = +style.strokeWidth;
        ctx.globalAlpha = +style.opacity;

        //vp.utils.debug("tag: " + elem.tagName);

        if (style.backgroundColor != null && style.backgroundColor != "")
        {
            //---- bg color ----
            ctx.fillStyle = style.backgroundColor;
            ctx.fillRect(rc.left, rc.top, rc.width, rc.height);
        }

        if (isSizeSet(style.borderLeftWidth))
        {
            //---- border LEFT ----
            ctx.strokeStyle = style.borderLeftColor;
            ctx.lineWidth = +style.borderLeftWidth;

            drawLine(ctx, rc.left, rc.top, rc.left, rc.bottom);
        }

        if (isSizeSet(style.borderTopWidth))
        {
            //---- border TOP ----
            ctx.strokeStyle = style.borderTopColor;
            ctx.lineWidth = +style.borderTopWidth;

            drawLine(ctx, rc.left, rc.top, rc.right, rc.top);
        }

        if (isSizeSet(style.borderRightWidth))
        {
            //---- border RIGHT ----
            ctx.strokeStyle = style.borderRightColor;
            ctx.lineWidth = +style.borderRightWidth;

            drawLine(ctx, rc.right, rc.top, rc.right, rc.bottom);
        }

        if (isSizeSet(style.borderBottomWidth))
        {
            //---- border BOTTOM ----
            ctx.strokeStyle = style.borderBottomColor;
            ctx.lineWidth = +style.borderBottomWidth;

            drawLine(ctx, rc.left, rc.bottom, rc.right, rc.bottom);
        }

        ctx.strokeStyle = style.stroke;
        ctx.fillStyle = style.color;

        if (elem.tagName == "IMG" && rc.width > 0 && rc.height > 0)
        {
            var src = elem.getAttribute("src");
            var imgElm = <HTMLImageElement>elem;

            ctx.drawImage(imgElm, rc.left, rc.top, rc.width, rc.height);
        }

        if (elem.textContent && elem.childElementCount == 0)
        {
            var padLeft = toNum(style.paddingLeft);
            var padTop = toNum(style.paddingTop);
            var padRight = toNum(style.paddingRight);
            var padBot = toNum(style.paddingBottom);

            //---- adjust rc by padding ----
            rc = vp.geom.createRect(rc.left + padLeft, rc.top + padTop,
                Math.max(0, rc.width - padLeft - padRight),
                Math.max(0, rc.height - padTop - padBot));

            //vp.utils.debug("  text=" + elem.textContent);
            var left = rc.left;
            var top = rc.top;       

            if (style.verticalAlign == "baseline")
            {
                top += .70 * rc.height;         // .65
            }

            var textAlign = style.textAlign;
            ctx.textAlign = "left";

            if (textAlign && textAlign != "left")
            {
                ctx.textAlign = textAlign;

                if (textAlign == "center")
                {
                    left += rc.width / 2;
                }
                else if (textAlign == "right")
                {
                    left = rc.right;
                }
            }

            var transform = style.transform;
            var isRotated = (transform.startsWith("matrix"));
            if (isRotated)
            {
                ctx.save();

                var matStr = transform.substr(7, transform.length - 8);
                var mm = matStr.split(",");

                for (var i = 0; i < 6; i++)
                {
                    mm[i] = mm[i].trim();
                }

                //---- doesn't work ----
                //ctx.translate(left, top);
                //ctx.setTransform(+mm[0], +mm[1], +mm[2], +mm[3], +mm[4], +mm[5]);

                //---- works (hardcode the rotation = -90 degrees ----
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.translate(drawInfo.tx + left, drawInfo.ty + top - 20);      // -20 is fudge factor
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = "center";

                left = 0;
                top = 0;
            }

            ctx.font = style.fontSize + " " + style.fontFamily;
            ctx.fillText(elem.textContent, left, top);

            if (isRotated)
            {
                ctx.restore();
            }
        }
    }
}