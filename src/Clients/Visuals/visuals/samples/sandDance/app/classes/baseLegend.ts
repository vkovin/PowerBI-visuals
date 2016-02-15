//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    baseLegend.ts - base class for BeachParty interactive legends.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class BaseLegendClass extends beachParty.DataChangerClass
    {
        private container: HTMLElement;

        //---- legend sizes ----
        _maxPaletteHeight = 400;
        _entryHeight = 0;               // dynamically set to match font
        _entryWidth = 20;
        _labelVertOffset = 0;

        _root: HTMLElement;
        _titleElem: HTMLElement;
        _paletteElem: HTMLElement;
        _labelsElem: HTMLElement;
        _ticksElem: HTMLElement;
        _textElems: HTMLElement[];
        _legendTable: HTMLElement;
        _holderParent: HTMLElement;

        _paletteElements: HTMLElement[];

        _md: bps.MappingData;
        _bpsHelper: bps.ChartHostHelperClass;
        _app: AppClass;                 // need to get latest ColInfo on legend build
        _formatter: any;

        constructor(app: AppClass, container: HTMLElement, rootName: string, bpsHelper: bps.ChartHostHelperClass, titleElemName: string,
            openPanelMethodName: string)
        {
            super();

            this._app = app;

            this.container = container;

            this._md = null;
            this._bpsHelper = bpsHelper;

            var root = vp.select(container, "." + rootName)
                .addClass("legend")
                .css("position", "relative")

            //---- add colName as TITLE ----
            var title = root.append("div")
                .addClass("legendTitle textButton")
                .id(titleElemName)
                .css("position", "relative")
                .css("top", "0px")
                .css("left", "-8px")
                .attach("click", (e) =>
                {
                    AppUtils.callPanelOpen(e, (e) => this.onDataChanged(openPanelMethodName));
                });

            //---- create a parent for the table, so we can position the continuous palette using it ----
            var holderParentW = root.append("div")
                .css("position", "relative")

            this._holderParent = holderParentW[0];

            var legendTableW = holderParentW.append("table")
                .addClass("legendHolder")
                .attr("cell-spacing", "0")
                .attr("cell-padding", "0")

            this._root = root[0];
            this._titleElem = title[0];

            this._legendTable = legendTableW[0];
        }

        show(value: boolean)
        {
            vp.select(this._root)
                .css("display", (value) ? "" : "none")
        }

        measureTextAndSetItemHeight()
        {
            //---- measure font & set _entryHeight accordingly ----
            var tempW = vp.select(/*document.body*/this.container).append("div")
                .addClass("legendLabel")
                .css("position", "absolute")
                .css("opacity", "0")
                .text("wWgtyTZ");           // some text to measure with

            var rc = tempW.getBounds(null);
            tempW.remove();

            var entryHeight = Math.ceil(6 + rc.height);
            this._entryHeight = entryHeight;
        }

        buildLabelFormatter()
        {
            var md = this._md;
            var formatter = null;

            if (md && md.breaks)
            {
                var colInfo = this._app.getColInfo(md.colName);
                var colType = colInfo.colType;

                var minValue = md.breaks[0];
                var maxValue = md.breaks[md.breaks.length - 1];

                if (colType == "number")
                {
                    //TODO: write and use createNumFormatterFromrange() 
                    formatter = <any>vp.formatters.createNumFormatterFromRange(minValue, maxValue, md.breaks.length);
                }
                else if (colType == "date")
                {
                    formatter = vp.formatters.createDateFormatterFromRange(minValue, maxValue, md.breaks.length);
                }
                else
                {
                    formatter = null;
                }
            }

            this._formatter = formatter;
        }

        formatLabel(value: any)
        {
            var text = value;

            if (this._formatter)
            {
                text = this._formatter(text);
            }

            if (text == "")
            {
                text = /*appClass.instance*/this._app._blankValueStr;
            }

            return text;
        }

        rebuildLegendEx(md: bps.MappingData, breakCount: number, isNumeric: boolean)
        {
            this._md = md;

            //---- adjust bottom margin of title ----
            vp.select(this._titleElem).css("margin-bottom", (isNumeric) ? ((.35 * this._entryHeight) + "px") : "0px");

            var tableW = vp.select(this._legendTable)
                .clear();

            var lastIndex = (isNumeric) ? (breakCount - 1) : (breakCount - 1);

            this.buildLabelFormatter();

            //---- need to process in ascending value order so that each item can refer to its previous item ---
            //---- and build the click/selection information correctly.  therefore, we insert rows at start each time. ----
            for (var i = 0; i <= lastIndex; i++)
            {
                var rowW = tableW.prepend("tr")

                //---- add the TD's ----
                var paletteW = rowW.append("td")
                    .css("padding", "0")

                var tickW = rowW.append("td").css("padding", "0");
                var labelW = rowW.append("td").css("padding", "0");

                var isTop = (i == lastIndex);

                if (isNumeric)
                {
                    //---- NUMERIC AXIS ----
                    if (i > 0)
                    {
                        this.fillPaletteEntry(paletteW, i - 1, isTop);
                        this.fillTickEntry(tickW, i - 1);
                    }

                    var yOffset = (isNumeric && i == 0) ? +1 : 0;
                    this.fillLabelEntry(labelW, i, yOffset);
                }
                else
                {
                    //---- CATEGORY AXIS ----
                    this.fillPaletteEntry(paletteW, i, isTop);
                    this.fillTickEntry(tickW, i);
                    this.fillLabelEntry(labelW, i, 0);
                }
            }
        }

        fillPaletteEntry(paletteW: vp.dom.singleWrapperClass, i: number, isTop: boolean)
        {
        }

        fillTickEntry(parentW: vp.dom.singleWrapperClass, i: number)
        {
            var tickW = parentW.append("div")
                .addClass("legendTick")
                .css("height", (this._entryHeight - 2) + "px")

            if (i == 0)
            {
                tickW.css("border-bottom", "1px solid #777");
            }
        }

        fillLabelEntry(labelW: vp.dom.singleWrapperClass, i: number, yOffset: number)
        {
        }

   }
}
 
 