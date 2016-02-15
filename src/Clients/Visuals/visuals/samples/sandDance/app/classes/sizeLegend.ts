//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    sizeLegend.ts - draws an interactive, continuous/discreet size legend (size palette, ticks, labels).
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class SizeLegendClass extends BaseLegendClass
    {
        _sm: bps.SizeMappingData;
        _bpsHelper: bps.ChartHostHelperClass;
        _app: AppClass;                 // need to get latest ColInfo on legend build
        _isNumeric = false;
        _lastValue = null;

        constructor(app: AppClass, rootName: string, bpsHelper: bps.ChartHostHelperClass)
        {
            super(app, rootName, bpsHelper, "sizeLegendTitle", "sizePanelRequest");

            this.rebuildLegend();
        }

        sizeMapping(value?: bps.SizeMappingData)
        {
            if (arguments.length === 0)
            {
                return this._sm;
            }

            this._sm = value;
            this.onDataChanged("sizeMapping");

            this.rebuildLegend();
        }

        search(colName: string, value: string)
        {
            this._app.doSearch("Size", colName, value, value, bps.TextSearchType.exactMatch);
        }

        rebuildLegend()
        {
            var sm = this._sm;
            var showLegend = (sm != null && sm.sizePalette != null && sm.colName != null && sm.colName != "");

            //---- show/hide legend ----
            this.show(showLegend);

            if (showLegend)
            {
                var name = sm.colName;

                vp.select(this._titleElem)
                    .text(name)

                this.measureTextAndSetItemHeight();

                var sizePalette = sm.sizePalette;
                var breaks = sm.breaks;

                var count = sizePalette.length;
                if (breaks && breaks.length < count)
                {
                    count = breaks.length;
                }

                var colInfo = this._app.getColInfo(sm.colName);
                var isNumeric = (colInfo.colType != "string");            // number or date
                this._isNumeric = isNumeric;

                this._lastValue = null;
                this._textElems = [];
                this._paletteElements = [];

                this.rebuildLegendEx(sm, breaks.length, this._isNumeric);
            }
        }

        searchForEntryValues(e)
        {
            var elem = e.target;

            if (elem.sizeIndex !== undefined)
            {
                //---- get text element from this size palette entry ----
                elem = this._textElems[elem.sizeIndex];
            }

            this._app.doSearch("Size", elem.colName, elem.fromValue, elem.toValue, elem.searchType);
        }

        fillPaletteEntry(parentW: vp.dom.singleWrapperClass, i: number, isTop: boolean)
        {
            //---- TODO: continuous size palette not yet supported ---
            var cm = this._sm;
            var sizePalette = cm.sizePalette;
            var breaks = cm.breaks;
            var entryHeight = this._entryHeight;
            var entryWidth = this._entryWidth;
            var isNumeric = this._isNumeric;

            var sz = vp.scales.numberFromDiscretePalette(sizePalette, i);
            var text = (breaks) ? breaks[i] : "";

            //parentW.css("position", "relative")

            var cellW = parentW.append("div")
                .css("width", (entryWidth-2) + "px")
                .css("height", (entryHeight-2) + "px")
                .addClass("sizePaletteEntry")
                .customAttr("value", text)
                .attach("click", (e) => this.searchForEntryValues(e))
                .css("margin-bottom", "-1px")           // overlap with next top border
            //.css("display", "table-cell")
                .css("position", "relative")

            cellW[0].sizeIndex = (isNumeric) ? (i + 1) : i;

            //---- now draw the size shape within the cell ----
            var shapeSize = sz * (entryWidth - 4);
            var left = ((entryWidth - 2) - shapeSize) / 2;
            var top = ((entryHeight - 2) - shapeSize) / 2;

            var shape = cellW.append("span")
                .addClass("sizePaletteShape")
                .css("width", shapeSize + "px")
                .css("height", shapeSize + "px")
                .css("background", "#bbb")
                .css("display", "inline-block")
                .css("margin-top", top + "px")
                .css("margin-left", left + "px")
        }

        fillLabelEntry(parentW: vp.dom.singleWrapperClass, i: number, yOffset: number)
        {
            var cm = this._sm;
            var sizePalette = cm.sizePalette;
            var breaks = cm.breaks;
            var entryHeight = this._entryHeight;
            var entryWidth = this._entryWidth;
            var isNumeric = this._isNumeric;

            var value = (breaks) ? breaks[i] : "";
            var text = this.formatLabel(value);

            var tooltip = (text == "Other") ? "All other values mapped here" : text;

            var labelW = parentW.append("div")
                .text(text)
                .addClass("legendLabel")
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

            labelW[0].colName = cm.colName;
            var lastValue = this._lastValue;

            if (value == "Other")
            {
                labelW[0].fromValue = lastValue;
                labelW[0].toValue = lastValue;
                labelW[0].searchType = bps.TextSearchType.greaterThan;
            }
            else if (isNumeric)
            {
                labelW[0].fromValue = (i == 0) ? value : lastValue;
                labelW[0].toValue = value;
                labelW[0].searchType = bps.TextSearchType.betweenInclusive;
            }
            else
            {
                labelW[0].fromValue = value;
                labelW[0].toValue = value;
                labelW[0].searchType = bps.TextSearchType.exactMatch;
            }

            var sizeIndex = i;        // (count - 1) - i;
            this._textElems[sizeIndex] = labelW[0];

            this._lastValue = value;
            //textTop -= entryHeight;
        }
    }
}
