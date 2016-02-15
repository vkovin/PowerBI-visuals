//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    chartPicker.ts - popup panel for selecting the current chart type.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class ChartPickerClass extends BasePanelClass
    {
        tableElem: HTMLElement;
        _selectedChartElem: HTMLElement;

        _callback = null;
        _currentChart = <string>null;

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, currentChart: string, callback)
        {
            super(application, settings, container, "bbView", false, undefined, "View as", undefined, undefined, undefined, undefined, undefined, true);

            this.showTitle(false);      // initially hidden
            this._callback = callback;
            this._currentChart = currentChart;

            //---- create the table ----
            var tableW = vp.select(this._contentRow).append("table")
                .addClass("chartPicker")

            //---- first row of CHARTS ----
            var rowW = tableW.append("tr")

            var useCustomChart = true;

            //---- CORE charts ----
            rowW = this.addChart(rowW, "Grid", "fnChartPickerGrid", "View the shapes in a single level grid");
            rowW = this.addChart(rowW, "Column", "fnChartPickerCol", "Organize shapes into verticalcolumns");
            rowW = this.addChart(rowW, "Scatter", "fnChartPickerScatter", "Plot data in X and Y");
            rowW = this.addChart(rowW, "Density", "fnChartPickerDensity", "Organize shapes into X and Y bins");
            rowW = this.addChart(rowW, "Stacks", "fnChartPickerStacks", "Organize shapes into X and Y bins, stacked in Z");
            rowW = this.addChart(rowW, "Squarify", "fnChartPickerSquarify", "Draw shapes from largest to smallest arranged in a rectangle");

            //---- EXPERIMENTAL charts ----
            rowW = this.addChart(rowW, "Random", "fnChartPickerRandom", "Arrange the shapes at random withing the plot");
            rowW = this.addChart(rowW, "Poisson", "fnChartPickerPoisson", "Arrange the shapes using poisson spacing");
            rowW = this.addChart(rowW, "Spiral", "fnChartPickerSpiral", "Arrange the shapes in a spiral layout");
            rowW = this.addChart(rowW, "Line", "fnChartPickerLine", "View the shapes as line across the horizontal axis");
            rowW = this.addChart(rowW, "Radial", "fnChartPickerRadial", "Plot data with X as the angle and Y as the radius");
            rowW = this.addChart(rowW, "Xband", "fnChartPickerHRug", "Plot the shapes along the horizontal axis");

            rowW = this.addChart(rowW, "Yband", "fnChartPickerVRug", "Plot the shapes along the vertical axis");
            rowW = this.addChart(rowW, "Scatter3D", "fnChartPickerScatter3d", "Plot data in X, Y, and Z", "Scatter-3D");
            rowW = this.addChart(rowW, "Bar", "fnChartPickerBar", "Organize shapes into horizontal bars");
            rowW = this.addChart(rowW, "Violin", "fnChartPickerViolin", "Organize shapes into X and Y bins, with width of bins representing the count");
            rowW = this.addChart(rowW, "Custom", "fnChartPickerCustom", "Build a custom chart");

            this.application/*appClass.instance*/.registerForChange("chart", (e) =>
            {
                this.changeSelectedChart();
            });
        }

        getChartElemByName(name: string)
        {
            var elemX = null;

            var elemsW = vp.select(this.container, ".chartPickerEntry");
            elemsW.each((index, elem) =>
            {
                if (elem.returnName == name)
                {
                    elemX = elem;
                    return false;
                }
            });

            return elemX;
        }

        changeSelectedChart()
        {
            var value = /*appClass.instance*/this.application._chartName;

            if (this._selectedChartElem)
            {
                vp.select(this._selectedChartElem)
                    .attr("data-selected", "false")
            }

            this._selectedChartElem = this.getChartElemByName(value);

            if (this._selectedChartElem)
            {
                vp.select(this._selectedChartElem)
                    .attr("data-selected", "true")
            }
        }

        addChart(rowW: vp.dom.singleWrapperClass, title: string, imgSrc: string, tooltip: string, valueText?: string)
        {
            var propName = "is" + title + "Enabled";
            var isEnabled = /*appSettingsMgr.instance*/this.application[propName]();
            if (isEnabled)
            {
                var startNewRow = (rowW[0].children.length >= 6);

                if (startNewRow)
                {
                    var tableW = vp.select(rowW[0].parentNode);
                    //---- spacing row ----
                    var rowW = tableW.append("tr")
                        .css("height", "10px");

                    rowW = tableW.append("tr")
                }

                if (!valueText)
                {
                    valueText = title;
                }

                var tdW = rowW.append("td")
                    .addClass("chartPickerEntry")
                    .title(tooltip)
                    .attach("click", (e) =>
                    {
                        this.onClick(e);
                    })

                var imgW = tdW.append("img")
                    .addClass("chartPickerImage")
                    .attr("src", imgSrc)
                    .css("width", "80px")
                    .attach("dragstart", function (e)
                    {
                        //---- prevent drag of icon ----
                        e.preventDefault();
                    });

                var titleW = tdW.append("div")
                    .addClass("chartPickerTitle")
                    .text(title)

                if (this._currentChart == title)
                {
                    tdW.attr("data-selected", "true")
                    this._selectedChartElem = tdW[0];
                }

                tdW[0].returnName = valueText;
            }

            return rowW;
        }

        onClick(e)
        {
            var elem = e.target;
            if (!elem.returnName)
            {
                elem = elem.parentNode;
            }

            this._callback(elem.returnName);

            this.onUserAction(null, true);
        }
   }
}