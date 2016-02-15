//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    sliderAssembly.ts - popup panel for slider with "-" and "+" buttons.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class sliderAssemblyClass extends BasePopupClass
    {
        //_root: HTMLInputElement;   (defined in basePopupClass)

        _sliderElem: HTMLInputElement;
        _plusElem: HTMLElement;
        _minusElem: HTMLElement;

        _value: number;
        _minValue: number;
        _maxValue: number;
        _roundValue: boolean;
        _spreadLow: boolean;

        _autoDelayTimer = null;
        _autoRepeatTimer = null;
        _autoDelay = 500;           // ms
        _autoRepeat = 1000 / 25;    // ms

        constructor(application: AppClass, container: HTMLElement, ownerElem: HTMLElement, initialValue: number, minValue: number, maxValue: number,
            roundValue: boolean, spreadLow: boolean)
        {
            super(application, container, null, ownerElem);

            this._minValue = minValue;
            this._maxValue = maxValue;
            this._roundValue = roundValue;
            this._spreadLow = spreadLow;
            this._value = initialValue;

            this._autoCloseOnDblClick = false;

            //---- treat mouseDown on owner as an extension of our popup ----
            this._autoCloseOnOwnerMouseDown = false;

            this.createSliderAssembly(initialValue);
        }

        value(value?: number, fromSlider?: boolean, notifyComplete?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._value;
            }

            if (value != this._value || notifyComplete)
            {
                this._value = value;

                if (!fromSlider)
                {
                    this.updateSliderValue();
                }

                this.onDataChanged((notifyComplete) ? "valueCompleted" : "value");
            }
        }

        updateSliderValue()
        {
            var normValue = this.normalizeValue(this._value);

            vp.select(this._sliderElem)
                .value(normValue + "");

            //vp.utils.debug("numAdjuster.updateValueText: str=" + str);
        }

        setFocusToSlider()
        {
            this._sliderElem.focus();
        }

        createSliderAssembly(initialValue: number)
        {
            //---- remove any previous slider assembly from other panels/bins ----
            //vp.select(document.body, ".sliderAssembly")
            //    .remove();

            var normInitValue = this.normalizeValue(initialValue);

            //---- this is a popup, so set parent to document.body ----
            var rootW = vp.select(document.body).append("div")
                .addClass("sliderAssembly")
                .css("z-index", "1999")
                .css("position", "absolute")
                .css("background", "black")
                .css("border", "1px solid #333")
                .css("height", "30px")
                .css("width", "190px");

            (<any>rootW[0]).jsObj = this;

            //---- need a table to get layout right here ----
            var tableW = rootW.append("table")

            var trW = tableW.append("tr");
            var tdW = trW.append("td");

            //---- MINUS ----
            var tdW = trW.append("td");
            var minusW = trW.append("span")
                .addClass("tinyButton")
                .css("margin-top", "2px")
                .css("tabIndex", "1")
                .text("-")
                .attach("mousedown", (e) => this.onButtonDown(-1))
                .attach("mouseup", (e) => this.onButtonUp(-1))
                .attach("blur", (e) =>
                {
                    //this.onAssemblyBlur(e);
                })

            var progressEvent = (vp.utils.isIE) ? "change" : "input";
            var finalEvent = (vp.utils.isIE) ? "mouseup" : "change";

            //---- SLIDER ----
            var tdW = trW.append("td");
            var sliderW = tdW.append("input")
                .attr("type", "range")
                .addClass("numSpreaderSlider")
                .css("tabIndex", "2")
                .attr("min", "0")           // we scale from its normalized value
                .attr("max", "1")
                .attr("step", ".001")
                .attr("value", normInitValue + "")
                .css("height", "10px")          // sets the THUMB height
                .css("width", "120px")          // sets the track width
                .css("margin-left", "2px")
                .css("margin-top", "2px")
                .attach(progressEvent, (e) =>
                {
                    var value = this.denormalizeValue(e.target.value);
                    this.value(value, true, false);
                })
                .attach(finalEvent, (e) =>
                {
                    var value = this.denormalizeValue(e.target.value);
                    this.value(value, true, true);
                })
                .attach("blur", (e) =>
                {
                    //this.onAssemblyBlur(e);
                })

            //---- PLUS ----
            var tdW = trW.append("td");
            var plusW = tdW.append("span")
                .addClass("tinyButton")
                .css("tabIndex", "3")
                .css("margin-top", "2px")
                .css("margin-left", "2px")
                .text("+")
                .attach("mousedown", (e) => this.onButtonDown(1))
                .attach("mouseup", (e) => this.onButtonUp(1))
                .attach("blur", (e) =>
                {
                    //this.onAssemblyBlur(e);
                })

            this._root = rootW[0];
            this._sliderElem = sliderW[0];
            this._minusElem = minusW[0];
            this._plusElem = plusW[0];
        }

        onButtonDown(delta: number)
        {
            this.onUpDown(delta, false);

            this.stopTimers();
            this._autoDelayTimer = setTimeout((e) =>
            {
                this.stopTimers();

                this._autoRepeatTimer = setInterval((e) =>
                {
                    this.onUpDown(delta, false);
                }, this._autoRepeat);
            }, this._autoDelay);
        }
        

        stopTimers()
        {
            if (this._autoDelayTimer)
            {
                clearTimeout(this._autoDelayTimer);
                this._autoDelayTimer = null;
            }

            if (this._autoRepeatTimer)
            {
                clearInterval(this._autoRepeatTimer);
                this._autoRepeatTimer = null;
            }
        }

        onButtonUp(delta: number)
        {
            this.stopTimers();

            this.onUpDown(0, true);
        }

        onUpDown(delta: number, notifyComplete: boolean)
        {
            var changed = false;
            var factor = (this._roundValue) ? 1 : ((this._maxValue - this._minValue) / 100);
            var diffValue = delta * factor;

            if (diffValue >= 0)
            {
                var newValue = this._value + diffValue;
                if (newValue <= this._maxValue)
                {
                    this.value(newValue, false, notifyComplete);
                    changed = true;
                }
            }
            else
            {
                var newValue = this._value + diffValue;
                if (newValue > - this._minValue)
                {
                    this.value(newValue, false, notifyComplete);
                    changed = true;
                }
            }

            return changed;
        }

        normalizeValue(value: number)
        {
            value = vp.data.clamp(value, this._minValue, this._maxValue);

            if (this._roundValue)
            {
                value = Math.round(value);
            }

            value = vp.data.mapValue(value, this._minValue, this._maxValue, 0, 1);

            if (this._spreadLow)
            {
                var range = this._maxValue - this._minValue;
                var goodRange = (range < 10) ? 10 * range : range;
                var maxExponent = Math.log(goodRange) / Math.log(2);      // take log base 2 of percent

                //---- reverse of steps in denormalize() ----
                value = vp.data.mapValue(value, 0, 1, 2, goodRange);
                value = Math.log2(value);
                value = vp.data.mapValue(value, 1, maxExponent, 0, 1);
            }

            return value;
        }

        denormalizeValue(value: number)
        {
            //var result = vp.data.mapValue(value, 0, 1, this._minValue, this._maxValue);
            var percent = value;
            var range = this._maxValue - this._minValue;

            if (this._spreadLow)
            {
                var goodRange = (range < 10) ? 10 * range : range;
                var maxExponent = Math.log(goodRange) / Math.log(2);      // take log base 2 of percent

                var exponent = vp.data.mapValue(percent, 0, 1, 1, maxExponent);
                var result = Math.pow(2, exponent);
                percent = vp.data.mapValue(result, 2, goodRange, 0, 1);

                //percent = 7 - Math.log(2*(1-percent));
                //percent = vp.data.mapValue(percent, 6.75, 13.3, 0, 1);
            }

            var value = this._minValue + percent * range;

            if (this._roundValue)
            {
                value = Math.round(value);
            }

            value = vp.data.clamp(value, this._minValue, this._maxValue);
            return value;
        }


   }
}