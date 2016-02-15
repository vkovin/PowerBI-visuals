//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    shapeLegend.ts - draws an interactive, discreet shape legend (shape, ticks, labels).
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class shapeLegendClass extends BaseLegendClass 
    {
        _im: bps.ShapeMappingData;
        _isNumeric = false;
        _lastValue = null;
        _colType = "";

        constructor(app: AppClass, rootName: string, bpsHelper: bps.ChartHostHelperClass)
        {
            super(app, rootName, bpsHelper, "shapeLegendTitle", "shapePanelRequest");

            this.rebuildLegend();
        }

        shapeMapping(value?: bps.ShapeMappingData)
        {
            if (arguments.length === 0)
            {
                return this._im;
            }

            this._im = value;
            this.onDataChanged("shapeMapping");

            this.rebuildLegend();
        }

        search(colName: string, value: string)
        {
            this._app.doSearch("Shape", colName, value, value, bps.TextSearchType.exactMatch);
        }

        rebuildLegend()
        {
            var im = this._im;
            var showLegend = (im != null && im.imagePalette != null && im.colName != null && im.colName != "");

            //---- show/hide legend ----
            this.show(showLegend);

            if (showLegend)
            {
                this.measureTextAndSetItemHeight();

                var name = im.colName;

                vp.select(this._titleElem)
                    .text(name)

                var imagePalette = im.imagePalette;
                var breaks = im.breaks;

                var colInfo = this._app.getColInfo(im.colName);
                var colType = colInfo.colType;
                this._colType = colType;
                var isNumeric = (colType != "string");            // number or date
                this._isNumeric = isNumeric;

                this._lastValue = null;
                this._textElems = [];
                this._paletteElements = [];

                this.rebuildLegendEx(im, breaks.length, isNumeric);
            }
        }

        fillLabelEntry(parentW: vp.dom.singleWrapperClass, i: number, yOffset: number)
        {
            var im = this._im;
            var breaks = im.breaks;

            var value = (breaks) ? breaks[i] : "";
            var text = this.formatLabel(value);

            var tooltip = (text == "Other") ? "All other values mapped here" : text;

            var labelW = parentW.append("div")
                .text(text)
                .addClass("legendLabel")
                .css("max-width", "92px")
                .title(tooltip)
                .attach("click", (e) => this.searchForEntryValues(e))

            if (this._isNumeric)
            {
                parentW
                    .css("position", "relative")

                //---- shift labels up and to the right ----
                labelW
                    .css("position", "relative")
                    .css("left", "8px")
                    .css("top", (yOffset - this._entryHeight / 2) + "px")
            }

            //---- add information to support click/select ----
            labelW[0].colName = im.colName;

            if (value == "Other")
            {
                labelW[0].fromValue = this._lastValue;
                labelW[0].toValue = this._lastValue;
                labelW[0].searchType = bps.TextSearchType.greaterThanEqual;
            }
            else if (this._isNumeric)
            {
                labelW[0].fromValue = (i == 0) ? value : this._lastValue;
                labelW[0].toValue = value;
                labelW[0].searchType = bps.TextSearchType.betweenInclusive;
            }
            else
            {
                labelW[0].fromValue = value;
                labelW[0].toValue = value;
                labelW[0].searchType = bps.TextSearchType.exactMatch;
            }

            var colorIndex = i;        // (count - 1) - i;
            this._textElems[colorIndex] = labelW[0];

            this._lastValue = value;
        }


        searchForEntryValues(e)
        {
            var elem = e.target;

            if (elem.imageIndex !== undefined)
            {
                //---- get text element from this image palette entry ----
                elem = this._textElems[elem.imageIndex];
            }

            this._app.doSearch("Image", elem.colName, elem.fromValue, elem.toValue, elem.searchType);
        }

        getImageFromSheet(imgSheet: any, width: number, height: number, index: number)
        {
            var canvasW = vp.select(document.createElement("canvas"))
                .attr("width", width)
                .attr("height", height)

            //---- get drawing context ----
            var canvas = <HTMLCanvasElement>canvasW[0];
            var ctx = canvas.getContext("2d");

            //---- draw the selected shape onto the canvas ----
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(imgSheet, index * width, 0, width, height, 0, 0, width, height);

            return canvas;
        }

        fillPaletteEntry(paletteW: vp.dom.singleWrapperClass, i: number, isTop: boolean)
        {
            var entryWidth = this._entryWidth;
            var entryHeight = this._entryHeight;
            var breaks = this._im.breaks;
            var count = breaks.length;
            var im = this._im;

            //---- STEPS ----
            //if (count * entryHeight > this._maxPaletteHeight)
            //{
            //    entryHeight = this._maxPaletteHeight / count;
            //}

            //---- build image as imageSheet ----
            var textureMaker = new beachParty.textureMakerClass(im.imagePalette);
            textureMaker.buildShapeMakers(im.imagePalette);

            var drawShapeSize = 32;
            var imgSheet = textureMaker.createShapeImages(drawShapeSize, 3);

            var imgIndex = i;

            var text = (breaks) ? breaks[i] : "";

            //---- get image from imageSheet ----
            var canvas = this.getImageFromSheet(imgSheet, drawShapeSize, drawShapeSize, i);

            var cellW = paletteW.append("div")
                .css("width", (entryWidth) + "px")
                .css("height", (entryHeight) + "px")
                .addClass("imagePaletteEntry")
                .customAttr("value", text)
                .attach("click", (e) => this.searchForEntryValues(e))
                //.css("margin-bottom", "-1px")           // overlap with next top border
                .css("position", "relative")

            cellW[0].imageIndex = (this._isNumeric) ? (i + 1) : i;

            //---- now draw the image within the cell ----
            var shapeSize = entryWidth - 2;

            var left = (entryWidth - shapeSize) / 2;
            var top = (entryHeight - shapeSize) / 2;

            var shape = cellW.append("img")
                .addClass("imagePaletteShape")
                .css("width", shapeSize + "px")
                .css("height", shapeSize + "px")
                .css("display", "inline-block")
                .css("left", left + "px")
                .css("top", top + "px")
                .css("position", "absolute")
                .attr("src", canvas.toDataURL())
        }
    }
}

