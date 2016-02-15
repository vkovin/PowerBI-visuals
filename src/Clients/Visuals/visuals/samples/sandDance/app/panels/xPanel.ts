//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    xPanel.js - describes the panel for setting X axis mapping options
//-------------------------------------------------------------------------------------

module sandDance {
    export module panels {
        export var xPanel: any = {
            title: "X axis",
            autoClose: true,
            rows:
            [
                { numAdjuster: "Bins:", tip: "Specifies the number of bins to create", min: 2, max: 999, roundValues: true, spreadLow: true, dataName: "xBins" },
                { colPickerList: "", tip: "Sets column used to map the X axis", dataName: "xColumn", closeAction: true, mapToDefaultCol: true },
            ]
        };
    }
}