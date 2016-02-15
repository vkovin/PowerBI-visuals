//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    chartSettings.js - describes the panel for changing application settings
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module sandDance {
    export module panels {
        export var chartOptionsPanel: any = {
            title: "Chart Options",
            hideTitle: true,
            tabs: [
                {
                    tabName: "ChartName", tip: "Settings for the current chart type", rows:
                    [
                        { prompt: "Common:", tip: "Settings common to all chart views" },
                        { col: 1, numAdjuster: "Shape size:", tip: "Adjust the size factor applied to all shapes", min: 0, max: 10, dataName: "sizeFactor", newCol: true, syncChanges: true },
                        { col: 1, numAdjuster: "Shape opacity:", tip: "Adjust the opacity applied to all shapes", min: 0, max: 1, dataName: "shapeOpacity", newCol: true, syncChanges: true },
                        // { col: 1, colorPicker: "Shape color:", tip: "Sets the shape color (used when color is not mapped to a column) ", dataName: "shapeColor" },
                        { col: 1, shapePicker: "Shape image:", tip: "Sets the image used to draw shapes", dataName: "shapeImage" },

                        { emptyRow: true },
                        { prompt: "Chart:", tip: "Change Grid-specific settings", id: "chartType" },
                        { emptyRow: true },

                        {
                            col: 1, checkbox: "X gridlines", tip: "Show the vertical gridlines associated with the X axis",
                            dataName: "showXGridLines", id: "xGridLines"
                        },
                        {
                            col: 1, checkbox: "Y gridlines", tip: "Show the vertical gridlines associated with the Y axis",
                            dataName: "showYGridLines", id: "yGridLines"
                        },

                        { emptyRow: true },

                        {
                            col: 1, numAdjuster: "Shape separation:", tip: "Adjust the separation factor used in layout-style views",
                            min: 0, max: 5, dataName: "separationFactor", newCol: true, id: "separation"
                        },
                        {
                            col: 1, numAdjuster: "Stacking columns:", tip: "Adjust the number of columns used in the Stacks layout", min: 1, max: 10,
                            dataName: "zBins", newCol: true, roundValues: true, id: "stackingCols"
                        },
                        {
                            col: 1, numAdjuster: "Columns:", tip: "Adjust the number of columns in a Flat layout", min: 0, max: 999,
                            dataName: "numColumns", newCol: true, roundValues: true, id: "numCols"
                        },
                        {
                            col: 1, checkbox: "Build from top", tip: "Start the layout at the top of the plot", dataName: "buildFromTop",
                            id: "buildFromTop"
                        },
                        {
                            col: 1, button: "Next spiral", tip: "Pick a new seed for the spiral layout", dataName: "nextSpiral",
                            id: "nextSpiral"
                        }
                    ]
                },
                {
                    tabName: "Custom",
                    tip: "Settings for a custom chart",
                    id: "customTab",
                    rows: [
                        { col: 1, enumPicker: "Predefined:", tip: "Select a predefined custom chart", dataName: "predefinedCustomChart", enumType: bps.PredefinedCustomChart },
                        { emptyRow: true },

                        { col: 1, enumPicker: "X:", tip: "Select how the X column should be used", dataName: "customX", enumType: bps.CustomColUsage },
                        { col: 1, enumPicker: "Y:", tip: "Select how the Y column should be used", dataName: "customY", enumType: bps.CustomColUsage },
                        { col: 1, enumPicker: "Z:", tip: "Select how the Z column should be used", dataName: "customZ", enumType: bps.CustomColUsage },
                        { emptyRow: true },

                        { col: 1, enumPicker: "Layout:", tip: "Select the inner layout of the chart", dataName: "customLayout", enumType: bps.CustomLayout },
                    ]
                }
            ]
        };
    }
}
