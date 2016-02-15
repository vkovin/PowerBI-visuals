//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    doubleSlider.ts - a double-ended slider for selecting a range (min and max) from a set of values.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class DoubleSliderControl extends BaseAppControlClass
    {
        _rangeElem: HTMLElement;
        _leftElem: HTMLElement;
        _rightElem: HTMLElement;

        _outer: Range;      // axis min/max (in data units)
        _inner: Range;      // current range values (in data units)
        _padding: Range;    // defines where axis starts (in pixels)
        _handles: Range;    // handle positions (in pixels)

        _handleWidth = 15;

        //---- mouse ----
        _ptDown = null;
        _locOnDown: string;
        _handlesOnDown: Range;
        _onMouseMoveFunc = null;
        _onMouseUpFunc = null;

        /**
         * 
         * @param parentElem - the HTML element we will create our root element under.
         * @param outer - the outermost left/right data values (as shown on the slider axis).
         * @param inner - the current lef/right of data values (as set by the user).
         * @param padding - defines the start and end of the axis (in pixels).
         */
        constructor(parentElem: HTMLElement, outer: Range, inner: Range, padding: Range)
        {
            super();

            this._onMouseMoveFunc = (e) => this.onBarMove(e);
            this._onMouseUpFunc = (e) => this.onBarUp(e);

            this._outer = outer;
            this._inner = inner;
            this._padding = padding;

            var formatter = vp.formatters.createNumFormatterFromRange(outer.left, outer.right);
            var strMin = formatter(outer.left);
            var strMax = formatter(outer.right);

            //---- ROOT ----
            var rootW = vp.select(parentElem).append("div")
                .id("DoubleSliderControl")
                .css("position", "relative")

            //---- BAR ROW ----
            var barRowW = rootW.append("div")
                .id("barRow")
                .css("position", "relative")
                .css("height", "30px")

            //---- BASE BAR ----
            var baseBarW = barRowW.append("div")
                .addClass("doubleSliderBaseBar")
                .css("position", "absolute")
                .css("left", padding.left + "px")
                .css("width", (padding.right-padding.left) + "px") 

            //---- RANGE BAR ----
            var rangeBarW = barRowW.append("div")
                .addClass("doubleSliderRangeBar")
                .css("position", "absolute")
                .attach("mousedown", (e) => this.onBarDown(e, "range"))

            //---- LEFT HANDLE ----
            var leftHandleW = barRowW.append("div")
                .addClass("doubleSliderHandle")
                .css("position", "absolute")
                .css("top", "-1px")
                .css("width", this._handleWidth + "px")
                .attach("mousedown", (e) => this.onBarDown(e, "left"))

            //---- RIGHT HANDLE ----
            var rightHandleW = barRowW.append("div")
                .addClass("doubleSliderHandle")
                .css("position", "absolute")
                .css("left", "50%")
                .css("top", "-1px")
                .css("width", this._handleWidth + "px")
                .attach("mousedown", (e) => this.onBarDown(e, "right"))

            //---- TEXT ROW ----
            var labelsW = rootW.append("div")
                .id("textRow")
                .css("position", "relative")
                .css("height", "30px")
                .css("left", padding.left + "px")
                .css("width", (padding.right - padding.left) + "px") 

            //---- LEFT TEXT ----
            var minText = labelsW.append("div")
                .addClass("panelDisplay")
                .css("position", "absolute")
                .css("left", "-4px")
                .text(strMin)

            //---- RIGHT TEXT ----
            var maxText = labelsW.append("div")
                .addClass("panelDisplay")
                .css("position", "absolute")
                .css("right", "-4px")
                .text(strMax)

            this._leftElem = leftHandleW[0];
            this._rightElem = rightHandleW[0];
            this._rangeElem = rangeBarW[0];
            
            this.calcHandlesFromInner();
            this.updateRangeElemsFromHandles();
        }

        inner(value?: Range)
        {
            if (arguments.length == 0)
            {
                return this._inner;
            }

            this._inner = value;

            this.calcHandlesFromInner();
            this.updateRangeElemsFromHandles();

            this.onDataChanged("inner");
        }

        onBarDown(e, downLoc: string)
        {
            var pt = vp.events.mousePosition(e);
            this._ptDown = pt;
            this._locOnDown = downLoc;

            this._handlesOnDown = new Range(this._handles.left, this._handles.right);

            vp.events.setCaptureWindow(this._onMouseMoveFunc, this._onMouseUpFunc);
        }

        onBarUp(e)
        {
            if (this._locOnDown)
            {
                this._locOnDown = null;
                vp.events.releaseCaptureWindow();

                this.onDataChanged("innerCompleted");
            }
        }

        onBarMove(e)
        {
            if (this._locOnDown)
            {
                var pt = vp.events.mousePosition(e);
                var xdiff = pt.x - this._ptDown.x;
                
                if (xdiff)
                {
                    var padding = this._padding;
                    var handles = this._handles;
                    var handlesOnDown = this._handlesOnDown;
                    var locOnDown = this._locOnDown;
                    var handleWidth = this._handleWidth;
                    var minHandleShowing = 4;       // 4 pixels must be showing on overlap

                    if (locOnDown == "left")
                    {
                        var firstx = padding.left;
                        var lastx = handles.right - minHandleShowing;
                        var newLeft = handlesOnDown.left + xdiff;

                        if (newLeft < firstx)
                        {
                            newLeft = firstx;
                        }
                        else if (newLeft > lastx)
                        {
                            newLeft = lastx;
                        }

                        handles.left = newLeft;
                    }
                    else if (locOnDown == "right")
                    {
                        var firstx = handles.left + minHandleShowing;
                        var lastx = padding.right;
                        var newRight = handlesOnDown.right + xdiff;

                        if (newRight < firstx)
                        {
                            newRight = firstx;
                        }
                        else if (newRight > lastx)
                        {
                            newRight = lastx;
                        }

                        handles.right = newRight;
                    }
                    else if (locOnDown == "range")
                    {
                        var firstx = padding.left;
                        var lastx = padding.right;

                        var newLeft = handlesOnDown.left + xdiff;
                        var newRight = handlesOnDown.right + xdiff;

                        if (newLeft < firstx)
                        {
                            newLeft = firstx;
                            xdiff = newLeft - handlesOnDown.left;
                        }
                        else if (newRight > lastx)
                        {
                            newRight = lastx;
                            xdiff = newRight - handlesOnDown.right;
                        }

                        //--- now set final values ----
                        handles.left = handlesOnDown.left + xdiff;
                        handles.right = handlesOnDown.right + xdiff;
                    }

                    this.updateRangeElemsFromHandles(locOnDown);
                    this.calcInnerFromHandles();

                    this.onDataChanged("inner");
                }
            }

        }

        /**
         * calculate handle left/right positions from the inner left/right data values.
         */
        calcHandlesFromInner()
        {
            var padding = this._padding;
            var outer = this._outer;
            var inner = this._inner;

            var minPos = padding.left;
            var maxPos = padding.right;

            var leftPos = vp.data.mapValue(inner.left, outer.left, outer.right, minPos, maxPos);
            var rightPos = vp.data.mapValue(inner.right, outer.left, outer.right, minPos, maxPos);

            this._handles = new Range(leftPos, rightPos);
        }

        /**
         * calculate the inner left/right data values from the handle left/right positions.
         */
        calcInnerFromHandles()
        {
            var padding = this._padding;
            var outer = this._outer;
            var handles = this._handles;

            var minPos = padding.left;
            var maxPos = padding.right;

            var innerLeft = vp.data.mapValue(handles.left, minPos, maxPos, outer.left, outer.right);
            var innerRight = vp.data.mapValue(handles.right, minPos, maxPos, outer.left, outer.right);

            this._inner = new Range(innerLeft, innerRight);
        }

        updateRangeElemsFromHandles(locOnDown?: string)
        {
            var padding = this._padding;
            var handles = this._handles;
            var halfHandle = this._handleWidth / 2;

            var leftPos = handles.left - halfHandle;
            var rightPos = handles.right - halfHandle;

            vp.select(this._leftElem).css("left", leftPos + "px");
            vp.select(this._rightElem).css("left", rightPos + "px");

            vp.select(this._rangeElem)
                .css("left", (handles.left) + "px")
                .css("width", (handles.right - handles.left) + "px")

            //---- put last touched handle on top (for overlap cases) ----
            if (locOnDown == "left")
            {
                vp.select(this._leftElem).css("z-index", "2")
                vp.select(this._rightElem).css("z-index", "1")
            }
            else if (locOnDown == "right")
            {
                vp.select(this._leftElem).css("z-index", "1")
                vp.select(this._rightElem).css("z-index", "2")
            }

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

    export class Range
    {
        left: number;
        right: number;

        constructor(left: number, right: number)
        {
            this.left = left;
            this.right = right;
        }
    }
}