//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    chartUx.ts - manages the user interaction with the chart.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class ChartUxClass extends beachParty.DataChangerClass
    {
        private dataTipMgr: DataTipMgrClass;
        private application: AppClass;
        private container: HTMLElement;
        private settings: AppSettingsMgr;

        private _chartUxElem: HTMLElement;

        private _rubberBandSelector: RubberBandSelectorClass;
        private _bpsHelper: bps.ChartHostHelperClass;
        private _areToolTipsEnabled = false;
        private _hoverPrimaryKey;
        private _maxToolTipColumns;

        constructor(dataTipMgr: DataTipMgrClass, application: AppClass, settings: AppSettingsMgr, container: HTMLElement, bpsHelper: bps.ChartHostHelperClass, maxToolTipColumns: number)
        {
            super();

            this.dataTipMgr = dataTipMgr;
            this.application = application;
            this.settings = settings;
            this.container = container;

            this._bpsHelper = bpsHelper;
            this._maxToolTipColumns = maxToolTipColumns;

            this.buildRubberBand();

            var chartUxElem: HTMLElement = $(".chartUxDiv", this.container).get(0);
            this._chartUxElem = chartUxElem;

            //vp.select(chartUxElem).attach("mousedown", (e) => this.onWindowMouseDown(e));
            this.container.addEventListener("mouseup", (e) => this.enableEngineUI(true));

            //---- MOUSE MOVE for tooltips ----
            chartUxElem.addEventListener("mousemove", (e) => this.onUxMouseMove(e));
            // vp.select(chartUxElem).attach("mousemove", (e) => this.onUxMouseMove(e));

            //---- KEY DOWN for keyboard commands ----
            this.container.addEventListener("keydown", (e) => this.onKeyDown(e));

            //---- DBL CLICK for reset transform ----
            chartUxElem.addEventListener("dblclick", (e) => this.onDblClick(e));

            //---- MOUSE OVER for 3D circle ----
            //vp.select("#myChart").attach("mouseover", (e) => this.onMouseOver(e));

            //---- CONTEXT MENU for toggling data tips on/off ----
            // vp.select(chartUxElem).attach("contextmenu", (e) => this.onPlotContextMenu(e));
        }

        onDblClick(e)
        {
            //---- why does animatin get turned off here? ----
            this._bpsHelper.resetTransform();
        }

        onKeyDown(e)
        {
            //---- TODO: add 3D nav keys here ----
            if (e.keyCode == vp.events.keyCodes.escape)
            {
                //---- why does animatin get turned off here? ----
                this._bpsHelper.resetTransform();

                /*appClass.instance*/this.application.resetDataZoomMode();
            }
        }

        //onMouseOver(e)
        //{
        //    appClass.instance.pulse3DCircleIfAppropriate();
        //}

        onPlotContextMenu(e)
        {
            //---- TODO: with TOUCH interface, hover does not get set - fix this so that it works just based on current pt ----
            vp.utils.debug("chartUx: onPlotContextMenu called");

            this._rubberBandSelector.cancelPendingUpEvent();

            //---- force hover info to be updated (especially important for TOUCH interface) ----
            this.onUxMouseMove(e, (evt) =>
            {
                var primaryKey = this._hoverPrimaryKey;
                vp.utils.debug("chartUx: onMouseMove callback: primaryKey=" + primaryKey);

                if (primaryKey)
                {
                    var dataTip = this.dataTipMgr.getDataTip(primaryKey);
                    vp.utils.debug("chartUx: onMouseMove callback: dataTip=" + dataTip);

                    if (dataTip)
                    {
                        //---- REMOVE dataTip ----
                        this.dataTipMgr.closeDataTip(dataTip);
                    }
                    //else
                    //{
                    //    //---- ADD dataTip ----
                    //    var colName = vp.select("#searchCol").text();
                    //    var pt = vp.events.mousePosition(e);

                    //    dataTipMgrClass.instance.addDataTip(colName, pt);

                    //    vp.events.cancelEventBubble(e);
                    //    vp.events.cancelEventDefault(e);
                    //}
                }
            });
        }

        onUxMouseMove(e, callback?: any)
        {
            /// NOTE: hover information (the current hover shape) is used for both tooltips & the 
            /// hover rending effect (2 separate app options).

            if (true)       // !this._delayTimer)         // throttle mouse events
            {
                var hoverEnabled = (this.settings.hoverEffect() !== "none");
                var tooltipsEnabled = /*appSettingsMgr.instance*/this.settings.isTooltipsEnabled();
                var hoverOnMoveEnabled = /*appSettingsMgr.instance*/this.settings.hoverOnMouseMove();

                if (hoverEnabled && (tooltipsEnabled || hoverOnMoveEnabled) && e.buttons != 1)            // not left button
                {
                    var mousePos = vp.events.mousePosition(e, this._chartUxElem);

                    //---- show tooltips if middle/right mouse button pressed, or if tooltips are enabled ----
                    var getRecord = (e.buttons !== 0 || this.settings.isTooltipsEnabled());
                    var scale = sandDance.commonUtils.getScale(this.container);

                    var colList = /*appClass.instance*/this.application._tooltipColumns;

                    this._bpsHelper.applyHover(mousePos.x / scale.x, mousePos.y / scale.y, getRecord, colList, hoverOnMoveEnabled, (msgBlock) =>
                    {
                        if (this._hoverPrimaryKey !== msgBlock.primaryKey)
                        {
                            this._hoverPrimaryKey = msgBlock.primaryKey;

                            if (getRecord)
                            {
                                this.showToolTipForShape(msgBlock.primaryKey, msgBlock.record);
                            }
                            else
                            {
                                vp.select(this.container, this._chartUxElem).title("");
                            }

                            //vp.utils.debug("chartUx: hover primaryKey=" + msgBlock.primaryKey);
                        }

                        if (callback)
                        {
                            callback(msgBlock);
                        }
                    });

                    //this.setNextMsgDelay();
                }
            }
        }

        enableEngineUI(value: boolean)
        {
            vp.select(this.container, ".myChart").css("pointer-events", (value) ? "" : "none");

            if (!value)
            {
                //---- set focus so we can get keyboard events ----
                setTimeout((e) => this._chartUxElem.focus(), 10);
            }
        }

        getHoverPrimaryKey()
        {
            return this._hoverPrimaryKey;
        }

//         buildRubberBand1()
//         {
//             var chartUxElem: HTMLElement = $(".chartUxDiv", this.container).get(0);
//             this._rubberBandSelector = new RubberBandSelectorClass(this.container, chartUxElem);
// 
//             //---- hook the RECT SELECT event ----
//             this._rubberBandSelector.attachOnSelect((evt, rcBand, toggle, mouseDownOrigin) =>
//             {
//                 if (rcBand)
//                 {
//                     let scale = sandDance.commonUtils.getScale(this.container);
// 
//                     //---- adjust rcBand so that it is relative to "myChart" ----
//                     var rc = vp.select(this.container, ".myChart").getBounds(false);
// 
//                     var rcBandAdj = vp.geom.createRect(
//                         (rcBand.left - rc.left) / scale.x,
//                         (rcBand.top - rc.top) / scale.y,
//                         rcBand.width / scale.x,
//                         rcBand.height / scale.y);
// 
//                     var sd = new SelectionDesc();
//                     sd.legendSource = "rect drag";
//                     sd.rectSelect = rcBandAdj;
// 
//                     this.application.setSelectionDesc(sd);
//                     this._bpsHelper.rectSelect(rcBandAdj);
//                 }
//             });
// 
//             this._rubberBandSelector.registerForChange("mouseDown", (e) =>
//             {
//                 //---- mouse vs touch issue: turn off last tooltip info, or it shows wherever user touches screen (if cursor is over a shape) ----
//                 //this._view.hideToolTip();
// 
//                 this.enableEngineUI(false);
//             });
// 
//             this._rubberBandSelector.isEnabled(true);
// 
//         }

        buildRubberBand()
        {
            // var chartUxElem = document.getElementById("chartUxDiv");
            var chartUxElem: HTMLElement = $(".chartUxDiv", this.container).get(0);
            this._rubberBandSelector = new RubberBandSelectorClass(this.container, chartUxElem);

            //---- hook the RECT SELECT event ----
            this._rubberBandSelector.attachOnSelect((evt, rcBand, toggle, mouseDownOrigin) =>
            {
                this.onRubberBandSelect(evt, rcBand, toggle, mouseDownOrigin);
            });

            this._rubberBandSelector.registerForChange("mouseDown", (e) =>
            {
                //---- mouse vs touch issue: turn off last tooltip info, or it shows wherever user touches screen (if cursor is over a shape) ----
                //this._view.hideToolTip();

                this._rubberBandSelector.forceToggle(/*appClass.instance*/this.application.isDataZoomMode());

                this.enableEngineUI(false);
            });

            this._rubberBandSelector.isEnabled(true);

        }

        onRubberBandSelect(evt, rcBand, toggle, mouseDownOrigin)
        {
            //---- for now: "toggle" is set when we drag a rectangle with RIGHT mouse button down ----
            if (rcBand)
            {
                let scale = sandDance.commonUtils.getScale(this.container);

                //---- adjust rcBand so that it is relative to "myChart" ----
                // var rc = vp.select("#myChart").getBounds(false);
                var rc = vp.select(this.container, ".myChart").getBounds(false);
                // var rcBandAdj = vp.geom.createRect(rcBand.left - rc.left, rcBand.top - rc.top, rcBand.width, rcBand.height);

                var rcBandAdj = vp.geom.createRect(
                        (rcBand.left - rc.left) / scale.x,
                        (rcBand.top - rc.top) / scale.y,
                        rcBand.width / scale.x,
                        rcBand.height / scale.y);

                if (/*appClass.instance*/this.application.dragAction() == "zoomIn")
                {
                    toggle = true;
                }

                if (toggle || /*appClass.instance*/this.application._isDataZoomMode)
                {
                    var zoomIt = true;

                    if (!/*appClass.instance*/this.application._isDataZoomMode)
                    {
                        //---- watch out for accidental use of right click vs. right drag ----
                        zoomIt = (Math.max(rcBand.width, rcBand.height) > 4);
                    }

                    if (zoomIt)
                    {
                        this._bpsHelper.dataZoom(rcBandAdj, false);

                        //if (toggle)
                        //{
                        //    appClass.instance.isDataZoomMode(true);
                        //}
                    }
                }
                else
                {
                    var sd = new SelectionDesc();
                    sd.legendSource = "rect drag";
                    sd.rectSelect = rc;

                    /*appClass.instance*/this.application.setSelectionDesc(sd);
                    this._bpsHelper.rectSelect(rcBandAdj);
                }
            }
        }

        showToolTipForShape(primaryKey: string, record: any)
        {
            var ttMsg = "";

            if (primaryKey !== null)
            {
                if (record)             // may be switching data sets
                {
                    var keys = vp.utils.keys(record);

                    keys.sort();

                    var maxCols = Math.min(keys.length, this._maxToolTipColumns);
                    var includeNames = /*appClass.instance*/this.application._includeNameInTooltips;
                    var firstSystemName = true;

                    for (var i = 0; i < maxCols; i++)
                    {
                        var key = keys[i];
                        var value = record[key];
                        var colType = /*appClass.instance*/this.application.getColType(key);

                        value = vp.formatters.formatByType(value, colType);

                        if (key.startsWith("_") && firstSystemName)
                        {
                            firstSystemName = false;
                            ttMsg += "\r\n\r\n";
                        }
                        else if (i > 0)
                        {
                            ttMsg += "\r\n";
                        }

                        if (includeNames)
                        {
                            ttMsg += key + ":\t" + value;
                        }
                        else
                        {
                            ttMsg += value;
                        }
                    }
                }
            }

            //---- set tooltip on our div ----
            vp.select(this._chartUxElem).title(ttMsg);

            //vp.utils.debug("set tooltip=" + ttMsg);
        }

        hideToolTip()
        {
            vp.select(this._chartUxElem)
                .title("");
        }

        areToolTipsEnabled(value?: boolean)
        {
            if (value === undefined || value === null)
            {
                return this._areToolTipsEnabled;
            }

            this._areToolTipsEnabled = value;

            this.onDataChanged("areToolTipsEnabled");
        }
   }
}