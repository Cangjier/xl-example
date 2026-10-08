// xl:title `finally` 里的 return / break / continue
// xl:judge stdout
// xl:end

function f(): number { try { return 1; } finally { console.log("fin"); } }
console.log(f());
for (let i = 0; i < 2; i++) {
  try { if (i === 0) continue; console.log("body", i); } finally { console.log("f", i); }
}
