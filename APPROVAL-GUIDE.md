# Read an approval before signing

[Open Calldata Lens](https://shelbygrayman.github.io/calldata-lens/) and use the built-in examples. No wallet connection or real transaction is needed.

## 1. Recognize a maximum allowance

Choose the maximum approval example. The decoded integer is `2^256 - 1`, the largest unsigned 256-bit value.

For a standard ERC-20 token, `approve(spender, amount)` sets how much that spender may withdraw. A maximum value is commonly treated as an unlimited allowance. It is a permission request, not an immediate token transfer.

Check the spender against the application's official documentation. Calldata Lens displays the address; it does not establish who controls it.

## 2. Distinguish a token amount from an NFT ID

`approve(address,uint256)` is shared by ERC-20 and ERC-721. The same input can describe an allowance or approval for one NFT. The selector alone cannot choose between them.

In particular, `approve(address, 0)` can mean zero ERC-20 allowance **or NFT token ID 0**. For ERC-721, clearing approval for a token uses the zero address as the approved address.

Select a token standard only after verifying the destination contract.

## 3. Recognize collection-wide permission

Compare the operator-permission and revoke examples. Under standard ERC-721 semantics, `setApprovalForAll(operator, true)` enables an operator for all of the owner's NFTs in that contract; `false` disables it.

This is broader than approval for one NFT. It does not apply to unrelated collection contracts.

## 4. Keep units exact

Try the transfer example. Its raw amount is `125500000`. With six decimals, the display amount is `125.5`; with eighteen, it is `0.0000000001255`.

The input does not contain token decimals. Calldata Lens uses the number you provide, so a neatly formatted result can still use incorrect metadata.

## Before relying on a result

- Confirm the chain and destination contract separately.
- Verify the spender or operator rather than trusting a familiar name.
- Compare the requested permission with what you intended.
- Use a wallet's simulation and inspect its result where available.
- Remember that a decoded request does not prove execution, current permissions, or safety.

Calldata Lens does not simulate transactions, query balances, or identify malicious contracts. Unknown methods remain unknown. Never paste a seed phrase or private key.

## Reproduce the examples locally

From the repository directory:

```js
const { decode, examples, formatUnits } = require('./decoder.js');
console.log(decode(examples.allowance));
console.log(decode(examples.operator));
console.log(decode(examples.revoke));
console.log(formatUnits(decode(examples.transfer).fields[1].value, 6));
// Last output: 125.5
```

These fixtures use placeholder addresses. They are educational inputs, not transactions to submit.

## Primary references

- [ERC-20: approve and decimals](https://eips.ethereum.org/EIPS/eip-20)
- [ERC-721: approve and setApprovalForAll](https://eips.ethereum.org/EIPS/eip-721)

Found a confusing result? [Open an issue](https://github.com/shelbygrayman/calldata-lens/issues) with synthetic calldata, the expected interpretation and the actual output.
