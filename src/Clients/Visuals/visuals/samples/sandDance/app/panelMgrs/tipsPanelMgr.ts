//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    tipsPanelMgr.ts - manages the tooltips/datatip floating panel.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class TipsPanelMgr extends JsonControlClass
    {
        private application: AppClass;
        private settings: AppSettingsMgr;
        private container: HTMLElement;

        //---- TOOLTIP params ----
        _includeNamesInTooltip: boolean;
        _tooltipColumns: string[];

        //---- DATATIP param s----
        _includeNamesInDatatip: boolean;
        _datatipColumns: string[];
        _datatipTitle = "";

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, buttonId: string)
        {
            super();

            this.application = application;
            this.settings = settings;
            this.container = container;

            var rc = vp.select(this.container, "." + buttonId).getBounds(false);
            var x = rc.left;
            var y = rc.bottom;

            var jsonPanel = buildJsonPanel(this.application, this.settings, this.container, buttonId, this, "tipsPanel", true, x, y);
            this._jsonPanel = jsonPanel;

            jsonPanel.registerForChange("close", (e) =>
            {
                this.onDataChanged("close");
            });

            var rootElem = jsonPanel.getRootElem();

            var tabZeroW = vp.select(rootElem, "#tab0Content");
            this.createCheckboxColumnList("tooltips", tabZeroW);

            var tabOneW = vp.select(rootElem, "#tab1Content");
            this.createCheckboxColumnList("datatips", tabOneW);

            //---- add CREATE button (at end of datatips panel) ----
            var buttonW = tabOneW.append("span")
                .addClass("panelButton")
                .text("Create")
                .css("width", "60px")
                .css("margin", "6px")
                .attach("click", (e) => this.createDataTip())
        }

        tooltipColumns(value?: string[])
        {
            if (arguments.length == 0)
            {
                return this._tooltipColumns;
            }

            this._tooltipColumns = value;
            this.onDataChanged("tooltipColumns");
        }

        includeNamesInTooltip(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._includeNamesInTooltip;
            }

            this._includeNamesInTooltip = value;
            this.onDataChanged("includeNamesInTooltip");
            this.onDataChanged("tooltipParams");
        }

        datatipTitle(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._datatipTitle;
            }

            this._datatipTitle = value;
            this.onDataChanged("datatipTitle");
        }

        includeNamesInDatatip(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._includeNamesInDatatip;
            }

            this._includeNamesInDatatip = value;
            this.onDataChanged("includeNamesInDatatip");
        }

        createCheckboxColumnList(panelName: string, parentW: vp.dom.IWrapperOuter)
        {
            var colInfos = /*appClass.instance*/this.application._colInfos;

            var divW = parentW.append("div")
                .addClass("panelDisplay")
                .text("Choose column(s) for " + panelName + ":")
                .css("margin", "6px")
                .css("margin-top", "20px")

            var listW = parentW.append("div")
                .css("border", "1px solid #333")
                .css("margin", "6px")
                .css("max-height", "150px")
                .css("overflow-y", "auto")
                .css("overflow-x", "hidden")
            
            for (var i = 0; i < colInfos.length; i++)
            {
                var ci = colInfos[i];

                createCheckboxAssembly(listW[0], ci.name, false, (e) =>
                {
                    if (panelName == "tooltips")
                    {
                        this.onTooltipCheckboxesChanged(listW);
                    }
                    else
                    {
                        this.onDatatipCheckboxesChanged(listW);
                    }
                });
            }
        }

        onTooltipCheckboxesChanged(listW: vp.dom.IWrapperOuter)
        {
            var cols = [];

            vp.select(listW[0], ".searchCheckboxRow").each((index, elem) =>
            {
                if (elem.checkbox.checked)
                {
                    cols.push(elem.key);
                }
            });

            this._tooltipColumns = cols;

            this.onDataChanged("tooltipParams");
        }

        onDatatipCheckboxesChanged(listW: vp.dom.IWrapperOuter)
        {
            var cols = [];

            vp.select(listW[0], ".searchCheckboxRow").each((index, elem) =>
            {
                if (elem.checkbox.checked)
                {
                    cols.push(elem.key);
                }
            });

            this._datatipColumns = cols;

            this.onDataChanged("datatipParams");
        }

        hoverOnMouseMove(value?: boolean)
        {
            return /*appSettingsMgr.instance*/this.settings.hoverOnMouseMove.apply(/*appSettingsMgr.instance*/this.settings, arguments);
        }

        isTooltipsEnabled(value?: boolean)
        {
            /*appSettingsMgr.instance*/this.settings.isTooltipsEnabled.apply(/*appSettingsMgr.instance*/this.settings, arguments);
        }

        createDataTip()
        {
            /*appClass.instance*/this.application.createDataTip(this._datatipTitle,
                this._datatipColumns, this._includeNamesInDatatip);
        }

        showAt(x: number, y: number, x2?: number, y2?: number)
        {
            this._jsonPanel.showAt(x, y, x2, y2);
        }

        getJsonPanel()
        {
            return this._jsonPanel;
        }

        close()
        {
            this._jsonPanel.close();
        }

   }
}