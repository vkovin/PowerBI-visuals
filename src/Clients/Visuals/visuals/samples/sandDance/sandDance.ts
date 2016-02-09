/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/// <reference path="app/_references.ts" />
/// <reference path="../../../_references.ts" />

//--------- SandDance End.

module powerbi.visuals.samples {
    import Selector = data.Selector;
    import SelectionManager = utility.SelectionManager;
    import SemanticFilter = data.SemanticFilter;
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import DataViewObjectPropertyDescriptors = data.DataViewObjectPropertyDescriptors;
    import DataViewObjectPropertyDescriptor = data.DataViewObjectPropertyDescriptor;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;

    module chartType {
        export const types: string[] = [
            "Scatter",
            "Column",
            "Bar",
            "Flat",
            "Squarify",
            "Density",
            "Violin",
            "Radial",
            "Scatter-3D",
            "Stacks"
        ];

        export const type: IEnumType = createEnumType(types.map((type: string) => {
            return {
                value: type,
                displayName: type
            };
        }));
    } 

    export class SandDanceSettingsManager {
        private _settings: SandDanceSettings;

        public set settings(value: SandDanceSettings) {
            this._settings = value;
        }

        public getLabelsColor(): string {
            return (this._settings && this._settings.labels && this._settings.labels.color) || "#fff";
        }

        private getChartSettings(): SandDanceChartSettings {
            return this._settings && this._settings.chart;
        }

        public getPanelBackgroundColor(): string {
            return (this.getChartSettings() && this._settings.chart.panelBackgroundColor) || "#000";
        }

        private getLabelsSettings(): SandDanceLabelsSettings {
            return this._settings && this._settings.labels;
        }

        public getBoxBackgroundColor(): string {
            return (this.getLabelsSettings() && this._settings.labels.boxBackgroundColor) || "#000";
        }

        public getBoxHoverBackgroundColor(): string {
            return (this.getLabelsSettings() && this._settings.labels.boxHoverBackgroundColor) || "#333";
        }

        public getLabelsFontSize(): number {
            return jsCommon.PixelConverter.fromPointToPixel((this.getLabelsSettings() && this._settings.labels.fontSize) || 8.3);
        }

        private getToolbarSettings(): SandDanceToolbarSettings {
            return this._settings && this._settings.toolbar
        }

        public getToolbarColor(): string {
            return (this.getToolbarSettings() && this._settings.toolbar.color) || "#6e6f71";
        }

        public getToolBarActiveColor(): string {
            return (this.getToolbarSettings() && this._settings.toolbar.activeColor) || "#fff";
        }
    }

    export interface SandDanceData {
        __selectionIndexes: number[];
        [columnName: string]: any[];
    }

    export interface SandDanceDataView {
        settings: SandDanceSettings;
        data: SandDanceData;
        highlights: any[];
        selectionIds: SelectionId[];
    }

    export interface SandDanceConstructorOptions {
        margin?: IMargin;
    }

    export interface SandDanceColorSettings {
        color: string;
    }

    export interface SandDanceBackgroundColorSettings {
        backgroundColor?: string;
    }

    export interface SandDanceChartSettings extends SandDanceBackgroundColorSettings {
        chartType: string;
        color: string;
        panelBackgroundColor: string;
        fontSize: number;
        selectionNumber: number;
    }

    export interface SandDanceCanvasSettings extends SandDanceBackgroundColorSettings {
        shapeColor: string;
    }

    export interface SandDanceLabelsSettings extends SandDanceColorSettings {
        boxBackgroundColor: string;
        boxHoverBackgroundColor: string;
        fontSize: number;
    }

    export interface SandDanceToolbarSettings extends SandDanceBackgroundColorSettings {
        color: string;
        activeColor: string;
    }

    export interface SandDanceSettings {
        application: any;
        session: any;
        preloads: any;
        chart: SandDanceChartSettings;
        canvas: SandDanceCanvasSettings;
        labels: SandDanceLabelsSettings;
        toolbar: SandDanceToolbarSettings;
    }

    interface PanelTable {
        ids: string[];
    }

    interface SandDanceProperty {
        [propertyName: string]: DataViewObjectPropertyIdentifier;
    }

    interface SandDanceProperties {
        [objectName: string]: SandDanceProperty;
    }

    export class SandDance implements IVisual {
        private static ClassName: string = "sandDance";

        private static DefaultFontSize: number = 8.3;

