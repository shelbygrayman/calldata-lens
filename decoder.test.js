const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decode, formatUnits, examples, MAX } = require('./decoder.js');
const word = n => BigInt(n).toString(16).padStart(64, '0');
const addr = '0'.repeat(24) + '1'.repeat(40);

test('maximum ERC-20 approval is exact and marked ambiguous with ERC-721', () => {
  const d = decode(examples.allowance);
  assert.equal(d.fields[1].value, MAX);
  assert.equal(d.fields[0].value, '0x' + '1'.repeat(40));
  assert.equal(d.attention, true);
  assert.equal(d.ambiguous, true);
});
test('transfer preserves raw amount and formats without floating point', () => {
  const d = decode(examples.transfer);
  assert.equal(d.signature, 'transfer(address,uint256)');
  assert.equal(formatUnits(d.fields[1].value, 6), '125.5');
  assert.equal(formatUnits('1', 18), '0.000000000000000001');
  assert.equal(formatUnits(MAX, 0), MAX);
  assert.equal(formatUnits('0', 18), '0');
});
test('operator grant and removal decode canonical booleans', () => {
  assert.equal(decode(examples.operator).fields[1].value, 'true');
  assert.equal(decode(examples.revoke).fields[1].value, 'false');
  assert.equal(decode(examples.revoke).attention, false);
});
test('NFT transfer and shared transferFrom signature retain integer token IDs', () => {
  assert.equal(decode(examples.nft).fields[2].value, '42');
  const d = decode('0x23b872dd' + addr + addr + word(123));
  assert.equal(d.ambiguous, true);
  assert.equal(d.fields[2].value, '123');
});
test('zero approval is distinguished from nonzero allowance', () => {
  assert.match(decode('0x095ea7b3' + addr + word(0)).headline, /zero/);
});
test('zero address is explicitly flagged', () => {
  const d = decode('0xa9059cbb' + '0'.repeat(64) + word(5));
  assert.ok(d.warnings.some(w => w.includes('zero address')));
});
test('unknown selector and empty calldata do not invent a method', () => {
  assert.equal(decode('0xdeadbeef').kind, 'unknown');
  assert.equal(decode('0x').kind, 'empty');
  assert.equal(decode('0xdeadbeef00').fields.length, 0);
});
test('invalid hex, missing selector and incomplete bytes are rejected', () => {
  for (const value of ['', '095ea7b3', '0xzz', '0x123', '0x12', '0x095e a7b3', '<img>']) {
    assert.throws(() => decode(value));
  }
});
test('truncated and trailing arguments are rejected', () => {
  assert.throws(() => decode(examples.transfer.slice(0, -2)), /expects exactly/);
  assert.throws(() => decode(examples.transfer + '00'), /expects exactly/);
});
test('noncanonical address and boolean encodings are rejected', () => {
  assert.throws(() => decode('0xa9059cbb' + '1'.repeat(64) + word(4)), /padding/);
  assert.throws(() => decode('0xa22cb465' + addr + word(2)), /Boolean/);
});
test('decimals are bounded integers and uint256 values are bounded', () => {
  for (const d of [-1, 256, 1.2, NaN]) assert.throws(() => formatUnits('1', d));
  assert.throws(() => formatUnits('-1', 18));
  assert.throws(() => formatUnits((BigInt(MAX) + 1n).toString(), 18));
  assert.equal(formatUnits('1', 255).length, 257);
});
test('case and surrounding whitespace are accepted; oversized input is rejected', () => {
  assert.equal(decode('  ' + examples.transfer.toUpperCase() + '\n').kind, 'known');
  assert.throws(() => decode('0x' + '00'.repeat(32769)), /too large/);
});
