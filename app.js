
async function getFearGreed() {
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    const data = await res.json();
    return data.data[0];
}

async function getPrice(symbol) {
    const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
    );
    return await res.json();
}

async function getFunding(symbol) {
    const res = await fetch(
        `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}USDT&limit=1`
    );

    return await res.json();
}

function calculateSignal(fear, fundingRate) {
    let buyScore = 0;
    let sellScore = 0;

    if (fear <= 25) buyScore += 40;
    if (fear >= 75) sellScore += 40;

    if (fundingRate <= 0) buyScore += 30;
    if (fundingRate >= 0.0005) sellScore += 30;

    if (fear <= 20) buyScore += 20;
    if (fear >= 85) sellScore += 20;

    let phase = "TRUNG Láº¬P";
    let action = "HOLD";

    if (buyScore >= 60) {
        phase = "Sá»¢ HÃƒI / CANH MUA";
        action = "BUY";
    }

    if (sellScore >= 60) {
        phase = "EUPHORIA / QUÃ NÃ“NG";
        action = "TAKE PROFIT";
    }

    return { buyScore, sellScore, phase, action };
}

async function getSignal() {
    const loading = document.getElementById("loading");
    const dashboard = document.getElementById("dashboard");

    loading.classList.remove("hidden");
    dashboard.classList.add("hidden");

    try {
        const symbol = document.getElementById("token").value.toUpperCase();

        const fearData = await getFearGreed();
        const priceData = await getPrice(symbol);
        const fundingData = await getFunding(symbol);

        const fear = parseInt(fearData.value);
        const fundingRate = parseFloat(fundingData[0].fundingRate);

        const signal = calculateSignal(fear, fundingRate);

        document.getElementById("symbol").innerText = symbol;
        document.getElementById("price").innerText =
            "$" + parseFloat(priceData.price).toLocaleString();

        document.getElementById("fear").innerText =
            `${fear}/100 (${fearData.value_classification})`;

        document.getElementById("funding").innerText =
            (fundingRate * 100).toFixed(4) + "%";

        document.getElementById("buyScore").innerText = signal.buyScore;
        document.getElementById("sellScore").innerText = signal.sellScore;

        document.getElementById("phase").innerText = signal.phase;

        const actionEl = document.getElementById("action");
        actionEl.innerText = signal.action;

        if (signal.action === "BUY") {
            actionEl.style.color = "#22c55e";
        } else if (signal.action === "TAKE PROFIT") {
            actionEl.style.color = "#ef4444";
        } else {
            actionEl.style.color = "#facc15";
        }

        document.getElementById("lastUpdate").innerText =
            new Date().toLocaleTimeString();

        loading.classList.add("hidden");
        dashboard.classList.remove("hidden");

    } catch (err) {
        alert("Lá»—i API hoáº·c token khÃ´ng há»£p lá»‡");
        console.error(err);
    }
}

document.getElementById("token")
    .addEventListener("change", getSignal);

setInterval(() => {
    const token = document.getElementById("token").value.trim();

    if (token !== "") {
        getSignal();
    }
}, 30000);

getSignal();
