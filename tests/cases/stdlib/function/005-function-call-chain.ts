// xl:title call 连着用，以及绑定后的再绑定
// xl:round 304
// xl:judge stdout
// xl:end

function who(this: any) { return this.name; }
const o = { name: "o" };
const p = { name: "p" };
console.log(who.call(o), who.call(p), who.bind(o).call(p));
