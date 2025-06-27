const fs = require('fs').promises;
const path = require('path');

async function updateYesterdayMarketData(retryCount = 0) {
    console.info(retryCount? `retry to load market data ${retryCount}`: "loading market data");

    const marketData = await fetch("https://www.milkywayidle.com/game_data/marketplace.json");
    if (!marketData.ok) {
        console.error("failed to load market data");
        if (retryCount <= 3) {
            marketDataRetryTimeoutId = setTimeout(updateYesterdayMarketData, 3000, ++retryCount);
        }
        else {
            console.error("failed to load market data 3 times, give up");
        }
        return;
    }

    console.info("market data loaded");
    
    try {
        const filePath = path.join("./", "marketplace_yesterday.json");
        await fs.writeFile(filePath, await marketData.text(), "utf8");
        console.info("market data saved to file");
    } catch (error) {
        console.error("failed to save market data to file:", error);
    }
}

updateYesterdayMarketData();