// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const Inner = class Named { static inner = Named.name; }; console.log(show(Inner.inner) + "|" + show(Inner.name));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const Inner = class Named { static inner = Named.name; };
console.log(show(Inner.inner) + "|" + show(Inner.name));
