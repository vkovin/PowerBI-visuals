//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    editInsight.js - dialog panel for editing an insight object.
//-------------------------------------------------------------------------------------

module sandDance {
    export module panels {
        export var editInsight: any = {
            title: "Edit Insight", tip: "View and change the name and notes for an insight", rowSpacing: "6px", isDialog: true,
            isPinned: false,

            rows: [
                {
                    text: "Name:", tip: "The name of the insight", dataName: "editInsightName", width: "150px", sameCol: true,
                    rightMargin: 6, leftMargin: 4, tabIndex: 1
                },

                { prompt: "Notes:" },
                {
                    textArea: "", tip: "Your notes about the insight", dataName: "editInsightNotes", width: "150px", height: "50px",
                    tabIndex: 2, placeHolder: "Your notes about this insight.",
                },

                //{ checkbox: "Notes in markdown format", tip: "When true, markdown formatting are recognized in the notes", dataName: "isNotesMarkDown" },

                {
                    enumPicker: "Load action:", tip: "What should be loaded when this insight is selected", width: 60, dataName:
                    "loadAction", enumType: bps.LoadAction, sameCol: true, rightMargin: 6, tabIndex: 3,
                },

                {
                    enumPicker: "Chart title from:", tip: "Specifies the source of the text for the chart title box", width: 60,
                    dataName: "notesSource", enumType: bps.NotesSource, sameCol: true, rightMargin: 6, tabIndex: 4,
                },

                {
                    col: 1, button: "OK", tip: "Apply these changes and close the panel", float: "right", width: 80,
                    acceptButton: true, tabIndex: 100, closeAction: true,
                },
            ]
        };
    }
}
