//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    checkboxAssembly.ts - popup panel for slider with "-" and "+" buttons.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    var nextCheckboxId = 1;

    export function createCheckboxAssembly(parent: HTMLElement, text: string, value: boolean, callback)
    {
        var parentW = vp.select(parent);

        //---- CHECKBOX ROW ----
        var divW = parentW.append("div")
            .addClass("searchCheckboxRow")
            .css("white-space", "nowrap")
            .css("min-height", "30px")
            .css("position", "relative")
            .attach("click", (e) =>
            {
                var target = e.target;

                while (target && target.key === undefined)
                {
                    target = target.parentNode;
                }

                var key = target.key;
                var cbElem = (target.tagName == "INPUT") ? target : target.checkbox;

                var isChecked = cbElem.checked;

                if (cbElem != e.target)
                {
                    //---- toggle the checkbox ----
                    isChecked = (!isChecked);
                    cbElem.checked = isChecked;
                }

                callback(isChecked);

                if (cbElem != e.target)
                {
                    vp.events.cancelEventBubble(e);
                    vp.events.cancelEventDefault(e);
                }
            })

        //---- CHECKBOX ----
        var cbW = divW.append("input")
            .attr("type", "checkbox")
            .addClass("panelCheckbox")

        //---- TEXT ----
        var textW = divW.append("span")
            .addClass("panelDisplay searchColKey")
            .text(text)
            .css("position", "relative")
            .css("top", "-2px")

        if (value !== undefined)
        {
            cbW[0].checked = value;
        }

        divW[0].checkbox = cbW[0];
        divW[0].keyElem = textW[0];
        divW[0].key = text;


        return cbW[0];
    }
}