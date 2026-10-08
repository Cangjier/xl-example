// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const boxed = new String("ab"); console.log(show(boxed.includes("a")) + "|" + show(boxed + "c") + "|" + show(String.prototype.at
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const boxed = new String("ab");
console.log(show(boxed.includes("a")) + "|" + show(boxed + "c") + "|" + show(String.prototype.at.call(boxed, 1)));
