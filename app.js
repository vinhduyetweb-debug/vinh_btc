const els = {
  tokenInput: document.getElementById('tokenInput'),
  checkBtn: document.getElementById('checkBtn'),
  result: document.getElementById('result'),
  reasons: document.getElementById('reasons'),
  phase: document.getElementById('phase'),
  action: document.getElementById('action'),
  fearValue: document.getElementById('fearValue'),
  fearText: document.getElementById('fearText'),
  fundingValue: document.getElementById('fundingValue'),
  fundingText: document.getElementById('fundingText'),
  priceValue: document.getElementById('priceValue'),
  symbolText: document.getElementById('symbolText'),
  buyScore: document.getElementById('buyScore'),
  sellScore: document.getElementById('sellScore'),
  buyBar: document.getElementById('buyBar'),
  sellBar: document.getElementById('sellBar'),
  buyReasons: document.getElementById('buyReasons'),
  sellReasons: document.getElementById('sellReasons'),
};

async function getFearGreed() {
  const res = await fetch('https://api.alternative.me/fng/?limit=1');
  const json = await res.json();
  const item = json.data[0];
  return {
    value: Number(item.value),
    classification: item.value_classification,
  };
}

async function getFunding(symbol) {
  const pair = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
  const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${pair}&limit=1`;
  const res = await fetch(url);
  const json = await res.json();
  if (!Array.isArray(json) || json.length === 0) throw new Error(`Không tìm thấy funding cho ${pair}`);
  const fundingRate = Number(json[0].fundingRate);
  return { pair, fundingRate, fundingPercent: fundingRate * 100 };
}

async function getPrice(symbol) {
  const pair = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.price) throw new Error(`Không tìm thấy giá cho ${pair}`);
  return { pair, price: Number(json.price) };
}

function scoreSignal(fear, fundingRate) {
  let buyScore = 0;
  let sellScore = 0;
  const buyReasons = [];
  const sellReasons = [];

  if (fear <= 25) {
    buyScore += 40;
    buyReasons.push('Fear cao: thị trường đang sợ hãi.');
  } else if (fear >= 80) {
    sellScore += 40;
    sellReasons.push('Greed cao: thị trường quá tham lam.');
  } else {
    buyReasons.push('Fear chưa đủ sâu để mua mạnh.');
    sellReasons.push('Greed chưa đủ nóng để bán mạnh.');
  }

  if (fundingRate <= 0) {
    buyScore += 30;
    buyReasons.push('Funding thấp/âm: ít người dùng đòn bẩy long.');
  } else if (fundingRate >= 0.0005) {
    sellScore += 30;
    sellReasons.push('Funding nóng: nhiều vị thế long, dễ bị quét.');
  } else {
    buyReasons.push('Funding trung tính.');
    sellReasons.push('Funding chưa quá nóng.');
  }

  if (fear <= 20) {
    buyScore += 20;
    buyReasons.push('Retail có dấu hiệu bỏ cuộc.');
  } else if (fear >= 85) {
    sellScore += 20;
    sellReasons.push('Retail có dấu hiệu FOMO cực độ.');
  }

  let action = 'HOLD';
  let phase = 'TRUNG LẬP / GIỮ QUAN SÁT';
  let actionClass = 'hold';

  if (sellScore >= 60) {
    action = 'TAKE PROFIT / CHỐT DẦN';
    phase = 'NÓNG / PHÂN PHỐI';
    actionClass = 'sell';
  } else if (buyScore >= 60) {
    action = 'BUY ZONE / CANH MUA';
    phase = 'SỢ HÃI / TÍCH LŨY';
    actionClass = 'buy';
  }

  return { buyScore, sellScore, buyReasons, sellReasons, action, phase, actionClass };
}

function renderList(el, items) {
  el.innerHTML = '';
  items.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    el.appendChild(li);
  });
}

async function checkSignal() {
  const token = els.tokenInput.value.trim().toUpperCase();
  if (!token) return alert('Hãy nhập token, ví dụ BTC');

  els.checkBtn.textContent = 'Đang tải...';
  els.checkBtn.disabled = true;

  try {
    const [fg, funding, price] = await Promise.all([
      getFearGreed(),
      getFunding(token),
      getPrice(token),
    ]);

    const result = scoreSignal(fg.value, funding.fundingRate);

    els.result.classList.remove('hidden');
    els.reasons.classList.remove('hidden');

    els.phase.textContent = result.phase;
    els.action.textContent = result.action;
    els.action.className = `action ${result.actionClass}`;

    els.fearValue.textContent = `${fg.value}/100`;
    els.fearText.textContent = fg.classification;

    els.fundingValue.textContent = `${funding.fundingPercent.toFixed(4)}%`;
    els.fundingText.textContent = funding.pair;

    els.priceValue.textContent = `$${price.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
    els.symbolText.textContent = price.pair;

    els.buyScore.textContent = result.buyScore;
    els.sellScore.textContent = result.sellScore;
    els.buyBar.style.width = `${result.buyScore}%`;
    els.sellBar.style.width = `${result.sellScore}%`;

    renderList(els.buyReasons, result.buyReasons);
    renderList(els.sellReasons, result.sellReasons);
  } catch (err) {
    alert(err.message || 'Có lỗi khi lấy dữ liệu.');
  } finally {
    els.checkBtn.textContent = 'Xem tín hiệu';
    els.checkBtn.disabled = false;
  }
}

els.checkBtn.addEventListener('click', checkSignal);
els.tokenInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') checkSignal();
});

checkSignal();
