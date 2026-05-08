const els = {
  refreshBtn: document.getElementById("refreshBtn"),
  saveBtn: document.getElementById("saveBtn"),
  loading: document.getElementById("loading"),
  errorBox: document.getElementById("errorBox"),
  totalBtc: document.getElementById("totalBtc"),
  coldBtc: document.getElementById("coldBtc"),
  generatedBtc: document.getElementById("generatedBtc"),
  botCapital: document.getElementById("botCapital"),
  gridProfit: document.getElementById("gridProfit"),
  feesPaid: document.getElementById("feesPaid")
};

const SCARCITY_ASSETS = [
  { symbol: "BTC", name: "Bitcoin", supply: "21M fixed supply", burn: "Không cần burn", inflation: "Giảm sau mỗi halving", score: 98, role: "Core Reserve Asset" },
  { symbol: "LTC", name: "Litecoin", supply: "84M capped supply", burn: "Không", inflation: "Giảm theo halving", score: 78, role: "Scarcity Micro Grid" },
  { symbol: "OKB", name: "OKB", supply: "Có cơ chế burn", burn: "Có", inflation: "Giảm cung theo burn", score: 82, role: "Exchange-backed scarce asset" },
  { symbol: "BNB", name: "BNB", supply: "Có auto-burn", burn: "Có", inflation: "Thiên về giảm phát", score: 84, role: "Large-cap scarcity yield asset" },
  { symbol: "ETH", name: "Ethereum", supply: "Không fixed supply", burn: "EIP-1559 burn", inflation: "Có thể thấp/âm tùy mạng", score: 76, role: "Smart contract reserve" }
];

els.refreshBtn.addEventListener("click", updateDashboard);
els.saveBtn.addEventListener("click", saveSettings);

["totalBtc", "coldBtc", "generatedBtc", "botCapital", "gridProfit", "feesPaid"].forEach(id => {
  els[id].addEventListener("input", updateLocalOnly);
});

function num(id) {
  return Number(els[id].value || 0);
}

function usd(value) {
  if (!isFinite(value)) return "--";
  return "$" + Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

function btc(value) {
  if (!isFinite(value)) return "--";
  return Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 8 }) + " BTC";
}

function pct(value) {
  if (!isFinite(value)) return "--";
  return Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + "%";
}

function sats(value) {
  if (!isFinite(value)) return "--";
  return Math.round(value * 100000000).toLocaleString("vi-VN") + " sats";
}

async function getBtcMarket() {
  const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&sparkline=false";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Không lấy được dữ liệu BTC từ CoinGecko.");
  const data = await res.json();
  if (!data[0]) throw new Error("CoinGecko không trả về dữ liệu BTC.");
  return data[0];
}

async function getFearGreed() {
  const res = await fetch("https://api.alternative.me/fng/?limit=1");
  if (!res.ok) throw new Error("Không lấy được Fear & Greed.");
  const data = await res.json();
  return data.data[0];
}

async function getBtcFunding() {
  try {
    const res = await fetch("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1");
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data[0] ? Number(data[0].fundingRate) : null;
  } catch {
    return null;
  }
}

function classifyRegime(fear, funding) {
  if (fear <= 25) {
    return {
      name: "ACCUMULATION",
      note: "Thị trường sợ hãi. Ưu tiên tích lũy BTC, không cần đoán đáy."
    };
  }

  if (fear >= 75 || (funding !== null && funding >= 0.0005)) {
    return {
      name: "DEFENSE",
      note: "Thị trường nóng. Giảm rủi ro tồn kho, ưu tiên chốt lời từng phần sang BTC."
    };
  }

  return {
    name: "HARVEST",
    note: "Thị trường trung lập. Phù hợp vận hành grid có kiểm soát phí."
  };
}

