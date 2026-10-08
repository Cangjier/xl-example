// xl:title take / drop 从**当下游标**起算，且接收者按「走完」推进
// xl:round 725
// xl:judge stdout
// xl:end
const it: any = [1, 2, 3, 4].values();
console.log(it.next().value);
console.log([...it.take(2)].join(","));
console.log(it.next().value);
const d: any = [1, 2, 3, 4].values();
console.log([...d.drop(1)].join(","), d.next().done);
console.log([...([1, 2, 3].values() as any).take(99)].join(","));
console.log([...([1, 2].values() as any).take(0)].join(",") + "|");
