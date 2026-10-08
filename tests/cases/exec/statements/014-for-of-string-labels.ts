// xl:title for..of 走字符串（按码点）与带标签的循环退出
// xl:judge stdout
// xl:end

const chars: string[] = [];
for (const c of "abc") chars.push(c);
console.log(chars.join("-"), chars.length);
outer: for (const a of [1, 2]) { for (const b of [3, 4]) { if (b === 4) continue outer; console.log(a, b); } }
