//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    scriptsPanelMgr.ts - manages the Scripts panel.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class ScriptsPanelMgr extends JsonControlClass
    {
        private application: AppClass;
        private settings: AppSettingsMgr;

        _scriptName = "DemoVoteTest";

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, buttonId: string)
        {
            super();

            this.application = application;
            this.settings = settings;

            var rc = vp.select(container, "." + buttonId).getBounds(false);
            var x = rc.left;
            var y = rc.bottom;

            var jsonPanel = buildJsonPanel(application, settings, container, buttonId, this, "scriptsPanel", true, x, y);
            this._jsonPanel = jsonPanel;

            jsonPanel.registerForChange("close", (e) =>
            {
                this.onDataChanged("close");
            });

            //jsonPanel.togglePin(null);      // unpin the panel
            jsonPanel.isPinnedDown(false);
        }

        scriptName(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._scriptName;
            }

            this._scriptName = value;
            this.onDataChanged("scriptName");
        }

        isUserLoggingEnabled(value?: boolean)
        {
            //---- let appSettingsMgr handle the property get/set ----
            var retValue = /*appSettingsMgr.instance*/this.settings.isUserLoggingEnabled.apply(/*appSettingsMgr.instance*/this.settings, arguments);

            if (value !== undefined)
            {
                if (!value)
                {
                    //---- schedule a refresh of our script list ----
                    setTimeout((e) => this.rebuildScriptList(), 100);
                }
            }

            return retValue;
        }

        public static getScriptItems()
        {
            //---- start with standard tours ----
            var scripts = ["DemoVoteTest", "TitanicTest"];

            var cachedScripts = beachParty.LocalStorageMgr.enumerate(beachParty.StorageType.script,
                beachParty.StorageSubType.local, true);

            scripts = scripts.concat(cachedScripts);

            return scripts;
        }

        rebuildScriptList()
        {
            var items = ScriptsPanelMgr.getScriptItems();
            //this._jsonPanel.
        }

        onFileOpenClick()
        {
            var fileExts = ".json";

            LocalFileHelper.loadFile(fileExts, (text, fn, preload) =>
            {
                this.onFileLoad(text, fn);
            });
        }

        onFileLoad(text: string, fn: string)
        {
            var tour = JSON.parse(text);

            //---- cache it for later use-of-picking ----
            beachParty.LocalStorageMgr.save(beachParty.StorageType.tour,
                beachParty.StorageSubType.local, fn, text);

            this.scriptName(fn);
        }

        onStartScript()
        {
            //---- if this a standard script (automated test)? ----
            var scriptData: ScriptData;

            var name = this._scriptName;
            if (name.contains("."))     // local file - should be in cache
            {
                var strJson = beachParty.LocalStorageMgr.get(beachParty.StorageType.script,
                    beachParty.StorageSubType.local, name);
            }
            else
            {
                var strJson = this.loadKnownScriptFile(name);
            }

            scriptData = JSON.parse(strJson);

            /*appClass.instance*/this.application.startAutomatedTest(scriptData);
        }

        onStopScript()
        {
            /*appClass.instance*/this.application.stopAutomatedTest();
        }

        onPlotResults()
        {
            /*appClass.instance*/this.application.plotTestResults();
        }

        loadKnownScriptFile(name: string)
        {
            var strTour = beachParty.FileAccess.readServerTextFile("tests/" + name + ".json");
            return strTour;
        }

        close()
        {
            this._jsonPanel.close();
        }

        showAt(x: number, y: number)
        {
            this._jsonPanel.showAt(x, y);
        }
    }

    export class LoadDataCmd
    {
        name: string;
        source: string;     // known, local, web

        constructor(name: string, source = "known")
        {
            this.name = name;
            this.source = source;
        }
    }

    export class ScriptCmd
    {
        action: string;
        target: string;

        //---- params ----
        name: string;
        value: string;
        colName: string;
        source: string;

        constructor(action: Action, target: Target)
        {
            this.action = Action[action];
            this.target = Target[target];
        }
    }

    export class ScriptData
    {
        name: string;
        writtenBy: string;
        writtenDate: string;
        description: string;

        repeatCount: number;
        plotResults: boolean;
        cmdDelay: number;
        stopOnError: boolean;

        cmds: ScriptCmd[];

        constructor()
        {
            this.cmds = [];

        }
    }
}