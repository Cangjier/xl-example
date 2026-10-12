// xl:title JSON.stringify 走 toJSON
// xl:round 623
// xl:judge stdout
// xl:end

const o = { toJSON() { return { z: 1 }; } };
console.log(JSON.stringify(o));
console.log(JSON.stringify({ d: new Date(0) }));
