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
///<reference path="externals.d.ts"/>
///<reference path="powerbi-visuals.d.ts"/>
///<reference path="sampledata.ts"/>
var powerbi;
(function (powerbi) {
    var visuals;
    (function (visuals_1) {
        var defaultVisualHostServices = powerbi.visuals.defaultVisualHostServices;
        var dataColors = new powerbi.visuals.DataColorPalette();
        var visualStyle = {
            titleText: {
                color: { value: 'rgba(51,51,51,1)' }
            },
            subTitleText: {
                color: { value: 'rgba(145,145,145,1)' }
            },
            colorPalette: {
                dataColors: dataColors,
            },
            labelText: {
                color: {
                    value: 'rgba(51,51,51,1)',
                },
                fontSize: '11px'
            },
            isHighContrast: false,
        };
        /**
         * Demonstrates Power BI visualization elements and the way to embeed them in standalone web page.
         */
        var Playground = (function () {
            function Playground() {
            }
            // Performs sample app initialization.
            Playground.initialize = function () {
                this.populateVisualTypeSelect();
                // Wrapper function to simplify visuallization element creation when using jQuery
                $.fn.visual = function (plugin, dataView) {
                    // Step 1: Create new DOM element to represent Power BI visual
                    var element = $('<div/>');
                    element.addClass('visual');
                    element.css({
                        'background-color': 'white',
                        'padding': '10px',
                        'margin': '5px'
                    });
                    element['visible'] = function () { return true; };
                    this.append(element);
                    // Step 2: Instantiate Power BI visual
                    var host = $('#itemContainer');
                    var viewport = { height: host.height(), width: host.width() - 100 };
                    var visualElement = plugin.create();
                    visualElement.init({
                        element: element,
                        host: defaultVisualHostServices,
                        style: visualStyle,
                        viewport: viewport,
                        settings: { slicingEnabled: true },
                        interactivity: { isInteractiveLegend: false, selection: false },
                        animation: { transitionImmediate: true }
                    });
                    if (visualElement.update) {
                        visualElement.update({ dataViews: dataView, duration: 250, viewport: viewport });
                    }
                    else if (visualElement.onDataChanged) {
                        visualElement.onDataChanged({ dataViews: dataView });
                    }
                    return this;
                };
                var visualByDefault = jsCommon.Utility.getURLParamValue('visual');
                if (visualByDefault) {
                    $('.topBar').css({ "display": "none" });
                    Playground.onVisualTypeSelection(visualByDefault.toString());
                }
            };
            Playground.populateVisualTypeSelect = function () {
                var _this = this;
                var typeSelect = $('#visualTypes');
                typeSelect.append('<option value="">(none)</option>');
                var visuals = this.pluginService.getVisuals();
                visuals.sort(function (a, b) {
                    if (a.name < b.name)
                        return -1;
                    if (a.name > b.name)
                        return 1;
                    return 0;
                });
                for (var i = 0, len = visuals.length; i < len; i++) {
                    var visual = visuals[i];
                    typeSelect.append('<option value="' + visual.name + '">' + visual.name + '</option>');
                }
                typeSelect.change(function () { return _this.onVisualTypeSelection(typeSelect.val()); });
            };
            Playground.createOptionsSelect = function (pluginName, options) {
                var _this = this;
                var typeSelect = $('<select>');
                for (var i = 0; i < options.values.length; i++) {
                    var item = options.values[i];
                    typeSelect.append('<option ' + ((item.default) ? 'selected="selected"' : '') + '"value="' + item.value + '">' + item.displayName + '</option>');
                }
                typeSelect.change(function () { return _this.createVisualPlugin(pluginName, {
                    name: options.name,
                    value: typeSelect.val()
                }); });
                return typeSelect;
            };
            Playground.populateVisualOptions = function (pluginName, options) {
                var optionsContainer = $('#optionsContainer');
                for (var i = 0; i < options.length; i++) {
                    if (options[i].type === "select") {
                        var content = this.createOptionsSelect(pluginName, options[i]);
                        optionsContainer.append($("<span>Choose number of columns:</span>"));
                        optionsContainer.append(content);
                    }
                }
            };
            Playground.onVisualTypeSelection = function (pluginName) {
                $('#itemContainer, #optionsContainer').empty();
                if (pluginName.length == 0)
                    return;
                var sampleOptions = visuals_1.sampleData.getVisualizationOptions(pluginName);
                if (sampleOptions.length > 0) {
                    this.populateVisualOptions(pluginName, sampleOptions);
                }
                this.createVisualPlugin(pluginName);
            };
            Playground.createVisualPlugin = function (pluginName, options) {
                var plugin = this.pluginService.getPlugin(pluginName);
                if (!plugin) {
                    $('#container').html('<div class="wrongVisualWarning">Wrong visual name <span>\'' + pluginName + '\'</span> in parameters</div>');
                    return;
                }
                var sampleDataView = visuals_1.sampleData.getVisualizationData(pluginName, options);
                $('#itemContainer').visual(plugin, sampleDataView);
            };
            // Represents sample data view used by visualization elements.
            Playground.pluginService = powerbi.visuals.visualPluginFactory.create();
            return Playground;
        })();
        visuals_1.Playground = Playground;
    })(visuals = powerbi.visuals || (powerbi.visuals = {}));
})(powerbi || (powerbi = {}));
