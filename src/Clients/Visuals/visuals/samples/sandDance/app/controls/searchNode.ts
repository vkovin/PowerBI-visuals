//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    searchNode.ts - control for a single search node.  
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class SearchNodeClass extends BaseAppControlClass
    {
        private application: AppClass;
        private container: HTMLElement;

        _titleElem: HTMLElement;
        _contentElem: HTMLElement;
        _lowerContentElem: HTMLElement;
        _barParent: HTMLElement;
        _titleRowElem: HTMLElement;

        _nodeData: SearchNodeData;
        _isOpen = true;
        _dblSlider: DoubleSliderControl;
        _allName = "( All )";
        _isSortByCount = true;
        _isDescendingSort = true;
        _maxKeys = 100;

        constructor(application: AppClass, container: HTMLElement, parentElem: HTMLElement, name: string)
        {
            super();

            this.application = application;
            this.container = container;

            this._nodeData = new SearchNodeData(name, "number");

            //---- ROOTl ----
            var rootW = vp.select(parentElem).append("div")
                .addClass("searchNodeShell")

            //---- TITLE ----
            var titleRowW = rootW.append("div")
                .css("position", "relative")
                .css("background", "#333")     // so that click works in all places
                .css("height", "24px")
                .attach("click", (e) =>
                {
                    this.toggleOpen();

                    vp.events.cancelEventBubble(e);
                    vp.events.cancelEventDefault(e);
                })

            var titleW = titleRowW.append("div")
                .addClass("panelDisplay searchNodeTitle")
                .css("margin", "6px")
                .css("width", "260px")
                //.css("border", "1px solid green")

            //---- CLOSE button----
            var imgCloseW = titleRowW.append("div")//img
                .addClass("clickIcon")
                // .attr("src", fnClose)
                .addClass("fnClose")
                .css("width", "20px")
                .css("margin-left", "4px")
                .css("position", "absolute")
                .css("top", "0px")
                .css("right", "4px")
                .attach("click", (e) => this.onDataChanged("closeRequest"))

            //---- CONTENT ----
            var contentW = rootW.append("div")
                .addClass("searchNodeContent")

            this._root = rootW[0];
            this._titleElem = titleW[0];
            this._contentElem = contentW[0];
            this._titleRowElem = titleRowW[0];

            this.buildShellContent(contentW);
            this.updateTitle();
        }

        getNodeData()
        {
            return this._nodeData;
        }

        toggleOpen()
        {
            this._isOpen = (!this._isOpen);

            vp.select(this._contentElem).css("display", (this._isOpen) ? "" : "none");
        }

        colName(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._nodeData.colName;
            }

            if (value == this._allName)
            {
                value = null;
            }

            if (this._nodeData.colName != value)
            {
                this._nodeData.colName = value;

                this.onColNameChanged();
            }
        }

        onColNameChanged()
        {
            var colType = /*appClass.instance*/this.application.getColType(this.colName());
            var nodeData = this._nodeData;
            nodeData.colType = colType;

            //---- clear out previous nodeData selected by user ----
            nodeData.min = undefined;
            nodeData.max = undefined;
            nodeData.valueList = null;

            this.rebuildLowerContent();
            this.onDataChanged("colName");

            this.updateTitle();
         }

        values(value?: string[], isIncremental?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._nodeData.valueList;
            }

            if (this._nodeData.valueList != value || ! isIncremental)
            {
                this._nodeData.valueList = value;
                this.onValuesChanged(isIncremental);
            }
        }

        updateTitle()
        {
            var values = this.values();
            var nodeData = this._nodeData;
            var colName = this.colName();

            var title = (colName) ? (colName + ": ") : ("All: ");

            if (values && values.length)
            {
                for (var i = 0; i < values.length; i++)
                {
                    if (i > 0)
                    {
                        title += ", ";
                    }

                    title += values[i];
                }
            }
            else if (nodeData.min !== undefined)
            {
                var formatter = vp.formatters.createNumFormatterFromRange(nodeData.min, nodeData.max);
                title += formatter(nodeData.min) + "-" + formatter(nodeData.max);
            }
            else
            {
                title = "";
            }

            vp.select(this._titleElem)
                .text(title)
                .title(title)

            //---- collapse title if this is initial/empty node ----
            //vp.select(this._titleRowElem)
            //    .css("height", (title=="") ? "0px" : "20px")
        }

        buildShellContent(contentW: vp.dom.singleWrapperClass)
        {
            var colSearchW = contentW.append("div")
                .css("white-space", "nowrap")

            //---- SEARCH BOX ----
            var searchW = colSearchW.append("input")
                .addClass("searchText")
                .attr("type", "text")
                .css("width", "150px")
                .css("margin", "10px")
                .attr("placeholder", "Search")
                .css("position", "relative")
                .css("top", "4px")
                .attach("focus", (e) =>
                {
                    e.target.select();
                })
                .attach("keydown", (e) =>
                {
                    this.onTextKeyDown(e);
                })
                 .attach("keyup", (e) =>
                {
                    var text = e.target.value;
                    this._nodeData.textSearchType = bps.TextSearchType.contains;
                    this._nodeData.textCaseSensitive = false;
                    this.values([text], true);
                })
                .attach("change", (e) =>
                {
                    var text = e.target.value;
                    this._nodeData.textSearchType = bps.TextSearchType.contains;
                    this._nodeData.textCaseSensitive = false;
                    this.values([text]);
                })

            //---- COLUMN PICKER ----
            var colPickerValues = /*appClass.instance*/this.application.getMappingCols(true, this._allName);
            var colPicker = new PickerClass(this.application, this.container, colSearchW[0], null, colPickerValues, this._allName, "Select a column for this search node",
                true, 20);

            var colPickerW = vp.select(colPicker.getRoot())
                .css("margin", "10px")

            colPicker.registerForChange("value", (e) =>
            {
                var itemText = colPicker.value();
                this.colName(itemText);
            });

            var lowerContentW = contentW.append("div");
            this._lowerContentElem = lowerContentW[0];

            //this.rebuildLowerContent();
        }

        onTextKeyDown(e)
        {
            if (e.keyCode == vp.events.keyCodes.enter)
            {
                //---- this select will trigger a "change" event ----
                e.target.select();

                //var newValue = e.target.value;
                //this.values([newValue]);
            }
            else if (e.keyCode == vp.events.keyCodes.escape)
            {
                setTimeout((ee) =>
                {
                    e.target.select();
                    var newValue = e.target.value;
                    this._nodeData.textSearchType = bps.TextSearchType.contains;
                    this._nodeData.textCaseSensitive = false;

                    this.values([newValue]);
                }, 10);
            }
        }

        rebuildLowerContent()
        {
            this._barParent = null;

            if (this._nodeData.colName)
            {
                if (this._nodeData.colType == "string")
                {
                    this.rebuildCheckboxes();
                }
                else
                {
                    this.buildRange();
                }
            }

            this.onNodeDataChanged(true);
        }

        rebuildCheckboxes()
        {
            /*appClass.instance*/this.application._bpsHelper.getColumnKeyCounts(this.colName(),
                this._isSortByCount, this._isDescendingSort, this._maxKeys, (msgBlock) =>
                {
                    var contentElem = this.buildCheckBoxesCore(msgBlock.keyCountList);

                    //---- after content is completely built, do a quick switch ----
                    var lowerContentW = vp.select(this._lowerContentElem)
                        .clear()
                        .append(contentElem);
                });
        }

        buildCheckBoxesCore(keyCountList: any[])
        {
            var contentW = vp.select(/*document.body*/this.container).append("div");  

            //---- SORT LINE ----
            var sortLineW = contentW.append("div");  

            var promptW = sortLineW.append("span")
                .addClass("panelDisplay")
                .text("Sort:")
                .css("margin", "10px")
                .css("margin-right", "0px")

            var sortW = sortLineW.append("a")
                .addClass("panelAnchor")
                .text((this._isSortByCount) ? "Quanity" : "A-Z")
                .css("margin", "10px")
                .css("margin-left", "4px")
                .attach("click", (e) => this.toggleSortByCount(e))

            var reverseW = sortLineW.append("a")
                .addClass("panelAnchor")
                .text((this._isDescendingSort) ? "Descending" : "Ascending")
                .css("margin", "10px")
                .css("margin-left", "30px")
                .attach("click", (e) => this.toggleDescending(e))

            //---- CHECKBOX TABLE ----
            var tableW = contentW.append("table")
                .css("width", "300px")
                .css("margin", "10px")

            for (var i = 0; i < keyCountList.length; i++)
            {
                if (i >= this._maxKeys)
                {
                    break;
                }

                var pair = keyCountList[i];

                //---- CHECKBOX ROW ----
                var rowW = tableW.append("tr")
                    .addClass("searchCheckboxRow")
                    .attach("click", (e) =>
                    {
                        this.onCheckboxClick(e);
                    })

                var tdW = rowW.append("td")
                    .css("width", "20px")      

                //---- CHECKBOX ----
                var cbW = tdW.append("input")
                    .attr("type", "checkbox")
                    .addClass("panelCheckbox")

                //---- TEXT ----
                var textW = rowW.append("td").append("span")
                    .addClass("panelDisplay searchColKey")
                    .text(pair.key)

                tdW = rowW.append("td")
                    .css("width", "20px")      

                //---- COUNT ----
                var countW = tdW.append("span")
                    .addClass("panelDisplay")
                    .addClass("searchColCounts")
                    .text(pair.count + "")

                rowW[0].checkbox = cbW[0];
                rowW[0].keyElem = textW[0];
                rowW[0].countElem = countW[0];
                rowW[0].key = pair.key;
            }

            return contentW[0];
        }

        toggleDescending(e)
        {
            this._isDescendingSort = (!this._isDescendingSort);
            //e.target.textContent = (this._isDescendingSort) ? "Descending" : "Ascending";

            this.rebuildLowerContent();
        }

        toggleSortByCount(e)
        {
            this._isSortByCount = (!this._isSortByCount);
            //e.target.textContent = (this._isSortByCount) ? "Quanity" : "A-Z";

            this.rebuildLowerContent();
        }

        onCheckboxClick(e)
        {
            var target = e.target;

            while (target && target.key === undefined)
            {
                target = target.parentNode;
            }

            if (target)
            {
                var key = target.key;
                var cbElem = target.checkbox;

                var isChecked = cbElem.checked;

                if (cbElem != e.target)
                {
                    //---- toggle the checkbox ----
                    isChecked = (!isChecked);
                    cbElem.checked = isChecked;
                }

                var nodeData = this._nodeData;
                var valueList = nodeData.valueList;
                if (!valueList)
                {
                    valueList = [];
                    nodeData.valueList = valueList;
                }

                if (isChecked)
                {
                    //---- ADD KEY ----
                    if (valueList.indexOf(key) == -1)
                    {
                        valueList.push(key);
                    }
                }
                else
                {
                    //---- REMOVE KEY ----
                    valueList.remove(key);
                }

                this.updateRowColors(target, isChecked);
                this._nodeData.textSearchType = bps.TextSearchType.exactMatch;
                this._nodeData.textCaseSensitive = true;

                this.onValuesChanged();

                if (cbElem !== e.target)
                {
                    vp.events.cancelEventBubble(e);
                    vp.events.cancelEventDefault(e);
                }
            }
        }

        onValuesChanged(isIncremental?: boolean)
        {
            this.onDataChanged("values");
            this.onNodeDataChanged(true, isIncremental);
        }

        onNodeDataChanged(notify: boolean, isIncremental?: boolean)
        {
            this.updateTitle();

            if (notify)
            {
                this.onDataChanged((isIncremental) ? "incrementalNodeData" : "nodeData");
            }
        }

        updateRowColors(rowElem: any, markAsSelected: boolean)
        {
            //---- update the KEY TEXT ----
            vp.select(rowElem.keyElem).attr("data-selected", (markAsSelected) ? "true" : "false");

            //---- update the COUNT TEXT ----
            vp.select(rowElem.countElem).attr("data-selected", (markAsSelected) ? "true" : "false");
        }

        buildRange()
        {
            var contentW = vp.select(/*document.body*/this.container).append("div");

            //---- HISTOGRAM BARS ----
            var rc = vp.select(this._lowerContentElem).getBounds(false);
            var padding = new Range(30, rc.width - 30);

            var md = new bps.MappingData(this.colName(), 9);
            /*appClass.instance*/this.application._bpsHelper.getBinData(md, (msgBlock) =>
            {
                var binResults = <beachParty.BinResult>JSON.parse(msgBlock.param);

                var tableW = contentW.append("table")
                    .addClass("noSpaceTable")
                    .css("margin-left", padding.left + "px")
                    .css("width", (padding.right-padding.left) + "px")    

                var rowW = tableW.append("tr")
                    .css("height", "100px")

                this._barParent = rowW[0];

                var counts = binResults.bins.map((b) => { return b.count });
                var maxCount = counts.max();
                var minValue = 0;
                var maxValue = 0;

                for (var i = 0; i < binResults.bins.length; i++)
                {
                    var tdW = rowW.append("td")
                        .css("vertical-align", "bottom")

                    var bin = <beachParty.BinInfoNum> binResults.bins[i];
                    var percent = 100 * (bin.count / maxCount);
                    var formatter = vp.formatters.createNumFormatterFromRange(bin.min, bin.max);
                    var min = formatter(bin.min);
                    var max = formatter(bin.max);

                    var barW = tdW.append("div")
                        .addClass("searchHistoBar")
                        .css("height", percent + "px")
                        .css("vertical-align", "bottom")
                        .title(min + "-" + max + ": count=" + bin.count)
                        .attach("click", (e) =>
                        {
                            this.onBarClick(e);
                        })

                    barW[0].bin = bin;

                    if (i == 0)
                    {
                        minValue = bin.min;
                    }
                    else if (i == binResults.bins.length - 1)
                    {
                        maxValue = bin.max;
                    }
                }

                //---- DOUBLE SLIDER ----
                var dsParentW = contentW.append("div")
                    .css("margin-top", "6px")

                var outer = new Range(minValue, maxValue);

                var span = outer.right - outer.left;
                var inner = new Range(outer.left, outer.right);     // outer.left + .25 * span, outer.left + .75 * span);

                var dblSlider = new DoubleSliderControl(dsParentW[0], outer, inner, padding);
                this._dblSlider = dblSlider;

                dblSlider.registerForChange("inner", (e) =>
                {
                    var newInner = dblSlider.inner();

                    this._nodeData.min = newInner.left;
                    this._nodeData.max = newInner.right;

                    this.updateBarColors();

                    this.onNodeDataChanged(false);
                });

                //---- wait for change to complete (mouse UP event) before telling outside world ----
                dblSlider.registerForChange("innerCompleted", (e) =>
                {
                    this.onNodeDataChanged(true);
                });

                this._nodeData.min = inner.left;
                this._nodeData.max = inner.right;

                this.updateTitle();
                this.updateBarColors();

                //---- after content is completely built, do a quick switch ----
                var lowerContentW = vp.select(this._lowerContentElem)
                    .clear()
                    .append(contentW[0]);
            });
        }

        /**
         * Set the bar colors (by setting data-selected true/false) according to the current nodeData
         min/max values;
         */
        updateBarColors()
        {
            if (this._barParent)
            {
                var nodeData = this._nodeData;
                var min = nodeData.min;
                var max = nodeData.max;

                var kidsW = vp.select(this._barParent).kids();
                for (var i = 0; i < kidsW.length; i++)
                {
                    var kid = kidsW[i];
                    var barElem = kid.firstChild;
                    var bin = barElem.bin;

                    //---- select the bar if it contains >= 50% of range ----
                    var markBar = false;

                    //--- does bin overlap with range? ----
                    if (bin.min <= max && bin.max >= min)
                    {
                        var overlap = Math.min(bin.max, max) - Math.max(bin.min, min);
                        markBar = overlap >= (bin.max - bin.min) / 2;
                    }

                    vp.select(barElem)
                        .attr("data-selected", (markBar) ? "true" : "false");
                }
            }
        }

        onBarClick(e)
        {
            var bin = <beachParty.BinInfoNum>e.target.bin;
            this._dblSlider.inner(new Range(bin.min, bin.max));

            this.onNodeDataChanged(true);
        }

        getRootElem()
        {
            return this._root;
        }


        close()
        {
            vp.select(this._root)
                .remove()
        }
    }
}