        private static Properties: SandDanceProperties = {
            general: {
                filter: {
                    objectName: "general",
                    propertyName: "filter"
                }
            },
            chart: {
                chartType: {
                    objectName: "chart",
                    propertyName: "chartType"
                },
                backgroundColor: {
                    objectName: "chart",
                    propertyName: "backgroundColor"
                },
                color: {
                    objectName: "chart",
                    propertyName: "color"
                },
                panelBackgroundColor: {
                    objectName: "chart",
                    propertyName: "panelBackgroundColor"
                },
                fontSize: {
                    objectName: "chart",
                    propertyName: "fontSize"
                },
                selectionNumber: {
                    objectName: "chart",
                    propertyName: "selectionNumber"
                }
            },
            canvas: {
                backgroundColor: {
                    objectName: "canvas",
                    propertyName: "backgroundColor"
                },
                shapeColor: {
                    objectName: "canvas",
                    propertyName: "shapeColor"
                }
            },
            labels: {
                color: {
                    objectName: "labels",
                    propertyName: "color"
                },
                boxBackgroundColor: {
                    objectName: "labels",
                    propertyName: "boxBackgroundColor"
                },
                boxHoverBackgroundColor: {
                    objectName: "labels",
                    propertyName: "boxHoverBackgroundColor"
                },
                fontSize: {
                    objectName: "labels",
                    propertyName: "fontSize"
                }
            },
            toolbar: {
                backgroundColor: {
                    objectName: "toolbar",
                    propertyName: "backgroundColor"
                },
                color: {
                    objectName: "toolbar",
                    propertyName: "color"
                },
                activeColor: {
                    objectName: "toolbar",
                    propertyName: "activeColor"
                }
            }
        };

        private static FileInfoSelector: ClassAndSelector = createClassAndSelector("fileInfo");

        private static PlayAndIconBarSelector: ClassAndSelector = createClassAndSelector("playAndIconBar");
        private static PlayPanelSelector: ClassAndSelector = createClassAndSelector("playPanel");
        private static PlayExButtonSelector: ClassAndSelector = createClassAndSelector("playExButton");
        private static StopButtonSelector: ClassAndSelector = createClassAndSelector("stopButton");

        private static TextButtonSelector: ClassAndSelector = createClassAndSelector("textButton");

        private static IconBarSelector: ClassAndSelector = createClassAndSelector("iconBar");

        private static SearchPanelSelector: ClassAndSelector = createClassAndSelector("searchPanel");
        private static BtSearchColSelector: ClassAndSelector = createClassAndSelector("btSearchCol");
        private static SearchColSelector: ClassAndSelector = createClassAndSelector("searchCol");
        private static SearchTextSelector: ClassAndSelector = createClassAndSelector("searchText");

        private static LeftPanelSelector: ClassAndSelector = createClassAndSelector("leftPanel");
        private static YStuffSelector: ClassAndSelector = createClassAndSelector("yStuff");
        private static YButtonSelector: ClassAndSelector = createClassAndSelector("yButton");
        private static YBinsSelector: ClassAndSelector = createClassAndSelector("yBins");
        private static ZStuffSelector: ClassAndSelector = createClassAndSelector("zStuff");
        private static ZButtonSelector: ClassAndSelector = createClassAndSelector("zButton");
        private static ZBinsSelecotr: ClassAndSelector = createClassAndSelector("zBins");

        private static BigBarSelector: ClassAndSelector = createClassAndSelector("bigBar");
        private static NoSpaceTableSelector: ClassAndSelector = createClassAndSelector("noSpaceTable");

        private static ChartSelector: ClassAndSelector = createClassAndSelector("myChart");

        private static Canvas3DSelector: ClassAndSelector = createClassAndSelector("canvas3d");
        private static Canvas2DSelector: ClassAndSelector = createClassAndSelector("canvas2d");
        private static SvgSelector: ClassAndSelector = createClassAndSelector("svgDoc");

        private static CanvasElementSelector: ClassAndSelector = createClassAndSelector("canvasElem");
        private static CanvasSelector: ClassAndSelector = createClassAndSelector("canvas");

        private static ChartUxDivSelector: ClassAndSelector = createClassAndSelector("chartUxDiv");

        private static FacetLabelHolderSelector: ClassAndSelector = createClassAndSelector("facetLabelHolder");

        private static RightPanelSelector: ClassAndSelector = createClassAndSelector("rightPanel");
        private static ButtonLegendComboSelector: ClassAndSelector = createClassAndSelector("buttonLegendCombo");
        private static LegendSelector: ClassAndSelector = createClassAndSelector("legend");

        private static BottomPanelSelector: ClassAndSelector = createClassAndSelector("bottomPanel");
        private static XStuffSelector: ClassAndSelector = createClassAndSelector("xStuff");
        private static XButtonSelector: ClassAndSelector = createClassAndSelector("xButton");
        private static XBinsSelector: ClassAndSelector = createClassAndSelector("xBins");

        private static DebugPanelSelector: ClassAndSelector = createClassAndSelector("debugPanel");
        private static DebugPanelItemSelector: ClassAndSelector = createClassAndSelector("debugPanel-item");

        private static Units: string = "px";

        private static DebugPanelItems: string[] = [
            "visStats",
            "gpuStats",
            "hitTestStats",
            "moveStats",
            "drawStats"
        ];

