//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    zPanel.js - describes the panel for setting Z axis mapping options
//-------------------------------------------------------------------------------------

module sandDance {
    export module panels {
        export var zPanel: any = {
            title: "Z axis",
            autoClose: true,
            rows:
            [
                //{ numAdjuster: "Bins:", tip: "Specifies the number of bins to create", min: 2, max: 999, roundValues: true, spreadLow: true, dataName: "zBins" },
                {
                    colPickerList: "", tip: "Sets column used to map the Z axis", dataName: "zColumn", marginTop: 10,
                    closeAction: true, mapToDefaultCol: true
                },
            ]
        };
    }
}
