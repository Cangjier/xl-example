// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show("abc".replace("b", "$1")) + "|" + show("abc".replace("b", "$<x>")));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show("abc".replace("b", "$1")) + "|" + show("abc".replace("b", "$<x>")));
