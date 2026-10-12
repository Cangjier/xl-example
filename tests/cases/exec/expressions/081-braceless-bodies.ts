// xl:title 无括号的语句体：`for` / `while` 体里的 `if` 只到自己那个分号为止
// xl:round 373
// xl:judge stdout
// xl:end
// **一条已经成形的语句级单元本身就是语句结束**——for 体里的 if 收好之后，
// 下一条语句**不该**被算进体里。
const log: string[] = [];
let i = 0;
for (i = 0; i < 2; i++) if (i > 5) log.push("never");
log.push("after-for-if");
let j = 0;
for (j = 0; j < 2; j++) if (j >= 0) log.push("body" + j);
log.push("after");
let k = 0;
while (k < 2) { k += 1; }
log.push("after-while");
let m = 0;
for (m = 0; m < 3; m++) if (m === 1) log.push("mid");
log.push("tail");
let n = 0;
for (n = 0; n < 2; n++) for (let q = 0; q < 2; q++) if (q === 1) log.push("n" + n + q);
log.push("end");
console.log(log.join(","));
console.log(log.filter((x) => x === "after").length, log.length);
