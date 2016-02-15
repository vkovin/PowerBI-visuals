//-------------------------------------------------------------------------------------
//  Copyright (c) 2015 - Microsoft Corporation.
//    listBox.ts - defines listbox that holds strings or MenuItemData items.
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class ListBoxClass extends beachParty.DataChangerClass
    {
        _root: HTMLElement;
        _selectedElem = <HTMLElement>null;
        _table: HTMLElement;

        _items: any[];
        _selectedValue: string;
        _clickCallback = null;
        _iconWidth = 0;

        constructor(parent: HTMLElement, items: any[], clickCallback, iconWidth?: number)
        {
            super();

            this._items = items;
            this._clickCallback = clickCallback;
            this._iconWidth = iconWidth;

            // var maxHeight = window.innerHeight * .6;

            var rootW = vp.select(parent).append("div")
                .addClass("listBox")
                .css("overflow-y", "auto")
                .css("overflow-x", "hidden")

            this._root = rootW[0];

            var tableW = rootW.append("table")       // "div")
                .addClass("listBoxItems ")
                .css("border-collapse", "collapse")
                .css("border-spacing", "0")
                .css("width", "100%")           // behave like a <div>

            this._table = tableW[0];

            this.buildList(items);
        }

        buildList(items: any[])
        {
            var menuItemIndex = 0;
            var textItemIndex = 0;
            var indexes = { menuItemIndex: menuItemIndex, textItemIndex: textItemIndex };

            var tableW = vp.select(this._table);

            tableW.clear();

            for (var i = 0; i < items.length; i++)
            {
                var item = items[i];

                var elem = PopupMenuClass.addItem(tableW, item, indexes, false, (e, menu, textIndex, menuIndex) =>
                {
                    var mid = <MenuItemData>items[menuIndex];
                    this._clickCallback(mid);
                }, null, this._iconWidth);
            }
        }

        selectedValue(value?: string)
        {
            if (arguments.length == 0)
            {
                return this._selectedValue;
            }

            this._selectedValue = value;
            this.changeSelectedItem(value);
        }

        getElemByTextValue(value: string)
        {
            var newElem = <HTMLElement>null;

            for (var i = 0; i < this._items.length; i++)
            {
                var item = this._items[i];
                var itemValue = (item.text !== undefined) ? item.text : item;

                if (itemValue == value || itemValue.toLowerCase() == "none" && value == "")
                {
                    newElem = vp.select(this._root.firstChild).kids()[i];
                    break;
                }
            }

            return newElem;
        }

        changeSelectedItem(newValue: string)
        {
            if (this._selectedElem)
            {
                vp.select(this._selectedElem)
                    .attr("data-selected", "false")
            }

            //---- find newValue's matching element ----
            var newElem = this.getElemByTextValue(newValue);
            
            this._selectedElem = newElem;

            if (newElem)
            {
                vp.select(this._selectedElem)
                    .attr("data-selected", "true")
            }
        }
    }
}
 