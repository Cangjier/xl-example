// xl:title 块也开一层环境：两次进入同一个块、块里的两个同名 `const` 各是各的
// xl:round 316
// xl:judge stdout
// xl:end

function make(): (() => number)[] {
  const out: (() => number)[] = [];
  { const a = 1; out.push(() => a); }
  { const a = 2; out.push(() => a); }
  return out;
}
const pair = make();
console.log(pair[0](), pair[1]());
function twice(): number {
  let total = 0;
  for (let k = 0; k < 2; k++) {
    const local = k + 1;
    total += (() => local)();
  }
  return total;
}
console.log(twice());
