//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    dataMgr.ts - loads and manages data streams used by BeachParty.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    //---- keep in sync with same names in dataServerApp/DataTransformer.cs ----
    export var selectedName = "_selected";
    export var filteredName = "_filtered";
    export var primaryKeyName = "_primaryKey";
    export var randomXName = "_randomX";
    export var randomYName = "_randomY";

    export var systemColNames = [selectedName, filteredName, primaryKeyName, randomXName, randomYName];

    /** manages:
        - server data requests
        - client-side data requests
        - selection
        - filtering  
    */
    export class DataMgrClass extends DataChangerClass
    {
        private _dataFrame: DataFrameClass;
        private _fn: string = null;
        //private _colMappings: any = {};

        private _recordCount = 0;
        private _selectedCount = 0;
        private _filteredInCount = 0;
        private _wdParams: bps.WorkingDataParams = null;
        private _shareMgr: ShareMgrClass;
        private _preloadMgr: PreloadMgrClass;
        private _colInfos: bps.ColInfo[];
        private _origColInfos: bps.ColInfo[];
        private _appMgr: AppMgrClass;
        private _isClientEdition;
        private _colsOnDemand = false;

        /// selectMode logically belongs on the client, but since the engine processes events from the chart exes, 
        /// we keep it here.  this may change in the future.
        private _selectMode = bps.SelectMode.normal;

        constructor(appMgr: AppMgrClass, preloadMgr: PreloadMgrClass, isClientEdition: boolean)
        {
            super();

            this._appMgr = appMgr;
            this._preloadMgr = preloadMgr;
            this._isClientEdition = isClientEdition;

            //---- don't trip over NULL dataFrame ----
            this._dataFrame = new DataFrameClass({});

            this._shareMgr = new ShareMgrClass((sd: ShareStateData) =>
            {
                if (this.hasSelectionChanged(sd.selectedPrimaryKeys))
                {
                    this.setSelectionDirect(sd.selectedPrimaryKeys, "localstorage");
                }
            });

        }

        colsOnDemand()
        {
            return this._colsOnDemand;
        }

        hasSelectionChanged(keyList: string[])
        {
            var hasChanged = true;

            var selVector = this.getSelectedVector(false);
            var vCount = vector.countOn(selVector);

            //---- quickest check - make sure # of 1's in vector matches length of keyList ----
            if (vCount === keyList.length)
            {
                var pktoIndex = this._dataFrame.getPkToVectorIndex();
                var hasChanged = false;

                for (var i = 0; i < keyList.length; i++)
                {
                    var key = keyList[i];
                    var index = pktoIndex[key];

                    if (!selVector[index])
                    {
                        hasChanged = true;
                        break;
                    }
                }
            }

            return hasChanged;
        }

        setDataDirect(data: any, wdParams: bps.WorkingDataParams)
        {
            vp.utils.debug("setDataDirect: calling loader");

            var loader = new DataLoaderClass(this._preloadMgr, this._colsOnDemand, this._appMgr);
            var result = loader.processData(data, wdParams);

            vp.utils.debug("setDataDirect: calling setDataAndInfo");

            this.setDataAndInfo(result.origDf, result.postDf, result.wdParams, loader);

            vp.utils.debug("setDataDirect ending");
        }

        loadKnownAsync(name: string, wdParams?: bps.WorkingDataParams, callback?: any)
        {
            var loader = new DataLoaderClass(this._preloadMgr, this._colsOnDemand, this._appMgr);

            loader.loadKnownAsyncCore(name, null, (origDf, postDf, wdParams) =>
            {
                this.setDataAndInfo(origDf, postDf, wdParams, loader);

                if (callback)
                {
                    callback(postDf);
                }
            });
        }

        openPreloadAsync(wdParams?: bps.WorkingDataParams, callback?: any)
        {
            var loader = new DataLoaderClass(this._preloadMgr, this._colsOnDemand, this._appMgr);

            loader.openPreloadAsyncCore(wdParams, null, (origDf, postDf, wdParams) =>
            {
                this.setDataAndInfo(origDf, postDf, wdParams, loader);

                if (callback)
                {
                    callback(postDf);
                }
            });
        }

        selectMode(value?: bps.SelectMode)
        {
            if (arguments.length === 0)
            {
                return this._selectMode;
            }

            this._selectMode = value;
            this.onDataChanged("SelectMode");
        }

        getFilteredInVector(colName: string, asNumeric?: boolean)
        {
            if (asNumeric)
            {
                var rawVector = <any>this._dataFrame.getNumericVector(colName).values;
            }
            else
            {
                var rawVector = <any>this._dataFrame.getVector(colName, false);
            }

            var filter = this.getFilteredVector(false);
            var newVector = [];

            for (var i = 0; i < rawVector.length; i++)
            {
                if (!filter[i])
                {
                    newVector.push(rawVector[i]);
                }
            }

            return newVector;
        }

        getFilteredKeysMinMax(colName: string, colType: string)
        {
            var keys = null;
            var min = null;
            var max = null;

            var vector = this.getFilteredInVector(colName);

            if (colType === "string")
            {
                keys = vector.distinct();       // .length;
                min = 0;
                max = keys.length - 1;
            }
            else
            {
                keys = null;
                min = vector.min();
                max = vector.max();
            }

            return { keys: keys, min: min, max: max };
        }

        getOrigColInfos()
        {
            return this._origColInfos;
        }

        getColKeyCounts(colName: string, sortByCount: boolean, isDescendingSort: boolean, maxKeys: number)
        {
            var rawVector = this._dataFrame.getVector(colName, false);
            var keyCountList = rawVector.groupBy().map((g) => { return { key: g.key, count: g.values.length }});

            if (sortByCount)
            {
                var sortedList = keyCountList.orderByNum((g) => g.count);
            }
            else
            {
                var sortedList = keyCountList.orderByStr((g) => g.key);
            }

            if (isDescendingSort)
            {
                sortedList = sortedList.reverse();
            }

            if (sortedList.length > maxKeys)
            {
                sortedList = sortedList.slice(0, maxKeys - 1);
            }

            return sortedList;
        }

        getColInfos(applyFilter?: boolean)
        {
            var colInfos = this._colInfos;

            if ((applyFilter) && (this._filteredInCount !== this._recordCount))
            {
                var newInfos: bps.ColInfo[] = [];

                for (var i = 0; i < colInfos.length; i++)
                {
                    var ci = colInfos[i];
                    var mm = this.getFilteredKeysMinMax(ci.name, ci.colType);
                    var ciTo = new bps.ColInfo(ci.name, ci.desc, ci.colType, mm.keys, mm.min, mm.max);
                    newInfos.push(ciTo);
                }

                colInfos = newInfos;
            }

            return colInfos;
        }

        buildColInfos(df: DataFrameClass)
        {
            var wdParams = this._wdParams;      // df.getPreload();
            var names = df.getColumnNames();
            var colInfos = <bps.ColInfo[]>[];

            for (var i = 0; i < names.length; i++)
            {
                var name = names[i];
                var fieldInfo = wdParams.getField(name);

                var colType = df.getColType(name);

                var keys = null;

                if (df.isColLoaded(name))
                {
                    var numVector = df.getNumericVector(name);

                    if (colType == "string")
                    {
                        keys = numVector.keyInfo.sortedKeys;
                    }

                    var desc = (fieldInfo) ? fieldInfo.description : "";

                    var min = numVector.values.min();
                    var max = numVector.values.max();
                }

                var info = new bps.ColInfo(name, desc, colType, keys, min, max);
                info.calcFieldExp = (fieldInfo) ? fieldInfo.calcFieldExp : null;

                colInfos.push(info);
            }

            return colInfos;
        }

        isFileLoaded(file: bps.WorkingDataParams)
        {
            var isLoaded = false;

            if (this._wdParams)
            {
                isLoaded = (this._wdParams.filePath === file.filePath);

                if (isLoaded)
                {
                    //---- check to see if field list matches ----
                    if (!WdCompare.fieldListsMatch(this._wdParams.fieldList, file.fieldList))
                    {
                        isLoaded = false;
                    }
                }
            }

            return isLoaded;
        }

        onLocalStorageChange()
        {
            this._shareMgr.onLocalStorageChange();
        }

        getShareMgr()
        {
            return this._shareMgr;
        }

        getDataFrame(): DataFrameClass
        {
            return this._dataFrame;
        }

        getFilename()
        {
            return this._fn;
        }

        searchExactMatchNumber(selection: number[], data: any[], value: string, maxValue: string)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];

                if (isNaN(+itemValue))
                {
                    //---- must do an isNan() test on itemValue ----
                    selection[i] = isNaN(+value) ? 1 : 0;
                }
                else if (itemValue == value)
                {
                    selection[i] = 1;
                }
            }
        }

        searchExactMatchString(selection: number[], data: any[], value: string, maxValue: string)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];

                if (itemValue == value)
                {
                    selection[i] = 1;
                }
            }
        }

        searchNotEqual(selection: number[], data: any[], value: string, maxValue: string)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];

                if (isNaN(+itemValue))
                {
                    //---- must do an isNan() test on itemValue ----
                    selection[i] = isNaN(+value) ? 0 : 1;
                }
                else if (itemValue != value)
                {
                    selection[i] = 1;
                }
            }
        }

        searchContains(selection: number[], data: any[], value: string, maxValue: string)
        {
            value = value + "";     // force to a string

            for (var i = 0; i < data.length; i++)
            {
                var str = data[i] + "";
                if (str.contains(value))
                {
                    selection[i] = 1;
                }
            }
        }

        searchStartsWith(selection: number[], data: any[], value: string, maxValue: string)
        {
            value = value + "";     // force to a string

            for (var i = 0; i < data.length; i++)
            {
                var str = data[i] + "";
                if (str.startsWith(value))
                {
                    selection[i] = 1;
                }
            }
        }

        searchGreaterThan(selection: number[], data: any[], value: string, maxValue: string, isString: boolean)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];
                if (itemValue > value)
                {
                    selection[i] = 1;
                }
            }
        }

        searchGreaterThanEqual(selection: number[], data: any[], value: string, maxValue: string, isString: boolean)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];
                if (itemValue >= value)
                {
                    selection[i] = 1;
                }
            }
        }

        searchLessThan(selection: number[], data: any[], value: string, maxValue: string, isString: boolean)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];
                if (itemValue < value)
                {
                    selection[i] = 1;
                }
            }
        }

        searchLessThanEqual(selection: number[], data: any[], value: string, maxValue: string, isString: boolean)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];
                if (itemValue <= value)
                {
                    selection[i] = 1;
                }
            }
        }

        searchBetweenInclusive(selection: number[], data: any[], value: string, maxValue: string, isString: boolean)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];

                if (isNaN(+itemValue))
                {
                    //---- must do an isNan() test on itemValue ----
                    selection[i] = isNaN(+value) ? 1 : 0;
                }
                else if (itemValue >= value && itemValue <= maxValue)
                {
                    selection[i] = 1;
                }
            }
        }

        searchGtrValueAndLeqValue2(selection: number[], data: any[], value: string, maxValue: string, isString: boolean)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];

                if (isNaN(+itemValue))
                {
                    //---- must do an isNan() test on itemValue ----
                    selection[i] = isNaN(+value) ? 1 : 0;
                }
                else if (itemValue > value && itemValue <= maxValue)
                {
                    selection[i] = 1;
                }
            }
        }

        searchGeqValueAndLessValue2(selection: number[], data: any[], value: string, maxValue: string, isString: boolean)
        {
            for (var i = 0; i < data.length; i++)
            {
                var itemValue = data[i];

                if (isNaN(+itemValue))
                {
                    //---- must do an isNan() test on itemValue ----
                    selection[i] = isNaN(+value) ? 1 : 0;
                }
                else if (itemValue >= value && itemValue < maxValue)
                {
                    selection[i] = 1;
                }
            }
        }

        searchColValueByKeys(selection: number[], data: any[], otherKeys: string[])
        {
            for (var i = 0; i < data.length; i++)
            {
                var strKey = data[i] + "";

                if (otherKeys.indexOf(strKey) > -1)
                {
                    selection[i] = 1;
                }
            }
        }

        dateToNumber(value: any)
        {
            var numValue: number;

            if (vp.utils.isString(value))
            {
                var dt = new Date(value);
                numValue = +dt;
            }
            else
            {
                numValue = +value;
            }

            return numValue;
        }

        runSearchQuery(spList: bps.SearchParams[])
        {
            var matchVector = null;

            for (var i = 0; i < spList.length; i++)
            {
                var sp = spList[i];
                var mvSingle = this.runSearchNode(sp);

                if (i == 0)
                {
                    matchVector = mvSingle;
                }
                else
                {
                    //---- AND them together ----
                    for (var i = 0; i < matchVector.length; i++)
                    {
                        matchVector[i] = (matchVector[i] && mvSingle[i]);
                    }
                }
            }

            var sp = spList[0];
            var searchAction = (sp.searchAction === undefined) ? bps.SearchAction.selectMatches : sp.searchAction;

            var matches = this.applyMatchVector(matchVector, searchAction);
            return matches;
        }

        private runSearchNode(sp: bps.SearchParams)
        {
            var matches = null;

            var colName = sp.colName;
            if (colName)
            {
                matches = this.searchSingleColumn(sp);
            }
            else
            {
                //---- OR-together search from each string column ----
                for (var i = 0; i < this._colInfos.length; i++)
                {
                    var ci = this._colInfos[i];
                    if (ci.colType == "string")
                    {
                        sp.colName = ci.name;
                        var oneMatch = this.searchSingleColumn(sp);

                        if (! matches)
                        {
                            matches = oneMatch;
                        }
                        else
                        {
                            //---- OR them together ----
                            for (var j = 0; j < matches.length; j++)
                            {
                                matches[j] = (matches[j] || oneMatch[j]);
                            }
                        }
                    }
                }
            }

            return matches;
        }

        private searchSingleColumn(sp: bps.SearchParams)
        {
            var colName = sp.colName;
            var value = sp.minValue;
            var maxValue = sp.maxValue;
            var searchType = sp.searchType;
            var searchAction = (sp.searchAction === undefined) ? bps.SearchAction.selectMatches : sp.searchAction;

            vp.utils.debug("search: colName=" + colName + ", value=" + value + ", maxValue=" + maxValue);

            if (value === "")
            {
                searchType = bps.TextSearchType.exactMatch;
            }

            var matchVector = <number[]>vp.data.dataRepeat(0, this._recordCount);

            var colType = this._dataFrame.getColType(colName);
            if (sp.searchRawValues)
            {
                colType = "string";
            }

            //---- EXACT search uses original string values ----
            var isString = (colType == "string" || searchType == bps.TextSearchType.exactMatch);

            if (isString)
            {
                //---- get original data vector ----
                var data = <any[]>this._dataFrame.getVector(colName, false);

                if (! sp.caseSensitiveSearch && colType == "string")
                {
                    if (vp.utils.isArray(value))
                    {
                        for (var i = 0; i < value.length; i++)
                        {
                            var val = value[i];
                            value[i] = val.toLowerCase();
                        }
                    }
                    else 
                    {
                        value = value.toLowerCase();
                    }

                    //---- make lowercase copy of data ----
                    var lowData = data.map((d) => d.toLowerCase());
                    data = lowData;
                }
            }
            else
            {
                //---- get numeric form of vector ----
                var data = <any[]>this._dataFrame.getNumericVector(colName, false).values.toArray();
            }

            if (colType == "number")
            {
                value = +value;
                maxValue = (maxValue !== null && maxValue !== undefined) ? +maxValue : value;
            }
            else if (colType == "date")
            {
                value = this.dateToNumber(value);
                maxValue = (maxValue !== null && maxValue !== undefined) ? this.dateToNumber(maxValue) : value;
            }

            if (vp.utils.isArray(value))
            {
                this.searchColValueByKeys(matchVector, data, value);
            }
            else if (searchType == bps.TextSearchType.exactMatch)
            {
                if (colType == "string")
                {
                    this.searchExactMatchString(matchVector, data, value, maxValue);
                }
                else
                {
                    this.searchExactMatchNumber(matchVector, data, value, maxValue);
                }
            }
            else if (searchType == bps.TextSearchType.notEqual)
            {
                this.searchNotEqual(matchVector, data, value, maxValue);
            }
            else if (searchType == bps.TextSearchType.contains)
            {
                this.searchContains(matchVector, data, value, maxValue);
            }
            else if (searchType == bps.TextSearchType.startsWith)
            {
                this.searchStartsWith(matchVector, data, value, maxValue);
            }
            else if (searchType == bps.TextSearchType.greaterThan)
            {
                this.searchGreaterThan(matchVector, data, value, maxValue, isString);
            }
            else if (searchType == bps.TextSearchType.greaterThanEqual)
            {
                this.searchGreaterThanEqual(matchVector, data, value, maxValue, isString);
            }
            else if (searchType == bps.TextSearchType.lessThan)
            {
                this.searchLessThan(matchVector, data, value, maxValue, isString);
            }
            else if (searchType == bps.TextSearchType.lessThanEqual)
            {
                this.searchLessThanEqual(matchVector, data, value, maxValue, isString);
            }
            else if (searchType == bps.TextSearchType.betweenInclusive)
            {
                this.searchBetweenInclusive(matchVector, data, value, maxValue, isString);
            }
            else if (searchType == bps.TextSearchType.gtrValueAndLeqValue2)
            {
                this.searchGtrValueAndLeqValue2(matchVector, data, value, maxValue, isString);
            }
            else if (searchType == bps.TextSearchType.geqValueAndLessValue2)
            {
                this.searchGeqValueAndLessValue2(matchVector, data, value, maxValue, isString);
            }

            return matchVector;
        }

        applyMatchVector(matchVector: number[], searchAction: bps.SearchAction)
        {
            var matches = null;

            if (searchAction == bps.SearchAction.selectMatches)
            {
                //---- convert from list of 0/1 values to a list of "value=1" record indexes ----
                var selectedIndexes = [];
                for (var i = 0; i < matchVector.length; i++)
                {
                    if (matchVector[i])
                    {
                        selectedIndexes.push(i);
                    }
                }

                this.updateSelectionFromVectorIndexes(selectedIndexes);
            }
            else if (searchAction == bps.SearchAction.returnMatches)
            {
                matches = [];
                var dataView = this._appMgr.getDataView();
                var pkVector = this._dataFrame.getVector(primaryKeyName, false);

                for (var i = 0; i < matchVector.length; i++)
                {
                    if (matchVector[i])
                    {
                        var key = pkVector[i];
                        var rc = dataView.getShapeScreenRect(key);

                        var match = { primaryKey: key, rcBounds: rc };
                        matches.push(match);
                    }
                }
            }

            return matches;
        }

        //getColMappings()
        //{
        //    return this._colMappings;
        //}

        getPreload()
        {
            return this._wdParams;
        }

        /** data can be either JSON array, map of named vectors, or text string. */
        public setDataAndInfo(origDf: DataFrameClass, postDf: DataFrameClass, wdParams: bps.WorkingDataParams, loader: DataLoaderClass)
        {
            this._dataFrame = postDf;
            this._wdParams = wdParams;
            this._fn = wdParams.dataName;

            postDf.registerForChange("colInfos", (e) =>
            {
                this._colInfos = this.buildColInfos(this._dataFrame);
            });

            if (this._colsOnDemand)
            {
                postDf.loader(loader);
            }

            this._recordCount = postDf.getRecordCount();

            this.computeSelectedCount();
            this.computeFilteredCount();

            //---- build ORIG colInfos, based on full set of (unchanged) columns in table ----
            this._origColInfos = this.buildColInfos(origDf);

            //---- build colInfos, based on SCRUBBED set of columns ----
            this._colInfos = this.buildColInfos(postDf);

            this.onDataChanged("dataFrame");
            //this.onDataChanged("filtered");
            this.onDataChanged("colMappings");
            this.onDataChanged("fn");

            this._shareMgr.setFilename(wdParams.dataName);
        }

        requestBinData(md: bps.MappingData, callback)
        {
            var sortOptions = new beachParty.BinSortOptionsClass();
            sortOptions.sortDirection = md.binSorting;
            sortOptions.sortByAggregateType = "count";
            var maxCount = 0;

            //---- create a NamedVector object for binHelper ----
            var nv = new NamedVectors(this._recordCount);
            var dataFrame = this.getDataFrame();
            nv.x = dataFrame.getNumericVector(md.colName);
            nv.primaryKey = dataFrame.getNumericVector(primaryKeyName);

            var binResult = beachParty.BinHelper.createBins(nv, "x", md.binCount, md.binCount, md.forceCategory, true, true, sortOptions, null, md.useNiceNumbers, md);

            callback(binResult);
        }

        computeSelectedCount()
        {
            var select = this.getSelectedVector(false);
            this._selectedCount = vector.countOn(select);
        }

        private computeFilteredCount()
        {
            var filter = this.getFilteredVector(false);
            this._filteredInCount = vector.countOff(filter);
        }

        getSelectedVector(invalidateNumericCache: boolean)
        {
            var vector = <number[]> this._dataFrame.getVector(selectedName, invalidateNumericCache);
            return vector;
        }

        getFilteredVector(invalidateNumericCache: boolean)
        {
            var vector = this._dataFrame.getVector(filteredName, invalidateNumericCache);
            return vector;
        }

        //getRecordIndexVector()
        //{
        //    var vector = this._dataFrame.getVector(primaryKeyName, false);
        //    return vector;
        //}

        updateSelectionFromBoxes(origBoxes: BoundingBox[], selectMode?: bps.SelectMode)
        {
            //---- map origBoxes[] shapeIndex to sorted-data-relative boxIndexes[] ----
            if (origBoxes)
            {
                var vectorIndexes = <number[]> [];
                var pkToVectorIndex = this._dataFrame.getPkToVectorIndex();

                for (var i = 0; i < origBoxes.length; i++)
                {
                    var key = origBoxes[i].primaryKey;
                    var vectorIndex = pkToVectorIndex[key];

                    vectorIndexes.push(vectorIndex);
                }

                this.updateSelectionFromVectorIndexes(vectorIndexes, selectMode);
            }
        }

        updateSelectionFromVectorIndexes(indexes: number[], selectMode?: bps.SelectMode)
        {
            if (selectMode === undefined || selectMode === null)
            {
                selectMode = this._selectMode;
            }

            var select = this.getSelectedVector(true);

            if (selectMode === bps.SelectMode.normal)
            {
                //---- clear previous selection ----
                vector.clear(select);
            }

            if (selectMode === bps.SelectMode.subtractive)
            {
                for (var i = 0; i < indexes.length; i++)
                {
                    var recordIndex = indexes[i];
                    select[recordIndex] = 0;
                }
            }
            else if (selectMode === bps.SelectMode.intersection)
            {
                var temp = vp.utils.copyArray(select);

                for (var i = 0; i < indexes.length; i++)
                {
                    var recordIndex = indexes[i];
                    if (temp[recordIndex] === 1)
                    {
                        temp[recordIndex] = 2;
                    }
                }

                //---- tranfer to select ----
                for (var i = 0; i < temp.length; i++)
                {
                    select[i] = (temp[i] === 2) ? 1 : 0;
                }
            }
            else if (selectMode === bps.SelectMode.nonIntersection)
            {
                var temp = vp.utils.copyArray(select);

                for (var i = 0; i < indexes.length; i++)
                {
                    var recordIndex = indexes[i];
                    if (temp[recordIndex] === 1)
                    {
                        temp[recordIndex] = 2;
                    }
                    else
                    {
                        temp[recordIndex] = 1;
                    }
                }

                //---- tranfer to select ----
                for (var i = 0; i < temp.length; i++)
                {
                    select[i] = (temp[i] === 1) ? 1 : 0;
                }
            }
            else if (selectMode === bps.SelectMode.normal || selectMode === bps.SelectMode.additive)
            {
                for (var i = 0; i < indexes.length; i++)
                {
                    var recordIndex = indexes[i];
                    select[recordIndex] = 1;
                }
            }

            this.onSelectionChanged();
        }

        getVectorFromKeys(keys: string[])
        {
            var vector = vp.data.dataRepeat(0, this._recordCount);
            var pkToVectorIndex = this._dataFrame.getPkToVectorIndex();

            for (var i = 0; i < keys.length; i++)
            {
                var pk = keys[i];
                var vi = pkToVectorIndex[pk];

                vector[vi] = 1;      
            }

            return vector;
        }

        //---- set FILTERED-OUT records to the specified list of primary keys ----
        setFilter(filteredOutKeys: string[])
        {
            //---- optimized for speed, so slightly complex ----
            var isDifferent = false;
            var newVector = null;
            var filter = null;

            var noFilter = (!filteredOutKeys || filteredOutKeys.length == 0);
            if (noFilter)
            {
                isDifferent = (this._filteredInCount != this._recordCount);
            }
            else
            {
                //---- must convert keys to vector, and compare vectors ----
                newVector = this.getVectorFromKeys(filteredOutKeys);
                filter = this.getFilteredVector(false);

                isDifferent = vector.compare(filter, newVector);
            }

            if (isDifferent)
            {
                if (!newVector)
                {
                    filter = this.getFilteredVector(false);
                    newVector = this.getVectorFromKeys(filteredOutKeys);
                }

                vector.copy(filter, newVector);
                this.computeFilteredCount();
                this.onDataChanged("filtered");

                //---- since the filter has been changed, invalidate its numeric data cache ----
                this._dataFrame.invalidateCache(filteredName);
            }

            return isDifferent;
        }

        forceFilterChangedEvent()
        {
            this.onDataChanged("filtered");
        }

        /** sets the selection vector to the records described by "selectedPrimaryKeys", without applying any boolean operations. */
        setSelectionDirect(selectedPrimaryKeys: string[], changeSource: string)
        {
            var isDifferent = false;
            var selectVector = null;
            var newVector = null;

            var noSelect = (!selectedPrimaryKeys || selectedPrimaryKeys.length == 0);
            if (noSelect)
            {
                isDifferent = (this._selectedCount > 0);
            }
            else
            {
                //---- must convert keys to vector, and compare vectors ----
                newVector = this.getVectorFromKeys(selectedPrimaryKeys);
                selectVector = this.getSelectedVector(false);

                isDifferent = vector.compare(selectVector, newVector);
            }

            if (isDifferent)
            {
                if (!newVector)
                {
                    selectVector = this.getSelectedVector(false);
                    newVector = this.getVectorFromKeys(selectedPrimaryKeys);
                }

                vector.copy(selectVector, newVector);

                //---- since the selection has been changed, invalidate its numeric data cache ----
                this._dataFrame.invalidateCache(selectedName);

                this.onSelectionChanged(changeSource);
            }

            return isDifferent;
        }

        isolateSelection()
        {
            /// REMINDER: filtered[i] == true (or == 1) means record is filtered OUT of view  
            var select = this.getSelectedVector(false);
            var filter = this.getFilteredVector(true);

            for (var i = 0; i < select.length; i++)
            {
                //---- don't change filter of filtered-out records ----
                if (!filter[i])
                {
                    filter[i] = (1 - select[i]);
                }
            }

            this.computeFilteredCount();
            this.onDataChanged("filtered");

            this.clearSelection();
        }

        excludeSelection()
        {
            /// REMINDER: filtered[i] == true (or == 1) means record is filtered OUT of view  
            var select = this.getSelectedVector(false);
            var filter = this.getFilteredVector(true);

            for (var i = 0; i < select.length; i++)
            {
                //---- don't change filter of filtered-out records ----
                if (! filter[i]) 
                {
                    //---- record is filtered out if it IS selected ----
                    filter[i] = select[i];
                }
            }

            this.computeFilteredCount();
            this.onDataChanged("filtered");

            this.clearSelection();
        }

        getSelectedRecords(applyFilter?: boolean )
        {
            var select = this.getSelectedVector(false);
            var selectedRecords = [];
            var filter = null;

            if (applyFilter)
            {
                filter = this.getFilteredVector(true);
            }

            if (filter && filter.length)
            {
                for (var i = 0; i < select.length; i++)
                {
                    if ((select[i]) && (! filter[i]))
                    {
                        var record = this._dataFrame.getRecordByVectorIndex(i);
                        selectedRecords.push(record);
                    }
                }
            }
            else
            {
                for (var i = 0; i < select.length; i++)
                {
                    if (select[i])
                    {
                        var record = this._dataFrame.getRecordByVectorIndex(i);
                        selectedRecords.push(record);
                    }
                }
            }
            

            return selectedRecords;
        }

        sortData(colName: string, ascending: boolean)
        {
            var colType = this._dataFrame.getColType(colName);

            this._dataFrame.sortVectors(colName, ascending, colType);
            this.onDataChanged("sortOrder");
        }

        resetFilter()
        {
            var filter = this.getFilteredVector(true);
            vector.clear(filter);

            this.computeFilteredCount();
            this.onDataChanged("filtered");
            this.onDataChanged("filterReset");

            //---- this is no longer done in resetFilter ----
            //this.clearSelection();
        }

        clearSelection(omitNotify?: boolean)
        {
            var select = this.getSelectedVector(true);
            vector.clear(select);

            if (!omitNotify)
            {
                this.onSelectionChanged();
            }
        }

        onSelectionChanged(changeSource = "local")
        {
            this.computeSelectedCount();
            this.onDataChanged("selection", undefined, changeSource);

            var select = this.getSelectedVector(false);

            if (changeSource === "local")
            {
                var selectedPrimaryKeys = this._dataFrame.vectorToPrimaryKeys(select);
                this._shareMgr.setSelection(selectedPrimaryKeys);
            }
        }

        getSelectedCount(applyFilter?: boolean)
        {
            var count = this._selectedCount;

            if (applyFilter && this._recordCount !== this._filteredInCount)
            {
                var select = this.getFilteredInVector(selectedName);
                count = vector.countOn(select);
            }

            return count;
        }

        getFilteredInCount()
        {
            return this._filteredInCount;
        }

        getKnownData()
        {
            return this._preloadMgr.getPreloads();
        }

        getPreloadMgr()
        {
            return this._preloadMgr;
        }
    }
}
 