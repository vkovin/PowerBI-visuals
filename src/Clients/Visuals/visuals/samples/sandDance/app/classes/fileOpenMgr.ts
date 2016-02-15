//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    fileOpenMgr.ts - manages the File Open (aka "Dataset") panel
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class FileOpenMgr extends beachParty.DataChangerClass 
    {
        static instance: FileOpenMgr;

        private application: AppClass;
        private container: HTMLElement;
        private settings: AppSettingsMgr;

        _bpsHelper: bps.ChartHostHelperClass;
        _fileOpenPanel = <JsonPanelClass>null;

        _fileOpenUrl = "";
        _fileOpenSource = null;
        _selectedSampleName = "";
        _selectedFileName = "<none>";
        _sqlTableName = "";
        _workingDataMaxRecords = 25 * 1000;
        _openFileTypeLocal = "tab";
        _openFileTypeWeb = "json";
        _fileHasHeader = true;
        _loadedFileOpenText = null;
        _dataScrubberName = "None";
        _preload: bps.Preload;
        _fileOpenObjs: any[];
        _selectedOpenFile: string;

        private saveSettingsHandler: (settings: any, type: sandDance.SettingsType)  => void;
        private loadSettingsHandler: (type: sandDance.SettingsType) => any;

        constructor(
            application: AppClass,
            settings: AppSettingsMgr,
            container: HTMLElement,
            bpsHelper: bps.ChartHostHelperClass,
            saveSettingsHandler: (settings: any, type: sandDance.SettingsType)  => void,
            loadSettingsHandler: (type: sandDance.SettingsType) => any)
        {
            super();

            this.application = application;
            this.settings = settings;
            this.container = container;

            this.saveSettingsHandler = saveSettingsHandler;
            this.loadSettingsHandler = loadSettingsHandler;

            this._bpsHelper = bpsHelper;
            
            FileOpenMgr.instance = this;
        }

        preload(value?: bps.Preload)
        {
            if (arguments.length === 0)
            {
                return this._preload;
            }

            this._preload = value;
            this.onDataChanged("preload");
        }

        showMsg(title: string, msg: string)
        {
            /*appClass.instance*/this.application.showInfoMsg(title, msg);
        }

        selectedOpenFile(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._selectedOpenFile;
            }

            this._selectedOpenFile = value;

            if (value)
            {
                RelationMgrClass.instance.getFileText(value, (text, fn) => 
                {
                    this._loadedFileOpenText = text;
                    this._selectedFileName = value;
                    this.loadFileOpenLocal();
                });
            }

            this.onDataChanged("selectedOpenFile");
        }

        /** Show FILE OPEN panel. */
        openFileOpenPanel()
        {
            var rc = vp.select("#bbData").getBounds(false);
            var left = rc.left;
            var top = rc.bottom;

            this._fileOpenPanel = buildJsonPanel(this.application, this.settings, this.container, "bbData", this, "fileOpenPanel", true, left, top);

            //---- make sure actions don't auto-close (except for "load" button) ----
            this._fileOpenPanel._closeOnAction = false;

            var elem = this._fileOpenPanel.getRootElem();

            //---- hide SQL for the client edition ----
            if (/*appClass.instance*/this.application._edition == "client")
            {
                vp.select(elem, "#tab4").css("display", "none");
            }

            //---- hide SWITCH tab if < 2 files are open ----
            if (RelationMgrClass.instance.getFileCount() < 2)
            {
                //vp.select(elem, "#tab0").css("display", "none");
                this._fileOpenPanel.showTab("tab0", false);

                var newFirstTab = vp.select(elem, "#tab1")[0];
                this._fileOpenPanel.onTabSelected(newFirstTab);
            }

            //---- adjust length of knownDataPickerList ----
            var panelHeight = vp.select(elem).height();

            vp.select(elem, "#knownDataPickerList") 
                .css("max-height", (panelHeight - 65) + "px");

        }

        uploadData(data: any, fn: string, wdParams?: bps.WorkingDataParams, callback?: any)
        {
            this.showMsg("Loading data: " + fn, "Please wait...");

            if (!wdParams)
            {
                var wdParams = new bps.WorkingDataParams(fn);
                wdParams.fileType = bps.FileType.json;
            }

            //---- supply a dataName so we can refer to this open data source when needed ----
            wdParams.dataName = fn;

            this._loadedFileOpenText = data;
            this._bpsHelper.setData(data, wdParams, callback);
        }

        processDroppedTextOrFile(e)
        {
            e.preventDefault();

            var dt = e.dataTransfer;
            var files = dt.files;

            if (files && files.length)
            {
                var file = files[0];
                var reader = new FileReader();
                var name = file.name;

                //---- avoid processing image files (especially if its an accidental drag of our of 1 of our icons) ----
                if (!utils.isImageFile(name))
                {
                    var reader = new FileReader();
                    reader.onload = (e) =>
                    {
                        // get file content
                        var text = (<any>e.target).result;

                        var wdParams = new bps.WorkingDataParams(file.name, file.name);
                        wdParams.hasHeader = true;
                        wdParams.separator = (file.name.endsWith(".txt")) ? "\t" : ",";
                        wdParams.fileType = bps.FileType.delimited;

                        this.uploadData(text, file.name, wdParams);
                    };

                    //---- start the ASYNC read of the dropped file ----
                    reader.readAsText(file);
                }
            }
            else
            {
                //---- process the dropped TEXT ----
                var text = dt.getData("text");

                if (text.contains("\t"))
                {
                    var fn = "dragAndDrop.txt";
                    var wdParams = new bps.WorkingDataParams(fn);
                    wdParams.hasHeader = true;
                    wdParams.separator = "\t";
                    wdParams.fileType = bps.FileType.delimited;

                    this.uploadData(text, fn, wdParams);
                }
                else
                {
                    this.application._insightMgr.processDroppedText(text);
                }
            }
        }

        selectedSampleName(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._selectedSampleName;
            }

            this._selectedSampleName = value;
            this._fileOpenSource = "sample";

            this.openKnownFile(value, true);
            this.closeFileOpenPanel();

            this.onDataChanged("selectedSampleName");
        }

        closeFileOpenPanel()
        {
            if (this._fileOpenPanel)
            {
                //---- don't close if panel is draggable (user must close explictly) ----
                if (!this._fileOpenPanel.isShowingTitle())
                {
                    this._fileOpenPanel.close();
                    this._fileOpenPanel = null;
                }
            }
        }

        public updateDataView(data: any) {
            this._bpsHelper.updateDataView(data, null, () => {
                console.log("updateDataView: " + new Date());
            });
        }

        selectedFileName(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._selectedFileName;
            }

            this._selectedFileName = value;
            this._fileOpenSource = "local";
            this.onDataChanged("selectedFileName");
        }

        openFileTypeLocal(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._openFileTypeLocal;
            }

            this._openFileTypeLocal = value;
            this.onDataChanged("openFileTypeLocal");
            this.onDataChanged("isFirstLineDisabledLocal");
        }

        openFileTypeWeb(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._openFileTypeWeb;
            }

            this._openFileTypeWeb = value;
            this.onDataChanged("openFileTypeWeb");
            this.onDataChanged("isFirstLineDisabledWeb");
        }

        fileOpenURL(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._fileOpenUrl;
            }

            this._fileOpenUrl = value;
            this._fileOpenSource = "web";
            this.setFileTypeFromNameWeb(value);

            this.onDataChanged("fileOpenURL");
        }

        sqlTableName(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._sqlTableName;
            }

            this._sqlTableName = value;

            this.onDataChanged("sqlTableName");
        }

        fileHasHeader(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._fileHasHeader;
            }

            this._fileHasHeader = value;
            this.onDataChanged("fileHasHeader");
        }

        onFileNameClick(e)
        {
            //---- reset results from last file load ----
            this._selectedFileName = "";
            //this._fileOpenUrl = "";
            this._fileOpenSource = null;

            logAction(Gesture.click, e.target.id, ElementType.button, Action.open, Target.filePanel, false);

            // this.openFileOpenPanel();
        }

        setLocalFileType(fn: string)
        {
            var fileType = null;

            if (fn.endsWith(".txt"))
            {
                fileType = "tab";
            }
            else if (fn.endsWith(".csv"))
            {
                fileType = "comma";
            }
            else if (fn.endsWith(".json"))
            {
                fileType = "json";
            }

            if (fileType)
            {
                this.openFileTypeLocal(fileType);
            }
        }

        setFileTypeFromNameWeb(fn: string)
        {
            if (fn.endsWith(".txt"))
            {
                this.openFileTypeWeb("tab");
            }
            else if (fn.endsWith(".csv"))
            {
                this.openFileTypeWeb("comma");
            }
            else if (fn.endsWith(".json"))
            {
                this.openFileTypeWeb("json");
            }
        }

        isFirstLineDisabledLocal()
        {
            var ft = this._openFileTypeLocal;

            return (ft === "json");
        }

        isFirstLineDisabledWeb()
        {
            var ft = this._openFileTypeWeb;

            return (ft === "json");
        }

        onOpenFileClicked()
        {
            var fileExts = ".csv,.txt,.json";

            if (true)       // appClass.instance.isNextEdition())
            {
                fileExts += ",.png,.jpg,.bmp";
            }

            this.selectedFileName(null);

            //---- support for multiple files ----
            LocalFileHelper.getFileOpenSelections(fileExts, (files) =>
            {
                this._fileOpenObjs = files;

                var fileList = "";
                for (var i = 0; i < files.length; i++)
                {
                    var file = files[i];
                    var fn = file.name;

                    if (fileList != "")
                    {
                        fileList += " ";
                    }

                    fileList += fn;
                }

                this.selectedFileName(fileList);

                //---- read first file ----
                LocalFileHelper.loadFileFromFileObj(files[0], (text, fn, preload) =>
                {
                    try
                    {
                        //---- NOTE: file is actually uploaded via "loadFileOpenLocal()", called from fileOpenPanel OK button handler ----
                        this._preload = preload;
                        this._loadedFileOpenText = text;
                        //this.selectedFileName(fn);

                        this.setLocalFileType(fn);
                    }
                    catch (ex)
                    {
                        throw ("Error parsing session file: " + ex);
                    }
                });
            });
        }

        /** used to open Web URL files and SQL files. */
        loadFileFromPanel(url?: string, sqlTableName?: string, maxRecords?: number)
        {
            /// some test URL's:
            ///     http://localhost/vuebigdata/datafiles/iris.txt
            ///     http://vibe10/vuebigdata/datafiles/loanData.csv
            ///     http://vibe10/vuebigdata/datafiles/mediumSales.json

            if (url)
            {
                var fileType = this._openFileTypeWeb;

                // var text = this._loadedFileOpenText;
                var fn = AppUtils.getLastNodeOfUrl(url);
                var fileSource = (sqlTableName) ? "sql" : "url";

                var scrubberTemplate = this._dataScrubberName;
                if (scrubberTemplate)
                {
                    var wdParams = <bps.WorkingDataParams>this.getPreloadFromLocalStorage(scrubberTemplate, null, sqlTableName);
                }

                if (!wdParams)
                {
                    wdParams = new bps.WorkingDataParams(fn, url);
                    wdParams.hasHeader = this._fileHasHeader;
                    wdParams.separator = (fileType === "tab") ? "\t" : ",";
                    wdParams.fileType = (fileType === "json") ? bps.FileType.json : bps.FileType.delimited;
                    wdParams.fileSource = fileSource;
                }

                if (sqlTableName)
                {
                    if (sqlTableName.contains(" ") || sqlTableName.contains(";"))
                    {
                        wdParams.queryString = sqlTableName;
                        var name = sqlTableName;
                    }
                    else
                    {
                        wdParams.tableName = sqlTableName;
                        var name = sqlTableName;
                    }

                    wdParams.fileType = bps.FileType.sql;
                }

                wdParams.maxRecords = maxRecords;

                //---- supply a dataName so we can refer to this open data source when needed ----
                wdParams.dataName = fn;

                this._fileOpenObjs = null;

                this.showMsg("Loading data: " + fn, "Please wait...");

                this._bpsHelper.loadData(wdParams);
            }

            this.closeFileOpenPanel();
        }

        loadFileOpenWeb()
        {
            /// some test URL's:
            ///     http://localhost/vuebigdata/datafiles/iris.txt
            ///     http://vibe10/vuebigdata/datafiles/loanData.csv
            ///     http://vibe10/vuebigdata/datafiles/mediumSales.json

            this.loadFileFromPanel(this._fileOpenUrl);
        }

        /** load the file from cache or as known file. */
        autoloadFile(wdParams?: bps.WorkingDataParams, callback?: any)
        {
            /// Note: the app client loads LOCAL files from cache and sends to engine, but
            /// WEB ("url") files should be loaded directly by the engine (to save large file memeory usage and
            /// transfer time.

            wdParams.canLoadFromCache = true;
            var filename = wdParams.dataName;

            if (wdParams.fileSource == "known" || wdParams.fileSource == null)
            {
                this.openKnownFile(filename, false, callback);
            }
            else if (wdParams.fileSource == "url")
            {
                this._bpsHelper.loadData(wdParams, callback);
            }
            else
            {
                var text = this.getLocalFileFromCache(wdParams);
                this.uploadData(text, filename, wdParams, callback);
            }
        }

        getLocalFileFromCache(wdParams: bps.WorkingDataParams)
        {
            //---- autoload LOCAL file ----
            var filename = wdParams.dataName;

            var isCached = beachParty.LocalStorageMgr.isPresent(
                beachParty.StorageType.dataFile, beachParty.StorageSubType.local, filename);

            if (!isCached)
            {
                throw "Cannot autoload local file from cache: " + filename;
            }

            var strEntry = beachParty.LocalStorageMgr.get(beachParty.StorageType.dataFile, beachParty.StorageSubType.local, filename);
            var entry = JSON.parse(strEntry);

            var text = entry.data;

            this.showMsg("Loading data: " + filename, "Please wait...");

            //this.uploadData(text, filename, wdParams, callback);
            return text;
        }

        getWdParams(url: string, fileType: string, scrubberTemplate?: string)
        {
            var wdParams = null;
            var fn = AppUtils.getLastNodeOfUrl(url);

            if (scrubberTemplate)
            {
                wdParams = <bps.WorkingDataParams>this.getPreloadFromLocalStorage(scrubberTemplate);        // fn, "local");
            }

            if (!wdParams)
            {
                wdParams = new bps.WorkingDataParams(fn, url);
                wdParams.hasHeader = this._fileHasHeader;
                wdParams.separator = (fileType == "tab") ? "\t" : ",";
                wdParams.fileType = (fileType == "json") ? bps.FileType.json : bps.FileType.delimited;
                wdParams.fileSource = "local";
            }

            return wdParams;
        }

        /** local a local file using our properties (include this._loadedFileOpenText). */
        loadFileOpenLocal()
        {
            var url = this._selectedFileName;
            if (url)
            {
                var parts = url.split(" ");         // get first file
                url = parts[0].trim();              // remove leading/tailing spaces

                var isLocal = true;
                var fileType = this._openFileTypeLocal;
                var fn = AppUtils.getLastNodeOfUrl(url);

                var wdParams = this.getWdParams(url, this._openFileTypeLocal, this._dataScrubberName);

                //---- TODO: present user with a dialog for each file opened and allow him to set the wdParams for each ----
                RelationMgrClass.instance.setFileObjs(this._fileOpenObjs, wdParams);

                var text = this._loadedFileOpenText;
                this.uploadData(text, fn, wdParams);

                if (settings.cacheLocalFiles())
                {
                    var obj = { data: text, wdParams: wdParams };
                    var value = JSON.stringify(obj);

                    beachParty.LocalStorageMgr.save(beachParty.StorageType.dataFile,
                        beachParty.StorageSubType.local, url, value);
                }
            }

            this.closeFileOpenPanel();
        }

        getPreloadFromLocalStorage(fn: string, fileSource?: string, tableName?: string)
        {
            // var preload = <bps.Preload>null;

            var preload = <bps.Preload>this.loadSettingsHandler(sandDance.SettingsType.preloads);

//             var subtype = beachParty.StorageSubType[fileSource];
// 
//             var str = beachParty.LocalStorageMgr.get(beachParty.StorageType.preload,
//                 subtype, fn, tableName); 
// 
//             if (str && str.length)
//             {
//                 preload = JSON.parse(str);
//             }

            return preload;
        }

        __savePreloadToLocalStorage(preload: bps.Preload)
        {
            this.saveSettingsHandler(preload, sandDance.SettingsType.preloads);
        }

        reloadDataPerScrubbing(editInfos: EditColInfo[])
        {
            //---- build fieldlist for preload ----
            var fieldList = <bps.PreloadField[]>[];

            for (var i = 0; i < editInfos.length; i++)
            {
                var ei = editInfos[i];
                if (ei.isVisible)
                {
                    var cfExpress = (ei.name === ei.displayName) ? null : ei.name;
                    var pf = new bps.PreloadField(ei.displayName, ei.desc, cfExpress, ei.colType, ei.sortedKeys);
                    pf.valueMap = ei.valueMap;

                    fieldList.push(pf);
                }
            }

            var preload = this._preload;
            preload.fieldList = fieldList;

//             var strValue = JSON.stringify(preload);
// 
//             beachParty.LocalStorageMgr.save(beachParty.StorageType.preload,
//                 beachParty.StorageSubType.local, preload.filePath, strValue);
// 
//             this.showMsg("Reloadng data: " + preload.filePath, "Please wait...");

            this.__savePreloadToLocalStorage(preload);

            //---- reload data with new fieldList ----
            // if (this._loadedFileOpenText)
            // {
                this._bpsHelper.updateDataView(null, preload);
                // this._bpsHelper.setData(this._loadedFileOpenText, preload);
            // }
            // else
            // {
            //     this._bpsHelper.loadData(preload, null);
            // }
        }

        loadFileOpenSql()
        {
            this.loadFileFromPanel(this._fileOpenUrl, this._sqlTableName, this._workingDataMaxRecords);
        }

        openKnownFile(name: string, fromUI: boolean, callback?: any)
        {
            vp.select(this.container, ".filenameText")
                .text("[loading file: " + name + "]");

            //---- clear local file data from last load ----
            this._loadedFileOpenText = null;

            this.showMsg("Loading data: " + name, "Please wait...");

            var preload = this.getPreloadFromLocalStorage(name, "known");
            if (preload)
            {
                this._bpsHelper.loadData(preload, (e) =>
                {
                    if (fromUI)
                    {
                       logAction(Gesture.select, null, ElementType.picklist, Action.load, Target.data,
                            true, "fileName", name, "source", "known");
                    }

                    if (callback)
                    {
                        callback();
                    }
                });
            }
            else
            {
                //vp.utils.debug("requesting known file=" + name);
                this._bpsHelper.loadKnownData(name, (e) =>
                {
                    if (fromUI)
                    {
                        logAction(Gesture.select, null, ElementType.picklist, Action.load, Target.data,
                            true, "fileName", name, "source", "known");
                    }

                    if (callback)
                    {
                        callback();
                    }

                });
            }
        }

        dataScrubberName(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._dataScrubberName;
            }

            this._dataScrubberName = value;
            this.onDataChanged("dataScrubberName");
        }

        loadedFileOpenText(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._loadedFileOpenText;
            }

            this._loadedFileOpenText = value;
            this.onDataChanged("loadedFileOpenText");
        }
    }
}