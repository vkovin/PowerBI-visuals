//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    basePanel.ts - base class for a floating (and optionally modal) panel.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class BasePanelClass extends BasePopupClass
    {
        protected settings: AppSettingsMgr;

        _imgPin: HTMLImageElement;
        _titleElem: HTMLElement;
        _autoCloseElem: HTMLElement;
        _contentRow: HTMLElement;
        _titleRow: HTMLTableRowElement;
        _autoCloseRow: HTMLTableRowElement;
        _longListElem: HTMLElement;

        _isDialog: boolean;
        _primaryControl: any;
        _dataOwner: beachParty.DataChangerClass;
        _hasTitle = false;
        _title: string;
        _hideTitleCloseButton: boolean;
        _tooltip: string;
        _otherVerticalSpace = 0;
        _isOpacityDisabled = false;

        //---- DRAG of title bar ----
        _onMouseMoveFunc = null;        // setCapture
        _onMouseUpFunc = null;          // setCapture
        _ptDown: any;
        _isDragging = false;
        _isPinnedDown = false;
        _closeOnAction = true;

        //---- DRAG of resize gripper ----
        _isResizing = false;
        _resizeTarget = null;
        _sizeAtMouseDown = null;
        _onResizeMouseMoveFunc = null;  // setCapture
        _onResizeMouseUpFunc = null;    // setCapture
        _resizeElem: HTMLElement;

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, name: string, isDialog: boolean, bgColor?: string, title?: string, width?: number, height?: number, resizeable?: boolean,
            tooltip?: string, hideTitleCloseButton?: boolean, addAutoClose?: boolean, omitCloseButtons?: boolean,
            isOpacityDisabled?: boolean)
        {
            super(application, container, name);

            this.settings = settings;

            this._title = title;
            this._tooltip = tooltip || "";
            this._hideTitleCloseButton = hideTitleCloseButton;
            this._isOpacityDisabled = isOpacityDisabled;

            //---- create ROOT TABLE ----
            var tableW = vp.select(/*document.body*/container).append("table")
                .addClass("panel")
                // .id(name + "Panel")
                .addClass(name + "Panel")
                .css("overflow-y", "hidden")          // make each panel do more intelligent sizing of contained lists
                .css("overflow-x", "hidden")          // let panel control the width and consequences
                .css("background-color", application.getSettingsManager().getPanelBackgroundColor());
                // .attach("focus", (e) => 
                // {
                //     this.onFocus(e);
                // })

            tableW.element()
                .addEventListener("focus", (e) => {
                    this.onFocus(e);
                });

            this._root = tableW[0];
            (<any>this._root).jsObj = this;

            var maxHeight = this.application.maxPanelHeight;
            var maxWidth = this.application.maxPanelWidth;

            if (title)
            {
                if (!omitCloseButtons)
                {
                    //---- first row contains the title/pushPin/closeButton ----
                    this.buildAutoCloseRow(tableW);
                }

                this.buildTitleRow(tableW);
            }

            this.showTitle(!addAutoClose);

            var contentW = tableW.append("tr");
            this._contentRow = contentW[0];

            tableW
                .css("max-height", maxHeight + "px")
                .css("max-width", maxWidth + "px")

            if (bgColor)
            {
                tableW
                    .css("background", bgColor);
            }

            this._onMouseMoveFunc = (e) => this.onMouseMove(e);
            this._onMouseUpFunc = (e) => this.onMouseUp(e);

            this._onResizeMouseMoveFunc = (e) => this.onResizeMouseMove(e);
            this._onResizeMouseUpFunc = (e) => this.onResizeMouseUp(e);

            this._isDialog = isDialog;

            if (this._isDialog)
            {
                //---- don't show pin for dialogs ----
                this._isPinnedDown = true;
            }

            if (resizeable)
            {
                this.createResizer(tableW);
            }

            if (width !== undefined)
            {
                tableW.css("width", width + "px")
            }

            if (height !== undefined)
            {
                tableW.css("height", height + "px")
            }

        }

        getContentRoot()
        {
            return this._contentRow;
        }

        setLongListForSizing(elemSelector: string, otherVerticalSpace: number)
        {
            var contentW = vp.select(this._root, "#tab0Content");
            var longListW = vp.select(contentW[0], elemSelector);

            this._longListElem = longListW[0];
            this._otherVerticalSpace = otherVerticalSpace;

            this.adjustLongListSize(this.application.maxPanelHeight, 0);
        }

        onPanelSizeChanged()
        {
            if (this._root.style.height)
            {
                var rc = vp.select(this._root).getBounds(false);
                var maxHeight = rc.height;
            }
            else
            {
                maxHeight = this.application.maxPanelHeight;
            }

            this.adjustLongListSize(maxHeight, 15);
        }

        adjustLongListSize(panelHeight: number, extraSpace: number)
        {
            if (this._longListElem)
            {
                //---- adjust height of long list so it doesn't exceed height of panel ----
                var maxListHeight = panelHeight - (extraSpace + this._otherVerticalSpace);

                vp.select(this._longListElem)
                    .css("max-height", maxListHeight + "px")
            }
        }
      
        buildAutoCloseRow(tableW: vp.dom.singleWrapperClass)
        {
            var rowW = tableW.append("tr");
            this._autoCloseRow = rowW[0];

            //---- build BUTTONS ----
            var buttonsW = rowW.append("td").append("div")
                .css("float", "right")
                .css("margin-bottom", "-8px")              // allow some overlap with content

            //---- PUSH PIN ----
            var imgPinW = buttonsW.append("div")//img
                .addClass("clickIcon")
                .id("imgPin")
                // .attr("src", fnPinLeft)
                .addClass("fnPinLeft")
                .css("width", "15px")
                .css("height", "15px")
                .css("position", "relative")
                .css("z-index", "999")
                .css("top", "-2px")
                .attach("click", (e) => this.togglePin(e));

            //---- CLOSE button----
            var imgCloseW = buttonsW.append("div")//img
                .addClass("clickIcon")
                // .attr("src", fnClose)
                .addClass("fnClose")
                .css("width", "20px")
                .css("position", "relative")
                //.css("top", "-1px")
                .css("margin-left", "4px")
                .css("z-index", "1000")
                .attach("click", (e) => this.close());

            this._imgPin = imgPinW[0];
            this._autoCloseElem = buttonsW[0];
        }        

        updateTextBoxClasses(newClassName: string)
        {
            //---- for each textbox contained in panel, ensure it uses the specified class ----

            vp.select(this._root, ".panelText").each((index, elemW) =>
            {
                //---- ensure this is a wrapped elem ----
                if (elemW.length === undefined)
                {
                    elemW = vp.select(elemW);
                }

                elemW.setClass(".panelText " + newClassName);
            });
        }

        buildTitleRow(tableW: vp.dom.singleWrapperClass)
        {
            var title = (this._title) ? this._title : "";

            var rowW = tableW.append("tr");
            var tdW = rowW.append("td");

            //---- create TITLE container ----
            var titleW = tdW.append("div")
                .addClass("panelTitle")
                .css("position", "relative")
                .title(this._tooltip)
                .attach("mousedown", (e) =>
                {
                    this.onMouseDown(e);
                    this.onFocus(e);
                })

            //---- create TITLE text ----
            titleW.append("span")
                .addClass("panelPrompt")
                .text(this._title)
                .css("margin-right", "30px")        // space for "x" button

            if (!this._hideTitleCloseButton)
            {
                //---- create CLOSE button ----
                titleW.append("span")
                    .addClass("panelButton")
                    .text("X")
                    .css("position", "absolute")
                    .css("right", "4px")
                    .css("top", "2px")
                    .css("font-size", "22px")
                    .css("z-index", "1000")
                    .css("border", "0px")
                    .css("padding", "0px")
                    .attach("click", (e) =>
                    {
                        this.close();
                    })
            }

            this._titleElem = titleW[0];
            this._titleRow = rowW[0];

            this._hasTitle = true;

            this.showTitle(true);
        }

        isAutoClose()
        {
            return (! this.isShowingTitle());
        }

        onUserAction(row: any, isCloseAction?: boolean)
        {
            //---- look for "closeAction: true" from panel rows ---
            var closeMe = (isCloseAction !== undefined) ? isCloseAction : row.closeAction;

            if (closeMe && this._closeOnAction && !this._isPinnedDown)
            {
                this.close();
            }
        }

        isPinnedDown(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isPinnedDown;
            }

            this._isPinnedDown = value;

            this.onPinnedDownChanged();
            this.onDataChanged("isPinnedDown");
        }

        onPinnedDownChanged()
        {
            vp.select(this._imgPin).addClass((this._isPinnedDown) ? "fnPinDown" : "fnPinLeft");

            if (this._isPinnedDown && this._hasTitle)
            {
                //---- convert to a draggable panel with a title bar ----
                vp.select(this._imgPin).css("display", "none");      // hide auto close buttons
                this.showTitle(true);

                if (!this._isOpacityDisabled)
                {
                    this.applyAppPanelOpacity();
                }
            }

            if (this._isPinnedDown)
            {
                this.updateTextBoxClasses("panelTextOnBlack");
            }
            else
            {
                this.updateTextBoxClasses("panelTextOnGray");
            }
        }

        togglePin(e)
        {
            this.isPinnedDown(!this._isPinnedDown);
        }

        applyAppPanelOpacity()
        {
            var opacity = this.settings.panelOpacity();
            vp.select(this._root).css("opacity", opacity + "")
        }

        private getCenter(): { left: number, top: number } {
            var rc = vp.select(this._root).getBounds(false),
                chart = vp.select(this.container).getBounds(true),
                scale = sandDance.commonUtils.getScale(this.container);

            return {
                left: (chart.width / 2 - rc.width / 2) / scale.x,
                top: (chart.height / 2 - rc.height / 2) / scale.y
            };
        }

        centerPanel()
        {
            let center = this.getCenter();

            this.startPosition = {
                top: center.top,
                left: center.left
            };

            vp.select(this._root)
                .css("left", center.left + "px")
                .css("top", center.top + "px");
        }

        onFocus(e)
        {
            if (this._primaryControl)
            {
                var elem = this._primaryControl.getRootElem();

                setTimeout((e) => elem.focus(), 100);
            }
        }

        createResizer(rootW)
        {
            //---- add RESIZE icon as affordance ----
            var imgW = rootW.append("div")// img
                .addClass("panelResizer")
                .addClass("resize2")
                // .addClass("display-none")
                // .attr("src", "images/resize2.png")
                .css("position", "absolute")
                .css("right", "0px")
                .css("bottom", "0px")
                .css("z-index", "999");              // keep on top of all other elements;

            this._resizeElem = imgW[0];

            imgW.element()
                .addEventListener("mousedown", (e) =>
                {
                    this._ptDown = vp.events.mousePosition(e/*, this._root*/);
                    this._resizeTarget = (this._primaryControl) ? this._primaryControl.getRootElem() : this._root;
                    this._sizeAtMouseDown = vp.dom.getBounds(this._resizeTarget);
                    this._isResizing = true;

                    this.setEventHandlers(imgW[0], this._onResizeMouseMoveFunc, this._onResizeMouseUpFunc);
                    // vp.events.releaseCapture(imgW[0], e, this._onResizeMouseMoveFunc, this._onResizeMouseUpFunc);
                    // vp.events.setCapture(imgW[0], e, this._onResizeMouseMoveFunc, this._onResizeMouseUpFunc);
                });
        }

        showTitle(value: boolean)
        {
            if (value)
            {
                vp.select(this._root).addClass("floatingPanel");
            }
            else
            {
                vp.select(this._root).removeClass("floatingPanel");
            }

            vp.select(this._titleRow).css("display", (value) ? "" : "none");
            vp.select(this._autoCloseRow).css("display", (!value) ? "" : "none");

            this.onPanelSizeChanged();
        }

        isShowingTitle()
        {
            return (vp.select(this._titleRow).css("display") != "none");
        }

        open(left?: number, top?: number, right?: number, bottom?: number)
        {
            if (arguments.length === 0)
            {
                this.centerPanel();
            }
            else
            {
                var rootW = vp.select(this._root)
                var rc = this.container.getBoundingClientRect();

                if (right !== undefined)
                {
                    //---- convert to left ----
                    left = right - rootW.width();
                }

                if (bottom !== undefined)
                {
                    //---- convert to top ----
                    top = bottom - rootW.height();
                }

                super.openWithoutOverlap(left - rc.left, top - rc.top);

                rootW
                    .css("display", "block")
            }
        }

        removeMaxSizesFromPanel()
        {
            vp.select(this._root)
                .css("max-width", "")
                .css("max-height", "")
        }

        removeMaxSizesFromResizeTarget()
        {
            if (this._resizeTarget)
            {
                vp.select(this._resizeTarget)
                    .css("max-width", "")
                    .css("max-height", "")
            }
        }

        onResizeMouseMove(e)
        {
            if (this._isResizing)
            {
                var pt = vp.events.mousePosition(e, this._root);
                var rcDown = this._sizeAtMouseDown;

                var xDiff = pt.x - this._ptDown.x;
                var yDiff = pt.y - this._ptDown.y;

                //vp.utils.debug("onResizeMouseMove: xDiff=" + xDiff + ", yDiff=" + yDiff + ", width=" + width + ", height=" + height);

                var minWidth = 75;
                var minHeight = 35;     //75;

                var width = Math.max(minWidth, rcDown.width + xDiff);
                var height = Math.max(minHeight, rcDown.height + yDiff);

                var scale = sandDance.commonUtils.getScale(this.container);

                width /= scale.x;
                height /= scale.y;

                this.changePanelSize(width, height);
            }
        }

        changePanelSize(width: number, height: number)
        {
            this.removeMaxSizesFromPanel();

            //---- resize the RESIZE TARGET ----
            var targetW = vp.select(this._resizeTarget);

            if (width !== undefined)
            {
                targetW.css("width", width + "px")
            }

            if (height !== undefined)
            {
                targetW.css("height", height + "px")
            }

            if (this._primaryControl)
            {
                var anyControl = <any>this._primaryControl;

                if (anyControl.onResize)
                {
                    //---- resize the PRIMARY CONTROL ----
                    anyControl.onResize(width, height);
                }
            }

            this.onDataChanged("size");
        }

        onResizeMouseUp(e)
        {
            this._isResizing = false;

            this.setEventHandlers(this._resizeElem, this._onResizeMouseMoveFunc, this._onResizeMouseUpFunc, true);
            // vp.events.releaseCapture(this._resizeElem, e, this._onResizeMouseMoveFunc, this._onResizeMouseUpFunc);
        }

        onMouseDown(e)
        {
            this._ptDown = vp.events.mousePosition(e, this._root);
            this._isDragging = true;

            // vp.events.setCapture(document.body, e, this._onMouseMoveFunc, this._onMouseUpFunc);
            this.setEventHandlers(this.container, this._onMouseMoveFunc, this._onMouseUpFunc);
        }

        onMouseMove(e)
        {
            if (this._isDragging)
            {
                var pt = vp.events.mousePosition(e/*, this._root*/);
                
                var x = pt.x - this._ptDown.x;
                var y = pt.y - this._ptDown.y;

                let startPosition = this.startPosition || this.getCenter(),
                    scale = sandDance.commonUtils.getScale(this.container);

                x /= scale.x;
                y /= scale.y;

                let left: number = startPosition.left + x,
                    top: number = startPosition.top + y;

                vp.select(this._root)
                    .css("left", left + "px")
                    .css("top", top + "px")
                    .css("right", "")
                    .css("bottom", "");

                this.currentPosition = {
                    left: left,
                    top: top
                };

                this.onDataChanged("location");
            }
        }

        onMouseUp(e)
        {
            this._isDragging = false;

            if (this.currentPosition) {
                this.startPosition = {
                    left: this.currentPosition.left,
                    top: this.currentPosition.top
                };
            } else if (this.startPosition) {
                this.currentPosition = {
                    left: this.startPosition.left,
                    top: this.startPosition.top
                };
            }

            // vp.events.releaseCapture(/*document.body*/this._root, e, this._onMouseMoveFunc, this._onMouseUpFunc);
            // vp.events.setCapture(/*document.body*/this._root, e, this._onMouseMoveFunc, this._onMouseUpFunc);

            this.setEventHandlers(this.container, this._onMouseMoveFunc, this._onMouseUpFunc);
        }

        private setEventHandlers(element: HTMLElement | Element, mousemove, mouseup, clear: boolean = false): void {
            let sandDanceElement = $(element).get(0);

            sandDanceElement.removeEventListener("mousemove", mousemove);
            sandDanceElement.removeEventListener("mouseup", mouseup);

            if (!clear) {
                sandDanceElement.addEventListener("mousemove", mousemove);
                sandDanceElement.addEventListener("mouseup", mouseup);
            }
        }

        //---- override basePopup onKey handling ----
       onAnyKeyDown(e)
        {
            if (e.keyCode == vp.events.keyCodes.enter)
            {
                this.onEnterKey();
            }
            else if (e.keyCode == vp.events.keyCodes.escape)
            {
                this.onEscapeKey();

                vp.events.cancelEventBubble(e);
                vp.events.cancelEventDefault(e);
            }
        }

        onEnterKey()
        {
            var focusElem = <HTMLElement> document.activeElement;

            //---- trigger BLUR event on active text field to commit its data to asscoiated property ----
            /*document.body*/this.container.focus();

            //---- move focus back to element, so user can try another value, tab, etc. ----
            focusElem.focus();

            this.onDataChanged("onAccept");

            if (!this._isPinnedDown)
            {
                //---- give focus a chance to get processed ----
                setTimeout((e) =>
                {
                    this.close();
                }, 100);
            }

        }

        onEscapeKey()
        {
            this.close();
            this.onDataChanged("onCancel");
        }

    }
}