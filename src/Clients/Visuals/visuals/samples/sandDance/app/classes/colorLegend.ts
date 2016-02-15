//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    colorLegend.ts - draws an interactive, continuous/discreet color legend (color palette, ticks, labels).
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class ColorLegendClass extends BaseLegendClass
    {
        private container: HTMLElement;

        _paletteElements: HTMLElement[];
        _continuousPalette: HTMLElement;

        _cm: bps.ColorMappingData;
        _bpsHelper: bps.ChartHostHelperClass;
        _app: AppClass;                 // need to get latest ColInfo on legend build
        _colType: string;
        _isNumeric: boolean;
        _lastValue = null;

        constructor(container: HTMLElement, app: AppClass, rootName: string, bpsHelper: bps.ChartHostHelperClass)
        {
            super(app, rootName, bpsHelper, "colorLegendTitle", "colorPanelRequest");

            this.rebuildLegend();
        }

        selectColorBox(index: number)
        {
            var elems = this._paletteElements;
            if (elems && elems.length)
            {
                if (index < 0)
                {
                    index += elems.length;
                }
                else
                {
                    //---- true elements start at index=1 ----
                    index++;
                }

                var elem = elems[index];
                var e = { target: elem };

                this.searchForEntryValues(e);
            }
        }

        colorMapping(value?: bps.ColorMappingData)
        {
            if (arguments.length === 0)
            {
                return this._cm;
            }

            this._cm = value;
            this.onDataChanged("colorMapping");

            this.rebuildLegend();
        }

        rebuildLegend()
        {
            var cm = this._cm;
            var showLegend = (cm != null && cm.colorPalette != null && cm.colName != null && cm.colName != "");

            //---- show/hide legend ----
            this.show(showLegend);

            if (showLegend)
            {
                this.measureTextAndSetItemHeight();

                var name = cm.colName;

                vp.select(this.container, this._titleElem)
                    .text(name)

                if (this._continuousPalette)
                {
                    vp.select(this._continuousPalette).remove();
                    this._continuousPalette = null;
                }

                var colorPalette = cm.colorPalette;
                var breaks = cm.breaks;

                var count = colorPalette.length;
                if (breaks && breaks.length < count)
                {
                    count = breaks.length;
                }

                var colInfo = this._app.getColInfo(cm.colName);
                var colType = colInfo.colType;

                this._colType = colType;
                this._isNumeric = (colInfo.colType != "string");            // number or date

                this._lastValue = null;
                this._textElems = [];
                this._paletteElements = [];

                this.rebuildLegendEx(cm, breaks.length, this._isNumeric);
            }
        }

        search(colName: string, value: string)
        {
            this._bpsHelper.search(colName, value);
        }

        searchForEntryValues(e)
        {
            var elem = e.target;

            if (elem.colorIndex !== undefined)
            {
                //---- get text element from this color palette entry ----
                elem = this._textElems[elem.colorIndex];
            }

            this._app.doSearch("Color", elem.colName, elem.fromValue, elem.toValue, elem.searchType);
        }

        buildContinuousPaletteDiv(tdW: vp.dom.IWrapperOuter)
        {
            var cm = this._cm;
            var colorPalette = cm.colorPalette;
            var count = colorPalette.length;

            //---- as a workaround to appending it to the TD of first row (with rowSpan=999), which produces weird layout issues ----
            //---- we just plop it down as child of holderParent, using absolute positioning. ----
            var holderParentW = vp.select(this.container, this._holderParent);

            var paletteW = holderParentW.prepend("div")
                .css("position", "absolute")
                .css("left", "1px")         // place within border
                .css("top", "0px")

            var lg = "linear-gradient(";
            //---- go thru backwards, since we want the LIGHT colors at the top (and client palettes start with DARK) ----
            for (var i = count - 1; i >= 0; i--)
            {
                if (i != count - 1)
                {
                    lg += ",";
                }

                var cr = vp.color.colorFromPalette(colorPalette, i);
                lg += cr;
            }

            lg += ")";

            var paletteHeight = Math.min(this._maxPaletteHeight, this._entryHeight * count);
            //entryHeight = paletteHeight / count;

            //---- CONTINUOUS ----
            paletteW
                .css("background", lg)
                .css("height", paletteHeight + "px")
                .css("width", this._entryWidth + "px")
                //.css("cursor", "pointer")
                .css("pointer-events", "none")
                //.addClass("colorPaletteEntry")

            return paletteW[0];
        }

        fillPaletteEntry(parentW: vp.dom.singleWrapperClass, i: number, isTop: boolean)
        {
            var cm = this._cm;
            var colorPalette = cm.colorPalette;
            var breaks = cm.breaks;

            var cr = vp.color.colorFromPalette(colorPalette, i);
            var text = (breaks) ? breaks[i] : "";

            if (cm.isContinuous)
            {
                //---- we will overlay this, so don't draw a color ----
                cr = "transparent";
            }

            //---- this will overlay the regular palette, but it will still be used for hit-testing ----
            if (isTop && cm.isContinuous)
            {
                this._continuousPalette = this.buildContinuousPaletteDiv(parentW);
                this._paletteElements[i] = this._continuousPalette;
            }

            var colorEntryW = parentW.append("div")
                .css("background-color", cr)
                .addClass("colorPaletteEntry")
                .css("width", this._entryWidth + "px")
                .css("height", (this._entryHeight - 2) + "px")          // allow for mouseover, mousedown border without movement
                .customAttr("value", text)
                .attach("click", (e) => this.searchForEntryValues(e))

            colorEntryW[0].colorIndex = (this._isNumeric) ? (i + 1) : i;
            this._paletteElements[i] = colorEntryW[0];

        }

        fillLabelEntry(parentW: vp.dom.singleWrapperClass, i: number, yOffset: number)
        {
            var cm = this._cm;
            var breaks = cm.breaks;

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
            labelW[0].colName = cm.colName;

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
    }
}
 
 