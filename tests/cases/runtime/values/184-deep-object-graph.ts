// xl:title 深对象图：建立、遍历、序列化
// xl:round 371
// xl:judge stdout
// xl:end
type N = { id: number; next?: N };
let head: N | undefined = undefined;
for (let i = 50; i >= 0; i--) head = { id: i, next: head };
let count = 0;
let walk = head;
const ids: number[] = [];
while (walk) { count += 1; if (walk.id % 10 === 0) ids.push(walk.id); walk = walk.next; }
console.log(count, ids.join(","));
const json = JSON.stringify(head);
console.log(json.length, JSON.parse(json).id);
const tree: any = { name: "root", children: [] };
let cursor = tree;
for (let i = 0; i < 30; i++) { const child = { name: "n" + i, children: [] }; cursor.children.push(child); cursor = child; }
let depth = 0;
let probe: any = tree;
while (probe.children.length > 0) { depth += 1; probe = probe.children[0]; }
console.log(depth, probe.name);
