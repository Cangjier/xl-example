// xl:title -0 与 0
// xl:round 692
// xl:judge stdout
// xl:end

console.log(-0 === 0, Object.is(-0, 0), 1 / -0, Object.is(Math.min(0, -0), -0));
