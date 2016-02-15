//-------------------------------------------------------------------------------------
//  Copyright (c) 2016 - Microsoft Corporation.
//    panelMgr.ts - manages the panels (toggling of open/close of each panel)
//-------------------------------------------------------------------------------------

/// <reference path="../_references.ts" />

module beachPartyApp
{
    export class PanelMgrClass extends beachParty.DataChangerClass 
    {
        private application: AppClass;
        private settings: AppSettingsMgr;
        private container: HTMLElement;

        //---- panel properties are created dynamically ----

        constructor(application: AppClass, settings: AppSettingsMgr, container: HTMLElement)
        {
            super();

            this.application = application;
            this.settings = settings;
            this.container = container;
        }

        togglePanel(name: string, buttonName: string, isPinned: boolean,
            target: Target, e: any, openCallback: any, closeCallback?: any, dataOwner?, isUndoable = false)
        {
            var isOpen = false;
            this[name + "OpenCallback"] = openCallback;
            this[name + "CloseCallback"] = closeCallback;

            if (this[name])
            {
                this.closePanel(name);
            }
            else
            {
                this.openPanel(dataOwner, name, buttonName, isPinned);
                isOpen = true;
            }

            //---- LOG this action ----
            var action = (isOpen) ? Action.show : Action.hide;
            var targetId = (e) ? e.target.id : "";
            /*appClass.instance*/this.application.logAction(Gesture.click, targetId, ElementType.button, action, target, isUndoable);

            return isOpen;
        }

        togglePanelMgr(name: string, buttonName: string, isPinned: boolean,
            target: Target, e: any, createCallback: any, closeCallback?: any, openCallback?: any, isUndoable = false)
        {
            var isOpen = false;
            this[name + "CreateCallback"] = createCallback;
            this[name + "CloseCallback"] = closeCallback;

            if (this[name])
            {
                this.closePanelMgr(name);
            }
            else
            {
                var panelMgr = <IAppControl>this.createPanelMgr(name, buttonName, isPinned);
                isOpen = true;

                if (openCallback)
                {
                    var openEvent = { panel: panelMgr };
                    openCallback(openEvent);
                }
            }

            //---- LOG this action ----
            var action = (isOpen) ? Action.show : Action.hide;
            var targetId = (e) ? e.target.id : "";
            /*appClass.instance*/this.application.logAction(Gesture.click, targetId, ElementType.button, action, target, isUndoable);

            return isOpen;
        }

        /** 
         *  Closes the specified xxxPanelMgr object (e.g., clusterPanelMgr). 
         * @param name
         */
        closePanelMgr(name: string)
        {
            var panelMgr = <IAppControl>this[name];
            if (panelMgr)
            {
                panelMgr.close();
            }
        }

        getPanel(name: string)
        {
            return this[name];
        }

        getPanelMgr(name: string)
        {
            return this[name];
        }

        /**
         * closes the specified jsonPanelClass object.
         * @param name
         */
        closePanel(name: string)
        {
            var panel = <JsonPanelClass>this[name];
            if (panel)
            {
                panel.close();
            }
        }

        onPanelClose(name: string)
        {
            var closeCallback = this[name + "CloseCallback"];
            if (closeCallback)
            {
                closeCallback(null);
            }

            this[name] = null;
        }

        openPanel(dataOwner: any, name: string, buttonName: string, isPinned: boolean)
        {
            if (!this[name])
            {
                var panel = buildJsonPanel(this.application, this.settings, this.container, buttonName, dataOwner, name, true);
                this[name] = panel;

                panel.isPinnedDown(isPinned);

                //---- register for this on each new panel ----
                panel.registerForChange("close", (e) =>
                {
                    this.onPanelClose(name);
                });

                var openCallback = this[name + "OpenCallback"];
                if (openCallback)
                {
                    var openEvent = { panel: panel };
                    openCallback(openEvent);
                }

                //---- if only single button name, use it to position panel (otherwise, caller will do it) ----
                if (!buttonName.contains(" "))
                {
                    var rcPanel = vp.select(panel.getRootElem()).getBounds(false);

                    var pt = this.getBestPanelLocation(rcPanel, buttonName);
                    panel.showAt(pt.x, pt.y);
                }
            }
        }

        getBestPanelLocation(rcPanel: ClientRect, buttonName: string)
        {
            //---- currently supports only buttons from HORIZONTAL toolbars ----
            var rcButton = <ClientRect>vp.select(this.container, "." + buttonName).getBounds(false);

            var toLeftSpace = rcButton.right - rcPanel.width;
            var toRightSpace = innerWidth - (rcButton.left + rcPanel.width);

            if (toLeftSpace > toRightSpace)
            {
                var x = toLeftSpace;
            }
            else
            {
                var x = rcButton.left;
            }

            var toTopSpace = rcButton.top - rcPanel.height;
            var toBottomSpace = innerHeight - (rcButton.bottom + rcPanel.height);

            if (toTopSpace > toBottomSpace)
            {
                var y = toTopSpace;
            }
            else
            {
                var y = rcButton.bottom;
            }

            return { x: x, y: y };
        }

        createPanelMgr(name: string, buttonName: string, isPinned: boolean)
        {
            if (!this[name])
            {
                var createCallback = this[name + "CreateCallback"];
                var panelMgr = <IAppControl> createCallback();

                this[name] = panelMgr;

                //---- don't assume that panelMgr is based on basePanelClass ----
                var anyPanelMgr = <any>panelMgr;

                if (anyPanelMgr.isPinnedDown)      // does it have this function?
                {
                    anyPanelMgr.isPinnedDown(isPinned);
                }

                //---- if only single button name, use it to position panel (otherwise, caller will do it) ----
                if (!buttonName.contains(" "))
                {
                    var rcPanel = vp.select(panelMgr.getRootElem()).getBounds(false);
                    var pt = this.getBestPanelLocation(rcPanel, buttonName);

                    panelMgr.showAt(pt.x, pt.y);
                }

                //---- register for this on each new panel ----
                panelMgr.registerForChange("close", (e) =>
                {
                    this.onPanelClose(name);
                });

                return panelMgr;
            }
        }
    }
} 