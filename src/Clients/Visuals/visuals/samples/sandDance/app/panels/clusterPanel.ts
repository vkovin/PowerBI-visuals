//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    clusterPanel.ts - describes the panel for performing clustering operations.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module sandDance {
    export module panels {
        export var clusterPanel: any =
            {
                title: "Cluster Panel",
                hideTitle: true,
                rows:
                [
                    {
                        col: 0, numAdjuster: "Clusters:", tip: "Set the number of clusters to be discovered", min: 1, max: 25,
                        dataName: "numClusters", newCol: true, roundValues: true,
                    },

                    {
                        col: 3, numAdjuster: "Runs:", tip: "Set the number of runs to find the best clustering", min: 1, max: 99,
                        dataName: "numRuns", newCol: true, roundValues: true,
                    },

                    { col: 0, display: "From:", tip: "Displays the columns that will be used in the clustering", dataName: "columns", readonly: true, noSelectOnFocus: true, },
                    { col: 0, text: "To:", tip: "Specifies the output column where the coluster ID should be written", dataName: "outputColumn", noSelectOnFocus: false, },

                    { emptyRow: true },

                    { col: 0, enumPicker: "Map results: ", tip: "Specify how to apply the results", dataName: "mapResults", enumType: bps.ClusterResultMapping },
                    { col: 0, checkbox: "Clusters overlay", tip: "Specify if cluster drawings should be overlayed on plot", dataName: "isClusterOverlay" },
                    //{ col: 0, checkbox: "Auto clustering", tip: "Automatically recluster when x, y, or z column mappings change and this panel is open", dataName: "isAutoClustering" },

                    { emptyRow: true },

                    {
                        col: 0, button: "Start", tip: "Start the cluster discovery computation", dataName: "onStartButton", id: "start",
                    },

                    {
                        col: 2, progress: "Progress: ", tip: "Displays the progress of the cluster discovery", dataName: "clusterProgress",
                        value: 0, max: 100, width: 150, height: 12, leftMargin: 10, id: "progress", colSpan: 99
                    },
                ]
            };
    }
};