        private static DefaultSettings: SandDanceSettings = {
            application: {},
            session: {},
            preloads: {},
            chart: {
                chartType: chartType.types[1],
                color: "#fff",
                panelBackgroundColor: "#1C1A18",
                fontSize: SandDance.DefaultFontSize,
                backgroundColor: "#000",
                selectionNumber: 250
            },
            canvas: {
                backgroundColor: "#000",
                shapeColor: "#0cf"
            },
            labels: {
                color: "#808080",
                boxBackgroundColor: "#000",
                boxHoverBackgroundColor: "#333",
                fontSize: SandDance.DefaultFontSize
            },
            toolbar: {
                backgroundColor: "#1C1A18",
                color: "#6e6f71",
                activeColor: "#fff"
            }
        };

        public static capabilities: VisualCapabilities = {
            dataRoles: [{
                name: "Values",
                kind: VisualDataRoleKind.GroupingOrMeasure
            }],
            dataViewMappings: [{
                table: {
                    rows: {
                        for: { in: "Values" },
                        dataReductionAlgorithm: { window: { count: 50000 } }
                    },
                    rowCount: { preferred: { min: 1 } }
                }
            }],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter("Visual_General"),
                    properties: {
                        formatString: { type: { formatting: { formatString: true } } },
                        selected: {
                             type: { bool: true }
                        },
                        filter: {
                            type: { filter: {} },
                            rule: {
                                output: {
                                    property: "selected",
                                    selector: ["Values"],
                                }
                            }
                        }
                    }
                },
                application: {
                    displayName: "Application",
                    properties: {
                        settings: {
                            displayName: "Settings",
                            type: { text: true }
                        }
                    }
                },
                session: {
                    displayName: "Session",
                    properties: {
                        settings: {
                            displayName: "Settings",
                            type: { text: true }
                        }
                    }
                },
                preloads: {
                    displayName: "Preloads",
                    properties: {
                        settings: {
                            displayName: "Settings",
                            type: { text: true }
                        }
                    }
                },
                chart: {
                    displayName: "Chart",
                    properties: {
                        chartType: {
                            displayName: "Chart Type",
                            type: { enumeration: chartType.type }
                        },
                        backgroundColor: {
                            displayName: "Background Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        color: {
                            displayName: "Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        panelBackgroundColor: {
                            displayName: "Panel Background Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        fontSize: {
                            displayName: data.createDisplayNameGetter("Visual_TextSize"),
                            type: { formatting: { fontSize: true } }
                        },
                        selectionNumber: {
                            displayName: "Selection number",
                            type: { numeric: true }
                        }
                    }
                },
                canvas: {
                    displayName: "Canvas",
                    properties: {
                        backgroundColor: {
                            displayName: "Background Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        shapeColor: {
                            displayName: "Shape Color",
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                },
                labels: {
                    displayName: data.createDisplayNameGetter('Visual_DataPointsLabels'),
                    description: data.createDisplayNameGetter('Visual_DataPointsLabelsDescription'),
                    properties: {
                        color: {
                            displayName: "Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        boxBackgroundColor: {
                            displayName: "Box Background Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        boxHoverBackgroundColor: {
                            displayName: "Box Hover Background Color",
                            type: { fill: { solid: { color: true } } }
                        },
                        fontSize: {
                            displayName: data.createDisplayNameGetter("Visual_TextSize"),
                            type: { formatting: { fontSize: true } }
                        }
                    }
                },
                toolbar: {
                    displayName: "Toolbar",
                    properties: {
                        backgroundColor: {
                            displayName: "Background Color",
                            type: { fill: { solid : { color: true } } }
                        },
                        color: {
                            displayName: "Color",
                            type: { fill: { solid : { color: true } } }
                        },
                        activeColor: {
                            displayName: "Active Color",
                            type: { fill: { solid : { color: true } } }
                        }
                    }
                }
            },
            supportsHighlight: true,
            suppressDefaultTitle: true,
            supportsSelection: true
        };

        private margin: IMargin = {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
        };

        private viewport: IViewport;

        private host: IVisualHostServices;

        private colors: IDataColorPalette;

        private rootElement: D3.Selection;
        private mainElement: D3.Selection;
        private viewElement: D3.Selection;

        private canvas3dElement: D3.Selection;
        private canvas2dElement: D3.Selection;
        private svgElement: D3.Selection;

        //TODO: add other elements.

        private coreApplication: beachParty.AppMgrClass;
        private application: beachPartyApp.AppClass;

        private dataView: SandDanceDataView;

        private selectionManager: SelectionManager;

        private objectCache: sandDance.ObjectCache;

        constructor(constructorOptions?: SandDanceConstructorOptions) {
            if (constructorOptions) {
                this.margin = constructorOptions.margin || this.margin;
            }
        }

