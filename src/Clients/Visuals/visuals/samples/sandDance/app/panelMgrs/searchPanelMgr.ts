//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    searchPanelMgr.ts - manages the "searchPanel.js" floating panel.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{ 
    export class SearchPanelMgr extends JsonControlClass
    {
        private application: AppClass;
        private container: HTMLElement;

        _myRoot: HTMLElement;
        _nodesElem: HTMLElement;

        _searchCol: string;
        _searchValue: string;
        _nextNodeId = 1;
        _searchNodes = [];
        _isIncrementalSearch = false;

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, buttonId: string, colName: string, value = "")
        {
            super();

            this.application = application;
            this.container = container;

            this._searchCol = colName;
            this._searchValue = value;

            var rc = vp.select(container, "." + buttonId).getBounds(false);
            var x = rc.left;
            var y = rc.bottom;

            var jsonPanel = buildJsonPanel(application, settings, container, buttonId, this, "searchPanel", true, x, y);
            this._jsonPanel = jsonPanel;

            jsonPanel.registerForChange("close", (e) =>
            {
                this.onDataChanged("close");
            });

            jsonPanel.isPinnedDown(true);

            var cr = jsonPanel.getRootElem();       //  jsonPanel.getContentRoot();
            var jsRootW = vp.select(cr)

            //---- add border to jsonPanel part ----
            vp.select(jsonPanel.getContentRoot())
                .css("border", "1px solid red")
                .css("margin-bottom", "20px")

            var myRootW = jsRootW.append("td").append("div")
                .css("overflow-x", "hidden")
                .css("overflow-y", "auto")
                .id("contentRoot");

            var nodesW = myRootW.append("div")
                .css("overflow-x", "hide")
                .css("overflow-y", "auto")
                .id("searchNodes")

            this._myRoot = myRootW[0];
            this._nodesElem = nodesW[0];

            jsonPanel.setLongListForSizing("#searchNodes", 200);

            //vp.select(jsonPanel.getRootElem())
            //    .attach("dblclick", (e) =>
            //    {
            //        this.addSearchNode();

            //        vp.events.cancelEventBubble(e);
            //        vp.events.cancelEventDefault(e);
            //    })


            //---- add initial NODE ----
            this.addSearchNode();

            //---- set focus to first search box ----
            vp.select(this._myRoot, ".searchText")[0].focus();
        }

        isIncrementalSearch(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isIncrementalSearch;
            }

            this._isIncrementalSearch = value;
            this.onDataChanged("isIncrementalSearch");
            //this.applySearchQuery();
        }

        addSearchNode()
        {
            var nodesW = vp.select(this._nodesElem)
            var name = "node" + this._nextNodeId++;

            var node = new SearchNodeClass(this.application, this.container, nodesW[0], name);
            node.registerForChange("nodeData", (e) =>
            {
                this.applySearchQuery();
            });

            node.registerForChange("incrementalNodeData", (e) =>
            {
                if (this._isIncrementalSearch)
                {
                    this.applySearchQuery();
                }
            });

            node.registerForChange("closeRequest", (e) =>
            {
                this._searchNodes.remove(node);
                node.close();

                this.applySearchQuery();
            });

            this._searchNodes.push(node);
            //this.applySearchQuery();
        }

        applySearchQuery()
        {
            var spList = <bps.SearchParams[]> [];

            //---- build up a list of search params to apply to selection ----
            for (var i = 0; i < this._searchNodes.length; i++)
            {
                var node = this._searchNodes[i];
                var nd = <SearchNodeData>node.getNodeData();

                var sp = new bps.SearchParams();
                sp.colName = nd.colName;

                if (nd.min !== undefined)
                {
                    sp.minValue = nd.min;
                    sp.maxValue = nd.max;
                    sp.searchType = bps.TextSearchType.betweenInclusive;
                }
                else if (nd.valueList && nd.valueList.length) 
                {
                    sp.minValue = nd.valueList;
                    sp.maxValue = null;
                    sp.searchType = nd.textSearchType;
                    sp.caseSensitiveSearch = nd.textCaseSensitive;

                    if (nd.textSearchType == bps.TextSearchType.contains)
                    {
                        //---- passing an array forces an exact match, so pass our single value as such ----
                        sp.minValue = nd.valueList[0];

                        //if (this._isIncrementalSearch)
                        //{
                        //    sp.searchType = bps.TextSearchType.startsWith;
                        //}
                    }
                }
                else
                {
                    continue;
                }

                sp.searchAction = bps.SearchAction.selectMatches;
                spList.push(sp);
            }

            if (spList.length > 0)
            {
                /*appClass.instance*/this.application._bpsHelper.searchEx(spList);
            }
            else
            {
                /*appClass.instance*/this.application._bpsHelper.clearSelection();
            }
        }

        searchCol(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._searchCol;
            }

            this._searchCol = value;
            this.onDataChanged("searchCol");
        }

        searchValue(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._searchValue;
            }

            this._searchValue = value;
            this.onDataChanged("searchValue");
        }

        showAt(x: number, y: number, x2?: number, y2?: number)
        {
            this._jsonPanel.showAt(x, y, x2, y2);
        }

        getJsonPanel()
        {
            return this._jsonPanel;
        }

        close()
        {
            this._jsonPanel.close();
        }

    }

    export class SearchNodeData
    {
        name: string;           // friendly name of node   (node1, etc.)
        colName: string;
        colType: string;
        min: number;
        max: number;
        valueList: string[];
        textSearchType: bps.TextSearchType;
        textCaseSensitive: boolean;

        constructor(name: string, type: string)
        {
            this.name = name;
            this.colType = type;

            this.textSearchType = bps.TextSearchType.exactMatch;
        }
    }

    export class SearchQuery
    {
        name: string;
        created: Date;
        NodeSelector: SearchNodeData[];
    }
}