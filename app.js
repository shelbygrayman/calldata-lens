'use strict';
const $ = id => document.getElementById(id);
let current = null;
function updateCount() {
  const text = $('calldata').value.trim();
  $('byte-count').textContent = /^0x(?:[a-f0-9]{2})*$/i.test(text) ? `${(text.length - 2) / 2} bytes` : 'Hex input';
}
function resetResult() {
  current = null;
  $('result').hidden = true;
  $('empty').hidden = false;
  $('error').hidden = true;
  $('result-tag').textContent = 'READY WHEN YOU ARE';
}
function render() {
  resetResult();
  try {
    const result = CalldataLens.decode($('calldata').value);
    const standard = $('standard').value;
    let formatted = null;
    const amount = result.fields.findLast(f => f.type === 'uint');
    const canFormat = amount && (result.selector === '0xa9059cbb' || result.ambiguous) && standard === 'erc20';
    if (canFormat && $('decimals').value !== '') formatted = CalldataLens.formatUnits(amount.value, Number($('decimals').value));
    current = { ...result, interpretation: standard, decimals: canFormat && $('decimals').value !== '' ? Number($('decimals').value) : null, formattedAmount: formatted };
    $('empty').hidden = true;
    $('result').hidden = false;
    $('result-tag').textContent = result.kind === 'known' ? 'SIGNATURE MATCH' : result.kind === 'empty' ? 'EMPTY DATA' : 'UNKNOWN SELECTOR';
    $('signature').textContent = result.signature || result.selector || '0x';
    $('headline').textContent = result.headline || (result.kind === 'empty' ? 'No function data to decode' : 'Outside this lens');
    $('explanation').textContent = result.detail || 'No supported token action has been identified. This does not mean the transaction is safe or unsafe.';
    $('fields').replaceChildren();
    for (const field of result.fields) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = field.name;
      dd.textContent = field.value;
      $('fields').append(dt, dd);
    }
    $('amount-box').hidden = formatted === null;
    $('formatted').textContent = formatted || '';
    $('amount-note').textContent = `Using ${$('decimals').value} decimals supplied by you. No rounding.`;
    $('warnings').replaceChildren();
    const warnings = [...result.warnings];
    if (standard === 'erc721' && result.selector === '0xa9059cbb') warnings.push('transfer(address,uint256) is an ERC-20 signature; ERC-721 interpretation does not apply to this supported method.');
    if (standard === 'erc20' && (result.selector === '0xa22cb465' || result.selector === '0x42842e0e')) warnings.push('This supported method is an NFT method; the ERC-20 amount interpretation is not applied.');
    current.warnings = warnings;
    for (const warning of warnings) {
      const li = document.createElement('li'); li.textContent = warning; $('warnings').append(li);
    }
    $('words').replaceChildren();
    for (const field of result.fields) {
      const p = document.createElement('p'), code = document.createElement('code');
      p.textContent = `Word ${field.index + 1} · ${field.type}`;
      code.textContent = '0x' + field.word;
      p.append(code); $('words').append(p);
    }
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
    $('result-tag').textContent = 'CHECK INPUT';
  }
}
$('decode-form').addEventListener('submit', event => { event.preventDefault(); render(); });
$('calldata').addEventListener('input', () => { updateCount(); resetResult(); });
$('standard').addEventListener('change', () => { $('decimals').disabled = $('standard').value !== 'erc20'; if (current) render(); });
$('decimals').addEventListener('input', () => { if (current) render(); });
$('clear').addEventListener('click', () => { $('calldata').value = ''; updateCount(); resetResult(); $('calldata').focus(); });
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.example;
  $('calldata').value = CalldataLens.examples[key];
  $('standard').value = ['transfer', 'allowance'].includes(key) ? 'erc20' : 'erc721';
  $('decimals').disabled = $('standard').value !== 'erc20';
  $('decimals').value = key === 'transfer' ? '6' : key === 'allowance' ? '18' : '';
  updateCount(); render();
}));
$('export').addEventListener('click', () => {
  if (!current) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify({ tool: 'Calldata Lens', ...current }, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'calldata-lens-decoded.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
