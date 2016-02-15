//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    tourPanelMgr.ts - manages the SandDance tour panel.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class tourPanelMgr extends BasePanelClass implements IAppControl
    {
        _tour: TourData;
        _index = 0;
        _activeEleme: HTMLElement;

        //---- adjustable parameters for best look ----
        _useOuterForOutlining = true;
        _outerPadding = 20;

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement, buttonId: string, tour: TourData)
        {
            super(application, settings, container, "tourPanel", false, null, null, 380, undefined, false, null, true,
                false, undefined, true);

            if (this._useOuterForOutlining)
            {
                var topW = vp.select(this._root)
                    .id("tourPanelOuter")
                    .css("background", "transparent")
                    .css("border", "2px solid transparent")

                //---- space between our green outline and normal edges of panel ----
                var rootW = topW.append("div")
                    .css("margin", this._outerPadding + "px")
            }
            else
            {
                var topW = vp.select(this._root)
                var rootW = <vp.dom.singleWrapperClass>topW;
            }

            topW
                .css("overflow-y", "hidden")
                .css("z-index", "1000")
                .css("top", "-100px")       // above the screen
                .css("transition", "all .5s ease")  // this seem to work here (.css was inconsistent)

            rootW
                .addClass("tourPanel")

            //---- TITLE ----
            rootW.append("div")
                .addClass("tourTitle")
                //.css("min-height", "30px")
                .css("cursor", "pointer")
                .attach("mousedown", (e) =>
                {
                    this.onMouseDown(e);
                    this.onFocus(e);
                    this.showOurOutline(false);

                    topW
                        .css("transition", "none")     // turn off animation during drag
                })
                .attach("dblclick", (e) =>
                {
                })

            //---- CLIENT AREA ----
            var clientW = rootW.append("div")
                .addClass("tourClientArea")
            //.css("margin", "2px")

            //---- CONTENT ----
            clientW.append("div")
                .id("tourPanelContent")
                .addClass("tourContent")

            //---- BUTTON ROW ----
            var buttonsW = clientW.append("div")
                .addClass("tourClientArea")
                .css("height", "32px")
            //.css("border", "1px solid red")
            //.css("margin", "10px 0px 30px 8px")
            //.css("height", "4px")
            //.css("border", "1px solid red")

            //var extraRow = clientW.append("div")
            //    .css("height", "40px")
            //    .css("border", "1px solid green")

            //---- PREV ----
            buttonsW.append("span")
                .addClass("tourButton")
                .text("Prev")
                .id("btPrev")
                .css("margin-left", "18px")
                .css("float", "left")
                .attach("click", (e) => this.gotoStep(this._index - 1))

            //---- NEXT ----
            buttonsW.append("span")
                .addClass("tourButton")
                .text("Next")
                .id("btNext")
                .css("margin-left", "10px")
                .css("float", "left")
                .attach("click", (e) => this.gotoStep(this._index + 1))

            //---- END TOUR ----
            buttonsW.append("span")
                .addClass("tourButton")
                .text("End Tour")
                .css("margin-right", "18px")
                .css("float", "right")
                .attach("click", (e) => this.endTour())

            this._tour = tour;

            this.gotoStep(0);
        }

        onMouseUp(e)
        {
            super.onMouseUp(e);

            var topW = vp.select(this._root)

            topW
                .css("transition", "all .5s ease")  // turn animation back on after drag

            vp.utils.debug("tourPanelMgr.onMouseUp: animation restored for elem=" + topW[0].class);
        }

        endTour()
        {
            this.clearActiveElement();

            /*appSettingsMgr.instance*/this.settings.runTourOnStartUp(false);

            this.close();
        }

        gotoStep(index: number)
        {
            var steps = this._tour.steps;

            if (index >= 0 && index < steps.length)
            {
                //---- previous step ----
                this.clearActiveElement();

                var step = steps[index];
                this._index = index;

                var targetElem = this.setElementActive(this._index);

                this.loadStep(step, targetElem);

                this.onIndexChanged();
            }
        }

        onIndexChanged()
        {
            var index = this._index;
            var steps = this._tour.steps;

            //---- enable/disable buttons to match position ----
            vp.select(this._root, "#btPrev").attr("data-disabled", (index == 0) ? "true" : "false");

            vp.select(this._root, "#btNext").attr("data-disabled", (index == steps.length - 1) ? "true" : "false");
        }

        clearActiveElement()
        {
            if (this._activeEleme)
            {
                vp.select(this._activeEleme).removeClass("activeTourElement");
                this._activeEleme = null;
            }
        }

        setElementActive(index: number)
        {
            var steps = this._tour.steps;

            if (index >= 0 && index < steps.length)
            {
                var step = steps[index];
                if (step.element)
                {
                    //---- use the "Holder" version, if available ----
                    var elemW = vp.select(this.container, step.element + "Holder");
                    if (elemW.length == 0)
                    {
                        elemW = vp.select(this.container, step.element);
                    }

                    vp.utils.debug("setElementActive: index=" + index + ", elem.id=" + elemW[0].id);

                    elemW.addClass("activeTourElement")
                    var element = elemW[0];
                }
            }

            return element;
        }

        loadStep(step: TourStep, target: HTMLElement)
        {
            vp.select(this._root, ".tourTitle")
                .text(step.title);

            vp.select(this._root, ".tourContent")
                .html(step.content);

            this._activeEleme = target;

            //---- move our panel close to the target ----
            if (target)
            {
                this.positionPanelNextToElem(target);
            }
            else
            {
                this.centerPanel();

            }

            //---- update our outline ----
            var showOutline = (target && !step.hidePanelOutline);
            this.showOurOutline(showOutline);

            //---- workaround IE bug ----
            if (vp.utils.isIE)
            {
                window.scrollTo(0, 0);
            }
        }

        showOurOutline(value: boolean)
        {
            if (this._useOuterForOutlining)
            {
                vp.select(this._root)
                    .css("background", (value) ? "black" : "transparent")
                    .css("border", (value) ? "4px solid green" : "4px solid transparent")
            }
        }

        positionPanelNextToElem(target: HTMLElement)
        {
            var rc = vp.select(this._root).getBounds(false);
            var rcElem = vp.select(target).getBounds(false);
            var borderSize = 2;

            //---- calc space on left if we move to target's LEFT ----
            var leftSpace = (rcElem.left - rc.width);

            //---- calc space on right if we move to target's RIGHT ----
            var rightSpace = innerWidth - (rcElem.right + rc.width);

            if (leftSpace > rightSpace)
            {
                //---- put on LEFT ----
                var x = leftSpace + borderSize;
            }
            else
            {
                //---- put on RIGHT ----
                var x = +rcElem.right - (borderSize + 0);
            }

            //---- calc space on top if we move to target's TOP ----
            var topSpace = (rcElem.top - rc.height);

            //---- calc space on bottom if we move to target's BOTTOM ----
            var bottomSpace = innerHeight - (rcElem.bottom + rc.height);

            if (topSpace > bottomSpace)
            {
                //---- put on TOP ----
                var y = topSpace + borderSize;
            }
            else
            {
                //---- put on BOTTOM ----
                var y = +rcElem.bottom - (borderSize + 0);
            }

            this.showAt(x, y, undefined, undefined);
        }
    }

    export class TourStep
    {
        name: string;
        element: string;
        title: string;
        content: string;
        hidePanelOutline: boolean;
    }

    export class TourData
    {
        tourName: string;
        author: string;
        date: string;
        org: string;
        copyright: string;

        steps: TourStep[];
    }
}

 