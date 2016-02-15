//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    clusterPanelMgr.ts - manages the "clusterPanel.js" floating panel.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class clusterPanelMgrClass extends JsonControlClass
    {
        private application: AppClass;
        private container: HTMLElement;

        _numClusters = 3;
        _numRuns = 4;
        _outputColumn = "ClusterId";
        _isClusterOverlay = false;
        _isAutoClustering = false;
        _mapResults = bps.ClusterResultMapping.color;
        _columns: string[];
        _workerMgr: WorkerMgrClass;
        _minDistance: number;
        _minResult = null;

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, buttonId: string, columns: string[], maxWorkers: number)
        {
            super();

            this.application = application;
            this.container = container;

            this._columns = columns;

            var rc = vp.select(this.container, "." + buttonId).getBounds(false);
            var x = rc.left;
            var y = rc.bottom;

            var jsonPanel = buildJsonPanel(application, settings, container, buttonId, this, "clusterPanel", true, x, y);
            this._jsonPanel = jsonPanel;

            jsonPanel.registerForChange("close", (e) =>
            {
                this.onDataChanged("close");
            });

            jsonPanel.togglePin(null);      // unpin the panel

            //this.showProgress(false);

            this._workerMgr = new WorkerMgrClass("scripts/kMeansWorker.js?foo=1", maxWorkers);

            //---- add "score" display as peer to "progress" ----
            var parentElem = vp.select(this._jsonPanel.getRootElem(), "#progress")[0].parentNode;

            var scoreW = vp.select(parentElem).append("div")
                .addClass("panelDisplay")     
                .id("score");

            this.showScore(false);
        }

        getJsonPanel()
        {
            return this._jsonPanel;
        }

        showScore(value: boolean)
        {
            vp.select(this._jsonPanel.getRootElem(), "#score")
                .css("display", (value) ? "" : "none")
        }

        showProgress(value: boolean)
        {
            vp.select(this._jsonPanel.getRootElem(), "#progress")
                .css("display", (value) ? "" : "none")
        }

        updateProgress(value: number)
        {
            this.showProgress(true);

            vp.select(this._jsonPanel.getRootElem(), ".myInnerProgressBar")
                .css("width", value + "%")

            if (true)       // value == 100)
            {
                //this.showProgress(false);

                var dist = vp.formatters.comma(this._minDistance);
                this.updateScore("Best distance: " + dist);
            }

        }

        updateScore(value: string)
        {
            this.showScore(true);

            vp.select(this._jsonPanel.getRootElem(), "#score")
                .text(value);
        }

        updateStartButton(value: string)
        {
            vp.select(this._jsonPanel.getRootElem(), "#start")
                .text(value);
        }

        close()
        {
            this._jsonPanel.close();
        }

        numRuns(value?: number)
        {
            if (arguments.length == 0)
            {
                return this._numRuns;
            }

            this._numRuns = value;
            this.onDataChanged("numRuns");
        }

        outputColumn(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._outputColumn;
            }

            this._outputColumn = value;
            this.onDataChanged("outputColumn");
        }

        columns(value?: string)
        {
            if (arguments.length == 0)
            {
                var colStr = utils.arrayToString(this._columns, ", ");
                return colStr;
            }

            this._columns = utils.stringToArray(value, ", ");
            this.onDataChanged("columns");

            if (this._isAutoClustering)
            {
                this.startClustering();
            }
            else
            {
                this._workerMgr.resetAll();

                this._minDistance = Number.MAX_VALUE;
                this._minResult = null;

                this.updateProgress(0);
                this.updateScore("");
            }
        }

        numClusters(value?: number)
        {
            if (arguments.length == 0)
            {
                return this._numClusters;
            }

            this._numClusters = value;
            this.onDataChanged("numClusters");
        }

        isClusterOverlay(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isClusterOverlay;
            }

            this._isClusterOverlay = value;
            this.onDataChanged("isClusterOverlay");
        }

        isAutoClustering(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isAutoClustering;
            }

            this._isAutoClustering = value;
            this.onDataChanged("isAutoClustering");
        }

        mapResults(value?: string)
        {
            if (arguments.length == 0)
            {
                return bps.ClusterResultMapping[this._mapResults];
            }

            this._mapResults = bps.ClusterResultMapping[value];
            this.onDataChanged("mapResults");
        }

        addToRecords(records: any[], data: number[])
        {
            for (var i = 0; i < data.length; i++)
            {
                var dataItem = data[i];
                var record = records[i];
                if (!record)
                {
                    record = [];
                    records[i] = record;
                }

                record.push(dataItem);
            }
        }

        onStartButton()
        {
            if (this._workerMgr.isRunning())
            {
                this._workerMgr.stopWorkers();

                this.onClusteringStopped();
                this.updateProgress(0);
            }
            else
            {
                this.startClustering();
            }
        }

        startClustering()
        {
            if (!this._columns || this._columns.length == 0)
            {
                throw "Cannot cluster - no columns defined in current chart";
            }

            this.startClusteringCore();
        }

        startClusteringCore()
        {
            this._minDistance = Number.MAX_VALUE;
            this._minResult = null;

            this.updateProgress(0);
            this.updateScore("");

            this.updateStartButton("Stop");

            //---- prep data ----
            /*appClass.instance*/this.application._bpsHelper.getDataVectors(this._columns, true, (msgBlock) =>
            {
                var nv = JSON.parse(msgBlock.vectors);
                var records = [];

                //---- normalize data ----
                for (var i = 0; i < this._columns.length; i++)
                {
                    var colName = this._columns[i];
                    var data = nv[colName];

                    var nData = vp.data.normalize(data);
                    this.addToRecords(records, nData);
                }

                //---- queue up each run ----
                var wm = this._workerMgr;
                wm.resetAll();

                var kd = this._numClusters * this._columns.length;

                for (var i = 0; i < this._numRuns; i++)
                {
                    //---- update random numbers used for this work item ----
                    var kdRandomNumbers = [];
                    for (var k = 0; k < kd; k++)
                    {
                        kdRandomNumbers[k] = Math.random();
                    }

                    var jsonObj = { columns: records, K: this._numClusters, kdRandomNumbers: kdRandomNumbers };

                    vp.utils.debug("work item: " + i + ", kd.length=" + kdRandomNumbers.length + ", first=" +
                        kdRandomNumbers[0]);

                    wm.queueWork(jsonObj, 1);
                }

                wm.start((msgBlock) =>
                {
                    var eventName = msgBlock.event;

                    if (eventName == "workItemCompleted")
                    {
                        var result = msgBlock.result;

                        vp.utils.debug("workerId=" + msgBlock.workerId + ", epoc=" + result.epoc
                            + ", distance=" + result.totalDistance);

                        if (result.totalDistance < this._minDistance)
                        {
                            this._minDistance = result.totalDistance;
                            this._minResult = result;
                        }

                        this.updateProgress(msgBlock.progress);

                        if (msgBlock.progress == 100)
                        {
                            this.onClusteringStopped();
                        }
                    }
                });
            });
        }

        buildSortedKeys(clusters: any[])
        {
            var sortedKeys = [];

            for (var i = 0; i < clusters.length; i++)
            {
                var cluster = clusters[i];
                if (cluster.counts > 0)
                {
                    sortedKeys.push(i + "");
                }
            }

            return sortedKeys;
        }

        onClusteringStopped()
        {
            this.updateStartButton("Start");

            if (this._minResult)
            {
                //---- upload new ClusterId column to engine ----
                var colStr = utils.arrayToString(this._columns, ", ");
                var sortedKeys = this.buildSortedKeys(this._minResult.clusters);

                var colInfo = new bps.ColInfo(this._outputColumn, "Created from columns: " + colStr, "string", sortedKeys);
                var colData = this._minResult.clusterAssignments;

                /*appClass.instance*/this.application._bpsHelper.addColumnsToData([colInfo], [colData], (msgBlock) =>
                {
                    /*appClass.instance*/this.application.onClusterIdCreated(msgBlock.colInfos, this._mapResults, this._outputColumn);
                });
            }
        }
   }
}