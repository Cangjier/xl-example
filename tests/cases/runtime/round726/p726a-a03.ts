// xl:title `yield` 后面跟对象 / 数组字面量
// xl:round 726
// xl:judge stdout
// xl:end
function* g() { yield { v: 1 }; yield [2, 3]; }
const seen: string[] = [];
for (const x of g()) seen.push(JSON.stringify(x));
console.log(seen.join("|"));
function* delegating() { yield* [{ v: 4 }]; }
console.log(JSON.stringify([...delegating()]));
