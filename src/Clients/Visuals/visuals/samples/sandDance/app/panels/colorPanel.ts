//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    colorPanel.js - describes the panel for setting color mapping options
//-------------------------------------------------------------------------------------

module sandDance {
    export module panels {
        export var color: any = {
            title: "Color by",
            autoClose: true,
            // minwidth: 300,
            tabs: [
                {
                    tabName: "Column", tip: "Specifies which column is used for color mapping", rows:
                    [
                        { numAdjuster: "Colors:", tip: "Specifies the number of steps in the color palette", min: 1, max: 12, roundValues: true, dataName: "colorSteps" },
                        {
                            colPickerList: "", tip: "Sets column used to map color", dataName: "colorColumn",
                            includeNone: true, width: 289, closeAction: true,
                        },
                    ]
                },

                {
                    tabName: "Palette", tip: "Color palette", rows:
                    [

                        { numAdjuster: "Colors:", tip: "Specifies the number of steps in the color palette", min: 1, max: 12, roundValues: true, dataName: "colorSteps" },

                        { radio: "Seq", leftMargin: 10, tip: "Sequential palettes are used for general numeric data", value: "sequential", dataName: "colorPaletteType" },
                        { sameCell: true, radio: "Div", leftMargin: 15, tip: "Diverging palettes are used for data centered on a value (like 0)", value: "diverging", dataName: "colorPaletteType", userAction: false },
                        { sameCell: true, radio: "Qual", leftMargin: 15, tip: "Contrasting palettes are used for categorical (string) data", value: "qualitative", dataName: "colorPaletteType", userAction: false },
                        { sameCell: true, radio: "Cust", leftMargin: 15, tip: "Custom palettes are those created by the user", value: "custom", dataName: "colorPaletteType", userAction: false },

                        {
                            //rowSpan: "right",
                            colSpan: 99,
                            customList: "", tip: "Sets current color palette", itemGetter: "getColorPaletteEntry", dataName: "colorPaletteIndex",
                            refreshEvent: "rebuildColorPaletteList"
                        },

                        { checkbox: "Reversed", tip: "Reverses the order of the colors in the palette", dataName: "reverseColorPalette" },
                        { checkbox: "Continuous", tip: "Specifies that the color palette should be a continuous blend of its colors", dataName: "colorIsContinuous" },

                        { emptyRow: true },
                        //{ col: 1, text: "Data type:", tip: "Type of data being mapped to color", dataName: "colorDataType", readOnly: true, capitalize: true },
                        { button: "Map with filter", tip: "Remap the current FILTERED-IN data to the speicifed color palette", dataName: "remapColorData" },
                        { enumPicker: "Spread:", tip: "Sets how the data is mapped to the color palette", dataName: "colorSpread", enumType: bps.MappingSpread, sameCol: true },
                        //{ checkbox: "Force category", tip: "When set to true, forces column data to be treated as categorical data", dataName: "colorForceCategory" },
                    ]
                },

                {
                    tabName: "Channels", tip: "Specifies direct channel mapping, as alternative to palette mapping", rows:
                    [
                        { col: 1, colPicker: "Red: ", tip: "Sets column for mapping data to the Red color channel", dataName: "redColumn" },
                        { col: 1, colPicker: "Green: ", tip: "Sets column for mapping data to the Green color channel", dataName: "greenColumn" },
                        { col: 1, colPicker: "Blue: ", tip: "Sets column for mapping data to the Blue color channel", dataName: "blueColumn" },
                    ]
                },
            ]
        };
    }
}