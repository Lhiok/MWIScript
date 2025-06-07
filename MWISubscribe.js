// ==UserScript==
// @name         MWISubscribe
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Subscribe Market Item
// @author       Lhiok
// @license      MIT
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @icon         https://www.milkywayidle.com/favicon.svg
// @supportURL   https://github.com/Lhiok/MWIScript/
// @grant        none
// ==/UserScript==

(function() {
    "use strict";

    let mwi_common = null;
    let mwi_subscribe_items = [];
    const storage_key = "mwi_subscribe_items";
    const subscribeItemsStorage = localStorage.getItem(storage_key);
    if (subscribeItemsStorage) {
        mwi_subscribe_items = JSON.parse(subscribeItemsStorage);
    }

    function updateSubscribedList() {
        const displayContainer = document.querySelector("div#displayContainer141");
        if (!displayContainer) {
            return;
        }
        
        // 移除收藏物品
        displayContainer.innerHTML = "";
        // 创建收藏物品
        mwi_subscribe_items.forEach(itemHrid => {
            const item = document.createElement("div");
            item.setAttribute("class", "Item_itemContainer__x7kH1");
            item.innerHTML = `<div>
                <div class="Item_item__2De2O Item_clickable__3viV6" style="position: relative;">
                    <div class="Item_iconContainer__5z7j4">
                        <svg role="img" aria-label="${mwi_common.getItemNameByHrid(itemHrid, mwi_common.isZh)}" class="Icon_icon__2LtL_" width="100%" height="100%">
                            <use href="/static/media/items_sprite.6d12eb9d.svg#${itemHrid.substr(7)}"></use>
                        </svg>
                    </div>
                </div>
            </div>`;
            displayContainer.appendChild(item);
            // 物品点击事件
            item.addEventListener("click", function() {
                console.info(`[MWISubscribe] goto ${itemHrid}`);
                mwi_common.gotoMarket(itemHrid, 0); 
            });
            // 鼠标悬浮事件
            item.addEventListener('mouseenter', function(event) {
                console.info(`[MWISubscribe] show tooltip ${itemHrid} at (${event.clientX}, ${event.clientY})`);
                const itemCount = mwi_common.getItemNumByHrid(itemHrid, 0);
                mwi_common.openItemToolTip(itemHrid, 0, itemCount > 0? itemCount: 1, event.clientX, event.clientY);
            });
            item.addEventListener('mouseleave', () => mwi_common.closeItemToolTip(itemHrid));
        });
    }

    function createSubscribeButton(marketPanel) {
        const displayContainer = marketPanel.querySelector(".MarketplacePanel_currentItem__3ercC");
        if (!displayContainer) {
            return;
        }

        const displayItem = displayContainer.querySelector(".Item_iconContainer__5z7j4");
        if (!displayItem || !displayItem.firstChild) {
            return;
        }

        const itemName = displayItem.firstChild && displayItem.firstChild.getAttribute("aria-label");
        if (!itemName || itemName === "") {
            return;
        }

        const itemHrid = mwi_common.getItemHridByName(itemName);
        if (!itemHrid || itemHrid === "") {
            return;
        }

        const btnList = marketPanel.querySelector(".MarketplacePanel_marketNavButtonContainer__2QI9I");
        if (!btnList) {
            return;
        }

        let isSubscribed = mwi_subscribe_items.includes(itemHrid);
        
        // 创建收藏按钮
        const subscribeButton = document.createElement("button");
        subscribeButton.setAttribute("class", "Button_button__1Fe9z");
        subscribeButton.setAttribute("id", "SubscribeButton141");
        subscribeButton.innerText = isSubscribed ? "取消收藏" : "添加收藏";
        btnList.appendChild(subscribeButton);
        
        // 绑定点击
        subscribeButton.addEventListener("click", function() {
            isSubscribed = !isSubscribed;

            if (isSubscribed) {
                console.info("[MWISubscribe] add item " + itemHrid);
                subscribeButton.innerText = "取消收藏";
                mwi_subscribe_items.push(itemHrid);
            }
            else {
                console.info("[MWISubscribe] remove item " + itemHrid);
                subscribeButton.innerText = "添加收藏";
                const idx = mwi_subscribe_items.indexOf(itemHrid);
                if (~idx) {
                    mwi_subscribe_items[idx] = mwi_subscribe_items[mwi_subscribe_items.length - 1];
                    --mwi_subscribe_items.length;
                }
            }
            localStorage.setItem(storage_key, JSON.stringify(mwi_subscribe_items));
            updateSubscribedList();
        });
    }

    function createDisplayButton(marketPanel) {
        const tabPanelContainer = marketPanel.querySelector(".TabsComponent_tabPanelsContainer__26mzo");
        if (!tabPanelContainer) {
            return;
        }

        const tabList = tabPanelContainer.querySelector("[role=tablist]");
        const panelList = tabPanelContainer.querySelector(".TabsComponent_tabPanelsContainer__26mzo");
        if (!tabList || !panelList) {
            return;
        }
        
        // 创建收藏按钮
        const displayButton = document.createElement("button");
        displayButton.setAttribute("class", "MuiButtonBase-root MuiTab-root MuiTab-textColorPrimary css-1q2h7u5");
        displayButton.setAttribute("tabindex", -1);
        displayButton.setAttribute("role", "tab");
        displayButton.setAttribute("aria-selected", false);
        displayButton.setAttribute("id", "displayButton141");
        displayButton.textContent = "收藏";
        tabList.appendChild(displayButton);

        // 创建收藏面板
        const displayPanel = document.createElement("div");
        displayPanel.setAttribute("class", "TabPanel_tabPanel__tXMJF TabPanel_hidden__26UM3");
        panelList.appendChild(displayPanel);
        // 创建收藏容器
        const displayContainer = document.createElement("div");
        displayContainer.setAttribute("class", "MarketplacePanel_marketItems__D4k7e");
        displayContainer.setAttribute("id", "displayContainer141");
        displayPanel.appendChild(displayContainer);
        updateSubscribedList();

        // 设置按钮点击事件
        tabList.childNodes.forEach((childBtn, btnIdx) => {
            childBtn.addEventListener("click", function() {
                // 按钮样式更改
                tabList.childNodes.forEach(otherBtn => {
                    if (otherBtn === childBtn) {
                        otherBtn.setAttribute("class", "MuiButtonBase-root MuiTab-root MuiTab-textColorPrimary Mui-selected css-1q2h7u5");
                        otherBtn.setAttribute("tabindex", 0);
                        otherBtn.setAttribute("aria-selected", true);
                    }
                    else {
                        otherBtn.setAttribute("class", "MuiButtonBase-root MuiTab-root MuiTab-textColorPrimary css-1q2h7u5");
                        otherBtn.setAttribute("tabindex", -1);
                        otherBtn.setAttribute("aria-selected", false);
                    }
                });
                // 面板样式更改
                panelList.childNodes.forEach((otherPanel, panelIdx) => {
                    if (panelIdx === btnIdx) {
                        otherPanel.setAttribute("class", "TabPanel_tabPanel__tXMJF");
                    }
                    else {
                        otherPanel.setAttribute("class", "TabPanel_tabPanel__tXMJF TabPanel_hidden__26UM3");
                    }
                });
            });
        });
    }

    function addButton() {
        const marketPanel = document.querySelector(".MarketplacePanel_marketplacePanel__21b7o ");
        if (!marketPanel) {
            return;
        }

        const subscribeButton = marketPanel.querySelector("button#SubscribeButton141");
        subscribeButton || createSubscribeButton(marketPanel);

        const displayButton = marketPanel.querySelector("button#displayButton141");
        displayButton || createDisplayButton(marketPanel);
    }

    function start() {
        console.info("[MWISubscribe] start");
        mwi_common = window.mwi_common;
        setInterval(addButton, 500);
    }

    if (window.mwi_common) start();
    else {
        console.info("[MWISubscribe] waiting for mwi_common");
        document.addEventListener("mwi_common_injected", start);
    }

})();