        public init(visualsOptions: VisualInitOptions): void {
            this.host = visualsOptions.host;

            this.selectionManager = new SelectionManager({ hostServices: this.host });

            var style: IVisualStyle = visualsOptions.style;

            this.colors = style && style.colorPalette
                ? style.colorPalette.dataColors
                : new DataColorPalette();

            this.addElements(visualsOptions.element.get(0));

            this.setSize(visualsOptions.viewport);

            this.rootElement.style("margin", shapes.Thickness.toCssString(this.margin));

            this.objectCache = new sandDance.ObjectCache();

            this.objectCache.set("settingsManager", new SandDanceSettingsManager());
            this.objectCache.set("hostBus", new sandDance.Bus("hostBus"));
            this.objectCache.set("iframeBus", new sandDance.Bus("iframeBus"));

            this.application = new beachPartyApp.AppClass(
                this.objectCache,
                this.saveSettings.bind(this),
                this.loadSettings.bind(this),
                this.changeChartType.bind(this),
                this.onSelect.bind(this),
                <HTMLElement> this.rootElement.node());

            this.application.setViewport(this.viewport.width, this.viewport.height);
            this.application.run();

            this.coreApplication = new beachParty.AppMgrClass(this.objectCache, <HTMLElement> this.rootElement.node());

            this.coreApplication.init(
                SandDance.Canvas3DSelector.class,
                SandDance.Canvas2DSelector.class,
                SandDance.SvgSelector.class,
                SandDance.FileInfoSelector.class,
                this.viewport.width,
                this.viewport.height,
                SandDance.DebugPanelItems[0],
                SandDance.DebugPanelItems[1],
                SandDance.DebugPanelItems[2],
                SandDance.DebugPanelItems[3],
                SandDance.DebugPanelItems[4]);

            this.application.coreApplication = this.coreApplication;
        }

        private addElements(element: HTMLElement): void {
            this.rootElement = d3.select(element)
                .append("div")
                .classed(SandDance.ClassName, true);

            this.onStopPropagationHandler(this.rootElement, ["mousedown", "mousemove", "pointerdown", "pointermove"]);

            this.mainElement = this.rootElement
                .append("div");

            this.addFileInfo();
            this.addPlayAndIconBarElement();
            //TODO: insightPanel ?
            this.addBigBarElement();
            this.addLeftPanelElement();
            this.addSearchPanelElement();
            this.addViewElement();
            this.addChartUxDivElement();
            this.addFacetLabelHolderElement();
            this.addRightPanelElement();
            this.addBottomPanelElement();
            //TODO: infoMsgBox ?
            this.addDebugPanelElement();
        }

        private onStopPropagationHandler(element: D3.Selection, events: string[]): void {
            if (!element || !events) {
                return;
            }

            let stopPropagationHandler: () => void = () => {
                d3.event.stopPropagation();
            };

            events.forEach((event: string) => {
                element.on(event, stopPropagationHandler);
            });
        }

        private addFileInfo(): void {
            this.mainElement
                .append("div")
                .classed(SandDance.FileInfoSelector.class, true);
        }

        private addPlayAndIconBarElement(): void {
            let trElement: D3.Selection,
                tdElement: D3.Selection;

            trElement = this.mainElement
                .append("table")
                .classed(SandDance.PlayAndIconBarSelector.class, true)
                .append("tr");

            tdElement = trElement
                .append("td")
                .classed(SandDance.PlayPanelSelector.class, true);

            tdElement
                .append("span")
                .classed(SandDance.StopButtonSelector.class, true)
                .classed(SandDance.TextButtonSelector.class, true);

            tdElement
                .append("span")
                .classed(SandDance.PlayExButtonSelector.class, true)
                .classed(SandDance.TextButtonSelector.class, true);

            trElement
                .append("td")
                .classed(SandDance.IconBarSelector.class, true)
                .classed(SandDance.IconBarSelector.class, true);
        }

        private addBigBarElement(): void {
            this.mainElement
                .append("div")
                .append("table")
                .classed(SandDance.BigBarSelector.class, true)
                .classed(SandDance.BigBarSelector.class, true)
                .classed(SandDance.NoSpaceTableSelector.class, true);
        }

        private addSearchPanelElement(): void {
            let searchPanel: D3.Selection,
                tr: D3.Selection;

            searchPanel = this.mainElement
                .append("table")
                .attr({
                    "data-disabled": false
                })
                .classed(SandDance.SearchPanelSelector.class, true)
                .classed(SandDance.NoSpaceTableSelector.class, true);

            tr = searchPanel.append("tr");

            tr.append("td")
                .classed(SandDance.BtSearchColSelector.class, true)
                .append("span")
                .classed(SandDance.SearchColSelector.class, true);

            tr.append("td")
                .append("input")
                .attr({
                    "type": "text",
                    "title": "search for the specified text in the selected column (to the left)",
                    "placeholder": "Search",
                    "tabindex": 0
                })
                .classed(SandDance.SearchTextSelector.class, true);
        }

