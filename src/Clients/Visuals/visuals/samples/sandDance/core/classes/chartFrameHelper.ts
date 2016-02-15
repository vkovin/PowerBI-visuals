//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    chartFrameHelper.ts - helps a chart to draw the (somewhat complex) chart frame.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    export class ChartFrameHelperClass extends DataChangerClass   
    {
         _root: SVGGElement;

        private appMgr: AppMgrClass;
        _chartFrame: vp.chartFrame.chartFrameEx;
        _chartFrameData: bps.ChartFrameData;
        _dataMgr: DataMgrClass;
        _transformer: TransformerClass;

        _xTickBoxElements: HTMLElement[];
        _yTickBoxElements: HTMLElement[];

        constructor(appMgr: AppMgrClass, parent: SVGGElement, dataMgr: DataMgrClass, transformer: TransformerClass)
        {
            super();

            this.appMgr = appMgr;
            var rootW = vp.select(parent).append("g");
            this._root = rootW[0];

            this._dataMgr = dataMgr;
            this._transformer = transformer;

            //---- todo : add switch for facet frames ----
            this.createBigChartFrame();
        }

        selectXBoxByIndex(index: number)
        {
            var xElems = this._xTickBoxElements;
            if (index < 0)
            {
                index += xElems.length;
            }
            else
            {
                //---- true elements start at index=1 ----
                index++;
            }

            var elem = xElems[index];
            var e = { target: elem };

            this.doNewSearch(e, "X");
        }

        selectYBoxByIndex(index: number)
        {
            var yElems = this._yTickBoxElements;
            if (index < 0)
            {
                index += yElems.length;
            }
            else
            {
                //---- true elements start at index=1 ----
                index++;
            }

            var elem = yElems[index];
            var e = { target: elem };

            this.doNewSearch(e, "Y");
        }

        chartFrameRoot()
        {
            return this._root;
        }

        createBigChartFrame()
        {
            var svgParent = this._root;

            //---- create placeholder scales to initialize with ----
            var xData = vp.chartFrame.createAxisData(vp.scales.createLinear());
            var yData = vp.chartFrame.createAxisData(vp.scales.createLinear());

            vp.select(svgParent)
                .clear();

            //---- create CHART FRAME control ----
            var chartFrame = vp.chartFrame.createChartFrameEx(svgParent, xData, yData);

            this._chartFrame = chartFrame;
        }

        /** converts a WORLD space scale to a SCREEN space scale. */
        cloneScale(oldScale: vp.scales.baseScale, attr: glUtils.GlAttributeClass, rangeMin: number, rangeMax: number, axisName?: string)
        {
            var myScale = null;
            var scaleType = bps.MappingSpread.normal;
            var oldScaleType = oldScale.scaleType();
            var anyOldScale = <any>oldScale;

            var domainMin = oldScale.domainMin();
            var domainMax = oldScale.domainMax();

            //---- map domain boundaries using our transform matrix ----
            if (axisName == "x" || axisName == "y")
            {
                if (anyOldScale._binResults || oldScale.isCategory())
                {
                    //---- use break indexes rather than true data ----
                    var count = 0;

                    if (anyOldScale._binResults)
                    {
                        count = anyOldScale._binResults.bins.length;
                    }
                    else if (anyOldScale.getBreaks)
                    {
                        count = anyOldScale.getBreaks();
                    }
                    else if (anyOldScale._categoryKeys)
                    {
                        count = anyOldScale._categoryKeys.length;
                    }

                    if (anyOldScale._useCategoryForBins)
                    {
                        count--;
                    }

                    var result = this.transformScaleDomain(oldScale, axisName, 0, count);
                }
                else
                {
                    var result = this.transformScaleDomain(oldScale, axisName, domainMin, domainMax);
                }

                domainMin = result.domainMin;
                domainMax = result.domainMax;
            }

            if (oldScaleType == vp.scales.ScaleType.linear)
            {
                if (scaleType == bps.MappingSpread.low)
                {
                    myScale = vp.scales.createLowBias()
                }
                else if (scaleType == bps.MappingSpread.high)
                {
                    myScale = vp.scales.createHighBias()
                }
                else 
                {
                    myScale = vp.scales.createLinear()
                }

                //vp.utils.debug("cloneScale: axisName=" + axisName);

                myScale
                    .domainMin(domainMin)
                    .domainMax(domainMax)
                    .rangeMin(rangeMin)
                    .rangeMax(rangeMax)

                myScale.preserveBreakPoints = (anyOldScale._binResults != null);
            }
            else if (oldScaleType == vp.scales.ScaleType.dateTime)
            {

                myScale = vp.scales.createDate()
                    .domainMin(domainMin)
                    .domainMax(domainMax)
                    .rangeMin(rangeMin)
                    .rangeMax(rangeMax)

                //---- map domain boundaries using our transform matrix ----
                myScale.preserveBreakPoints = (anyOldScale._binResults != null);
                myScale._useCategoryForBins = anyOldScale._useCategoryForBins;
            }
            else        // category
            {
                //var catKeys = vp.utils.keys(oldScale.categoryKeys());
                var catKeys = this.getCategoryKeysInOrder(oldScale);

                if (false)      // oldScaleType == vp.scales.ScaleType.categoryIndex)
                {
                    myScale = vp.scales.createCategoryIndex()
                        .categoryKeys(catKeys)
                }
                else if (oldScale.isCategory())     //   oldScaleType == vp.scales.ScaleType.categoryKey)
                {
                    myScale = vp.scales.createCategoryKey()
                        .categoryKeys(catKeys)
                }
                else
                {
                    throw "Unsupported scaleType: " + oldScaleType;
                }

                myScale
                    .range(rangeMin, rangeMax)

                myScale.preserveBreakPoints = true;
            }

            //---- convert expandSpace from 3D units to pixels ----
            var expandSpace = oldScale.expandSpace();
            expandSpace = this._transformer.worldSizeToScreen(expandSpace);

            myScale
                .expandSpace(expandSpace);

            return myScale;
        }

        transformScaleDomain(scale: vp.scales.baseScale, axisName: string, dataMin: number, dataMax: number)
        {
            //var invWorld = this._transformer.getInvWorldpMatrix();
            var matWorld = this._transformer.getInvWorldpMatrix();
            var xxx = this._transformer.getWorldBounds();

            //---- map from NDC bounds to world bounds (for current transform) ---- 
            if (axisName == "x")
            {
                var ptTrans = this._transformer.transformPtWithMatrix(xxx.left, 0, 0, matWorld);
                var minWorld = ptTrans.x;

                var ptTrans = this._transformer.transformPtWithMatrix(xxx.right, 0, 0, matWorld);
                var maxWorld = ptTrans.x;
            }
            else if (axisName == "y")
            {
                var ptTrans = this._transformer.transformPtWithMatrix(0, xxx.bottom, 0, matWorld);
                var minWorld = ptTrans.y;

                var ptTrans = this._transformer.transformPtWithMatrix(0, xxx.top, 0, matWorld);
                var maxWorld = ptTrans.y;
            }

            //---- reverse scale the world bounds to get data bounds of current view ----
            var minNewData = vp.data.mapValue(minWorld, scale._palette[0], scale._palette[1], dataMin, dataMax);
            var maxNewData = vp.data.mapValue(maxWorld, scale._palette[0], scale._palette[1], dataMin, dataMax);

            return { domainMin: minNewData, domainMax: maxNewData };
        }

        createAxisData(scale: vp.scales.baseScale, attr: glUtils.GlAttributeClass, rangeMin: number, rangeMax: number, axisName?: string)
        {
            /// CAUTION: "scale" was built in world space, but rangeMin/rangeMax are in screen pixels.
            
            //---- todo: put a real, user-controllable value here ----
            var tickCount = 9;      // scale.getActualBreaks().length;

            if (scale.scaleType() == vp.scales.ScaleType.categoryIndex)
            {
                tickCount++;
            }

            //---- create special properties added by chartUtils.adjustScaleForBin() ----
            var anyScale = <any>scale;
            var formatter = anyScale._formatter;
            var breaks = anyScale._breaks;
            var labels = anyScale._labels;

            var newScale = this.cloneScale(scale, attr, rangeMin, rangeMax, axisName);

            //---- support case where we are scaling with numbers, but have a formatting string from Excel ----
            //---- in this case, ignore the Excel format, and do our own local formatting because when user has filtered view, ----
            //---- we can provide a closer fit to the values shown.  We may revisit this in the future ----
            if (formatter && formatter._colType == "number")
            {
                //---- remove the "General" formatter and create a smarter local formatter below ----
                //formatter = null;
            }

            //---- adjust breaks (subbsetting or creating new break values) to match the updated domainMin/domainMax ----
            var preserveBreakPoints = newScale.preserveBreakPoints;
            var domainMin = newScale._domainMin;
            var domainMax = newScale._domainMax;
            var fullBreakCount = (breaks) ? breaks.length : 0;

            if (preserveBreakPoints)
            {
                //---- subset the full set of break points ----
                var firstIndex = Math.max(0, Math.ceil(domainMin));      
                var lastIndex = Math.min(Math.floor(domainMax), fullBreakCount - 1);    
                
                var diff = lastIndex - firstIndex;
                breaks = vp.data.range(firstIndex, lastIndex);

                labels = null;
            }
            else if (breaks && breaks.length > 1)
            {
                //---- replace breaks with domainMin, domainMax ticks to match current transform ----
                var diff = domainMax - domainMin;
                var steps = diff / (fullBreakCount - 1);

                breaks = vp.data.range(domainMin, domainMax, steps);

                vp.utils.assert(breaks.length == fullBreakCount);
                labels = null;          // regen these to match new breaks
            }

            if (breaks && breaks.length)
            {
                var len = breaks.length;

                //---- for bin-related scales, since breaks could be non-linear, we need to ensure mapping is linear ----
                if (anyScale._binResults && !anyScale._useCategoryForBins) 
                {
                    if (!labels)
                    {
                        //---- create labels from original breaks ----
                        labels = breaks.map((data, index) =>
                        {
                            var binResults = <BinResult> anyScale._binResults;
                            var useCategoryForBins = anyScale._useCategoryForBins;

                            if (binResults)
                            {
                                if (useCategoryForBins)
                                {
                                    var bin = binResults.bins[data];
                                    data = bin.name;
                                }
                                else if (index == breaks.length - 1)
                                {
                                    var bin = binResults.bins[data - 1];
                                    data = (<BinInfoNum>bin).maxLabel;
                                }
                                else
                                {
                                    var bin = binResults.bins[data];
                                    data = (<BinInfoNum>bin).minLabel;
                                }
                            }
                            else
                            {
                                data = (formatter) ? formatter(data) : (data + "");
                            }

                            return data;
                        });
                    }

                    //---- replace nonlinear breaks with linear breaks ----
                    breaks = vp.data.range(0, len - 1);
                }

                //---- when breaks are specified, they override domainMin/domainMax specifications ----
                newScale
                    .domainMin(breaks[0])
                    .domainMax(breaks[len - 1])
            }
            else if (anyScale._tickCount)
            {
                tickCount = anyScale._tickCount;
            }

            var isCategory = (scale.scaleType() == vp.scales.ScaleType.categoryIndex || scale.scaleType() == vp.scales.ScaleType.categoryKey);
            if (isCategory)
            {
                //var catKeys = scale.categoryKeys();
                var catKeys = this.getCategoryKeysInOrder(anyScale);
                breaks = (catKeys) ? catKeys : null;
            }

            var axisData = vp.chartFrame.createAxisData(newScale, null, tickCount, breaks, labels, formatter);
            return axisData;
        } 

        getCategoryKeysInOrder(scale)
        {
            var catKeysObj = scale.categoryKeys();
            var keysOnly = vp.utils.keys(catKeysObj);
            var catKeysInOrder = [];

            for (var k = 0; k < keysOnly.length; k++)
            {
                var theKey = keysOnly[k];
                var index = catKeysObj[theKey];

                if (theKey == "")
                {
                    theKey = this.appMgr.getDataView().blankValueStr();
                }

                catKeysInOrder[index] = theKey;
            }

            return catKeysInOrder;
        }

        fadeInOut(show: boolean)
        {
            //var cfd = this._chartFrameData;

            //if (show)
            //{
            //    vp.select(this._chartFrameRoot)
            //        .css("transition", "opacity .25s ease-in-out")
            //        .css("opacity", cfd.opacity + "")
            //}
            //else
            //{
            //    vp.select(this._chartFrameRoot)
            //        .css("transition", "opacity 0s ease-in-out")
            //        .css("opacity", "0")
            //}

        }

        build(width: number, height: number, hideAxes: any, usingFacets: boolean, scales: any,
            cfd: bps.ChartFrameData, dc: DrawContext)
        {
            this.buildCore(width, height, hideAxes, usingFacets, scales, cfd, dc);

            var chartFrame = this._chartFrame;
            var padding = cfd.padding;

            chartFrame.build();

            var rcPlot = chartFrame.plotAreaBounds();

            if (padding)
            {
                rcPlot.left += padding.left;
                rcPlot.right += padding.left;
                rcPlot.top += padding.top;
                rcPlot.bottom += padding.top;
            }

            return rcPlot;
        }

        buildCore(width: number, height: number, hideAxes: any, usingFacets: boolean, scales: any,
            cfd: bps.ChartFrameData, dc: DrawContext)
        {
            var chartFrame = this._chartFrame;
            this._chartFrameData = cfd;

            //---- adjust width/height for padding ----
            var padding = cfd.padding;

            if (padding)
            {
                vp.select(this._root)
                    .translate(padding.left, padding.top);

                width -= (padding.left + padding.right);
                height -= (padding.top + padding.bottom);
            }

            var xAttr = null;       // attributes.x;
            var yAttr = null;       // attributes.y;

            var xAxisData = this.createAxisData(scales.x, xAttr, 0, width, "x");
            var yAxisData = this.createAxisData(scales.y, yAttr, height, 0, "y");

            vp.select(this._root)
                .css("opacity", cfd.opacity + "");

            chartFrame
                .xAxisData(xAxisData)
                .yAxisData(yAxisData);

            var isGridVisible = (cfd.xAxis.drawGridLines || cfd.yAxis.drawGridLines);

            var showXAxis = (hideAxes !== true && hideAxes != "x" && cfd.xAxis.isAxisVisible);
            var showYAxis = (hideAxes !== true && hideAxes != "y" && cfd.yAxis.isAxisVisible);

            if (hideAxes === true)
            {
                isGridVisible = false;
            }

            chartFrame
                .translate(0, 0, true)
                .width(width)
                .height(height)
                .isLeftAxisVisible(showYAxis)
                .isBottomAxisVisible(showXAxis)
                .isTopAxisVisible(false)
                .isRightAxisVisible(false)
                .isGridLinesVisible(isGridVisible && !hideAxes)
                .axesOnOutside(usingFacets);

            if (isGridVisible)
            {
                chartFrame.gridLines()
                    .isXVisible(cfd.xAxis.drawGridLines)
                    .isYVisible(cfd.yAxis.drawGridLines);
            }

            var chartType = dc.toChartType;

            if (hideAxes !== true)
            {
                var areLeftLabelsClickable = true;      // (this.clickableLabelGroups().indexOf("leftAxis") != -1);
                var areBottomLabelsClickable = true;    // (this.clickableLabelGroups().indexOf("bottomAxis") != -1);

                //---- set options on LEFT AXIS ----
                var leftAxis = chartFrame.leftAxis()
                    .labelOverflow(vp.chartFrame.LabelOverflow.ellipses);

                var xBinResults = (scales.x) ? scales.x._binResults : null;
                var yBinResults = (scales.y) ? scales.y._binResults : null;

                var showTickBoxes = true;

                if (dc.nvData.y)
                {
                    var yCol = (dc.yCalcName) ? dc.yCalcName: dc.nvData.y.colName;

                    var yIsCat = (dc.nvData.y.colType === "string");     // || (<any>dc.scales.y)._useCategoryForBins);

                    var yLast = null;

                    this._yTickBoxElements = [];

                    //--- to minimize movement when possible ----
                    var leftMinWidth = 100;
                    var labelList = [];

                    //---- hook the "shaded" event so that we can apply our custom settings on axis labels ----
                    leftAxis
                        .minWidth(leftMinWidth)
                        .isTickBoxesVisible(showTickBoxes) 
                        .onShade((element: HTMLElement, record, index, isNew, isLastNew) =>
                        {
                            if (index === 0) 
                            {
                                yLast = null;
                                labelList = [];
                            }

                            if (areLeftLabelsClickable && isNew)
                            {
                                var elementItem: D3.Selection = d3.select(element);

                                if (elementItem.classed("vpxAxisLabel"))
                                {
                                    element.addEventListener("click", (e) => this.doNewSearch(e, "Y"));

                                    elementItem
                                        .style({
                                            "cursor": "pointer",
                                            "fill": this.appMgr.getSettingsManager().getLabelsColor()
                                        })
                                        .attr("simpleHighlight", "true")
                                        .classed("clickableAxisLabel", true);

                                    // elementItem
                                    //     .style("cursor", "pointer")
                                    //     .attr("simpleHighlight", "true")
                                    //     .classed("clickableAxisLabel", true);

                                    //yLast = utils.prepElementForSearch(element, yCol, scales.y, yBinResults,
                                    //    index, yLast, yIsCat, record, "label", isLastNew);

                                    //---- build info needed by CLICK to do search ----
                                    searchUtils.buildSearchInfoOnElem(element, labelList, record, yBinResults,
                                        index, yCol, yIsCat, "y", "tick", isLastNew);
                                }
                                else if (elementItem.classed("vpxAxisTickBox"))
                                {
                                    var tickBarTooltip = null;

                                    if (yBinResults && index > 0)
                                    {
                                        var bin = yBinResults.bins[index - 1];

                                        var itemCount = bin.count;
                                        tickBarTooltip = "Count: " + vp.formatters.formatNumber(itemCount, "0,##0");

                                        if (chartType === "barSumClass")
                                        {
                                            var itemSum = bin.sum;      //  this.computeBinSum(dc, "y", bin.rowIndexes);

                                            tickBarTooltip = "Sum: " + vp.formatters.formatNumber(itemSum, "0,##0") + ", " +
                                                tickBarTooltip;
                                        }
                                    }

                                    element.addEventListener("click", (e) => this.doNewSearch(e, "Y"));

                                    elementItem
                                        .style("fill", this.appMgr.getSettingsManager().getBoxBackgroundColor())
                                        .on("mouseover", () => {
                                            elementItem.style("fill", this.appMgr.getSettingsManager().getBoxHoverBackgroundColor());
                                        })
                                        .on("mouseout", () => {
                                            elementItem.style("fill", this.appMgr.getSettingsManager().getBoxBackgroundColor());
                                        })
                                        .append("title")
                                        .text(tickBarTooltip);

                                    //yLast = utils.prepElementForSearch(element, yCol, scales.y, yBinResults, index, yLast, yIsCat, record,
                                    //    "tickBox", isLastNew);

                                    //---- build info needed by CLICK to do search ----
                                    searchUtils.buildSearchInfoOnElem(element, labelList, record, yBinResults,
                                        index, yCol, yIsCat, "y", "bar", isLastNew);

                                    this._yTickBoxElements[index] = element;
                                }
                            }
                        });
                }

                var isBottom = true;

                //---- set options on BOTTOM AXIS ----
                var bottomAxis = chartFrame.bottomAxis()
                    .labelOverflow(vp.chartFrame.LabelOverflow.ellipses)
                    .labelRotation(vp.chartFrame.LabelRotation.auto)
                    .positiveAutoRotation(false);

                if (dc.nvData.x)
                {
                    var xCol = (dc.xCalcName) ? dc.xCalcName : dc.nvData.x.colName;

                    var xIsCat = (dc.nvData.x.colType === "string");     // || (<any>dc.scales.x)._useCategoryForBins);

                    var xLast = null;
                    var xLastIndex = xAxisData.tickCount() - 1;
                    this._xTickBoxElements = [];
                    var labelList = [];

                    bottomAxis
                        .isTickBoxesVisible(showTickBoxes)
                        .onShade((element: HTMLElement, record, index, isNew, isLastNew) =>
                        {
                            if (index === 0)
                            {
                                xLast = null;
                                labelList = [];
                            }

                            if (areBottomLabelsClickable && isNew)
                            {
                                let elementItem: D3.Selection = d3.select(element);

                                if (elementItem.classed("vpxAxisLabel"))
                                {
                                    element.addEventListener("click", (e) => this.doNewSearch(e, "X"));

                                    elementItem
                                        .style({
                                            "cursor": "pointer",
                                            "fill": this.appMgr.getSettingsManager().getLabelsColor()
                                        })
                                        .attr("simpleHighlight", "true")
                                        .classed("clickableAxisLabel", true);

                                    //xLast = utils.prepElementForSearch(element, xCol, scales.x, xBinResults,
                                    //    index, xLast, xIsCat, record, "label", isLastNew);

                                    //---- build info needed by CLICK to do search ----
                                    searchUtils.buildSearchInfoOnElem(element, labelList, record, xBinResults,
                                        index, xCol, xIsCat, "x", "tick", isLastNew);
                                }
                                else if (elementItem.classed("vpxAxisTickBox"))
                                { 
                                    var tickBarTooltip = null;

                                    if (xBinResults && index > 0)
                                    {
                                        var bin = xBinResults.bins[index - 1];

                                        var itemCount = bin.count;
                                        tickBarTooltip = "Count: " + vp.formatters.formatNumber(itemCount, "0,##0");

                                        if (chartType === "columnSumClass")
                                        {
                                            var itemSum = bin.sum;      //  this.computeBinSum(dc, "x", bin.rowIndexes);

                                            tickBarTooltip = "Sum: " + vp.formatters.formatNumber(itemSum, "0,##0") + ", " +
                                                tickBarTooltip;
                                        }
                                    }

                                    element.addEventListener("click", (e) => this.doNewSearch(e, "X"));

                                    elementItem
                                        .style("fill", this.appMgr.getSettingsManager().getBoxBackgroundColor())
                                        .on("mouseover", () => {
                                            elementItem.style("fill", this.appMgr.getSettingsManager().getBoxHoverBackgroundColor());
                                        })
                                        .on("mouseout", () => {
                                            elementItem.style("fill", this.appMgr.getSettingsManager().getBoxBackgroundColor());
                                        })
                                        .append("title")
                                        .text(tickBarTooltip);

                                    //xLast = utils.prepElementForSearch(element, xCol, scales.x, xBinResults, index, xLast, xIsCat, record,
                                    //    "tickBox", isLastNew);

                                    //---- build info needed by CLICK to do search ----
                                    searchUtils.buildSearchInfoOnElem(element, labelList, record, xBinResults,
                                        index, xCol, xIsCat, "x", "bar", isLastNew);

                                    this._xTickBoxElements[index] = element;
                                }
                            }
                        });
                }
            }

            chartFrame.build();

            var rcPlot = chartFrame.plotAreaBounds();

            if (padding)
            {
                rcPlot.left += padding.left;
                rcPlot.right += padding.left;
                rcPlot.top += padding.top;
                rcPlot.bottom += padding.top;
            }

            return rcPlot;
        }

        doNewSearch(e, axisName: string)
        {
            var sp = searchUtils.searchOnTickOrBarClick(e);

            this._dataMgr.runSearchQuery([sp]);
            this.appMgr.onClickSelection(sp.buttonType, sp.axisName, sp);
            // beachParty.appMgrClass.current.onClickSelection(sp.buttonType, sp.axisName, sp);
        }

        //doSearch(e, axisName: string)
        //{
        //    var elem = e.target;
        //    var sp = elem._searchParams;

        //    this._dataMgr.runSearchQuery([sp]);

        //    appMgrClass.current.onClickSelection(sp.buttonType, axisName, sp );
        //}
    }
}