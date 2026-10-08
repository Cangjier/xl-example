// xl:title 循环里抛、循环外接住：循环中断且变量停在中途
// xl:judge stdout
// xl:end

let i = 0;
try { for (i = 0; i < 5; i++) { if (i === 3) throw new Error("stop"); } } catch (e: any) { console.log("caught", e.message, i); }
console.log("after", i);