        private addLeftPanelElement(): void {
            let leftPanelElement: D3.Selection,
                yStuffElement: D3.Selection,
                zStuffElement: D3.Selection;

            leftPanelElement = this.mainElement
                .append("div")
                .classed(SandDance.LeftPanelSelector.class, true);

            yStuffElement = leftPanelElement
                .append("div")
                .classed(SandDance.YStuffSelector.class, true);

            yStuffElement
                .append("div")
                .classed(SandDance.YButtonSelector.class, true);

            yStuffElement
                .append("div")
                .classed(SandDance.YBinsSelector.class, true);

            zStuffElement = leftPanelElement
                .append("div") //span
                .classed(SandDance.ZStuffSelector.class, true);

            zStuffElement
                .append("div") //span
                .classed(SandDance.ZButtonSelector.class, true);

            zStuffElement
                .append("div") //span
                .classed(SandDance.ZBinsSelecotr.class, true);
        }

        private addViewElement(): void {
            this.viewElement = this.mainElement
                .append("div")
                .classed(SandDance.ChartSelector.class, true);

            this.canvas3dElement = this.viewElement
                .append("canvas")
                .classed(SandDance.Canvas3DSelector.class, true)
                .classed(SandDance.CanvasElementSelector.class, true)
                .classed(SandDance.CanvasSelector.class, true);

            this.canvas2dElement = this.viewElement
                .append("canvas")
                .classed(SandDance.Canvas2DSelector.class, true)
                .classed(SandDance.CanvasElementSelector.class, true)
                .classed(SandDance.CanvasSelector.class, true);

            this.svgElement = this.viewElement
                .append("svg")
                .classed(SandDance.SvgSelector.class, true)
                .classed(SandDance.CanvasSelector.class, true);
        }

        private addChartUxDivElement(): void {
            this.viewElement
                .append("div")
                .classed(SandDance.ChartUxDivSelector.class, true);
        }

        private addFacetLabelHolderElement(): void {
            this.mainElement
                .append("div")
                .classed(SandDance.FacetLabelHolderSelector.class, true);
        }

        private addRightPanelElement(): void {
            let rightPanel: D3.Selection,
                tables: PanelTable[] = [
                    {
                        ids: [ null, "colorButton", "opacityAdj", "colorLegend" ]
                    }, {
                        ids: [ null, "sizeButton", "sizeFactorAdj", "sizeLegend" ]
                    }, {
                        ids: [ "imageMapper", "imageButton", "imageAdj", "imageLegend" ]
                    }, {
                        ids: [ null, "facetButton", "facetBins", "facetLegend" ]
                    }
                ];

            rightPanel = this.mainElement
                .append("div")
                .classed(SandDance.RightPanelSelector.class, true);

            tables.forEach((table: PanelTable) => {
                this.addRightPanelItem(rightPanel, table.ids);
            });
        }

        private addRightPanelItem(element: D3.Selection, ids: string[] = []): void {
            let table: D3.Selection,
                firstTr: D3.Selection,
                secondTr: D3.Selection;

            table = element
                .append("div")
                .classed(SandDance.ButtonLegendComboSelector.class, true);

            firstTr = table
                .append("tr")
                .classed(ids[0] === undefined ? "" : ids[0], true);

            secondTr = table
                .append("tr");

            firstTr
                .append("td")
                .classed(ids[1], true);

            firstTr
                .append("td")
                .classed(ids[2], true)
                .style("display", "none");

            secondTr
                .append("td")
                .attr("colspan", 2)
                .append("div")
                .classed(ids[3], true)
                .classed(SandDance.LegendSelector.class, true)
                .style("display", "none");
        }

        private addBottomPanelElement(): void {
            let bottomPanel: D3.Selection,
                table: D3.Selection,
                tr: D3.Selection;

            bottomPanel = this.mainElement
                .append("div")
                .classed(SandDance.BottomPanelSelector.class, true);

            table = bottomPanel
                .append("table")
                .classed(SandDance.XStuffSelector.class, true);

            tr = table.append("tr");

            tr.append("td")
                .classed(SandDance.XButtonSelector.class, true);

            tr.append("td")
                .classed(SandDance.XBinsSelector.class, true);
        }

        private addDebugPanelElement(): void {
            let debugPanel: D3.Selection;

            debugPanel = this.mainElement
                .append("div")
                .classed(SandDance.DebugPanelSelector.class, true);

            SandDance.DebugPanelItems.forEach((debugPanelItem: string) => {
                debugPanel
                    .append("div")
                    .classed(debugPanelItem, true)
                    .classed(SandDance.DebugPanelItemSelector.class, true);
            });
        }

