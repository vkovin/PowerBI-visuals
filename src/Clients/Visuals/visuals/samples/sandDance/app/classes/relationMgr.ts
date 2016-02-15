//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    relationMgr.ts - manages multiple files (tables) and the relations between them.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class RelationMgrClass extends beachParty.DataChangerClass
    {
        _preload: bps.Preload;
        _fileObjs: File[];
        _tableInfos = <TableInfo[]> [];      
        _relationMap = {};

        constructor()
        {
            super();
        }

        getFileObjs()
        {
            return this._fileObjs;
        }

        setFileObjs(value: File[], preload: bps.Preload)
        {
            this._preload = preload;
            this._fileObjs = (value) ? value : [];

            this.buildRelations();
        }

        buildRelations()
        {
            var relMap = {};
            this._relationMap = relMap;

            this.buildTableInfos(0);

            //---- TODO: build relMap when all of the async buildColInfos() calls complete ----
        }

        buildTableInfos(index: number)
        {
            var tableInfos = <TableInfo[]>[];

            for (var i = 0; i < this._fileObjs.length; i++)
            {
                var fileObj = this._fileObjs[i];
                var tableInfo = new TableInfo();

                tableInfo.name = fileObj.name;
                tableInfo.fileObj = fileObj;
                this.buildColInfos(tableInfo, fileObj);

                tableInfos.push(tableInfo);
            }

            this._tableInfos = tableInfos;
        }

        buildColInfos(tableInfo: TableInfo, fileObj: File)
        {
            LocalFileHelper.loadFileFromFileObj(fileObj, (data, fn, preload) =>
            {
                if (!preload)
                {
                    preload = this._preload;
                }

                if (vp.utils.isString(data))
                {
                    if (preload)
                    {
                        var hasHeader = preload.hasHeader;
                        var separator = preload.separator;
                    }

                    var csv = new beachParty.CsvColLoaderClass(data, hasHeader, separator, true, false);
                    var df = csv.buildDataFrameWithEmptyVectors();
                }
                else
                {
                    var df = new beachParty.DataFrameClass(data);
                }

                var colInfos = [];
                var names = df.getNames();

                for (var i = 0; i < names.length; i++)
                {
                    var colType = df.getColType(name);
                    var colInfo = new bps.ColInfo(name, null, colType, null);
                    colInfos.push(colInfo);
                }

                tableInfo.colInfos = colInfos;
            });
        }

        getFileObj(name: string)
        {
            var fileObj = null;

            if (this._fileObjs)
            {
                for (var i = 0; i < this._fileObjs.length; i++)
                {
                    var obj = this._fileObjs[i];
                    if (obj.name == name)
                    {
                        fileObj = obj;
                        break;
                    }
                }
            }

            return fileObj;
        }

        getFileText(name: string, callback)
        {
            var fileObj = this.getFileObj(name);
            if (!fileObj)
            {
                throw "Fileset doesn't contain named file=" + name;
            }

            LocalFileHelper.loadFileFromFileObj(fileObj, callback);
        }

        getFileCount()
        {
            return (this._fileObjs) ? this._fileObjs.length : 0;
        }

        getFileNames()
        {
            var list = [];

            if (this._fileObjs)
            {
                list = this._fileObjs.map((fileObj) =>
                {
                    return fileObj.name;
                });
            }

            return list;
        }
    }

    export enum RelType
    {
        oneToOne,
        oneToMany,
        manyToOne,
    }

    export class Relation
    {
        sourceName: string;
        destName: string;
        sourceColumn: string;
        destColumn: string;
        relType: RelType;
    }

    export class TableInfo
    {
        name: string;
        fileObj: File;
        colInfos: bps.ColInfo[];
    }
}
 