function calculateScores(fear, funding) {
  const gross = num("gridProfit");
  const fees = num("feesPaid");
  const cold = num("coldBtc");
  const total = num("totalBtc");

  const feeEfficiency = gross > 0 ? Math.max(0, ((gross - fees) / gross) * 100) : 0;
  const coldRatio = total > 0 ? (cold / total) * 100 : 0;

  let harvestScore = 50;
  if (feeEfficiency >= 85) harvestScore += 25;
  if (feeEfficiency < 70) harvestScore -= 20;
  if (funding !== null && funding >= 0.0005) harvestScore -= 10;
  if (fear >= 75) harvestScore -= 10;
  harvestScore = Math.max(0, Math.min(100, harvestScore));

  let survivalScore = 50;
  if (coldRatio >= 50) survivalScore += 25;
  if (coldRatio >= 75) survivalScore += 10;
  if (fees > gross * 0.25) survivalScore -= 20;
  if (fear >= 85) survivalScore -= 10;
  survivalScore = Math.max(0, Math.min(100, survivalScore));

  return { feeEfficiency, coldRatio, harvestScore, survivalScore };
}

function updateBotAdvice(regime, feeEfficiency) {
  if (regime.name === "ACCUMULATION") {
    document.getElementById("bot1Mode").innerText = "Accumulation Mode";
    document.getElementById("bot1Advice").innerText = "Cho phép bot tích lũy BTC nhiều hơn, không hoảng khi bị kẹt BTC.";
    document.getElementById("bot2Mode").innerText = "Cautious Harvest";
    document.getElementById("bot2Advice").innerText = "Giữ grid rộng hơn để tránh overtrading trong biến động mạnh.";
    document.getElementById("bot3Mode").innerText = "Selective Micro Grid";
    document.getElementById("bot3Advice").innerText = "Chỉ dùng LTC/OKB/BNB nếu spread đủ bù phí.";
    return;
  }

  if (regime.name === "DEFENSE") {
    document.getElementById("bot1Mode").innerText = "Defense Mode";
    document.getElementById("bot1Advice").innerText = "Không mở rộng vốn quá mạnh. Ưu tiên rút BTC lợi nhuận về ví lạnh.";
    document.getElementById("bot2Mode").innerText = "Reduce Inventory Risk";
    document.getElementById("bot2Advice").innerText = "Nới grid, giảm tồn kho, tránh mua đuổi ở vùng hưng phấn.";
    document.getElementById("bot3Mode").innerText = "Low Exposure";
    document.getElementById("bot3Advice").innerText = "Giảm vốn micro grid nếu phí cao hoặc thị trường quá FOMO.";
    return;
  }

  document.getElementById("bot1Mode").innerText = "Steady Accumulation";
  document.getElementById("bot1Advice").innerText = "Duy trì bot tích lũy ổn định.";
  document.getElementById("bot2Mode").innerText = feeEfficiency >= 80 ? "Optimal Harvest" : "Fee Review Needed";
  document.getElementById("bot2Advice").innerText = feeEfficiency >= 80 ? "Grid đang hiệu quả sau phí." : "Cần nới grid spacing hoặc giảm số lệnh.";
  document.getElementById("bot3Mode").innerText = "Cashflow Mode";
  document.getElementById("bot3Advice").innerText = "Tập trung tài sản khan hiếm, tránh meme/low-cap inflationary.";
}