        private saveSettings(settings: any, type: sandDance.SettingsType): void {
            if (!settings) {
                return;
            }

            let settingInJson: string = JSON.stringify(settings),
                objectName: string;

            objectName = sandDance.SettingsType[type];

            this.host.persistProperties(<VisualObjectInstancesToPersist> {
                replace: [{
                    objectName: objectName,
                    displayName: objectName,
                    selector: null,
                    properties: {
                        settings: settingInJson
                    }
                }]
            });
        }

        private loadSettings(type: sandDance.SettingsType): any {
            if (!this.dataView ||
                !this.dataView.settings) {
                return {};
            }

            return this.dataView.settings[sandDance.SettingsType[type]];
        }

        private changeChartType(chartType: string): void {
            this.host.persistProperties(<VisualObjectInstancesToPersist> {
                replace: [],
                remove: [],
                merge: [{
                    objectName: "chart",
                    displayName: "chart",
                    selector: null,
                    properties: {
                        chartType: chartType
                    }
                }]
            });
        }

        private onSelect(settings: sandDance.SelectionData): void {
            let selectors: Selector[] = [],
                selectionNumber: number = SandDance.DefaultSettings.chart.selectionNumber;

            if (this.dataView &&
                this.dataView.settings &&
                this.dataView.settings.chart) {
                let currentSelectionNumber: number = this.dataView.settings.chart.selectionNumber;

                selectionNumber = currentSelectionNumber > 0
                    ? currentSelectionNumber
                    : selectionNumber;
            }

            if (settings && settings.selectedRecords) {
                settings.selectedRecords.forEach((selectedRecord: any) => {
                    let selectionIndex: number = selectedRecord.__selectionIndexes;

                    if (selectionIndex !== null && selectionIndex !== undefined && this.dataView && this.dataView.selectionIds) {
                        selectors.push(this.dataView.selectionIds[selectionIndex].getSelector());
                    }
                });
            }

            this.setSelection(Selector.filterFromSelector(selectors.slice(0, selectionNumber)));
        }

        private setSelection(filter: SemanticFilter): void {
            let instance: VisualObjectInstance;

            instance = {
                objectName: SandDance.Properties["general"]["filter"].objectName,
                selector: undefined,
                properties: {
                    filter: filter
                }
            };

            this.host.persistProperties(<VisualObjectInstancesToPersist>{
                merge: [instance],
                remove: []
            });

            this.host.onSelect({ data: [] });
        }

        public update(visualUpdateOptions: VisualUpdateOptions): void {
            if (!visualUpdateOptions ||
                !visualUpdateOptions.dataViews ||
                !visualUpdateOptions.dataViews[0]) {
                return;
            }

            let dataView: SandDanceDataView = this.converter(visualUpdateOptions.dataViews[0]);

            this.setSize(visualUpdateOptions.viewport);
            this.updateElements();

            (<SandDanceSettingsManager> this.objectCache.get("settingsManager")).settings = dataView.settings;

            this.updateStyles(dataView.settings);

            this.application.update(this.viewport.width, this.viewport.height);

            if (!this.dataView || JSON.stringify(this.dataView.data) !== JSON.stringify(dataView.data)) {
                this.application.updateDataView(dataView.data);
            }

            if (this.dataView && JSON.stringify(this.dataView.highlights) !== JSON.stringify(dataView.highlights)) {
                this.application.setSelection(dataView.highlights);
            }

            if (this.dataView) {
                this.application.changeChartType(dataView.settings.chart.chartType);
            }

            if (!this.dataView) {
                this.dataView = dataView;

                this.application.loadAppSettings();
                this.application.loadLastSession();
            }

            this.dataView = dataView;
        }

        private updateStyles(settings: SandDanceSettings): void {
            this.rootElement.style({
                "background-color": settings.chart.backgroundColor,
                "color": settings.chart.color,
                "font-size": `${jsCommon.PixelConverter.fromPointToPixel(settings.chart.fontSize)}px`
            });

            let bigBarSelection: D3.Selection = this.rootElement.selectAll(".bigBar");

            bigBarSelection.style({
                "background-color": settings.toolbar.backgroundColor,
                "color": settings.toolbar.color
            });

            bigBarSelection.selectAll(".activeValue").style({
                color: settings.toolbar.activeColor
            });

            bigBarSelection.selectAll(".noneValue").style({
                color: settings.toolbar.color
            });

            this.rootElement.selectAll(".popupMenu").style("background-color", settings.chart.panelBackgroundColor);
            this.rootElement.selectAll(".popupPanel").style("background-color", settings.chart.panelBackgroundColor);
            this.rootElement.selectAll(".panel").style("background-color", settings.chart.panelBackgroundColor);

            this.application.changeCanvasColor(settings.canvas.backgroundColor);
            this.application.setShapeColor(settings.canvas.shapeColor);

            this.rootElement.selectAll(".svgDoc").style("font-size", `${jsCommon.PixelConverter.fromPointToPixel(settings.labels.fontSize)}px`);
        }

