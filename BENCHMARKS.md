# Validation and benchmarks

## Reproduce

Use Node 24. No dependency installation is needed for these checks.

```sh
node --test decoder.test.js
```

On 25 October 2026, the suite passed **16 tests** on the maintainer's Mac. These are regression checks for the covered cases, not proof of zero bugs, a security audit, or a comparison with competing products. CI runs the same suite on Linux.

## Decoder microbenchmark

Run `node benchmark.cjs > results.json`. This exercises all bundled valid examples and malformed input after warmup, validates every result, and reports per-batch timings, machine information and source hashes. Results measure this decoder on synthetic inputs, excluding UI rendering. They do not measure transaction safety, contract behavior, or network latency. Timing is informational; correctness failures return a nonzero status.


## Linux validation, 28 October 2026

All 16 regression tests passed on Node 24.22.1, Linux x64, AMD EPYC 9V74. The [raw benchmark run](benchmark-linux-2026-10-28.json) records the synthetic cases, 3,000 iterations per case, batch timings and source hashes. Timings include correctness assertions and are batch means, not individual request latency. This does not establish transaction safety or compare products.
