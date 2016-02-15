//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    searchUtils.ts - some functions to help search calls when clicking on axes or legends.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module searchUtils
{
    export function getValueOfBin(binResults: beachParty.BinResult, index: number)
    {
        var value = null;
        var useMax = false;

        //---- the last tick has an index that is one too large ----
        if (index >= binResults.bins.length)
        {
            index = binResults.bins.length - 1;
            useMax = true;
        }

        var bin = binResults.bins[index];

        if (bin.otherKeys)
        {
            value = bin.otherKeys;
        }
        else if (bin instanceof beachParty.BinInfoNum)
        {
            var numBin = <beachParty.BinInfoNum>bin;

            //---- to support sorted numeric bins, we need to keep both min/max (ascending min values are insufficient) ----
            //value = (useMax) ? numBin.max : numBin.min;
            value = { min: numBin.min, max: numBin.max };
        }
        else
        {
            value = bin.name;
        }

        //vp.utils.debug("getValueOfBin: index=" + index + ", value=" + value);

        return value;
    }

    export function buildSearchInfoOnElem(element: any, labelList: string[], record: any,
        binResults: beachParty.BinResult, index: number, colName: string, isCategory: boolean, axisName,
        buttonType: string, isLast: boolean)
    {
        var isBar = (buttonType == "bar");

        var value = null;
        if (index >= 0)
        {
            var valueIndex = (buttonType == "bar") ? index - 1 : index;

            if (binResults)
            {
                value = this.getValueOfBin(binResults, index);
            }
            else
            {
                value = record.breakValue;
            }
        }

        //---- bar[0] is a dummy, so use prev label on Click ----
        if (isBar)
        {
            index--;
        }

        //---- bar[0] is a dummy, so don't add last label (will be a duplicate) ----
        if (true)       // !isBar || !isLast)
        {
            labelList.push(value);
        }

        var infoObj = <any>{};
        element._infoObj = infoObj;

        infoObj.labelList = labelList;
        infoObj.labelIndex = index;
        infoObj.colName = colName;
        infoObj.axisName = axisName;
        infoObj.buttonType = buttonType;
        infoObj.isCategory = isCategory;
        infoObj.isLast = isLast;
        infoObj.useCategoryForBins = (binResults) ? binResults.useCategoryForBins : false;
    }

    export function searchOnTickOrBarClick(e)
    {
        var elem = e.target;
        var infoObj = <any>elem._infoObj;

        //---- extract info stuff into element when we built in ----
        var labels = infoObj.labelList;
        var index = infoObj.labelIndex;
        var colName = infoObj.colName;
        var axisName = infoObj.axisName;
        var buttonType = infoObj.buttonType;
        var isCategory = infoObj.isCategory;
        var isLast = infoObj.isLast;
        var useCategoryForBins = infoObj.useCategoryForBins;

        var sp = new utils.SearchParamsEx();
        sp.buttonType = buttonType;
        sp.buttonIndex = index;
        sp.axisName = axisName;
        sp.colName = colName;
        sp.caseSensitiveSearch = false;
        sp.searchAction = bps.SearchAction.selectMatches;

        var isBar = (buttonType == "bar");

        //---- there are 8 cases to handle (3 variables: isCategory, bin/value, bar/tick) ----
        searchOnBarClick(elem, sp, isLast, labels, index, isCategory, isBar, useCategoryForBins);

        return sp;
    }

    function searchOnBarClick(elem, sp: utils.SearchParamsEx, isLast: boolean, labels: string[],
        index: number, isCategory: boolean, isBar: boolean, useCategoryForBins: boolean)
    {
        if (isCategory)
        {
            //---- CATEGORY ----
            sp.minValue = labels[index];        // could be string or string[]
            sp.maxValue = null;
            sp.searchType = bps.TextSearchType.exactMatch;
        }
        else
        {
            //---- NUMBER (or date) ----
            var labelCount = labels.length;
            sp.searchType = bps.TextSearchType.geqValueAndLessValue2;

            var value = <any>labels[index];

            if (value.min !== undefined)
            {
                //---- BIN: use min/max pair from a COLUMN type plt ----
                var diff = (useCategoryForBins) ? 1 : 2;
                if (isLast || (!isBar && index >= labels.length - diff))
                {
                    index = labels.length - 1;
                    sp.searchType = bps.TextSearchType.betweenInclusive;
                    value = <any>labels[index];
                }

                sp.minValue = value.min;
                sp.maxValue = value.max;
            }
            else
            {
                //---- BREAK VALUE: use list of break values from SCATTER type plot ----
                if (isLast || (!isBar && index >= labels.length - 2))
                {
                    index = labels.length - 2;
                    sp.searchType = bps.TextSearchType.betweenInclusive;
                }

                sp.minValue = labels[index];
                sp.maxValue = labels[index + 1];
            }

        }
    }

}

