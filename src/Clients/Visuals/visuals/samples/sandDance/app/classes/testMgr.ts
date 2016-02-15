//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    testMgr.ts - controls the running of an automated BeachParty test.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class TestMgrClass extends beachParty.DataChangerClass
    {
        testResultsKey = "testResults";

        //---- test PARAMS ----
        _repeatCount = 1;
        _name: string;
        _maxBuildTime = undefined;
        _minFPS = undefined;
        _cmdDelay = undefined;
        _stopOnError = true;
        _cmds: any[];
        _plotResults: boolean;
        _collectPerfData = true;

        //---- test STATE ----
        _cmdIndex: number;
        _runCount = 0;
        _isRunning = false;
        _waitingForCycleNum = undefined;
        _currentViewName = "Scatter";
        _currentCmd: string;
        _cmdId: string;

        //---- OTHER ----
        _app: AppClass;
        _cmdTimer = null;
        _perfRecords: PerfRecord[];

        constructor(app: AppClass)
        {
            super();

            this._app = app;
        }

        public start(scriptData: ScriptData, firstPass?: boolean)
        {
            this._repeatCount = scriptData.repeatCount;
            this._plotResults = scriptData.plotResults;

            this._name = scriptData.name;
            this._cmds = scriptData.cmds;

            this._cmdDelay = (scriptData.cmdDelay !== undefined) ? scriptData.cmdDelay : 1000;
            this._stopOnError = (scriptData.stopOnError !== undefined) ? scriptData.stopOnError : true;

            this.restart(true);
        }

        restart(firstPass: boolean)
        {
            if (firstPass)
            {
                this._runCount = 0;
                this._isRunning = true;
                this._perfRecords = [];
            }

            this._cmdIndex = 0;
            this._runCount++;

            this.statusMsg();

            this.startNextCmd();
        }

        statusMsg(msg?: string)
        {
            var fullMsg = this._name + ": run #" + this._runCount;

            if (msg)
            {
                fullMsg += "\r\n" + msg;
            }

            this._app.infoMsg(fullMsg);

        }

        private startNextCmd(delay?: number)
        {
            if (this._isRunning)
            {
                if (this._cmdIndex < this._cmds.length)
                {
                    if (delay === undefined)
                    {
                        delay = (this._cmdDelay !== undefined) ? this._cmdDelay : 1;
                    }

                    this.cancelCmdTimer();

                    this._cmdTimer = setTimeout((e) =>
                    {
                        //this._cmdTimer = null;

                        var cmd = this._cmds[this._cmdIndex];
                        this._cmdIndex++;

                        this.runCmd(cmd);
                    }, delay);
                }
                else
                {
                    this.onEndReached();
                }
            }
        }

        cancelCmdTimer()
        {
            if (this._cmdTimer)
            {
                clearTimeout(this._cmdTimer);
                this._cmdTimer = null;
            }
        }

        public reportFrameStats(cmdTime: number, buildChartElapsed: number, frameRate: number, frameCount: number,
            cycleNum: number, cmdId: string)
        {
            if (this._isRunning)
            {
                if (this._maxBuildTime !== undefined && buildChartElapsed > this._maxBuildTime)
                {
                    this.error("maxBuildTime=" + this._maxBuildTime + " exceeded");
                }

                if (this._minFPS !== undefined && frameRate < this._minFPS)
                {
                    this.error("minFPS=" + this._minFPS + " not met");
                }

                if (this._collectPerfData)
                {
                    //---- add perf record ----
                    var pr = new PerfRecord();

                    pr.time = vp.utils.now();
                    pr.cmdTime = cmdTime;    
                    pr.fps = frameRate;
                    pr.frameCount = frameCount;
                    pr.buildTime = buildChartElapsed;
                    pr.dataName = this._app._filename;
                    pr.cycleNum = cycleNum;
                    pr.recordCount = this._app._recordCount;
                    pr.view = this._currentViewName;
                    pr.cmd = this._currentCmd;

                    this._perfRecords.push(pr);
                }

                if (this._cmdId == cmdId)        //   cycleNum == this._waitingForCycleNum)
                {
                    this._waitingForCycleNum = undefined;

                    this.startNextCmd();
                }

            }
        }

        private error(msg)
        {
            this.stop();

            msg = "Error during automated test: " + msg;
            this._app.showError(msg);
        }

        getParam(cmd: any, paramName: string)
        {
            var value = (vp.utils.isObject(cmd)) ? cmd[paramName] : cmd;
            if (value === undefined)
            {
                this.error("cmd=" + cmd + " is missing parameter=" + paramName);
            }

            return value;
        }

        runCmd(cmd: any)
        {
            var nextCmdDelay = undefined;

            var cmdName = vp.utils.keys(cmd)[0];
            this._currentCmd = cmdName;
            
            //---- store the cmdID with bpsHelper ----
            this._cmdId = (5000 + this._cmdIndex) + "";
            this._app.setHelperCmdId(this._cmdId);

            var action = Action[<string>cmd.action];
            var target = Target[<string>cmd.target];
            var cmdNeedsRendering = true;

            if (action == Action.load && target == Target.data)
            {
                //---- LOAD DATA ----
                var dataName = cmd.fileName;
                var source = cmd.source;

                var fileParams = new bps.WorkingDataParams(dataName, null, source);
                FileOpenMgr.instance.autoloadFile(fileParams);
                this._currentViewName = "Scatter";
            }
            else if (action == Action.adjust && target == Target.chartType)
            {
                //---- SET CHARTTYPE ----
                var viewName = cmd.name;
                this._app.changeToChart(viewName, null, Gesture.automatedTest);
                this._currentViewName = viewName;
            }
            else if (action == Action.remap && target == Target.colorMapping)
            {
                this._app.remapColorData();
            }
            else if (action == Action.adjust && target == Target.colorSpread)
            {
                //---- COLOR SPREAD ----
                this._app.colorSpread(cmd.value);
            }
            else if (action == Action.adjust && target == Target.colorPalette)
            {
                //---- COLOR PALETTE ----
                this._app.colorPalette(cmd.value);
            }
            else if (action == Action.adjust && target == Target.colorReverse)
            {
                //---- COLOR REVERSE ----
                this._app.reverseColorPalette(toBool(cmd.value));
            }
            else if (action == Action.adjust && target == Target.colorContinuous)
            {
                //---- COLOR CONTINUOUS ----
                this._app.colorIsContinuous(toBool(cmd.value));
            }
            else if (action == Action.adjust && target == Target.colorMapping)
            {
                //---- COLOR MAPPING ----
                if (cmd.colName !== undefined)
                {
                    this._app.colorColumn(cmd.colName);
                }
                else if (cmd.binCount !== undefined)
                {
                    this._app.colorSteps(+cmd.binCount);
                }
            }
            else if (action == Action.adjust && target == Target.selection)
            {
                //---- RECT SELECTION ----
                var rc = vp.geom.createRect(cmd.left, cmd.top, cmd.width, cmd.height);

                var sd = new SelectionDesc();
                sd.legendSource = "rect drag";
                sd.rectSelect = rc;

                /*appClass.instance*/this._app.setSelectionDesc(sd);
                /*appClass.instance*/this._app._bpsHelper.rectSelect(rc);
            }
            else if (action == Action.adjust && target == Target.xMapping)
            {
                //---- X COLNAME ----
                this._app.xColumn(cmd.colName);
            }
            else if (action == Action.adjust && target == Target.yMapping)
            {
                //---- Y COLNAME ----
                this._app.yColumn(cmd.colName);
            }
            else if (action == Action.adjust && target == Target.zMapping)
            {
                //---- Z COLNAME ----
                this._app.zColumn(cmd.colName);
            }
            else if (action == Action.adjust && target == Target.filter && cmd.type == "Isolate")
            {
                //---- ISOLATE ----
                if (this._app._selectedCount)
                {
                    this._app.onIsolateClick(null);
                }
                else
                {
                    cmdNeedsRendering = false;
                }
            }
            else if (action == Action.adjust && target == Target.filter && cmd.type == "Exclude")
            {
                //---- EXCLUDE ----
                if (this._app._selectedCount)
                {
                    this._app.onExcludeClick(null);
                }
                else
                {
                    cmdNeedsRendering = false;
                }
            }
            else if (action == Action.clear && target == Target.filterAndSelection)
            {
                //---- RESET ----
                this._app.onResetClick(null);
            }
            else if (action == Action.show && target == Target.detailsPanel)
            {
                //---- DETAILS ----
                /*appClass.instance*/this._app.showDetailsPanel(true);
                cmdNeedsRendering = false;
            }
            else
            {
                //---- UNKNOWN CMD ----
                cmdNeedsRendering = false;

                //this.error("Unsupported cmd: " + cmdName);
                return;
            }

            //---- OLD CMDS ----
            if (true)
            {
            }
            else if (cmd.setTestParams)
            {
                var params = cmd.setTestParams;

                this._maxBuildTime = params.maxBuildTime;
                this._minFPS = params.minFPS;
                this._cmdDelay = params.cmdDelay;
                this._stopOnError = params.stopOnError;

                cmdNeedsRendering = false;
            }
            else if (cmd.xBoxSelect !== undefined)
            {
                var index = this.getParam(cmd.xBoxSelect, "index");
                this._app.selectXBox(index);
            }
            else if (cmd.yBoxSelect !== undefined)
            {
                var index = this.getParam(cmd.yBoxSelect, "index");
                this._app.selectYBox(index);
            }
            else if (cmd.colorBoxSelect !== undefined)
            {
                var index = this.getParam(cmd.colorBoxSelect, "index");
                this._app.selectColorBox(index);
            }
            else if (cmd.setColor)
            {
                var colName = this.getParam(cmd.setColor, "column");
                var paletteName = this.getParam(cmd.setColor, "palette");
                var reverse = this.getParam(cmd.setColor, "reverse");

                if (colName)
                {
                    this._app.colorColumn(colName);
                }

                if (paletteName)
                {
                    var palette = beachParty.colorPalettesClass.colorBrewerSchemes[paletteName]; 
                    palette.name = paletteName;

                    this._app.colorPalette(palette);
                }

                if (reverse)
                {
                    this._app.reverseColorPalette(reverse);
                }
            }
            else if (cmd.delay)
            {
                nextCmdDelay = cmd.delay;
                cmdNeedsRendering = false;
            }
            else if (cmd.search)
            {
                var colName = this.getParam(cmd.search, "column");
                var text = this.getParam(cmd.search, "text");

                this._app.searchCol(colName);
                this._app.searchValue("automation", text, undefined, true);
            }
            else
            {
                //---- for now, just skip over unrecognized cmds ----
                //cmdNeedsRendering = false;
                this.error("Unsupported cmd: " + cmdName);
                return;
            }

            var strCmd = this._cmdIndex + ". " + this.cmdToString(cmd);

            if (!cmdNeedsRendering)
            {
                this._waitingForCycleNum = undefined;
                this.statusMsg(strCmd + " (completed)");
                this.startNextCmd();
            }
            else
            {
                this._waitingForCycleNum = 1 + this._app._chartCycleNum;
                this.statusMsg(strCmd + " (#" + this._waitingForCycleNum + ")");
            }
        }

        private onEndReached()
        {
            if ((!this._repeatCount) || (this._runCount < this._repeatCount))
            {
                this.restart(false);
            }
            else
            {
                this.statusMsg("test completed");
                this.onStopped();
            }
        }

        private onStopped()
        {
            this._isRunning = false;
            this.cancelCmdTimer();

            //---- write perf results to local storage ----
            if (this._collectPerfData)
            {
                this.savePerfResults();

                if (this._plotResults)
                {
                    this.plotPerfResults();
                }
            }
        }

        plotPerfResults()
        {
            var perfResults = this.loadPerfResultsFromLocalStorage();
            if (perfResults)
            {
                FileOpenMgr.instance.uploadData(perfResults, "testResults", undefined, (e) =>
                {
                    this._app.changeToChart("Scatter", null, Gesture.automatedTest);
                    this._app.xColumn("time");
                    this._app.yColumn("fps");

                    this._app.colorColumn("cmd");
                });
            }
        }

        loadPerfResultsFromLocalStorage()
        {
            var perfResults = null;

            var str = beachParty.LocalStorageMgr.get(beachParty.StorageType.sessionShare,
                beachParty.StorageSubType.testResults, null);

            perfResults = <PerfRecord[]> JSON.parse(str);

            //---- change "time" to a "date" ----
            perfResults.forEach((pr) =>
            {
                pr.time = new Date(pr.time);
            });

            return perfResults;
        }

        savePerfResults()
        {
            var str = JSON.stringify(this._perfRecords);

            beachParty.LocalStorageMgr.save(beachParty.StorageType.sessionShare,
                beachParty.StorageSubType.testResults, null, str);
        }

        cmdToString(cmd: any)
        {
            var str = JSON.stringify(cmd);
            return str;
        }

        public stop()
        {
            this._app.infoMsg("Test stopped");
            this.onStopped();
        }

    }

    function toBool(value: string)
    {
        return (value == "true");
    }

    export class PerfRecord
    {
        //---- timestamp ----
        time: number;

        //---- measures ----
        cmdTime: number;
        fps: number;
        buildTime: number;
        frameCount: number;

        //---- dimensions ----
        cycleNum: number;
        dataName: string;
        recordCount: number;
        view: string;
        cmd: string;
    }
}