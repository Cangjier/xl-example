// xl:title toJSON 优先
// xl:round 692
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ toJSON() { return 1; } }));
