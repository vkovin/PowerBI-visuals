﻿/*
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

module powerbitests.customVisuals {
    import VisualClass = powerbi.visuals.samples.Timeline;

    describe("Timeline", () => {
        describe('capabilities', () => {
            it("registered capabilities", () => expect(VisualClass.capabilities).toBeDefined());
        });

        describe("DOM tests", () => {
            let visualBuilder: TimelineBuilder;
            let dataViews: powerbi.DataView[];

            beforeEach(() => {
                visualBuilder = new TimelineBuilder();
                dataViews = [new customVisuals.sampleDataViews.TimelineData().getDataView()];
            });

            it("svg element created", () => expect(visualBuilder.mainElement[0]).toBeInDOM());
            it("update", (done) => {
                visualBuilder.update(dataViews);
                visualBuilder.currentPeriod = 3;//select a day period
                setTimeout(() => {
                    let countOfDays = visualBuilder.mainElement.children("g.mainArea").children(".cellsArea").children(".cellRect").length;
					let countOfTextItems = visualBuilder.mainElement.children("g.mainArea").children(".lowerTextArea").children().length;
		
                    expect(countOfDays).toBe(dataViews[0].categorical.categories[0].values.length);
                    expect(countOfTextItems).toBe(dataViews[0].categorical.categories[0].values.length);

                    done();
                }, DefaultWaitForRender);
            });
        });
    });

    class TimelineBuilder extends VisualBuilderBase<VisualClass> {
        constructor(height: number = 400, width: number = 600, isMinervaVisualPlugin: boolean = false) {
            super(height, width, isMinervaVisualPlugin);
            this.build();
            this.init();
        }

        public get mainElement() {
            return this.element
                .children("div")
                .children("svg.Timeline");
        }

        public set currentPeriod(period: number) {
            this.visual.selectPeriod(period);
        }

        private build(): void {
            this.visual = new VisualClass();
        }
    }
}