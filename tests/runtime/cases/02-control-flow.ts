// 语料 02：控制流（if / while / do..while / for / for..of / for..in / switch / 标签）。
//
// `for..in` 的**已知差异**在这里要避开：本仓按 `Object.keys` 的口径只遍历自有键，
// 而且**整数样式的键不按 JS 的「升序优先」**——所以这一份只用**字符串键**。

let out: string[] = [];

for (let i = 0; i < 5; i++) {
  if (i % 2 === 0) {
    out.push("even" + i);
  } else {
    out.push("odd" + i);
  }
}
console.log("for", out.join(","));

let countdown: number = 3;
let ticks: number = 0;
while (countdown > 0) {
  ticks += 1;
  countdown -= 1;
}
console.log("while", ticks);

let once: number = 0;
do {
  once += 1;
} while (once < 4);
console.log("do-while", once);

const letters: string[] = ["a", "b", "c"];
let joined: string = "";
for (const item of letters) {
  joined += item;
}
console.log("for-of", joined);

const record = { first: 1, second: 2 };
let keys: string = "";
for (const key in record) {
  keys += key + "=" + record[key] + ";";
}
console.log("for-in", keys);

function classify(value: number): string {
  switch (value) {
    case 1:
      return "one";
    case 2:
      return "two";
    default:
      return "many";
  }
}
console.log("switch", classify(1), classify(2), classify(9));

// 贯穿 + `break` + `continue`：都是语句边界的常客。
let walked: number = 0;
for (let i = 0; i < 10; i++) {
  if (i === 2) continue;
  if (i > 5) break;
  walked += i;
}
console.log("break-continue", walked);

// 带标签的 break / continue（引擎与降级层各有一条路）。
let hits: number = 0;
outer: for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    if (j > i) continue outer;
    if (i === 3 && j === 2) break outer;
    hits += 1;
  }
}
console.log("labels", hits);
