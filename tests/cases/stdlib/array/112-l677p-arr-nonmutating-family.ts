// xl:title 点名：Array 的 toSorted / toReversed / toSpliced / with / findLast 族
// xl:judge stdout
// xl:end

const xs = [3, 1, 2];
console.log(xs.toSorted().join(","), xs.join(","), xs.toSorted((a, b) => b - a).join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.toSpliced(1, 1).join(","), xs.toSpliced(1, 0, 9).join(","), xs.join(","));
console.log(xs.with(0, 9).join(","), xs.join(","));
console.log(typeof xs.with, typeof xs.toSorted, typeof xs.toReversed, typeof xs.toSpliced);
try {
  console.log(xs.with(9, 1));
} catch (e) {
  console.log(e.constructor.name, e instanceof RangeError);
}
