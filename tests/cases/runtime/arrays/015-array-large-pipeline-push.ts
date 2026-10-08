// xl:title 大量 push / shift：不 OOM、次序正确
// xl:judge stdout
// xl:end

const xs: number[] = [];
for (let i = 0; i < 2000; i++) xs.push(i);
let total = 0;
for (let i = 0; i < 1000; i++) total += xs.shift() as number;
console.log(xs.length, total, xs[0]);
