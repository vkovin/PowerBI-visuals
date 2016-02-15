//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    insightMgr.ts - manages the insight instances & UI for the BeachParty app.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    import InsightData = bps.InsightData;
    var nextInsightId = 1;
    declare var tinymce: any;

    export class InsightMgrClass extends beachParty.DataChangerClass
    {
        static insightWidth = 140;//200;
        static insightHeight = 70;//130;
        static fileExt = ".insights";

        private application: AppClass;
        private container: HTMLElement;
        private settings: AppSettingsMgr;
        private saveSettingsHandler: (settings: any, type: sandDance.SettingsType) => void;
        private loadSettingsHandler: (type: sandDance.SettingsType) => any;

        _session: InsightSession;
        _isShowingInsightsPanel = false;
        _currentInsight: InsightData = null;
        _currentInsightReason = null;
        _currentPanel: JsonPanelClass = null;
        _editInsight: InsightData = null;                   // the insight being edited
        _contextMenu: PopupMenuClass = null;
        _rebuildTimer = null;
        _forceShow = false;
        //_currentInsightElem = null;
        _insightEntryElems = [];
        _editSessionName = null;
        _sessionName = "untitled";
        _pendingDropText = null;

        //---- auto playback ----
        _playbackIndex = -1;
        _playbackTimer = null;
        _isPlayingBack = false;
        _isPaused = false;
        _playbackDuration = 3;      // 3 seconds
        _isLooping = true;             // should playback restart once end is reached

        constructor(
            application: AppClass,
            settings: AppSettingsMgr,
            container: HTMLElement,
            saveSettingsHandler: (settings: any, type: sandDance.SettingsType) => void,
            loadSettingsHandler: (type: sandDance.SettingsType) => any)
        {
            super();

            this.application = application;
            this.settings = settings;
            this.container = container;
            this.saveSettingsHandler = saveSettingsHandler;
            this.loadSettingsHandler = loadSettingsHandler;

            this._session = new InsightSession();
        }

        closeMenus()
        {
            if (this._contextMenu)
            {
                this._contextMenu.close();
                this._contextMenu = null;
            }
        }

        createEnumPicker(enumType, callback)
        {
            var picker = null;

            if (enumType === bps.LoadAction)
            {
                picker = this.createLoadActionMenu(callback);
            }
            else
            {
                picker = /*appClass.instance*/this.application.createEnumPicker(null, enumType, callback);
            }

            return picker;
        }

        playbackDuration(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._playbackDuration;
            }

            this._playbackDuration = value;
            this.onDataChanged("playbackDuration");
        }

        isPlaybackLooping(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isLooping;
            }

            this._isLooping = value;
            this.onDataChanged("isPlaybackLooping");
        }

        getCurrentInsightReason()
        {
            return this._currentInsightReason;
        }

        currentInsight(value?: InsightData, reason?: string)
        {
            if (arguments.length === 0)
            {
                return this._currentInsight;
            }

            //---- this is quicker than rebuilding insight bar, and preserves insight elements for consistent event handling ("click"). ----
            if (this._currentInsight)
            {
                this.setInsightAsCurrent(this._currentInsight, false);
            }

            this._currentInsight = value;
            this._currentInsightReason = reason;

            if (this._currentInsight)
            {
                this.setInsightAsCurrent(this._currentInsight, true);
            }

            this.onDataChanged("currentInsight");
        }

        setInsightAsCurrent(insight: InsightData, value: boolean)
        {
            for (var i = 0; i < this._insightEntryElems.length; i++)
            {
                var elem = this._insightEntryElems[i];
                if (elem && elem.insightObj === insight)
                {
                    if (value)
                    {
                        vp.dom.addClass(elem, "currentEntry");
                    }
                    else
                    {
                        vp.dom.removeClass(elem, "currentEntry");
                    }
                }
            }
        }

        editSessionName(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._editSessionName;
            }

            this._editSessionName = value;
            this.onDataChanged("editSessionName");
        }

        editInsightName(value?: string)
        {
            if (arguments.length === 0)
            {
                return (this._editInsight) ? this._editInsight.name : "";
            }

            if (this._editInsight)
            {
                this._editInsight.name = value;
                this.onDataChanged("editInsightName");
            }
        }

        editInsightNotes(value?: string)
        {
            if (arguments.length == 0)
            {
                return (this._editInsight) ? this._editInsight.notes : "";
            }

            if (this._editInsight && this._editInsight.notes != value)
            {
                this._editInsight.notes = value;
                this.onDataChanged("editInsightNotes");
            }
        }

        loadAction(value?: string)
        {
            if (arguments.length === 0)
            {
                var action = (this._editInsight) ? bps.LoadAction[this._editInsight.loadAction] : "";
                action = action || "none";
                return action;
            }

            if (this._editInsight)
            {
                this._editInsight.loadAction = bps.LoadAction[value];
                this.onDataChanged("loadAction");
            }
        }

        notesSource(value?: string)
        {
            if (arguments.length === 0)
            {
                return (this._editInsight) ? bps.NotesSource[this._editInsight.notesSource] : "";
            }

            if (this._editInsight)
            {
                this._editInsight.notesSource = bps.NotesSource[value];
                this.onDataChanged("notesSource");
            }
        }

        //isNotesMarkDown(value?: boolean)
        //{
        //    if (arguments.length == 0)
        //    {
        //        return (this._editInsight) ? this._editInsight.isNotesMarkDown : null;
        //    }

        //    if (this._editInsight)
        //    {
        //        this._editInsight.isNotesMarkDown = value;
        //        this.onDataChanged("isNotesMarkDown");
        //    }
        //}

        addNewInsight(insight: InsightData)
        {
            //---- defaults ----
            var text = "Insight-" + nextInsightId++;
            insight.name = text;
            insight.notes = "";

            if (this._pendingDropText)
            {
                insight.notes = this._pendingDropText;
                this._pendingDropText = null;
            }

            //---- invoke "Insight Panel" here to supply text/notes ----
            //this.openAddInsightPanel(insight, (insight) => 
            //{
            //    this.addInsight(insight);
            //});

            //---- let user create these without interruption ----
            this.addInsight(insight);
        }

        showInsightButtonContextMenu(e)
        {
            //---- invoke the INSIGHTS CONTEXT MENU ----
            var menuItems = this.getInsightsMenuItems();

            var pm = new PopupMenuClass(this.application, this.container, null, "pmInsights", menuItems, (e, menu, textIndex, menuIndex) =>
            {
                var name = (<MenuItemData>menuItems[menuIndex]).text;

                if (name.startsWith("Add insight"))
                {
                    this.onDataChanged("onAddInsightRequest", undefined, e);
                }
                else if (name.startsWith("Toggle"))
                {
                    this.toggleInsightsPanel();
                }
                else if (name.startsWith("Play"))
                {
                    this.startPlayback();
                }
                else if (name.startsWith("Stop"))
                {
                    this.stopPlayback();
                }
                else if (name == "Delete all insights")
                {
                    this.deleteAllInsights();
                }
                else if (name.startsWith("Save insights"))
                {
                    this.saveInsights();
                }
                else if (name.startsWith("Email insights"))
                {
                    this.emailInsights();
                }
                else if (name.startsWith("Load insights"))
                {
                    this.loadInsights();
                }
                else if (name.startsWith("Load QuickTest"))
                {
                    this.loadQuickTest();
                }
                else if (name.startsWith("Take snapshot"))
                {
                    /*appClass.instance*/this.application.onSnapshotClick(e);
                }
                else if (name.startsWith("Export data"))
                {
                    /*appClass.instance*/this.application.onExportData(e);
                }

            }, true);

            var rc = vp.select(this.container, ".insightMenuButton").getBounds(false);

            vp.select(pm.getRootElem())
                // .css("background", "rgb(69, 69, 69)")  // match color on button bg
                .css("background", this.application.getSettingsManager().getPanelBackgroundColor())
                .css("border", "1px solid transparent") ;

            pm.showAt(rc.left + 8, rc.bottom);
            this._contextMenu = pm;

            return pm;
        }

        onInsightEntryClick(e)
        {
            var insight = <InsightData> e.target.insightObj;
            if (!insight)
            {
                insight = <InsightData> e.target.parentElement.insightObj;
            }

            this.loadInsight(insight, "load");
        }

        markRebuildNeeded(forceShow?: boolean)
        {
            if (!this._rebuildTimer)
            {
                if (forceShow)
                {
                    this._forceShow = true;
                }
                this._rebuildTimer = setTimeout((e) =>
                {
                    this._rebuildTimer = null;
                    this.rebuildInsightBar();
                }, 100);
            }
        }

        showInsightContextMenu(e)
        {
            var insight = <InsightData> e.target.insightObj;
            if (!insight)
            {
                insight = <InsightData> e.target.parentElement.insightObj;
            }

            //---- invoke the INSIGHTS CONTEXT MENU ----
            var menuItems = this.getInsightEntryMenuItems();

            var pm = new PopupMenuClass(this.application, this.container, null, "pmEntryInsights", menuItems, (e, menu, textIndex, menuIndex) =>
            {
                var name = (<MenuItemData>menuItems[menuIndex]).text;

                if (name === "Load")
                {
                    this.loadInsight(insight, "load");
                }
                else if (name === "Delete")
                {
                    this.deleteInsight(insight);
                }
                else if (name === "Recapture")
                {
                    this.captureInsightEx(insight);
                }
                else if (name === "Edit")
                {
                    this.openEditInsightPanel(e, insight);
                }

            }, true);

            var pt = vp.events.mousePosition(e);

            vp.select(pm.getRootElem())
                .css("background", this.application.getSettingsManager().getPanelBackgroundColor())
                // .css("background", "rgb(69, 69, 69)")  // match color on button bg
                .css("border", "1px solid transparent") ;

            //this.setContextMenu(pm);
            pm.showAt(pt.x, pt.y + 10);
            this._contextMenu = pm;

            //---- cancel event to prevent insight from being loaded ----
            vp.events.cancelEventBubble(e);
            vp.events.cancelEventDefault(e);

            return pm;
        }

        openEditInsightPanel(e, insight: InsightData)
        {
            var pt = vp.events.mousePosition(e);

            //---- make a copy of the specified insight for editing (in case we cancel, this makes it easy to reverse the changes) ----
            this._editInsight = vp.utils.copyMap(insight);

            this._currentPanel = buildJsonPanel(
                this.application,this.settings,
                this.container,
                null,
                this,
                "editInsight",
                true,
                pt.x,
                pt.y,
                undefined,
                undefined,
                undefined,
                false,
                false,
                false,
                false,
                true);

            //---- support CLOSE of dialog as a cancel, so none of the properties changed are retained ----
            this._currentPanel.registerForChange("onAccept", (e) =>
            {
                this.updateInsightFromEditProps(insight);
                this.markRebuildNeeded();
            });
        }

        captureInsightEx(insight: bps.InsightData)
        {
            var sessionIndex = this._session.insights.indexOf(insight);

            this.application.createInsight(bps.SnapshotType.chart, true, (captInsight: bps.InsightData) =>
            {
                //---- transfer user properties from "insight" ----
                captInsight.name = insight.name;
                captInsight.notes = insight.notes;
                captInsight.loadAction = insight.loadAction;
                captInsight.notesSource = insight.notesSource;
                //captInsight.isNotesMarkDown = insight.isNotesMarkDown;

                //---- replace "insight" with "captInsight" ----
                this._session.insights[sessionIndex] = captInsight;

                this.rebuildInsightBar();
            });
        }

        updateInsightFromEditProps(insight: bps.InsightData)
        {
            insight.name = this._editInsight.name;
            insight.notes = this._editInsight.notes;
            insight.loadAction = this._editInsight.loadAction;
            insight.notesSource = this._editInsight.notesSource;
            //insight.isNotesMarkDown = this._editInsight.isNotesMarkDown;
        }

        openAddInsightPanel(insight: InsightData, callback)
        {
            //var pt = vp.events.mousePosition(e);

            //---- center panel horizontally ----
            var left = undefined; //window.innerWidth / 2 - xxx / 2;
            var top = 200;

            this._editInsight = insight;

            this._currentPanel = buildJsonPanel(this.application, this.settings, this.container, null, this, "addInsight", true, left, top, undefined, undefined, undefined, false);

            this._currentPanel.registerForChange("onAccept", (e) =>
            {
                callback(this._editInsight);
            });

            this._currentPanel.getRootElem().focus();
        }

        closeEditInsight()
        {
            if (this._currentPanel)
            {
                this._currentPanel.close();
                this._currentPanel = null;
            }
        }

        deleteInsight(insight: InsightData)
        {
            this._session.insights.remove(insight);

            if (this._currentInsight === insight)
            {
                this.currentInsight(null, "deleted");
            }

            this.markRebuildNeeded();
        }

        loadInsight(insight, reason: string)
        {
            this.currentInsight(insight, reason);

            //---- change the outline ----
            this.markRebuildNeeded();

            this.onDataChanged("insightLoaded");
        }

        removeExt(fn: string)
        {
            var index = fn.indexOf(".");
            if (index > -1)
            {
                fn = fn.substr(0, index);
            }

            return fn;
        }

        loadInsights()
        {
            LocalFileHelper.loadFile(InsightMgrClass.fileExt, (arrayBuff, fn) => 
            {
                var zip = new JSZip();
                zip.load(arrayBuff, undefined);

                this.loadInsightsFromZipFile(zip, fn);
            });
        }

        //For Power BI.
        loadSessionLocalFile(forceUpdate: boolean = true)
        {
            setTimeout(() => {
                this.loadInsightsFromText(
                    this.loadSettingsHandler(sandDance.SettingsType.insightSession),
                    "Power BI",
                    forceUpdate);
            }, 10);

            // LocalFileHelper.loadFile(".bpSession", (text, fn) => 
            // {
            //     this.loadSessionFromText(text, fn);
            // });
        }

        loadSessionFromServer(sessionUrl: string, callback?: any)
        {
            //var fn = this.getSharedServerRoot() + sessionId;

            beachParty.readSessionFile(sessionUrl, (text) =>
            {
                var fn = AppUtils.getLastNodeOfUrl(sessionUrl);

                this.loadInsightsFromText(text, fn);

                if (callback)
                {
                    callback();
                }

            });
        }

        loadInsightsFromText(text: any, fn: string, forceUpdate: boolean = true)
        {
            try
            {
                var anyObj = /*JSON.parse(*/text/*)*/;
                if (vp.utils.isArray(anyObj))
                {
                    var session = new InsightSession();
                    session.version = .9;

                    session.insights = anyObj;

                    this._session = session;
                    this._sessionName = this.removeExt(fn);

                    this.markRebuildNeeded(forceUpdate);
                }
                else
                {
                    var session = <InsightSession > anyObj;

                    if (session && session.version && session.version === 1) {
                        this._session = session;
                        this._sessionName = this.removeExt(fn);

                        this.markRebuildNeeded(forceUpdate);
                    }
                }
            }
            catch (ex)
            {
                console.warn("Error parsing session file: " + ex);
            }
        }

