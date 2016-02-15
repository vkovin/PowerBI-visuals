//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    basePanel.ts - base class for a floating (and optionally modal) panel.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    var nextId = 1;

    export interface PositionOfPanel {
        top: number;
        left: number;
    }

    export class BasePopupClass extends BaseAppControlClass
    {
        protected startPosition: PositionOfPanel;
        protected currentPosition: PositionOfPanel;

        protected application: AppClass;
        protected container: HTMLElement;

        private _bigBarElement;

        private get bigBarElement() {
            if (!this._bigBarElement) {
                this._bigBarElement = vp.select(this.container, ".playAndIconBar");
            }

            return this._bigBarElement;
        }

        _root: HTMLElement;
        _ownerElem: HTMLElement;            // not the document parent, but another popup that this popup belongs to

        //---- removeable event handlers ----
        _keyboardFunc = null;
        _mouseDownFunc = null;
        _dblClickFunc = null;
        _autoCloseOnDblClick = true;
        _autoCloseOnOwnerMouseDown = true;      // apply autoClose to me if mouseDown on my owner
        _autoCloseOnOwneeMouseDown = false;     // apply autoClose to me if mouseDown on an element that I own

        _openerIds: string;       // id's of UI elements that can open this panel
        _popupId: number;

        /** "openerIds" are id's of controls that can open this panel. */
        constructor(application: AppClass, container: HTMLElement, openerIds: string, ownerElem?: HTMLElement)
        {
            super();

            this.application = application;
            this.container = container;

            this._openerIds = openerIds;
            this.installEventHandlers();
            this._popupId = nextId++;
            this._ownerElem = ownerElem;

            //---- if "ownerElem" is based on basePopupClass, we will hook its close and close this object ---
            if (ownerElem)
            {
                var ownerParent = this.getTopLevelParent(ownerElem);
                var jsObj = (<any>ownerParent).jsObj;
                if (jsObj && jsObj instanceof BasePopupClass)
                {
                    var ownerPopup = <BasePopupClass>jsObj;
                    ownerPopup.registerForChange("close", (e) =>
                    {
                        if (this.isAutoClose())
                        {
                            //--- if our owner closes, we should close ----
                            this.close();
                        }
                    })
                }
            }
        }

        openWithoutPosition(): void {
            var rootW = vp.select(this._root);

            rootW[0].focus();

            //---- set our button to "selected" state ----
            this.setOpenerSelected(true);
        }

        getTopLevelParent(elem: HTMLElement)
        {
            var parent = elem;
            while (parent && parent.parentNode && parent.parentNode != document.body)
            {
                parent = parent.parentElement;
            }

            return parent;
        }

        setOpenerSelected(value: boolean)
        {
            if (this._openerIds)
            {
                var ids = this._openerIds.split(" ");
                if (ids.length)
                {
                    var id = ids[0];
                    vp.select(this.container, "." + id).attr("data-selected", (value) ? "true" : "false");
                }
            }
        }

        showAt(left: number, top: number, right?: number, bottom?: number)
        {
            this.hide();

            var pickerElem = this.getRootElem();
            var rcPicker = vp.select(pickerElem).getBounds(false);

            if (right != undefined)
            {
                left = (innerWidth-right) - rcPicker.width;
            }

            if (bottom != undefined)
            {
                top = (innerHeight-bottom) - rcPicker.height;
            }

            this.openWithoutOverlap(left, top);
        }

        /** Open the specified panel so that it is near x,y but not overlapping with any of the 4 window edges. */
        openWithoutOverlap(x: number, yTop: number, isOwnerRoot: boolean = true)
        {
            var rootW = vp.select(this._root);
            var myHeight = rootW.height();
            var yBottom = yTop + myHeight;
            var yMargin = 0;
            var xMargin = 0;
            let scale = sandDance.commonUtils.getScale(this.container);

            //---- check for TOP overlap ----
            var topOverlap = (yTop - yMargin);
            if (topOverlap < 0)
            {
                //---- move DOWN ----
                yTop += (-topOverlap);
            }
            else
            {
                //---- check for BOTTOM overlap ----
                var bottomOverlap = (yBottom + yMargin) - innerHeight;
                if (bottomOverlap > 0)
                {
                    //---- move UP ----
                    yTop -= bottomOverlap;
                }
            }

            //---- check for LEFT overlap ----
            var leftOverlap = (x - xMargin);
            if (leftOverlap < 0)
            {
                //---- move RIGHT ----
                x += (-leftOverlap);
            }
            else
            {
                //---- check for RIGHT overlap ----
                var myWidth = rootW.width();

                var rightOverlap = (x + myWidth + xMargin) - innerWidth;
                if (rightOverlap > 0)
                {
                    //---- move LEFT ----
                    x -= rightOverlap;
                }
            }

            x /= scale.x;
            yTop /= scale.y;

            this.startPosition = {
                top: yTop,
                left: x
            };

            this.currentPosition = {
                top: yTop,
                left: x
            };

            rootW
                .css("left", x + "px")
                .css("top", yTop + "px")
                .show(true);

            rootW[0].focus();

            //---- set our button to "selected" state ----
            this.setOpenerSelected(true);
        }

        onAnyKeyDown(e)
        {
            if (e.keyCode === vp.events.keyCodes.escape)
            {
                this.close();
            }
        }

        onMyDblClick(e)
        {
            if (this._autoCloseOnDblClick && this.isAutoClose())
            {
                this.close();
            }
        }

        /** is overriden by subclasses, like basePopup. */
        isAutoClose()
        {
            return true;
        }

        doesElementBelongToMe(elem: HTMLElement)
        {
            var parent = elem;

            //---- get top-most element OR owner (whichever comes first)  ----
            while (parent && parent != this._root && parent != this._ownerElem && parent.parentElement && 
                parent.parentElement != document.body)
            {
                parent = parent.parentElement;
            }

            var isMyElem = (parent == this._root ||
                (!this._autoCloseOnOwnerMouseDown && parent == this._ownerElem));

            if (!isMyElem && !this._autoCloseOnOwneeMouseDown)
            {
                //---- see if this was a child popup belonging to me or one of my controls ----
                var anyParent = <any>parent;

                if (anyParent && anyParent.jsObj)
                {
                    var jsObj = anyParent.jsObj;

                    if (jsObj instanceof BasePopupClass)
                    {
                        var popup = <BasePopupClass>jsObj;

                        isMyElem = this.doesElementBelongToMe(popup._ownerElem);
                    }
                }
            }

            return isMyElem;
        }

        onAnyMouseDown(e)
        {
            if (e && e.target && (this.isAutoClose()))
            {
                var elem = e.target;

                var isMyElem = this.doesElementBelongToMe(elem);

                if (! isMyElem)
                {
                    //---- mouse clicked on an element that is NOT part of this popup/panel ----
                    this.close();

                    //---- find elem with id (some inner parts of buttons don't have them ----
                    if (!elem.id)
                    {
                        elem = elem.parentElement;
                    }

                    //---- cancel event if this was one of my openers (to prevent this panel from iddediately reopening ----
                    //---- when the user was clicking on our opener UI to TOGGLE our panel closed. ----
                    if (elem && this.isMyOpener(elem.id))
                    {
                        //vp.events.cancelEventBubble(e);
                        //vp.events.cancelEventDefault(e);

                        //---- we can't prevent the upcoming CLICK event, so we mark the element instead ---
                        elem.ignoreNextClick = true;

                        vp.utils.debug("marking elem.ignoreNextClick=true for id=" + elem.id);
                    }
                }
            }
        }

        isMyOpener(id: string)
        {
            var isMine = false;
            if (this._openerIds)
            {
                var oNames = this._openerIds.split(" ");

                for (var i = 0; i < oNames.length; i++)
                {
                    var oName = oNames[i];
                    if (id.contains(oName))
                    {
                        isMine = true;
                        break;
                    }
                }
            }

            return isMine;
        }

        isVisible()
        {
            var elem = this._root;
            var isVisible = (vp.select(elem).css("visibility") === "visible");

            return isVisible;
        }

        installEventHandlers()//TODO: check this function
        {
            //---- install event handlers to capture ESCAPE or MOUSEDOWN at DOCUMENT level ----
            this._keyboardFunc = (e) => this.onAnyKeyDown(e);
            this._mouseDownFunc = (e) => this.onAnyMouseDown(e);
            this._dblClickFunc = (e) => this.onMyDblClick(e);

            //---- set this to install async so that current click doesn't interfere ----
            setTimeout((e) => 
            {
                this.container.addEventListener("keydown", this._keyboardFunc);
                this.container.addEventListener("mousedown", this._mouseDownFunc);
                this._root.addEventListener("dblclick", this._dblClickFunc);
            }, 1);

        }

        hide()
        {
            super.hide();

            //---- remove our DOCUMENT event handlers ----
            this.container.removeEventListener("keydown", this._keyboardFunc);
            this.container.removeEventListener("mousedown", this._mouseDownFunc);
            this._root.removeEventListener("dblclick", this._dblClickFunc);
        }

        /** Remove the panel from the DOM and unhook non-DOM event handlers on this._dataOwner. */
        close()
        {
            super.close();

            //---- set our button to NOT "selected" state ----
            this.setOpenerSelected(false);
        }
    }
}