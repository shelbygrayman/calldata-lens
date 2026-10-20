/* Calldata Lens — static ABI decoder. No RPC, wallet or external dependencies. */
(function (root) {
  'use strict';
  const MAX = (1n << 256n) - 1n;
  const methods = {
    '095ea7b3': { signature: 'approve(address,uint256)', names: ['Spender / approved address', 'Amount / token ID'], types: ['address', 'uint'] },
    'a9059cbb': { signature: 'transfer(address,uint256)', names: ['Recipient', 'Amount'], types: ['address', 'uint'] },
    '23b872dd': { signature: 'transferFrom(address,address,uint256)', names: ['From', 'Recipient', 'Amount / token ID'], types: ['address', 'address', 'uint'] },
    'a22cb465': { signature: 'setApprovalForAll(address,bool)', names: ['Operator', 'Approved'], types: ['address', 'bool'] },
    '42842e0e': { signature: 'safeTransferFrom(address,address,uint256)', names: ['From', 'Recipient', 'Token ID'], types: ['address', 'address', 'uint'] },
    'b88d4fde': { signature: 'safeTransferFrom(address,address,uint256,bytes)', names: ['From', 'Recipient', 'Token ID', 'Receiver data'], types: ['address', 'address', 'uint', 'bytes'] }
  };
  function formatUnits(value, decimals) {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('Decimals must be a whole number from 0 to 255.');
    const n = BigInt(value);
    if (n < 0n || n > MAX) throw new Error('Amount is outside uint256.');
    if (!decimals) return n.toString();
    const digits = n.toString().padStart(decimals + 1, '0');
    const fraction = digits.slice(-decimals).replace(/0+$/, '');
    return digits.slice(0, -decimals) + (fraction ? '.' + fraction : '');
  }
  function decode(input) {
    if (typeof input !== 'string') throw new Error('Paste calldata as hexadecimal text.');
    const data = input.trim();
    if (data.length > 65538) throw new Error('Input is too large. Limit: 32 KiB.');
    if (!/^0x[0-9a-f]*$/i.test(data)) throw new Error('Use 0x-prefixed hexadecimal calldata. Spaces inside the data are not allowed.');
    if ((data.length - 2) % 2) throw new Error('Hexadecimal data must contain complete bytes (an even number of digits).');
    if (data.length === 2) return { kind: 'empty', bytes: 0, fields: [], warnings: ['Empty calldata does not reveal the transaction value or destination. A contract can still execute its receive or fallback function.'] };
    if (data.length < 10) throw new Error('Calldata is shorter than a four-byte function selector.');
    const selector = data.slice(2, 10).toLowerCase();
    const method = methods[selector];
    const bytes = (data.length - 2) / 2;
    if (!method) return { kind: 'unknown', selector: '0x' + selector, bytes, fields: [], warnings: ['This selector is outside the supported set. No meaning or safety conclusion can be inferred here.'] };
    const expected = 10 + method.types.length * 64;
    const hasBytes = method.types.includes('bytes');
    let payload = null;
    if (hasBytes) {
      if (data.length < expected + 64) throw new Error('Dynamic data is truncated: the argument head and byte-length word are required.');
      const offset = BigInt('0x' + data.slice(expected - 64, expected));
      if (offset !== 128n) throw new Error('Noncanonical dynamic offset: this method requires receiver data immediately after its four-word head (128 bytes).');
      const length = BigInt('0x' + data.slice(expected, expected + 64));
      // Compare as BigInt before conversion; the input limit bounds later slicing.
      const padded = ((length + 31n) / 32n) * 32n;
      if (BigInt(data.length) !== BigInt(expected + 64) + padded * 2n) throw new Error('Dynamic data length does not match the payload. Truncated or trailing bytes are not decoded.');
      const end = expected + 64 + Number(length) * 2;
      if (!/^0*$/.test(data.slice(end))) throw new Error('Dynamic bytes must have zero right-padding.');
      payload = '0x' + data.slice(expected + 64, end).toLowerCase();
    } else if (data.length !== expected) throw new Error(`This signature expects exactly ${method.types.length} ABI words (${(expected - 2) / 2} bytes). Received ${bytes} bytes. Truncated or extra data is not decoded.`);
    const fields = method.types.map((type, i) => {
      const word = data.slice(10 + i * 64, 74 + i * 64).toLowerCase();
      let value;
      if (type === 'address') {
        if (!/^0{24}/.test(word)) throw new Error(`Argument ${i + 1} has nonzero address padding.`);
        value = '0x' + word.slice(24);
      } else if (type === 'bool') {
        if (BigInt('0x' + word) > 1n) throw new Error('Boolean argument must be exactly 0 or 1.');
        value = BigInt('0x' + word) === 1n ? 'true' : 'false';
      } else if (type === 'bytes') value = payload;
      else value = BigInt('0x' + word).toString();
      return { name: method.names[i], type, value, word, index: i };
    });
    const warnings = ['Selector match only: different functions can share a selector. Contract code, chain, destination and transaction value have not been verified.'];
    const ambiguous = selector === '095ea7b3' || selector === '23b872dd';
    if (ambiguous) warnings.push('ERC-20 and ERC-721 share this signature. The number may be a fungible-token amount or a unique NFT token ID. Choose the interpretation only if you know the contract.');
    if (hasBytes) warnings.push('Receiver data is shown as raw bytes. Its meaning depends on the receiving contract; it has not been interpreted or simulated.');
    const zero = fields.filter(f => f.type === 'address' && /^0x0{40}$/.test(f.value));
    if (zero.length) warnings.push('A zero address appears in this call. Depending on the method and contract, this can clear an approval, burn assets, or revert.');
    let headline, detail, attention = false;
    if (selector === '095ea7b3') {
      const amount = BigInt(fields[1].value);
      attention = amount === MAX;
      headline = amount === 0n ? 'An approval call with a zero value' : attention ? 'Maximum uint256 approval value' : 'A request to grant an approval';
      detail = 'For ERC-20, this sets the spender’s allowance. For ERC-721, it approves an address for one token ID. This is a requested action, not evidence of an existing approval.';
      if (amount === 0n) warnings.push('Zero clears an ERC-20 allowance, but for ERC-721 the number can identify NFT token ID 0. Do not assume revocation without knowing the standard.');
      if (attention) warnings.push('Under ERC-20 semantics this is commonly an unlimited allowance. It may cover future tokens received by the wallet, not just its current balance.');
    } else if (selector === 'a22cb465') {
      attention = fields[1].value === 'true';
      headline = attention ? 'Collection-wide operator permission' : 'Remove an operator’s permission';
      detail = attention ? 'For standard ERC-721 / ERC-1155 contracts, this permits the operator to manage all of the caller’s tokens in this collection, including future holdings.' : 'For standard ERC-721 / ERC-1155 contracts, this requests removal of collection-wide permission for this operator.';
    } else {
      headline = selector === 'a9059cbb' ? 'A request to transfer tokens' : 'A request to transfer from an address';
      detail = selector === 'a9059cbb' ? 'For standard ERC-20 contracts, the caller sends the specified amount to the recipient.' : 'The call specifies a source address, recipient and amount or token ID. Permission checks and success depend on the contract and current chain state.';
    }
    return { kind: 'known', selector: '0x' + selector, signature: method.signature, bytes, fields, warnings, headline, detail, attention, ambiguous };
  }
  const word = n => BigInt(n).toString(16).padStart(64, '0');
  const address = c => c.repeat(40).padStart(64, '0');
  const examples = {
    allowance: '0x095ea7b3' + address('1') + word(MAX),
    transfer: '0xa9059cbb' + address('2') + word(125500000),
    revoke: '0xa22cb465' + address('3') + word(0),
    operator: '0xa22cb465' + address('3') + word(1),
    nft: '0x42842e0e' + address('1') + address('2') + word(42),
    nftData: '0xb88d4fde' + address('1') + address('2') + word(42) + word(128) + word(4) + '12345678'.padEnd(64, '0')
  };
  const api = { decode, formatUnits, examples, MAX: MAX.toString() };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CalldataLens = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
