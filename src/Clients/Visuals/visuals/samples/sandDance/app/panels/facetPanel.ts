//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    facetPanel.js - describes the panel for setting facet mapping options
//-------------------------------------------------------------------------------------

module sandDance {
    export module panels {
        export var facet: any = {
            title: "Facet by",
            tip: "Select a column for grouping the data info multiple facet views",
            autoClose: true,
            rows:
            [
                {
                    numAdjuster: "Facets:", tip: "Specifies the number of facets to create", min: 1, max: 99,
                    roundValues: true, dataName: "facetBins", spreadLow: true,
                },

                //---- note: marginBottom is not effective here; go to app.openFacetPanelCore() to adjust ----
                {
                    colPickerList: "", tip: "Sets column used to map facet", includeNone: true,
                    dataName: "facetColumn", marginRight: 0, closeAction: true,
                },
            ]
        };
    }
}