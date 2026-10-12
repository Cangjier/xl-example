// xl:title 非 ASCII 空白（`\u00a0`）在 JS 里可被 `trim`
// xl:round 305
// xl:judge stdout
// xl:end

console.log(JSON.stringify("\u00a0x\u00a0".trim()), JSON.stringify("\u3000y".trim()));
