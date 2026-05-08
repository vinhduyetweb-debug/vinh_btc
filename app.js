const btnSignal = document.getElementById("btnSignal");
const tokenInput = document.getElementById("token");

btnSignal.addEventListener("click", getSignal);

tokenInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    getSignal();
  }
});

tokenInput.addEventListener("change", getSignal);

async function getFearGreed() {
  const res = await fetch("https://api.alternative.me/fng/?limit=1");
  if (!res.ok) throw new Error("Khong lay duoc Fear & Greed");
  const data = await res.json();
  return data.data[0];
}

async function getPrice(symbol) {
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
  if (!res.ok) throw new Error("Token khong hop le hoac Binance spot khong ho tro");
  return await res.json();
}

async function getFunding(symbol) {
  const res = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}USDT&limit=1`);
  if (!res.ok) throw new Error("Token khong co funding futures tren Binance");
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Khong tim thay funding rate cho token nay");
  }

  return data;
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

  let phase = "TRUNG LAP";
  let action = "HOLD";

  if (buyScore >= 60) {
    phase = "SO HAI / CANH MUA";
    action = "BUY";
  }

  if (sellScore >= 60) {
    phase = "EUPHORIA / QUA NONG";
    action = "TAKE PROFIT";
  }

  return { buyScore, sellScore, phase, action };
}

function setActionColor(action) {
  const actionEl = document.getElementById("action");

  if (action === "BUY") {
    actionEl.style.color = "#22c55e";
  } else if (action === "TAKE PROFIT") {
    actionEl.style.color = "#ef4444";
  } else {
    actionEl.style.color = "#facc15";
  }
}

async function getSignal() {
  const loading = document.getElementById("loading");
  const dashboard = document.getElementById("dashboard");
  const errorBox = document.getElementById("errorBox");

  loading.classList.remove("hidden");
  errorBox.classList.add("hidden");

  try {
    const symbol = tokenInput.value.trim().toUpperCase();

    if (!symbol) {
      throw new Error("Vui long nhap token. Vi du: BTC, ETH, SOL");
    }

    const [fearData, priceData, fundingData] = await Promise.all([
      getFearGreed(),
      getPrice(symbol),
      getFunding(symbol)
    ]);

    const fear = parseInt(fearData.value);
    const fundingRate = parseFloat(fundingData[0].fundingRate);
    const signal = calculateSignal(fear, fundingRate);

    document.getElementById("symbol").innerText = symbol;
    document.getElementById("price").innerText =
      "$" + Number(priceData.price).toLocaleString("en-US", {
        maximumFractionDigits: 4
      });

    document.getElementById("fear").innerText =
      `${fear}/100 (${fearData.value_classification})`;

    document.getElementById("funding").innerText =
      (fundingRate * 100).toFixed(4) + "%";

    document.getElementById("buyScore").innerText = signal.buyScore;
    document.getElementById("sellScore").innerText = signal.sellScore;
    document.getElementById("phase").innerText = signal.phase;
    document.getElementById("action").innerText = signal.action;
    setActionColor(signal.action);

    document.getElementById("lastUpdate").innerText =
      new Date().toLocaleString();

    dashboard.classList.remove("hidden");
  } catch (err) {
    errorBox.innerText = err.message;
    errorBox.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
}

setInterval(() => {
  const token = tokenInput.value.trim();
  if (token !== "") {
    getSignal();
  }
}, 30000);

getSignal();
