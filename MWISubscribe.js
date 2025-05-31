// ==UserScript==
// @name         MWISubscribe
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Subscribe Market Item
// @author       Lhiok
// @license      MIT
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @icon         https://www.milkywayidle.com/favicon.svg
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    "use strict";

    let subscribeItems = [];

    const subscribeItemsStorage = GM_getValue("subscribe_items");
    if (subscribeItemsStorage) {
        subscribeItems = JSON.parse(subscribeItemsStorage);
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

        // modify displayContainer
        displayContainer.style.position = "relative";
        displayContainer.style.marginRight = "auto";
        
        // create SubscribeButton
        const subscribeButton = document.createElement("button");
        subscribeButton.setAttribute("id", "SubscribeButton141");
        subscribeButton.className = "subscribe-btn";
        subscribeButton.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: 24px;
            height: 24px;
            padding: 0;
            background: none;
            border: none;
            cursor: pointer;
            outline: none;
            z-index: 2; /** make sure it's on top of the item level div created by MWITools */
        `;
        
        // create SVG
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        
        // create heart unsubscribed
        const heartUnsubscribed = document.createElementNS(svgNS, "path");
        heartUnsubscribed.setAttribute("d", "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z");
        heartUnsubscribed.setAttribute("fill", "#aaaaaa");
        heartUnsubscribed.setAttribute("stroke", "#333");
        heartUnsubscribed.setAttribute("transition", "all 0.3s");
        
        // create path subscribed
        const heartSubscribed = document.createElementNS(svgNS, "path");
        heartSubscribed.setAttribute("d", "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z");
        heartSubscribed.setAttribute("fill", "#ff4d4f");
        heartSubscribed.setAttribute("opacity", "0");
        heartSubscribed.setAttribute("transition", "opacity 0.3s");
        
        // use SVG
        svg.appendChild(heartUnsubscribed);
        svg.appendChild(heartSubscribed);
        subscribeButton.appendChild(svg);
        displayContainer.appendChild(subscribeButton);
        
        let isSubscribed = subscribeItems.includes(itemName);
        const updateSubscribedButton = function() {
            if (isSubscribed) {
                heartUnsubscribed.setAttribute("stroke", "#ff4d4f");
                heartSubscribed.setAttribute("opacity", "1");
            } else {
                heartUnsubscribed.setAttribute("stroke", "#333");
                heartSubscribed.setAttribute("opacity", "0");
            }
        };
        
        // init view
        updateSubscribedButton(isSubscribed);
        // add event
        subscribeButton.addEventListener("click", function() {
            isSubscribed = !isSubscribed;
            updateSubscribedButton();

            if (isSubscribed) {
                subscribeItems.push(itemName);
            }
            else {
                const idx = subscribeItems.indexOf(itemName);
                if (~idx) {
                    subscribeItems[idx] = subscribeItems[subscribeItems.length - 1];
                    --subscribeItems.length;
                }
            }
            GM_setValue("subscribe_items", JSON.stringify(subscribeItems));
        });
    }

    function createDisplayButton(marketPanel) {
        const filterContainer = marketPanel.querySelector(".MarketplacePanel_itemFilterContainer__3F3td");
        if (!filterContainer) {
            return;
        }

        // modify filterContainer
        filterContainer.style.display = "flex";
        filterContainer.style.flexDirection = "row";
        filterContainer.style.gap = "20px";
        
        // create displayButton
        const displayButton = document.createElement("button");
        displayButton.setAttribute("style", "margin-left: 20px; border-radius: 3px; background-color: orange; color: black; white-space: nowrap;");
        displayButton.setAttribute("id", "displayButton141");
        displayButton.textContent = "查看收藏";
        filterContainer.appendChild(displayButton);

        // add event
        displayButton.addEventListener("click", function () {
            if (!subscribeItems.length) {
                return;
            }
            
            const filterInput = filterContainer.querySelector(".Input_input__2-t98");
            if (!filterInput) {
                return;
            }
            
            const lastValue = filterInput.value;
            const event = new Event("input", { bubbles: true });
            event.simulated = true;
            filterInput.value = `^(${subscribeItems.join("|")})$`;
            filterInput._valueTracker && filterInput._valueTracker.setValue(lastValue);
            filterInput.dispatchEvent(new Event("input", { bubbles: true }));
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

    setInterval(addButton, 500);
})();