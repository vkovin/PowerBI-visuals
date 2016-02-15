//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    jsonPanel.ts - panel that is built from a JSON description
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    var nextId = 1;

    export class JsonPanelClass extends BasePanelClass
    {
        static nextPickerButtonId = 1;

        _groupDataName: string;         // for groups of radio buttons
        _lastRowW = null;
        _controlsById: any = {};
        _primaryControl: IAppControl = null;           // if set, pass focus to this control
        _isCol1Indent = true;           // by default,  use indent instead of another TD
        _rowSpacing = null;
        _controls = [];
        _lastTdW = null;
        _acceptDataName = null;         // data name from the ACCEPT BUTTON
        _firstRowOfContent: boolean;
        _adjustSize = null;

        //---- tab stuff ----
        _currentTabContentElem: HTMLElement;
        _currentTabButtonElem: HTMLElement;

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, openerIds: string, dataOwner: beachParty.DataChangerClass, name: string, json: any, bgColor?: string,
            isCol1Indent = true)
        {
            super(application, settings, container, name, json.isDialog, bgColor, json.title, json.width, json.height, json.resizable, json.tip, json.hideClose,
                json.autoClose, json.OpacityDisabled);

            if (json.hideTitle)
            {
                this.showTitle(false);
            }

            this._dataOwner = dataOwner;
            this._isCol1Indent = isCol1Indent;
            this._openerIds = openerIds;
            this._adjustSize = json.adjustSize;

            this._rowSpacing = json.rowSpacing;
            this._isDialog = json.isDialog;

            if (json.minHeight)
            {
                vp.select(this._root)
                    .css("min-height", json.minHeight + "px")
            }

            if (json.minWidth)
            {
                vp.select(this._root)
                    .css("min-width", json.minWidth + "px")
            }

            if (json.maxWidth)
            {
                vp.select(this._root)
                    .css("max-width", json.maxWidth + "px")
            }

            var rootW = vp.select(this._contentRow);

            rootW.css("margin-botom", "-15px");     // remove some of space between title bar and first content

            //---- create CONTENT ----
            if (json.tabs)
            {
                this.buildTabs(rootW, json.tabs, json.rightAlignTabs);
            }
            else if (json.rows)
            {
                //---- rows at top level (no tabs) ----
                this.createTabContent(rootW, null, json.rows);
            }

            if (json.adjustSize)
            {
                setTimeout((e) =>
                {
                    this.resizePanelToFitContent();
                }, 10);
            }

            this.onPinnedDownChanged();         // update listbox classes to match gray/black background

            if (json.isPinned !== undefined)
            {
                this.isPinnedDown(json.isPinned);
            }

            this.setFocusToFirstControl();
        }

        resizePanelToFitContent()
        {
            this._resizeTarget = (this._primaryControl) ? this._primaryControl.getRootElem() : this._root;

            this.removeMaxSizesFromResizeTarget();

            var rc = vp.dom.getBounds(this._resizeTarget);
            var width = this._adjustSize.width + rc.width;
            var height = this._adjustSize.height + rc.height;

            this.changePanelSize(width, height);
        }

        showTab(tabName: string, show: boolean)
        {
            if (RelationMgrClass.instance.getFileCount() < 2)
            {
                vp.select(this._root, "#" + tabName).css("display", (show) ? "" : "none");
            }
        }

        setFocusToFirstControl()
        {
            var lowElem = null;
            var lowIndex = null;

            for (var i = 0; i < this._controls.length; i++)
            {
                var control = this._controls[i];

                var strIndex = control.getAttribute("tabIndex");
                if (strIndex && strIndex != "")
                {
                    var index = +strIndex;

                    //vp.utils.debug("setFocusToFirstControl: found control=" + control + ", tagName=" + control.tagName + ", id=" + 
                    //    control.id + ", text=" + control.textContent + ", with tabIndex= " + index);

                    if (lowIndex == null || index <= lowIndex)
                    {
                        lowIndex = index;
                        lowElem = control;
                    }          
                }

            }

            if (lowElem)
            {
                //vp.utils.debug("setFocusToFirstControl: USING control=" + lowElem + ", tagName=" + lowElem.tagName + ", id=" +
                //    lowElem.id + ", text=" + lowElem.textContent + ", with tabIndex= " + lowElem.tabIndex);

                setTimeout((e) => lowElem.focus(), 50);    // delay 100 ms as needed
            }
        }

        buildTabs(parentW: vp.dom.IWrapperOuter, tabs: any, rightAlignTabs: boolean)
        {
            var firstTabButton = null;

            //---- create container for tab buttons ----
            var tabButtonContainerW = parentW.append("div")

            tabButtonContainerW
                .addClass("tabButtonContainer")

            for (var i = 0; i < tabs.length; i++)
            {
                var tab = tabs[i];

                //---- add tab button ----
                var id = (tab.id) ? tab.id : ("tab" + i);

                var tabButtonW = tabButtonContainerW.append("span")
                    .addClass("tabButton")
                    .addClass(id)
                    .attr("tabId", id)
                    // .id(id)
                    .text(tab.tabName)
                    .title(tab.tip)
                    .attach("click", (e) =>
                    {
                        this.onTabSelected(e.target);
                    })

                //---- add tab content ----
                var contentId = id + "Content";

                var tabContentW = this.createTabContent(parentW, contentId, tab.rows)
                    .css("margin-top", "10px")

                if (i == 0)
                {
                    firstTabButton = tabButtonW[0];
                }
            }

            //---- make the first tab active ----
            this.onTabSelected(firstTabButton);
        }

        onTabSelected(tabButton: HTMLElement)
        {
            //---- hide current tab content ----
            if (this._currentTabContentElem)
            {
                vp.select(this._currentTabContentElem)
                    .css("display", "none");

                vp.select(this._currentTabButtonElem)
                    .removeClass("tabButtonOpen");

                this._currentTabContentElem = null;
                this._currentTabButtonElem = null;
            }

            //---- make new tab content visible ----
            var buttonId = $(tabButton).attr("tabId");
            var contentId = buttonId + "Content";

            var tabContentW = vp.select(this._root, "." + contentId);

            if (tabContentW.length)
            {
                tabContentW
                    .css("display", "");         // makes it default to visible;

                var tabButtonW = vp.select(this._root, "." + buttonId)
                    .addClass("tabButtonOpen");

                this._currentTabContentElem = tabContentW[0];
                this._currentTabButtonElem = tabButtonW[0];
            }
        }

        addRow(tableW: any)
        {
            var rowW = tableW.append("tr")
                .addClass("panelRow");

            if (this._rowSpacing)
            {
                //---- always add a spacer row, to allow us to control space between rows -----
                tableW.append("tr")
                    .addClass("panelRowSpacer")
                    .css("height", this._rowSpacing);
            }

            return rowW;
        }

        startNewTable(parentW, rowSpanPos?: string)
        {
            var rowSpanTdW: vp.dom.IWrapperOuter = null;

            if (rowSpanPos)
            {
                //---- create "outer" table under parentW (to hold rowSpan content and normal innerTable) ----
                var outerTableW = parentW.append("table")
                    .css("position", "relative");

                var outerRowW = this.addRow(outerTableW);

                if (rowSpanPos === "left")
                {
                    rowSpanTdW = outerRowW.append("td")
                        .css("vertical-align", "top")
                        .addClass("rowSpanHolder");
                        //.attr("rowSpan", "99")
                }

                var tdMiddle = outerRowW.append("td")
                    .css("vertical-align", "top");

                var normalTableW = tdMiddle
                    .append("table")
                    .css("vertical-align", "top")
                    .css("position", "relative");

                if (rowSpanPos === "right")
                {
                    rowSpanTdW = outerRowW.append("td")
                        .css("vertical-align", "top")
                        .addClass("rowSpanHolder");
                        //.attr("rowSpan", "99")
                }

                if (rowSpanTdW)
                {
                    //---- add table/row ----
                    var tabW = rowSpanTdW = rowSpanTdW.append("table")
                        .css("position", "relative");

                    rowSpanTdW = this.addRow(tabW);
                }

            }
            else
            {
                var normalTableW = parentW.append("table")
                    .css("position", "relative");
            }

            return { normalTableW: normalTableW, rowSpanTdW: rowSpanTdW };
        }

        createTabContent(parentW: vp.dom.IWrapperOuter, id: string, rows: any)
        {
            var result = this.startNewTable(parentW);

            var tableW = result.normalTableW
                .addClass("panelContent");

            tableW.element()
                .addEventListener("mousedown", (e) => this.onFocus(e));

            if (id)
            {
                tableW
                    .css("display", "none")
                    .addClass(id);
            }

            for (var i = 0; i < rows.length; i++)
            {
                this._firstRowOfContent = (i === 0);

                var row = rows[i];
                tableW = this.buildRow(parentW, tableW, row);
            }

            return tableW;
        }

        getDataOwner(memberName: string)
        {
            var thisObj = this._dataOwner;
            if (!thisObj[memberName])
            {
                //---- if member not found in dataOwner, fallback to appClass ----
                thisObj = this.application;
            }

            return thisObj;
        }

        callMethod(methodName: string, ...params: any[])
        {
            if (methodName)
            {
                var thisObj = this.getDataOwner(methodName);
                var func = thisObj[methodName];

                var returnValue = func.apply(thisObj, params);
                return returnValue;
            }

            return undefined;
        }

        getControlById(id: string)
        {
            return this._controlsById[id];
        }

        getValue(propName: string)
        {
            //---- call property getter on dataOwner obj ----
            var thisObj = this.getDataOwner(propName);

            var value = thisObj[propName]();
            return value;
        }

        setValue(propName: string, value: any)
        {
            //---- call property setter on dataOwner obj ----
            var thisObj = this.getDataOwner(propName);

            thisObj[propName](value);
        }

        /** we return 'tableW', in case we created a new table that caller should continue using. */
        buildRow(parentW: vp.dom.IWrapperOuter, tableW: vp.dom.IWrapperOuter, row: any)
        {
            var rowW = null;
            var startNewRow = ((row.sameCell !== true) && (!row.col) || (row.col === 1));
            var control = null;

            //if (this._startNewRowPending)
            //{
            //    startNewRow = true;
            //    this._startNewRowPending = false;
            //}

            if (row.rowSpan)
            {
                rowW = this.addRow(tableW);
                var tdW = rowW.append("td");

                //var result = this.startNewTable(parentW, row.rowSpan);
                var result = this.startNewTable(tdW, row.rowSpan);

                rowW = result.rowSpanTdW;
                tableW = result.normalTableW;
            }
            else if (row.separator)
            {
                parentW.append("div")
                    .addClass("panelSeparator");

                var result = this.startNewTable(parentW);

                tableW = result.normalTableW
                    .addClass("panelContent");

                rowW = this.addRow(tableW);

            }
            else if (startNewRow)
            {
                rowW = this.addRow(tableW);
            }
            else
            {
                rowW = this._lastRowW;
            }

            //rowW    
            //    .css("position", "relative")

            var tdW = (row.sameCell) ? this._lastTdW : rowW.append("td");
            this._lastTdW = tdW;

            if (row.fillClient)
            {
                tdW
                    .attr("rowSpan", "999")
                    .attr("colSpan", "999");
            }

            if (row.col)
            {
                //---- skip to next column ----
                //tdW = rowW.append("td")
                //    .css("position", "relative")
                //    .css("left", "-55px")

                if (row.col === 1)
                {
                    if (this._isCol1Indent)
                    {
                        tdW.css("padding-left", "30px");
                    }
                    else
                    {
                        tdW = rowW.append("td");
                            //.css("position", "relative")
                            //.css("left", "-55px")
                    }
                }

            }

            tdW.addClass("panelColumn");

            if (row.emptyRow)
            {
                tdW.append("div")
                    .addClass("emptyRow");

                tdW
                    .attr("colSpan", "99");
            }
            else if (row.prompt !== undefined)
            {
                //---- create PROMPT ----
                var promptW = this.createLabel(tdW, row.prompt, row, row.tip, row.isHtml);

                if (row.colSpan != undefined)
                {
                    tdW.attr("colspan", row.colSpan)
                }

                if (row.maxWidth !== undefined)
                {
                    tdW.css("max-width", row.maxWidth + "px");
                }

                if (row.rightMargin !== undefined)
                {
                    promptW.css("margin-right", row.rightMargin + "px");
                }

                if (row.topMargin !== undefined)
                {
                    promptW.css("margin-top", row.topMargin + "px");
                }

                if (row.height !== undefined)
                {
                    rowW.css("height", row.height + "px");
                }

                this._groupDataName = row.dataName;
            }
            else if (row.progress)
            {
                //---- create PROGRESS BAR ----
                this.createProgress(tdW, row.progress, row, row.tip);
            }
            else if (row.image !== undefined)
            {
                this.createImage(row.image, tdW, row);
            }
            else if (row.button !== undefined)
            {
                this.createButton(row.button, tdW, row);
            }
            else if (row.text !== undefined)
            {
                this.createText(row.text, rowW, tdW, row);
                this._groupDataName = row.dataName;
            }
            else if (row.display !== undefined)
            {
                this.createDisplay(row.display, rowW, tdW, row);
            }
            else if (row.textArea !== undefined)
            {
                this.createTextArea(row.textArea, rowW, tdW, row);
                this._groupDataName = row.dataName;
            }
            else if (row.checkbox !== undefined)
            {
                this.createCheckbox(tdW, row);
            }
            else if (row.radio !== undefined)
            {
                this.createRadioButton(tdW, row);
            }
            else if (row.numAdjuster !== undefined)
            {
                this.createNumAdjuster(row.numAdjuster, rowW, tdW, row);
            }
            else if (row.tourPicker !== undefined)
            {
                this.createPicker(row.tourPicker, rowW, tdW, row, (dataName, ddText, chevronW, e) =>
                {
                    this.showTourPicker(row.dataName, ddText, chevronW, e);
                });
            }
            else if (row.scriptPicker !== undefined)
            {
                this.createPicker(row.scriptPicker, rowW, tdW, row, (dataName, ddText, chevronW, e) =>
                {
                    this.showScriptPicker(row.dataName, ddText, chevronW, e);
                });
            }
            else if (row.colPicker !== undefined)
            {
                this.createPicker(row.colPicker, rowW, tdW, row, (dataName, ddText, chevronW, e) =>
                {
                    this.showColumnPicker(row.dataName, ddText, chevronW, e);
                });
            }
            else if (row.colPickerList !== undefined)
            {
                this.createColumnPickerList(row.colPickerList, rowW, tdW, row);
            }
            else if (row.colorPicker !== undefined)
            {
                this.createPicker(row.colorPicker, rowW, tdW, row, (dataName, ddText, chevronW, e) =>
                {
                    this.showColorPicker(row.includeTransparent, dataName, ddText, chevronW, e, row);
                });
            }
            else if (row.knownDataPickerList !== undefined)
            {
                this.createKnownDataPickerList(row.knownDataPickerList, rowW, tdW, row);
            }
            else if (row.openDataPickerList !== undefined)
            {
                this.createOpenDataPickerList(row.openDataPickerList, rowW, tdW, row);
            }
            else if (row.knownDataPicker !== undefined)
            {
                this.createPicker(row.knownDataPicker, rowW, tdW, row, (dataName, ddText, chevronW, e) =>
                {
                    this.showDataPicker(dataName, ddText, chevronW, e);
                });
            }
            else if (row.enumPicker !== undefined)
            {
                this.createPicker(row.enumPicker, rowW, tdW, row, (dataName, ddText, chevronW, e) =>
                {
                    this.showEnumPicker(dataName, ddText, chevronW, row.enumType, e, row);
                });
            }
            else if (row.scrubberPicker !== undefined)
            {
                this.createPicker(row.enumPicker, rowW, tdW, row, (dataName, ddText, chevronW, e) =>
                {
                    this.showScrubberPicker(dataName, ddText, chevronW, row.enumType, e, row);
                });
            }
            else if (row.shapePicker !== undefined)
            {
                this.createPicker(row.shapePicker, rowW, tdW, row, (dataName, ddText, chevronW, e) =>
                {
                    this.showShapePicker(dataName, ddText, chevronW, e, row);
                });
            }
            else if (row.customList !== undefined)
            {
                this.createCustomList(row.customList, rowW, tdW, row);
            }
            else if (row.control)
            {
                var parts = row.control.split(".");
                var controlCreateFunc = <any>window;
                for (var p = 0; p < parts.length; p++)
                {
                    var part = parts[p];
                    controlCreateFunc = controlCreateFunc[part];
                }

                control = controlCreateFunc(this, this.application, this.container);
                var dataName = row.dataName;
                var thisObj = this.getDataOwner(dataName);

                if (control.dataParent)
                {
                    control.dataParent(thisObj);
                }

                var rootElem = control.getRootElem();

                tdW.append(rootElem);

                //---- set initial data ----
                var value = this.getValue(dataName);
                control[dataName](value);

                //---- route data from owner to control ----
                thisObj.registerForRemovableChange(dataName, this, (e) =>
                {
                    var value = this.getValue(dataName);
                    control[dataName](value);
                });

                this.applyCommonProperties(vp.select(rootElem), tdW, row, false);
            }

            if (row.id)
            {
                this._controlsById[row.id] = control;
                this._primaryControl = control;
            }

            this._lastRowW = rowW;

            //if (row.rowSpan)
            //{
            //    this._startNewRowPending = true;
            //}

            return tableW;
        }

        createCustomList(prompt: string, rowW: vp.dom.IWrapperOuter, tdW: vp.dom.IWrapperOuter, row: any)
        {
            //var value = this.getValue(row.dataName);

            this.createLabel(tdW, prompt, row, row.tip);

            if (row.showValue)
            {
                var value = this.getValue(row.dataName);

                var textW = tdW.append("span")
                    .addClass("panelValue")
                    .text(value);

                var thisObj = this.getDataOwner(row.dataName);
                thisObj.registerForRemovableChange(row.dataName, this, (e) =>
                {
                    value = <string>this.getValue(row.dataName);
                    textW.text(value);
                });
            }

            //---- create a vertically-scrolling list ----
            var listW = tdW.append("div")
                // .css("overflow-y", "hidden")
                .css("overflow-x", "hidden")
                .addClass("customList")
                .addClass("colorList")
                .css("vertical-align", "top");
                //.css("background", "yellow")

            var height = row.height;
            if (height !== undefined)
            {
                listW.css("height", height);
            }

            if (row.width !== undefined)
            {
                listW.css("width", row.width + "px");
            }

            if (row.colSpan !== undefined)
            {
                tdW.attr("colspan", row.colSpan);
            }

            if (row.refreshEvent)
            {
                var thisObj = this.getDataOwner(row.dataName);
                thisObj.registerForRemovableChange(row.refreshEvent, this, (e) =>
                {
                    this.rebuildCustomList(listW, row);
                });
            }

            this.rebuildCustomList(listW, row);
        }

        rebuildCustomList(listW, row)
        {
            listW
                .clear();

            var itemGetter = row.itemGetter;

            for (var i = 0; i < 999; i++)
            {
                //---- add each item ----
                var thisObj = this.getDataOwner(itemGetter);
                var itemElem = thisObj[itemGetter](i);
                if (!itemElem)
                {
                    break;
                }

                itemElem._index = i;

                listW.append(itemElem)
                    .attach("click", (e) => 
                    {
                        var elem = e.target;
                        while (elem.parentElement && (elem._index === undefined || elem._index === null))
                        {
                            elem = elem.parentElement;
                        }

                        var value = (elem._value !== undefined) ? elem._value : elem._index;

                        this.setValue(row.dataName, value);
                    });
            }
        }

        createButton(prompt: string, tdW: vp.dom.IWrapperOuter, row: any)
        {
            //---- create BUTTON ----
            if (row.img != undefined)
            {
                //---- an IMAGE-based button ----
                var buttonW = tdW.append("img")
                    .addClass("clickIcon")
                    .attr("src", row.img)
                    .title(row.tip)
                    .attr("tabIndex", "100")
            }
            else
            {
                //---- a TEXT-based button ----
                var buttonW = tdW.append("span")
                    .addClass("panelButton")
                    .text(row.button)
                    .title(row.tip)
                    .attr("tabIndex", "100")
            }

            //---- store on-click properties on each instance ----
            buttonW[0].dataName = row.dataName;
            buttonW[0].acceptButton = row.acceptButton;
            buttonW[0].cancelButton = row.cancelButton;

            if (row.acceptButton)
            {
                this._acceptDataName = row.dataName;
            }

            if (row.textAlign != undefined)
            {
                tdW
                    .css("text-align", row.textAlign)
            }

            if (row.leftMargin != undefined)
            {
                buttonW.css("margin-left", row.leftMargin + "px")
            }

            if (row.topMargin != undefined)
            {
                buttonW.css("margin-top", row.topMargin + "px")
            }

            if(row.bottomMargin != undefined)
            {
                buttonW.css("margin-bottom", row.bottomMargin + "px")
            }

            if (row.colSpan != undefined)
            {
                tdW.attr("colSpan", row.colSpan)
            }


            buttonW.attach("click", (e) =>
            {
                this.onClickButton(e);

                this.onUserAction(row);
            })

            buttonW.attach("keydown", (e) =>
            {
                if (e.keyCode == vp.events.keyCodes.enter)
                {
                    this.onClickButton(e);
                }
            })

            this.applyCommonProperties(buttonW, tdW, row);
        }

        createImage(src: string, tdW: vp.dom.IWrapperOuter, row: any)
        {
            //---- create IMG ----
            var imgW = tdW.append("img")
                .addClass("panelImage")
                .attr("src", src)
                .title(row.tip)

            this.applyCommonProperties(imgW, tdW, row);
        }

        createProgress(tdW: vp.dom.IWrapperOuter, prompt: string, row: any, tip: string)
        {
            var pgName = "progress" + nextId++;

            this.createLabel(tdW, prompt, row, row.tip);

            if (row.colSpan)
            {
                tdW.attr("colSpan", row.colSpan+"")
            }

            //---- create PROGRESS BAR ----
            //---- don't use HTML 5 since it uses animation, which we do NOT want ----

            //var progressW = tdW.append("progress")
            //    .attr("value", row.value)
            //    .attr("max", row.max)

            var progressW = tdW.append("div")
                .addClass("myProgressBar");

            var innerW = progressW.append("div")
                .addClass("myInnerProgressBar")
                .css("width", "0%")

            this.applyCommonProperties(progressW, tdW, row);
        }

        onEnterKey(isFromKeyboard = true)
        {
            var focusElem = document.activeElement;

            //---- ignore ENTER key in TEXTAREA ----
            if (focusElem.tagName != "TEXTAREA" || ! isFromKeyboard)
            {
                //---- simulate a button press on the ACCEPT BUTTON ----
                if (this._acceptDataName)
                {
                    this.callMethod(this._acceptDataName);
                }

                super.onEnterKey();
            }
        }

        onClickButton(e)
        {
            var elem = e.target;

            if (elem.acceptButton)
            {
                this.onEnterKey(false);
            }
            else
            {
                if (elem.dataName)
                {
                    this.callMethod(elem.dataName);
                }
            }

            if (elem.cancelButton)
            {
                this.onEscapeKey();
            }
        }

        applyCommonProperties(elemW: any, tdW: any, row: any, addAsControl = true)
        {
            if (addAsControl)
            {
                this._controls.push(elemW[0]);
            }

            if (row.textAlign)
            {
                //---- set on PARENT ----
                tdW.css("textAlign", row.textAlign);
            }

            if (row.readOnly)
            {
                elemW.attr("readonly", "true");
            }

            if (row.tabIndex !== undefined)
            {
                elemW[0].tabIndex = row.tabIndex;
            }

            if (row.width)
            {
                elemW.css("width", row.width)
            }

            if (row.height)
            {
                elemW.css("height", row.height)
            }

            if (row.marginLeft)
            {
                elemW.css("margin-left", row.marginLeft);
            }

            if (row.marginRight)
            {
                elemW.css("margin-right", row.marginRight);
            }

            if (row.marginTop)
            {
                elemW.css("margin-top", row.marginTop);
            }

            if (row.marginBottom)
            {
                elemW.css("margin-bottom", row.marginBottom);
            }

            if (row.id)
            {
                elemW.attr("id", row.id)
            }

            if (vp.utils.isString(row.disabled))
            {
                var thisObj = this.getDataOwner(row.disabled);
                thisObj.registerForChange(row.disabled, (e) =>
                {
                    var value = this.getValue(row.disabled);

                    //---- not sure if this is form control, so disable using both methods ----
                    elemW.attr("data-disabled", value)

                    if (value)
                    {
                        elemW.attr("disabled", "true");
                    }
                    else
                    {
                        elemW[0].removeAttribute("disabled");
                    }
                });
            }
        }

        createText(prompt: string, rowW: vp.dom.IWrapperOuter, tdW: vp.dom.IWrapperOuter, row: any)
        {
            var value = <string>this.getValue(row.dataName);

            if (value && row.capitalize)
            {
                value = value.capitalize();
            }

            if (prompt && prompt != "")
            {
                this.createLabel(tdW, prompt, row, row.tip);

                if (!row.sameCol)
                {
                    //---- add in next column ----
                    tdW = rowW.append("td");
                }
            }

            //---- create TEXT ----
            var textW = tdW.append("input")
                .addClass("panelText")
                .attr("type", "text")
                .value(value)
                .title(row.tip)
                .css("margin-top", "-7px")
                .attach("focus", (e) =>
                {
                    if (! row.noSelectOnFocus)
                    {
                        //---- select all text on focus ----
                        e.target.select();
                    }
                })
                .attach("blur", (e) =>
                {
                    var newValue = vp.dom.value(e.target);
                    this.callMethod(row.dataName, newValue);
                })

            if (row.leftMargin != undefined)
            {
                textW.css("margin-left", row.leftMargin + "px")
            }

            if (row.placeHolder != undefined)
            {
                textW.attr("placeHolder", row.placeHolder)
            }

            if (row.colSpan)
            {
                tdW.attr("colSpan", row.colSpan);
            }

            if (row.readonly)
            {
                textW.attr("readonly", "");
            }

            this.applyCommonProperties(textW, tdW, row);

            var thisObj = this.getDataOwner(row.dataName);
            thisObj.registerForRemovableChange(row.dataName, this, (e) =>
            {
                value = <string>this.getValue(row.dataName);

                if (value && row.capitalize)
                {
                    value = value.capitalize();
                }

                textW.value(value);
            });

        }

        /** create a div that displays readonly text. */
        createDisplay(prompt: string, rowW: vp.dom.IWrapperOuter, tdW: vp.dom.IWrapperOuter, row: any)
        {
            var value = <string>this.getValue(row.dataName);

            if (value && row.capitalize)
            {
                value = value.capitalize();
            }

            if (prompt && prompt != "")
            {
                this.createLabel(tdW, prompt, row, row.tip);

                if (!row.sameCol)
                {
                    //---- add in next column ----
                    tdW = rowW.append("td");
                }
            }

            //---- create DISPLAY ----
            var textW = tdW.append("div")
                .addClass("panelDisplay")
                .text(value)
                .title(row.tip)

            if (row.leftMargin != undefined)
            {
                textW.css("margin-left", row.leftMargin + "px")
            }

            this.applyCommonProperties(textW, tdW, row);

            var thisObj = this.getDataOwner(row.dataName);
            thisObj.registerForRemovableChange(row.dataName, this, (e) =>
            {
                value = <string>this.getValue(row.dataName);

                if (value && row.capitalize)
                {
                    value = value.capitalize();
                }

                textW.text(value);
            });

        }

        createLabel(tdW: vp.dom.IWrapperOuter, prompt: string, row: any,tip: string, isHtml?: boolean)
        {
            //---- create label ----
            var spanW = tdW.append("span")
                .addClass("panelPrompt")
                .title(tip)

            if (row.topMargin)
            {
                spanW
                    .css("display", "inline-block")

            }

            if (isHtml)
            {
                spanW.html(prompt)
            }
            else
            {
                spanW.text(prompt)
            }

            //---- make this cell top-aligned ----
            tdW
                .css("vertical-align", "top")

            this.applyCommonProperties(spanW, tdW, row);

            return spanW;
        }

        createTextArea(prompt: string, rowW: vp.dom.IWrapperOuter, tdW: vp.dom.IWrapperOuter, row: any)
        {
            var value = <string>this.getValue(row.dataName);

            if (prompt)
            {
                this.createLabel(tdW, prompt, row, row.tip);
            }

            //---- add in next column ----
            //tdW = rowW.append("td");

            //---- create TEXTAREA ----
            var textW = tdW.append("textarea")
                .addClass("panelTextArea")
                .value(value)
                .title(row.tip)
                .attach("focus", (e) =>
                {
                    //---- select all text on focus ----
                    e.target.select();
                })
                .attach("input", (e) =>
                {
                    var newValue = vp.dom.value(e.target);
                    this.callMethod(row.dataName, newValue);
                })

            if (row.placeHolder != undefined)
            {
                textW.attr("placeholder", row.placeHolder)
            }

            if (row.topMargin !== undefined)
            {
                textW.css("margin-top", row.topMargin + "px")
            }

            this.applyCommonProperties(textW, tdW, row);

            var thisObj = this.getDataOwner(row.dataName);
            thisObj.registerForRemovableChange(row.dataName, this, (e) =>
            {
                value = <string>this.getValue(row.dataName);

                textW.value(value);
            });
        }

        createNumAdjuster(prompt: string, rowW: vp.dom.IWrapperOuter, tdW: vp.dom.IWrapperOuter, row: any)
        {
            var value = this.getValue(row.dataName);

            tdW.append("span")
                .addClass("panelPrompt")
                .text(prompt)
                .title(row.tip)

            var parentId = "numAdjuster" + nextId++;

            // ----create span to hold numAdjuster (in next column) ----
            var tdW2 = null;

            if (row.newCol)
            {
                //---- add num adjuster in a new table <td> ----
                tdW2 = rowW.append("td")
                    .css("position", "relative")
            }
            else
            {
                tdW2 = tdW;

                //---- adjust for edge case of layout ----
                if (this._firstRowOfContent)
                {
                    tdW
                        .css("position", "relative")
                        .css("top", "-15px")
                }
            }

            var parentW = tdW2.append("span")
                .id(parentId)
                //.css("margin-bottom", "8px")
                //.css("margin-left", "10px")
                .css("position", "relative")

            if (row.newCol)       
            {
                parentW.css("top", "3px")
                parentW.css("left", "-4px")
            }
            else
            {
                parentW.css("top", "15px")
                parentW.css("left", "4px")
            }

            var initValue = this.getValue(row.dataName);

            var numAdjuster = createNumAdjusterClass(this.application, this.container, parentId, "", initValue, row.min, row.max, row.tip,
                AdjusterStyle.bottomInPanel, row.roundValues, row.syncChanges, row.spreadLow);

            numAdjuster.show(true);

            //---- route events FROM DATAOWNER to numAdjuster ----
            var thisObj = this.getDataOwner(row.dataName);
            thisObj.registerForRemovableChange(row.dataName, this, (name, dataChanger) =>
            {
                //---- allow changes from ourselves so that when app ajusts our requested value, we can reflect the adjustment ----
                if (dataChanger._className != "numAdjusterClass")       //  (dataChanger != numAdjuster)
                {
                    var value = this.getValue(row.dataName);
                    numAdjuster.value(value);
                }
            });

            //---- route events FROM NUMADJUSTER to dataOwner ----
            numAdjuster.registerForRemovableChange("value", this, (e) =>
            {
                var value = numAdjuster.value();
                //this.setValue(row.dataName, value);

                var thisObj = this.getDataOwner(row.dataName);
                thisObj.setDataWithChanger(row.dataName, value, numAdjuster);

                this.onUserAction(row);
            });
        }

        showColorPicker(includeTransparent: boolean, propName, ddText, chevronW, e, row)
        {
            var parentElem = ddText[0].parentElement;
            var openerIds = parentElem.id;

            var picker = this.callPanelCreator("createColorPicker", openerIds, includeTransparent, (mid) =>
            {
                var value = (mid.text) ? mid.text : mid;

                ddText.text(value)
                this.setValue(propName, value);

                this.onUserAction(row);
            }, this._root);

            this.openPicker(picker, chevronW);
        }

        showDataPicker(propName, ddText, chevronW, e)
        {
            var parentElem = ddText[0].parentElement;
            var openerIds = parentElem.id;

            var picker = this.callPanelCreator("createDataPicker", openerIds, (mid) =>
            {
                var value = (mid.text) ? mid.text : mid;

                ddText.text(value)
                this.setValue(propName, value);

                //this.onUserAction(row);
                this.close();
            });

            this.openPicker(picker, chevronW);
        }

        showEnumPicker(propName, textW: vp.dom.singleWrapperClass, chevronW, enumType, e, row)
        {
            var parentElem = textW[0].parentElement;
            var openerIds = parentElem.id;

            var picker = this.callPanelCreator("createEnumPicker", openerIds, enumType, (mid) =>
            {
                var value = <string>(mid.text) ? mid.text : mid;

                //---- user select "value" from enum dropdown ----
                textW.text(value)

                //---- some enums start with lowercase letter which are capitalized for UI ----
                if (!row.isEnumUppercase)
                {
                    value = AppUtils.lowerCaseFirstLetter(value);
                }

                this.setValue(propName, value);

                this.onUserAction(row);
            }, this._root);

            this.openPicker(picker, chevronW);
        }

        showScrubberPicker(propName, textW: vp.dom.singleWrapperClass, chevronW, enumType, e, row)
        {
            var parentElem = textW[0].parentElement;
            var openerIds = parentElem.id;

            var picker = this.callPanelCreator("createScrubberPicker", openerIds, (mid) =>
            {
                var value = <string>(mid.text) ? mid.text : mid;

                //---- user select "value" from enum dropdown ----
                textW.text(value)

                this.setValue(propName, value);

                this.onUserAction(row);
            }, this._root);

            this.openPicker(picker, chevronW);
        }

        showShapePicker(propName, ddText, chevronW, e, row)
        {
            var parentElem = ddText[0].parentElement;
            var openerIds = parentElem.id;

            var picker = this.callPanelCreator("createShapePicker", openerIds, (text) =>
            {
                ddText.text(text)
                this.setValue(propName, text);

                this.onUserAction(row);
            }, this._root);

            this.openPicker(picker, chevronW);
        }

        createPicker(prompt: string, rowW: vp.dom.IWrapperOuter, tdW: vp.dom.IWrapperOuter, row: any, onOpenCallback)
        {
            var value = this.getValue(row.dataName);

            if (prompt)
            {
                // ----create prompt for dropdown ----
                var ddPromptW = tdW.append("span")
                    .addClass("panelPrompt")
                    .title(row.tip)
                    .text(prompt)
                    .css("vertical-align", "right")
                    .css("margin-right", "4px")

                if (!row.sameCol)
                {
                    tdW = rowW.append("td")
                }
            }

            //---- create DROPDOWN BUTTON to hold text and chevron ----
            var ddButton = tdW.append("span")
                .addClass("panelButton")
                .title(row.tip)
                .css("cursor", "pointer")
                .css("white-space", "nowrap")
                //.css("padding-top", "-2px")
                .css("padding-bottom", "4px")
                .id("ddButton" + JsonPanelClass.nextPickerButtonId++);

            this.applyCommonProperties(ddButton, tdW, row);

            // ----create TEXT part of button ----
            var ddText = ddButton.append("span")
                .addClass("panelButtonText")
                .css("vertical-align", "middle")
                .css("text-align", "left")

            if (row.width != undefined)
            {
                ddText
                    .css("display", "inline-block")
                    .width(row.width)
            }

            //---- to workaround issue of mouse "dead zones" around img, try embedding it inside a in-line block span ----
            var divW = ddButton.append("span")
                .addClass("panelButtonChevron")
                .css("display", "inline-block")
                .css("cursor", "pointer")

            //---- add dropdown CHEVRON icon ----
            var chevronW = divW.append("img")
                .attr("src", "Images/smallChevron3.png")
                .css("margin-left", "4px")
                .css("margin-bottom", "2px")
                .css("vertical-align", "bottom")
                .attach("dragstart", function (e)
                {
                    //---- prevent drag of icon ----
                    e.preventDefault();
                })

            ddButton
                .attach("click", (e) =>
                {
                    AppUtils.callPanelOpen(e, (ee) =>
                    {
                        onOpenCallback(row.dataName, ddText, chevronW, e);
                    })
                })


            //---- set initial value ----
            var value = this.getValue(row.dataName);
            if (row.enumPicker !== undefined)
            {
                //---- change all enum values to start with a capital letter ----
                value = AppUtils.capitalizeFirstLetter(value);
            }
            ddText.text(value);

            //---- listen to associated property changes & update HTML ----
            var thisObj = this.getDataOwner(row.dataName);
            thisObj.registerForRemovableChange(row.dataName, this, (e) =>
            {
                var value = this.getValue(row.dataName);
                if (row.enumPicker !== undefined)
                {
                //---- change all enum values to start with a capital letter ----
                    value = AppUtils.capitalizeFirstLetter(value);
                }
                ddText.text(value)

            });

            //---- is this a column picker dropdown? ----
            if (row.mapToDefaultCol)
            {
                //---- when data structure changes (usually a new file), set value to default column ----
                /*appClass.instance*/this.application.registerForChange("ColInfos", (e) =>
                {
                    var value = /*appClass.instance*/this.application.getDefaultCol();
                    ddText.text(value);
                    this.setValue(row.dataName, value);
                });
            }


            if (row.tabIndex !== undefined)
            {
                ddButton[0].tabIndex = row.tabIndex;
            }

        }

        showColumnPicker(propName, ddTextW, chevronW, e)
        {
            var parentElem = ddTextW[0].parentElement;
            var openerIds = parentElem.id;

            var picker = this.callPanelCreator("createColumnPicker", openerIds, true, (mid) =>
            {
                ddTextW.text(mid.text)
                this.setValue(propName, mid.text);
            });

            this.openPicker(picker, chevronW);
        }

        showTourPicker(propName, ddTextW, chevronW, e)
        {
            var parentElem = ddTextW[0].parentElement;
            var openerIds = parentElem.id;

            var picker = this.callPanelCreator("createTourPicker", openerIds, true, (mid) =>
            {
                var newValue = (mid.text) ? mid.text : mid;

                ddTextW.text(newValue);
                this.setValue(propName, newValue);
            });

            this.openPicker(picker, chevronW);
        }

        showScriptPicker(propName, ddTextW, chevronW, e)
        {
            var parentElem = ddTextW[0].parentElement;
            var openerIds = parentElem.id;

            var picker = this.callPanelCreator("createScriptPicker", openerIds, true, (mid) =>
            {
                var newValue = (mid.text) ? mid.text : mid;

                ddTextW.text(newValue);
                this.setValue(propName, newValue);
            });

            this.openPicker(picker, chevronW);
        }

        createOpenDataPickerList(propName, rowW, tdW, row: any)
        {
            var listBox = this.callPanelCreator("createOpenDataPickerList", tdW[0], true, (mid) =>
            {
                var text = (mid.text) ? mid.text : mid;
                this.setValue(row.dataName, text);

                this.onUserAction(row);
            });

            if (row.width != undefined)
            {
                vp.select(listBox._root).css("width", row.width + "px")
            }

            if (row.height != undefined)
            {
                vp.select(listBox._root).css("height", row.height + "px")
            }

            return listBox;
        }

        createKnownDataPickerList(propName, rowW, tdW, row: any)
        {
            var listBox = this.callPanelCreator("createKnownDataPickerList", tdW[0], true, (mid) =>
            {
                //ddTextW.text(mid.text)
                this.setValue(row.dataName, mid.text);

                this.onUserAction(row);
            });

            if (row.width != undefined)
            {
                vp.select(listBox._root).css("width", row.width + "px")
            }

            if (row.height != undefined)
            {
                vp.select(listBox._root).css("height", row.height + "px")
            }

            return listBox;
        }

        createColumnPickerList(prompt: string, rowW, tdW, row: any)
        {
            if (prompt)
            {
                // ----create prompt for dropdown ----
                var ddPrompt = tdW.append("span")
                    .addClass("panelPrompt")
                    .title(row.tip)
                    .text(prompt)
                    .css("vertical-align", "right")
                    .css("margin-right", "4px")

                if (!row.sameCol)
                {
                    //---- for column picker list, we start a new line ----
                    tdW = rowW.append("td")
                    tdW.append("br")
                }
            }

            var listBox = this.callPanelCreator("createColumnPickerList", tdW[0], row.includeNone, (mid) =>
            {
                //ddTextW.text(mid.text)
                this.setValue(row.dataName, mid.text);

                this.onUserAction(row);
            });

            //---- listen to associated property changes & update HTML ----
            var thisObj = this.getDataOwner(row.dataName);
            thisObj.registerForRemovableChange(row.dataName, this, (e) =>
            {
                var value = this.getValue(row.dataName);
                listBox.selectedValue(value);
            });

            var listBoxW = vp.select(listBox._root);
            this.applyCommonProperties(listBoxW, tdW, row, false);

            //---- when data structure changes (usually a new file), rebuild the listBox ----
            /*appClass.instance*/this.application.registerForChange("ColInfos", (e) =>
            {
                var colItems = this.callPanelCreator("getMappingCols", row.includeNone);
                listBox.buildList(colItems);
            });

            //---- set initial value ----
            var value = this.getValue(row.dataName);
            listBox.selectedValue(value);

            return listBox;
        }

        callPanelCreator(creatorMethod: string, p1, p2?, p3?, p4?, p5?)
        {
            return this.application[creatorMethod](p1, p2, p3, p4, p5);
        }

        openPicker(picker: beachPartyApp.PopupMenuClass, chevronW)
        {
            if (picker)
            {
                this.openWithoutPosition();

//                 var rcChevron = chevronW.getBounds(false);
//                 var pickerElem = picker.getRootElem();
//                 var rcPicker = vp.select(pickerElem).getBounds(false);
// 
//                 //---- right align picker with right of text/chevon box ----
//                 var x = rcChevron.right + 4 - rcPicker.width;
// 
//                 //---- ENUM PICKERS seem to need this adjustment - does this break anything else? ----
//                 picker.openWithoutOverlap(x + 2, rcChevron.bottom + 5);
            }
        }

        createCheckbox(tdW: vp.dom.IWrapperOuter, row: any)
        {
            var cbName = "checkbox" + nextId++;

            tdW
                .attr("colSpan", "2")

            var divW = tdW.append("div");

            if (row.id)
            {
                divW.id(row.id);
                row.id = null;
            }

            //---- create CHECKBOX ----
            var cbW = divW.append("input")
                .addClass("panelCheckbox")
                .attr("type", "checkbox")
                .attr("id", cbName)
                .title(row.tip)
                .attach("dblclick", (e) =>
                {
                    e.preventDefault();
                    cbW[0].click();
                })

            var lab = divW.append("label")
                .addClass("panelPrompt")
                .attr("for", cbName)            // relays click to element with id=cbName
                .text(row.checkbox)
                .css("position", "relative")
                .css("top", "-3px")
                .title(row.tip)
                .attach("dblclick", (e) =>
                {
                    e.preventDefault();
                    lab[0].click();

                    this.onUserAction(row);
                })

            cbW.attach("click", (e) =>
            {
                var value = cbW[0].checked;
                this.setValue(row.dataName, value);

                this.onUserAction(row);
            });

            var value = this.getValue(row.dataName);
            if (value)
            {
                cbW[0].checked = true;
            }

            //---- listen to associated property changes & update HTML ----
            var thisObj = this.getDataOwner(row.dataName);
            thisObj.registerForRemovableChange(row.dataName, this, (e) =>
            {
                var value = this.getValue(row.dataName);

                if (value)
                {
                    cbW[0].checked = true;
                }
                else
                {
                    var elem = <HTMLElement>cbW[0];
                    cbW[0].checked = false;
                }

            });

            if (row.topMargin !== undefined)
            {
                cbW.css("margin-top", row.topMargin + "px");
            }

            this.applyCommonProperties(cbW, tdW, row);

        }

        createRadioButton(tdW: vp.dom.IWrapperOuter, row: any)
        {
            var rbName = "radio" + nextId++;
            if (!row.dataName)
            {
                row.dataName = this._groupDataName;
            }

            //---- create RADIOBUTTON ----
            var cb = tdW.append("input")
                .addClass("panelRadio")
                .attr("type", "radio")
                .attr("id", rbName)
                .attr("name", row.dataName)         // for grouping radio buttons together
                .title(row.tip)
                .attach("dblclick", (e) =>
                {
                    e.preventDefault();
                    cb[0].click();
                })

            if (row.checked)
            {
                cb[0].checked = true;
            }

            if (row.leftMargin != undefined)
            {
                cb.css("margin-left", row.leftMargin + "px")
            }

            var lab = tdW.append("label")
                .addClass("panelPrompt")
                .attr("for", rbName)            // relays click to element with id=cbName
                .text(row.radio)
                .css("position", "relative")
                .css("top", "-3px")
                .title(row.tip)
                .attach("dblclick", (e) =>
                {
                    e.preventDefault();
                    lab[0].click();

                    this.onUserAction(row);
                })

            //---- on CLICK, update OWNER property ----
            cb.attach("click", (e) =>
            {
                var value = cb[0].checked;
                if (value)
                {
                    this.setValue(row.dataName, row.value);

                    this.onUserAction(row);
                }
            });

            //---- set INITIAL VALUE in element ----
            this.updateRadio(row.dataName, row.value, cb[0]);

            //---- list to associated property changes & update HTML ----
            var thisObj = this.getDataOwner(row.dataName);
            thisObj.registerForRemovableChange(row.dataName, this, (e) =>
            {
                this.updateRadio(row.dataName, row.value, cb[0]);
            });
        }

        updateRadio(dataName: string, myValue: any, rbElem: HTMLInputElement)
        {
            var value = this.getValue(dataName);
            if (value === myValue)
            {
                rbElem.checked = true;
            }
        }

    }

    export function buildJsonPanel(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, openerIds: string, dataOwner: beachParty.DataChangerClass, panelName: string, openPanel: boolean, left?: number,
        top?: number, right?: number, bottom?: number, toggleOpen = true, isCol1Indent = true, hideClose = false,
        addAutoClose = false, addNormalClose?: boolean, isCenter?: boolean): JsonPanelClass
    {
        var panel: JsonPanelClass = null;

        //var w = <any>window;//TODO: window?

        var desc = sandDance.panels[panelName];

        // var desc = w.panelDescriptions[panelName];

        panel = new JsonPanelClass(application, settings, container, openerIds, dataOwner, panelName, desc, undefined, isCol1Indent);

        var rc = vp.dom.getBounds(panel.getRootElem(), true);

        if ((left === undefined || left === null) && (right === undefined || right === null))
        {
            //---- center horizontally ----
            left = $(container).innerWidth() / 2 - rc.width / 2;
        }

        if ((top === undefined || top === null) && (bottom === undefined || bottom === null))
        {
            //---- center vertically ----
            top = $(container).innerHeight() / 2 - rc.height / 2;
        }

        if (openPanel)
        {
            if (isCenter) {
                panel.open();
            } else {
                panel.open(left, top, right, bottom);
            }
        }

        return panel;
    }
} 