function renderScarcityTable() {
  const rows = SCARCITY_ASSETS.map(a => `
    <tr>
      <td><strong>${a.symbol}</strong><br><span>${a.name}</span></td>
      <td>${a.supply}</td>
      <td>${a.burn}</td>
      <td>${a.inflation}</td>
      <td><strong>${a.score}/100</strong></td>
      <td>${a.role}</td>
    </tr>
  `).join("");

  document.getElementById("scarcityTable").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Tài sản</th>
          <th>Nguồn cung</th>
          <th>Burn</th>
          <th>Lạm phát</th>
          <th>Scarcity Score</th>
          <th>Vai trò</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderRiskNotes(regime, scores, funding) {
  const notes = [];

  if (scores.coldRatio < 50) notes.push("Tỷ lệ BTC trong ví lạnh dưới 50%. Nên tăng kỷ luật rút BTC khỏi sàn khi có lợi nhuận.");
  if (scores.feeEfficiency < 75) notes.push("Fee Efficiency thấp. Có dấu hiệu grid quá dày hoặc trade chất lượng chưa đủ cao.");
  if (funding !== null && funding >= 0.0005) notes.push("Funding Rate nóng. Hạn chế tăng vốn bot, tránh bị cuốn vào FOMO.");
  if (regime.name === "ACCUMULATION") notes.push("Regime đang nghiêng về tích lũy. Tư duy 'kẹt BTC = DCA' phù hợp, miễn là không dùng leverage.");
  if (regime.name === "DEFENSE") notes.push("Regime phòng thủ. Ưu tiên bảo toàn BTC, giảm rủi ro tồn kho và chuyển lợi nhuận về BTC.");
  if (notes.length === 0) notes.push("Hệ thống đang cân bằng. Tiếp tục ưu tiên BTC accumulation, fee efficiency và survival.");

  document.getElementById("riskNotes").innerHTML = notes.map(n => `<li>${n}</li>`).join("");
}

function updateLocalOnly() {
  const total = num("totalBtc");
  const cold = num("coldBtc");
  const generated = num("generatedBtc");
  const gross = num("gridProfit");
  const fees = num("feesPaid");

  document.getElementById("btcHoldings").innerText = btc(total);
  document.getElementById("satsGenerated").innerText = sats(generated);

  const coldRatio = total > 0 ? (cold / total) * 100 : 0;
  document.getElementById("coldRatio").innerText = pct(coldRatio);

  const feeEfficiency = gross > 0 ? Math.max(0, ((gross - fees) / gross) * 100) : 0;
  document.getElementById("feeEfficiency").innerText = pct(feeEfficiency);
}

async function updateDashboard() {
  els.loading.classList.remove("hidden");
  els.errorBox.classList.add("hidden");

  try {
    const [btcMarket, fg, funding] = await Promise.all([
      getBtcMarket(),
      getFearGreed(),
      getBtcFunding()
    ]);

    const fear = Number(fg.value);
    const regime = classifyRegime(fear, funding);
    const scores = calculateScores(fear, funding);

    document.getElementById("btcHoldings").innerText = btc(num("totalBtc"));
    document.getElementById("btcValue").innerText = usd(num("totalBtc") * btcMarket.current_price);
    document.getElementById("satsGenerated").innerText = sats(num("generatedBtc"));
    document.getElementById("coldRatio").innerText = pct(scores.coldRatio);
    document.getElementById("btcPrice").innerText = usd(btcMarket.current_price);
    document.getElementById("btcAth").innerText = "ATH: " + usd(btcMarket.ath) + " | Cách ATH: " + pct(btcMarket.ath_change_percentage);
    document.getElementById("marketRegime").innerText = regime.name;
    document.getElementById("regimeNote").innerText = regime.note;
    document.getElementById("fearGreed").innerText = `${fear}/100 (${fg.value_classification})`;
    document.getElementById("funding").innerText = funding === null ? "Không có dữ liệu" : (funding * 100).toFixed(4) + "%";
    document.getElementById("feeEfficiency").innerText = pct(scores.feeEfficiency);
    document.getElementById("harvestScore").innerText = Math.round(scores.harvestScore) + "/100";
    document.getElementById("survivalScore").innerText = Math.round(scores.survivalScore) + "/100";
    document.getElementById("lastUpdate").innerText = new Date().toLocaleString("vi-VN");

    updateBotAdvice(regime, scores.feeEfficiency);
    renderScarcityTable();
    renderRiskNotes(regime, scores, funding);
  } catch (err) {
    els.errorBox.innerText = err.message;
    els.errorBox.classList.remove("hidden");
  } finally {
    els.loading.classList.add("hidden");
  }
}

function saveSettings() {
  const settings = {
    totalBtc: els.totalBtc.value,
    coldBtc: els.coldBtc.value,
    generatedBtc: els.generatedBtc.value,
    botCapital: els.botCapital.value,
    gridProfit: els.gridProfit.value,
    feesPaid: els.feesPaid.value
  };

  localStorage.setItem("btcTreasurySettings", JSON.stringify(settings));
  updateDashboard();
}

function loadSettings() {
  const raw = localStorage.getItem("btcTreasurySettings");
  if (!raw) return;

  try {
    const settings = JSON.parse(raw);
    Object.keys(settings).forEach(key => {
      if (els[key]) els[key].value = settings[key];
    });
  } catch {}
}

setInterval(updateDashboard, 30000);

loadSettings();
renderScarcityTable();
updateDashboard();
