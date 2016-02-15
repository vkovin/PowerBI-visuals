//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    localStorageMgr - manages local storage (data cachine, data preloads, add-in templates)
//-------------------------------------------------------------------------------------
/// SandDance add-in ideas:
///    - custom color palettes
///    - replace std color palettes
///    - size palettes
///    - shape palettes (and images)
///    - custom images to use with static shape image
///    - custom facet layouts
///    - custom over/under lays (images) for plots (along with bounds information)
///    - custom theme (canvas color, shape color, shape image)
///    - custom CSS for app UI
///    - custom CSS for engine
///    - new "known" files (from WEB URL)
///    - custom 3D mesh shape to draw with (new drawing primitive)
///-----------------------------------------------------------------------------------------
///     Keys of items kept in localStorage (as of Feb-3-2016):
///
///         1. ai_sessionappSettings    (log token written by Azure Application Insights)
///         2. logTokens                (log tokens written by SandDance)
///         3. appSettings              (SandDance app options)
///         4. dataFile^...             (data file caching)
///         5. preload^...              (data scrubber templates)
///         6. sessionShare^...         (for sharing session info)
///         7. tour^                    (tour file caching)
///-----------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{ 
    export class LocalStorageMgr 
    {
        static makeKey(storageType: StorageType, subType: StorageSubType,
            fn: string, tableName: string) 
        {
            var key = StorageType[storageType];

            if (subType && subType != StorageSubType.none)
            {
                key += "^" + StorageSubType[subType];
            }

            if (fn)
            {
                key += "^" + fn;
            }

            if (tableName)
            {
                key += "^" + tableName;
            }
        
            return key;
        }

        static getLastPartOfKey(key: string)
        {
            var fn = key;
            var index = key.lastIndexOf("^");
            if (index > -1)
            {
                fn = fn.substr(index+1);
            }

            return fn;
        }

        static dumpKeyValue(name: string, key: string, value: string)
        {
            var preview = (value) ? value.substr(0, 20) : "";
            var length = (value) ? value.length : 0;

            //vp.utils.debug(name + ": key: " + key + ", length: " +
            //    length + ", startsWith: " + preview);
        }

        public static save(storageType: StorageType, subType: StorageSubType,
            fn: string, value: string, tableName?: string)
        {
            if (localStorage)
            {
                var key = this.makeKey(storageType, subType, fn, tableName);
                localStorage[key] = value;

                this.dumpKeyValue("save", key, value);
            }
        }

        public static get(storageType: StorageType, subType: StorageSubType,
            fn: string, tableName?: string)
        {
            if (localStorage)
            {
                var key = this.makeKey(storageType, subType, fn, tableName);
                var value = <string> localStorage[key];

                this.dumpKeyValue("get", key, value);
            }

            return value;
        }

        public static isPresent(storageType: StorageType, subType: StorageSubType,
            fn: string, tableName?: string)
        {
            if (localStorage)
            {
                var key = this.makeKey(storageType, subType, fn, tableName);
                var value = localStorage[key];
                var isPresent = (value !== undefined);

                this.dumpKeyValue("isPresent", key, value);
            }

            return isPresent;
        }

        public static enumerate(storageType: StorageType, subType: StorageSubType,
            onlyLastPart?: boolean)
        {
            if (localStorage)
            {
                var target = this.makeKey(storageType, subType, null, null);
                var foundItems = <string[]>[];

                for (var i = 0; i < localStorage.length; i++)
                {
                    var key = localStorage.key(i);

                    if (key.startsWith(target))
                    {
                        if (onlyLastPart)
                        {
                            key = this.getLastPartOfKey(key);
                        }

                        foundItems.push(key);
                    }
                }
            }            

            return foundItems;
        }

        public static hookChanges(callback)
        {
            //vp.utils.debug("hookChanges");

            vp.events.attach(window, "storage", (e) =>
            {
                callback(e);
            });
        }

        public static clearAll()
        {
            //---- delete localStorage for all of our settings ----
            if (localStorage)
            {
                //---- if we do this, let it trigger event to engine ----
                localStorage.clear();
            }
        }
    }

    export class CacheEntry
    {
        data: string;
        wdParams: bps.WorkingDataParams;
    }

    export enum StorageType
    {
        appSettings,
        logTokens,
        dataFile,
        preload,
        script,
        sessionShare,
        tour,
        //insight,
        //dataPref,
    }

    export enum StorageSubType
    {
        none,

        //---- sessionShare ----
        selectionChange,
        triggerEngineRead,
        lastSessionState,
        testResults,        // results from most recent run of automated test 

        //---- logTokens ----
        machineId,
        sessionId,
        sessionToken,

        //---- dataFile ----
        local,          
        web,            
        sql,            

        //---- dataPref ----
        //colorSettings,  
        //tooltips,
        //datatips,
        //searchTerms,
        //binSettings,
        //chartOptions,
    }
}     