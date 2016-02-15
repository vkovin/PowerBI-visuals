//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    numAdjustSlider.ts - slider based control for adjusting numbers.  This replaces the dial-based "numAdjuster" class.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    var gaugeCircleRadius = 50;

    export class NumAdjustSliderClass extends beachParty.DataChangerClass
    {
        _root: HTMLElement;
        _textElem: HTMLElement;
        _chevronElem: HTMLElement;

        _name: string;
        _minValue: number;
        _maxValue: number;
        _numValue: number;
        _syncChanges: boolean;
        _spreadLow: boolean;
        _roundValues: boolean;
        _isMouseDownOnChevon: boolean;
        _sliderAssembly: SliderAssemblyClass;

        constructor(rootName: string, name: string, initialValue: number, minValue: number, maxValue: number,
            tooltip: string, style: AdjusterStyle, roundValues?: boolean, syncChanges?: boolean,
            spreadLow?: boolean)
        {
            super();

            this._name = name;
            this._minValue = minValue;
            this._maxValue = maxValue;
            this._numValue = initialValue;
            this._syncChanges = syncChanges;
            this._spreadLow = spreadLow;
            this._roundValues = roundValues;

            //---- ROOT ----
            //---- do NOT adjust position here - adjust it in jsonPanelClass, appClass, etc. ----
            var rootW = vp.select("#" + rootName)
                //.css("border", " 1px solid red")
                .addClass("numAdjuster")
                .title(tooltip);

            this._root = rootW[0];
            (<any>this._root).control = this;

            var tableW = rootW.append("table")
                .addClass("noSpaceTable");

            //---- ROW # 1 ----
            var trW = tableW.append("tr");

            //---- TEXT BOX ----
            var tdW = trW.append("td");
            var text = this.format(+initialValue, 2);
            this.addTextBox(tdW, text);

            //---- CHEVRON ----
            var tdW = trW.append("td")
            this.addChevron(tdW);

            if (name && name != "")
            {
                //---- ROW #2 ----
                var trW = tableW.append("tr");

                //---- NAME ----
                var tdW = trW.append("td");
                var textW = tdW.append("div")
                    .addClass("panelDisplay")
                    .css("text-align", "center")
                    .css("padding", "0px 2px 2px 2px")
                    .text(name)
            }

            //--- protect our popup from ugly events ----
            vp.events.attach(window, "resize", (e) => this.closeSlider());
        }

        addChevron(tdW)
        {
            var chevronW = tdW.append("img")
                .addClass("chevron")
                .attr("src", "Images2/dropRight.png")  
                .css("margin-left", "2px")
                .css("width", "16px")
                .css("margin-top", "4px")
                .title("Click to adjust this value with a slider")
                .attach("dragstart", function (e)
                {
                    //---- prevent drag of icon ----
                    e.preventDefault();
                })
                .attach("click", (e) =>
                {
                    this.toggleSliderAssembly();
                })
                .attach("mousedown", (e) =>
                {
                    this._isMouseDownOnChevon = true;
                })
                .attach("mouseup", (e) =>
                {
                    this._isMouseDownOnChevon = false;
                })

            this._chevronElem = chevronW[0];
        }

        closeSlider()
        {
            if (this._sliderAssembly)
            {
                this._sliderAssembly.close();
            }
        }

        toggleSliderAssembly()
        {
            if (this._sliderAssembly)
            {
                this.closeSlider();
            }
            else
            {
                this._sliderAssembly = new SliderAssemblyClass(this._root, this._numValue,
                    this._minValue, this._maxValue, this._roundValues, this._spreadLow);

                vp.utils.debug("SLIDER ASSEMBLY CREATED");

                //---- position to right of our chevorn ----
                var rc = vp.select(this._root, ".chevron").getBounds(false);

                this._sliderAssembly.showAt(25 + rc.left, rc.top);

                vp.select(this._root, ".chevron")
                    .attr("src", "Images2/dropLeft.png")  

                this._sliderAssembly.registerForChange("value", (e) =>
                {
                    if (this._sliderAssembly)
                    {
                        var newValue = this._sliderAssembly.value();
                        this.value(newValue, this._syncChanges);
                    }
                })

                this._sliderAssembly.registerForChange("valueCompleted", (e) =>
                {
                    if (this._sliderAssembly)
                    {
                        var newValue = this._sliderAssembly.value();
                        this.value(newValue, true);
                    }
                })

                this._sliderAssembly.registerForChange("close", (e) =>
                {
                    vp.utils.debug("SLIDER ASSEMBLY CLOSED");

                    this._sliderAssembly = null;

                    vp.select(this._root, ".chevron")
                        .attr("src", "Images2/dropRight.png")

                    this._sliderAssembly = null;
                })

                //---- give it focus (so when focus is lost, we can auto hide it) ----
                this._sliderAssembly.setFocusToSlider();
            }
        }

        onUpOrDown(isUp: boolean)
        {
            var changed = false;
            var delta = (this._roundValues) ? 1 : ((this._maxValue - this._minValue) / 100);
            if (isUp)
            {
                var newValue = this._numValue + delta;
                if (newValue <= this._maxValue)
                {
                    this.value(newValue, true);
                    changed = true;
                }
            }
            else
            {
                var newValue = this._numValue - delta;
                if (newValue >- this._minValue)
                {
                    this.value(newValue, true);
                    changed = true;
                }
            }

            return changed;
        }

        addTextBox(textRowW: vp.dom.singleWrapperClass, text: string)
        {
            var textW = textRowW.append("input")
                .attr("type", "text")
                .addClass("panelText panelTextOnBlack")
                .css("text-align", "center")
                .css("padding", "3px 2px 2px 2px")
                .css("width", "30px")       // as small as possible
                .value(text)
                .attach("focus", (e) =>
                {
                    e.target.select();
                })
                .attach("keydown", (e) =>
                {
                    this.onTextKeyDown(e);
                })
                .attach("change", (e) =>
                {
                    this.value(e.target.value, true, "text");
                })

            this._textElem = textW[0];
        }

        onTextKeyDown(e)
        {
            if (e.keyCode == vp.events.keyCodes.enter)
            {
                e.target.select();
                this.value(e.target.value, true, "text");
            }
            else if (e.keyCode == vp.events.keyCodes.escape)
            {
                setTimeout((ee) =>
                {
                    e.target.select();
                    this.value(e.target.value, true, "text");
                }, 10);
            }
            else if (e.keyCode == vp.events.keyCodes.up)
            {
                if (this.onUpOrDown(true))
                {
                    setTimeout((ee) => e.target.select(), 10);
                }
            }
            else if (e.keyCode == vp.events.keyCodes.down)
            {
                if (this.onUpOrDown(false))
                {
                    setTimeout((ee) => e.target.select(), 10);
                }
            }
        }

        format(value: number, decimals: number)
        {
            var str = vp.formatters.comma(value, 2);
            return str;
        }

        show(value: boolean)
        {
            //---- use "inline-block" as workaround for IE and Chrome layout issues ----
            vp.select(this._root).css("display", (value) ? "inline-block" : "none");
        }

        isShowing()
        {
            return (vp.select(this._root).css("display") != "none");
        }

        minValue(value?: number)
        {
            if (arguments.length == 0)
            {
                return this._minValue;
            }

            this._minValue = value;
            this.onDataChanged("minValue");
        }

        maxValue(value?: number)
        {
            if (arguments.length == 0)
            {
                return this._maxValue;
            }

            this._maxValue = value;
            this.onDataChanged("maxValue");
        }

        getRoot()
        {
            return this._root;
        }

        value(value?: number, notifyChanged?: boolean, source?: string)
        {
            if (arguments.length === 0)
            {
                return this._numValue;
            }

            //vp.utils.debug("numAdjustSlide.value(): value=" + value + ", _value=" + this._numValue);

            if (value != this._numValue || notifyChanged)
            {
                value = Math.max(this._minValue, Math.min(this._maxValue, value));

                this._numValue = value;

                if (source != "text")
                {
                    this.updateTextBox();
                }

                if (source != "slider")
                {
                    this.updateSliderValue();
                }

                if (notifyChanged)
                {
                    this.onDataChanged("value");
                }
            }
        }

        updateSliderValue()
        {
            if (this._sliderAssembly)
            {
                this._sliderAssembly.value(this._numValue);
            }
        }

        updateTextBox()
        {
            var strValue = this.format(this._numValue, 2);

            vp.select(this._textElem)
                .value(strValue);

            //vp.utils.debug("numAdjuster.updateValueText: str=" + str);
        }
    }

    //---- this is switch point for using older dial-based numAjuster class or new numAdjustSlider class ----
    export function createNumAdjusterClass(application: AppClass, container: HTMLElement, rootName: string, name: string, initialValue: number, minValue: number, maxValue: number,
        tooltip: string, style: AdjusterStyle, roundValues?: boolean, syncChanges?: boolean, spreadLow?: boolean): any
    {
        if (true)       // hook up to appSettings
        {
            return new NumAdjustSliderClass(rootName, name, initialValue, minValue, maxValue, tooltip, style, roundValues,
                syncChanges, spreadLow);
        }
        else
        {
            return new NumAdjustDial(application, container, rootName, name, initialValue, minValue, maxValue, tooltip, style, roundValues,
                syncChanges, spreadLow);
        }
    }
}
