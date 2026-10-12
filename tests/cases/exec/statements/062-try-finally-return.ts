// xl:title `try` 里的 `return` 与 `finally` 里的 `return`
// xl:round 691
// xl:judge stdout
// xl:end
function f(): number { try { return 1; } finally { console.log("fin"); } }
function g(): number { try { return 1; } finally { return 2; } }
console.log(f(), g());
function h(): number { for (let i = 0; i < 3; i++) { try { continue; } finally { console.log("i", i); } } return 9; }
console.log(h());
