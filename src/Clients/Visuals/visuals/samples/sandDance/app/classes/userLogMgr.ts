//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    userLogMgr.ts - manages the logging of user commands.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class UserLogMgrClass extends beachParty.DataChangerClass
    {
        private settings: AppSettingsMgr;

        _sd: ScriptData
        _cmds: ScriptCmd[];

        constructor(settings: AppSettingsMgr)
        {
            super();

            this.settings = settings;

            /*appSettingsMgr.instance*/this.settings.registerForChange("isUserLoggingEnabled", (e) =>
            {
                var value = /*appSettingsMgr.instance*/this.settings.isUserLoggingEnabled();
                if (value)
                {
                    this.startNewSession();
                }
                else
                {
                    this.endSession();
                }
            });

            this.startNewSession();
        }

        startNewSession()
        {
            var sd = new ScriptData();
            this._sd = sd;

            var now = new Date();
            var strNow = vp.formatters.formatDateTime(now, "mmm-dd-yyyy_hh:mm:ss");

            sd.name = "Session_" + strNow + ".json";
            sd.writtenBy = "(recorded by SandDance)";
            sd.repeatCount = 1;
            sd.plotResults = false;
            sd.description = "Recording of commands run in session that started at: " + strNow;
            sd.cmdDelay = 1000;
            sd.stopOnError = true;

            sd.cmds = [];
            this._cmds = sd.cmds;
        }

        endSession()
        {
            this.save();

            this._sd = null;
            this._cmds = null;
        }

        log(cmd: ScriptCmd)
        {
            if (/*appSettingsMgr.instance*/this.settings.isUserLoggingEnabled())
            {
                this._cmds.push(cmd);

                vp.utils.debug("userLogMgr.log: cmd=" + JSON.stringify(cmd));
            }
        }

        save()
        {
            var str = JSON.stringify(this._sd);
            beachParty.LocalStorageMgr.save(beachParty.StorageType.script, beachParty.StorageSubType.local,
                this._sd.name, str);
        }
    }
}