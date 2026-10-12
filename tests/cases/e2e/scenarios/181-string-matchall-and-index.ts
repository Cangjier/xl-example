// xl:title 端到端：matchAll + lastIndex + 命名捕获组
// xl:round 639
// xl:judge stdout
// xl:want blocked
// xl:why `matchAll` + 命名捕获组 + `lastIndex`，整条压在 `RegExp` 上。**必做**
// xl:end

const text = "a1=10; b2=20; c3=30";
const rows: string[] = [];
for (const m of text.matchAll(/(?<key>[a-z])(?<n>\d)=(?<v>\d+)/g)) {
  rows.push(m.groups!.key + ":" + Number(m.groups!.v));
  rows.push("at " + m.index);
}
console.log(rows.join("|"));
const re = /\d+/g;
console.log(re.lastIndex, re.exec(text)![0], re.lastIndex);
