// xl:title toJSON 给出 undefined：数组里留 null、对象里整格抹掉
// xl:round 7
// xl:judge stdout
// xl:end

const item = { keep: 1, drop: 2, toJSON() { return undefined; } };
console.log(JSON.stringify([item, { keep: 3 }]));
console.log(JSON.stringify({ a: item, b: { keep: 4 } }));
console.log(JSON.stringify({ a: undefined, b: () => 1, c: 5 }));
