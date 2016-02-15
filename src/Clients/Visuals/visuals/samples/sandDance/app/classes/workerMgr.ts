//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    workerMgr.ts - manages a pool of web worker objects using a queue of work items.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class WorkerMgrClass extends beachParty.DataChangerClass
    {
        //_isRunning = false;
        _workItems = [];
        _totalWork = 0;
        _workDone = 0;
        _startTime = 0;
        _elapsed = 0;
        _progress = 0;
        _callback = null;

        _workerScriptName: string;
        _maxWorkers: number;
        _workers = [];

        constructor(workerScriptName: string, maxWorkers = 5)
        {
            super();

            this._workerScriptName = workerScriptName;
            this._maxWorkers = maxWorkers;

            this.resetAll();
        }

        //start()
        //{
        //    this._isRunning = true;
        //    this.buildWork();
        //}

        isRunning()
        {
            return this.getActiveWorkers() > 0;
        }

        stopWorkers()
        {
            for (var i = 0; i < this._workers.length; i++)
            {
                var w = this._workers[i];
                if (w != null)
                {
                    this._workers[i] = null;
                    w.terminate();
                }
            }

            this._workItems = [];

            this.resetAll();

            //this._isRunning = false;

            this._elapsed = +Date.now() - this._startTime;
            //document.getElementById("timing").textContent = "elapsed: " + elapsed + " ms";

        }

        getActiveWorkers()
        {
            var count = 0;

            for (var i = 0; i < this._workers.length; i++)
            {
                if (this._workers[i] != null)
                {
                    count++;
                }
            }

            return count;
        }

        startMoreWorkersIfNeeded()
        {
            var activeCount = this.getActiveWorkers();
            var workers = this._workers;
            var workItems = this._workItems;

            if (workItems.length == 0 && activeCount == 0)
            {
                this.stopWorkers();
            }

            while (workItems.length && this.getActiveWorkers() < this._maxWorkers)
            {
                var work = workItems.pop();
                var worker = new Worker(this._workerScriptName);

                var workerId = workers.indexOf(null);
                work.workerId = workerId;
                workers[workerId] = worker;

                if (this._callback)
                {
                    var msgBlock = { event: "workItemStarted", workerId: workerId, workDone: this._workDone, progress: this._progress };
                    this._callback(msgBlock);
                }

                worker.onmessage = (e) =>
                {
                    var data = e.data;
                    if (data.status == "done")
                    {
                        var workerId = data.workerId;
                        var workAmt = (data.workAmt !== undefined) ? data.workAmt : 1;
                        this._workDone += workAmt;

                        this._progress = Math.round((this._workDone / this._totalWork) * 100);

                        if (this._callback)
                        {
                            var msgBlock = {
                                event: "workItemCompleted", workerId: workerId, workDone: this._workDone,
                                progress: this._progress, result: data.result
                            };
                            this._callback(msgBlock);
                        }

                        workers[workerId] = null;

                        this.startMoreWorkersIfNeeded();
                    }
                };

                worker.postMessage(work);           // start the worker
            }
        }

        resetAll()
        {
            this._workItems = [];
            this._totalWork = 0;
            this._workDone = 0;
            this._progress = 0;

            for (var i = 0; i < this._maxWorkers; i++)
            {
                this._workers[i] = null;
            }
        }

        queueWork(work: any, workAmt: number)
        {
            if (this._workItems.length == 0)
            {
                this._startTime = +Date.now();
            }

            work.workAmt = workAmt;

            this._workItems.push(work);
            this._totalWork += workAmt;

            //this.startMoreWorkersIfNeeded();
        }

        start(callback)
        {
            this._callback = callback;
            this.startMoreWorkersIfNeeded();
        }

        buildWork()
        {
            //---- client code looks like this ----
            this.resetAll();

            //---- queue up 20 tasks ----
            for (var i = 0; i < 20; i++)
            {
                var n = Math.round(1000 * Math.random());

                this.queueWork({ count: n }, n);
            }
        }
    }
}
  