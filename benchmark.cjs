const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const {createHash} = require('node:crypto');
const {readFileSync} = require('node:fs');
const os = require('node:os');
const {decode, examples} = require('./decoder.js');
const cases = Object.entries(examples).map(([name, input]) => ({name, input, expected: 'known'}));
cases.push({name: 'unknown selector', input: '0xdeadbeef', expected: 'unknown'},
  {name: 'empty calldata', input: '0x', expected: 'empty'},
  {name: 'invalid hex', input: '0xzz', expected: 'reject'},
  {name: 'truncated transfer', input: examples.transfer.slice(0,-2), expected: 'reject'});
function check(c) {
  if(c.expected === 'reject') assert.throws(() => decode(c.input));
  else assert.equal(decode(c.input).kind, c.expected);
}
for(let i=0;i<100;i++) for(const c of cases) check(c);
const rows=cases.map(c=>{
  const batches=[];
  for(let repeat=0;repeat<30;repeat++) {
    const start=performance.now();
    for(let i=0;i<100;i++) check(c);
    batches.push((performance.now()-start)/100);
  }
  const sorted=[...batches].sort((a,b)=>a-b);
  return {name:c.name, expected:c.expected, iterations:3000, batchMeanMs:batches,
    medianBatchMeanMs:sorted[14],p95BatchMeanMs:sorted[28]};
});
console.log(JSON.stringify({schema:'calldata-lens.benchmark.v1',createdAt:new Date().toISOString(),
  runtime:process.version,platform:`${process.platform}-${process.arch}`,cpu:os.cpus()[0]?.model,
  sourceSha256:createHash('sha256').update(readFileSync(require.resolve('./decoder.js'))).digest('hex'),
  fixtureSha256:createHash('sha256').update(JSON.stringify(cases)).digest('hex'),
  note:'Synthetic development inputs. Warm decoder plus correctness assertion cost. Percentiles are batch means, not individual-call latency. No competitor or safety claim.',rows},null,2));
