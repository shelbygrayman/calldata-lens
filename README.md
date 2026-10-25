# Calldata Lens

[Validation and benchmarks](BENCHMARKS.md) · [Changelog](CHANGELOG.md)

**Read the request. Before you sign.**

A small, offline tool that turns common EVM token calldata into plain-English explanations. Paste a transaction's data field to inspect addresses, exact amounts, approval values and ABI words.

**[Live demo](https://shelbygrayman.github.io/calldata-lens/)** · [Report an issue](https://github.com/shelbygrayman/calldata-lens/issues)

New to token permissions? Follow the [approval reading guide](APPROVAL-GUIDE.md) with offline examples.

## Why this exists

Wallet Lens answers “what does this address hold?” Calldata Lens explores a different question: “what is this request asking the contract to do?”

The project takes product inspiration from [Rabby](https://github.com/RabbyHub/Rabby)'s focus on understandable wallet interactions, [Revoke.cash](https://github.com/RevokeCash/revoke.cash)'s focus on token permissions, and [rotki](https://github.com/rotki/rotki)'s emphasis on privacy. This is an independent implementation, with no code copied from those projects and no affiliation.

## Features

- Six common function signatures, decoded locally.
- Plain-English explanations of approvals, transfers and collection-wide operators.
- Explicit ERC-20 / ERC-721 ambiguity for shared signatures.
- Maximum uint256 approval and zero-address notices.
- Exact integer arithmetic, including tiny balances and very large values.
- Optional decimal formatting using metadata you supply.
- Strict byte length, address padding and boolean validation.
- Synthetic examples and downloadable decoded JSON.
- Responsive interface with keyboard focus states and screen-reader status updates.
- No dependencies, wallet connection, RPC, analytics or input storage.

## Supported calls

| Selector | Signature | Interpretation |
| --- | --- | --- |
| `0x095ea7b3` | `approve(address,uint256)` | ERC-20 allowance or ERC-721 token approval |
| `0xa9059cbb` | `transfer(address,uint256)` | ERC-20 transfer |
| `0x23b872dd` | `transferFrom(address,address,uint256)` | ERC-20 amount or ERC-721 token ID |
| `0xa22cb465` | `setApprovalForAll(address,bool)` | ERC-721 / ERC-1155 operator permission |
| `0x42842e0e` | `safeTransferFrom(address,address,uint256)` | ERC-721 transfer, three-argument overload |
| `0xb88d4fde` | `safeTransferFrom(address,address,uint256,bytes)` | ERC-721 transfer with raw receiver data |

## Try it

1. Open the demo or download the repository and open `index.html` in a modern browser.
2. Paste the **data/input field**, not a transaction hash, seed phrase or signed transaction.
3. Choose a token standard only if you know the target contract. Supply decimals only for ERC-20 formatting.
4. Select **Decode request**. Read both the result and its limitations.

The example buttons use placeholder addresses and work without network access. Downloaded JSON includes decoded addresses and values; review it before sharing.

## Important boundaries

This is a static decoder, **not a transaction simulator, approval scanner, contract audit or safety verdict**.

A selector match does not prove that a contract implements the named function. Selector collisions, proxies and custom implementations exist. Calldata alone cannot identify the chain, destination contract, transaction sender/value, current allowance, ownership or whether execution succeeds.

Unknown selectors remain unknown. The four-argument ERC-721 `safeTransferFrom` overload supports canonical dynamic bytes: offset 128, exact length and zero padding. Receiver data remains opaque. Other dynamic arguments, multicalls and permit signatures are not supported. Extra bytes are deliberately rejected instead of silently ignored. Address output is lowercase; it does not validate checksum casing.

“Unlimited approval” refers to maximum uint256 under standard ERC-20 semantics. The same selector also exists in ERC-721, where the number is a token ID. A zero amount in ERC-721 can be token ID 0, not necessarily a revocation.

All input processing stays inside the browser. The app makes no runtime network requests; opening it on a hosting service still makes ordinary requests for its static files. Outbound source/feedback links navigate only when clicked. Nothing is saved unless you download JSON.

## Develop and test

No install or build step:

```sh
python3 -m http.server 8000
# Open http://localhost:8000
node --test decoder.test.js
```

The tests cover all supported selectors, ambiguous standards, uint256 boundaries, tiny amounts, malformed encodings, oversized inputs, and unknown selectors.

Files:

- `decoder.js`: standalone pure decoder, also importable with Node's `require`.
- `app.js`: DOM rendering and example/export controls; untrusted values are rendered as text.
- `index.html`, `styles.css`: static interface.
- `decoder.test.js`: dependency-free regression tests.

## Design references

ABI behavior is based on the [Solidity ABI specification](https://docs.soliditylang.org/en/latest/abi-spec.html), [ERC-20](https://eips.ethereum.org/EIPS/eip-20), [ERC-721](https://eips.ethereum.org/EIPS/eip-721) and [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155).

## Contribute

Useful next steps: broader method coverage, additional test fixtures and clearer explanations for newcomers. Open an issue with a synthetic input, expected output and actual output. Never include keys, private transaction data or credentials.

For new selectors, include a primary specification link, malformed-input tests and an explicit explanation of ambiguity. Keep the decoder independent of the UI and avoid runtime dependencies.

## License

MIT © 2026 Shelby
