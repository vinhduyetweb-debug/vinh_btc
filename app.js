const tokenInput = document.getElementById("token");
const btnSignal = document.getElementById("btnSignal");

const POPULAR_COINS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  TON: "the-open-network",
  TRX: "tron",
  DOT: "polkadot",
  MATIC: "matic-network",
  POL: "polygon-ecosystem-token",
  SHIB: "shiba-in Inu".replace(" ", ""),
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  UNI: "uniswap",
  APT: "aptos",
  NEAR: "near",
  ATOM: "cosmos",
  FIL: "filecoin",
  INJ: "injective-protocol",
  OP: "optimism",
  ARB: "arbitrum",
  SUI: "sui",
  PEPE: "pepe",
  WIF: "dogwifcoin",
  ETC: "ethereum-classic",
  XLM: "stellar",
  HBAR: "hedera-hashgraph",
  ICP: "internet-computer",
  VET: "vechain",
  FET: "fetch-ai",
  RENDER: "render-token",
  AAVE: "aave",
  MKR: "maker",
  LDO: "lido-dao",
  TIA: "celestia",
  SEI: "sei-network",
  GRT: "the-graph",
  ALGO: "algorand",
  EGLD: "elrond-erd-2",
  RUNE: "thorchain",
  JUP: "jupiter-exchange-solana",
  WLD: "worldcoin-wld"
};

const QUICK_SYMBOLS = [
  "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "TON",
  "TRX", "DOT", "SUI", "NEAR", "PEPE", "WIF", "AAVE", "ARB", "OP", "INJ"
];

btnSignal.addEventListener("click", getSignal);

tokenInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    getSignal();
  }
});

tokenInput.addEventListener("change", getSignal);

function buildQuickList() {
  const box = document.getElementById("quickList");
  box.innerHTML = "";

  QUICK_SYMBOLS.forEach(symbol => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerText = symbol;
    button.addEventListener("click", () => {
      tokenInput.value = symbol;
      getSignal();
    });
    box.appendChild(button);
  });
}

function normalizeSymbol(input) {
  return input.trim().toUpperCase().replace(/USDT$/i, "");
}

async function resolveCoinId(symbol) {
  if (POPULAR_COINS[symbol]) {
    return POPULAR_COINS[symbol];
  }

  const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    throw new Error("Không tìm thấy token trên CoinGecko.");
  }

  const data = await res.json();
  const exact = data.coins.find(c => c.symbol.toUpperCase() === symbol);
  const first = exact || data.coins[0];

  if (!first) {
    throw new Error("Không tìm thấy token. Hãy thử mã phổ biến như BTC, ETH, SOL.");
  }

  return first.id;
}

async function getCoinMarket(coinId) {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", coinId);
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", "1");
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("Không lấy được dữ liệu giá từ CoinGecko.");
  }

  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("CoinGecko chưa có dữ liệu cho token này.");
  }

  return data[0];
}

async function getFearGreed() {
  const res = await fetch("https://api.alternative.me/fng/?limit=1");
  if (!res.ok) {
    throw new Error("Không lấy được chỉ số Fear & Greed.");
  }

  const data = await res.json();
  return data.data[0];
}

