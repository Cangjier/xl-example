// xl:title 访问器：读一次跑一次、写一次跑一次
// xl:judge stdout
// xl:end

let reads = 0;
let writes = 0;
let store = 0;
const o = {
  get v() { reads += 1; return store; },
  set v(next: number) { writes += 1; store = next; },
};
o.v = 5;
const got = o.v + o.v;
console.log(got, reads, writes, store);
