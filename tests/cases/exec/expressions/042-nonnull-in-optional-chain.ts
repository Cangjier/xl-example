// xl:title 非空断言与可选链混着写
// xl:round 304
// xl:judge stdout
// xl:end

type Node2 = { next?: Node2 | null; value: number };
const n: Node2 = { value: 1, next: { value: 2 } };
console.log(n.next!.value, n.next?.value, n.next!.next?.value);
const arr: number[][] | null = [[1], [2]];
console.log(arr![0]![0], arr?.[1]?.[0]);
