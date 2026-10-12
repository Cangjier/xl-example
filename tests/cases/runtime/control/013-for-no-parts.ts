// xl:title for(;;) 三段全省略 + break 出口
// xl:judge stdout
// xl:end

let n = 0;
for (;;) { n += 1; if (n >= 3) break; }
console.log(n);
for (let i = 0; ; i++) { if (i === 2) { console.log("c", i); break; } }
