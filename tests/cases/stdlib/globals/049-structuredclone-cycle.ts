// xl:title structuredClone 处理环与 Map / Set / Date
// xl:round 647
// xl:judge stdout
// xl:end

const node = { name: "root", child: null };
node.child = node;
const copy = structuredClone(node);
console.log(copy !== node, copy.child === copy, copy.name);
const box = structuredClone({ m: new Map([["k", 1]]), s: new Set([2]), d: new Date(0) });
console.log(box.m.get("k"), box.s.has(2), box.d.getTime());
