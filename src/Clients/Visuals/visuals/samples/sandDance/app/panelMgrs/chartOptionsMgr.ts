//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    chartOptionsMgr.ts - manages the "chartOptions.js" floating panel.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class ChartOptionsMgrClass extends BaseAppControlClass
    {
        _jsonPanel: JsonPanelClass;

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, uiName: string, isChartCustom: boolean)
        {
            super();

            var rc = vp.select(container, ".bbChart").getBounds(false);

            var jsonPanel = buildJsonPanel(application, settings, container, "bbChart", settings, "chartOptionsPanel", true, rc.left, rc.bottom);
            this._jsonPanel = jsonPanel;

            jsonPanel.registerForChange("close", (e) =>
            {
                this.onDataChanged("close");
            });

            this.updateControlsToMatchChart(uiName, isChartCustom);
        }

        getRootElem()
        {
            return this._jsonPanel.getRootElem();
        }

        close()
        {
        }

        isPinnedDown(value?: boolean)
        {
            return this._jsonPanel.isPinnedDown(value);
        }

        openCustomTab()
        {
            var tabW = vp.select(this._jsonPanel.getRootElem(), "#customTab");
            this._jsonPanel.onTabSelected(tabW[0]);
        }

        hideRow(firstRowElem: HTMLTableRowElement, row: number)
        {
            var tableElem = <HTMLTableElement>firstRowElem.parentNode;
            var rowElem = <HTMLElement>tableElem.rows[7 + row];

            rowElem.style.display = "none";

            return rowElem;
        }

        showRow(rowElem: HTMLElement)
        {
            rowElem.style.display = "";
        }

        showAt(x: number, y: number, x2?: number, y2?: number)
        {
            this._jsonPanel.showAt(x, y, x2, y2);
        }

        updateControlsToMatchChart(uiName: string, isChartCustom: boolean)
        {
            //---- start by hidding all chart-specific controls ----
            var root = this._jsonPanel.getRootElem();
            var chartTypeW = vp.select(root, "#chartType").text(uiName + ": ");
            var firstRow = chartTypeW[0].parentNode.parentNode;

            var emptyRow = this.hideRow(firstRow, 0);
            var xGrid = this.hideRow(firstRow, 1);
            var yGrid = this.hideRow(firstRow, 2);
            var emptyRow2 = this.hideRow(firstRow, 3);
            var separator = this.hideRow(firstRow, 4);
            var stackingCols = this.hideRow(firstRow, 5);
            var numCols = this.hideRow(firstRow, 6);
            var buildFromTop = this.hideRow(firstRow, 7);
            var nextSpiral = this.hideRow(firstRow, 8);
            //var empty2 = this.hideRow(firstRow, 9);
            //var customTitle = this.hideRow(firstRow, 10);
            //var empty3 = this.hideRow(firstRow, 11);
            //var customPicker = this.hideRow(firstRow, 12);

            //---- charts from ROW #1 ----
            if (uiName == "Grid")
            {
                this.showRow(separator);
                this.showRow(numCols);
                this.showRow(buildFromTop);
            }
            else if (uiName == "Squarify")
            {
                this.showRow(separator);
            }
            else if (uiName == "Spiral")
            {
                this.showRow(nextSpiral);
            }
            else if (uiName == "Random")
            {
            }
            else if (uiName == "Radial")
            {
            }
            //else if (isChartCustom)
            //{
            //    this.showRow(customPicker);
            //}

            //---- charts from ROW #2 ----
            if (uiName == "Column" || uiName == "Bar" || uiName == "Density" || uiName == "Violin")
            {
                this.showRow(xGrid);
                this.showRow(yGrid);
            }
            else if (uiName == "Stacks")
            {
                this.showRow(stackingCols);
            }

            //---- charts from ROW #3 ----
            if (uiName == "Scatter")
            {
                this.showRow(xGrid);
                this.showRow(yGrid);
            }
            else if (uiName == "Line")
            {
                this.showRow(xGrid);
                this.showRow(yGrid);
            }
            else if (uiName == "X-Band")
            {
                this.showRow(xGrid);
            }
            else if (uiName == "Y-Band")
            {
                this.showRow(yGrid);
            }
            else if (uiName == "Line")
            {
                this.showRow(xGrid);
                this.showRow(yGrid);
            }
            else if (uiName == "Scatter-3D")
            {
            }
        }
    }
}