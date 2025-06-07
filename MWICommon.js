// ==UserScript==
// @name         MWICommon
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Common API for MWIScript
// @author       Lhiok
// @license      MIT
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @icon         https://www.milkywayidle.com/favicon.svg
// @@supportURL  https://github.com/Lhiok/MWIScript/
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    "use strict";

    const selfSpace = "mwi_common";

    if (window[selfSpace]) return;

    let mwi_common = window[selfSpace] = {
        
        /**************************************** Public ****************************************/

        eventNames: null, // 事件名称

        injected: false, // 是否注入完成 完成触发document的mwi_common_injected事件
        isZh: false, // 是否中文

        handleGameAPI: null, // 调用游戏API

        addNotification: null, // 添加通知
        openItemDictionary: null, // 打开物品字典
        gotoMarket: null, // 打开市场
        goToAction: null, // 前往行动
        goToMonster: null, // 前往打怪

        getItemNameByHrid: null, // 通过物品ID获取名称
        getItemHridByName: null, // 通过名称获取物品ID
        getActionHridByName: null, // 通过名称获取行动ID
        getMonsterHridByName: null, // 通过名称获取怪物ID

        /**************************************** Private ****************************************/

        game: null, // 游戏对象
        lang: null, // 语言翻译对象
        buffCalculator: null, // buff计算对象
        alchemyCalculator: null, // 炼金对象

        itemNameToHrid: null, // 名称到物品ID
    };

    /**************************************** Log ****************************************/
    
    function info(info) {
        console.info('[MWI_Common]: ' + info);
    }

    function warn(info) {
        console.warn('[MWI_Common]: ' + info);
    }

    function error(info) {
        console.error('[MWI_Common]: ' + info);
    }
    
    /**************************************** Private ****************************************/
    
    const eventNames = mwi_common.eventNames = {
        injected: "mwi_common_injected", // 注入完成
        login: "mwi_common_login", // 登录
        actionUpdate : "mwi_common_action_update", // 行动队列变更
        actionComplete: "mwi_common_action_complete", // 完成一次行动
        taskUpdate: "mwi_common_task_update", // 任务变更
        itemUpdate: "mwi_common_item_update", // 物品变更
        skillUpdate: "mwi_common_skill_update", // 技能变更 (更换技能&使用技能书)
        lootOpened: "mwi_common_loot_opened", // 打开宝箱
        marketListingsUpdate: "mwi_common_market_listings_update", // 市场挂牌更新 (上下架&成功交易&提取金币)
        equipmentUpdate: "mwi_common_equipment_update", // 装备变更
        consumableUpdate: "mwi_common_consumable_update", // 消耗品变更 (更换&持续时间更新)
        battleConditionUpdate: "mwi_common_battle_condition_update", // 更改战斗条件预设
        loadoutsUpdate: "mwi_common_loadouts_update", // 装配方案更新
        houseRoomsUpdate: "mwi_common_house_rooms_update", // 房屋更新
        actionBuffUpdate: "mwi_common_action_buff_update", // 行动加成更新
        newBattle: "mwi_common_new_battle", // 新一轮战斗 单个EPH算一轮
    };

    // API调用事件
    const gameAPICallEvents = {
        ["handleMessageInitCharacterData"]: [eventNames.login],
        ["handleMessageActionUpdate"]: [eventNames.actionUpdate],
        ["handleMessageActionComplete"]: [eventNames.actionComplete],
        ["handleMessageQuestsUpdated"]: [eventNames.taskUpdate],
        ["handleMessageItemsUpdated"]: [eventNames.itemUpdate],
        ["handleMessageAbilitiesUpdated"]: [eventNames.skillUpdate],
        ["handleMessageLootOpened"]: [eventNames.lootOpened],
        ["handleMessageMarketListingsUpdated"]: [eventNames.marketListingsUpdate],
        ["handleMessageCharacterStatsUpdated"]: [eventNames.equipmentUpdate],
        ["handleMessageActionTypeConsumableSlotsUpdated"]: [eventNames.consumableUpdate],
        ["handleMessageAllCombatTriggersUpdated"]: [eventNames.battleConditionUpdate],
        ["handleMessageCombatTriggersUpdated"]: [eventNames.battleConditionUpdate],
        ["handleMessageLoadoutsUpdated"]: [eventNames.loadoutsUpdate],
        ["handleMessageHouseRoomsUpdated"]: [eventNames.houseRoomsUpdate],
        ["handleMessageCommunityBuffsUpdated"]: [eventNames.actionBuffUpdate],
        ["handleMessageConsumableBuffsUpdated"]: [eventNames.actionBuffUpdate],
        ["handleMessageEquipmentBuffsUpdated"]: [eventNames.actionBuffUpdate],
        ["handleMessageNewBattle"]: [eventNames.newBattle],
    };

    /**
     * 检测对象是否注入
     * @param {string} objName 
     * @returns 
     */
    function checkObjectInjected(objName) {
        if (!mwi_common.injected) {
            warn("not injected");
            return false;
        }
        if (!mwi_common[objName]) {
            warn(objName + " injected failed");
            return false;
        }
        return true;
    }

    /**
     * 监听游戏API调用
     * @param {string} apiName 
     * @param {string} eventBefore 调用前执行事件
     * @param {string} eventAfter 调用后执行事件
     */
    function hookGameAPICall(apiName, ...events) {
        if (!checkObjectInjected("game")) return;
        const api = mwi_common.game[apiName];
        if (!api) {
            error("game api not found: " + apiName);
            return;
        }
        mwi_common.game[apiName] = function(...args) {
            api.apply(this, args);
            events.forEach(event => document.dispatchEvent(new CustomEvent(event, { detail: args })));
        }
    }

    /**************************************** Public ****************************************/

    if (localStorage.getItem("i18nextLng") && localStorage.getItem("i18nextLng").startsWith("zh")) {
        mwi_common.isZh = true;
    }

    /**
     * 调用游戏API
     * @param {string} apiName 
     * @param  {...any} args 
     * @returns 
     */
    mwi_common.handleGameAPI = function(apiName, ...args) {
        if (!checkObjectInjected("game")) return;
        if (!mwi_common.game[apiName]) {
            error("game api not found: " + apiName);
            return;
        }
        mwi_common.game[apiName](...args);
    }

    /**
     * 添加通知
     * @param {string} msg 消息
     * @param {boolean} isError 是否错误提示
     */
    mwi_common.addNotification = (msg, isError) => mwi_common.handleGameAPI("updateNotifications", isError? "error": "info", msg);

    /**
     * 打开物品字典
     * @param {string} itemHrid 物品ID
     */
    mwi_common.openItemDictionary = (itemHrid) => mwi_common.handleGameAPI("handleOpenItemDictionary", itemHrid);

    /**
     * 前往市场
     * @param {string} itemHrid 物品ID
     * @param {number} itemLevel 物品等级
     */
    mwi_common.gotoMarket = (itemHrid, itemLevel) => mwi_common.handleGameAPI("handleGoToMarketplace", itemHrid, itemLevel);

    /**
     * 前往行动
     * @param {string} actionHrid 行动ID 
     * @param {number} actionCount 行动次数
     */
    mwi_common.goToAction = (actionHrid, actionCount) => mwi_common.handleGameAPI("handleGoToAction", actionHrid, actionCount);

    /**
     * 前往打怪
     * @param {string} monsterHrid 怪物ID
     * @param {number} actionCount 行动次数
     */
    mwi_common.goToMonster = (monsterHrid, actionCount) => mwi_common.handleGameAPI("handleGoToMonster", monsterHrid, actionCount);

    /**
     * 通过物品ID获取名称
     * @param {string} itemHrid 物品ID
     * @param {boolean} isZh 是否中文
     * @returns 物品名称
     */
    mwi_common.getItemNameByHrid = function(itemHrid, isZh) {
        if (!checkObjectInjected("lang")) return;
        return (isZh? mwi_common.lang.zh: mwi_common.lang.en).translation.itemNames[itemHrid];
    }

    /**
     * 通过名称获取物品ID
     * @param {string} itemName 物品名称
     * @returns 物品ID
     */
    mwi_common.getItemHridByName = function(itemName) {
        if (mwi_common.itemNameToHrid) return mwi_common.itemNameToHrid[itemName];
        if (!checkObjectInjected("lang")) return;

        const itemNameToHrid = mwi_common.itemNameToHrid = {};
        const enItemNames = mwi_common.lang.en.translation.itemNames;
        const zhItemNames = mwi_common.lang.zh.translation.itemNames;
        for (const itemHrid in enItemNames) itemNameToHrid[enItemNames[itemHrid]] = itemHrid;
        for (const itemHrid in zhItemNames) itemNameToHrid[zhItemNames[itemHrid]] = itemHrid;
        return itemNameToHrid[itemName];
    }

    /**
     * 通过名称获取行动ID
     * @param {string} actionName 行动名称
     * @param {boolean} isZh 是否中文
     * @returns 行动ID
     */
    mwi_common.getActionHridByName = function(actionName, isZh) {
        if (!checkObjectInjected("lang")) return;

        const autionNames = (isZh? mwi_common.lang.zh: mwi_common.lang.en).translation.actionNames;
        for (const actionHrid in autionNames) if (autionNames[actionHrid] === actionName) return actionHrid;

        error("action name not found: " + actionName);
        return "";
    }

    /**
     * 通过名称获取怪物ID
     * @param {string} monsterName 怪物名称
     * @param {boolean} isZh 是否中文
     * @returns 怪物ID
     */
    mwi_common.getMonsterHridByName = function(monsterName, isZh) {
        if (!checkObjectInjected("lang")) return;

        const autionNames = (isZh? mwi_common.lang.zh: mwi_common.lang.en).translation.monsterNames;
        for (const monsterHrid in autionNames) if (autionNames[monsterHrid] === monsterName) return monsterHrid;

        error("monster name not found: " + monsterName);
        return "";
    }

    /**************************************** MutationObserver注入 ****************************************/

    const mooketSpace = "mwi";
    const mooketInjectedEventName = "MWICoreInitialized";

    function onInjected() {
        info("injected");
        mwi_common.injected = true;

        info("hooking game api");
        for (let key in gameAPICallEvents) hookGameAPICall(key, ...gameAPICallEvents[key]);
        
        info("dispatch injected event");
        document.dispatchEvent(new CustomEvent(eventNames.injected));
    }

    function initWithMooket() {
        info("init with mooket");
        mwi_common.game = window[mooketSpace].game;
        mwi_common.lang = window[mooketSpace].lang;
        mwi_common.buffCalculator = window[mooketSpace].buffCalculator;
        mwi_common.alchemyCalculator = window[mooketSpace].alchemyCalculator;
        onInjected();
    }

    async function injectedScriptNode(node) {
        info("patching script: " + node.src);

        try {
            // 移除原始脚本
            const scriptUrl = node.src;
            const nodeParent = node.parentNode;
            node.remove();
            // 注入脚本文件
            const response = await fetch(scriptUrl);
            if (!response.ok) throw new Error(response.status);
            let sourceCode = await response.text();
            const injectionPoints = [
                {
                    name: "game",
                    pattern: "this.sendPing=",
                    replacement: `window.${selfSpace}.game=this,this.sendPing=`,
                },
                {
                    name: "lang",
                    pattern: "Ca.a.use",
                    replacement: `window.${selfSpace}.lang=Oa;Ca.a.use`,
                },
                {
                    name: "buffCalculator",
                    pattern: "var Q=W;",
                    replacement: `window.${selfSpace}.buffCalculator=W;var Q=W;`,
                },
                {
                    name: "alchemyCalculator",
                    pattern: "class Rn",
                    replacement: `window.${selfSpace}.alchemyCalculator=Ln;class Rn`,
                }
            ];
            injectionPoints.forEach(injectionPoint => {
                if (sourceCode.includes(injectionPoint.pattern)) {
                    sourceCode = sourceCode.replace(injectionPoint.pattern, injectionPoint.replacement);
                    info(`${injectionPoint.name} injected successfully`);
                }
                else {
                    error(`${injectionPoint.name} injection failed`);
                }
            });
            // 替换脚本
            const newNode = document.createElement('script');
            newNode.textContent = sourceCode;
            document.body.appendChild(newNode);
            info("script patched successfully");
            onInjected();
        } catch (error) {
            error("patching failed: " + error);
        }
    }

    new MutationObserver(async (mutationsList, obs) => {
        // 兼容mooket插件
        if (window[mooketSpace]) {
            info("mooket detected");
            if (window[mooketSpace].MWICoreInitialized) {
                info("mooket core initialized");
                initWithMooket();
            }
            else {
                info("waiting for mooket core");
                window.addEventListener(mooketInjectedEventName, initWithMooket);
            }
            obs.disconnect();
            return;
        }
        for (let idx = mutationsList.length - 1; ~idx; --idx) {
            const mutationRecord = mutationsList[idx];
            for (let idx2 = mutationRecord.addedNodes.length - 1; ~idx2; --idx2) {
                const node = mutationRecord.addedNodes[idx2];
                if (node.tagName === "SCRIPT" && node.src && node.src.search(/.*main\..*\.chunk.js/) === 0) {
                    obs.disconnect();
                    await injectedScriptNode(node);
                    idx = 0;
                    break;
                }
            }
        }
    }).observe(document, { childList: true, subtree: true });

    info("initialized");
})();