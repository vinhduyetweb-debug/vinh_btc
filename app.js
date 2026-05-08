const ids = [
  "totalBtc","coldBtc","generatedBtc","totalBotCapital","monthlyDeposit",
  "bot1Pair","bot1Range","bot1Grids","bot1ProfitGrid","bot1Capital","bot1Profit",
  "bot2Pair","bot2Range","bot2Grids","bot2ProfitGrid","bot2Capital","bot2Profit",
  "bot3Pair","bot3Range","bot3Grids","bot3ProfitGrid","bot3Capital","bot3Profit"
];

const el = {};
ids.forEach(id => el[id] = document.getElementById(id));

document.getElementById("refreshBtn").addEventListener("click", updateDashboard);
document.getElementById("saveBtn").addEventListener("click", saveSettings);
ids.forEach(id => el[id].addEventListener("input", updateDashboard));

function n(id){ return Number(el[id].value || 0); }
function usd(v){ return "$" + Number(v || 0).toLocaleString("vi-VN",{maximumFractionDigits:2}); }
function btc(v){ return Number(v || 0).toLocaleString("vi-VN",{maximumFractionDigits:8}) + " BTC"; }
function pct(v){ return Number(v || 0).toLocaleString("vi-VN",{maximumFractionDigits:2}) + "%"; }
function sats(v){ return Math.round((v || 0) * 100000000).toLocaleString("vi-VN") + " sats"; }

async function getBtcMarket(){
  const r = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&sparkline=false");
  if(!r.ok) throw new Error("Không lấy được dữ liệu BTC từ CoinGecko.");
  const d = await r.json();
  return d[0];
}
async function getFearGreed(){
  const r = await fetch("https://api.alternative.me/fng/?limit=1");
  if(!r.ok) throw new Error("Không lấy được Fear & Greed.");
  const d = await r.json();
  return d.data[0];
}
async function getFunding(){
  try{
    const r = await fetch("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1");
    if(!r.ok) return null;
    const d = await r.json();
    return d[0] ? Number(d[0].fundingRate) : null;
  }catch{return null;}
}

function regime(fear, funding){
  if(fear <= 25) return ["ACCUMULATION", "Sợ hãi: ưu tiên tích lũy BTC và giữ kỷ luật DCA."];
  if(fear >= 75 || (funding !== null && funding >= 0.0005)) return ["DEFENSE", "Thị trường nóng: giảm rủi ro tồn kho, ưu tiên rút BTC về ví lạnh."];
  return ["HARVEST", "Trung lập: phù hợp vận hành grid và tối ưu biên lợi nhuận mỗi lưới."];
}

function botData(i){
  return {
    pair: el[`bot${i}Pair`].value,
    range: el[`bot${i}Range`].value,
    grids: n(`bot${i}Grids`),
    profitGrid: n(`bot${i}ProfitGrid`),
    capital: n(`bot${i}Capital`),
    profit: n(`bot${i}Profit`)
  }
}

function evalBot(b){
  const roi = b.capital > 0 ? b.profit / b.capital * 100 : 0;
  let note = "Ổn định";
  if(b.profitGrid < 0.35) note = "Biên/lưới hơi thấp, dễ bị phí ăn mòn";
  if(b.grids > 70) note = "Số lưới dày, cần kiểm tra overtrading";
  if(roi < 0.5) note = "Hiệu suất thấp, cần tối ưu phạm vi hoặc số lưới";
  if(roi >= 2) note = "Hiệu suất tốt, có thể duy trì";
  return {roi, note};
}

function updateBotAnalysis(){
  const bots = [botData(1), botData(2), botData(3)];
  bots.forEach((b, idx)=>{
    const e = evalBot(b);
    document.getElementById(`bot${idx+1}Eval`).innerHTML = `<strong>${pct(e.roi)}</strong><br>${e.note}`;
  });

  const html = bots.map((b, idx)=>{
    const e = evalBot(b);
    return `<div class="compare-card">
      <span>BOT ${idx+1} — ${b.pair}</span>
      <strong>${pct(e.roi)}</strong>
      <small>Profit: ${usd(b.profit)} / Capital: ${usd(b.capital)}</small>
    </div>`
  }).join("");
  document.getElementById("botCompare").innerHTML = html;

  const notes = [];
  bots.forEach((b, idx)=>{
    const e = evalBot(b);
    if(b.profitGrid < 0.35) notes.push(`BOT ${idx+1}: tăng biên lợi nhuận mỗi lưới lên tối thiểu 0,4% - 0,8% để tránh overtrading.`);
    if(b.grids > 70) notes.push(`BOT ${idx+1}: số lượng lưới đang dày. Nên giảm lưới hoặc mở rộng phạm vi giá.`);
    if(e.roi < 0.5) notes.push(`BOT ${idx+1}: ROI tháng thấp. Cần kiểm tra lại phạm vi giá có quá xa giá hiện tại không.`);
    if(e.roi >= 2) notes.push(`BOT ${idx+1}: hiệu suất tốt. Có thể giữ cấu hình, nhưng không tăng vốn quá nhanh.`);
  });
  if(notes.length === 0) notes.push("Các bot đang ở trạng thái cân bằng. Tiếp tục theo dõi ROI, biên lợi nhuận/lưới và mức độ khớp lệnh.");
  document.getElementById("botOptimization").innerHTML = notes.map(x=>`<li>${x}</li>`).join("");
}

