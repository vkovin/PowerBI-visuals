//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    appSettingsMgr.ts - manages the application setting parameters.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class AppSettingsMgr extends beachParty.DataChangerClass 
    {
        private container: HTMLElement;

        public undoMgr: UndoMgrClass;
        private application: AppClass;

        _bpsHelper: bps.ChartHostHelperClass;
        _isSavingSettingsDisabled = true;
        _persistChangesDisabledFromUrlParams = false;
        _appStyleSheet: vp.dom.styleSheetClass;

        //---- settings ----
        _shapeColor: string;
        _shapeOpacity = AppClass.defaultOpacity;
        _shapeImage: string;
        _canvasColor = "black";
        _drawingPrimitive: bps.DrawPrimitive = bps.DrawPrimitive.cube;
        _instancingParams = new bps.InstancingParams();
        _isContinuousDrawing = false;
        _isChartPanelOpen = false;
        _chartFrameData: bps.ChartFrameData;
        _animationData: bps.AnimationData;
        _hoverParams: bps.HoverParams;
        _isTooltipsEnabled = true;
        _hoverOnDetailView: boolean;
        _hoverOnMouseMove: boolean;
        _selectionParams: bps.SelectionParams;
        _isMenuTextVisible: boolean;
        _isMenuIconVisible: boolean;
        _isMenuChevronVisible: boolean;
        _isColPickerSorted = true;
        _panelOpacity: number;
        _is3dGridAlwaysOn = false;
        _isWheelInertia = true;
        _showWheelDuringTransformMode = false;
        _isLightingAlwaysOn = false;
        _lightingParams = new bps.Lighting();
        _defaultBins = 9;
        _useNiceNumbers = false;
        _playbackDuration: number;
        _isPlaybackLooping: boolean;
        _rememberLastFile = true;
        _rememberLastSession = true;
        _initFileParams: bps.WorkingDataParams;
        _initialChartType: bps.ChartType;
        _initialLayout = bps.Layout.Random;
        _isShowingDrawStats = false;
        _isShowingLastCycle = false;
        _isShowingEventStats = false;
        _isErrorReportingDisabled = false;
        _automatedTestName = "demoVoteTest.js";
        _axisLabelStyle: string;
        _legendLabelStyle: string;
        _predefinedCustomChart = "Squarify";
        _showCountsInColPicker: boolean;
        _showTypesInColPicker: boolean;
        _mapByColorChannels: boolean;
        _isScriptsEnabled: boolean;
        _isUserLoggingEnabled: boolean;

        //---- experimental features ----
        _is3dNavEnabled: boolean;
        _isSelectionModeEnabled: boolean;
        _isNewViewEnabled: boolean;
        _isScrubberEnabled: boolean;
        _isClusteringEnabled: boolean;
        _iconWidth: number;
        _iconOpacity: number;
        _isRedoEnabled: boolean;
        _isDataTipEnabled: boolean;
        _isSlicerEnabled: boolean;
        _isShapeByEnabled: boolean;
        _isSizeByEnabled: boolean;
        _isTextByEnabled: boolean;
        _isLineByEnabled: boolean;
        _isTourEnabled: boolean;
        _runTourOnStartUp: boolean;
        _dataCacheParams: bps.DataCacheParams;

        //---- core charts ----
        _isGridEnabled: boolean;
        _isColumnEnabled: boolean;
        _isScatterEnabled: boolean;
        _isDensityEnabled: boolean;
        _isStacksEnabled: boolean;
        _isSquarifyEnabled: boolean;

        //---- experimental charts ----
        _isRandomEnabled: boolean;
        _isPoissonEnabled: boolean;
        _isSpiralEnabled: boolean;
        _isLineEnabled: boolean;
        _isRadialEnabled: boolean;
        _isXbandEnabled: boolean;
        _isYbandEnabled: boolean;
        _isScatter3DEnabled: boolean;
        _isBarEnabled: boolean;
        _isViolinEnabled: boolean;
        _isCustomEnabled: boolean;

        private saveSettingsHandler: (settings: any, type: sandDance.SettingsType) => void;
        private loadSettingsHandler: (type: sandDance.SettingsType) => any;

        constructor(application: AppClass, container: HTMLElement, bpsHelper: bps.ChartHostHelperClass, saveSettingsHandler: (settings: any, type: sandDance.SettingsType) => void, loadSettingsHandler: (type: sandDance.SettingsType) => any) {
            super();

            this.application = application;
            this.container = container;

            this.saveSettingsHandler = saveSettingsHandler;
            this.loadSettingsHandler = loadSettingsHandler;

            this._bpsHelper = bpsHelper;

            this._appStyleSheet = new vp.dom.styleSheetClass()
                .id("appStyleSheet");

            this._hoverParams = new bps.HoverParams();
            this._selectionParams = new bps.SelectionParams();
        }

        /** apply default values to all persisted app properties. */
        resetAppSettings()
        {
            this._isSavingSettingsDisabled = true;

            //---- CHART tab ----
            this.shapeColor("#0cf");
            this.shapeImage("none");
            this.canvasColor("black");
            this.drawingPrimitive("cube");      // "auto");
            this.isContinuousDrawing(false);
            this.isChartPanelOpen(false);
            this.isInstancingEnabled(true);

            this._chartFrameData = new bps.ChartFrameData();
            this._chartFrameData.padding = { left: 1, top: 1, right: 15, bottom: 1 };
            this.chartFrameOpacity(1);

            //---- FEATURES tab ----
            this._is3dNavEnabled = true;
            this._isSelectionModeEnabled = false;
            this._isNewViewEnabled = false;
            this._isScrubberEnabled = false;
            this._isClusteringEnabled = false;
            this._isRedoEnabled = false;
            this._isDataTipEnabled = true;
            this._isSlicerEnabled = false;
            this._isShapeByEnabled = false;
            this._isSizeByEnabled = false;
            this._isTextByEnabled = false;
            this._isLineByEnabled = false;
            this._isTourEnabled = true;
            this._mapByColorChannels = false;
            this._isScriptsEnabled = false;
            this._isUserLoggingEnabled = false;

            //---- CHARTS tab ----
            this._isGridEnabled = true;
            this._isColumnEnabled = true;
            this._isScatterEnabled = true;
            this._isDensityEnabled = true;
            this._isStacksEnabled = true;
            this._isSquarifyEnabled = true;

            this._isRandomEnabled = false;
            this._isPoissonEnabled = false;
            this._isSpiralEnabled = false;
            this._isLineEnabled = false;
            this._isRadialEnabled = false;
            this._isXbandEnabled = false;
            this._isYbandEnabled = false;
            this._isScatter3DEnabled = false;
            this._isBarEnabled = false;
            this._isViolinEnabled = false;
            this._isCustomEnabled = false;

            //---- ANIMATION tab ----
            var ad = new bps.AnimationData();
            this._animationData = ad;

            //---- HOVER tab ----
            this._hoverParams = new bps.HoverParams();
            this.isTooltipsEnabled(false);
            this.hoverOnDetailView(true);
            this.hoverOnMouseMove(false);

            //---- SELECTION tab ----
            this._selectionParams = new bps.SelectionParams();

            //---- UI tab ----
            this.isMenuTextVisible(true);
            this.isMenuIconVisible(false);
            this.iconWidth(30);
            this.iconOpacity(1);
            this.isMenuChevronVisible(false);
            this.axisLabelStyle("font: 16px Calibri; fill: white;");
            this.legendLabelStyle("font: 16px Calibri; color: white;");
            this.isColPickerSorted(true);
            this.panelOpacity(1);
            this.showCountsInColPicker(false);
            this.showTypesInColPicker(true);

            //---- 3D tab ----
            this.is3dGridAlwaysOn(false);
            this.isWheelInertia(true);
            this.showWheelDuringTransformMode(false);
            this.isLightingAlwaysOn(false);
            this.ambientLightLevel(.25);

            //---- DATA tab ----
            this._dataCacheParams = new bps.DataCacheParams();
            this._dataCacheParams.cacheLocalFiles = true;
            this._dataCacheParams.cacheWebFiles = true;
            this.useNiceNumbers(false);
            this.defaultBins(9);

            //---- INSIGHT tab ----
            this.playbackDuration(3);
            this.isPlaybackLooping(true);

            //---- STARTUP tab ----
            this.rememberLastFile(true);
            this.rememberLastSession(false);       // turn OFF until it gets more stable
            this._initFileParams = null;//new bps.WorkingDataParams("Titanic", null, "known");        // for shipping, need a faster loaded dataset
            this.initialChartType("Column");
            this.initialLayout("Grid");
            this._runTourOnStartUp = false;//true      // not surfaced on tab

            //---- DEBUG tab ----
            this.isShowingDrawStats(false);
            this.isShowingLastCycle(false);
            this.isShowingEventStats(false);
            this.isErrorReportingDisabled(false);

            //---- CHART OPTIONS panel ----
            this.predefinedCustomChart("Squarify");

            this._isSavingSettingsDisabled = false;
        }

        saveAppSettings()
        {
            if (!this._isSavingSettingsDisabled && !this._persistChangesDisabledFromUrlParams)
            {
                var appSettings = new AppSettings(AppClass.buildId);

                //---- FEATURES tab ----
                appSettings.is3dNavEnabled = this._is3dNavEnabled;
                appSettings.isSelectionModeEnabled = this._isSelectionModeEnabled;
                appSettings.isNewViewEnabled = this._isNewViewEnabled;
                appSettings.isScrubberEnabled = this._isScrubberEnabled;
                appSettings.isClusteringEnabled = this._isClusteringEnabled;
                appSettings.isRedoEnabled = this._isRedoEnabled;
                appSettings.isDataTipEnabled = this._isDataTipEnabled;
                appSettings.isSlicerEnabled = this._isSlicerEnabled;
                appSettings.isShapeByEnabled = this._isShapeByEnabled;
                appSettings.isSizeByEnabled = this._isSizeByEnabled;
                appSettings.isTextByEnabled = this._isTextByEnabled;
                appSettings.isLineByEnabled = this._isLineByEnabled;
                appSettings.isTourEnabled = this._isTourEnabled;
                appSettings.runTourOnStartUp = this._runTourOnStartUp;
                appSettings.mapByColorChannels = this._mapByColorChannels;
                appSettings.isScriptsEnabled = this._isScriptsEnabled;
                appSettings.isUserLoggingEnabled = this._isUserLoggingEnabled;

                //---- CHARTS tab----
                appSettings.isGridEnabled = this._isGridEnabled;
                appSettings.isColumnEnabled = this._isColumnEnabled;
                appSettings.isScatterEnabled = this._isScatterEnabled;
                appSettings.isDensityEnabled = this._isDensityEnabled;
                appSettings.isStacksEnabled = this._isStacksEnabled;
                appSettings.isSquarifyEnabled = this._isSquarifyEnabled;

                appSettings.isRandomEnabled = this._isRandomEnabled;
                appSettings.isPoissonEnabled = this._isPoissonEnabled;
                appSettings.isSpiralEnabled = this._isSpiralEnabled;
                appSettings.isLineEnabled = this._isLineEnabled;
                appSettings.isRadialEnabled = this._isRadialEnabled;
                appSettings.isXbandEnabled = this._isXbandEnabled;
                appSettings.isYbandEnabled = this._isYbandEnabled;
                appSettings.isScatter3DEnabled = this._isScatter3DEnabled;
                appSettings.isBarEnabled = this._isBarEnabled;
                appSettings.isViolinEnabled = this._isViolinEnabled;
                appSettings.isCustomEnabled = this._isCustomEnabled;

                appSettings.isShowingDrawStats = this._isShowingDrawStats;
                appSettings.isShowingLastCycle = this._isShowingLastCycle;
                appSettings.isShowingEventStats = this._isShowingEventStats;
                appSettings.isErrorReportingDisabled = this._isErrorReportingDisabled;

                appSettings.shapeColor = this._shapeColor;
                appSettings.shapeImage = this._shapeImage;
                appSettings.canvasColor = this._canvasColor;

                //---- startup settings ----
                appSettings.rememberLastFile = null; //this._rememberLastFile;
                appSettings.rememberLastSession = this._rememberLastSession;

                if (this._rememberLastFile)
                {
                    appSettings.lastFileParams = null;///*appClass.instance*/this.application.getCurrentFileParams();
                }

                appSettings.initialChartType = this._initialChartType;
                appSettings.initialLayout = this._initialLayout;

                //---- UI ----
                appSettings.isColPickerSorted = this._isColPickerSorted;
                appSettings.showCountsInColPicker = this._showCountsInColPicker;
                appSettings.showTypesInColPicker = this._showTypesInColPicker;
                appSettings.playbackDuration = this._playbackDuration;
                appSettings.isPlaybackLooping = this._isPlaybackLooping;

                appSettings.isWheelInertia = this._isWheelInertia;
                appSettings.isLightingAlwaysOn = this._isLightingAlwaysOn;
                appSettings.ambientLightLevel = this.ambientLightLevel();
                appSettings.isContinuousDrawing = this._isContinuousDrawing;
                appSettings.isChartPanelOpen = this._isChartPanelOpen;
                appSettings.isInstancingEnabled = this._instancingParams.isInstancingEnabled;
                appSettings.isTooltipsEnabled = this._isTooltipsEnabled;
                appSettings.hoverOnDetailView = this._hoverOnDetailView;
                appSettings.hoverOnMouseMove = this._hoverOnMouseMove;
                appSettings.is3dGridAlwaysOn = this._is3dGridAlwaysOn;
                appSettings.showWheelDuringTransformMode = this._showWheelDuringTransformMode;

                appSettings.isMenuTextVisible = this._isMenuTextVisible;
                appSettings.isMenuIconVisible = this._isMenuIconVisible;
                appSettings.iconWidth = this._iconWidth;
                appSettings.iconOpacity = this._iconOpacity;

                appSettings.isMenuChevronVisible = this._isMenuChevronVisible;
                appSettings.axisLabelStyle = this._axisLabelStyle;
                appSettings.legendLabelStyle = this._legendLabelStyle;
                appSettings.predefinedCustomChart = this._predefinedCustomChart;
                appSettings.drawingPrimitive = this.drawingPrimitive();
                appSettings.panelOpacity = this.panelOpacity();

                appSettings.dataCacheParams = this._dataCacheParams;
                appSettings.useNiceNumbers = this.useNiceNumbers();
                appSettings.hoverParams = this._hoverParams;
                appSettings.selectionParams = this._selectionParams;

                appSettings.defaultBins = this.defaultBins();

                appSettings.animationData = this._animationData;
                appSettings.chartFrameData = this._chartFrameData;

                this.saveSettingsHandler(appSettings, sandDance.SettingsType.application);

//                 var str = JSON.stringify(appSettings);
// 
//                 beachParty.localStorageMgr.save(beachParty.StorageType.appSettings, null, null, str);
            }
        }

        getLastSessionKey()
        {
            return "$lastSession";
        }

        saveSessionToLocalStorage()
        {
            var preload = this.undoMgr.getCurrentInsight();

            if (preload)
            {
                preload.name = "$lastSession";
            }

//             var strPreload = JSON.stringify(preload);
// 
//                 beachParty.localStorageMgr.save(beachParty.StorageType.sessionShare,
//                     beachParty.StorageSubType.lastSessionState, null, strPreload);

            this.saveSettingsHandler(preload, sandDance.SettingsType.session);
        }

        loadSettingUndef(appSettings: AppSettings, name: string)
        {
            var setting = appSettings[name];
            if (setting !== undefined)
            {
                this[name](setting);
            }
        }

        loadSettingGetter(appSettings: AppSettings, name: string)
        {
            var setting = appSettings[name];
            if (setting !== undefined && setting != this[name]())
            {
                this[name](setting);
            }
        }

        loadSettingDirect(appSettings: AppSettings, name: string)
        {
            var setting = appSettings[name];
            if (setting !== undefined && setting != this["_"+name])
            {
                this[name](setting);
            }
        }

        loadAppSettings()
        {
            // var str = beachParty.localStorageMgr.get(beachParty.StorageType.appSettings, null, null);
            if (true)//str && str != "")
            {
                this._isSavingSettingsDisabled = true;

                try
                {
                    var appSettings = this.loadSettingsHandler && this.loadSettingsHandler(sandDance.SettingsType.application);//<AppSettings>JSON.parse(str);

                    //---- only use if versionNum of appSettings is the same as the current version ----
                    if (appSettings.versionNum == AppClass.buildId)
                    {
                        //---- FEATURES TAB ----
                        this.loadSettingDirect(appSettings, "is3dNavEnabled");
                        this.loadSettingDirect(appSettings, "isSelectionModeEnabled");
                        this.loadSettingDirect(appSettings, "isNewViewEnabled");
                        this.loadSettingDirect(appSettings, "isScrubberEnabled");
                        this.loadSettingDirect(appSettings, "isClusteringEnabled");
                        this.loadSettingDirect(appSettings, "isRedoEnabled");
                        this.loadSettingDirect(appSettings, "isDataTipEnabled");
                        this.loadSettingDirect(appSettings, "isSlicerEnabled");
                        this.loadSettingDirect(appSettings, "isShapeByEnabled");
                        this.loadSettingDirect(appSettings, "isSizeByEnabled");
                        this.loadSettingDirect(appSettings, "isTextByEnabled");
                        this.loadSettingDirect(appSettings, "isLineByEnabled");
                        this.loadSettingDirect(appSettings, "isTourEnabled");
                        this.loadSettingDirect(appSettings, "runTourOnStartUp");
                        this.loadSettingDirect(appSettings, "mapByColorChannels");
                        this.loadSettingDirect(appSettings, "isScriptsEnabled");
                        this.loadSettingDirect(appSettings, "isUserLoggingEnabled");

                        //---- CHARTS tab ----
                        this.loadSettingDirect(appSettings, "isGridEnabled");
                        this.loadSettingDirect(appSettings, "isColumnEnabled");
                        this.loadSettingDirect(appSettings, "isScatterEnabled");
                        this.loadSettingDirect(appSettings, "isDensityEnabled");
                        this.loadSettingDirect(appSettings, "isStacksEnabled");
                        this.loadSettingDirect(appSettings, "isSquarifyEnabled");

                        this.loadSettingDirect(appSettings, "isRandomEnabled");
                        this.loadSettingDirect(appSettings, "isPoissonEnabled");
                        this.loadSettingDirect(appSettings, "isSpiralEnabled");
                        this.loadSettingDirect(appSettings, "isLineEnabled");
                        this.loadSettingDirect(appSettings, "isRadialEnabled");
                        this.loadSettingDirect(appSettings, "isXbandEnabled");
                        this.loadSettingDirect(appSettings, "isYbandEnabled");
                        this.loadSettingDirect(appSettings, "isScatter3DEnabled");
                        this.loadSettingDirect(appSettings, "isBarEnabled");
                        this.loadSettingDirect(appSettings, "isViolinEnabled");
                        this.loadSettingDirect(appSettings, "isCustomEnabled");

                        this.loadSettingDirect(appSettings, "isShowingDrawStats");
                        this.loadSettingDirect(appSettings, "isShowingLastCycle");
                        this.loadSettingDirect(appSettings, "isShowingEventStats");
                        this.loadSettingDirect(appSettings, "isErrorReportingDisabled");
                        this.loadSettingDirect(appSettings, "shapeColor");
                        this.loadSettingDirect(appSettings, "canvasColor");
                        this.loadSettingDirect(appSettings, "isColPickerSorted");
                        this.loadSettingDirect(appSettings, "showCountsInColPicker");
                        this.loadSettingDirect(appSettings, "showTypesInColPicker");
                        this.loadSettingDirect(appSettings, "playbackDuration");
                        this.loadSettingDirect(appSettings, "isPlaybackLooping");

                        this.loadSettingDirect(appSettings, "rememberLastFile");
                        this.loadSettingDirect(appSettings, "rememberLastSession");
                        this.loadSettingDirect(appSettings, "cacheLocalFiles");
                        this.loadSettingDirect(appSettings, "cacheWebFiles");
                        this.loadSettingDirect(appSettings, "initialChartType");
                        this.loadSettingDirect(appSettings, "initialLayout");

                        this.loadSettingDirect(appSettings, "isWheelInertia");
                        this.loadSettingDirect(appSettings, "isLightingAlwaysOn");
                        this.loadSettingDirect(appSettings, "ambientLightLevel");
                        this.loadSettingDirect(appSettings, "isContinuousDrawing");
                        this.loadSettingDirect(appSettings, "isChartPanelOpen");
                        this.loadSettingDirect(appSettings, "isInstancingEnabled");
                        this.loadSettingDirect(appSettings, "showWheelDuringTransformMode");

                        this.loadSettingDirect(appSettings, "drawingPrimitive");
                        this.loadSettingDirect(appSettings, "isMenuTextVisible");
                        this.loadSettingDirect(appSettings, "panelOpacity");
                        this.loadSettingDirect(appSettings, "isMenuIconVisible");
                        this.loadSettingDirect(appSettings, "isMenuChevronVisible");
                        this.loadSettingDirect(appSettings, "iconWidth");
                        this.loadSettingDirect(appSettings, "iconOpacity");

                        this.loadSettingUndef(appSettings, "legendLabelStyle");
                        this.loadSettingDirect(appSettings, "axisLabelStyle");
                        this.loadSettingDirect(appSettings, "predefinedCustomChart");
                        this.loadSettingDirect(appSettings, "isTooltipsEnabled");
                        this.loadSettingDirect(appSettings, "hoverOnDetailView");
                        this.loadSettingDirect(appSettings, "hoverOnMouseMove");
                        this.loadSettingDirect(appSettings, "is3dGridAlwaysOn");

                        this.loadSettingDirect(appSettings, "shapeImage");
                        this.loadSettingDirect(appSettings, "defaultBins");
                        this.loadSettingDirect(appSettings, "useNiceNumbers");

                        //---- PARAM loading ----
                        if (appSettings.hoverParams !== undefined && appSettings.hoverParams != this._hoverParams)
                        {
                            this._hoverParams = appSettings.hoverParams;
                            this.onHoverParamsChanged();
                        }

                        if (appSettings.selectionParams !== undefined && appSettings.selectionParams != this._selectionParams)
                        {
                            this._selectionParams = appSettings.selectionParams;
                            this.onSelectionParamsChanged();
                        }

                        if (appSettings.lastFileParams)
                        {
                            this._initFileParams = appSettings.lastFileParams;
                        }

                        if (appSettings.animationData)
                        {
                            this._animationData = appSettings.animationData;
                            this.onAnimationDataChanged();
                        }

                        if (appSettings.chartFrameData)
                        {
                            this._chartFrameData = appSettings.chartFrameData;
                            this.onChartFrameDataChanged();
                        }

                    }
                    else
                    {
                        this.application.deleteLocalStorageInfo();
                    }
                }
                finally
                {
                    this._isSavingSettingsDisabled = false;
                }
            }
        }

        shapeColor(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._shapeColor;
            }

            this._shapeColor = value;

            this.onShapeColorChanged();
        }

        onShapeColorChanged()
        {
            var cr = (this._shapeColor === "beach blue" || this._shapeColor === "beachblue") ? "#0cf" : this._shapeColor;
            this._bpsHelper.setShapeColor(cr);

            this.application.onAppShapeColorChanged();
            this.saveAppSettings();

            this.onDataChanged("shapeColor");
        }

        shapeImage(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._shapeImage;
            }

            if (value != this._shapeImage)
            {
                this._shapeImage = value;
                this.onShapeImageChanged();
            }
        }

        onShapeImageChanged()
        {
            var value = this._shapeImage;

            this._bpsHelper.setShapeImage(value);
            this.saveAppSettings();

            this.onDataChanged("shapeImage");
        }

        canvasColor(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._canvasColor;
            }

            this._canvasColor = value;

            this.onCanvasColorChanged();
        }

        onCanvasColorChanged()
        {
            var cr = (this._canvasColor === "beach blue" || this._canvasColor === "beachblue") ? "#0cf" : this._canvasColor;
            this._bpsHelper.setCanvasColor(cr);
            this.saveAppSettings();

            this.onDataChanged("canvasColor");
        }

        drawingPrimitive(value?: string)
        {
            if (arguments.length === 0)
            {
                return bps.DrawPrimitive[this._drawingPrimitive];
            }

            var dpValue = bps.DrawPrimitive[value];
            if (dpValue !== this._drawingPrimitive)
            {
                this._drawingPrimitive = dpValue;
                this.saveAppSettings();

                this.application.setActualDrawingPrimitive();

                this.onDataChanged("drawingPrimitive");
            }
        }

        isContinuousDrawing(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isContinuousDrawing;
            }

            this._isContinuousDrawing = value;
            this._bpsHelper.setContinuousDrawing(value);

            this.onDataChanged("isContinuousDrawing");
            this.saveAppSettings();
        }

        isChartPanelOpen(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isChartPanelOpen;
            }

            this._isChartPanelOpen = value;

            this.onDataChanged("isChartPanelOpen");
            this.saveAppSettings();
        }

        is3dNavEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._is3dNavEnabled;
            }

            this._is3dNavEnabled = value;
            /*/*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("is3dNavEnabled");
            this.saveAppSettings();
        }

        showCountsInColPicker(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._showCountsInColPicker;
            }

            this._showCountsInColPicker = value;

            this.onDataChanged("showCountsInColPicker");
            this.saveAppSettings();
        }

        showTypesInColPicker(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._showTypesInColPicker;
            }

            this._showTypesInColPicker = value;

            this.onDataChanged("showTypesInColPicker");
            this.saveAppSettings();
        }

        mapByColorChannels(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._mapByColorChannels;
            }

            this._mapByColorChannels = value;

            this.onDataChanged("mapByColorChannels");
            this.saveAppSettings();
        }

        isScriptsEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isScriptsEnabled;
            }

            this._isScriptsEnabled = value;
            /*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("isScriptsEnabled");
            this.saveAppSettings();
        }

        isUserLoggingEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isUserLoggingEnabled;
            }

            this._isUserLoggingEnabled = value;

            this.onDataChanged("isUserLoggingEnabled");
            this.saveAppSettings();
        }

        isSelectionModeEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isSelectionModeEnabled;
            }

            this._isSelectionModeEnabled = value;
            /*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("isSelectionModeEnabled");
            this.saveAppSettings();
        }

        isNewViewEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isNewViewEnabled;
            }

            this._isNewViewEnabled = value;
            /*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("isNewViewEnabled");
            this.saveAppSettings();
        }

        isScrubberEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isScrubberEnabled;
            }

            this._isScrubberEnabled = value;
            /*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("isScrubberEnabled");
            this.saveAppSettings();
        }

        isClusteringEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isClusteringEnabled;
            }

            this._isClusteringEnabled = value;
            /*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("isClusteringEnabled");
            this.saveAppSettings();
        }

        isRedoEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isRedoEnabled;
            }

            this._isRedoEnabled = value;
            /*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("isRedoEnabled");
            this.saveAppSettings();
        }

        isDataTipEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isDataTipEnabled;
            }

            this._isDataTipEnabled = value;
            /*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("isDataTipEnabled");
            this.saveAppSettings();
        }

        isSlicerEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isSlicerEnabled;
            }

            this._isSlicerEnabled = value;
            /*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("isSlicerEnabled");
            this.saveAppSettings();
        }

        isShapeByEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isShapeByEnabled;
            }

            this._isShapeByEnabled = value;
            /*appClass.instance*/this.application.markBigBarBuildNeeded();

            this.onDataChanged("isShapeByEnabled");
            this.saveAppSettings();
        }

        isSizeByEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isSizeByEnabled;
            }

            this._isSizeByEnabled = value;
            /*appClass.instance*/this.application.markBigBarBuildNeeded();

            this.onDataChanged("isSizeByEnabled");
            this.saveAppSettings();
        }

        isTextByEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isTextByEnabled;
            }

            this._isTextByEnabled = value;
            /*appClass.instance*/this.application.markBigBarBuildNeeded();

            this.onDataChanged("isTextByEnabled");
            this.saveAppSettings();
        }

        isLineByEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isLineByEnabled;
            }

            this._isLineByEnabled = value;
            /*appClass.instance*/this.application.markBigBarBuildNeeded();

            this.onDataChanged("isLineByEnabled");
            this.saveAppSettings();
        }

        isTourEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isTourEnabled;
            }

            this._isTourEnabled = value;
            /*appClass.instance*/this.application.markIconBarBuildNeeded();

            this.onDataChanged("isTourEnabled");
            this.saveAppSettings();
        }

        runTourOnStartUp(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._runTourOnStartUp;
            }

            this._runTourOnStartUp = value;

            this.onDataChanged("runTourOnStartUp");
            this.saveAppSettings();
        }

        isGridEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isGridEnabled;
            }

            this._isGridEnabled = value;
            this.onDataChanged("isGridEnabled");
            this.saveAppSettings();
        }

        isColumnEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isColumnEnabled;
            }

            this._isColumnEnabled = value;
            this.onDataChanged("isColumnEnabled");
            this.saveAppSettings();
        }

        isScatterEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isScatterEnabled;
            }

            this._isScatterEnabled = value;
            this.onDataChanged("isScatterEnabled");
            this.saveAppSettings();
        }

        isDensityEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isDensityEnabled;
            }

            this._isDensityEnabled = value;
            this.onDataChanged("isDensityEnabled");
            this.saveAppSettings();
        }

        isStacksEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isStacksEnabled;
            }

            this._isStacksEnabled = value;
            this.onDataChanged("isStacksEnabled");
            this.saveAppSettings();
        }

        isSquarifyEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isSquarifyEnabled;
            }

            this._isSquarifyEnabled = value;
            this.onDataChanged("isSquarifyEnabled");
            this.saveAppSettings();
        }

        isRandomEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isRandomEnabled;
            }

            this._isRandomEnabled = value;
            this.onDataChanged("isRandomEnabled");
            this.saveAppSettings();
        }



        isPoissonEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isPoissonEnabled;
            }

            this._isPoissonEnabled = value;
            this.onDataChanged("isPoissonEnabled");
            this.saveAppSettings();
        }

        isSpiralEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isSpiralEnabled;
            }

            this._isSpiralEnabled = value;
            this.onDataChanged("isSpiralEnabled");
            this.saveAppSettings();
        }

        isLineEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isLineEnabled;
            }

            this._isLineEnabled = value;
            this.onDataChanged("isLineEnabled");
            this.saveAppSettings();
        }

        isRadialEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isRadialEnabled;
            }

            this._isRadialEnabled = value;
            this.onDataChanged("isRadialEnabled");
            this.saveAppSettings();
        }

        isXbandEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isXbandEnabled;
            }

            this._isXbandEnabled = value;
            this.onDataChanged("isXbandEnabled");
            this.saveAppSettings();
        }

        isYbandEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isYbandEnabled;
            }

            this._isYbandEnabled = value;
            this.onDataChanged("isYbandEnabled");
            this.saveAppSettings();
        }

        isScatter3DEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isScatter3DEnabled;
            }

            this._isScatter3DEnabled = value;
            this.onDataChanged("isScatter3DEnabled");
            this.saveAppSettings();
        }

        isBarEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isBarEnabled;
            }

            this._isBarEnabled = value;
            this.onDataChanged("isBarEnabled");
            this.saveAppSettings();
        }

        isViolinEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isViolinEnabled;
            }

            this._isViolinEnabled = value;
            this.onDataChanged("isViolinEnabled");
            this.saveAppSettings();
        }

        isCustomEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isCustomEnabled;
            }

            this._isCustomEnabled = value;
            this.onDataChanged("isCustomEnabled");
            this.saveAppSettings();
        }


        isInstancingEnabled(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._instancingParams.isInstancingEnabled;
            }

            this._instancingParams.isInstancingEnabled = value;
            this._bpsHelper.setInstancingParams(this._instancingParams);

            this.onDataChanged("IsInstancingEnabled");
            this.saveAppSettings();
        }

        chartFrameOpacity(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._chartFrameData.opacity;
            }

            this._chartFrameData.opacity = value;

            this.onDataChanged("chartFrameOpacity");
            this.onChartFrameDataChanged();
        }

        onChartFrameDataChanged()
        {
            this.saveAppSettings();
            this._bpsHelper.setChartFrameData(this._chartFrameData);
        }

        isAnimationEnabled(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._animationData.isAnimationEnabled;
            }

            this._animationData.isAnimationEnabled = value;
            this.onAnimationDataChanged();

            this.onDataChanged("isAnimationEnabled");
        }

        isStaggeringEnabled(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._animationData.isStaggeringEnabled;
            }

            this._animationData.isStaggeringEnabled = value;
            this.onAnimationDataChanged();

            this.onDataChanged("isStaggeringEnabled");
        }

        easeFunction(value?: string)
        {
            if (arguments.length === 0)
            {
                return bps.EaseFunction[this._animationData.easeFunction];
            }

            this._animationData.easeFunction = bps.EaseFunction[value];
            this.onAnimationDataChanged();

            this.onDataChanged("easeFunction");
        }

        easeType(value?: string)
        {
            if (arguments.length === 0)
            {
                return bps.EaseType[this._animationData.easeType];
            }

            this._animationData.easeType = bps.EaseType[value];
            this.onAnimationDataChanged();

            this.onDataChanged("easeType");
        }

        animationDuration(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._animationData.animationDuration;
            }

            this._animationData.animationDuration = value;
            this.onAnimationDataChanged();

            this.onDataChanged("animationDuration");
        }

        maxStaggerTime(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._animationData.maxStaggerTime;
            }

            this._animationData.maxStaggerTime = value;
            this.onAnimationDataChanged();

            this.onDataChanged("maxStaggerTime");
        }

        onAnimationDataChanged()
        {
            this.saveAppSettings();
            this._bpsHelper.setAnimationData(this._animationData);
        }

        hoverMatch(value?: string)
        {
            if (arguments.length === 0)
            {
                return bps.HoverMatch[this._hoverParams.hoverMatch];
            }

            this._hoverParams.hoverMatch = bps.HoverMatch[value];

            this.onDataChanged("hoverMatch");
            this.onHoverParamsChanged();
        }

        hoverEffect(value?: string)
        {
            if (arguments.length === 0)
            {
                return bps.HoverEffect[this._hoverParams.hoverEffect];
            }

            this._hoverParams.hoverEffect = bps.HoverEffect[value];

            this.onDataChanged("hoverEffect");
            this.onHoverParamsChanged();
        }

        hoverColor(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._hoverParams.hoverColor;
            }

            this._hoverParams.hoverColor = value;

            this.onDataChanged("hoverColor");
            this.onHoverParamsChanged();
        }

        hoverSize(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._hoverParams.squareSize;
            }

            this._hoverParams.squareSize = value;

            this.onDataChanged("hoverSize");
            this.onHoverParamsChanged();
        }

        onHoverParamsChanged()
        {
            this._bpsHelper.setHoverParams(this._hoverParams);
            this.saveAppSettings();
        }

        predefinedCustomChart(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._predefinedCustomChart;
            }

            value = AppUtils.capitalizeFirstLetter(value);
            this._predefinedCustomChart = value;

            if (/*appClass.instance*/this.application._chartIsLoaded)
            {
                /*appClass.instance*/this.application.changeToChart(value, "Grid", Gesture.click, null, true);
            }

            this.onDataChanged("predefinedCustomChart");
        }

        isTooltipsEnabled(value?: boolean)
        {
            if (arguments.length === 0)
            {
                var enabled = (this._isTooltipsEnabled && !this.application._isEngineDrawing);
                return enabled;
            }

            this._isTooltipsEnabled = value;

            this.onDataChanged("isTooltipsEnabled");
            this.saveAppSettings();
        }

        hoverOnDetailView(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._hoverOnDetailView;
            }

            this._hoverOnDetailView = value;

            this.onDataChanged("hoverOnDetailView");
            this.saveAppSettings();
        }

        hoverOnMouseMove(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._hoverOnMouseMove;
            }

            this._hoverOnMouseMove = value;

            this.onDataChanged("hoverOnMouseMove");
            this.saveAppSettings();
        }

        selectedColorEffect(value?: string)
        {
            if (arguments.length === 0)
            {
                return bps.ColorEffect[this._selectionParams.selectedParams.colorEffect];
            }

            this._selectionParams.selectedParams.colorEffect = bps.ColorEffect[value];
            this.onDataChanged("selectedColorEffect");

            this.onSelectionParamsChanged();
        }

        unselectedColorEffect(value?: string)
        {
            if (arguments.length === 0)
            {
                return bps.ColorEffect[this._selectionParams.unselectedParams.colorEffect];
            }

            this._selectionParams.unselectedParams.colorEffect = bps.ColorEffect[value];
            this.onDataChanged("unselectedColorEffect");

            this.onSelectionParamsChanged();
        }

        selectedColor(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._selectionParams.selectedParams.color;
            }

            this._selectionParams.selectedParams.color = value;
            this.onDataChanged("selectedColor");

            this.onSelectionParamsChanged();
        }

        unselectedColor(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._selectionParams.unselectedParams.color;
            }

            this._selectionParams.unselectedParams.color = value;
            this.onDataChanged("unselectedColor");

            this.onSelectionParamsChanged();
        }

        selectedColorFactor(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._selectionParams.selectedParams.colorFactor;
            }

            this._selectionParams.selectedParams.colorFactor = value;
            this.onDataChanged("selectedColorFactor");

            this.onSelectionParamsChanged();
        }

        unselectedColorFactor(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._selectionParams.unselectedParams.colorFactor;
            }

            this._selectionParams.unselectedParams.colorFactor = value;
            this.onDataChanged("unselectedColorFactor");

            this.onSelectionParamsChanged();
        }

        onSelectionParamsChanged()
        {
            this._bpsHelper.setSelectionParams(this._selectionParams);
            this.saveAppSettings();
        }

        isMenuTextVisible(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isMenuTextVisible;
            }

            this._isMenuTextVisible = value;
            this.saveAppSettings();

            this.adjustMenuButtonRules();

            this.onDataChanged("isMenuTextVisible");
            /*appClass.instance*/this.application.layoutScreen();            // make sure everything lines up after change
        }

        adjustMenuButtonRules()
        {
            var showText = this._isMenuTextVisible;
            var showChevron = this._isMenuChevronVisible;
            var showIcon = this._isMenuIconVisible;

            //---- nudge down iconbar 10 pixels when icons are not showing ----
            vp.select(this.container, ".iconBar").css("margin-top", (showIcon) ? "0px" : "5px");

            if (showText)
            {
                this._appStyleSheet.addRule(".comboTextRow", (showIcon) ? "display: block" : "display: table-cell");
            }
            else
            {
                //vp.select("#iconBarRow")
                this._appStyleSheet.addRule(".comboTextRow", "display: none");
            }

            if (showIcon)
            {
                this._appStyleSheet.addRule(".comboIconHolder", "display: block");
            }
            else
            {
                this._appStyleSheet.addRule(".comboIconHolder", "display: none");
            }

            if (showChevron)
            {
                this._appStyleSheet.addRule(".comboChevron", "display: inline-block");
            }
            else
            {
                this._appStyleSheet.addRule(".comboChevron", "display: none");
            }
        }

        isMenuIconVisible(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isMenuIconVisible;
            }

            this._isMenuIconVisible = value;
            this.saveAppSettings();

            this.adjustMenuButtonRules();

            this.onDataChanged("isMenuIconVisible");
            /*appClass.instance*/this.application.layoutScreen();            // make sure everything lines up after change
        }

        isMenuChevronVisible(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._isMenuChevronVisible;
            }

            this._isMenuChevronVisible = value;
            this.saveAppSettings();

            this.adjustMenuButtonRules();

            this.onDataChanged("isMenuChevronVisible");
        }

        axisLabelStyle(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._axisLabelStyle;
            }

            this._axisLabelStyle = value;
            this.saveAppSettings();

            //---- need to send this to engine ----
            //this._appStyleSheet.addRule(".chevronOfCombo", "display: inline-block");
            //}
            //else
            //{
            //    this._appStyleSheet.addRule(".chevronOfCombo", "display: none");
            //}

            //---- send this rule to engine so it can apply it to axis labels ----
            var rule = ".vpxAxisLabel { " + value + "}";
            this._bpsHelper.addStyleSheet(rule);

            this.onDataChanged("axisLabelStyle");
        }

        legendLabelStyle(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._legendLabelStyle;
            }

            this._legendLabelStyle = value;
            this.saveAppSettings();

            //---- need to send this to engine ----
            this._appStyleSheet.addRule(".legendLabel", value);
            this._appStyleSheet.addRule(".legendTitle", value);

            //---- apply new font to legends ----
            /*appClass.instance*/this.application.rebuildLegends();

            this.onDataChanged("legendLabelStyle");
        }

        iconWidth(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._iconWidth;
            }

            this._iconWidth = value;
            this._appStyleSheet.addRule(".comboIcon", "width: " + value + "px");

            this.onDataChanged("iconWidth");
        }

        iconOpacity(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._iconOpacity;
            }

            this._iconOpacity = value;
            this._appStyleSheet.addRule(".iconOfCombo", "opacity: " + value);

            this.onDataChanged("iconOpacity");
        }

        isColPickerSorted(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isColPickerSorted;
            }

            this._isColPickerSorted = value;

            this.onDataChanged("isColPickerSorted");
            this.saveAppSettings();
        }

        panelOpacity(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._panelOpacity;
            }

            this._panelOpacity = value;
            this.onDataChanged("panelOpacity");
            this.saveAppSettings();
        }

        is3dGridAlwaysOn(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._is3dGridAlwaysOn;
            }

            this._is3dGridAlwaysOn = value;
            this.onDataChanged("is3dGridAlwaysOn");
            this.saveAppSettings();

            this.on3dViewChanged();
        }

        on3dViewChanged()
        {
            var chartName = /*appClass.instance*/this.application._chartName;

            //var isLightingChart =  (chartName == "Density" || chartName == "Radial" || chartName == "Violin" ||
            //    chartName == "Stacks" || chartName == "Scatter-3D" || chartName == "Scatter");

            var isLightingChart = (chartName === "Stacks" || chartName === "Scatter-3D");

            var use3DGrid = (chartName == "Stacks" || chartName == "Scatter-3D");

            this._lightingParams.isLightingEnabled = (this._isLightingAlwaysOn || isLightingChart);
            this.onLightingParamsChanged();

            this.saveAppSettings();

            var use3dGrid = (this._is3dGridAlwaysOn || use3DGrid);
            this._bpsHelper.set3dGridVisible(use3dGrid);
        }

        isWheelInertia(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isWheelInertia;
            }

            this._isWheelInertia = value;
            this._bpsHelper.setWheelInertia(value);

            this.saveAppSettings();
            this.onDataChanged("isWheelInertia");
        }

        showWheelDuringTransformMode(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._showWheelDuringTransformMode;
            }

            this._showWheelDuringTransformMode = value;
            this._bpsHelper.showWheelDuringTransformMode(value);

            this.onDataChanged("showWheelDuringTransformMode");
            this.saveAppSettings();
        }

        isLightingAlwaysOn(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isLightingAlwaysOn;
            }

            this._isLightingAlwaysOn = value;
            this.onDataChanged("isLightingAlwaysOn");

            this.on3dViewChanged();
        }

        ambientLightLevel(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._lightingParams.ambientLight.lightFactor;
            }

            this._lightingParams.ambientLight.lightFactor = value;
            this.onDataChanged("ambientLightLevel");

            this.onLightingParamsChanged();
        }

        onLightingParamsChanged()
        {
            this._bpsHelper.setLightingParams(this._lightingParams);
        }

        cacheLocalFiles(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._dataCacheParams.cacheLocalFiles;
            }

            this._dataCacheParams.cacheLocalFiles = value;
            this.onDataChanged("cacheLocalFiles");
            this.onDataCacheChanged();
            this.saveAppSettings();
        }

        cacheWebFiles(value?: boolean)
        {
            if (arguments.length == 0)
            {
                return this._dataCacheParams.cacheWebFiles;
            }

            this._dataCacheParams.cacheWebFiles = value;
            this.onDataChanged("cacheWebFiles");
            this.onDataCacheChanged();
            this.saveAppSettings();
        }

        onDataCacheChanged()
        {
            this._bpsHelper.setDataCacheParams(this._dataCacheParams);
        }

        useNiceNumbers(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._useNiceNumbers;
            }

            this._useNiceNumbers = value;
            this.onDataChanged("useNiceNumbers");
            this.saveAppSettings();

            this.application.onUseNiceNumbersChanged();
        }

        defaultBins(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._defaultBins;
            }

            this._defaultBins = value;
            this.onDataChanged("defaultBins");
            this.saveAppSettings();

            this.application.applyDefaultBins();
        }

        playbackDuration(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._playbackDuration;
            }

            this._playbackDuration = value;
            this.saveAppSettings();

            this.application.onAppPlaybackDurationChanged();

            this.onDataChanged("playbackDuration");
        }

        isPlaybackLooping(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isPlaybackLooping;
            }

            this._isPlaybackLooping = value;
            this.saveAppSettings();

            this.application.onAppPlaybackLoopngChanged();

            this.onDataChanged("isPlaybackLooping");
        }

        rememberLastFile(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._rememberLastFile;
            }

            this._rememberLastFile = value;
            this.onDataChanged("rememberLastFile");
            this.saveAppSettings();
        }

        rememberLastSession(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._rememberLastSession;
            }

            this._rememberLastSession = value;
            this.onDataChanged("rememberLastSession");
            this.saveAppSettings();
        }

        initialChartType(value?: string)
        {
            if (arguments.length === 0)
            {
                //---- translate to string ----
                return bps.ChartType[this._initialChartType];
            }

            //---- translate to enum ----
            this._initialChartType = bps.ChartType[value];
            this.onDataChanged("initialChartType");
            this.saveAppSettings();
        }

        initialLayout(value?: string)
        {
            if (arguments.length === 0)
            {
                return bps.Layout[this._initialLayout];
            }

            this._initialLayout = bps.Layout[value];
            this.onDataChanged("initialLayout");
            this.saveAppSettings();
        }

        isShowingDrawStats(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isShowingDrawStats;
            }

            this._isShowingDrawStats = value;
            this._bpsHelper.setChartDebugInfo(value);
            this.saveAppSettings();

            this.onDataChanged("isShowingDrawStats");
        }

        isShowingLastCycle(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isShowingLastCycle;
            }

            this._isShowingLastCycle = value;

            vp.select(this.container, ".lastCycleFPS").css("display", (value) ? "" : "none");
            this.saveAppSettings();

            this.onDataChanged("isShowingLastCycle");
        }

        isShowingEventStats(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isShowingEventStats;
            }

            this._isShowingEventStats = value;

            vp.select(this.container, ".eventStats").css("display", (value) ? "" : "none");
            this.saveAppSettings();

            this.onDataChanged("isShowingEventStats");
        }

        isErrorReportingDisabled(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._isErrorReportingDisabled;
            }

            this._isErrorReportingDisabled = value;
            this.saveAppSettings();

            this.onDataChanged("isErrorReportingDisabled");
        }

        showXGridLines(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._chartFrameData.xAxis.drawGridLines;
            }

            this._chartFrameData.xAxis.drawGridLines = value;

            this.onDataChanged("showXGridLines");

            this.onChartFrameDataChanged();
        }

        showYGridLines(value?: boolean)
        {
            if (arguments.length === 0)
            {
                return this._chartFrameData.yAxis.drawGridLines;
            }

            this._chartFrameData.yAxis.drawGridLines = value;

            this.onDataChanged("showYGridLines");
            this.onChartFrameDataChanged();
        }

        shapeOpacity(value?: number)
        {
            if (arguments.length === 0)
            {
                return this._shapeOpacity;
            }

            this._shapeOpacity = value;

            this.application.onAppShapeOpacityChanged();

            this._bpsHelper.setShapeOpacity(value);
            this.onDataChanged("shapeOpacity");
        }

        automatedTestName(value?: string)
        {
            if (arguments.length === 0)
            {
                return this._automatedTestName;
            }

            this._automatedTestName = value;
            this.onDataChanged("automatedTestName");
        }

        /** Reset all persisted app settings. */
        resetSettingsAndReloadData()
        {
            this.resetAppSettings();
            this.saveAppSettings();

            ///*appClass.instance*/this.application.loadInitialDataSet();

            //---- refresh the page ----
            // location.reload();
        }

    }

    export class AppSettings
    {
        //---- to enforce latest default settings and new features, we set the "versionNum" to the build num that created it. ----
        versionNum: string;        

        //---- FEATURES tab ----
        is3dNavEnabled: boolean;
        isSelectionModeEnabled: boolean;
        isNewViewEnabled: boolean;
        isScrubberEnabled: boolean;
        isClusteringEnabled: boolean;
        isRedoEnabled: boolean;
        isDataTipEnabled: boolean;
        isSlicerEnabled: boolean;
        isShapeByEnabled: boolean;
        isSizeByEnabled: boolean;
        isTextByEnabled: boolean;
        isLineByEnabled: boolean;
        isTourEnabled: boolean;
        runTourOnStartUp: boolean;
        mapByColorChannels: boolean;
        isScriptsEnabled: boolean;
        isUserLoggingEnabled: boolean;

        //---- CHARTS tab ----
        isGridEnabled: boolean;
        isColumnEnabled: boolean;
        isScatterEnabled: boolean;
        isDensityEnabled: boolean;
        isStacksEnabled: boolean;
        isSquarifyEnabled: boolean;

        isRandomEnabled: boolean;
        isPoissonEnabled: boolean;
        isSpiralEnabled: boolean;
        isLineEnabled: boolean;
        isRadialEnabled: boolean;
        isXbandEnabled: boolean;
        isYbandEnabled: boolean;
        isScatter3DEnabled: boolean;
        isBarEnabled: boolean;
        isViolinEnabled: boolean;
        isCustomEnabled: boolean;

        //---- ANIMATION tab ----
        animationData: bps.AnimationData; 

        //---- 3D tab ----
        is3dGridAlwaysOn: boolean;
        isWheelInertia: boolean;
        showWheelDuringTransformMode: boolean;
        isLightingAlwaysOn: boolean;
        ambientLightLevel: number;

        //---- HOVER tab ----
        hoverParams: bps.HoverParams;
        isTooltipsEnabled: boolean;
        hoverOnDetailView: boolean;
        hoverOnMouseMove: boolean;

        //---- SELECTION tab ----
        selectionParams: bps.SelectionParams;

        //---- CHART tab ----
        shapeColor: string;
        shapeImage: string;
        canvasColor: string;
        drawingPrimitive: string;
        isColPickerSorted: boolean;
        isContinuousDrawing: boolean;
        isChartPanelOpen: boolean;
        isInstancingEnabled: boolean;
        chartFrameData: bps.ChartFrameData;

        //---- UI tab ----
        isMenuTextVisible: boolean;
        isMenuIconVisible: boolean;
        iconWidth: number;
        iconOpacity: number;
        isMenuChevronVisible: boolean;
        axisLabelStyle: string;
        legendLabelStyle;
        sortColumnsInPicker: boolean;
        panelOpacity: number;
        showCountsInColPicker: boolean;
        showTypesInColPicker: boolean;

        //---- DATA tab ----
        dataCacheParams: bps.DataCacheParams;
        useNiceNumbers: boolean;
        defaultBins: number;

        //---- INSIGHT tab ----
        playbackDuration: number;
        isPlaybackLooping: boolean;

        //---- STARTUP tab ----
        rememberLastFile: boolean;
        rememberLastSession: boolean;
        lastFileParams: bps.WorkingDataParams;
        initialChartType: bps.ChartType;
        initialLayout: bps.Layout;

        //---- DEBUG tab ----
        isShowingDrawStats: boolean;
        isShowingLastCycle: boolean;
        isShowingEventStats: boolean;
        isErrorReportingDisabled: boolean;

        //---- CHART OPTIONS tab ----
        predefinedCustomChart: string;

        constructor(versionNum: string)
        {
            this.versionNum = versionNum;
        }
    }
}