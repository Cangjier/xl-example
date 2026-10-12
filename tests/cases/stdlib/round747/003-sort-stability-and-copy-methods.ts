// xl:title `sort` 的稳定性与比较器返回值（`0.5` / `-0.5` / `NaN`），以及 `toSorted` / `toReversed` / `toSpliced` / `with`
// xl:round 747
// xl:judge stdout
// xl:want pass
// xl:end

const people = [{ n: "a", k: 1 }, { n: "b", k: 1 }, { n: "c", k: 0 }];
console.log(people.sort((x, y) => x.k - y.k).map((p) => p.n).join(","));
console.log([3, 1, 2].sort(() => 0.5).join(","));
console.log([3, 1, 2].sort(() => -0.5).join(","));
console.log([3, 1, 2].sort(() => NaN).join(","));
const copy = [1, 2, 3];
console.log(JSON.stringify(copy.toSorted((a, b) => b - a)), JSON.stringify(copy));
console.log(JSON.stringify(copy.toReversed()), JSON.stringify(copy.toSpliced(0, 1)), JSON.stringify(copy));
console.log(copy.with(1, 9).join(","), JSON.stringify(copy));
