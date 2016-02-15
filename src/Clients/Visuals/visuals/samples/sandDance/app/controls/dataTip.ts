//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    dataTip.ts - control that displays text from record that is positioned over.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class DataTipClass extends BaseAppControlClass
    {
        private dataTipMgr: DataTipMgrClass;
        private application: AppClass;
        private container: HTMLElement;
        private settings: AppSettingsMgr;

        _img: HTMLImageElement;
        _text: HTMLDivElement;

        //---- datatip PARAMS ----
        _title: string;
        _columnNames: string[]          // if bound to 1 or more columns
        _includeNames: boolean;         // if "name: " should be prefixed to each column value

        _bpsHelper: bps.ChartHostHelperClass;
        _dataTipOffset = null;          // where mouse/pointer clicked on the datatip
        _primaryKey: string;            // if bound to a specific record
        _plotBounds: any;
        _ptMouseDown: any;              // screen coordinates of mouse when we clicked on tooltip
        _isRealDrag = false;            // true if datatip has been dragged more than just accidental movement during a click
        //_dataTipPanel: DataTipPanelClass;

        constructor(dataTipMgr: DataTipMgrClass, application: AppClass, settings: AppSettingsMgr, container: HTMLElement, parentElem: HTMLElement, bpsHelper: bps.ChartHostHelperClass)
        {
            super();

            this.dataTipMgr = dataTipMgr;
            this.application = application;
            this.settings = settings;
            this.container = container;

            this._bpsHelper = bpsHelper;

            //---- build control ----
            var rootW = vp.select(parentElem).append("div")
                .addClass("dataTipContainer")
                .css("position", "absolute")
                .css("z-index", "999");
                // .attach("contextmenu", (e) =>
                // {
                //     this.showContextMenu(e);
                // });

            //---- create image to drag with mouse movements ----
            var imgW = rootW.append("div")
                .addClass("dataTipDragger")
                .addClass("fnDragDataTip")
                .css("width", "20px")
                .css("z-index", "999");

            imgW.element()
                .addEventListener("mousedown", (e) => this.onMouseDown(e));

            //---- create associated TEXT window ----
            var textW = rootW.append("div")
                .addClass("dataTipText")
                .css("position", "relative")
                .css("bottom", "40px")                  // a space of about 20 pixels between text & img
                .css("left", "-1px")
                .attach("mousedown", (e) =>
                {
                    //TODO: remove it.
                });

            this._root = rootW[0];
            this._img = imgW[0];
            this._text = textW[0];

            //---- save pointer this dataTip instance ----
            rootW[0].control = this;
        }

        showContextMenu(e)
        {
            var items =
                [
                    //new MenuItemData("Properties", "Open the properties panel for this data tip"),
                    new MenuItemData("Delete", "Delete this data tip"),
                ];

            var pm = new PopupMenuClass(this.application, this.container, null, "pmInsights", items, (e, menu, textIndex, menuIndex) =>
            {
                var name = (<MenuItemData> items[menuIndex]).text;

                if (name === "Delete")
                {
                    this.dataTipMgr.closeDataTip(this);
                }
//                 else if (name === "Properties")
//                 {
//                     this._dataTipPanel = new DataTipPanelClass(this.application, this.settings, this.container, this);
// 
//                     var rc = vp.select(this._img).getBounds(false);
//                     this._dataTipPanel.show(rc.right, rc.bottom);
//                 }

            }, true);

            var pt = vp.events.mousePosition(e);
            pm.showAt(pt.x, pt.y);
        }

        onMouseDown(e)
        {
            if (e.which === 1)
            {
                //---- LEFT CLICK ----
                var offset = vp.events.mousePosition(e, this._img);

                //---- adjust for some offset around icon ----
                //offset.x -= 4;
                offset.y -= 0;

                this.startDrag(e, offset);

                vp.events.cancelEventBubble(e);
                vp.events.cancelEventDefault(e);
            }
            //else if (e.which == 3)
            //{
            //    //---- RIGHT CLICK ----
            //    this.close();           
            //}

        }

        getPlotBounds()
        {
            return this._plotBounds;
        }

        getDataTipData()
        {
            var dtd = new bps.DataTipData();

            dtd.text = vp.select(this._text).text();
            dtd.primaryKey = this._primaryKey;

            var rc = vp.select(this._root).getBounds(true);
            dtd.offset = { left: rc.left, top: rc.top };

            dtd.title = this._title;
            dtd.colNames = this._columnNames;
            dtd.includeNames = this._includeNames;

            return dtd;
        }

        setDataTipData(dtd: bps.DataTipData)
        {
            //---- OFFSET and TEXT will be updated again if recordIndex is set ----
            //---- but we do it now for the case when the data is not bound to a record ----
            //---- and in case the record binding fails ----
            vp.select(this._root)
                .css("left", dtd.offset.left + "px")
                .css("top", dtd.offset.top + "px")

             vp.select(this._text)
                .text(dtd.text)

             this._primaryKey = dtd.primaryKey;
             this._title = dtd.title;
            this._columnNames = dtd.colNames;
            this._includeNames = dtd.includeNames;

            if (dtd.primaryKey !== null && dtd.primaryKey !== undefined)
            {
                this.updateTextAndOffset(dtd.primaryKey);
            }
        }

        setParams(title: string, colNames: string[], includeNames: boolean)
        {
            this._title = title;
            this._columnNames = colNames;
            this._includeNames = includeNames;

            this.updateTextAndOffset();
        }

        show(value?: boolean)
        {
            vp.select(this._root)
                .css("display", (value) ? "" : "none");
        }

        updateTextAndOffset(primaryKey?: string)
        {
            var requestedColumnNames = this._columnNames;

            if (primaryKey !== undefined)
            {
                //---- get information about bound record index ----
                this._bpsHelper.getRecordAndBounds(primaryKey, requestedColumnNames, (msgBlock) =>
                {
                    this._primaryKey = primaryKey;

                    var rc = msgBlock.screenBounds;

                    if (rc)
                    {
                        var x = (rc.left + rc.right) / 2;
                        var y = (rc.top + rc.bottom) / 2;

                        //---- offset by half drag icon size ----
                        var rcIcon = vp.select(this._img).getBounds(true);
                        x -= rcIcon.width / 2;
                        y -= rcIcon.height / 2;

                        //---- offset by rcPlot ----
                        var rcPlot = msgBlock.rcPlot;
                        x += rcPlot.left;
                        y += rcPlot.top;

                        //---- offset by rcChart ----
                        var rcChart = vp.select(this.container, ".myChart").getBounds(true);
                        x += rcChart.left;
                        y += rcChart.top;

                        vp.select(this._root)
                            .css("left", x + "px")
                            .css("top", y + "px")
                            .css("display", "");

                        this.buildTextFromColumnValues(requestedColumnNames, msgBlock.colValues);
                    }
                    else
                    {
                        //---- hide it until we have a place to put it ----
                        vp.select(this._root)
                            .css("display", "none");
                    }
                });
            }
            else
            {
                var rcScreen = vp.dom.getBounds(this._img);

                var rcPlot = vp.select(this.container, ".myChart")
                    .getBounds(false);

                //--- bug workaround: -= operator broken for ClientRect properties ----
                var lineWidth = 2;
                var lineWidth2 = 2 * lineWidth;

                var rc = vp.geom.createRect(rcScreen.left - rcPlot.left + lineWidth, rcScreen.top - rcPlot.top + lineWidth,
                    rcScreen.width - lineWidth2, rcScreen.height - lineWidth2);

                this._plotBounds = rc;

                this._bpsHelper.getMostCentralRecord(rc, requestedColumnNames, (msgBlock) =>
                {
                    this.buildTextFromColumnValues(requestedColumnNames, msgBlock.colValues);

                    this._primaryKey = msgBlock.recordIndex;
                });
            }
             
        }

        buildTextFromColumnValues(colNames: string[], colValues: string[])
        {
            var html = "";
            var colCount = (colValues) ? colValues.length : 0;

            if (this._title && this._title != "")
            {
                var cls = (colCount > 0) ? "datatipTitle" : "datatipText";

                html += "<div class='" + cls + "'>" + this._title + "</div>";
            }

            html += "<table class='datatipTable'>";

            if (colCount > 0)
            {
                var firstSystemName = true;

                for (var i = 0; i < colCount; i++)
                {
                    var colName = colNames[i];
                    var colType = this.application.getColType(colName);

                    var value = colValues[i];
                    var strValue = vp.formatters.formatByType(value, colType);

                    if (i > 0)
                    {
                        if (colName.startsWith("_") && firstSystemName)
                        {
                            //---- skip a row ----
                            firstSystemName = false;
                            html += "<tr><td>&nbsp;</td></tr>";
                        }
                    }

                    html += "<tr style='white-space: nowrap'>";

                    if (this._includeNames)
                    {
                        html += "<td class='dataTipName'>" + colName + ":</td>";
                    }

                    html += "<td class='datatipValue'>" + value + "</td></tr>";

                    //html += strValue + "<br />";
                }

                html += "</table>";
            }

            //---- set text / HTML ----
            var textW = vp.select(this._text)

            textW.html(html);

            //---- position bottom of text 20 pixels above img ----
            var rc = textW.getBounds(false);
            textW
                .css("top", -(rc.height + 20) + "px")
        }

        startDrag(e, offset)
        {
            this._ptMouseDown = vp.events.mousePosition(e);
            this._isRealDrag = false;

            this._dataTipOffset = offset;

            //---- capture mouse ----
            // vp.events.setCaptureWindow((e) => this.onMouseMove(e), (e) => this.onMouseUp(e), ["myChart"]);

            //---- draw first image ----
            this.onMouseMove(e);

            vp.events.cancelEventDefault(e);
        }

        onMouseMove(e)
        {
            var pt = vp.events.mousePosition(e);
            pt.x -= this._dataTipOffset.x;
            pt.y -= this._dataTipOffset.y;

            if (!this._isRealDrag)
            {
                var xdiff = Math.abs(pt.x - this._ptMouseDown.x);
                var ydiff = Math.abs(pt.x - this._ptMouseDown.x);

                if (xdiff > 3 || ydiff > 3)
                {
                    this._isRealDrag = true;
                }
            }

            if (this._isRealDrag)
            {
                this.moveToPoint(pt.x, pt.y, false);
            }
        }

        moveToPoint(x: number, y: number, centerRelative?: boolean)
        {
            if (centerRelative)
            {
                var rc = vp.select(this._root).getBounds(false);
                x -= rc.width / 2;
                y -= rc.height / 2;
            }

            vp.select(this._root)
                .css("left", x + "px")
                .css("top", y + "px");

            this.onDataChanged("position");

            this.updateTextAndOffset();
        }

        onMouseUp(e)
        {
            vp.events.releaseCaptureWindow();
            vp.events.cancelEventDefault(e);

            var closeMe = (!this._isRealDrag);
            if (!closeMe)
            {
                //---- if outside of plot, remove ----
                var rcImg = vp.dom.getBounds(this._img);

                var rcPlot = vp.select(this.container, ".myChart")
                    .getBounds(false);

                if (!vp.geom.rectIntersectsRect(rcImg, rcPlot))
                {
                    closeMe = true;
                }
            }

            if (closeMe)
            {
                this.close();
            }

        }
    }
}