//         loadInsightsFromText(text: string, fn: string)
//         {
//             try
//             {
//                 var anyObj = JSON.parse(text);
//                 if (vp.utils.isArray(anyObj))
//                 {
//                     var session = new InsightSession();
//                     session.version = .9;
// 
//                     session.insights = anyObj;
//                 }
//                 else
//                 {
//                     var session = <InsightSession > anyObj;
//                     if (session.version < .9)
//                     {
//                         throw "Error: invalid session file";
//                     }
// 
//                 }
// 
//                 this._session = session;
//                 this._sessionName = this.removeExt(fn);
// 
//                 this.markRebuildNeeded(true);
//             }
//             catch (ex)
//             {
//                 alert("Error parsing session file: " + ex);
//             }
//         }

        loadInsightsFromZipFile(zip: JSZip, fn: string)
        {
            try
            {
                var session = new InsightSession();
                session.version = .92;

                zip.filter((path: string, file) =>
                {
                    // relativePath == "readme.txt"
                    // file = {name:"dir/readme.txt",options:{...},asText:function}
                    vp.utils.debug("read zip: file=" + path);

                    if (path.endsWith(".json"))
                    {
                        var jsonStr = file.asText();
                        var insightObj = <bps.InsightData> JSON.parse(jsonStr);

                        var imgFilename = path.replace("views", "images");
                        imgFilename = imgFilename.replace(".json", ".png");

                        var imgFile = zip.file(imgFilename);
                        if (imgFile)
                        {
                            var byteArray = imgFile.asUint8Array();
                            if (byteArray)
                            {
                                //---- CAUTION: the timing here is a bit sketchy; may cause problems ----
                                var blobObject = new Blob([byteArray], { type: "image/png" });

                                var reader = new FileReader();
                                reader.onload = function (event)
                                {
                                    var str = (<any>event.target).result;
                                    insightObj.imageAsUrl = str;
                                };
                                reader.readAsDataURL(blobObject);
                            }
                        }

                        session.insights.push(insightObj);
                    }

                    return false;
                });

                this._session = session;
                this._sessionName = this.removeExt(fn);

                this.markRebuildNeeded(true);
            }
            catch (ex)
            {
                alert("Error parsing insights file: " + fn);
            }
        }

        loadQuickTest()
        {
//             var fn = "quickTest.insights";
//             var arrayBuff = beachParty.fileAccess.readServerFileIntoArrayBuff("tests/" + fn);
//             var zip = new JSZip();
//             zip.load(arrayBuff, undefined);
// 
//             this.loadInsightsFromZipFile(zip, fn);
        }

        saveInsightsAsJSON()
        {
            // var str = JSON.stringify(this._session);

            setTimeout(() => {
                this.saveSettingsHandler(this._session, sandDance.SettingsType.insightSession);
            }, 10);

            // this.openSessionNamePanel(this._sessionName, (sessionName) =>
            // {
            //     this._sessionName = sessionName;
            //     LocalFileHelper.saveToLocalFile(sessionName + this.fileExt, str);
            // });
        }

         saveInsights()
        {
            var zip = new JSZip();

            for (var i = 0; i < this._session.insights.length; i++)
            {
                var insight = this._session.insights[i];
                var name = insight.name;
                var imgUrl = insight.imageAsUrl;

                //---- for now, use a simple, unique name ----
                name = "i" + (1+i);

                //---- remove image for this step ----
                insight.imageAsUrl = null;
                var jsonInsight = JSON.stringify(insight);
                insight.imageAsUrl = imgUrl;

                imgUrl = imgUrl.substr(imgUrl.indexOf(',') + 1);

                zip.file("views/" + name + ".json", jsonInsight);
                zip.file("images/" + name + ".png", imgUrl, { base64: true });
            }

            this.openSessionNamePanel(this._sessionName, (sessionName) =>
            {
                this._sessionName = sessionName;
                var blob = zip.generate({ type: "blob" });

                LocalFileHelper.saveBlobToLocalFile(sessionName + InsightMgrClass.fileExt, blob);

                //window.navigator.msSaveBlob(blob, "hello.zip");
            });


        }

        //getSharedServerRoot()
        //{
        //    return "c:\\BeachParty\\Sessions\\Shared\\Root\\";
        //}

        emailInsights()
        {
            var contents = JSON.stringify(this._session);

            //---- save "str" to server and get back its URL ----
            //var fnBase = "@sr@" + Date.now();
            //var fn = this.getSharedServerRoot() + fnBase;
            var userName = "";
            var fn = "";

            beachParty.writeSessionFile(userName, fn, contents, (sessionUrl: string) =>
            {
                var sessionId = sessionUrl;
                var appPath = beachParty.appPath();

                var url = "mailto:?" +
                    "subject=my insights" +
                    "&body=Here's a link to my BeachParty insights: %0D%0A" + "%0D%0A" + "%09" +  
                    appPath + "/BeachPartyApp.html?session=" + sessionId + "%0D%0A" + "%0D%0A";

                vp.select(this.container, ".helperAnchor").attr("href", url);
                vp.select(this.container, ".helperAnchor")[0].click();
            });
        }

        openSessionNamePanel(name: string, callback)
        {
            this.editSessionName(name);

            this._currentPanel = buildJsonPanel(this.application, this.settings, this.container, null, this, "editSessionName", true);

            this._currentPanel.registerForChange("onAccept", (e) =>
            {
                callback(this._editSessionName);
            });
        }

        processDroppedText(text: string)
        {
            if (!this._currentInsight)
            {
                this._pendingDropText = text;
                this.onDataChanged("onAddInsightRequest", undefined, null);
            }
            else
            {
                this._currentInsight.notes = this._currentInsight.notes + "\r\n" + text;
            }
        }

        deleteAllInsights()
        {
            this._session.insights = [];
            this._sessionName = "untitled";

            vp.select(this.container, ".insightList")
                .clear();

            //this.showInsightBar(false);
            this.currentInsight(null, "new session");
        }

        startPlayback()
        {
            //---- do we have any insights to play? ----
            if (this._session.insights.length === 0)
            {
                //---- special case - just treat current view as the insight we are looping on ----
                this._isPlayingBack = true;
                this._playbackIndex = -1;
            }
            else
            {
                this.loadTimedInsight(0);
            }

            this.onDataChanged("playing");
        }

        isPlaying()
        {
            return this._isPlayingBack;
        }

        isPaused()
        {
            return (this._isPlayingBack && this._isPaused);
        }

        pausePlayback()
        {
            this._isPaused = true;

            if (this._playbackTimer)
            {
                clearTimeout(this._playbackTimer);
                this._playbackTimer = null;
            }

            this.onDataChanged("playing");
        }

        resumePlayback()
        {
            this._isPaused = false;

            if (this._playbackIndex > -1)
            {
                this.loadTimedInsight(this._playbackIndex);
            }

            this.onDataChanged("playing");
        }

        stopPlayback()
        {
            this._isPlayingBack = false;
            this._isPaused = false;

            if (this._playbackTimer)
            {
                clearTimeout(this._playbackTimer);
                this._playbackTimer = null;
            }

            this.onDataChanged("playing");
        }

        loadTimedInsight(index: number)
        {
            var atEnd = (index >= this._session.insights.length);
            if (atEnd && this._isLooping)
            {
                index = 0;
            }

            if (index < this._session.insights.length)
            {
                this._isPlayingBack = true;
                this._playbackIndex = index;

                var insight = this._session.insights[index];
                if (insight)
                {
                    this.loadInsight(insight, "play load");
                }
            }
            else
            {
                this._isPlayingBack = false;
                this.onDataChanged("playing");
            }
        }

        onInsightLoadCompleted()
        {
            if (this._isPlayingBack)
            {
                this._playbackTimer = setTimeout((e) =>
                {
                    this.loadTimedInsight(this._playbackIndex + 1);
                }, this._playbackDuration*1000);
            }
        }

        toggleInsightsPanel()
        {
            this._isShowingInsightsPanel = (!this._isShowingInsightsPanel);

            this.showInsightBar(this._isShowingInsightsPanel);

            AppUtils.setButtonSelectedState(this.container, "insight", this._isShowingInsightsPanel, "fnIconBarToggleInsightNorm", "fnIconBarToggleInsightSelect");
        }

        isPanelOpen()
        {
            return this._isShowingInsightsPanel;
        }

        showInsightBar(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isShowingInsightsPanel;
            }

            vp.select(this.container, ".insightPanel").css("display", (value) ? "block" : "none");

            //this.layoutScreen();
            this.onDataChanged("layout");

            if (!value)
            {
                this.currentInsight(null, "hide bar");
            }

            this._isShowingInsightsPanel = value;
            this.onDataChanged("showInsightBar");
        }

        getInsightsMenuItems()
        {
            var items =
                [
                    new MenuItemData("Take snapshot", "Saves a snapshot of the current view as a file on your local machine"),
                    // new MenuItemData("Export data...", "Saves the data for the current view as a file on your local machine"),
                    new MenuItemData("-"),
                    // new MenuItemData("Email insights...", "Sends a URL for the current set of insights to an email recepient"),
                    new MenuItemData("Save insights...", "Saves the current set of insights to a file on your local machine"),
                    // new MenuItemData("-"),
                    // new MenuItemData("Load insights...", "Loads a set of insights from a file on your local machine"),
                    // new MenuItemData("Load QuickTest", "Loads the insights used in the BeachParty team QuickTest"),
                    new MenuItemData("-"),
                    new MenuItemData("Delete all insights", "Deletes all of the currently defined insights"),

                    //new MenuItemData("Export insights...", "Download insights as a JSON file"),
                    //new MenuItemData("Add insight...", "Add a new insight to this session"),
                    //new MenuItemData("-"),
                    //new MenuItemData("Playback insights", "Automaticlly load each insight, with a delay between each"),
                    //new MenuItemData("Stop playback", "Stop playback of insights"),
                    //new MenuItemData("-"),
                    //new MenuItemData("Toggle insights bar", "Toggle the insights bar open/closed"),
                ];

            return items;
        }

        getInsightEntryMenuItems()
        {
            var items =
                [
                    new MenuItemData("Load", "Make this insight the current view"),
                    new MenuItemData("-"),
                    new MenuItemData("Edit", "Edit the name and notes for this insight"),
                    new MenuItemData("Recapture", "Recapture this insight from current view"),
                    new MenuItemData("-"),
                    new MenuItemData("Delete", "Delete this insight"),
                ];

            return items;
        }

        addInsight(insight: InsightData)
        {
            this._session.insights.push(insight);
            this.currentInsight(insight, "new insight");

            var forceShow = (this._session.insights.length === 1);        // first entry
            this.markRebuildNeeded(forceShow);
        }

        getInsightTooltip(insight: bps.InsightData)
        {
            var insightType = bps.LoadAction[insight.loadAction];
            if (insightType === "all" || insightType === undefined || insightType === null)
            {
                insightType = "full insight";
            }

            var tip = insight.name + " (" + insightType + ")\n" + insight.notes;
            return tip;
        }

        addInsightToBar(insight: InsightData)
        {
            var insightBarW = vp.select(this.container, ".insightList");
            var tip = this.getInsightTooltip(insight);

            //---- add DIV to hold this insight ---
            var insightW = insightBarW.append("div")
                .addClass("insightEntry")
                .css("display", "block")
                .css("position", "relative")
                .title(tip)
                .width(InsightMgrClass.insightWidth)
                .height(InsightMgrClass.insightHeight + 30)
                .attach("click", (e) =>
                {
                    this.onInsightEntryClick(e);
                });

            //---- add top row of insight (icon + title + context menu button) ----
            var iconW = this.buildInsightTitleBar(insightW, insight);

            if (insight === this._currentInsight)
            {
                insightW.addClass("currentEntry");
            }

            var imageAsUrl = insight.imageAsUrl;
            if (!imageAsUrl)
            {
                //---- check for older version ----
                var anyPreload = <any>insight.preload;
                imageAsUrl = anyPreload.imageAsUrl;
            }

            if (imageAsUrl)
            {
                //---- add IMAGE ----
                insightW.append("img")
                    .addClass("insightImage")
                    //.css("position", "absolute")
                    //.css("left", "0px")
                    //.css("top", "0px")
                    // .css("margin-top", "-10px")
                    .attr("src", imageAsUrl)
                    .css("background", this.settings._canvasColor)
                    .width(InsightMgrClass.insightWidth)
                    .height(InsightMgrClass.insightHeight)
                    .attach("dragstart", function (e)
                    {
                        //---- prevent drag of icon ----
                        e.preventDefault();
                    });

            }

            insightW[0].insightObj = insight;
            iconW[0].entryElem = insightW[0];

            this._insightEntryElems.push(insightW[0]);
        }

        buildInsightTitleBar(parentW: vp.dom.IWrapperOuter, insight: bps.InsightData)
        {
            var tableW = parentW.append("div").append("table")
                .addClass("insightTitleBar")
                .css("width", "100%")
                .css("margin-top", "-10px")

            var rowW = tableW.append("tr")

            var iconUrl = this.getIconUrl(insight.loadAction);

            //---- insight ICON ----
             var tdW = rowW.append("td")

             var iconW = tdW.append("div")//img
                .id("insightTypeMenuButton")
                .addClass("clickIcon")
                // .attr("src", iconUrl)
                .addClass(iconUrl)
                .css("width", "28px")
                .css("left", "-2px")
                .attach("click", (e) =>
                {
                    this.onIconClick(e);
                });

            //---- insight NAME ----
            var textW = rowW.append("td")
                .addClass("insightText")
                .text(insight.name)
                .attach("click", (e) =>
                {
                    this.onInsightEntryClick(e);
                });

            iconW[0].insightObj = insight;
            textW[0].insightObj = insight;

            //---- context menu ICON ----
            var tdW = rowW.append("td")
                .css("text-align", "right")

            var icon2W = tdW.append("div")//img
                .id("insightContextMenuButton")
                .addClass("clickIcon")
                .addClass("fnInsightMenu")
                // .attr("src", fnInsightMenu)
                .css("width", "20px")
                .title("open context menu for this insight")
                .attach("click", (e) =>
                {
                    this.showInsightContextMenu(e);
                });

            icon2W[0].insightObj = insight;

            return iconW;
        }

        onIconClick(e)
        {
            var iconElem = e.target;

            var rc = vp.select(iconElem).getBounds(false),
                container = vp.select(this.container).getBounds(false);

            var insight = <bps.InsightData>iconElem.insightObj;

            //---- show insight type menu ----
            var picker = this.createLoadActionMenu((mid: MenuItemData) =>
            {
                //---- set loadAction for insight, based on selected item ----
                var action = mid.text.toLowerCase();
                insight.loadAction = bps.LoadAction[action];

                //---- update icon of insight in insight panel ----
                var iconUrl = this.getIconUrl(insight.loadAction);
                vp.select(iconElem)
                    .removeClass("fnInsightData")
                    .removeClass("fnInsightFull")
                    .removeClass("fnInsightSelection")
                    .removeClass("fnInsightView")
                    .removeClass("fnInsightFilter")
                    .addClass(iconUrl);

                //---- update tooltip on entryElem ----
                var entryElem = iconElem.entryElem;
                var tip = this.getInsightTooltip(insight);
                vp.select(entryElem).title(tip);
            });

            picker.openWithoutOverlap(rc.left - container.left + 15, rc.top - container.top + 15);

            //---- cancel event to prevent LOAD of this icon ----
            vp.events.cancelEventBubble(e);
            vp.events.cancelEventDefault(e);
        }

        createLoadActionMenu(callback)
        {
            var menuItems = <MenuItemData[]>[];

            menuItems.push(new MenuItemData("All", "Change this into a full (data + view) loading insight", "fnInsightFull"));
            menuItems.push(new MenuItemData("Data", "Change this into a data loading insight", "fnInsightData"));    
            menuItems.push(new MenuItemData("View", "Change this into a view loading insight", "fnInsightView"));   
            menuItems.push(new MenuItemData("Selection", "Change this into a selection loading insight", "fnInsightSelection"));  
            menuItems.push(new MenuItemData("Filter", "Change this into a filter loading insight", "fnInsightFilter"));       

            var picker = this.application.createGeneralPicker(null, "loadActionPicker", menuItems, callback, undefined/*, 28*/);
            return picker;
        }

        getIconUrl(loadAction: bps.LoadAction)
        {
            var url;

            if (loadAction === bps.LoadAction.all || loadAction === undefined || loadAction === null)
            {
                url = "fnInsightFull";
            }
            else if (loadAction === bps.LoadAction.data)
            {
                url = "fnInsightData";
            }
            else if (loadAction === bps.LoadAction.view)
            {
                url = "fnInsightView";
            }
            else if (loadAction === bps.LoadAction.selection)
            {
                url = "fnInsightSelection";
            }
            else if (loadAction === bps.LoadAction.filter)
            {
                url = "fnInsightFilter";
            }

            return url;
        }

        rebuildInsightBar()
        {
            var forceShow = this._forceShow;
            this._forceShow = false;
            this._insightEntryElems = [];

            vp.select(this.container, ".insightList")
                .clear();

            for (var i = 0; i < this._session.insights.length; i++)
            {
                var insight = this._session.insights[i];
                this.addInsightToBar(insight);
            }

            //---- open the bar, if requested ----
            if (forceShow)
            {
                vp.select(this.container, ".insightPanel")
                    .css("display", "block");             // show it;

                this._isShowingInsightsPanel = true;
            }

            //---- always layout screen, in case the horizontal scrollbar just appeared/disappeared ----
            //this.layoutScreen();
            this.onDataChanged("layout");
        }

    }

    export class InsightSession
    {
        version: number;
        insights: InsightData[];

        constructor()
        {
            this.version = 1.0;
            this.insights = [];
        }
    }
}

//function myCustomSetupContent(editor_id, body, doc)
//{
//    vp.select(body).css('background', 'green');
//}