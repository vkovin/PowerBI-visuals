///-----------------------------------------------------------------------------------------------------------------
/// popupMenu.ts.  Copyright (c) 2015 Microsoft Corporation.
///     - code for managing a simple popup menu
///-----------------------------------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class PopupMenuClass extends BasePopupClass
    {
        public context = null;

        _table: HTMLTableElement;
        _hideAfterCallback: boolean;
        _callback: any;
        _iconWidth = 0;
        _verticalMargin = 0;
        _maxPanelHeight = 0;

        constructor(application: AppClass, container: HTMLElement, openerIds: string, id: string, items: any[], callback, hideAfterCallback = false, limitHeight = true, verticalMargin = 0,
            iconWidth?: number, ownerElem?: HTMLElement, internalOwnerElement: HTMLElement = ownerElem)
        {
            super(application, container, openerIds, ownerElem);

            this._hideAfterCallback = hideAfterCallback;
            this._callback = callback;
            this._iconWidth = iconWidth;
            this._verticalMargin = verticalMargin;
            this._maxPanelHeight = maxPanelHeight;

            var maxPanelHeight = AppClass.maxPanelHeight;

            //---- close and remove any existing popup menus before creating this one ----
            //vp.select("popupMenu")
            //    .remove();

            var rootW = vp.select(document.createElement("div"))
                // .attr("id", id)
                // .css("position", "absolute")
                // .css("overflow-x", "hidden")
                // .css("overflow-y", "auto")
                .addClass(id)
                .addClass("popupMenu")
                .css("background-color", application.getSettingsManager().getPanelBackgroundColor());

            let currentOwnerElement: vp.dom.IWrapperOuter = null;

            if (internalOwnerElement) {
                currentOwnerElement = vp.select(internalOwnerElement);
            } else {
                currentOwnerElement = vp.select(this.container/*, ".sandDance"*/);
            }

            currentOwnerElement.append(rootW[0]);
            // document.body.appendChild(rootW[0]);

            this._root = rootW[0];
            rootW[0].jsObj = this;

            //---- holder of menu items ----
            var tableW = rootW.append("table")     //div")
                .addClass("menuItemHolder noSpaceTable")
                .css("width", "100%")           // behave like a <div>

            this._table = tableW[0];

            this.buildMenu(items);
        }

        buildMenu(items: any[])
        {
            var textItemIndex = 0;
            var menuItemIndex = 0;
            var indexes = { menuItemIndex: menuItemIndex, textItemIndex: textItemIndex };

            var tableW = vp.select(this._table)
                .clear();

            for (var i = 0; i < items.length; i++)
            {
                var info = items[i];
                PopupMenuClass.addItem(tableW, info, indexes, this._hideAfterCallback, this._callback, (e) => this.close(), this._iconWidth);
            }

            //---- adjust height of holder to be <= panel ----
            var holderHeight = Math.min(this._maxPanelHeight - this._verticalMargin, tableW.height());

            tableW
                .css("margin-top", this._verticalMargin + "px")
                .css("margin-bottom", this._verticalMargin + "px")
                .css("height", holderHeight + "px")
        }

        changeRootClass(newClass: string)
        {
            vp.select(this._root)
                .removeClass("popupMenu")
                .addClass(newClass);
        }

        public static addItem(itemsW: vp.dom.IWrapperOuter, item: any, indexes: any, hideAfterCallback: boolean,
            clickCallback: any, hideCallback?: any, iconWidth?: number)
        {
            var name = item;
            var disabled = false;
            var tip = null;
            var iconSrc = null;
            var padding = null;
            var preText = undefined;

            if (!vp.utils.isString(item))
            {
                var md = <MenuItemData>item;

                name = md.text;
                disabled = md.isDisabled;
                tip = md.tooltip;
                iconSrc = md.iconSrc;
                padding = md.padding;
                preText = md.preText;
            }

            var rowW = itemsW.append("tr")

            if (name == "-")
            {
                //---- add simple LINE SEPARATOR ----
                var tdW = rowW.append("td")
                    .attr("colspan", "99");

                var menuItemW = tdW.append("hr")
                    .addClass("popupMenuHR")
                    .attr("_menuIndex", indexes.menuItemIndex++)
            }
            else
            {
                rowW
                    .addClass("popupMenuItemHolder")
                    .attr("_menuIndex", indexes.menuItemIndex)
                    .attr("_textIndex", indexes.textItemIndex)
                    .attr("title", tip);

                if (iconSrc)
                {
                    //---- add ICON ----
                    var tdW = rowW.append("td")
                        .css("width", "1px");             // use min width for this column

                    var imgW = tdW.append("img")
                        .attr("src", iconSrc)
                        .addClass("popupMenuIcon")
                        .css("margin-top", "2px")
                        .attach("dragstart", function (e)
                        {
                            //---- prevent drag of icon ----
                            e.preventDefault();
                        });

                    if (iconWidth !== undefined)
                    {
                        imgW.css("width", iconWidth + "px")
                    }

                }

                if (preText !== undefined)
                {
                    //---- add PRETEXT ----
                    var tdW = rowW.append("td")
                        .css("width", "1px");             // use min width for this column

                    var pretextW = tdW.append("span")        //"span")
                        .addClass("popupMenuPretext")
                        .text(preText)
                        .attr("_menuIndex", indexes.menuItemIndex)
                        .attr("_textIndex", indexes.textItemIndex)
                }

                //---- add TEXT ----
                var menuItemW = rowW.append("td").append("span")       // span
                    .addClass("popupMenuItem")
                    .text(name)
                    .attr("_menuIndex", indexes.menuItemIndex)
                    .attr("_textIndex", indexes.textItemIndex)

                if (padding)
                {
                    menuItemW
                        .css("padding", padding);
                }

                //---- add extra column at end to absorb remaining space ----
                var tdW = rowW.append("td")
                    //.css("width", "9999px"); 

                indexes.menuItemIndex++;
                indexes.textItemIndex++;

                if (disabled)
                {
                    //---- we use the custom attribute form here, since "disabled" only works on FORM elements ----
                    rowW.attr("data-disabled", true + "");
                    //tip = "[disabled] " + tip;
                }

                rowW.element().addEventListener/*.attach*/("click", (e) => 
                {
                    var mi = <any>e.target;
                    while (mi && !vp.dom.hasClass(mi, "popupMenuItemHolder"))
                    {
                        mi = mi.parentElement;
                    }

                    if (mi.getAttribute("data-disabled") != "true")
                    {
                        if (!hideAfterCallback)
                        {
                            if (hideCallback)
                            {
                                hideCallback();
                            }
                        }

                        var cbMenuItem = <any>e.target;
                        while (cbMenuItem && !vp.dom.hasClass(cbMenuItem, "popupMenuItemHolder"))
                        {
                            cbMenuItem = cbMenuItem.parentElement;
                        }

                        var menuIndex = cbMenuItem.getAttribute("_menuIndex");
                        var textIndex = cbMenuItem.getAttribute("_textIndex");

                        clickCallback(e, itemsW, textIndex, menuIndex);

                        if (hideAfterCallback)
                        {
                            if (hideCallback)
                            {
                                hideCallback();
                            }
                        }

                        //---- close is called by "hideCallback" ----
                    }
                    //else
                    //{
                    //    this.hide();
                    //}
                });

                return menuItemW;
            }
        }

    }

    export class MenuItemData
    {
        iconSrc: string;        // the URL for the icon
        preText: string;        // an optional column of information before the text (usually dimmed)
        text: string;           // this is what is displayed (could be localized)
        //menuId: string;         // this is what event process code should use 
        isDisabled: boolean;
        tooltip: string;
        padding: string;

        constructor(text: string, tooltip?: string, iconSrc?: string, isDisabled?: boolean, padding?: string, preText?: string)
        {
            this.text = text;
            //this.menuId = (menuId) ? menuId : text;
            this.tooltip = tooltip;
            this.iconSrc = iconSrc;
            this.isDisabled = isDisabled;
            this.padding = padding;
            this.preText = preText;
        }
    }

}
 