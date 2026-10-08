// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); let seen = "none"; class Outer { static tag = "T"; } const C = class Inner { static { seen = Outer.tag + ":" + Inner.name; } };
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
let seen = "none";
class Outer { static tag = "T"; }
const C = class Inner { static { seen = Outer.tag + ":" + Inner.name; } };
console.log(show(seen) + "|" + show(C.name));