function updateDepositPlan(regimeName){
  const amount = n("monthlyDeposit");
  let core=60, active=20, micro=10, cash=10;
  if(regimeName === "ACCUMULATION"){ core=70; active=15; micro=10; cash=5; }
  if(regimeName === "DEFENSE"){ core=50; active=10; micro=5; cash=35; }

  document.getElementById("depositPlan").innerText = usd(amount);
  document.getElementById("allocCore").innerText = usd(amount * core / 100);
  document.getElementById("allocActive").innerText = usd(amount * active / 100);
  document.getElementById("allocMicro").innerText = usd(amount * micro / 100);
  document.getElementById("allocCash").innerText = usd(amount * cash / 100);
  document.getElementById("depositAdvice").innerText = `Phân bổ theo chế độ ${regimeName}: BTC Core ${core}%, Active ${active}%, Micro ${micro}%, Cash ${cash}%.`;
}

function monthlyImprovements(regimeName, coldRatio){
  const bots = [botData(1), botData(2), botData(3)];
  const totalProfit = bots.reduce((s,b)=>s+b.profit,0);
  const notes = [];
  if(coldRatio < 50) notes.push("Tăng tỷ lệ BTC trong ví lạnh lên tối thiểu 50% tổng BTC nắm giữ.");
  if(totalProfit > 0) notes.push(`Chuyển một phần lợi nhuận đã thu ${usd(totalProfit)} sang BTC theo lịch cố định, tránh giữ USDT quá lâu.`);
  if(regimeName === "DEFENSE") notes.push("Thị trường đang nóng: ưu tiên giảm tồn kho bot và không nạp thêm mạnh vào grid rủi ro.");
  if(regimeName === "ACCUMULATION") notes.push("Thị trường đang sợ hãi: có thể ưu tiên 70% khoản nạp tháng cho BTC Core.");
  notes.push("Mỗi tháng chỉ thay đổi một biến: phạm vi giá, số lưới hoặc vốn. Không tối ưu quá nhiều thứ cùng lúc.");
  notes.push("Theo dõi KPI chính: BTC tăng thêm, sats generated, cold wallet ratio, ROI bot theo vốn.");
  document.getElementById("monthlyImprovements").innerHTML = notes.map(x=>`<li>${x}</li>`).join("");
}

function renderScarcity(){
  const assets = [
    ["BTC","21M fixed supply","Core Reserve Asset","98/100"],
    ["LTC","84M capped supply","Scarcity Micro Grid","78/100"],
    ["OKB","Burn mechanism","Exchange-backed scarcity","82/100"],
    ["BNB","Auto-burn","Large-cap scarcity asset","84/100"],
    ["ETH","EIP-1559 burn","Smart contract reserve","76/100"]
  ];
  document.getElementById("scarcityTable").innerHTML = `<table>
    <thead><tr><th>Tài sản</th><th>Nguồn cung</th><th>Vai trò</th><th>Scarcity Score</th></tr></thead>
    <tbody>${assets.map(a=>`<tr><td><strong>${a[0]}</strong></td><td>${a[1]}</td><td>${a[2]}</td><td>${a[3]}</td></tr>`).join("")}</tbody>
  </table>`;
}

async function updateDashboard(){
  const loading = document.getElementById("loading");
  const errorBox = document.getElementById("errorBox");
  loading.classList.remove("hidden");
  errorBox.classList.add("hidden");
  try{
    const [m, fg, fund] = await Promise.all([getBtcMarket(), getFearGreed(), getFunding()]);
    const [regimeName, note] = regime(Number(fg.value), fund);
    const total = n("totalBtc");
    const cold = n("coldBtc");
    const coldRatio = total > 0 ? cold / total * 100 : 0;

    document.getElementById("btcHoldings").innerText = btc(total);
    document.getElementById("btcValue").innerText = usd(total * m.current_price);
    document.getElementById("satsGenerated").innerText = sats(n("generatedBtc"));
    document.getElementById("coldRatio").innerText = pct(coldRatio);
    document.getElementById("marketRegime").innerText = regimeName;
    document.getElementById("regimeNote").innerText = note + ` Fear & Greed: ${fg.value}/100. Funding BTC: ${fund===null?"N/A":(fund*100).toFixed(4)+"%"}.`;

    updateDepositPlan(regimeName);
    updateBotAnalysis();
    monthlyImprovements(regimeName, coldRatio);
    renderScarcity();
    document.getElementById("lastUpdate").innerText = new Date().toLocaleString("vi-VN");
  }catch(e){
    errorBox.innerText = e.message;
    errorBox.classList.remove("hidden");
  }finally{
    loading.classList.add("hidden");
  }
}

function saveSettings(){
  const data = {};
  ids.forEach(id=>data[id]=el[id].value);
  localStorage.setItem("btcTreasuryV6", JSON.stringify(data));
  updateDashboard();
}
function loadSettings(){
  try{
    const data = JSON.parse(localStorage.getItem("btcTreasuryV6") || "{}");
    ids.forEach(id=>{ if(data[id] !== undefined) el[id].value = data[id]; });
  }catch{}
}

loadSettings();
renderScarcity();
updateDashboard();
setInterval(updateDashboard, 30000);