        public converter(dataView: DataView): SandDanceDataView {
            let data: SandDanceData = <SandDanceData>{},
                selectionIds: SelectionId[] = [],
                selectionIndexes: number[] = [];

            if (dataView &&
                dataView.table &&
                dataView.table.columns &&
                dataView.table.columns.length > 0 &&
                dataView.table.rows) {
                dataView.table.columns.forEach((column: DataViewMetadataColumn, index: number) => {
                    data[column.displayName] = dataView.table.rows.map((row: any[], rowIndex: number) => {
                        if (index === 0 && dataView.table.identity) {
                            selectionIds.push(SelectionId.createWithId(dataView.table.identity[rowIndex]));
                            selectionIndexes.push(rowIndex);
                        }

                        return row[index];
                    });
                });
            }

            data.__selectionIndexes = selectionIndexes;

            return {
                settings: this.parseSettings(dataView),
                data: data,
                highlights: this.parseHighlights(dataView),
                selectionIds: selectionIds
            };
        }

        private parseHighlights(dataView: DataView): any[] {
            let highlights: any[] = [];

            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.values ||
                !dataView.categorical.values[0] ||
                !dataView.categorical.values[0].highlights) {
                return highlights;
            }

            dataView.categorical.values[0].highlights.forEach((highlight: any, index: number) => {
                if (highlight) {
                    highlights.push(index);
                }
            });

            return highlights;
        }

        private parseSettings(dataView: DataView): SandDanceSettings {
            if (!dataView ||
                !dataView.metadata ||
                !dataView.metadata.objects) {
                return SandDance.DefaultSettings;
            }

            let settings: SandDanceSettings = <SandDanceSettings> {
                    chart: {},
                    canvas: {},
                    labels: {}
                },
                objects: DataViewObjects = dataView.metadata.objects,
                settingsNames: string[] = [
                    "application",
                    "session",
                    "preloads"
                ];

            settingsNames.forEach((settingsName: string) => {
                let currentSettings: any;

                if (objects[settingsName] && objects[settingsName]["settings"]) {
                    currentSettings = JSON.parse(<string> objects[settingsName]["settings"]);
                } else {
                    currentSettings = {};
                }

                settings[settingsName] = currentSettings;
            });

            settings.chart = this.parseChartSettings(objects);
            settings.canvas = this.parseCanvasSettings(objects);
            settings.labels = this.parseLabelsSettings(objects);
            settings.toolbar = this.parseToolbarSettings(objects);

            return settings;
        }

        private parseChartSettings(objects: DataViewObjects): SandDanceChartSettings {
            let chartSettings: SandDanceChartSettings = <SandDanceChartSettings> {},
                defaultChartSettings: SandDanceChartSettings = SandDance.DefaultSettings.chart;

            chartSettings.chartType = DataViewObjects.getValue<string>(
                objects,
                SandDance.Properties["chart"]["chartType"],
                chartType.types[1]);

            chartSettings.backgroundColor = this.getColor(SandDance.Properties["chart"]["backgroundColor"], defaultChartSettings.backgroundColor, objects);
            chartSettings.color = this.getColor(SandDance.Properties["chart"]["color"], defaultChartSettings.color, objects);
            chartSettings.panelBackgroundColor = this.getColor(SandDance.Properties["chart"]["panelBackgroundColor"], defaultChartSettings.panelBackgroundColor, objects);
            chartSettings.fontSize = DataViewObjects.getValue<number>(objects, SandDance.Properties["chart"]["fontSize"], defaultChartSettings.fontSize);
            chartSettings.selectionNumber = DataViewObjects.getValue<number>(objects, SandDance.Properties["chart"]["selectionNumber"], defaultChartSettings.selectionNumber);

            return chartSettings;
        }

        private parseCanvasSettings(objects: DataViewObjects): SandDanceCanvasSettings {
            let canvasSettings: SandDanceCanvasSettings = <SandDanceCanvasSettings> {},
                defaultCanvasSettings: SandDanceCanvasSettings = SandDance.DefaultSettings.canvas;

            canvasSettings.backgroundColor = this.getColor(SandDance.Properties["canvas"]["backgroundColor"], defaultCanvasSettings.backgroundColor, objects);
            canvasSettings.shapeColor = this.getColor(SandDance.Properties["canvas"]["shapeColor"], defaultCanvasSettings.shapeColor, objects);

            return canvasSettings;
        }

