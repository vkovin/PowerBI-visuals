//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    jsonControl.ts - base class for controls that use jsonPanelClass to build their controls.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class JsonControlClass extends beachParty.DataChangerClass implements IAppControl
    {
        _jsonPanel: JsonPanelClass;                 // created by subclass by accessible here

        getRootElem()
        {
            return this._jsonPanel.getRootElem();
        }

        showAt(x: number, y: number)
        {
            this._jsonPanel.showAt(x, y);
        }

        hide()
        {
            this._jsonPanel.hide();
        }

        remove()
        {
            this._jsonPanel.remove();
        }

        close()
        {
            this._jsonPanel.close();
        }

        registerForChange(name: string, callback)
        {
            return this._jsonPanel.registerForChange(name, callback);
        }
    }
}
