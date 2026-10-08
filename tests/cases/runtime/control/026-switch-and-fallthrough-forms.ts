// xl:title switch 的穿透与 default
// xl:round 291
// xl:judge stdout
// xl:end

function t(x: number) { let s = ""; switch (x) { case 1: s += "a"; case 2: s += "b"; break; default: s += "d"; } return s; }
console.log(t(1), t(2), t(3));