        private parseLabelsSettings(objects: DataViewObjects): SandDanceLabelsSettings {
            let labelsSettings: SandDanceLabelsSettings = <SandDanceLabelsSettings> {},
                defaultLabelsSettings: SandDanceLabelsSettings = SandDance.DefaultSettings.labels;

            labelsSettings.color = this.getColor(SandDance.Properties["labels"]["color"], defaultLabelsSettings.color, objects);
            labelsSettings.boxBackgroundColor = this.getColor(SandDance.Properties["labels"]["boxBackgroundColor"], defaultLabelsSettings.boxBackgroundColor, objects);
            labelsSettings.boxHoverBackgroundColor = this.getColor(SandDance.Properties["labels"]["boxHoverBackgroundColor"], defaultLabelsSettings.boxHoverBackgroundColor, objects);
            labelsSettings.fontSize = DataViewObjects.getValue<number>(objects, SandDance.Properties["labels"]["fontSize"], defaultLabelsSettings.fontSize);

            return labelsSettings;
        }

        private parseToolbarSettings(objects: DataViewObjects): SandDanceToolbarSettings {
            let toolbarSettings: SandDanceToolbarSettings = <SandDanceToolbarSettings> {},
                defaultToolbarSettings: SandDanceToolbarSettings = SandDance.DefaultSettings.toolbar;

            toolbarSettings.backgroundColor = this.getColor(SandDance.Properties["toolbar"]["backgroundColor"], defaultToolbarSettings.backgroundColor, objects);
            toolbarSettings.color = this.getColor(SandDance.Properties["toolbar"]["color"], defaultToolbarSettings.color, objects);
            toolbarSettings.activeColor = this.getColor(SandDance.Properties["toolbar"]["activeColor"], defaultToolbarSettings.activeColor, objects);

            return toolbarSettings;
        }

        private getColor(properties: DataViewObjectPropertyIdentifier, defaultColor: string, objects: DataViewObjects): string {
            let colorHelper: ColorHelper;

            colorHelper = new ColorHelper(this.colors, properties, defaultColor);

            return colorHelper.getColorForMeasure(objects, "");
        }

        private setSize(viewport: IViewport): void {
            let height: number,
                width: number;

            height =
                viewport.height -
                this.margin.top -
                this.margin.bottom;

            width =
                viewport.width -
                this.margin.left -
                this.margin.right;

            this.viewport = {
                height: height,
                width: width
            };
        }

        private updateElements(): void {
            let width: number = 0,
                height: number = 0;

            if (this.viewport) {
                width = this.viewport.width;
                height = this.viewport.height;
            }

            this.rootElement.style({
                width: `${width}${SandDance.Units}`,
                height: `${height}${SandDance.Units}`
            });
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration  {
            let enumeration: ObjectEnumerationBuilder = new ObjectEnumerationBuilder();

            switch (options.objectName) {
                case "chart": {
                    this.enumerateChart(enumeration);
                    break;
                }
                case "canvas": {
                    this.enumerateCanvas(enumeration);
                    break;
                }
                case "labels": {
                    this.enumerateLabels(enumeration);
                    break;
                }
                case "toolbar": {
                    this.enumerateToolbar(enumeration);
                    break;
                }
            }

            return enumeration.complete();
        }

        private enumerateChart(enumeration: ObjectEnumerationBuilder): void {
            enumeration.pushInstance({
                objectName: "chart",
                displayName: "chart",
                selector: null,
                properties: {
                    chartType: this.dataView.settings.chart.chartType,
                    backgroundColor: this.dataView.settings.chart.backgroundColor,
                    color: this.dataView.settings.chart.color,
                    panelBackgroundColor: this.dataView.settings.chart.panelBackgroundColor,
                    fontSize: this.dataView.settings.chart.fontSize,
                    selectionNumber: this.dataView.settings.chart.selectionNumber
                }
            });
        }

        private enumerateCanvas(enumeration: ObjectEnumerationBuilder): void {
            enumeration.pushInstance({
                objectName: "canvas",
                displayName: "canvas",
                selector: null,
                properties: {
                    backgroundColor: this.dataView.settings.canvas.backgroundColor,
                    shapeColor: this.dataView.settings.canvas.shapeColor
                }
            });
        }

        private enumerateLabels(enumeration: ObjectEnumerationBuilder): void {
            enumeration.pushInstance({
                objectName: "labels",
                displayName: "labels",
                selector: null,
                properties: {
                    color: this.dataView.settings.labels.color,
                    boxBackgroundColor: this.dataView.settings.labels.boxBackgroundColor,
                    boxHoverBackgroundColor: this.dataView.settings.labels.boxHoverBackgroundColor,
                    fontSize: this.dataView.settings.labels.fontSize
                }
            });
        }

        private enumerateToolbar(enumeration: ObjectEnumerationBuilder): void {
            enumeration.pushInstance({
                objectName: "toolbar",
                displayName: "toolbar",
                selector: null,
                properties: {
                    backgroundColor: this.dataView.settings.toolbar.backgroundColor,
                    color: this.dataView.settings.toolbar.color,
                    activeColor: this.dataView.settings.toolbar.activeColor
                }
            });
        }

        public destroy(): void {
            this.rootElement.remove();
            this.rootElement = null;

            this.coreApplication = null;
            this.application = null;
        }
    }
}