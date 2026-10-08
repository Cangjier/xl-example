// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show([..."ab"].join(",")) + "|" + show(Array.from("ab").join(",")));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show([..."ab"].join(",")) + "|" + show(Array.from("ab").join(",")));
