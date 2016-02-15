//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    baseAppControl.ts - base class for custom controls in BeachParty
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class BaseAppControlClass extends beachParty.DataChangerClass implements IAppControl
    {
        _root: HTMLElement;                 // created by subclass by accessible here

        getRootElem()
        {
            return this._root;
        }

        showAt(x: number, y: number)
        {
            vp.select(this._root)
                .css("left", x + "px")
                .css("top", y + "px")

            this._root.focus();
        }

        hide()
        {
            vp.select(this._root).hide();
        }

        remove()
        {
            this.hide();

            vp.select(this._root)
                .remove();
        }

        /** Remove the panel from the DOM and unhook non-DOM event handlers on this._dataOwner. */
        close()
        {
            this.remove();

            logAction(Gesture.click, null, ElementType.button, Action.close, Target.unknownPanel, false);

            this.onDataChanged("close");
        }
    }

    export interface IAppControl
    {
        getRootElem(): HTMLElement;
        close();
        remove();
        hide();
        showAt(x: number, y: number);

        //---- from dataChangerClass ----
        registerForChange(name: string, callback: any): void;
    }

}