async function getFunding(symbol) {
  try {
    const res = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}USDT&limit=1`);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    return parseFloat(data[0].fundingRate);
  } catch {
    return null;
  }
}

function formatUsd(value) {
  if (value === null || value === undefined || isNaN(value)) return "--";

  return "$" + Number(value).toLocaleString("vi-VN", {
    maximumFractionDigits: value < 1 ? 8 : 2
  });
}

function formatDate(dateText) {
  if (!dateText) return "--";

  const date = new Date(dateText);

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return "--";

  return Number(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 2
  }) + "%";
}

function calculateSignal(fear, fundingRate, athChangePercentage) {
  let buyScore = 0;
  let sellScore = 0;
  const buyReasons = [];
  const sellReasons = [];

  if (fear <= 25) {
    buyScore += 40;
    buyReasons.push("Fear & Greed thấp: thị trường đang sợ hãi.");
  } else if (fear >= 75) {
    sellScore += 40;
    sellReasons.push("Fear & Greed cao: thị trường đang tham lam.");
  }

  if (fundingRate === null) {
    buyReasons.push("Không có dữ liệu Funding Rate cho token này.");
    sellReasons.push("Không có dữ liệu Funding Rate cho token này.");
  } else {
    if (fundingRate <= 0) {
      buyScore += 30;
      buyReasons.push("Funding Rate thấp hoặc âm: áp lực Long không quá nóng.");
    }

    if (fundingRate >= 0.0005) {
      sellScore += 30;
      sellReasons.push("Funding Rate nóng: nhiều vị thế Long dùng đòn bẩy.");
    }
  }

  if (fear <= 20) {
    buyScore += 20;
    buyReasons.push("Retail có dấu hiệu bỏ cuộc.");
  }

  if (fear >= 85) {
    sellScore += 20;
    sellReasons.push("Retail có dấu hiệu FOMO cực độ.");
  }

  if (athChangePercentage > -10) {
    sellScore += 15;
    sellReasons.push("Giá đang gần đỉnh lịch sử ATH, cần quản trị rủi ro.");
  }

  let phase = "Trung lập";
  let action = "Theo dõi / Giữ vị thế";

  if (buyScore >= 60 && buyScore > sellScore) {
    phase = "Sợ hãi / Vùng canh mua";
    action = "Canh mua";
  }

  if (sellScore >= 60 && sellScore >= buyScore) {
    phase = "Hưng phấn / Quá nóng";
    action = "Chốt lời từng phần";
  }

  return { buyScore, sellScore, phase, action, buyReasons, sellReasons };
}

function renderReasons(elementId, reasons) {
  const list = document.getElementById(elementId);
  list.innerHTML = "";

  if (!reasons.length) {
    const li = document.createElement("li");
    li.innerText = "Chưa có tín hiệu mạnh.";
    list.appendChild(li);
    return;
  }

  reasons.forEach(reason => {
    const li = document.createElement("li");
    li.innerText = reason;
    list.appendChild(li);
  });
}

function setActionColor(action) {
  const actionEl = document.getElementById("action");

  if (action.includes("mua")) {
    actionEl.style.color = "#22c55e";
  } else if (action.includes("Chốt")) {
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
    const symbol = normalizeSymbol(tokenInput.value);

    if (!symbol) {
      throw new Error("Vui lòng nhập token. Ví dụ: BTC, ETH, SOL.");
    }

    const coinId = await resolveCoinId(symbol);

    const [market, fearData, fundingRate] = await Promise.all([
      getCoinMarket(coinId),
      getFearGreed(),
      getFunding(symbol)
    ]);

    const fear = parseInt(fearData.value);
    const signal = calculateSignal(fear, fundingRate, market.ath_change_percentage);

    document.getElementById("symbol").innerText = market.symbol.toUpperCase();
    document.getElementById("coinName").innerText = market.name;
    document.getElementById("price").innerText = formatUsd(market.current_price);
    document.getElementById("marketCap").innerText = formatUsd(market.market_cap);
    document.getElementById("rank").innerText = market.market_cap_rank ? "#" + market.market_cap_rank : "--";

    document.getElementById("ath").innerText = formatUsd(market.ath);
    document.getElementById("athDate").innerText = "Thời gian ATH: " + formatDate(market.ath_date);
    document.getElementById("athChange").innerText = formatPercent(market.ath_change_percentage);

    document.getElementById("atl").innerText = formatUsd(market.atl);
    document.getElementById("atlDate").innerText = "Thời gian ATL: " + formatDate(market.atl_date);
    document.getElementById("atlChange").innerText = formatPercent(market.atl_change_percentage);

    document.getElementById("fear").innerText = `${fear}/100 (${fearData.value_classification})`;

    if (fundingRate === null) {
      document.getElementById("funding").innerText = "Không có dữ liệu";
      document.getElementById("fundingNote").innerText = "Token này có thể chưa được Binance Futures hỗ trợ.";
    } else {
      document.getElementById("funding").innerText = (fundingRate * 100).toFixed(4) + "%";
      document.getElementById("fundingNote").innerText = "Funding Rate từ Binance Futures.";
    }

    document.getElementById("buyScore").innerText = signal.buyScore;
    document.getElementById("sellScore").innerText = signal.sellScore;
    document.getElementById("phase").innerText = signal.phase;
    document.getElementById("action").innerText = signal.action;
    setActionColor(signal.action);

    renderReasons("buyReasons", signal.buyReasons);
    renderReasons("sellReasons", signal.sellReasons);

    document.getElementById("lastUpdate").innerText = new Date().toLocaleString("vi-VN");

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

buildQuickList();
getSignal();
