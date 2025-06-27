// ==UserScript==
// @name         MWISubscribe
// @namespace    http://tampermonkey.net/
// @version      0.7
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

    // https://greasyfork.org/zh-CN/scripts/536205-%E9%93%B6%E6%B2%B3%E5%A5%B6%E7%89%9B-%E5%BA%B7%E5%BA%B7%E8%BF%90%E6%B0%94
    const Tooltip = new class {
        root = null;
        tooltip = null;

        constructor() { this.init(); }
        
        applyOptions(elem, options) {
            if (typeof options === 'object') {
                Object.entries(options ?? {}).forEach(([key, value]) => {
                    if (key === 'style' && typeof value === 'object') {
                        Object.entries(value ?? {}).forEach(([k, v]) => { elem.style[k] = v; });
                    } else elem[key] = value;
                });
            } else elem.className = options;
        }
        
        elem(tagName, options = null, child = null) {
            const elem = document.createElement(tagName);
            this.applyOptions(elem, options);
            if (typeof child === 'object') {
                if (Array.isArray(child)) child.forEach(child => { elem.appendChild(child); });
                else if (child) elem.appendChild(child);
            } else if (typeof child === 'string') elem.innerHTML = child;
            return elem;
        }

        div(options = null, childList = null) {
            return this.elem('div', options, childList);
        }

        init() {
            const rootClass = 'link-tooltip MuiPopper-root MuiTooltip-popper css-112l0a2';
            const tooltipClass = 'MuiTooltip-tooltip MuiTooltip-tooltipPlacementBottom css-1spb1s5';
            this.tooltip = this.div(tooltipClass);
            this.root = this.div({ className: rootClass, style: { zIndex: 100000, position: 'absolute' } }, this.tooltip);
            document.body.appendChild(this.root);
            this.hide();
        }

        attach(target, content, align = 'left') {
            const contentGen = typeof content === 'function' ? content : (() => content);
            target.addEventListener('mouseover', (e) => {
                this.show(contentGen().outerHTML, target, align);
            });
            target.addEventListener('mouseout', () => {
                this.hide();
            });
        }

        show(innerHTML, target = null, align = 'left') {
            const gap = 2;
            this.root.style.display = 'block';
            this.root.style.left = 0;
            this.root.style.top = 0;
            this.tooltip.innerHTML = innerHTML;
            if (target) {
                const targetRect = target.getBoundingClientRect();
                const tooltipRootRect = this.root.getBoundingClientRect();
                const tooltipRect = this.tooltip.getBoundingClientRect();
                let left = targetRect.left;
                if (align === 'center') left -= (tooltipRect.width - targetRect.width) / 2;
                let top = targetRect.bottom + gap;
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight + window.scrollY;
                if (left + tooltipRect.width > windowWidth) left = windowWidth - tooltipRect.width;
                if (left < 0) left = 0;
                if (top + tooltipRect.height > windowHeight) top = targetRect.top - tooltipRect.height - gap;
                this.root.style.left = `${left - (tooltipRootRect.width - tooltipRect.width) / 2}px`;
                this.root.style.top = `${top - (tooltipRootRect.height - tooltipRect.height) / 2}px`;
            }
        }

        hide() { this.root.style.display = 'none'; }

        formatNumber(value) {
            return value.toString().replace(/\d+/, function (n) {
                return n.replace(/(\d)(?=(?:\d{3})+$)/g, '$1,')
            })
        }

        formatNumberWithUnit(value) {
            if (value > 10_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}T`;
            if (value > 10_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
            if (value > 10_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (value > 10_000) return `${(value / 1_000).toFixed(1)}K`;
            return value;
        }

        item(hrid, level, count) {
            const ask = mwi_common.getItemPriceByHrid(hrid, level, 'ask');
            const bid = mwi_common.getItemPriceByHrid(hrid, level, 'bid');
            return this.div('ItemTooltipText_itemTooltipText__zFq3A', [
                this.div('ItemTooltipText_name__2JAHA', mwi_common.getItemNameByHrid(hrid, mwi_common.isZh) + (level? `+${level}`: '')),
                this.div(null, `拥有数量: ${this.formatNumber(count)}`),
                this.div({ style: { color: '#804600' } },
                    `日均价: ${this.formatNumberWithUnit(ask)} / ${this.formatNumberWithUnit(bid)} (${this.formatNumberWithUnit(ask * count)} / ${this.formatNumberWithUnit(bid * count)})`
                ),
            ]);
        }
    }

    function updateSubscribedList() {
        const displayContainer = document.querySelector("div#subscribeDisplayContainer");
        if (!displayContainer) {
            return;
        }
        
        // 移除收藏物品
        displayContainer.innerHTML = "";
        // 创建收藏物品
        mwi_subscribe_items.forEach(itemHridLevel => {
            const itemInfo = itemHridLevel.split("::");
            const itemHrid = itemInfo[0];
            const itemLevel = itemInfo[1]? Number(itemInfo[1]): 0;
            if (!itemHrid || itemHrid === "") {
                return;
            }

            const itemCount = mwi_common.getItemNumByHrid(itemHrid, itemLevel);
            const item = document.createElement("div");
            item.setAttribute("class", "Item_itemContainer__x7kH1");
            item.innerHTML = `<div>
                <div class="Item_item__2De2O Item_clickable__3viV6" style="position: relative;">
                    <div class="Item_iconContainer__5z7j4">
                        <svg role="img" aria-label="${mwi_common.getItemNameByHrid(itemHrid, mwi_common.isZh)}" class="Icon_icon__2LtL_" width="100%" height="100%">
                            <use href="/static/media/items_sprite.6d12eb9d.svg#${itemHrid.substr(7)}"></use>
                        </svg>
                    </div>
                    <div class="Item_count__1HVvv" style="position: absolute; bottom: 2px; right: 2px;">
                        ${Tooltip.formatNumberWithUnit(itemCount)}
                    </div>
                    <div class="Item_enhancementLevel__19g-e" style="position: absolute; top: 2px; left: 2px;">
                        ${itemLevel > 0? `+${itemLevel}`: ""}
                    </div>
                </div>
            </div>`;
            displayContainer.appendChild(item);
            // 物品点击事件
            item.addEventListener("click", () => mwi_common.gotoMarket(itemHrid, itemLevel));
            // 鼠标悬浮事件
            Tooltip.attach(item, Tooltip.item(itemHrid, itemLevel, itemCount));
        });
    }

    function createSubscribeButton(marketPanel) {
        const displayContainer = marketPanel.querySelector(".MarketplacePanel_currentItem__3ercC");
        if (!displayContainer) {
            return;
        }

        // 创建收藏按钮
        const subscribeButton = document.createElement("button");
        subscribeButton.setAttribute("id", "subscribeButton");
        subscribeButton.className = "subscribe-btn";
        subscribeButton.style.position = "absolute";
        subscribeButton.style.padding = "0";
        subscribeButton.style.marginLeft = "6px";
        subscribeButton.style.background = "none";
        subscribeButton.style.border = "none";
        subscribeButton.style.outline = "none";
        subscribeButton.style.zIndex = "2"; /** make sure it's on top of the item level div created by MWITools */
        
        // 创建图标
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        // 未收藏
        const heartUnsubscribed = document.createElementNS(svgNS, "path");
        heartUnsubscribed.setAttribute("d", "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z");
        heartUnsubscribed.setAttribute("fill", "#aaaaaa");
        heartUnsubscribed.setAttribute("stroke", "#333");
        heartUnsubscribed.setAttribute("transition", "all 0.3s");
        // 已收藏
        const heartSubscribed = document.createElementNS(svgNS, "path");
        heartSubscribed.setAttribute("d", "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z");
        heartSubscribed.setAttribute("fill", "#ff4d4f");
        heartSubscribed.setAttribute("opacity", "0");
        heartSubscribed.setAttribute("transition", "opacity 0.3s");
        // 添加图标
        svg.appendChild(heartUnsubscribed);
        svg.appendChild(heartSubscribed);
        subscribeButton.appendChild(svg);
        displayContainer.prepend(subscribeButton);
        
        // 物品等级
        let itemHrid = "";
        let itemLevel = 0;
        let itemHridLevel = "";
        let isSubscribed = false;

        const updateSubscribedButton = function() {
            if (isSubscribed) {
                heartUnsubscribed.setAttribute("stroke", "#ff4d4f");
                heartSubscribed.setAttribute("opacity", "1");
            } else {
                heartUnsubscribed.setAttribute("stroke", "#333");
                heartSubscribed.setAttribute("opacity", "0");
            }
        };

        const updateMarketItem = function() {
            itemHrid = "";
            const displayItem = displayContainer.querySelector(".Item_iconContainer__5z7j4");
            if (displayItem && displayItem.firstChild) {
                const itemName = displayItem.firstChild.getAttribute("aria-label");
                if (itemName && itemName !== "") {
                    itemHrid = mwi_common.getItemHridByName(itemName);
                }
            }

            itemLevel = 0;
            const levelDiv = displayContainer.querySelector(".Item_enhancementLevel__19g-e");
            if (levelDiv) {
                itemLevel = Number(levelDiv.textContent.replace("+", ""));
                if (isNaN(itemLevel)) itemLevel = 0;
            }

            itemHridLevel = itemLevel > 0? `${itemHrid}::${itemLevel}`: itemHrid;
            isSubscribed = mwi_subscribe_items.includes(itemHridLevel);
            updateSubscribedButton();
        }

        updateMarketItem();
        
        // 绑定点击
        subscribeButton.addEventListener("click", function() {
            if (!itemHridLevel || itemHridLevel === "") {
                return;
            }

            isSubscribed = !isSubscribed;
            updateSubscribedButton();

            if (isSubscribed) {
                console.info("[MWISubscribe] add item " + itemHridLevel);
                mwi_subscribe_items.push(itemHridLevel);
            }
            else {
                console.info("[MWISubscribe] remove item " + itemHridLevel);
                const idx = mwi_subscribe_items.indexOf(itemHridLevel);
                (~idx) && mwi_subscribe_items.splice(idx, 1);
            }

            localStorage.setItem(storage_key, JSON.stringify(mwi_subscribe_items));
            updateSubscribedList();
        });

        new MutationObserver(updateMarketItem).observe(displayContainer, { childList: true, subtree: true });
    }
    
    function createDisplayButton(marketPanel) {
        const tabPanelContainer = marketPanel.querySelector(".TabsComponent_tabPanelsContainer__26mzo");
        const filterContainer = marketPanel.querySelector(".MarketplacePanel_itemFilterContainer__3F3td");
        if (!tabPanelContainer || !filterContainer) {
            return;
        }

        const tabList = tabPanelContainer.querySelector("[role=tablist]");
        const panelList = tabPanelContainer.querySelector(".TabsComponent_tabPanelsContainer__26mzo");
        if (!tabList || !panelList) {
            return;
        }
        
        // 创建收藏页签按钮
        const subscribeTabButton = document.createElement("button");
        subscribeTabButton.setAttribute("class", "MuiButtonBase-root MuiTab-root MuiTab-textColorPrimary css-1q2h7u5");
        subscribeTabButton.setAttribute("tabindex", -1);
        subscribeTabButton.setAttribute("role", "tab");
        subscribeTabButton.setAttribute("aria-selected", false);
        subscribeTabButton.setAttribute("id", "subscribeTabButton");
        subscribeTabButton.textContent = mwi_common.isZh? "收藏": "Subscribed";
        tabList.appendChild(subscribeTabButton);

        // 创建收藏面板
        const subscribeDisplayPanel = document.createElement("div");
        subscribeDisplayPanel.setAttribute("class", "TabPanel_tabPanel__tXMJF TabPanel_hidden__26UM3");
        panelList.appendChild(subscribeDisplayPanel);
        // 创建收藏容器
        const subscribeDisplayContainer = document.createElement("div");
        subscribeDisplayContainer.setAttribute("class", "MarketplacePanel_marketItems__D4k7e");
        subscribeDisplayContainer.setAttribute("id", "subscribeDisplayContainer");
        subscribeDisplayPanel.appendChild(subscribeDisplayContainer);
        updateSubscribedList();
        
        // 创建查看收藏按钮
        const showSubscribeButton = document.createElement("button");
        showSubscribeButton.setAttribute("id", "showSubscribeButton");
        showSubscribeButton.style.position = "absolute";
        showSubscribeButton.style.marginLeft = "20px";
        showSubscribeButton.style.backgroundColor = "orange";
        showSubscribeButton.style.color = "black";
        showSubscribeButton.style.whiteSpace = "nowrap";
        showSubscribeButton.textContent = mwi_common.isZh? "查看收藏": "View Subscribed Items";
        filterContainer.appendChild(showSubscribeButton);

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
                // 更新收藏列表
                if (childBtn === subscribeTabButton) updateSubscribedList();
            });
        });

        showSubscribeButton.addEventListener("click", function () {
            const filterInput = filterContainer.querySelector(".Input_input__2-t98");
            if (!filterInput) {
                return;
            }
            
            // 取消筛选
            const lastValue = filterInput.value;
            const event = new Event("input", { bubbles: true });
            event.simulated = true;
            filterInput.value = "";
            filterInput._valueTracker && filterInput._valueTracker.setValue(lastValue);
            filterInput.dispatchEvent(new Event("input", { bubbles: true }));

            // 选中收藏页签
            subscribeTabButton.click();
        });
    }

    function addButton() {
        const marketPanel = document.querySelector(".MarketplacePanel_marketplacePanel__21b7o ");
        if (!marketPanel) {
            return;
        }

        const subscribeButton = marketPanel.querySelector("button#subscribeButton");
        subscribeButton || createSubscribeButton(marketPanel);

        const displayButton = marketPanel.querySelector("button#subscribeTabButton");
        displayButton || createDisplayButton(marketPanel);
    }

    function start() {
        console.info("[MWISubscribe] start");
        mwi_common = window.mwi_common;
        if (!mwi_common) {
            console.error("[MWISubscribe] mwi_common not found");
            return;
        }

        setInterval(addButton, 500);
    }

    if (window.mwi_common) start();
    else {
        console.info("[MWISubscribe] waiting for mwi_common");
        document.addEventListener("mwi_common_injected", start);
    }

})();