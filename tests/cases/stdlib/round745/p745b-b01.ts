// xl:title 第 745 轮普查收编（其一）：数组方法的边界口径
// xl:round 745
// xl:judge stdout
// xl:end
const a1 = [1, 2, 3, 4];
console.log(a1.fill(0, -2).join(","), a1.join(","));
console.log([1, 2, 3].fill(9, 1, -1).join(","), [1, 2, 3].fill(9, 3, 1).join(","));
console.log(JSON.stringify([1, 2, 3].fill(9, 0, 5)));
console.log(JSON.stringify([1, , 3].fill(0, 1, 2).map((v) => String(v))));
const b1 = [1, 2, 3, 4, 5];
console.log(JSON.stringify(b1.copyWithin(0, 3)), JSON.stringify(b1));
const b2 = [1, 2, 3, 4, 5];
console.log(JSON.stringify(b2.copyWithin(-2)), JSON.stringify(b2));

console.log(JSON.stringify([1, [2, [3, [4]]]].flat()));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(2)));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(Infinity)));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(0)), JSON.stringify([[1]].flat("2")));
console.log(JSON.stringify([1, , 3].flat()));
console.log(JSON.stringify([1, 2, 3].flatMap((x) => (x === 2 ? [] : [x, x * 2]))));
console.log(JSON.stringify([1, 2].flatMap((x) => (x === 1 ? [x] : x))));
console.log(JSON.stringify(["a", "b"].flatMap((x, i, arr) => [String(i), x, String(arr.length)])));

console.log([].reduce((a, b) => a + b, 10));
console.log([].reduceRight((a, b) => a + b, "x"));
console.log([5].reduce((a, b) => a + b), [5].reduceRight((a, b) => a + b));
console.log([1, , , 3].reduce((a, b) => a + String(b), "s"));

const c1 = [1, 2, 3, 4, 5];
console.log(JSON.stringify(c1.splice(1, 2)), JSON.stringify(c1));
const c2 = [1, 2, 3];
console.log(JSON.stringify(c2.splice(-1)), JSON.stringify(c2), JSON.stringify([1, 2, 3].splice(1, 0)));
const c3 = [1, , 3, , 5];
const s3 = c3.slice(1, 4);
console.log(s3.length, 1 in s3, 3 in s3, JSON.stringify(s3.map((v) => String(v))));

const d1 = [1, , 3, NaN];
console.log(d1.indexOf(undefined), d1.lastIndexOf(undefined), d1.indexOf(NaN));
console.log(d1.includes(undefined), d1.includes(NaN), [1, 2].includes("1" as any));
console.log([1, 2, 3].indexOf(2, -2), [1, 2, 3].indexOf(2, -1), [1, 2, 3].lastIndexOf(3, -2));

const e1 = [3, undefined, 1, undefined, 2];
console.log(JSON.stringify(e1.sort().map((v) => String(v))));
const e2 = [10, 9, 100];
console.log(JSON.stringify(e2.sort()), JSON.stringify(e2.sort((x, y) => x - y)));
const e3 = ["b1", "a2", "a1", "b2"];
console.log(e3.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)).join(","));
console.log([3, 1, 2].sort(() => 0.5).join(","));
console.log([3, 1, 2].sort(() => NaN).join(","));
console.log([1, , 3].join("-"), [1, null, undefined, 3].join("-"));
console.log([1, [2, [3]]].join(","), [1, 2].toString());

console.log(JSON.stringify(Array.from("ab")), JSON.stringify(Array.from([1, 2], (x) => x * 2)));
console.log(JSON.stringify(Array.from({ length: 2 }, (v, i) => [v, i])));
console.log(JSON.stringify(Array.from({ length: -1 })), JSON.stringify(Array.from({ length: 2.7 })));
console.log(JSON.stringify(Array.from(new Set([1, 1, 2]))));
console.log(JSON.stringify(Array.of(3)), Array.of(3).length);
console.log(JSON.stringify(Array(3)), JSON.stringify(Array("3")));
console.log(JSON.stringify(Array(-0)), JSON.stringify(Array("2.5")));

console.log(JSON.stringify([1].concat([2, 3], 4, [[5]])));
const f1 = [1, , 3];
const f2 = [0].concat(f1);
console.log(f2.length, 1 in f2, 2 in f2);
const f3: any = { length: 1, 0: "x" };
console.log(JSON.stringify([0].concat(f3)));
const g1: any[] = [];
console.log(g1.pop(), g1.shift(), g1.length);
console.log(g1.unshift(1, 2), g1.push(3), JSON.stringify(g1));
console.log([].concat([]).length, [1, 2, 3].slice(5).length);

const h1 = [1, 2, 3];
console.log(h1.at(-1), h1.at(0), h1.at(3), h1.at(-4));
console.log(JSON.stringify(h1.with(-1, 9)), JSON.stringify(h1));
console.log(JSON.stringify(h1.toReversed()), JSON.stringify(h1));
console.log(JSON.stringify(h1.toSpliced(1, 1, 8)), JSON.stringify(h1));

const i1 = [1, , 3];
console.log(i1.find((v) => v === undefined), i1.findIndex((v) => v === undefined));
console.log(i1.findLast((v) => v === undefined), i1.findLastIndex((v) => v === undefined));
console.log([1, 2, 3].find((v) => v > 9), [1, 2, 3].findIndex((v) => v > 9));
console.log([].every(() => false), [].some(() => true));
console.log(i1.every((v) => typeof v === "number"), i1.some((v) => v === undefined));
console.log([1, 2].every((v, i, arr) => arr.length === 2 && v > 0));

const j1 = [1, , 3];
const seen: string[] = [];
j1.forEach((v, i) => seen.push(i + ":" + String(v)));
console.log(seen.join(","));
const j2 = j1.map((v) => v * 2);
console.log(j2.length, 1 in j2, JSON.stringify(j2.map((v) => String(v))));
console.log(JSON.stringify(j1.filter(() => true).length), JSON.stringify(j1.filter((v) => v === undefined).length));

const k1 = [1, 2, 3];
console.log(JSON.stringify([...k1.entries()]), JSON.stringify([...k1.keys()]));
const k2 = [1, 2, 3];
const out2: number[] = [];
for (const v of k2) {
  out2.push(v);
  if (v === 1) k2.push(9);
}
console.log(out2.join(","));
