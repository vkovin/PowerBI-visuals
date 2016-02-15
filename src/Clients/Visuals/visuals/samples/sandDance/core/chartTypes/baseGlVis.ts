//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    baseVis.ts - base class for webGL based visualzations.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachParty
{
    import LayoutResult = bps.LayoutResult;

    function round(value: number)
    {
        return Math.round(value);
    }

    //------------------------------------
    // Chart Layout rules:
    //     see scaterPlot.ts
    //------------------------------------

    //-------------------------------------------------------------------------------------------
    // ideas for making this class smaller (current size: 4200 lines):
    //  - programMgr    - handles the gl program & shaders
    //  - buildMgr      - handles the "build chart" process
    //  - textureMgr    - handles all apsects of textures
    //  - uniformMgr    - handles the creation and setting of gl uniform variables
    //  - hitTestMgr    - handles all hit-testing
    //  - frameMgr      - handles all animation cycle stuff (moveFrame, drawFrame)
    //  - perfMgr       - handles all perf timing/reporting
    //-------------------------------------------------------------------------------------------

    export class BaseGlVisClass extends DataChangerClass      //implements IDataViewer
    {
        //---- managers (these help divide up the work done by this class) ---- 
        private _bufferMgr: BufferMgrClass; 

        private appMgr: AppMgrClass;
        private container: HTMLElement;

        //---- PROGRAM / SHADER stuff ----
        private _vertexShaderId: string;
        private _fragmentShaderId: string;
        private _shapesProgram: any;
        private _gridLinesProgram: any;

        //---- CONTEXT ----
        private _gl: WebGLRenderingContext = null;
        private _glInst: ANGLE_instanced_arrays;
        private _ctx: CanvasRenderingContext2D;
        private _tm: bps.TextMappingData;
        private _lm: bps.LineMappingData;

        //---- TEXTURES ----
        /// we treat textures differently than other attributes because texture creation is expensive.  
        /// to make it all work out, we need these variables:
        _texture1: WebGLTexture;
        _texture2: WebGLTexture;
        _textureCount1: number;
        _textureCount2: number;
        _mostRecentTexture: WebGLTexture;
        _mostRecentTextureCount = 0;
        _needTextureSwap = false;
        _shapeMappingPalette: string[];
        _texPalette: string[];

        //---- COLOR palette ----
        _colorFloats: Float32Array;
        _colorFloats2: Float32Array;
        _colorPalette: any[];
        _clearColor = [0, 0, 0];
        _maxColors = 2;
        _maxColors2 = 2;
        private _primaryColorCount = 0;
        private _isChannelLast = false;

        //---- PER SHAPE stuff ----
        private _layoutResults = <LayoutResult[]>[];                // for building chart repro data (stored in Insights)
        private _pkToDrawIndex = null;
        private _textRects = [];
        //private _boundingBoxes = <BoundingBox[]>[];
        private _boundingBoxMgr: BoundingBoxMgrClass;

        //---- what to gather on each draw cycle ----
        private _buildLayoutResults = false;
        private _buildBoundingBoxes = true;

        //---- GL ATTRIBUTES ----
        //_vertexCount = 0;
        private _verticesPerRecord = 1;
        private _lastVerticesPerRecord: number = null;

        //---- BUFFERS ----
        _drawPrimitive: bps.DrawPrimitive;              // set from view
        //_usingPointCubes = false;
        _drawOrderKey = "none";
        _drawInfos: DrawInfo[]; 

        //---- CHART stuff ----
        _chartOptions: any;
        _chartClass: string;
        _prevChartClass: string;
        _chartFrameHelper: ChartFrameHelperClass;
        _hideAxes = <any> false;
        _gridLinesBuffer = null;
        _view: DataViewClass;
        private _svgChartGroup: SVGGElement;
        _requestedChartName: string;                // e.g., "cluster" when chart is a scatterPlot
        _prepassDc: DrawContext;                    // draw context captured during prepass (for use by subsequent transforms that need to rebuild chartFrame)

        //---- UNIFORM (shader constants) ----
        private _uniforms: any = {};
        private _isBlendingEnabled = false;
        private _instantSizeChange = false;
        private _firstChartBuilt = false;
        //_uniformsChanged: UniformsChanged;
        private _isCullingEnabled = true;

        //---- this is the total size of our chart ----
        _canvasWidth = 1;
        _canvasHeight = 1;

        //---- CHART FRAME SIZE (and our 2d/3d canvas elements) ----
        private _frameWidth = 1;
        private _frameHeight = 1;
        private _frameLeft = 0;
        private _frameTop = 0;

        //---- HIT TESTING ----
        private _lastRayHitTestInfo = null;
        private _lastRectHitTestInfo = null;
        private _lastWorld: Float32Array = null;
        private _lerpWorld: Float32Array = null;
        private _hitTestCount = 0;          // for this chart

        //---- FILTERING ----
        /// design of TWO STAGE FILTERING:
        ///
        ///   FORWARD: when new filter is being applied
        ///   REVERSE: when filter is being reset 
        ///
        ///    FORWARD stage one: 
        ///         - baseGlVis: store PREV filter in dc.layoutFilterVector
        ///         - chart layout: normal layout (using dc.layoutFilterVector)
        ///         - baseGlVis: use NEW filter for moving OUT records to bottom of screen
        ///    FORWARD stage two: 
        ///         - baseGlVis: store NEW filter in dc.layoutFilterVector
        ///         - chart layout: normal layout 
        ///         - baseGlVis: use NEW filter for moving OUT records to bottom of screen
        ///
        ///    REVERSE stage one: 
        ///         - baseGlVis: store NEW filter in dc.layoutFilterVector
        ///         - chart layout: normal layout 
        ///         - baseGlVis: use PREV filter for moving OUT records to bottom of screen
        ///    REVERSE stage two: 
        ///         - chart layout: normal layout 
        ///         - baseGlVis: use NEW filter for moving OUT records to bottom of screen

        //---- 2-stage filter/layout ----
        private _isFirstFilteredStage = false;
        private _isForwardFilter = true;
        private _prevFilter: NumericVector;
        private _nv: NamedVectors;

        //---- manages the projection, view, and world matrices for our class ----
        _transformer: TransformerClass;

        //---- DATA ----
        private _dataMgr: DataMgrClass;
        _dataFrame: DataFrameClass;
        private _maxRecords = 0;

        //---- chart BUILD FLAGS ----
        private _enableBuildNeededMarkOnNextFrame = false;        
        private _buildNeeded = false;
        private _rebuildCamera = false;
        //private _rebuildTexture = false;
        private _rebuildAttrBuffers = false;
        private _omitAnimOnNextBuild = false;
        _refreshData = false;
        _isSelectionChangeOnly = false;
        _markBuildNeededCount = 0;            // for current draw
        _isDrawNeeded = false;
        _buildTimer = null;             // start of chart building now happen
        _isLastDrawOfCycle = false;

        //---- FACETS ----
        public _facetHelper: FacetHelperClass = null;
        _facetLabelRects = [];

        //---- misc LAST flags ----
        _opacityLast = 1;
        _sizeFactorLast = 1;

        //---- ANIMATION TIMING ----
        private _animationData: bps.AnimationData;
        private _toPercentUneased = 1;
        private _toStartTime = 0;
        private _isCycleActive = false;
        private _isUiOpActive = false;          // if a drag-based 3D transform is active (keep animation running)
        private _isInertiaActive = false;       // if initeria is continuously applying a 3D transform
        private _isContinuousDrawing: boolean;         // set from view
        _toPercent = 1;
        _animCycleCount = 0;
        private _toPercentUnflipped: number;
        private _maxPercent = 0;
        private _isSmoothLast = false;          // isSmooth setting from last anim cycle
        private _animTimer = null;
        _easeFunction: any;
        _easeType: bps.EaseType;

        //---- PERF STATS ----
        private _drawPerf = <any>{};
        _buildPerf = <any>{};
        _drawFrameStatsMsg = null;
        _lastFrameTime = 0;
        _lastCycleFrameRate = 0;
        _lastCycleFrameCount = 0;
        _frameCount = 0;
        _frameRate = 0;
        _renderCount = 0;
        _moveFrameCount = 0;
        _drawFrameCount = 0;
        _cycleFrameCount = 0;
        _nextBuildId = 0;

        constructor(chartClass: string, view: DataViewClass, gl: any, chartState: ChartState, container: HTMLElement, appMgr: AppMgrClass)
        {
            super();

            this.appMgr = appMgr;
            this.container = container;

            this._chartClass = chartClass;
            this._view = view;
            this._gl = gl;

            this.init(chartState);
        }

        init(chartState: ChartState)
        {
            var view = this._view;

            this.applyChartState(chartState);

            if (this._bufferMgr)
            {
                this._bufferMgr._baseGlVis = this;
            }

            if (!this._boundingBoxMgr)
            {
                this._boundingBoxMgr = new BoundingBoxMgrClass();
            }

            //this._uniformsChanged = new UniformsChanged();

            this._dataMgr = view.getDataMgr();
            this._svgChartGroup = view.getSvgChartGroup();

            if (!this._bufferMgr)
            {
                this._bufferMgr = new BufferMgrClass(this._gl, this._glInst, this._dataMgr, this);
            }

            this.registerForEvents();

            var transformMgr = view.getTransformMgr();
            this._transformer = transformMgr.getTransformer();      //   new glUtils.transformerClass(gl);

            this.buildChartFrameHelper();

            this.onCanvasColorChanged();
            this.onShapeOpacityChanged();
            this.onContinuousDrawingChanged();

            //this.onTextureLoaded(null, 0);     // may have to change when switching charts
            //this.checkForTexPaletteChanged();
            this.checkForTexPaletteChanged();

            buildCubeMesh();

            this.onEaseFunctionChanged();

            //this.buildAndUseGlProgram();

            this.onDrawPrimitiveChanged(false, false);      // true);

            this._bufferMgr.createGlAttributes(this._shapesProgram, false);

            this.createGlUniforms();
            this.onBoundsOrCameraChanged();

            this.onFacetsChanged();
            this.onAnimationDataChanged();

            //---- start the first build of the chart ----
            if (!this._dataFrame)
            {
                this._refreshData = true;
            }

            //---- initially set transform for a 2D view ----
            view.getTransformMgr().resetTransform();            // animated thru normal animation cycle and this._lastWorld

            //this.markBuildNeeded();
        }

        private registerForEvents()
        {
            var view = this._view;
            this._view.registerForRemovableChange("shapeOpacity", this, () => this.onShapeOpacityChanged());
            this._view.registerForRemovableChange("textOpacity", this, () => this.onShapeOpacityChanged());
            this._view.registerForRemovableChange("canvasColor", this, () => this.onCanvasColorChanged());
            this._view.registerForRemovableChange("shapeColor", this, () => this.markBuildNeeded("shapeColor"));
            this._view.registerForRemovableChange("animationData", this, () => this.onAnimationDataChanged());
            this._view.registerForRemovableChange("chartFrameData", this, () => this.markBuildNeeded("chartFrameData"));
            this._view.registerForRemovableChange("shapeImageName", this, () => this.checkForTexPaletteChanged());
            this._view.registerForRemovableChange("isShapeImageEnabled", this, () => this.markDrawNeeded("isShapeImageEnabled"));
            this._view.registerForRemovableChange("sizeFactor", this, () => this.onSizeFactorChanged());
            this._view.registerForRemovableChange("sizeFactorWithAnimation", this, () => this.markBuildNeeded("sizeFactorWithAnimation"));
            this._view.registerForRemovableChange("separationFactor", this, () => this.markBuildNeeded("separationFactor"));
            this._view.registerForRemovableChange("defaultShapeSize", this, () => this.markBuildNeeded("defaultShapeSize"));
            this._view.registerForRemovableChange("isMaxItemCountEnabled", this, () => this.markBuildNeeded("isMaxItemCountEnabled"));
            this._view.registerForRemovableChange("maxItemCount", this, () => this.markBuildNeeded("maxItemCount"));

            this._view.registerForRemovableChange("colorMapping", this, () => this.markBuildNeeded("colorMapping"));
            this._view.registerForRemovableChange("sizeMapping", this, () => this.markBuildNeeded("sizeMapping"));
            this._view.registerForRemovableChange("textMapping", this, () => this.markBuildNeeded("textMapping"));
            this._view.registerForRemovableChange("lineMapping", this, () => this.markBuildNeeded("lineMapping"));
            this._view.registerForRemovableChange("flatParams", this, () => this.markBuildNeeded("flatParams"));
            this._view.registerForRemovableChange("spiralParams", this, () => this.markBuildNeeded("spiralParams"));
            this._view.registerForRemovableChange("customParams", this, () => this.markBuildNeeded("customParams"));
            this._view.registerForRemovableChange("facetMapping", this, () => this.onFacetsChanged());
            this._view.registerForRemovableChange("shapeMapping", this, () => this.onShapeMappingChanged());

            this._view.registerForRemovableChange("xMapping", this, () => this.onColMappingsChanged());
            this._view.registerForRemovableChange("yMapping", this, () => this.onColMappingsChanged());
            this._view.registerForRemovableChange("zMapping", this, () => this.onColMappingsChanged());
            this._view.registerForRemovableChange("auxMapping", this, () => this.onColMappingsChanged());

            this._view.registerForRemovableChange("toPercentOverride", this, () => this.onToPercetOverrideChanged());

            this._dataMgr.registerForRemovableChange("sortOrder", this, () => this.onSortOrderChanged());
            this._dataMgr.registerForRemovableChange("selection", this, () => this.onSelectionChanged());
            this._dataMgr.registerForRemovableChange("filtered", this, () => this.onFilteredChanged(true));
            this._dataMgr.registerForRemovableChange("filterReset", this, () => this.onFilteredChanged(false));

            //---- special handling ----
            this._view.registerForRemovableChange("isOrthoCamera", this, () => this.onBoundsOrCameraChanged());
            this._view.registerForRemovableChange("dataFrame", this, () => this.onDataFrameChanged());
            this._view.registerForRemovableChange("isContinuousDrawing", this, () => this.onContinuousDrawingChanged());
            this._view.getTransformMgr().registerForRemovableChange("isInertiaEnabled", this, () => this.onInertiaChanged());
            this._view.getTransformMgr().registerForRemovableChange("uiOpStart", this, () => this.onUiOp(true));
            this._view.getTransformMgr().registerForRemovableChange("uiOpStop", this, () => this.onUiOp(false));
            this._view.registerForRemovableChange("drawingPrimitive", this, () => this.onDrawPrimitiveChanged(true, false));
            this._view.registerForRemovableChange("glInst", this, () => this.onDrawPrimitiveChanged(true, false));
            this._view.registerForRemovableChange("isCullingEnabled", this, () => this.computeCulling());
            this._view.registerForRemovableChange("hoverPrimaryKey", this, () => this.markDrawNeeded("hoverPrimaryKey"));
            this._view.registerForRemovableChange("lightingParams", this, () => this.markDrawNeeded("lightingParams"));

        }

        onEaseFunctionChanged()
        {
            var ad = this._view.animationData();
            this._easeFunction = utils.getEasingFunction(ad.easeFunction);
        }

        getChartState(): ChartState
        {
            var chartState = new ChartState();

            var keys = vp.utils.keys(chartState);

            for (var i = 0; i < keys.length; i++)
            {
                var key = keys[i];
                var value = this[key];

                chartState[key] = value;
            }

            return chartState;
        }

        applyChartState(chartState: ChartState)
        {
            if (chartState)
            {
                var keys = vp.utils.keys(chartState);

                for (var i = 0; i < keys.length; i++)
                {
                    var key = keys[i];
                    var value = chartState[key];

                    this[key] = value;
                }
            }
        }

        onSelectionChanged()
        {
            if (this._markBuildNeededCount === 0)
            {
                this._isSelectionChangeOnly = true;
            }

            if (this._isSelectionChangeOnly)
            {
                this.markBuildNeeded("onSelectionChanged");
                this._isSelectionChangeOnly = true;
            }
            else
            {
                this.markBuildNeeded("onSelectionChanged");
            }
        }

        buildChartFrameHelper()
        {
            if (!this._chartFrameHelper)
            {
                var chartFrameGroup = this._view.getSvgChartFrameGroup();

                this._chartFrameHelper = new ChartFrameHelperClass(this.appMgr, chartFrameGroup, this._dataMgr,
                    this._transformer);
            }
        }

        getBoundingBoxMgr()
        {
            return this._boundingBoxMgr;
        }

        onAnimationDataChanged()
        {
            this._animationData = this._view.animationData();
            this._easeType = this._animationData.easeType;

            this.onEaseFunctionChanged();

            //this.markBuildNeeded();
        }

        onCanvasColorChanged()
        {
            var cr = this._view.canvasColor();
            var clearColor = vp.color.getColorFromString(cr);

            var crArray = vp.color.makeColorArrayForWebGL(clearColor);
            this._clearColor = crArray;

            this.markBuildNeeded("onCanvasColorChanged");
        }

        onShapeMappingChanged()
        {
            var newPalette: string[] = null;

            var im = this._view.shapeMapping();
            if (im && im.colName)
            {
                newPalette = im.imagePalette;
            }

            this._shapeMappingPalette = newPalette;

            this.checkForTexPaletteChanged();
        }

        /** called when the user has change the images used to build the texture sheet.  Starts the building of a new texture, 
         * if needed. */
        checkForTexPaletteChanged()
        {
            var texPalette = null;

            //---- shapeMappingPalette takes priority ----
            if (this._shapeMappingPalette && this._shapeMappingPalette.length)
            {
                texPalette = this._shapeMappingPalette;
            }
            else
            {
                var imgName = this._view.shapeImageName();
                if (imgName && imgName !== "none")
                {
                    texPalette = [imgName];
                }
            }

            if (texPalette !== this._texPalette)
            {
                this.onTexPaletteChanged(texPalette);

                this._texPalette = texPalette;
            }

        }

        onTexPaletteChanged(texPalette: string[])
        {
            var gl = this._gl;

            if (texPalette && texPalette.length)
            {
                var isShapeNames = (!texPalette[0].contains("."));
                var textureMaker = new TextureMakerClass(texPalette);

                textureMaker.registerForChange("loaded", (e) =>
                {
                    var texture = textureMaker.getTexture();
                    var potCount = textureMaker.getPotCount();

                    this.onTextureLoaded(texture, potCount);
                });

                textureMaker.buildAsync(gl, texPalette, isShapeNames);
            }
            else
            {
                this.onTextureLoaded(null, 0);

                vp.select(this.container, ".imgDebug")
                    .css("display", "none");
            }
        }

        /** called when a new texture is ready to be applied. */
        onTextureLoaded(newTexture, textureCount: number)
        {
            this._mostRecentTexture = newTexture;
            this._mostRecentTextureCount = textureCount;

            this._needTextureSwap = (newTexture != null);

            vp.utils.debug("onTextureLoaded: newTexture=" + newTexture + ", newTextureCount=" + textureCount);

            this.markBuildNeeded("onTextureLoaded");
        }

        buildTexture()
        {
            var gl = this._gl;

            var newTexture = this._mostRecentTexture;
            var textureCount = this._mostRecentTextureCount;

            /// webGL bug/misunderstanding workaround: seems that creating a new webGL texture somehow corrupts the existing texture activations, so we 
            /// always reactive the existing textures here.

            if (this.isUsingPrimaryBuffers())
            {
                //---- move NEW texture to texture1 ----
                this._texture1 = newTexture;
                this._textureCount1 = textureCount;
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, newTexture);
               // vp.utils.debug("new texture assigned to: gl.TEXTURE0");

                //---- rebind prev texture to texture2 ----
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, this._texture2);
            }
            else
            {
                //---- move NEW texture to texture2 ----
                this._texture2 = newTexture;
                this._textureCount2 = textureCount;
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, newTexture);
                //vp.utils.debug("new texture assigned to: gl.TEXTURE1");

                //---- rebind prev texture to texture0 ----
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this._texture1);
            }

            //vp.utils.debug("buildTexture: texture1=" + this._texture1 + ", texture2=" + this._texture2);

            //this._isAnimatingTexture = true;
        }

        onSortOrderChanged()
        {
            //this._refreshData = true;
            this.markBuildNeeded("onSortOrderChanged");
        }

        setChartOptions(chartOptions: any)
        {
            this._chartOptions = chartOptions;
        }

        onShapeOpacityChanged()
        {
            ////---- we change sizeFactor without animation, so user can use gauge to control it with immediate feedback ----
            //this.markBuildNeeded();
            //this._omitAnimOnNextBuild = true;

            //---- this just does a single draw ----
            this.markDrawNeeded("onShapeOpacityChanged");

            //---- update this instantly since we will only draw a single frame ----
            this._opacityLast = this._view.shapeOpacity();
        }

        onFacetsChanged()
        {
            var fm = this._view.facetMapping();
            var colName = fm.colName;
            var facetCount = fm.binCount;

            var isUsingFacets = (colName && colName.length);

            if (isUsingFacets)
            {
                //var rcx = this._transformer._rcxWorld;

                this._facetHelper = new FacetHelperClass(colName, facetCount, fm.binCount, fm.facetBounds,
                    this._transformer, fm);
            }
            else
            {
                this._facetHelper = null;
            }

            this.markBuildNeeded("onFacetsChanged");
        }

        onContinuousDrawingChanged()
        {
            //vp.utils.debug("onContinuousDrawingChanged called, this=" + this);

            this._isContinuousDrawing = this._view.isContinuousDrawing();

            if (this._isContinuousDrawing)
            {
                this.startAnimationIfNeeded();
            }
        }

        onUiOp(value: boolean)
        {
            this._isUiOpActive = value;

            if (value)
            {
                this.startAnimationIfNeeded();
            }
        }

        onInertiaChanged()
        {
            this._isInertiaActive = this._view.getTransformMgr().isInertiaEnabled();

            if (this._isInertiaActive)
            {
                this.startAnimationIfNeeded();
            }
        }

        startAnimationIfNeeded()
        {
            this.setTimerForNextFrame();
        }

        clearInvalidMapping(md: bps.MappingData, dataFrame: DataFrameClass)
        {
            var colName = md.colName;
            if (colName && ! dataFrame.isColumnName(colName))
            {
                md.colName = null;
            }
        }

        clearInvalidMappings()
        {
            var view = this._view;

            //---- get latest dataFrame (not our, possibly outdated, local copy) ----
            var dataFrame = this._view.getDataMgr().getDataFrame();

            this.clearInvalidMapping(view.xMapping(), dataFrame);
            this.clearInvalidMapping(view.yMapping(), dataFrame);
            this.clearInvalidMapping(view.zMapping(), dataFrame);
            this.clearInvalidMapping(view.colorMapping(), dataFrame);
            this.clearInvalidMapping(view.sizeMapping(), dataFrame);
            this.clearInvalidMapping(view.textMapping(), dataFrame);
            this.clearInvalidMapping(view.lineMapping(), dataFrame);
            this.clearInvalidMapping(view.shapeMapping(), dataFrame);
            this.clearInvalidMapping(view.facetMapping(), dataFrame);
        }

        onDataFrameChanged()
        {
            this._refreshData = true;
            this._rebuildAttrBuffers = true;
            this._omitAnimOnNextBuild = false;
            this.markBuildNeeded("onDataFrameChanged");

            //vp.utils.debug("onDataFrameChanged: refreshData=" + this._refreshData);

            this.clearInvalidMappings();

            //---- we don't start the timer until we get our first data (makes debugging some things easier) ----
            this.startAnimationIfNeeded();

            //---- debug ----
            ////if (this._canvasHeight > 1)
            //{
            //    this.transformerTest();
            //}
        }

        onToPercetOverrideChanged()
        {
            var isOverride = this._view.isAnimOverride();
            if (isOverride)
            {
                var value = +this._view.toPercentOverride();

                this._toPercent = value;
                this._toPercentUneased = value;
                this._toPercentUnflipped = value;

                this.markBuildNeeded("onToPercetOverrideChanged");
                this._omitAnimOnNextBuild = true;
                //this._isAnimatingTexture = true;
            }
        }

        onColMappingsChanged()
        {
            // "dataFrame" dataChanged event will suffice; blanking issues if we hook this also.
            this.markBuildNeeded("onColMappingsChanged");
        }

        getLastRayHitTestInfo()
        {
            return this._lastRayHitTestInfo;
        }

        getLastRectHitTestInfo()
        {
            return this._lastRectHitTestInfo;
        }

        getHitTestCount()
        {
            return this._hitTestCount;
        }

        onFilteredChanged(isForward: boolean)
        {
            //---- this may cause "onEndOfCycle()" to be called, which resets "this._isFirstFilteredStage", so call this first ----
            this.markBuildNeeded("onFilteredChanged");

            this._isFirstFilteredStage = true;
            this._isForwardFilter = isForward;
        }

        onSizeFactorChanged()
        {
            this._instantSizeChange = true;

            this.markDrawNeeded("onSizeFactorChanged");
        }

        markDrawNeeded(reason: string)
        {
            ////---- we change sizeFactor without animation, so user can use gauge to control it with immediate feedback ----
            //this.markBuildNeeded();
            //this._omitAnimOnNextBuild = true;

            TraceMgrClass.instance.addTrace("drawNeeded", reason, TraceEventType.point);

            this._isDrawNeeded = true;
        }

        buildColorPalette()
        {
            //var selectedColor = this._selectedColor;            // index 0
            var shapeColor = this._view.shapeColor();           // index 0

            var colorNames = null;
            var cm = this._view.colorMapping();

            if (cm.colName)
            {
                //---- color is mapped ----
                var clientPalette = cm.colorPalette;         // client-supplied color palette
                if (clientPalette)
                {
                    colorNames = vp.utils.copyArray(clientPalette);

                    //---- add selected color to user color palette ----
                    //colorNames.insert(0, selectedColor);
                }
                else
                {
                    var huePalette = [shapeColor, "red", "blue", "yellow", "green", "orange", "pink", "brown", "purple", "silver", "violet", "lime", "gold", "white"];
                    var colorWhitePalette = [shapeColor, "white"];

                    //---- use system defaults ----
                    colorNames = (cm.isContinuous) ? colorWhitePalette : huePalette;
                }
            }
            else
            {
                //---- color is not mapped ----
                colorNames = [shapeColor];
            }

            var newColors = this.adjustColorPaletteForSelection(colorNames);
            this._colorPalette = newColors;

            if (this.isUsingPrimaryBuffers())
            {
                this._colorFloats = glUtils.colorNamesOrValuesToFloats(newColors);

                if (!this._colorFloats2)
                {
                    this._colorFloats2 = this._colorFloats;
                    this._maxColors2 = newColors.length;
                }
            }
            else
            {
                this._colorFloats2 = glUtils.colorNamesOrValuesToFloats(newColors);

                if (!this._colorFloats)
                {
                    this._colorFloats = this._colorFloats2;
                    this._maxColors = newColors.length;
                }
            }
        }

        adjustColorPaletteForSelection(colorNames: string[])
        {
            var selectionExists = (this._dataMgr.getSelectedCount() > 0);
            var triplets = [];
            var count = colorNames.length;
            this._primaryColorCount = count;

            //---- convert color names to normalized triplets (RGB) ----
            for (var i = 0; i < count; i++)
            {
                var rgb = vp.color.getColorFromString(colorNames[i]);
                triplets.push(rgb);
            }

            //---- apply ColorParams to both unselected (first COUNT) color and selected (next COUNT) ----
            var newPalette = [];
            var sParams = this._view.selectionParams();
            var up = sParams.unselectedParams;
            var sp = sParams.selectedParams;

            up.rgb = vp.color.getColorFromString(up.color);
            sp.rgb = vp.color.getColorFromString(sp.color);

            for (var i = 0; i < count; i++)
            {
                newPalette[i] = this.applyColorParams(triplets[i], up, selectionExists);

                if (selectionExists && i < 14)
                {
                    newPalette[i + count] = this.applyColorParams(triplets[i], sp, selectionExists);
                }
            }

            return newPalette;
        }

        applyColorParams(rgb: number[], cp: bps.ColorParams, selectionExists: boolean)
        {
            var value = rgb;

            if (selectionExists)
            {
                if (cp.colorEffect === bps.ColorEffect.setColor)
                {
                    value = cp.rgb;
                }
                else if (cp.colorEffect === bps.ColorEffect.adjustHue)
                {
                    var hsl = vp.color.hslFromRgb(rgb);
                    hsl = hsl.adjustHue(cp.colorFactor);
                    value = hsl.toRgb();
                }
                else if (cp.colorEffect === bps.ColorEffect.adjustSaturation)
                {
                    var hsl = vp.color.hslFromRgb(rgb);
                    hsl = hsl.adjustSaturation(cp.colorFactor);
                    value = hsl.toRgb();
                }
                else if (cp.colorEffect === bps.ColorEffect.adjustValue)
                {
                    var hsl = vp.color.hslFromRgb(rgb);
                    hsl = hsl.adjustValue(cp.colorFactor);
                    value = hsl.toRgb();
                }
            }

            return value;
        }

        buildAndUseGlProgram()
        {
            var gl = this._gl;

            //---- SHAPES program ----
            var vertexShader = glUtils.findAndCompileShader(gl, this._vertexShaderId, true);
            var fragmentShader = glUtils.findAndCompileShader(gl, this._fragmentShaderId, false);

            this._shapesProgram = glUtils.buildProgram(gl, [vertexShader, fragmentShader]);

            //---- GRID LINES program ----
            var vertexShader = glUtils.findAndCompileShader(gl, "../shaders/gridLinesVertexShader.c", true);
            var fragmentShader = glUtils.findAndCompileShader(gl, "../shaders/gridLinesFragmentShader.c", false);

            this._gridLinesProgram = glUtils.buildProgram(gl, [vertexShader, fragmentShader]);

            //---- make SHAPES the current program ----
            gl.useProgram(this._shapesProgram);
        }

        setTimerForNextFrame()
        {
            if (!this._animTimer)
            {
                this._animTimer = requestAnimationFrame((e) =>
                {
                    this.moveFrame();

                    //---- don't start drawing frames until first chart build has occured ----
                    if (this._firstChartBuilt)
                    {
                        this.drawFrame();
                    }
                    else if (this._buildNeeded)
                    {
                        this.startAnimationIfNeeded();
                    }
                }); 
            }
        }

        close()
        {
            this.stopDrawing();

            //---- unregister for all events ----
            this._view.unregisterForChanges(this);
            this._dataMgr.unregisterForChanges(this);
            this._view.getTransformMgr().unregisterForChanges(this);
        }

        stopDrawing()
        {
            if (this._animTimer)
            {
                cancelAnimationFrame(this._animTimer);
                this._animTimer = null;
            }
        }

        getTransformer()
        {
            return this._transformer;
        }

        is3dChart()
        {
            var name = this._chartClass;
            return (name == "scatterPlot3dClass" || name == "stacksBinClass");
        }

        buildNonLayoutStuff()
        {
            //---- TODO: sort when using blending and 3D objects ----
            //---- for now, turn off blending if are in a 3D chart ----
            var lightParams = <bps.Lighting>this._view.lightingParams();
            this._isBlendingEnabled = (!this.is3dChart());

            var usingPrimary = this.isUsingPrimaryBuffers();

            //vp.utils.debug("buildNonLayoutStuff: this._usingPrimaryBuffers=" + usingPrimary);

            //---- clear shapes in our svg group (for facet borders, axes, etc) ----
            vp.select(this._svgChartGroup)
                .clear();

            this.buildTexture();

            //if (this._rebuildTexture)
            //{
            //    this.buildTextures();
            //}

            if (this._rebuildCamera)
            {
                this._transformer.updateCamera(this._view.isOrthoCamera(), this._frameWidth, this._frameHeight);
                this.updateProjectionMatrix();
                //this._uniformsChanged.matrix = true;
            }

            var forceVisualBreak = false;

            if (this._refreshData || (! this._dataFrame))
            {
                var oldCount = (this._dataFrame) ? this._dataFrame.getRecordCount() : 0;

                this._dataFrame = this._dataMgr.getDataFrame();
                this._maxRecords = null;

                var recordCount = this._dataFrame.getRecordCount();

                this.onDataOrPrimitiveChanged(true);

                //---- is ALL this needed when we change data? ----
                this._bufferMgr.createGlAttributes(this._shapesProgram, true);
                this.createGlUniforms();

                //---- clear hover index ----
                this._view.hoverPrimaryKey(null);

                this._rebuildAttrBuffers = true;
                forceVisualBreak = true;
            }

            this._view.ensureColumnsAreLoaded();

            //---- NOTE: the boundingBoxes only hold FILTERED-IN shapes - you cannot find shapes directly using "vectorIndex" for them ----
            var filteredInCount = this._dataMgr.getFilteredInCount();
            this._boundingBoxMgr.adjustSizeAndClearList(filteredInCount);

            this._bufferMgr.createAttributeArraysIfNeeded(this._rebuildAttrBuffers, forceVisualBreak);

        }

        buildChart()
        {
            this.resetBuildPerf();

            var buildId = this._nextBuildId++;

            addTrace("chartBuild", this._chartClass, TraceEventType.start, "b" + buildId);

            //---- normal build starts here ----
            //vp.utils.debug("----- buildChart ---------");
            var buildStart = vp.utils.now();

            this._view.onBuildStarted();

            //vp.utils.debug("buildChart() starting; this._refreshData=" + this._refreshData + ", this._isSelectionChangeOnly = "
            //    + this._isSelectionChangeOnly);

            var appMgr = this._view.getAppMgr();

            try
            {
                this.buildNonLayoutStuff();

                this.fillGlBuffers(buildStart);
            }
            finally
            {
                //---- clear flags for next build ----
                this._buildNeeded = false;
                this._enableBuildNeededMarkOnNextFrame = false;
                this._rebuildCamera = false;
                this._refreshData = false;
                this._rebuildAttrBuffers = false;
                this._markBuildNeededCount = 0;

                this._firstChartBuilt = true;
                //this._rebuildTexture = false;

                addTrace("chartBuild", this._chartClass, TraceEventType.end, "b" + buildId);
            }

            this.addToBuildPerf("total", buildStart);
        }

        onDrawPrimitiveChanged(needBufferRebuild: boolean, needProgramBuild: boolean)
        {
            //---- refresh glInst for this build =---
            this._glInst = this._view.getInstancingExt();
            this._bufferMgr.glInst(this._glInst);

            var value = bps.DrawPrimitive[this._view.drawingPrimitive()];
            this._drawPrimitive = value;

            //var usePointCubes = false;
            //this._usingPointCubes = (this._drawPrimitive == bps.DrawPrimitive.point && usePointCubes);

            this.computeCulling();

            this.onDataOrPrimitiveChanged(needProgramBuild);

            this.createGlUniforms();

            this.markBuildNeeded("onDrawPrimitiveChanged");

            if (needBufferRebuild)
            {
                this._rebuildAttrBuffers = true;
            }
        }

        computeCulling()
        {
            this._isCullingEnabled = false;

            if (this._drawPrimitive === bps.DrawPrimitive.cube || this._drawPrimitive === bps.DrawPrimitive.smartCube)
            {
                if (this._view.isCullingEnabled())
                {
                    this._isCullingEnabled = true;
                }
            }
        }

        //rebuildAll()
        //{
        //    this.buildAndUseGlProgram();
        //    this.createGlAttributes();
        //    this.createGlUniforms();

        //    this._rebuildAttrBuffers = true;
        //    this._refreshData = true;
        //    this.markBuildNeeded();
        //}

        markBuildNeeded(reason: string, ignoreFilteredStage?: boolean)
        {
            //vp.utils.debug("markBuildNeeded called: reason=" + reason);
            this._markBuildNeededCount++;

            addTrace("buildNeeded", reason, TraceEventType.point);

            if (this._view.isAutoRebuild())
            {
                //vp.utils.debug("markBuildNeeded: buildNeeded set to TRUE");

                this._omitAnimOnNextBuild = false;
                this._instantSizeChange = false;
                this._isSelectionChangeOnly = false;

                if (ignoreFilteredStage)
                {
                    this._isFirstFilteredStage = false;
                }

                if (this._isCycleActive)
                {
                    addTrace("animInterrupt", this._chartClass, TraceEventType.point);

                    //---- terminate the current cycle so we can draw with new settings ----
                    this.onEndOfCycle(vp.utils.now() - this._lastFrameTime);
                }

                this.cancelBuildTimer();

                //---- use a timer so that multiple requests close in time get merged ----
                //---- using this timer causes some sort of shader error when we switch views ----
                //this._buildTimer = setTimeout((e) =>
                {
                    //this._buildNeeded = true;
                    this._enableBuildNeededMarkOnNextFrame = true;

                    this.startAnimationIfNeeded();
                }//, 1);

            }
        }

        cancelBuildTimer()
        {
            if (this._buildTimer)
            {
                clearTimeout(this._buildTimer);
                this._buildTimer = null;
            }
        }

        cancelRequestedDraw()
        {
            this._buildNeeded = false;
            this._omitAnimOnNextBuild = false;
            this._instantSizeChange = false;
        }

        getFrameRate()
        {
            return this._frameRate;
        }

        getArrayMemory()
        {
            return this._bufferMgr.getArrayMemoryUsage();
        }

        createGlUniforms()
        {
            var gl = this._gl;
            var program = this._shapesProgram;
            var uniforms = this._uniforms;

            //---- these are constant values (and don't have to be updated again) ----
            var matProjection = this._transformer.getProjection();      // .toFloat32Array();

            glUtils.addUniform(uniforms, gl, program, "projectionMatrix", "matrix4fv", matProjection);
            glUtils.addUniform(uniforms, gl, program, "invMvpMatrix", "matrix4fv");
            glUtils.addUniform(uniforms, gl, program, "invWorldMatrix", "matrix4fv");
            glUtils.addUniform(uniforms, gl, program, "colorPalette", "3fv", this._colorFloats);
            glUtils.addUniform(uniforms, gl, program, "colorPalette2", "3fv", this._colorFloats2);
            glUtils.addUniform(uniforms, gl, program, "isColorDiscrete", "1f");
            glUtils.addUniform(uniforms, gl, program, "isColorDiscrete2", "1f");
            glUtils.addUniform(uniforms, gl, program, "isColorDirect", "1f");
            glUtils.addUniform(uniforms, gl, program, "isColorDirect2", "1f");

            //if (this._usingPointCubes)
            //{
            //    glUtils.addUniform(uniforms, gl, program, "canvasSize", "2f");
            //    glUtils.addUniform(uniforms, gl, program, "szCanvas", "2f");
            //    glUtils.addUniform(uniforms, gl, program, "ndcZ", "1f");
            //    glUtils.addUniform(uniforms, gl, program, "cameraPos", "3fv");

            //    glUtils.addUniform(uniforms, gl, program, "mvpMatrix", "matrix4fv");
            //    glUtils.addUniform(uniforms, gl, program, "worldMatrix", "matrix4fv");
            //}
            //else
            {
                glUtils.addUniform(uniforms, gl, program, "cubeVertices", "3fv", cubeMesh.vertices);
                glUtils.addUniform(uniforms, gl, program, "cubeNormals", "3fv", cubeMesh.vertexNormals);
                glUtils.addUniform(uniforms, gl, program, "cubeTexCoords", "2fv", cubeMesh.uvFrontOnly);
                glUtils.addUniform(uniforms, gl, program, "cubeTriangles", "1fv", cubeMesh.triangles);

                glUtils.addUniform(uniforms, gl, program, "drawingPoints", "1f");

                glUtils.addUniform(uniforms, gl, program, "ambientFactor", "1f");
                glUtils.addUniform(uniforms, gl, program, "lightFactor1", "1f");        // set in view
                //glUtils.addUniform(uniforms, gl, program, "lightFactor2", "1f");        // set in view
                glUtils.addUniform(uniforms, gl, program, "lightingEnabled", "1f");

                glUtils.addUniform(uniforms, gl, program, "triangleIndex", "1f", 0);
            }

            //---- these are updated every frame ----
            glUtils.addUniform(uniforms, gl, program, "maxColors", "1f");
            glUtils.addUniform(uniforms, gl, program, "maxColors2", "1f");

            glUtils.addUniform(uniforms, gl, program, "globalOpacity", "1f");
            glUtils.addUniform(uniforms, gl, program, "globalOpacity2", "1f");
            glUtils.addUniform(uniforms, gl, program, "toPercent", "1f");
            glUtils.addUniform(uniforms, gl, program, "toPercentTheta", "1f");
            glUtils.addUniform(uniforms, gl, program, "toPercentUneased", "1f");

            glUtils.addUniform(uniforms, gl, program, "sizeFactor", "1f");
            glUtils.addUniform(uniforms, gl, program, "sizeFactor2", "1f");

            glUtils.addUniform(uniforms, gl, program, "modelViewMatrix", "matrix4fv");
            glUtils.addUniform(uniforms, gl, program, "normalMatrix", "matrix3fv");

            //---- texture uniforms ----
            glUtils.addUniform(uniforms, gl, program, "toPercentFrag", "1f", -1);

            glUtils.addUniform(uniforms, gl, program, "usingTexture1", "1f", -1);
            glUtils.addUniform(uniforms, gl, program, "usingTexture2", "1f", -1);
            glUtils.addUniform(uniforms, gl, program, "uSampler1", "1i", 0);
            glUtils.addUniform(uniforms, gl, program, "uSampler2", "1i", 1);
            glUtils.addUniform(uniforms, gl, program, "textureCount1", "1f", 0);
            glUtils.addUniform(uniforms, gl, program, "textureCount2", "1f", 0);

            //---- hover stuff ----
            glUtils.addUniform(uniforms, gl, program, "hoverVectorIndex", "1f", -1);
            glUtils.addUniform(uniforms, gl, program, "hoverColor", "3f");
        }

        updateProjectionMatrix()
        {
            var matProjection = this._transformer.getProjection();      //.toFloat32Array();
            this._uniforms.projectionMatrix.setValue(matProjection);
        }

        lerpMatrix(percent: number, fromMat: Float32Array, toMat: Float32Array)
        {
            var result = new Float32Array(fromMat.length);

            for (var i = 0; i < fromMat.length; i++)
            {
                var value = vp.data.lerp(percent, fromMat[i], toMat[i]);
                result[i] = value;
            }

            return result;
        }

        getTotalVertexCount()
        {
            var recordCount = this._dataMgr.getDataFrame().getRecordCount();
            var verticesPerRecord = this.getNumVerticesInBuffer();
            var vertexCount = recordCount * verticesPerRecord;

            return vertexCount;
        }

        setLastVerticesPerRecord()
        {
            this._lastVerticesPerRecord = this.getNumVerticesInBuffer();
        }

        getLastVerticesPerRecord()
        {
            return this._lastVerticesPerRecord;
        }

        getPkToDrawIndex(key: string)
        {
            return this._pkToDrawIndex[key];
        }

        applyUniformsToShaders()
        {
            glUtils.GlUniformClass.uniformSetCount = 0;

            //---- local variables, for easy access ----
            var view = this._view;
            var usingPrimary = this.isUsingPrimaryBuffers();
            //var drawPrim = this._drawPrimitive;
            //var changed = this._uniformsChanged;

            //if (this._usingPointCubes)
            //{
            //    //---- for vertex shader ----
            //    this._uniforms.szCanvas.setValue(this._canvasWidth, this._canvasHeight);

            //    //---- for fragment shader ----
            //    this._uniforms.canvasSize.setValue(this._canvasWidth, this._canvasHeight);

            //    this._uniforms.ndcZ.setValue(this._transformer.getNdcZ());
            //    this._uniforms.cameraPos.setValue(this._transformer.getCameraPosAsArray());
            //    this._uniforms.invMvpMatrix.setValue(this._transformer.getInvMvpMatrix());
            //    this._uniforms.invWorldMatrix.setValue(this._transformer.getInvWorldpMatrix());
            //}

            if (true)       // changed.toPercent)
            {
                //---- toPercent ----
                this._uniforms.toPercent.setValue(this._toPercent);
                this._uniforms.toPercentUneased.setValue(this._toPercentUneased);
            }

            if (true)       // changed.lines)
            {
                //---- toPercentTheta ----
                var toPercentTheta = this._toPercent;
                var isPrevLine = (this._prevChartClass == "linePlotClass");
                var isCurrLine = (this._chartClass == "linePlotClass");

                if (isPrevLine)
                {
                    if (!isCurrLine)
                    {
                        //---- LINE to NON-LINE ----
                        toPercentTheta = (usingPrimary) ? 0 : 1;
                    }
                }
                else
                {
                    if (isCurrLine)
                    {
                        //---- NON-LINE to LINE ----
                        toPercentTheta = (usingPrimary) ? 1 : 0;
                    }
                }

                this._uniforms.toPercentTheta.setValue(toPercentTheta);
            }

            if (true)       // changed.colors)
            {
                //---- color palette ----
                this._uniforms.colorPalette.setValue(this._colorFloats);
                this._uniforms.colorPalette2.setValue(this._colorFloats2);
                this._uniforms.maxColors.setValue(this._maxColors);
                this._uniforms.maxColors2.setValue(this._maxColors2);
            }

            if (true)       // changed.textures)
            {
                //---- texture stuff ----

                //---- normalize toFrag ----
                var toFrag = this._toPercent / this._maxPercent;

                var tc1 = this._textureCount1;
                var tc2 = this._textureCount2;
                var textEnabled = this._view.isShapeImageEnabled();

                var ut1 = (this._texture1 != null && textEnabled) ? 1 : 0;
                var ut2 = (this._texture2 != null && textEnabled) ? 1 : 0;

                //---- these do NOT need to be swapped ----

                this._uniforms.toPercentFrag.setValue(toFrag);
                //vp.utils.debug("toFrag=" + toFrag);

                this._uniforms.usingTexture1.setValue(ut1);
                this._uniforms.usingTexture2.setValue(ut2);

                this._uniforms.textureCount1.setValue(tc1);
                this._uniforms.textureCount2.setValue(tc2);

                //vp.utils.debug("--> toFrag=" + toFrag + ", ut1=" + ut1 + ", ut2=" + ut2 + ", tc1=" + tc1 + ", tc2=" + tc2 + ", samp1=" + samp1 +
                //    ", samp2=" + samp2 + ", tex1 = " + this._texture1 + ", tex2 = " + this._texture2);
            }

            if (true)       /// changed.opacity)
            {
                var opacity = view.shapeOpacity();
                var opacityLast = this._opacityLast;

                if (usingPrimary)
                {
                    var temp = opacity;
                    opacity = opacityLast;
                    opacityLast = temp;
                }

                this._uniforms.globalOpacity.setValue(opacity);
                this._uniforms.globalOpacity2.setValue(opacityLast);
            }

            if (true)       // changed.isDiscrete)
            {
                var cm = this._view.colorMapping();

                var isSmooth = view.colorMapping().isContinuous;
                var isSmoothLast = this._isSmoothLast;
                var isChannel = (cm.channelMapping != null);
                var isChannelLast = this._isChannelLast;

                if (usingPrimary)
                {
                    var temp2 = isSmooth;
                    isSmooth = isSmoothLast;
                    isSmoothLast = temp2;

                    var temp2 = isChannel;
                    isChannel = isChannelLast;
                    isChannelLast = temp2;
                }

                this._uniforms.isColorDiscrete.setValue(!isSmooth);
                this._uniforms.isColorDiscrete2.setValue(!isSmoothLast);

                this._uniforms.isColorDirect.setValue(isChannel);
                this._uniforms.isColorDirect2.setValue(isChannelLast);
            }

            if (true)       // changed.sizeFactor)
            {
                var sizeFactor = view.userSizeFactor();
                var sizeFactorLast = this._sizeFactorLast;

                if (usingPrimary)
                {
                    var temp3 = sizeFactor;
                    sizeFactor = sizeFactorLast;
                    sizeFactorLast = temp3;
                }

                var ptFactor = 1;

                //---- for POINT drawing, we need to compute the size in PIXELS (vs. WORLD space) ----
                if (this._drawPrimitive == bps.DrawPrimitive.point)
                {
                    ptFactor = this._transformer.worldSizeToScreen(ptFactor);
                }

                this._uniforms.sizeFactor.setValue(ptFactor * sizeFactor);
                this._uniforms.sizeFactor2.setValue(ptFactor * sizeFactorLast);
            }

            //if (this._cycleIsActive)
            //{
            //    vp.utils.debug("opacity=" + opacity + ", opacityLast=" + opacityLast + ", _toPercentUneased=" + this._toPercentUneased);
            //}

            //if (!this._usingPointCubes)       // changed.lighting)
            {
                var lightParams = <bps.Lighting> view.lightingParams();

                //---- ambientFactor ----
                this._uniforms.ambientFactor.setValue(lightParams.ambientLight.lightFactor);

                //---- lights ----
                this._uniforms.lightFactor1.setValue(lightParams.light1.lightFactor);
                //this._uniforms.lightFactor2.setValue(lightParams.light2.lightFactor);
                this._uniforms.lightingEnabled.setValue(lightParams.isLightingEnabled);
            }

            if (true)       // changed.matrix)
            {

                //---- projection ----
                var matProjection = this._transformer.getProjection();      //.toFloat32Array();
                this._uniforms.projectionMatrix.setValue(matProjection);

                //---- viewMatrix ----
                var matView = this._transformer.getView();
                //this._uniforms.viewMatrix.setValue(matView);        //.toFloat32Array());

                //---- modelViewMatrix ----
                //var matModel = this._transformer.getWorld();
                //var modelView = vp.geom.matrix4.multiply(matModel, viewMat);
                //this._uniforms.modelViewMatrix.setValue(modelView.toFloat32Array());

                var currWorld = this._transformer.world();
                var lastWorld = this._lastWorld;
                if (lastWorld != null)
                {
                    //---- LERP the world matrix ----
                    var truePercent = this._toPercent / this._maxPercent;

                    if (this.isUsingPrimaryBuffers())
                    {
                        var lerpWorld = this.lerpMatrix(truePercent, lastWorld, currWorld);
                    }
                    else
                    {
                        var lerpWorld = this.lerpMatrix(truePercent, currWorld, lastWorld);
                    }

                    //vp.utils.debug("LERPED: truePercent=" + truePercent + ", lastWorld[6]=" + lastWorld[6] + ", currWorld[6]=" + currWorld[6] +
                    //    ", lerpWorld[6] = " + lerpWorld[6]);
                }
                else
                {
                    var lerpWorld = currWorld;
                }

                //---- save for use by gridLine drawing ----
                this._lerpWorld = lerpWorld;

                var modelView = new Float32Array(16);
                mat4.multiply(modelView, matView, lerpWorld);
                this._uniforms.modelViewMatrix.setValue(modelView);

                var dpv = (this._drawPrimitive == bps.DrawPrimitive.point || this._drawPrimitive == bps.DrawPrimitive.linePairs) ? 1.0 : 0.0;
                this._uniforms.drawingPoints.setValue(dpv);

                //---- normalMatrix ----
                if (false)
                {
                    var normalMatrix4 = new Float32Array(16);
                    mat4.invert(normalMatrix4, modelView);

                    //var normalMatrix4 = vp.geom.matrix4.transpose(vp.geom.matrix4.invert(modelView));
                    //var normalMatrix3 = vp.geom.matrix4.toMat3Array(normalMatrix4);
                    var normalMatrix3 = this.getMat3Array(normalMatrix4);
                    this._uniforms.normalMatrix.setValue(normalMatrix3);
                }
                else
                {
                    var normalMatrix = null;
                    normalMatrix = mat3.create();

                    //---- this seems to work better for lighting ----
                    mat3.fromMat4(normalMatrix, modelView);
                    mat3.invert(normalMatrix, normalMatrix);
                    mat3.transpose(normalMatrix, normalMatrix);

                    this._uniforms.normalMatrix.setValue(normalMatrix);

                    ////----debug ----
                    //var mat = new Float32Array(16);
                    //mat4.multiply(mat, matProjection, modelView);
                    //var sz = this._glAttributes.size._array[0];

                    ////var szPixels = this._transformer.worldSizeToScreen(sz);
                    ////var newx = (pos3x.x + 1) / 2 * this._canvasWidth;
                    //var pos3x = this._transformer.projectToNDC(sz, 0, 0);
                    //var screenPos = this._transformer.viewportTransformPoint(pos3x);

                    //var z3 = this._transformer.projectToNDC(0, 0, 0);
                    //var zpos = this._transformer.viewportTransformPoint(z3);

                    //vp.utils.debug("canvasWidth=" + this._canvasWidth + ", beforeSize=" + sz + ", afterSize=" + (screenPos.x - zpos.x));
                }

                //if (this._usingPointCubes)
                //{
                //    var mvp = mat4.create();
                //    mat4.multiply(mvp, matProjection, modelView);

                //    this._uniforms.mvpMatrix.setValue(mvp);
                //    this._uniforms.worldMatrix.setValue(lerpWorld);
                //}
            }
    
            //---- set this to -1 for the normal drawing ----
            this._uniforms.hoverVectorIndex.setValue(-1);

            //changed.reset();
        }

        getMat3Array(m: Float32Array)
        {
            var b = new Float32Array(9);

            b[0] = m[0];
            b[1] = m[1];
            b[2] = m[2];

            b[3] = m[4];
            b[4] = m[5];
            b[5] = m[6];

            b[6] = m[8];
            b[7] = m[9];
            b[8] = m[10];

            return b;
        }

        public rotateMatrixX(value: number)
        {
            this._transformer.rotateMatrixY(value);
        }

        public rotateMatrixY(value: number)
        {
            this._transformer.rotateMatrixY(value);
        }

        public rotateMatrixZ(value: number)
        {
            this._transformer.rotateMatrixY(value);
        }

        /** The true vertex count for the current drawing primitive. */
        getNumVerticesPerShape()
        {
            //auto,         // not seen here, but take its value into account
            //point,
            //triangle,
            //quad,
            //cube,
            //smartCube,
            //lineStrip,
            //linePairs,
            //thickLine,

            var verticesByPrim = [1, 1, 3, 6, 36, 3, 1, 1, 6];
            var verticesPer = verticesByPrim[this._drawPrimitive];

            return verticesPer;
        }

        /** vertex count for buffers. */
        getNumVerticesInBuffer()
        {
            var vertexCount = 1;

            if (! this._glInst)
            {
                vertexCount = this.getNumVerticesPerShape();
            }

            return vertexCount;
        }

        onDataOrPrimitiveChanged(needRebuild: boolean)
        {
            var recordCount = this.getDataLength();
            var verticesPerRecord = this.getNumVerticesInBuffer();
            var vertexCount = recordCount * verticesPerRecord;

            //this._vertexCount = vertexCount;
            this._verticesPerRecord = verticesPerRecord;
            var rebuiltProgram = false;

            if (false)      // this._drawPrimitive == bps.DrawPrimitive.point)
            {
                var shaderChanged = this.setShaders("../shaders/pointCube/pointVertex.c",
                    "../shaders/pointCube/pointFragment.c");
            }
            else
            {
                var shaderChanged = this.setShaders("../shaders/cubeVertexShader.c", "../shaders/fragmentShader.c");
            }

            if (needRebuild || shaderChanged)
            {
                this.buildAndUseGlProgram();
            }
        }

        setShaders(fnVertex: string, fnFragment: string)
        {
            var shaderChanged = false;

            if (this._vertexShaderId !== fnVertex || this._fragmentShaderId !== fnFragment)
            {
                this._vertexShaderId = fnVertex;
                this._fragmentShaderId = fnFragment;

                shaderChanged = true;
            }

            return shaderChanged;
        }

        computeFacetStats(dc: DrawContext, nvFacetBuckets: NamedVectors[])
        {
            var maxItems = utils.getDataLength(dc.nvData, true);
            return maxItems;
        }

        preLayoutLoop(dc: DrawContext)
        {
        }

        getFacetHelper()
        {
            return this._facetHelper;
        }

        calcRanges(nv: NamedVectors, facetAdjust: boolean)
        {
            var rcxWorld = utils.cloneMap(this._transformer.getWorldBounds());

            if (facetAdjust && this._facetHelper)
            {
                var fm = this._view.facetMapping();

                this._facetHelper.setBinCountFromData(this._dataFrame, nv, nv.facet, fm);

                var facetLayout = this._facetHelper.buildFacetLayout(rcxWorld.left, rcxWorld.bottom, rcxWorld.right, rcxWorld.top);

                //---- adjust rcxWorld so that we scale to fit into a single facet ----
                var rc0 = facetLayout.facetBounds[0];

                rcxWorld.left = rc0.x;
                rcxWorld.right = rc0.x + rc0.width;

                rcxWorld.top = rc0.y + rc0.height;  
                rcxWorld.bottom = rc0.y;            // - rc0.height;           // flipped axis
            }

            //---- add width, height, depth ----
            rcxWorld.width = rcxWorld.right - rcxWorld.left;
            rcxWorld.height = rcxWorld.top - rcxWorld.bottom;
            rcxWorld.depth = rcxWorld.front - rcxWorld.back;

            return rcxWorld;
        }

        chartScaleAdjustments(dc)
        {
        }

        getMaxItemsInView(nv: NamedVectors)
        {
            var maxItems = 0;

            //---- does client want to override max count? ----
            if (this._view.isMaxItemCountEnabled())
            {
                maxItems = this._view.maxItemCount();
            }
            else
            {
                maxItems = utils.getDataLength(nv, true);
            }

            return maxItems;
        }

        /** to be overwritten by subclass, where appropriated. */
        adjustScales(dc: DrawContext)
        {
        }

        clearMinMaxBreaks(md: bps.MappingData)
        {
            md.minBreakFacet = undefined;
            md.maxBreakFacet = undefined;
        }

        prepassAndFrameBuild(ctx: CanvasRenderingContext2D)
        {
            var userSizeFactor = this._view.userSizeFactor();
            var usingFacets = (this._facetHelper != null);

            var nv = this.buildNamedVectors(this._dataFrame);
            this._nv = nv;

            //---- for consistent results, always do PREPASS calculations with no chartFrame ----
            this.updateChartBounds(0, 0, this._canvasWidth, this._canvasHeight, usingFacets);

            //---- build PREPASS scales ----
            var rcxWorld = this.calcRanges(nv, false);
            var recordCount = this.getDataLength();
            var filteredRecordCount = this.getMaxItemsInView(nv);

            var nvBuckets = <NamedVectors[]>null;
            var facetCount = 0;
            var facetBinResults = null;

            //---- clear facet min/max breaks from last build ----
            var xm = this._view.xMapping();
            this.clearMinMaxBreaks(xm);

            var ym = this._view.yMapping();
            this.clearMinMaxBreaks(ym);

            var zm = this._view.zMapping();
            this.clearMinMaxBreaks(zm);

            if (this._facetHelper)
            {
                var facetHelper = this._facetHelper;
                var requestedFacets = facetHelper._requestedFacets;
                var maxFacets = facetHelper._maxCategoryFacets;

                var sortOptions = new BinSortOptionsClass();
                sortOptions.sortDirection = this._view.facetMapping().binSorting;
                sortOptions.sortByAggregateType = "count";

                var fm = this._view.facetMapping();
                var useNiceNumbers = fm.useNiceNumbers;

                facetBinResults = BinHelper.createBins(nv, "facet", requestedFacets, maxFacets, fm.forceCategory, true, true, sortOptions, null, useNiceNumbers, fm);
                nvBuckets = BinHelper.splitBinsIntoNamedVectors(facetBinResults, nv);

                facetHelper.binResult(facetBinResults);
                facetCount = facetHelper.facetCount();
            }

            //---- build ESTIMATED scales, based on estimated rcxWorld (with no chart frame) ----
            var scales = this.buildScales(nv, rcxWorld, filteredRecordCount, facetCount);

            //---- build PREPASS drawContext ----
            var dc = new DrawContext(rcxWorld, this._facetHelper, nv, scales, recordCount, filteredRecordCount, /*this._attrInfos,*/
                userSizeFactor, this._prevChartClass, this._chartClass, userSizeFactor, this._view);

            this._prepassDc = dc;

            //---- let chart do pre-pass over all facets ----
            var maxItems = this.computeFacetStats(dc, nvBuckets);

            //---- let chart make PREPASS scale adjustments ----
            this.adjustScales(dc);

            //---- relay maxItems to appMgr, so he can send to client, if subscribed & changed ----
            this._view.getAppMgr().setMaxItemCount(maxItems);

            //---- build the chart frame & axes ----
            var rcPlot = this.buildChartFrame();

            //---- change bounds of gl canvas to "rcPlot" (these bounds used in calcRanges()) ----
            this.updateChartBounds(rcPlot.left, rcPlot.top, rcPlot.width, rcPlot.height, usingFacets);

            //---- build FINAL scales ----
            var rcxWorld = this.calcRanges(nv, true);
            var scales = this.buildScales(nv, rcxWorld, filteredRecordCount, facetCount);

            //---- build FINAL drawContext ----
            var dc = new DrawContext(rcxWorld, this._facetHelper, nv, scales, recordCount, filteredRecordCount, /*this._attrInfos,*/
                userSizeFactor, this._prevChartClass, this._chartClass, userSizeFactor, this._view);

            //---- let chart make FINAL scale adjustments ----
            this.adjustScales(dc);

            return { dc: dc, facetCount: facetCount, nvBuckets: nvBuckets, facetBinResults: facetBinResults };
        }

        buildChartFrame()
        {
            var cfd = this._view.chartFrameData();
            var usingFacets = (this._facetHelper != null);

            var hideAxes = (usingFacets || this._hideAxes || !cfd.isVisible);
            var dc = this._prepassDc;

            var rcPlot = this._chartFrameHelper.build(this._canvasWidth, this._canvasHeight, hideAxes, usingFacets, dc.scales, cfd, dc);
            return rcPlot;
        }

        getChartRepro(): bps.ChartRepro
        {
            var repro = new bps.ChartRepro();

            repro.xFactor = 1;      // TODO
            repro.yFactor = 1;      // TODO
            repro.zFactor = 1;      // TODO

            repro.layoutResults = this._layoutResults;

            return repro;
        }

        worldBoundsToSvg(bounds: Bounds)
        {
            //---- translate to 3D canvas coordiates ----
            var rc = this._transformer.worldBoundsToScreen(bounds);

            //---- offset rc so that it is relative to the SVG doc ----
            var rcp = this.getPlotBoundsInPixels();
            rc = vp.geom.createRect(rcp.left + rc.left, rcp.top + rc.top, rc.width, rc.height);

            return rc;
        }

        isOnFacetLabel(pt: any)
        {
            var isOnLabel = false;

            for (var i = 0; i < this._facetLabelRects.length; i++)
            {
                var rc = this._facetLabelRects[i];
                if (vp.geom.rectContainsPoint(rc, pt))
                {
                    isOnLabel = true;
                }
            }

            return isOnLabel;
        }

        /** fill buffers with attribute values for each object. */
        fillGlBuffers(buildStart: number)
        {
            this._textRects = [];
            //this._spheres = [];
            this._gridLinesBuffer = [];
            this._drawInfos = [];

            //---- to minimize impact on memory, re-use this array (rather than reallocating it) ----
            //this._boundingBoxes = [];

            var fillStart = vp.utils.now();

            this.buildColorPalette();

            var ctx = this._view.getContext2d();
            this._ctx = ctx;

            var result = this.prepassAndFrameBuild(ctx);

            this.onDataChanged("facetLayoutChanged");

            var dc = <DrawContext>result.dc;
            var nvBuckets = <any[]>result.nvBuckets;
            var facetHelper = this._facetHelper;
            var facetCount = result.facetCount;     //   (facetHelper) ? facetHelper.facetCount() : 1;
            var facetBinResults = result.facetBinResults;

            //---- clear 2D canvas and prepare Text and Line drawing context ----
            ctx.clearRect(0, 0, this._frameWidth, this._frameHeight);

            var tm = this._view.textMapping();
            var lm = this._view.lineMapping();
            this._tm = tm;
            this._lm = lm;

            //---- set up for text drawing ----
            ctx.globalAlpha = tm.opacity;
            ctx.font = tm.fontDesc;
            ctx.fillStyle = tm.color;

            var counters = { next1: 0, next3: 0 };
            var verticesPerRecord = this._verticesPerRecord;

            this._layoutResults = [];

            var layoutStart = vp.utils.now();
            this._facetLabelRects = [];
            var usingPrimary = this.isUsingPrimaryBuffers();
            var attributes = this._bufferMgr.getAttributesForCycle(usingPrimary);
            var buffers = this._bufferMgr.getNamedBuffers(attributes);

            //---- for now, always re-order the buffer ----
            var reorderResult = null;
            var start = this.addToBuildPerf("reorderBuffer", buildStart);

            var drawOrderKey = this._dataFrame.getSortKey();
            if (facetHelper)
            {
                drawOrderKey = facetHelper._colName + "-" + facetHelper._facetCount + "-" + drawOrderKey;
            }

            //---- if sort order has changed, REORDER record data in FROM buffer ---
            if (drawOrderKey != this._drawOrderKey)
            {
                reorderResult = this._bufferMgr.reorderFromBuffers(dc, verticesPerRecord);
            }

            //---- now its safe to clear this ----
            this._pkToDrawIndex = {};
            this._drawOrderKey = drawOrderKey;

            start = this.addToBuildPerf("layoutPrep", start);
            var drawBufferIndex = 0;            // where to put next record layout data

            var verticesPerShape = this.getNumVerticesPerShape();
            var verticesInBuffer = this.getNumVerticesInBuffer();

            if (this._facetHelper)
            {
                var facetResult = facetHelper.layout();

                //---- now, do the REGULAR PASS on all facets ----
                for (var i = 0; i < facetCount; i++)
                {
                    var nvBucket = nvBuckets[i];

                    var facetBounds = facetResult.facetBounds[i];
                    var facetOffset = { x: facetBounds.x - dc.x, y: facetBounds.y - dc.y };

                    if (!this._view.is3dGridVisible())
                    {
                        //---- add a 2D border around the bounds ----
                        var rc = this.worldBoundsToSvg(facetBounds);

                        vp.select(this._svgChartGroup).append("rect")
                            .addClass("facetBorder")
                            .bounds(rc.left, rc.top, rc.width, rc.height);

                    }

                    //---- update drawing context for this facet ----
                    var facetRecordCount = utils.getDataLength(nvBucket);
                    var facetFilteredRecordCount = utils.getDataLength(nvBucket, true);

                    dc.facetIndex = i;
                    dc.nvData = nvBucket;
                    dc.recordCount = facetRecordCount;
                    dc.filteredRecordCount = facetFilteredRecordCount;
                    dc.layoutFilterVector = (nvBucket.layoutFilter && nvBucket.layoutFilter.values) ? nvBucket.layoutFilter.values : null;

                    /// NOTE: we do NOT update the scales or the dc bounds - chart draws into first facet bounds and then system offsets x/y as needed afterwards. 
                    /// calcRanges() uses the FIRST facet bounds to set: dc.x, dc.y, dc.width, dc.height also.  

                    this.layoutChartOrFacet(dc, verticesPerRecord, buffers, counters, facetOffset, drawBufferIndex);

                    var drawInfo = new DrawInfo(drawBufferIndex, facetRecordCount);
                    this._drawInfos.push(drawInfo);

                    drawBufferIndex += facetRecordCount;
                }
            }
            else
            {
                //---- REGULAR PASS (no facets) ----
                this.layoutChartOrFacet(dc, verticesPerRecord, buffers, counters, { x: 0, y: 0 }, drawBufferIndex);
                var recordCount = this._dataFrame.getRecordCount();

                var drawInfo = new DrawInfo(drawBufferIndex, recordCount);
                this._drawInfos.push(drawInfo);
            }

            //vp.utils.debug("after layout of all records, keyCount(this._pkToDrawIndex): " + vp.utils.keys(this._pkToDrawIndex).length);

            if (true)       // always add this to keep buffer use stablized   // hvi > -1)
            {
                //---- add DrawInfo for HOVER SHAPE (will dynamically set the hoverVectorIndex) ----
                var drawInfo = new DrawInfo(-1, 1);
                this._drawInfos.push(drawInfo);
            }

            this._bufferMgr.allocateBuffers(this._drawInfos);
            var drawIndexes = vp.data.range(0, this._drawInfos.length - 1);

            this._bufferMgr.bindBuffersToArrayData(drawIndexes);

            var elapsed = vp.utils.now() - layoutStart;
            //vp.utils.debug("layoutChartOrFacet took: " + elapsed + " ms");

            var start = vp.utils.now();

            this._bufferMgr.setArraysFromNamedBuffers(attributes, buffers);

            //this.dumpVertexBuffers("FILL toBuffers", verticesPerRecord, buffers);

            if (reorderResult)
            {
                this._bufferMgr.setArraysFromNamedBuffers(reorderResult.attributes, reorderResult.buffers);
            }

            this._bufferMgr.setFromBufferHasData(true);

            this.bindGridLinesBuffer();

            this.addToBuildPerf("layoutPost", start);

            var elapsed = vp.utils.now() - fillStart;
            //vp.utils.debug("fillBuffers took: " + elapsed + " ms");
        }

        //selectByBin(colName: string, bin: beachParty.BinInfo, isFirst: boolean)
        //{
        //    var numBin = <beachParty.BinInfoNum>bin;
        //    var dataMgr = this._dataMgr;

        //    if (numBin.min !== undefined)
        //    {
        //        //---- numeric bin ----
        //        var searchType = (isFirst) ? bps.TextSearchType.betweenInclusive : bps.TextSearchType.gtrValueAndLeqValue2;
        //        dataMgr.searchColValue(colName, numBin.min, numBin.max, searchType);
        //    }
        //    else
        //    {
        //        //---- category bin ----
        //        var value = (bin.isOther) ? <any>bin.otherKeys : <any>bin.name;

        //        dataMgr.searchColValue(colName, value, value, bps.TextSearchType.exactMatch);
        //    }
        //}

        perfLayout(i, j)
        {
            var x = 19 * j;
            var y = 15 * j;
            var z = 1;
            var width = x / 2;
            var height = width;
            var colorIndex = x * y / i;
            var depth = 1;

            var dr = {
                x: x, y: y, z: z, width: width, height: height, depth: depth, colorIndex: colorIndex,
                imageIndex: 0, opacity: 1, theta: 0
            };

            return dr;
        }

        processRecord(fri: number, primaryKey: string, dr: LayoutResult, facetOffset: any, nv: NamedVectors, dc: DrawContext,
            drawBufferIndex: number)
        {
            if (isNaN(dr.x))
            {
                dr.x = 0;
            }

            if (isNaN(dr.y))
            {
                dr.y = 0;
            }

            if (isNaN(dr.z))
            {
                dr.z = 0;
            }

            if (isNaN(dr.width))
            {
                dr.width = 0;
            }

            if (isNaN(dr.height))
            {
                dr.height = 0;
            }

            if (isNaN(dr.depth))
            {
                dr.depth = 0;
            }

            dr.x += facetOffset.x;
            dr.y += facetOffset.y;

            //---- process selected mapping ----
            if (nv.selected && nv.selected.values[fri])
            {
                dr.colorIndex += this._primaryColorCount;               // color this with parallel selected color
            }

            var yOffScreen = -10;

            if (this._isFirstFilteredStage && !this._isForwardFilter)
            {
                //---- process PREVIOUS filter mapping ----

                //---- WARNING: this "drawBufferIndex" index can cause problems if we change order at same time as filtering! ----
                if (this._prevFilter && this._prevFilter.values[drawBufferIndex])
                {
                    //---- move to bottom of screen ----
                    dr.y = yOffScreen;
                    dr.opacity = 0;            
                }
            }
            else
            {
                //---- process CURRENT filter mapping ----
                if (nv.enterExitFilter && nv.enterExitFilter.values[fri])
                {
                    //---- move to bottom of screen ----
                    dr.y = yOffScreen;
                    dr.opacity = 0;            
                }
                else
                {
                    //---- normal FILTERED-IN shape ----
                    //vp.utils.debug("i=" + i + ", imageIndex=" + dr.imageIndex);
                }

            }

            //---- create a bouding-box RECT for hit-testing on this shape ----
            if (dr.opacity > 0)
            {
                var sizeFactor = dc.userSizeFactor;

                var hitTestWidth = dr.width * sizeFactor;
                var hitTestHeight = dr.height * sizeFactor;

                var rect = vp.geom.createRect(dr.x - hitTestWidth / 2, dr.y - hitTestHeight / 2, hitTestWidth, hitTestHeight);

                if (this._buildBoundingBoxes)
                {
                    var halfDepth = dr.depth / 2;

                    //---- bug workaround - for some reason, this "halfDepth" results in front/back mappings that are too far apart. ----
                    //---- so, for now, we adjust it here. "10" seems to provide better answers than no adjustment.  ----
                    halfDepth /= 10;

                    this._boundingBoxMgr.addBox(rect.left, rect.top, dr.z - halfDepth,
                        rect.right, rect.bottom, dr.z + halfDepth, dr.theta, primaryKey);

                }
            }

            return rect;
        }

        addDefaultLayoutResults(dr: bps.LayoutResult, fri: number, dc: DrawContext, nv: NamedVectors, drawBufferIndex: number)
        {
            dr.opacity = 1;
            dr.theta = 0;
            dr.staggerOffset = 0;

            this.setStaggerOffset(dr, fri, dc);

            if (this._view.colorMapping().channelMapping != null)
            {
                var scales = dc.scales;

                dr.redChannel = this.scaleColData(nv.red, drawBufferIndex, scales.red);
                dr.greenChannel = this.scaleColData(nv.green, drawBufferIndex, scales.green);
                dr.blueChannel = this.scaleColData(nv.blue, drawBufferIndex, scales.blue);
            }
        }

        layoutChartOrFacet(dc: DrawContext, verticesPerRecord: number, buffers: NamedBuffers, counters: any,
            facetOffset: any, drawBufferIndex: number)
        {
            //---- opt out if just forcing JIT ----
            if (!dc && !verticesPerRecord)
            {
                return;
            }

            var start = vp.utils.now();

            this.preLayoutLoop(dc);

            var nv = dc.nvData;
            var ad = this._animationData;

            start = this.addToBuildPerf("preLayout", start);

            /// NOTE: taking perf measurements each time thru the loop causes a HUGE slowdown in the layout process,
            /// so we now just take a sample at the end (without the layout, fill, process breakdown). 
            for (var fri = 0; fri < dc.recordCount; fri++)
            {
                var primaryKey = nv.primaryKey.getRawData(fri) + "";
                var dr = new bps.LayoutResult();

                //---- add default values for this record's layout result ----
                this.addDefaultLayoutResults(dr, fri, dc, nv, drawBufferIndex);

                //---- call chart class to layout the shape for this record ----
                this.layoutDataForRecord(fri, dc, dr);

                if (this._buildLayoutResults)
                {
                    this._layoutResults.push(dr);
                }

                //start = this.addToBuildPerf("layout", start);

                var rect = this.processRecord(fri, primaryKey, dr, facetOffset, nv, dc, drawBufferIndex);

                //start = this.addToBuildPerf("process", start);

                //---- for IE code JIT-ing purposes, the fill buffers loop must be in its own function ----
                this._bufferMgr.fillBuffersForRecord(buffers, dr, facetOffset, nv, dc, verticesPerRecord,
                    primaryKey, drawBufferIndex, fri, rect);

                if (this._tm.colName != null)
                {
                    this.drawTextForItem(this._ctx, drawBufferIndex, rect, nv, dr, primaryKey);
                }

                this._pkToDrawIndex[primaryKey] = drawBufferIndex;
                //start = this.addToBuildPerf("fill", start);

                drawBufferIndex++;
            }

            //var debugMsg = "record drawn: " + i;
            //vp.select("#consoleDiv").text(debugMsg);

            if (this._lm.colName)
            {
                this.drawLinesBetweenShapes(dc, buffers, facetOffset);
            }

            start = this.addToBuildPerf("layoutEx", start);

            //vp.utils.debug("finished layout of " + dc.recordCount + " shapes");

            this.fillGridLinesBuffer(dc, facetOffset);

            this.addToBuildPerf("layoutPost", start);
        }

        setStaggerOffset(dr: bps.LayoutResult, facetRelativeIndex: number, dc: DrawContext)
        {
            var ad = this._animationData;
            if (ad.isStaggeringEnabled && !this._isSelectionChangeOnly && !this._isFirstFilteredStage)
            {
                //---- stagger each shape a bit ----
                //---- to stagger shapes in the sorted order, we use "facetRelativeIndex" ----
                var staggerPercent = facetRelativeIndex / dc.recordCount;

                //---- if we are moving from a COLUMN to a SCATTER, we want to process the HIGH Y values first (values are sorted by Y), so we flip the order ----
                //---- likewise, if we moving from a BAR to a SCATTER, we want to process the HIGH X values first (values are sorted by X) ----
                var fromCol = (dc.fromChartType == "columnCountClass" || dc.fromChartType == "columnSumClass");
                var fromBar = (dc.fromChartType == "barCountClass" || dc.fromChartType == "barSumClass");
                var flipOrder = (fromCol && dc.toChartType == "scatterPlotClass") || (fromBar && dc.toChartType == "scatterPlotClass");

                //---- we also change flipOrder when usingPrimaryBuffers=true, since the value of "toPercent" will be flipped in the shader ----
                if (this.isUsingPrimaryBuffers())          //   flipOrder == this._usingPrimaryBuffers)
                {
                    flipOrder = !flipOrder;
                }

                if (flipOrder)
                {
                    staggerPercent = 1 - staggerPercent;
                }

                //---- map all staggerOffset values to between 0 and stagger time as percent of animation time) ----
                dr.staggerOffset = -(staggerPercent * (ad.maxStaggerTime / ad.animationDuration));        // -(maxStaggerTime * staggerPercent);
            }

        }

        getBufferMgr()
        {
            return this._bufferMgr;
        }

        drawLinesBetweenShapes(dc: DrawContext, buffers: NamedBuffers, facetOffset: any)
        {
            if (this._chartClass === "scatterPlotClass" || this._chartClass === "sandRadialClass")
            {
                var lm = this._lm;
                var lineVector = this._dataFrame.getVector(lm.colName, false);
                var pkVector = dc.nvData.primaryKey;

                //---- set up the ctx ----
                var ctx = this._ctx;

                ctx.strokeStyle = lm.color;
                ctx.lineWidth = lm.size;
                ctx.globalAlpha = lm.opacity;

                //---- WIERD: if you forget the "beginPath()", then (on IE11) the ctx.clearRect() will not work! ----
                ctx.beginPath();
                
                //---- build a JSON array of: primaryKey, lineCol, and xCol ---- 
                var xValues = dc.nvData.x.values.toArray();

                var data = xValues.map((x: number, index: number) =>
                {
                    return { xValue: x, lineKey: lineVector[index], primaryKey: pkVector.getRawData(index) };
                });

                //---- limit to FILTERED-IN data ----
                var data = data.filter((d, index: number) =>
                {
                    return (!dc.layoutFilterVector[index]);
                });

                //---- sort by xValue ----
                data = data.orderByNum((item) => item.xData);

                //---- group by lineKey ----
                var groups = data.groupBy("lineKey");

                //---- connect shapes > 1 within each group ----
                groups.forEach((g) =>
                {
                    var values = g.values;

                    if (values.length > 1 && values[0].lineKey != "")
                    {
                        var last = values[0];
                        var ptLast = this.getCenterOfShapeInScreenCoords(last.primaryKey + "");
                        ctx.moveTo(ptLast.x, ptLast.y);

                        for (var i = 1; i < values.length; i++)
                        {
                            var current = values[i];

                            //---- draw line from "last" to "current" ----
                            var ptTo = this.getCenterOfShapeInScreenCoords(current.primaryKey + "");
                            ctx.lineTo(ptTo.x, ptTo.y);
                        }
                    }
                });

                ctx.stroke();

            }
        }

        getCenterOfShapeInScreenCoords(primaryKey: string)
        {
            //var rcLast = this._boundingBoxMgr.getBoxByKey(last.primaryKey + "");
            var rcScr = this._view.getShapeScreenRect(primaryKey);
            var x = 0;
            var y = 0;

            if (rcScr)
            {
                x = rcScr.left + rcScr.width / 2;
                y = rcScr.top + rcScr.height / 2;
            }

            return { x: x, y: y };
        }

        isUsingPrimaryBuffers()
        {
            return this._bufferMgr.getUsingPrimaryBuffers();
        }

        ///** uses */
        //getToBufferIndex(recordIndex: number)
        //{
        //}

        drawTextForItem(ctx: CanvasRenderingContext2D, vectorIndex: number, rect, nv, dr, primaryKey: string)
        {
            if (rect && nv.text && dr.opacity)
            {
                var nvText = <NumericVector>nv.text;
                //var crIndex = dr.colorIndex;

                //if (lastColorIndex == null || crIndex != lastColorIndex)
                //{
                //    var startIndex = (crIndex == 0) ? 0 : 1;
                //    var cr = vp.color.colorFromPalette(this._colorPalette, crIndex, startIndex);

                //    //ctx.fillStyle = cr;
                //    lastColorIndex = crIndex;

                //    //vp.utils.debug("drawTextForItem: cr=" + cr);
                //}

                var textValue = (nvText.keyInfo) ? nvText.keyInfo.keysByRow[vectorIndex] : nvText.values[vectorIndex] + "";
                if (this._tm.maxTextLength !== undefined)
                {
                    //---- limit length of text ----
                    textValue = textValue.substr(0, this._tm.maxTextLength);
                }

                //---- draw that puppy ----
                var pt = this._transformer.projectToScreen(rect.left, rect.bottom, 0);
                ctx.fillText(textValue, pt.x - 2, pt.y - 2);

                //---- build hitTest rect for text ----
                var tw = ctx.measureText(textValue);
                var rcText = vp.geom.createRect(pt.x - 1, pt.y - 2 - 16, tw.width, 16);
                rcText["primaryKey"] = primaryKey;

                this._textRects.push(rcText);
            }

        }

        /** "vectorIndex" is the index into the current set of sorted shapes.  It is NOT the unsorted natural record index. */
        public getShapeBoundingBox(primaryKey: string)
        {
            var bb = this._boundingBoxMgr.getBoxByKey(primaryKey);
            return bb;
        }

        public hitTestRay(ray: RayClass, mousePt): HitTestResult[]
        {
            var itemsFound = [];
            var textRects = this._textRects;
            var bbCount = this._boundingBoxMgr.getCount();

            //---- do hit testing using bounding spheres, then test at triangle level ----
            var start = vp.utils.now();

            //---- test against 3D objects ----
            for (var i = 0; i < bbCount; i++)
            {
                var box = this._boundingBoxMgr.getBoxByIndex(i);
                var dist = ray.intersectBox(box);
                if (dist !== null)
                {
                    var hit = new HitTestResult(dist, box.primaryKey, box);
                    itemsFound.push(hit);
                }
            }

            //---- test against 2d TEXT boxes ----
            for (var i = 0; i < textRects.length; i++)
            {
                var rc = textRects[i];
                if (vp.geom.rectContainsPoint(rc, mousePt))
                {
                    var hit = new HitTestResult(0, rc.primaryKey, rc);
                    itemsFound.push(hit);
                }
            }

            var elapsed = vp.utils.now() - start;
            //vp.utils.debug("hitTestRay: itemsFound=" + itemsFound.length + ", elapsed: " + elapsed + " ms");

            this._lastRayHitTestInfo = { type: "ray", elapsed: elapsed, itemsFoundCount: itemsFound.length };
            this._hitTestCount++;

            return itemsFound;
        }

        getClosestBox(boxes: any[])
        {
            var box = null;
            var minDist = Number.MAX_VALUE;

            for (var i = 0; i < boxes.length; i++)
            {
                var b = boxes[i];

                if (i === 0 || b.dist < minDist)
                {
                    minDist = b.dist;
                    box = b;
                }
            }

            return box;
        }

        hitTestFromRect(rcScreen, isChartRelative: boolean, onlyMostCentral: boolean)
        {
            var start = vp.utils.now();
            var boxes = <BoundingBox[]> null;

            //vp.utils.debug("hitTestRect: left=" + rcScreen.left + ", top=" + rcScreen.top);

            //---- ensure the _boundingBoxes match the current data set ----
            var filteredInCount = utils.getDataLength(this._nv, true);

            if (this._boundingBoxMgr.getCount() === filteredInCount)
            {
                //---- adjust for margins ----
                if (isChartRelative)
                {
                    var left = rcScreen.left - this._frameLeft;
                    var top = rcScreen.top - this._frameTop;
                }
                else
                {
                    var left = <number>rcScreen.left;
                    var top = <number>rcScreen.top;
                }

                //---- adjust for plot topOffset=10 ----
                //top -= 10;

                rcScreen = vp.geom.createRect(left, top, rcScreen.width, rcScreen.height);

                boxes = HitTestRect.intersectUsingTransforms(rcScreen, this._transformer, this._boundingBoxMgr);

                if (onlyMostCentral)
                {
                    var centralBox = this.getClosestBox(boxes);
                    boxes = (centralBox) ? [centralBox] : [];
                }

                var elapsed = vp.utils.now() - start;
                //vp.utils.debug("hitTestRect: boxes=" + boxes.length + ", elapsed: " + elapsed + " ms");

                this._lastRectHitTestInfo = { type: "rect", elapsed: elapsed, itemsFoundCount: boxes.length };
                this._hitTestCount++;
            }

            return boxes;
        }

        getPlotBoundsInPixels()
        {
            var rc = vp.geom.createRect(this._frameLeft, this._frameTop, this._frameWidth, this._frameHeight);
            return rc;
        }

        getCol(dataFrame: DataFrameClass, attrName: string, getOrigData?: boolean): NumericVector
        {
            var vector = null;

            if (attrName)
            {
                vector = dataFrame.getNumericVector(attrName);
            }

            return vector;
        }

        buildNamedVectors(dataFrame: DataFrameClass)
        {
            //var attrInfos = this._attrInfos;
            var length = dataFrame.getRecordCount();

            //var bindings = this._view.getBindings();

            //---- get attribute/column mappings ----
            var crMap = this._view.colorMapping();
            var szMap = this._view.sizeMapping();
            var txMap = this._view.textMapping();
            var imMap = this._view.shapeMapping();
            var faMap = this._view.facetMapping();
            var xMap = this._view.xMapping();
            var yMap = this._view.yMapping();
            var zMap = this._view.zMapping();
            var auxMap = this._view.auxMapping();

            var xData = this.getCol(dataFrame, xMap.colName);
            var yData = this.getCol(dataFrame, yMap.colName);
            var zData = this.getCol(dataFrame, zMap.colName);
            var auxData = this.getCol(dataFrame, auxMap.colName);

            var ch = crMap.channelMapping;
            if (ch)
            {
                var redData = this.getCol(dataFrame, ch.redColumn);
                var greenData = this.getCol(dataFrame, ch.greenColumn);
                var blueData = this.getCol(dataFrame, ch.blueColumn);
            }

            var sizeData = this.getCol(dataFrame, szMap.colName);
            var colorData = this.getCol(dataFrame, crMap.colName);
            var imageIndexData = this.getCol(dataFrame, imMap.colName);
            var textData = this.getCol(dataFrame, txMap.colName, true);
            var facetData = this.getCol(dataFrame, faMap.colName);

            //---- todo: remove this ----
            var staggerOffsetData = null;       // this.getCol(dataFrame, "staggerOffset");

            var selectData = this.getCol(dataFrame, selectedName);
            var filterData = this.getCol(dataFrame, filteredName);

            var randomXData = this.getCol(dataFrame, randomXName);
            var randomYData = this.getCol(dataFrame, randomYName);

            //---- try treating primary key vector just like the numeric mapping data ----
            var primaryKeyData = this.getCol(dataFrame, primaryKeyName);

            /// support for 2-stage filter/layout:
            ///     layoutFilter - when entry is true, the record should NOT be included in the chart layout
            ///     enterExitFilter - when entry is true, the record WILL be included in the ENTER/EXIT effect

            var nv = new NamedVectors(length, xData, yData, zData, colorData, imageIndexData, staggerOffsetData, sizeData, textData,
                facetData, selectData, filterData, filterData, primaryKeyData, randomXData, randomYData, 
                redData, greenData, blueData, auxData);

            if (this._isFirstFilteredStage && this._isForwardFilter)
            {
                nv.layoutFilter = this._prevFilter;
            }

            return nv;
        }

        getDataLength(applyFilter?: boolean)
        {
            var length = 0;
            if (this._dataFrame)
            {
                if (applyFilter)
                {
                    length = this._dataMgr.getFilteredInCount();
                }
                else
                {
                    length = this._dataFrame.getRecordCount();
                }
            }

            return length;
        }

        //getBestSize()
        //{
        //    var sizes = [30, 15, 7, 3.5, 1.25, .6, .3, .15, .08, .004];
        //    var len = this.getDataLength();

        //    var log = Math.floor(Math.log10(len));
        //    var size = sizes[log];

        //    return size;
        //}

        getColorCount()
        {
            var floats = (this.isUsingPrimaryBuffers()) ? this._colorFloats : this._colorFloats2;
            var count = (floats.length / 3);

            var selectionExists = (this._dataMgr.getSelectedCount() > 0);

            if (selectionExists)
            {
                count /= 2;
            }

            return count;
        }

        buildScales(nv: NamedVectors, rcxWorld, filteredRecordCount: number, facetCount: number)
        {
            var view = this._view;

            //---- camera is positive Z, object are negative Z ----
            var xScale = utils.makeRangeScale(nv.x, nv.layoutFilter, rcxWorld.left, rcxWorld.right, undefined, view.xMapping());
            var yScale = utils.makeRangeScale(nv.y, nv.layoutFilter, rcxWorld.bottom, rcxWorld.top, undefined, view.yMapping());

            var zMin = -2;
            var zMax = zMin + 4;

            var zScale = utils.makeRangeScale(nv.z, nv.layoutFilter, zMin, zMax, undefined, view.zMapping());

            //---- build SIZE scale ----
            var sm = this._view.sizeMapping();
            var clientSizePalette = sm.sizePalette;
            var breaks = sm.breaks;
            var szPalette = vp.utils.copyArray(clientSizePalette);
            var sizeScale = utils.makePaletteScale(nv.size, nv.layoutFilter, szPalette, null, breaks, view.sizeMapping());

            //---- build IMAGE INDEX scale ----
            var im = this._view.shapeMapping();
            var imagePalette = im.imagePalette;
            var breaks = im.breaks;
            var imgIindexPalette = (imagePalette) ? vp.data.range(0, imagePalette.length - 1) : null;

            var imageScale = utils.makePaletteScale(nv.imageIndex, nv.layoutFilter, imgIindexPalette, null, breaks, view.shapeMapping());
            imageScale.isPaletteDiscrete(true);

            //---- build COLOR scale ----
            var cm = this._view.colorMapping();
            var colorIndexScale = this.buildColorScale(nv, cm);

            if (cm.channelMapping)
            {
                var redScale = utils.makeRangeScale(nv.red, nv.layoutFilter, 0, 255, 0, cm);
                var greenScale = utils.makeRangeScale(nv.green, nv.layoutFilter, 0, 255, 0, cm);
                var blueScale = utils.makeRangeScale(nv.blue, nv.layoutFilter, 0, 255, 0, cm);
            }

            return {
                x: xScale, y: yScale, z: zScale, size: sizeScale, colorIndex: colorIndexScale,
                imageIndex: imageScale, red: redScale, green: greenScale, blue: blueScale,
            };
        }

         buildColorScale(nv: NamedVectors, md: bps.MappingData)
        {
            var scale = null;
            if (nv && nv.colorIndex)
            {
                var cm = this._view.colorMapping();
                var colType = nv.colorIndex.colType;
                var colorCount = this.getColorCount();

                //---- unselected colors start at index=0 ----
                //---- selected colors have been moved to offset 14+ in the palette ----
                var maxIndex = colorCount - 1;
                var catKeys = null;

                if (colType == "string" || cm.forceCategory)
                {
                    //---- create CATEGORY scale ----

                    //---- use currently bound values (based on current/previous filter settings) ----
                    catKeys = cm.boundColInfo.sortedKeys;
                    if (!catKeys)
                    {
                        //---- fallback to current filter settings ----
                        catKeys = utils.getFilteredSortedKeys(nv.colorIndex, nv.layoutFilter);
                    }
                }

                if (!cm.isContinuous)
                {
                    //---- range mapping will be DISCRETE ----

                    if (catKeys)
                    {
                        //---- if keyCount is smaller than color palette, only map to keyCount entries ----
                        var keyCount = catKeys.length;

                        if (keyCount < colorCount)
                        {
                            colorCount = keyCount;
                        }
                        else if (keyCount > colorCount)
                        {
                            //---- scale for # of keys & then truncate to maxColors (in vertex shader) ----
                        }
                    }

                    maxIndex = colorCount - 1;

                    //---- add this so that when we take floor(scaledValue), we correctly map to stepped palette entries ----
                    maxIndex += .999999;         // adding another "9" here breaks scaling on WebGL (gets interpreted as a "1")
                }

                if (this.isUsingPrimaryBuffers())
                {
                    this._maxColors = colorCount;
                }
                else
                {
                    this._maxColors2 = colorCount;
                }

                //if (cm.customScalingCallback)
                //{
                //    //---- CUSTOM CALLBACK ----
                //    if (vp.utils.isString(cm.customScalingCallback))
                //    {
                //        //----  convert from string to func ----
                //        var foo = null;
                //        eval("foo = " + cm.customScalingCallback);

                //        var customScale: any = {};
                //        customScale.scale = foo;

                //        cm.customScalingCallback = customScale;
                //    }

                //    scale = cm.customScalingCallback;
                //}
                //else
                if (catKeys)
                {
                    var palette = (cm.isContinuous) ? [0, colorCount - 1] : vp.data.range(0, colorCount - 1);
                    var palette = (false) ? [0, colorCount - 1] : vp.data.range(0, colorCount - 1);

                    //---- CATEGORY scale ----
                    scale = vp.scales.createCategoryKey()
                        .categoryKeys(catKeys)
                        .isPaletteDiscrete(!cm.isContinuous)
                        .palette(palette);
                }
                else
                {
                    var minVal = 0;
                    var maxVal = 0;

                    if (cm.breaks && cm.breaks.length && nv.colorIndex.colType != "string")
                    {
                        //---- get min/max from breaks ----
                        var len = cm.breaks.length;
                        minVal = cm.breaks[0];
                        maxVal = cm.breaks[len - 1];
                    }
                    else
                    {
                        //---- get min/max from data ----
                        var result = utils.getMinMax(nv.colorIndex, nv.layoutFilter, md);
                        minVal = result.min;
                        maxVal = result.max;
                    }

                    if (cm.spread == bps.MappingSpread.low)
                    {
                        //---- SPREAD LOW scale  ----
                        scale = vp.scales.createLowBias()
                            .domainMin(minVal)
                            .domainMax(maxVal)
                            .range(0, maxIndex)
                    }
                    else if (cm.spread == bps.MappingSpread.high)
                    {
                        //---- SPREAD HIGH scale ----
                        scale = vp.scales.createHighBias()
                            .domainMin(minVal)
                            .domainMax(maxVal)
                            .range(0, maxIndex)

                    }
                    else
                    {
                        //---- normal LINEAR scale ----
                        scale = vp.scales.createLinear()
                            .domainMin(minVal)
                            .domainMax(maxVal)
                            .range(0, maxIndex)
                    }
                }
            }

            if (scale && colType)
            {
                utils.buildFormatter(md, scale, colType);
            }

            return scale;
        }

        scaleColData(vector: NumericVector, index: number, scale: vp.scales.baseScale, defaultValue = 0)
        {
            var result = defaultValue;

            if (vector)
            {
                var colValue = <any> vector.values[index];

                var needKey = scale.scaleType() === vp.scales.ScaleType.categoryKey;
                if (needKey)
                {
                    colValue = vector.keyInfo.keysByIndex[colValue];
                }

                result = scale.scale(colValue);
            }

            return result;
        }

        layoutDataForRecord(i: number, dc: DrawContext, dr: bps.LayoutResult)
        {
            var nv = dc.nvData;
            var scales = dc.scales;

            dr.x = this.scaleColData(nv.x, i, scales.x);
            dr.y = this.scaleColData(nv.y, i, scales.y);
            dr.z = this.scaleColData(nv.z, i, scales.z);

            dr.width = this.scaleColData(nv.size, i, scales.size, 1);
            dr.height = dr.width;
            dr.depth = dr.width;

            dr.colorIndex = this.scaleColData(nv.colorIndex, i, scales.colorIndex);
            //colorIndex = Math.floor(colorIndex);

            dr.imageIndex = this.scaleColData(nv.imageIndex, i, scales.imageIndex);
        }

        resetDrawPerf()
        {
            this._drawPerf = <any> {};

            this._drawPerf.configDevice = 0;
            this._drawPerf.clear = 0;
            this._drawPerf.applyUniforms = 0;
            this._drawPerf.drawBuffers = 0;
            this._drawPerf.onFrame = 0;
            this._drawPerf.total = 0;
        }

        resetBuildPerf()
        {
            this._buildPerf = <any> {};

            this._buildPerf.layoutPrep = 0;
            this._buildPerf.preLayout = 0;
            this._buildPerf.layoutEx = 0;
            this._buildPerf.reorderBuffer = 0;
            //this._buildPerf.layout = 0;
            //this._buildPerf.process = 0;
            //this._buildPerf.fill = 0;
            this._buildPerf.layoutPost = 0;
            this._buildPerf.total = 0;
        }

        getBuildPerfTime(name: string)
        {
            return this._buildPerf[name];
        }

        getHoverIndex()
        {
            var hvi = -1;

            //---- draw hover shape on top ----
            var hp = this._view.hoverParams();
            if (hp.hoverEffect != bps.HoverEffect.none)
            {
                var drawOnTop = false;
                var hpk = this._view.hoverPrimaryKey();
                if (hpk !== null)
                {
                    hvi = this._dataFrame.getVectorIndexByKey(hpk);
                }
            }

            return hvi;
        }

        doHoverDrawPrep()
        {
            //---- update hoverIndex in drawInfos[] ----
            var hvi = this.getHoverIndex();

            if (hvi > -1)
            {
                //---- hover stuff ----
                var hp = this._view.hoverParams();
                var hoverColor = hp.hoverColor;
                //var drawHover = false;

                if (!hoverColor || hoverColor == "none" || hp.hoverEffect == bps.HoverEffect.sameColor)
                {
                    hvi = -1;
                    //drawHover = true;
                }
                else
                {
                    var cr3 = vp.color.getColorFromName(hoverColor);
                    var hRed = cr3[0] / 255;
                    var hGreen = cr3[1] / 255;
                    var hBlue = cr3[2] / 255;

                    this._uniforms.hoverColor.setValue(hRed, hGreen, hBlue);
                    //drawHover = true;
                }
            }

            this._uniforms.hoverVectorIndex.setValue(hvi);

            //---- apply "hvi" to last drawInfos[] ----
            var diCount = this._drawInfos.length;
            var diLast = this._drawInfos[diCount - 1];
            diLast.instOffset = hvi;
            this._bufferMgr.bindBuffersToArrayData([diCount-1]);
        }

        drawShapes()
        {
            var gl = this._gl;
            var diCount = this._drawInfos.length;

            //---- draw shapes ----
            gl.useProgram(this._shapesProgram);

            var isWireframe = this._view.isWireframe();
            var glInst = this._glInst;

            var geomType = null;
            if (this._drawPrimitive == bps.DrawPrimitive.point)
            {
                geomType = gl.POINTS;
            }
            else if (isWireframe || this._drawPrimitive == bps.DrawPrimitive.lineStrip)
            {
                geomType = gl.LINE_STRIP;
            }
            else if (this._drawPrimitive == bps.DrawPrimitive.linePairs)
            {
                geomType = gl.LINES;
            }
            else
            {
                geomType = gl.TRIANGLES;
            }

            var verticesPerShape = this.getNumVerticesPerShape();

            for (var i = 0; i < diCount; i++)
            {
                var di = this._drawInfos[i];

                if (i == diCount - 1)
                {
                    this.doHoverDrawPrep();
                }

                if (di.instOffset >= 0)
                {
                    this._bufferMgr.bindBufferForDrawing(i);

                    if (glInst)
                    {
                        glInst.drawArraysInstancedANGLE(geomType, 0, verticesPerShape, di.instCount);
                    }
                    else
                    {
                        gl.drawArrays(geomType, 0, di.instCount * verticesPerShape);
                    }

                    var error = gl.getError();
                    if (error)
                    {
                        //---- only do this for debugging! ----
                        //throw error;
                    }
                }
            }
        }

        draw3dGridLines()
        {
            var gl = this._gl;
            var diCount = this._drawInfos.length;

            if (this._view.is3dGridVisible())
            {
                //---- draw gridlines ----
                var gridLinesProgram = this._gridLinesProgram;
                gl.useProgram(gridLinesProgram);
                this.setGridLineUniforms();

                var glBuff = gridLinesProgram.glBuff;
                gl.bindBuffer(gl.ARRAY_BUFFER, glBuff);                 // make glBuff current buffer
                gl.vertexAttribPointer(gridLinesProgram.a_position, 3, gl.FLOAT, false, 0, 0);

                gl.drawArrays(gl.LINES, 0, gridLinesProgram.vertexCount);

                //---- make SHAPES the current program ----
                gl.useProgram(this._shapesProgram);

                this._bufferMgr.rebindBuffersAfterProgramSwitch();
            }
        }

        drawAllBuffers()
        {
            this.drawShapes();

            //---- known Chrome/Firefox bug workaround: mixing instanced and non-instanced drawing on same ctx ----
            //---- causes a drawing error here; so, we turn off 3D gridlines for these guys ----
            if (! this._glInst || vp.utils.isIE)
            {
                this.draw3dGridLines();
            }
        }

        addGridLine(buffer, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number)
        {
            buffer.push(x1);
            buffer.push(y1);
            buffer.push(z1);

            buffer.push(x2);
            buffer.push(y2);
            buffer.push(z2);
        }

        fillGridLinesBuffer(dc: DrawContext, facetOffset: any)
        {
            var buffer = this._gridLinesBuffer;

            //---- bottom front x line ----
            var x1 = dc.x + facetOffset.x;
            var x2 = x1 + dc.width;

            var y1 = dc.y + facetOffset.y;      //  dc.y - dc.height + facetOffset.y;
            var y2 = dc.y + dc.height;

            var z1 = dc.z;
            var z2 = dc.z + dc.depth;

            //---- bottom front X line ----
            this.addGridLine(buffer, x1, y1, z1, x2, y1, z1);

            //---- top front X line ----
            this.addGridLine(buffer, x1, y2, z1, x2, y2, z1);

            //---- bottom back X line ----
            this.addGridLine(buffer, x1, y1, z2, x2, y1, z2);

            //---- top back X line ----
            this.addGridLine(buffer, x1, y2, z2, x2, y2, z2);

            //---- left front Y line ----
            this.addGridLine(buffer, x1, y1, z1, x1, y2, z1);

            //---- right front Y line ----
            this.addGridLine(buffer, x2, y1, z1, x2, y2, z1);

            //---- left back Y line ----
            this.addGridLine(buffer, x1, y1, z2, x1, y2, z2);

            //---- right back Y line ----
            this.addGridLine(buffer, x2, y1, z2, x2, y2, z2);

            //---- bottom left Z line ----
            this.addGridLine(buffer, x1, y1, z1, x1, y1, z2);

            //---- bottom right Z line ----
            this.addGridLine(buffer, x2, y1, z1, x2, y1, z2);

            //---- top left Z line ----
            this.addGridLine(buffer, x1, y2, z1, x1, y2, z2);

            //---- top right Z line ----
            this.addGridLine(buffer, x2, y2, z1, x2, y2, z2);
        }

        forceDomApiCall()
        {
            //---- this code is NECESSARY to enable JIT-ing (make a DOM API call) ----
            var ctxJit = this._view.getContext2d();
            ctxJit.globalAlpha = this._view.textOpacity();
            ctxJit.font = "16px Tahoma";
        }

        bindGridLinesBuffer()
        {
            //---- bind buffer with GRIDLINES program ----
            var gl = this._gl;

            try
            {
                var gridLinesProgram = this._gridLinesProgram;

                gl.useProgram(gridLinesProgram);

                gridLinesProgram.a_position = gl.getAttribLocation(gridLinesProgram, "a_position");
                gl.enableVertexAttribArray(gridLinesProgram.a_position);

                gridLinesProgram.u_color = gl.getUniformLocation(gridLinesProgram, "u_color");
                gridLinesProgram.u_pMatrix = gl.getUniformLocation(gridLinesProgram, "u_pMatrix");
                gridLinesProgram.u_mvMatrix = gl.getUniformLocation(gridLinesProgram, "u_mvMatrix");

                //---- bind buffers ----
                var faBuffer = new Float32Array(this._gridLinesBuffer);

                var glBuff = gl.createBuffer();
                gridLinesProgram.glBuff = glBuff;
                gl.bindBuffer(gl.ARRAY_BUFFER, glBuff);                 // make glBuff current buffer

                gl.bufferData(gl.ARRAY_BUFFER, faBuffer, gl.STATIC_DRAW);     // fill glBuff from fa
                //gl.vertexAttribPointer(gridLinesProgram.a_position, 3, gl.FLOAT, false, 0, 0);

                gridLinesProgram.vertexCount = this._gridLinesBuffer.length / 3;
                gl.bindBuffer(gl.ARRAY_BUFFER, null);                 // remove current buffer
            }
            finally
            {
                //---- make SHAPES the current program
                gl.useProgram(this._shapesProgram);
            }
        }

        setGridLineUniforms()
        {
            var gl = this._gl;
            var glProgram = this._gridLinesProgram;

            //---- PROJECTION matrix ----
            var matProjection = this._transformer.getProjection();
            gl.uniformMatrix4fv(glProgram.u_pMatrix, false, new Float32Array(matProjection));

            //---- MODEL VIEW matrix ----
            var matView = this._transformer.getView();
            var matWorld = this._lerpWorld;         // 
            if (!matWorld)
            {
                //---- fallback, in case main rendering wasn't called (should never happen) ----
                matWorld = this._transformer.world();
            }

            var modelView = new Float32Array(16);
            mat4.multiply(modelView, matView, matWorld);
            gl.uniformMatrix4fv(glProgram.u_mvMatrix, false, new Float32Array(modelView));

            //---- LINE COLOR ----
            gl.uniform4f(glProgram.u_color, .25, .25, .25, 1);       // medium gray
        }

        setBounds(left: number, top: number, width: number, height: number)
        {
            this._canvasWidth = width;
            this._canvasHeight = height;

            //---- estimate the frameWidth/frameHeight until we actually rebuild chart frame ----
            this._frameWidth = width;
            this._frameHeight = height;

            this.markBuildNeeded("setBounds");
            this._rebuildCamera = true;
        }

        updateChartBounds(left: number, top: number, width: number, height: number, usingFacets: boolean)
        {
            var canvas3dElem = this._view.getCanvas3d();
            var canvas2dElem = this._view.getCanvas2d();

            //---- adjust so we don't overwrite the axes/box of chart ----
            left++;
            top++;
            width = Math.max(0, width - 2);
            height = Math.max(0, height - 3);

            if (this._hideAxes === true || this._hideAxes == "x")
            {
                width -= 22;
                height -= 15;

                top += 10;
            }

            //---- set bounds of CANVAS3D ----
            vp.select(canvas3dElem)
                .css("left", left + "px")
                .css("top", top + "px")
                .attr("width", width)
                .attr("height", height);

            vp.select(canvas3dElem)
                .css("border", "0px solid #555");

            //---- everything looks better without the box! ----
            //var strWidth = "";

            //if (usingFacets)
            //{
            //    //---- hide big box ----
            //    strWidth = "0px";
            //}
            //else if (this._hideAxes === true)
            //{
            //    strWidth = "1px";
            //}
            //else if (this._hideAxes == "x")
            //{
            //    strWidth = "0px";
            //}
            //else if (this._hideAxes === "y")
            //{
            //    strWidth = "0px";
            //}
            //else
            //{
            //    //---- using axes - show upper right ----
            //    strWidth = "0px 1px 1px 0px";
            //}
            //
            //vp.select(canvas3dElem)
            //    .css("border-width", strWidth);

            //---- set bounds of CANVAS2D ----
            vp.select(canvas2dElem)
                .css("left", left + "px")
                .css("top", top + "px")
                .attr("width", width)
                .attr("height", height);

            this._frameLeft = left;
            this._frameTop = top;
            this._frameWidth = width;
            this._frameHeight = height;

            this._transformer.updateCamera(this._view.isOrthoCamera(), this._frameWidth, this._frameHeight);
        }

        onBoundsOrCameraChanged()
        {
            this._rebuildCamera = true;
            this.markBuildNeeded("onBoundsOrCameraChanged");
        }

        easeInOut(t, maxPercent)
        {
            var easeFunc = this._easeFunction;
            var easeType = this._easeType;

            //---- normalize t ----
            t /= maxPercent;
            var value = t;

            //---- divide into IN and OUT cases ----
            if ((t < .5) && (easeType !== bps.EaseType.out))
            {
                var coreValue = easeFunc(t * 2);
                value = coreValue * .5;
            }

            if ((t >= .5) && (easeType !== bps.EaseType.in))
            {
                var coreValue = easeFunc(2 * (1 - t));
                value = .5 + (1 - coreValue) * .5;
            }

            //---- unnormalize value ----
            value *= maxPercent;

            return value;
        }

        onStartOfCycle()
        {
            this._lastFrameTime = vp.utils.now();

            this._isCycleActive = true;

            this._bufferMgr.flipIsUsingPrimaryBuffers();

            //---- set time for start of to/from animation ----
            this._toStartTime = vp.utils.now();

            this._chartFrameHelper.fadeInOut(false);

            this._cycleFrameCount = 0;
            this._animCycleCount++;             //so that cycle number is avail early on
        }

        onEndOfCycle(duration: number)
        {
            this._chartFrameHelper.fadeInOut(true);
            this._needTextureSwap = false;

            this._isCycleActive = false;

            this._lastCycleFrameRate = Math.floor(this._cycleFrameCount * 1000 / duration);
            this._lastCycleFrameCount = this._cycleFrameCount;

            this._isSmoothLast = this._view.colorMapping().isContinuous;
            this._isChannelLast = (this._view.colorMapping().channelMapping != null);
            this._opacityLast = this._view.shapeOpacity();
            this._sizeFactorLast = this._view.userSizeFactor();

            this._prevFilter = (this._nv.enterExitFilter) ? this._nv.enterExitFilter.clone() : null;
            this._prevChartClass = this._chartClass;
            this.captureLastWorld();

            var wasFirstFilteredStage = this._isFirstFilteredStage;

            if (this._isFirstFilteredStage)
            {
                this._isFirstFilteredStage = false;

                //---- start new cycle ----
                this.markBuildNeeded("isFirstFilteredStage");
            }

            //vp.utils.debug("onEndOfCycle: cycleFrameCount=" + this._cycleFrameCount +
            //    ",  this._isSelectionChangeOnly=" + this._isSelectionChangeOnly +
            //    ", continuousDrawing=" + this._isContinuousDrawing);

            if (!this._isSelectionChangeOnly)
            {
                HitTestRect.markCacheBuildNeeded(this._transformer, this._boundingBoxMgr);
            }

            this._isSelectionChangeOnly = false;             // until first "rebuildNeeded()" call

            this._view.onCycleEnded(wasFirstFilteredStage);
        }

        lastCycleFrameRate()
        {
            return this._lastCycleFrameRate;
        }

        lastCycleFrameCount()
        {
            return this._lastCycleFrameCount;
        }

        moveFrame()
        {
            this._animTimer = null;         // the timer that got us here is now expired

            if (this._buildNeeded)
            {
                var dataFrame = this._dataFrame;
                if (!dataFrame)
                {
                    dataFrame = this._dataMgr.getDataFrame()
                }

                var xm = this._view.xMapping();
                var isReadyToBuild = ((this._renderCount > 0 || (dataFrame && dataFrame.getRecordCount() > 0)) && (xm.colName));

                //vp.utils.debug("moveFrame: this._renderCount=" + this._renderCount + ", dataFrame=" + dataFrame +
                //    ", dataFrame.getRecordCount()=" + dataFrame.getRecordCount() + ", x..colName=" + xm.colName + 
                //    ", isReadyToBuild = " + isReadyToBuild);

                if (isReadyToBuild)
                {
                    if (this._view.isAnimOverride())
                    {
                        vp.utils.debug("moveFrame: texture1=" + this._texture1 + ", texture2=" + this._texture2);
                    }

                    //---- CAUTION: using IE trace collection API (performance.mark, etc.) may cost PERF ----
                    //---- do NOT enable these calls for released builds ----

                    //performance.mark("beforeBuildChart");
                    this.buildChart();
                    //performance.mark("afterBuildChart");
                    //performance.measure("buildChartElapsed");

                    //---- make visible after the first chart has been built ----
                    document.body.style.opacity = "1";

                    this._moveFrameCount++;

                    ////---- hide canvas2d until animation is complete ----
                    //vp.select(this._view.getContext2d())
                    //    .css("opacity", ".4")
                    //    .css("transition", "opacity .s ease- in -out")

                    if (!this._omitAnimOnNextBuild)
                    {
                        //---- start new ANIMATION CYCLE ("toPercent") ----
                        //---- note: this start the animation timing AFTER the chart has been built ----
                        this.onStartOfCycle();
                    }

                    this._omitAnimOnNextBuild = false;
                }
            }

            if (this._isCycleActive)
            {
                this._cycleFrameCount++;
            }

            if (this._instantSizeChange)
            {
                //---- this gets captured at end of frame, not cycle, because it is set instantly ----
                this._sizeFactorLast = this._view.userSizeFactor();
            }

            //---- animation timing ----
            var isOverride = this._view.isAnimOverride();
            if (!isOverride && this._isCycleActive)
            {
                this.calcAniPercent();
            }

            if (this._enableBuildNeededMarkOnNextFrame)
            {
                this._buildNeeded = true;
                this._enableBuildNeededMarkOnNextFrame = false;
            }

        }

       calcAniPercent(forceMax?: boolean)
        {
            var ad = this._animationData;

            //---- use milliseconds for all times here ----
            var aniDuration = 1000 * ad.animationDuration;   
            var staggerDuration = 1000 * ad.maxStaggerTime;
                         
            var maxPercent = (ad.isStaggeringEnabled) ? (aniDuration + staggerDuration) / aniDuration : 1;

            //if (this._isSelectionChangeOnly)
            //{
            //    aniDuration /= 2;
            //    maxPercent /= 2;        //  = 1;
            //}

            var now = vp.utils.now();
            var toPercent = maxPercent;
            var toPercentUneased = maxPercent;
            var elapsed = 0;

            if (ad.isAnimationEnabled && ! forceMax)
            {
                elapsed = now - this._toStartTime;      
                toPercent = Math.min(maxPercent, elapsed / aniDuration);

                toPercentUneased = toPercent;

                //---- apply easing ----
                if (this._easeFunction)
                {
                    toPercent = this.easeInOut(toPercent, maxPercent);
                }
            }

            //vp.utils.debug("toPercentUneased=" + toPercentUneased);

            if (toPercentUneased == maxPercent && this._isCycleActive)
            {
                ////---- cycle ended ----
                //this.onEndOfCycle(elapsed);

                //this._isDrawNeeded = true;      // we need one final draw
                this._isLastDrawOfCycle = true;
            }

            this._toPercentUnflipped = toPercentUneased;

            if (!this.isUsingPrimaryBuffers())
            {
                //---- flip percent ----
                toPercent = maxPercent - toPercent;
                toPercentUneased = maxPercent - toPercentUneased;
            }

            this._toPercent = toPercent;
            this._toPercentUneased = toPercentUneased;
            this._maxPercent = maxPercent;
        }

        addToDrawPerf(name: string, start: number)
        {
            var now = vp.utils.now();
            var elapsed = now - start;
            this._drawPerf[name] += elapsed;

            return now;
        }

        addToBuildPerf(name: string, start: number)
        {
            var now = vp.utils.now();
            var elapsed = now - start;
            this._buildPerf[name] += elapsed;

            return now;
        }

        updateStats()
        {
            //---- update stats ----
            var now = vp.utils.now();
            this._frameCount++;
            this._renderCount++;

            var duration = now - this._lastFrameTime;
            if (duration > 1000)        // calc frame stats every second
            {
                var frameCount = this._frameCount;
                this._frameRate = Math.floor(frameCount * 1000 / duration);
                if (this._frameRate > 80)
                {
                    var a = 9999;
                }

                this._frameCount = 0;

                this._lastFrameTime = now;

                if (true)
                {
                    var perf = this._drawPerf;

                    var msg = "total=" + round(perf.total) + " ms, configDevice=" + round(perf.configDevice) + ", clear="
                        + round(perf.clear) + ", applyUniforms=" + round(perf.applyUniforms) + ", applyCount=" +
                        glUtils.GlUniformClass.uniformSetCount + ", drawBuffers="
                        + round(perf.drawBuffers) + ", stats=" + round(perf.onFrame);

                    this._drawFrameStatsMsg = msg;

                    this.resetDrawPerf();
                }

            }
        }

        getScatterShapeSizeInPixels()
        {
            var size = (this._prepassDc) ? this._prepassDc.maxShapeSize : 0;
            size = this._transformer.worldSizeToScreen(size);

            return size;
        }

        captureLastWorld()
        {
            var matWorld = this._transformer.world();

            //---- matWorld can be an array or a Float32Array, depending on if insight has been loaded ----
            if (vp.utils.isArray(matWorld))
            {
                this._lastWorld = vp.utils.copyArray(<number[]><any> matWorld);
            }
            else
            {
                this._lastWorld = new Float32Array(matWorld);    
            }

            //vp.utils.debug("captureLastWorld: matWorld=" + matWorld.toString() + ", this._lastWorld=" + this._lastWorld.toString() +
            //    ", this._lastWorld[6]=" + this._lastWorld[6]);
        }

        drawFrame()
        {
            var dfStart = vp.utils.now();

            this.updateStats();

            var usingInertial = (this._view.getTransformMgr().hasInertia());

            if (this._isContinuousDrawing || this._isCycleActive || this._isUiOpActive || usingInertial || this._isDrawNeeded
                || this._transformer._transformChanged)
            {
                if ((! this._isCycleActive) && (this._transformer._transformChanged))
                {
                    this.captureLastWorld();
                }

                if (this._isDrawNeeded)
                {
                    //---- increment this to keep track info correct ----
                    this._nextBuildId++;
                }

                this.drawFrameCore();

                this._isDrawNeeded = false;
            }

            var start = vp.utils.now();
            this.onDataChanged("drawFrame");
            this.addToDrawPerf("onFrame", start);

            this.addToDrawPerf("total", dfStart);

            if (this._isLastDrawOfCycle)
            {
                this._isLastDrawOfCycle = false;
                this.onEndOfCycle(vp.utils.now() - this._toStartTime);
            }

            //---- always set this, so we can keep accurate stats ----
            this.setTimerForNextFrame();    
        }

        drawFrameCore()
        {
            var windowMgr = this._view._windowMgr;
            var gl = this._gl;

            var start = vp.utils.now();

            var buildId = this._nextBuildId - 1;

            addTrace("drawFrame", this._chartClass, TraceEventType.start, "f" + buildId + "-" + this._frameCount);

            //---- apply various params that may have changed ----
            glUtils.configDevice(gl, this._frameWidth, this._frameHeight, this._clearColor, this._isBlendingEnabled, this._isCullingEnabled);

            start = this.addToDrawPerf("configDevice", start);

            //---- clear buffers ----
            gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

            start = this.addToDrawPerf("clear", start);

            this.applyUniformsToShaders();

            start = this.addToDrawPerf("applyUniforms", start);

            if (this._drawPrimitive == bps.DrawPrimitive.smartCube)
            {
                //---- 12 passes over 3 vertices/cube ----
                for (var i = 0; i < 12; i++)
                {
                    //---- set triangleIndex ----
                    this._uniforms.triangleIndex.setValue(i);

                    this.drawAllBuffers();
                }
            }
            else
            {
                //if (!this._usingPointCubes)
                {
                    //---- set triangleIndex ----
                    this._uniforms.triangleIndex.setValue(0);
                }

                //performance.mark("startDrawBuffers");
                this.drawAllBuffers();
                //performance.mark("endDrawBuffers");
                //performance.measure("drawBuffersElapsed", "startDrawBuffers", "endDrawBuffers");
            }

            this._drawFrameCount++;

            start = this.addToDrawPerf("drawBuffers", start);

            if (!this._isCycleActive)
            {
                if (this._transformer._transformChanged)
                {
                    HitTestRect.markCacheBuildNeeded(this._transformer, this._boundingBoxMgr);
                    this._transformer._transformChanged = false;
                }

                ////---- show canvas2d after animation is complete ----
                //vp.select(this._view.getContext2d())
                //    .css("opacity", "1")
                //    .css("transition", "opacity .4s ease- in -out")
            }

            this.onDataChanged("drawFrameCore");

            addTrace("drawFrame", this._chartClass, TraceEventType.end, "f" + buildId + "-" + this._frameCount);
        }
    }

     /** information needed to draw a facet/chart. */
    export class DrawContext
    {
        x: number;
        y: number;
        z: number;

        width: number;
        height: number;
        depth: number;

        facetHelper: FacetHelperClass;
        nvData: NamedVectors;
        scales: NamedScales;

        /** the default depth for 2D shapes. */
        defaultDepth2d: number;

        /** the size factor used by the gl transformer (varies by which camera is in use). */
        //transformSizeFactor: number;

        /** the size factor specified by the user (default = 1). */
        userSizeFactor: number;

        /** used by baseGlVis code the scale size to GL sizes after user layout (transformSizeFactor * userSizeFactor. */
        //combinedSizeFactor: number;

        /* the recommend shape size for equal density layout of shapes.  some charts may use other sizes. */
        maxShapeSize = 0;

        /* how does this compare to maxShapeSize? */
        itemSize = 0;

        /* this is 1/2 of itemSize. */
        itemHalf = 0;

        /** number of records in this facet/chart. */
        recordCount: number;

        /** number of records in this facet/chart after applying filter. */
        filteredRecordCount: number;

        /* the index of the facet currently being drawn. */
        facetIndex: number;

        //attrInfos: any;            // map of names -> AttrInfo structs

        /* the chart type from the last draw. */
        fromChartType: string;

        /* the current chart type. */
        toChartType: string;

        /** set when used as count, sum, etc. */
        xCalcName: string;

        /** set when used as count, sum, etc. */
        yCalcName: string;

        //---- for consistent/correct access ----
        layoutFilterVector: Float32Array;

        constructor(rcxWorld: Rect3d, facetHelper: FacetHelperClass, nvData: NamedVectors, scales: NamedScales,
            recordCount: number, filteredRecordCount: number, /*attrInfos: any,*/ userSizeFactor: number,
            fromChartType: string, toChartType: string, itemSize: number, view: DataViewClass)
        {
            //---- minimums ----
            this.x = rcxWorld.left;
            this.y = rcxWorld.bottom;       // top
            this.z = rcxWorld.back;

            //---- positive sizes ----
            this.width = rcxWorld.right - rcxWorld.left;
            this.height = rcxWorld.top - rcxWorld.bottom;
            this.depth = rcxWorld.front - rcxWorld.back;

            this.facetHelper = facetHelper;
            this.nvData = nvData;
            this.scales = scales;

            this.recordCount = recordCount;
            this.filteredRecordCount = filteredRecordCount;

            //this.attrInfos = attrInfos;

            this.fromChartType = fromChartType;
            this.toChartType = toChartType;

            this.facetIndex = 0;

            //---- sizes ----
            //this.transformSizeFactor = transformSizeFactor;
            this.userSizeFactor = userSizeFactor;
            //this.combinedSizeFactor = combinedSizeFactor;

            //---- is there a difference between itemSize and maxShapeSize? ----
            this.maxShapeSize = ChartUtils.getScatterShapeSize(this, null, view);
            this.itemSize = this.maxShapeSize;     //   itemSize;
            this.itemHalf = this.itemSize / 2;

            var zSpace = 4;
            this.defaultDepth2d = Math.min(this.itemSize * .05, zSpace *.25); 

            this.layoutFilterVector = (nvData.layoutFilter && nvData.layoutFilter.values) ? nvData.layoutFilter.values : null;  
            if (!this.layoutFilterVector)
            {
                //---- most charts don't check for null, so supply a "not filtered" vector ----
                //---- TODO: change all charts to respect null here and remove the PERF-ISSUE creation of this zero vector ----
                //this.layoutFilterVector = vp.data.dataRepeat(0, recordCount);
            }
             
        }
    }

    /** world unit bounds. */
    export class Bounds
    {
        x: number;          // xMin
        y: number;          // yMin
        width: number;
        height: number;
    }

    export class KeyInfo
    {
        /** the number of unique keys in the associated column. */
        keyCount: number;

        /** provides a map from key string to its unique key number ("index"). */
        indexesByKey: { [key: string]: number };      // map(string -> number) 

        /** provides a map from unique key number to key string. */
        keysByIndex: { [keyIndex: number]: string }; 

        /** (TODO: use replace rowNum with PrimaryKey) provides a map from the unsorted data row number to the key. */
        rowsByKey: { [s: string]: number[] };

        /** (TODO: use replace rowNum with PrimaryKey) provides a map from key to the unsorted data row number. */
        keysByRow: string[];

        /** An array of all keys, in the correct sort order (for axes, legends, etc.). */
        sortedKeys: string[];

        constructor(keyCount: number, indexesByKey: { [s: string]: number }, keysByIndex: { [keyIndex: number]: string },
            rowsByKey: { [s: string]: number[] }, keysByRow: string[], sortedKeys: string[])
        {
            this.keyCount = keyCount;
            this.indexesByKey = indexesByKey;
            this.keysByIndex = keysByIndex;
            this.rowsByKey = rowsByKey;
            this.keysByRow = keysByRow;
            this.sortedKeys = sortedKeys;
        }
    }

    /** this represents a vector, usually extracted from a dataFrame, which has been converted to all numbers. */
    export class NumericVector
    {
        colType: string;
        colName: string;
        values: Float32Array;
        keyInfo: KeyInfo;           // only set when vector was converted from string

        constructor(values: Float32Array|number[], colName: string, colType: string)
        {
            if (values instanceof Float32Array)
            {
                this.values = values;
            }
            else
            {
                this.values = new Float32Array(values);
            }

            this.colName = colName;
            this.colType = colType;
        }

        clone()
        {
            var newArray = new Float32Array(this.values);

            var nv = new NumericVector(newArray, this.colName, this.colType);
            nv.keyInfo = this.keyInfo;

            return nv;
        }

        getRawData(index: number)
        {
            var value = (this.keyInfo) ? this.keyInfo.keysByRow[index] : this.values[index];
            return value;
        }

        count(value: number)
        {
            var count = 0;

            for (var i = 0; i < this.values.length; i++)
            {
                if (this.values[i] === value)
                {
                    count++;
                }
            }

            return count;
        }

        copy(indexes: number[]): NumericVector
        {
            var newValues = new Float32Array(indexes.length);

            for (var i = 0; i < indexes.length; i++)
            {
                var index = indexes[i];
                var value = this.values[index];
                newValues[i] = value;
            }

            var nv = new NumericVector(newValues, this.colName, this.colType);

            if (this.colType === "string")
            {
                utils.rebuildStringKeyIndexes(nv, indexes, this);
            }

            return nv;
        }
    }

    export class NamedVectors
    {
        length: number;

        x: NumericVector;
        y: NumericVector;
        z: NumericVector;

        red: NumericVector;
        green: NumericVector;
        blue: NumericVector;

        colorIndex: NumericVector;
        imageIndex: NumericVector;
        staggerOffset: NumericVector;
        size: NumericVector;
        text: NumericVector;
        facet: NumericVector;
        aux: NumericVector;             // for SQUARIFY and SUM operations

        //---- system data ----
        selected: NumericVector;
        layoutFilter: NumericVector;
        enterExitFilter: NumericVector;
        randomX: NumericVector;
        randomY: NumericVector;

        //---- this is kept in string form for quick reference to original values ----
        primaryKey: NumericVector;      //string[];

        constructor(length: number, x?: NumericVector, y?: NumericVector, z?: NumericVector, colorIndex?: NumericVector, imageIndex?: NumericVector,
            staggerOffset?: NumericVector, size?: NumericVector, text?: NumericVector, facet?: NumericVector, selected?: NumericVector,
            layoutFilter?: NumericVector, enterExitFilter?: NumericVector, primaryKey?: NumericVector, randomX?: NumericVector, randomY?: NumericVector,
            red?: NumericVector, green?: NumericVector, blue?: NumericVector, aux?: NumericVector)
        {
            this.length = length;

            this.x = x;
            this.y = y;
            this.z = z;
            this.colorIndex = colorIndex;
            this.imageIndex = imageIndex;
            this.staggerOffset = staggerOffset;
            this.size = size;
            this.text = text;
            this.facet = facet;
            this.selected = selected;
            this.layoutFilter = layoutFilter;
            this.enterExitFilter = enterExitFilter;
            this.primaryKey = primaryKey;
            this.randomX = randomX;
            this.randomY = randomY;

            this.red = red;
            this.green = green;
            this.blue = blue;

            this.aux = aux;
        }

        copy(indexes: number[]): NamedVectors
        {
            var nv = new NamedVectors(indexes.length);

            var keys = vp.utils.keys(this);
            for (var i = 0; i < keys.length; i++)
            {
                var key = keys[i];
                if (key != "length" && this[key] != null)
                {
                    var numericVector = <NumericVector>this[key];
                    var vector = numericVector.copy(indexes);
                    nv[key] = vector;
                }
            }

            return nv;
        }
    }

    export class NamedScales
    {
        x: vp.scales.baseScale;
        y: vp.scales.baseScale;
        z: vp.scales.baseScale;
        red: vp.scales.baseScale;
        green: vp.scales.baseScale;
        blue: vp.scales.baseScale;
        size: vp.scales.baseScale;
        colorIndex: vp.scales.baseScale;
        imageIndex: vp.scales.baseScale;
    }

    export class NamedBuffers
    {
        xyzArray: Float32Array;
        sizeArray: Float32Array;
        rgbArray: Float32Array;
        colorArray: Float32Array;
        imageIndexArray: Float32Array;
        staggerOffsetArray: Float32Array;
        //opacityArray: Float32Array;
        thetaArray: Float32Array;
        vertexIdArray: Float32Array;
        vectorIndexArray: Float32Array;
    }

    /** this is data that needs to be transferred between the previous chart instance and the 
     * newly created instance. */
    export class ChartState
    {
        _glAttributes: glUtils.GlAttributeClass[];
        _pkToDrawIndex: any;
        _drawPrimitive: bps.DrawPrimitive;
        _colorFloats: number[];
        _colorFloats2: number[];
        _maxColors: number;
        _maxColors2: number;
        _dataFrame: DataFrameClass;
        _animCycleCount: number;
        _toPercent: number;
        _prevChartClass: string;
        _chartFrameHelper: ChartFrameHelperClass;
        _refreshData: boolean;
        _sizeFactorLast: number;
        _opacityLast: number;
        _lastWorld: Float32Array;
        _boundingBoxMgr: BoundingBoxMgrClass;
        _nextBuildId: number;
        _drawOrderKey: string;
        _arrayMemory: number;
        _shapesProgram: any;
        _gridLinesProgram: any;
        _rebuildAttrBuffers: boolean;
        _lastVerticesPerRecord: number;
        _vertexShaderId: string;
        _fragmentShaderId: string;
        _bufferMgr: BufferMgrClass;

        //---- textures ----
        _texture1: WebGLTexture;
        _texture2: WebGLTexture;
        _textureCount1: number;
        _textureCount2: number;
        _mostRecentTexture: WebGLTexture;
        _mostRecentTextureCount = 0;
        _needTextureSwap = false;
        _shapeMappingPalette = null;
        _texPalette = null;
        _fromBuffersHaveData = null;

        constructor()
        {
            this._glAttributes = null;
            this._pkToDrawIndex = null;
            this._drawPrimitive = null;
            this._colorFloats = null;
            this._colorFloats2 = null;
            this._dataFrame = null;
            this._animCycleCount = null;
            this._toPercent = null;
            this._prevChartClass = null;
            this._chartFrameHelper = null;
            this._refreshData = null;
            this._sizeFactorLast = null;
            this._opacityLast = null;
            this._maxColors = null;
            this._maxColors2 = null;
            this._lastWorld = null;
            this._boundingBoxMgr = null;
            this._nextBuildId = null;
            this._fromBuffersHaveData = null;
            this._drawOrderKey = null;
            this._arrayMemory = null;
            this._shapesProgram = null;
            this._gridLinesProgram = null;
            this._rebuildAttrBuffers = false;
            this._lastVerticesPerRecord = null;
            this._vertexShaderId = null;
            this._fragmentShaderId = null;
            this._bufferMgr = null;

            //---- textures ----
            this._texture1 = null;
            this._texture2 = null;
            this._textureCount1 = null;
            this._textureCount2 = null;
            this._mostRecentTexture = null;
            this._mostRecentTextureCount = null;
            this._needTextureSwap = null;
            this._shapeMappingPalette = null;
            this._texPalette = null;
       }
    }

    export class BoundingBox
    {
        xMin: number;
        yMin: number;
        zMin: number;

        xMax: number;
        yMax: number;
        zMax: number;

        theta: number;
        dist: number;

        primaryKey: string;
    }

    export class DrawInfo
    {
        instOffset: number;
        instCount: number;

        constructor(offset: number, count: number)
        {
            this.instOffset = offset;
            this.instCount = count;
        }
    }
}