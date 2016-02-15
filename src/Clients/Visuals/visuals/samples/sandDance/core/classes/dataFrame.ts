///-----------------------------------------------------------------------------------------------------------------
/// dataFrame.ts.  Copyright (c) 2015 Microsoft Corporation.
///     - a class to represent a dataset as a set of named vectors.  This is a lightweight version of the NDV data format.
///-----------------------------------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    /// Note: dataFrame does NOT change the original data, but it cache numeric vectors on-demand for each column. 
    export class DataFrameClass extends DataChangerClass
    {
        ctr = "dataFrameClass";

        _groupName: string;              // (partyGen) optional name for this dataFrame / group
        _groupColName: string;           // (partyGen)) optional, tells what group column this dataset belongs to

        private _names: string[];               // used to store order of names from original data source
        private _colTypes: string[];            // "string", "date", or "number"
        public _vectorsByName: { [name: string]: any[]};
        private _wdParams: bps.WorkingDataParams;
        private _sortKey: string = "none";        // colName + "up" or "down"
        private _pkToVectorIndex = {};
        private _loader: DataLoaderClass;
        private _recordCount = 0;
        private _currentSortKeys: any[];

        //---- a cache of vectors that have been converted to all numeric values ----
        private _numericVectorsCache: { [name: string]: NumericVector };

        constructor(vectorsByName: { [name: string]: any[] }, names?: string[], colTypes?: string[], recordCount?: number)
        {
            super();

            this._vectorsByName = vectorsByName;
            this._colTypes = colTypes;

            this._numericVectorsCache = {};

            if (!names)
            {
                names = vp.utils.keys(vectorsByName);
            }

            //---- ensure all colTypes are set ----
            if (!colTypes)
            {
                colTypes = [];
            }

            for (var i = 0; i < names.length; i++)
            {
                var colType = (i < colTypes.length) ? colTypes[i] : null;

                if (!colType)
                {
                    var name = names[i];
                    var vector = vectorsByName[name];

                    if (vector)
                    {
                        var colType = vp.data.getDataType(vector);
                        colTypes[i] = colType;
                    }
                }
            }

            var firstName = names[0];
            var firstVector = vectorsByName[firstName];
            if (firstVector)
            {
                recordCount = firstVector.length;
            }

            this._names = names;
            this._colTypes = colTypes;
            this._recordCount = recordCount;
        }

        getColTypes()
        {
            return this._colTypes;
        }

        /** ensure the specified columns are loaded and the other columns are closed (to minimize memory use). */
        loadColumns(colList: string[])
        {
            if (this._loader)
            {
                //---- close unneeded columns ----
                for (var i = 0; i < this._names.length; i++)
                {
                    var name = this._names[i];
                    if (systemColNames.indexOf(name) == -1)
                    {
                        if (colList.indexOf(name) == -1)
                        {
                            this._vectorsByName[name] = null;
                            this._numericVectorsCache[name] = null;
                        }
                    }
                }

                //---- gather list of columns that we need to load ----
                var loadList = [];

                for (var i = 0; i < colList.length; i++)
                {
                    var name = colList[i];
                    if (this._vectorsByName[name] == null)
                    {
                        loadList.push(name);
                    }
                }

                if (loadList.length)
                {
                    this._loader.loadColumns(this._vectorsByName, loadList);
                }
            }
        }

        rebuildPrimaryKeyIndex()
        {
            var pkMap = {};

            var pkVector = this.getVector(primaryKeyName, false);

            for (var i = 0; i < pkVector.length; i++)
            {
                var pk = pkVector[i];
                pkMap[pk] = i;
            }

            this._pkToVectorIndex = pkMap;
        }

        getNames()
        {
            return this._names;
        }

        getPkToVectorIndex()
        {
            return this._pkToVectorIndex;
        }

        getVectorIndexByKey(key: string)
        {
            var index = this._pkToVectorIndex[key];
            return index;
        }

        vectorToPrimaryKeys(vector: number[])
        {
            var keys = [];
            var pkVector = this.getVector(primaryKeyName, false);

            for (var i = 0; i < vector.length; i++)
            {
                if (vector[i])
                {
                    var key = pkVector[i];
                    keys.push(key);
                }
            }

            return keys;
        }

        getValueMap(colName: string, maxRows?: number)
        {
            var vm = <bps.ValueMapEntry[]> null;

            var pf = this.getFieldData(colName);
            if (pf && pf.valueMap)
            {
                vm = pf.valueMap;
            }
            else
            {
                //---- must build one from values in column ----
                var vector = this.getVector(colName, false);
                var groups = vector.groupBy();
                vm = [];

                for (var i = 0; i < groups.length; i++)
                {
                    var group = groups[i];
                    var vme = new bps.ValueMapEntry();

                    vme.originalValue = group.key;
                    vme.valueCount = group.values.length;

                    vm.push(vme);
                }
            }

            //---- valueMap: sort in descending order ----
            vm = vm.orderByNum((e) => {return e.valueCount });
            vm.reverse();

            if (maxRows != undefined)
            {
                vm = vm.slice(0, maxRows);
            }

            return vm;
        }

        isColumnName(colName: string)
        {
            var isCol = (this._names.indexOf(colName) > -1);
            return isCol;
        }

        append(df: DataFrameClass)
        {
            for (var i = 0; i < df._names.length; i++)
            {
                var colName = df._names[i];

                //---- append column colName to this dataFrame ----
                var vector = this.getVector(colName, true);
                if (!vector)
                {
                    vector = [];
                    this._names.push(colName);
                    this._colTypes.push(df.getColType(colName));
                    this._vectorsByName[colName] = vector;
                }

                var fromVector = df.getVector(colName, false);

                for (var v = 0; v < fromVector.length; v++)
                {
                    var value = fromVector[v];
                    vector.push(value);
                }                
            }
        }

        private isValidFieldName(str: string)
        {
            var isValid = (str.length > 0);

            for (var i = 0; i < str.length; i++)
            {
                var ch = str[i];
                if (ch === "_" || (ch >= "0" && ch <= "9") || (ch.toLocaleLowerCase() !== ch.toLocaleUpperCase()))
                {
                    //---- valid name char ----
                }
                else
                {
                    isValid = false;
                    break;
                }
            }

            return isValid;
        }

        /** replaces column names with "record." in front of them.  Also correct the case-ing of the column names. */
        addRecordKeywordToColumnNames(exp: string)
        {
            var newExp = "";
            var lastToken = null;
            var TokenType = vp.utils.TokenType;

            //---- build lowerColNames ----
            var lowerColNames: string[] = [];

            for (var i = 0; i < this._names.length; i++)
            {
                var name = this._names[i].toLowerCase();
                lowerColNames.push(name);
            }

            //---- get column names ----
            var scanner = new vp.utils.scanner(exp);

            scanner.scan();     // get the first token
            var tokenType = scanner.tokenType();
            var token = scanner.token();

            while (tokenType !== TokenType.eof)
            {
                /// TODO: how can we support odd column name chars like "#"?

                if (tokenType === TokenType.id)
                {
                    if (lastToken !== ".")
                    {
                        var lowtok = token.toLowerCase();
                        var index = lowerColNames.indexOf(lowtok);

                        if (index > -1)
                        {
                            //---- add column name ----
                            token = "record." + this._names[index];
                        }
                        else
                        {
                            if (lowtok === "math")
                            {
                                token = "Math";     // correct case if needed
                            }
                            else if (lowtok === "_primaryKey")
                            {
                                token = "_primaryKey";
                            }
                        }
                    }

                }
                else if (token === "=")
                {
                    //---- common mistake - fix for user ----
                    token = "==";
                }

                newExp += token;
                lastToken = token;

                scanner.scan();     
                tokenType = scanner.tokenType();
                token = scanner.token();
            }

            return newExp;
        }

        isColLoaded(colName: string)
        {
            return (this._vectorsByName[colName] != null);
        }

        /** uses "exp" as a JavaScript expression to build a new vector of values. */
        buildCalcVector(exp: string)
        {
            var newVector = [];
            var recordCount = this._recordCount;

            //----  convert exp from string to func ----
            var expAdj = this.addRecordKeywordToColumnNames(exp);
            var expFunc = null;

            var strMakeFunc = "expFunc = function(record) { return " + expAdj + ";}" 

            /// TOD: write a function validator that ensures only columns, standard function, and constants are
            /// used in an expression to create a safeEval().

            //eval(strMakeFunc);      // create function from user expression
            throw "calc fields not currenly supported";

            for (var i = 0; i < recordCount; i++)
            {
                var record = this.getRecordByVectorIndex(i);
                //var _primaryKey = i;

                var value = expFunc(record);
                newVector.push(value);
            }

            return newVector;
        }

        /** applies a filter and produces a new dataFrame object. */
        applyPrefilter(exp: string)
        {
            var recordCount = this._recordCount;
            var indexes = [];       // the records to keep

            //----  convert exp from string to func ----
            var expAdj = this.addRecordKeywordToColumnNames(exp);
            var expFunc = null;
            //eval("expFunc = function(record) { return " + expAdj + ";}");   // create function from exp

            throw "preload filter not currently supported";

            for (var i = 0; i < recordCount; i++)
            {
                var record = this.getRecordByVectorIndex(i);
                var _primaryKey = i;

                var value = expFunc(record);
                if (value != true)
                {
                    indexes.push(i);
                }
            }

            var df = this.copyData(indexes);
            return df;
        }

        /** create a new dataFrame, using the specified fieldList. */
        makeFields(fieldList: bps.PreloadField[], mergeFields: boolean)
        {
            var newMap: any = {};
            var newNames = [];
            var colTypes = <string[]> [];

            if (mergeFields)
            {
                newMap = vp.utils.copyMap(this._vectorsByName);
                newNames = vp.utils.copyArray(this._names);
                colTypes = vp.utils.copyArray(this._colTypes);
            }

            for (var i = 0; i < fieldList.length; i++)
            {
                var fld = fieldList[i];
                var newName = fld.name;
                var exp = fld.calcFieldExp;
                var typeName = fld.fieldType;

                if (exp)
                {
                    if (this.isValidFieldName(exp))
                    {
                        //---- just a field rename ----
                        var vector = <any[]> null;
                        if (this.isColLoaded(exp))
                        {
                            vector = this.getVector(exp, false);
                            vector = vector.slice(0);  // copy vector
                        }
                        newMap[newName] = vector;
                    }
                    else
                    {
                        //---- its a true calculated field ----
                        var vector = this.buildCalcVector(exp);
                        newMap[newName] = vector;
                    }
                }
                else
                {
                    //---- use original field name ----
                    var fldType = fld.fieldType;

                    //---- use the specified named column ----
                    var vector = <any[]> null;
                    if (this.isColLoaded(newName))
                    {
                        vector = this.getVector(newName, false);
                        vector = vector.slice(0);  // copy vector
                    }
                    newMap[newName] = vector;

                }

                var index = newNames.indexOf(newName);
                if (index > -1)
                {
                    newNames[index] = newName;
                    colTypes[index] = typeName;
                }
                else
                {
                    newNames.push(newName);
                    colTypes.push(typeName);
                }

                if (vector && fld.valueMap && fld.valueMap.length)
                {
                    this.applyValueMap(fld, vector);
                }
            }

            var df = new DataFrameClass(newMap, newNames, colTypes);
            return df;
        }

        loader(value?: DataLoaderClass)
        {
            if (arguments.length == 0)
            {
                return this._loader;
            }

            this._loader = value;
        }

        applyValueMap(fld: bps.PreloadField, vector: any[])
        {
            var valueMap = fld.valueMap;

            for (var i = 0; i < valueMap.length; i++)
            {
                var entry = valueMap[i];
                if (entry.newValue)
                {
                    this.applyValueMapEntry(entry, vector);
                }
            }
        }

        applyValueMapEntry(entry: bps.ValueMapEntry, vector: any[])
        {
            var origValue = entry.originalValue;
            var newValue = entry.newValue;

            for (var i = 0; i < vector.length; i++)
            {
                if (vector[i] === origValue)
                {
                    vector[i] = newValue;
                }
            }
        }

        sortVectors(colName: string, ascending: boolean, colType: string)
        {
            /// HISTORICAL NOTE: using JavaScript array sort() for STRINGS on large data tables used to take a long time, so
            /// for a while we were sorting on the server.  Turns out the problem was that we were returning "1" for equal
            /// values, which GREATLY slowed down sorting in many cases.

            //---- NOTE: we can move this onto a background worker thread if/when needed----

            var sortAsNumbers = (colType != "string");

            if (!colName)
            {
                colName = "_primaryKey";
                ascending = true;
                sortAsNumbers = true;
            }

            //---- extract keys to sort ----
            var keys = [];

            if (colType == "string")
            {
                var vector = <any>this.getVector(colName, false);
            }
            else
            {
                var vector = <any>this.getNumericVector(colName, false).values;
            }

            if (!vector)
            {
                throw "Internal error - sort() called on non-existent colName=" + colName;
            }

            if (sortAsNumbers)
            {
                for (var i = 0; i < vector.length; i++)
                {
                    var key = vector[i];
                    keys[i] = { key: +key, index: i };
                }

                vp.utils.debug("calling NUMERIC sort: colName=" + colName + ", ascending=" + ascending + ", length=" + keys.length);

                if (ascending)
                {
                    keys.sort(function (a, b) { return a.key - b.key; });
                }
                else
                {
                    keys.sort(function (b, a) { return a.key - b.key; });
                }
            }
            else
            {
                for (var i = 0; i < vector.length; i++)
                {
                    var key = vector[i];
                    keys[i] = { key: key + "", index: i };
                }

                vp.utils.debug("calling STRING sort: colName=" + colName + ", ascending=" + ascending + ", length=" + keys.length);
                if (ascending)
                {
                    keys.sort(function (a, b) { return (a.key < b.key) ? -1 : ((a.key == b.key) ? 0 : 1); });
                }
                else
                {
                    keys.sort(function (b, a) { return (a.key < b.key) ? -1 : ((a.key == b.key) ? 0 : 1); });
                }
            }
            //vp.utils.debug("sort returned");

            //---- recorder each named vector, in place ----
            //---- this means that all layout routines directly use the sorted data, so they don't have to worry about a "sorted index" ----
            for (var i = 0; i < this._names.length; i++)
            {
                var name = this._names[i];
                var vector = <any>this._vectorsByName[name];

                if (vector)
                {
                    this.reorderVectorInPlace(vector, keys);
                }
            }

            //---- save sort keys for colsOnDemand ----
            this._currentSortKeys = keys;

            this.rebuildPrimaryKeyIndex();

            this._sortKey = colName + (ascending ? "-up" : "-down");

            //---- invalidate our cache of numeric vectors ----
            this._numericVectorsCache = {};

            //---- debug - show first record index of newly sorted records ----
            //var last = riVector.length - 1;
            //vp.utils.debug("after sort, first record index=" + riVector[0] + ", last record index =" + riVector[last]);
        }

        getSortKey()
        {
            return this._sortKey;
        }

        reorderVectorInPlace(vector: any[], keys: any[])
        {
            var prevVector = vp.utils.copyArray(vector);

            for (var i = 0; i < keys.length; i++)
            {
                var keyEntry = keys[i];
                var index = keyEntry.index;

                var value = prevVector[index];
                vector[i] = value;
            }
        }

        addColsToData(newInfos: bps.ColInfo[], newVectors: any[])
        {
            for (var i = 0; i < newInfos.length; i++)
            {
                var ci = newInfos[i];
                var vector = newVectors[i];

                this.addColumn(ci, vector, false);
            }

            this.onDataChanged("colInfos");
        }

        addColumn(ci: bps.ColInfo, vector?: any[], notify = true)
        {
            var name = ci.name;
            var index = this._names.indexOf(name);

            if (index == -1)
            {
                //---- a new column name ----
                index = this._names.length;
                this._names.push(name);
            }
            else
            {
                //---- invalidate cache for this column, since we are adding new data ----
                this._numericVectorsCache[name] = null;
            }

            if (!vector)
            {
                //---- supply default vector of all zeros ----
                var count = this._recordCount;
                vector = [];

                for (var i = 0; i < count; i++)
                {
                    vector[i] = 0;
                }
            }

            //---- add colType and vector ----
            this._colTypes[index] = ci.colType;
            this._vectorsByName[name] = vector;

            if (notify)
            {
                this.onDataChanged("colInfos");
            }
        }

        /* return an object serialized to JSON string */
        toJsonString()
        {
            var str = JSON.stringify(this);
            return str;
        }

        static jsonToDataFrame(jsonData: any[])
        {
            var names: string[] = [];
            var vectors: any[][] = [];
            var vectorsByName: any = {};

            if (jsonData.length > 0)
            {
                var record0 = jsonData[0];
                var names = vp.utils.keys(record0);

                for (var c = 0; c < names.length; c++)
                {
                    var colName = names[c];
                    var vector = [];

                    vectors[c] = vector;
                    vectorsByName[colName] = vector;

                }
                for (var r = 0; r < jsonData.length; r++)
                {
                    var record = jsonData[r];

                    for (var c = 0; c < names.length; c++)
                    {
                        var colName = names[c];
                        var vector = vectors[c];
                        var value = record[colName];

                        vector.push(value);
                    }
                }
            }

            var df = new DataFrameClass(vectorsByName, names);

            return df;
        }

        getRecordCount()
        {
            return this._recordCount;
        }

        getPreload(): bps.WorkingDataParams
        {
            return this._wdParams;
        }

        getColumnNames()
        {
            return this._names;
        }

        getRecordByPrimaryKey(primaryKey: string, colNames?: string[])
        {
            var vi = this._pkToVectorIndex[primaryKey];

            return this.getRecordByVectorIndex(vi, colNames);
        }

        getRecordByVectorIndex(recordIndex: number, colNames?: string[])
        {
            var record: any = null;

            if (this._loader)
            {
                record = this._loader.getRecord(recordIndex, colNames);
            }
            else
            {
                if (recordIndex >= 0 && recordIndex <= this._recordCount)
                {
                    record = {};

                    if (!colNames)
                    {
                        colNames = this._names;
                    }

                    for (var c = 0; c < colNames.length; c++)
                    {
                        var colName = colNames[c];
                        var vector = this._vectorsByName[colName];
                        var value = vector[recordIndex];

                        record[colName] = value;
                    }
                }
            }

            return record;
        }

        toJson(maxRecords?: number, indexes?: number[])
        {
            var newData = [];

            if (this._names && this._names.length)
            {
                var names = this._names;
                var count = this._recordCount;

                if (maxRecords)
                {
                    count = Math.min(maxRecords, count);
                }

                if (indexes)
                {
                    count = Math.min(indexes.length, count);
                }

                for (var r = 0; r < count; r++)
                {
                    var record: any = {};
                    var index = (indexes) ? indexes[r] : r;

                    for (var c = 0; c < names.length; c++)
                    {
                        var colName = names[c];
                        var vector = this._vectorsByName[colName];

                        record[colName] = vector[index];
                    }

                    newData.push(record);
                }
            }

            return newData;
        }

        /** gets the named vector in its ORIGINAL form (string, date, number). */
        getVector(name: string, invalidateNumericCache: boolean): any[]
        {
            //---- if we are changing the original vector, we need to invalidate the cached version of the numeric vector ----
            if (invalidateNumericCache)
            {
                this._numericVectorsCache[name] = null;
            }

            var vector = this._vectorsByName[name];
            if (!vector && this._loader)
            {
                //---- get column on demand ----
                this._loader.loadColumns(this._vectorsByName, [name]);
                vector = this._vectorsByName[name];

                //---- apply value map if present ----
                var fld = this.getFieldData(name);

                if (fld && fld.valueMap && fld.valueMap.length)
                {
                    this.applyValueMap(fld, vector);
                }

                //---- sort if sortKeys active ----
                if (this._currentSortKeys)
                {
                    this.reorderVectorInPlace(vector, this._currentSortKeys);
                }
            }

            return vector;
        }

        getFieldData(colName: string)
        {
            var pf = <bps.PreloadField>null;

            if (this._wdParams)
            {
                var fields = this._wdParams.fieldList;
                if (fields)
                {
                    for (var i = 0; i < fields.length; i++)
                    {
                        var field = fields[i];
                        if (field.name == colName)
                        {
                            pf = field;
                            break;
                        }
                    }
                }
            }

            return pf;
        }

        invalidateCache(colName: string)
        {
            this._numericVectorsCache[colName] = null;
        }

        /** gets the named vector in its NUMERIC form. */
        getNumericVector(name: string, forceCategory?: boolean, allKeys?: string[], useCache = true): NumericVector
        {
            var numVector = null;

            if (forceCategory)
            {
                numVector = this.buildNumericCol(name, true, true, allKeys);
            }
            else
            {
                if (useCache)
                {
                    //---- use cache for normal requests ----
                    numVector = this._numericVectorsCache[name];
                }

                if (!numVector)
                {
                    numVector = this.buildNumericCol(name, true, false, allKeys);

                    if (useCache)
                    {
                        this._numericVectorsCache[name] = numVector;
                    }
                }
            }

            return numVector;
        }

        /** returns the type of column (date, number, string).  This value is calculated on demand, and then cached. */
        getColType(name: string)
        {
            var colType = null;

            var index = this._names.indexOf(name);
            if (index > -1)
            {
                colType = this._colTypes[index];
            }

            return colType;
        }

        copyData(recordIndexes?: number[])     
        {

            var names = vp.utils.copyArray(this._names);
            var colTypes = vp.utils.copyArray(this._colTypes);
            var vectorsByName: { [name:string]: any[] } = {};

            for (var v = 0; v < this._names.length; v++)
            {
                var name = this._names[v];
                var vector = this._vectorsByName[name];

                if (recordIndexes)
                {
                    var newVector = recordIndexes.map((recordIndex: number) =>
                    {
                        return vector[recordIndex];
                    });
                }
                else
                {
                    var newVector = <any[]> vp.utils.copyArray(vector);
                }

                vectorsByName[name] = newVector;
            }

            var df = new DataFrameClass(vectorsByName, names, colTypes, this._recordCount);
            return df;
        }

        private static getSortedKeys(name: string, wdParams: bps.WorkingDataParams)
        {
            var sortedKeys = <string[]>null;

            if (wdParams)
            {
                var colInfo = wdParams.getField(name);
                if (colInfo)
                {
                    sortedKeys = colInfo.sortedValues;
                }
            }

            return sortedKeys;
        }

        getPrimaryKeys(vector: any[], vectorType: bps.VectorType)
        {
            var keys = [];
            var pkVector = this.getVector(primaryKeyName, false);

            if (vectorType == bps.VectorType.sortOrder)
            {
                for (var ri = 0; ri < vector.length; ri++)
                {
                    var value = vector[ri];
                    if (value)
                    {
                        var key = pkVector[ri];

                        keys.push(value);
                    }
                }
            }
            else if (vectorType == bps.VectorType.primaryKeyList)
            {
                keys = vector;
            }
            else
            {
                utils.error("getSortOrderKeys: unknown vectorType=" + vectorType); 
            }

            return keys;
        }

        private buildNumericCol(name: string, forceNumeric?: boolean, forceCategory?: boolean, allKeys?: string[])
        {
            //---- first, try dataFrame (map of data vectors) ----
            var colData = this.getVector(name, false);
            var colType = this.getColType(name);

            if (forceCategory)
            {
                colType = "string";
            }

            var numericVector = DataFrameClass.buildNumericColFromVector(name, colData, colType,
                forceNumeric, forceCategory, allKeys, this._wdParams);

            return numericVector;
        }

        public static buildNumericColFromVector(name: string, colData: any[], colType: string, forceNumeric?: boolean,
            forceCategory?: boolean, allKeys?: string[], wdParams?: bps.WorkingDataParams)
        {
            var count = (colData) ? colData.length: 0;
            var newData = new Float32Array(count);
            var numericVector = new NumericVector(newData, name, colType);

            if (colData && colData.length)
            {
                if (colType == "number")
                {
                    //---- transfer NUMBER values, converting strings to parsed numbers ----
                    for (var i = 0; i < colData.length; i++)
                    {
                        /// number represenations:
                        ///     valid number string --> normal numbers
                        ///     blanks  --> NaN 
                        ///     invalid number string --> NaN

                        //var value: any = +colData[i];
                        var strValue = colData[i];

                        if (strValue === "")
                        {
                            //---- NA (missing) value ----
                            var numValue = NaN;
                        }
                        else
                        {
                            //---- NUMBER or STRING value ----
                            var numValue = +strValue;
                        }

                        newData[i] = numValue;
                    }
                }
                else if (colType == "date")
                {
                    //---- transfer DATE values, converting strings to parsed date numbers and date objects to date numbers ----
                    for (var i = 0; i < colData.length; i++)
                    {
                        var value = colData[i];

                        //---- BLANK and NON-DATE strings are converted here to NaN's ----
                        if (typeof value == "string")
                        {
                            value = Date.parse(value);
                        }
                        else
                        {
                            value = +value;
                        }

                        newData[i] = value;
                    }
                }
                else       
                {
                    //---- string values ----
                    if (forceNumeric)
                    {
                        var sortedKeys = DataFrameClass.getSortedKeys(name, wdParams);
                        if (sortedKeys)
                        {
                            //---- overrides allKeys ----
                            allKeys = sortedKeys;
                        }

                        //---- convert string to numeric, using dictionary keys & their indexes ----
                        var keyIndexs = DataFrameClass.getStringKeyIndexes(colData, numericVector, allKeys);

                        if (keyIndexs && keyIndexs.length)
                        {
                            newData = keyIndexs;
                        }
                    }
                    else
                    {
                        throw "Error: cannot put string values into a NumericVector";
                        //---- transfer STRING values without change ----
                        //newData = [];           // cannot put strings into float32Array

                        //for (var i = 0; i < colData.length; i++)
                        //{
                        //    var value: any = colData[i];
                        //    newData[i] = value;
                        //}
                    }
                }
            }

            return numericVector;
        }

        private static getStringKeyIndexes(data: any[], numericVector?: NumericVector, allKeys?: string[])
        {
            var indexesByKey: { [key: string]: number } = {};
            var keysByIndex: { [keyIndex: number]: string } = {};

            var keyIndexes = <any>[];
            var rowsByKey: { [s: string]: number[] } = {};
            var keysByRow: string[] = [];

            var sortedKeys = <string[]>[];      // a list of keys in their desired sort order
            var nextKeyId = 0;

            if (data && data.length)
            {
                if (!allKeys)
                {
                    //---- pull and sort keys up front to ensure sorted key indexes match indexes used in data ----
                    allKeys = data.groupBy().map((g) => g.key);
                    sortedKeys = allKeys.sort();
                }
                else
                {
                    sortedKeys = allKeys.slice(0);      // make copy of allKeys
                }

                //---- pre-assign a full set of keys ----
                for (var i = 0; i < sortedKeys.length; i++)
                {
                    var ak = sortedKeys[i];

                    indexesByKey[ak] = nextKeyId;
                    keysByIndex[nextKeyId] = ak;

                    nextKeyId++;
                }

                //---- convert values from string to number (key index) ----
                for (var i = 0; i < data.length; i++)
                {
                    var key = data[i] + "";
                    var keyValue = indexesByKey[key];

                    if (keyValue === undefined || keyValue === null)
                    {
                        keyValue = nextKeyId++;
                        indexesByKey[key] = keyValue;
                        keysByIndex[keyValue] = key;
                        sortedKeys.push(key);
                    }

                    var rows = rowsByKey[key];
                    if (rows === undefined || rows === null)
                    {
                        rows = [];
                        rowsByKey[key] = rows;
                    }
                    rows.push(i);

                    keysByRow[i] = key;

                    keyIndexes.push(keyValue);
                }
            }

            numericVector.values = keyIndexes;
            numericVector.keyInfo = new KeyInfo(sortedKeys.length, indexesByKey, keysByIndex, rowsByKey, keysByRow, sortedKeys);

            return keyIndexes;
        }

        aggData(statInfo: StatInfo)
        {
            var result = null;
            var statType = statInfo.statType;

            if (statType == StatType.count)
            {
                result = this._recordCount;
            }
            else
            {
                var colName = statInfo.colName;
                var statTransform = statInfo.colValueTransform;

                var statName = (statType != StatType.none) ? StatType[statType] : "sum";

                var aggregator = vp.data.createAggregator(statName);
                aggregator.init();

                var vector = this.getVector(colName, false);

                for (var i = 0; i < vector.length; i++)
                {
                    var value = vector[i];
                    if (statTransform)
                    {
                        value = statTransform(value);
                    }

                    aggregator.process(value);
                }

                result = aggregator.getResult();
            }

            return result;
        }

    }
}  