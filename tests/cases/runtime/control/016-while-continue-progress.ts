// xl:title while 里的 continue 要走到步进那一句（否则死循环）
// xl:judge stdout
// xl:end

let i = 0;
let seen: number[] = [];
while (i < 6) { i += 1; if (i % 2 === 0) continue; seen.push(i); }
console.log(seen.join(","), i);
