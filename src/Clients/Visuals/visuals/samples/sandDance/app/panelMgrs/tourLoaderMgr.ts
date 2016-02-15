//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    tourLoaderMgr.ts - manages the Tour Loader panel.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class tourLoaderMgr extends JsonControlClass
    {
        private application: AppClass;

        _tourName = "FirstTour";

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, buttonId: string)
        {
            super();

            var rc = vp.select("#" + buttonId).getBounds(false);
            var x = rc.left;
            var y = rc.bottom;

            var jsonPanel = buildJsonPanel(this.application, settings, container, buttonId, this, "tourLoaderPanel", true, x, y);
            this._jsonPanel = jsonPanel;

            jsonPanel.registerForChange("close", (e) =>
            {
                this.onDataChanged("close");
            });

            //jsonPanel.togglePin(null);      // unpin the panel
            jsonPanel.isPinnedDown(false);
        }

        tourName(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._tourName;
            }

            this._tourName = value;
            this.onDataChanged("tourName");
        }

        onTourOpenClick()
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

            this.tourName(fn);
        }


        onStartTour()
        {
            var tour: TourData;

            var name = this._tourName;
            if (name.contains("."))     // local file - should be in cache
            {
                var strJson = beachParty.LocalStorageMgr.get(beachParty.StorageType.tour, beachParty.StorageSubType.local, name);
            }
            else
            { 
                var strJson = tourLoaderMgr.loadKnownTourFile(name);
            }

            /*appClass.instance*/this.application.startTourFromJson(name, strJson, 1);
            
        }

        static loadKnownTourFile(name: string)
        {
            var strTour = beachParty.FileAccess.readServerTextFile("tours/" + name + ".json");
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
}