// xl:title sign / round 的负零
// xl:round 692
// xl:judge stdout
// xl:end

console.log(Math.sign(-3), Object.is(Math.sign(-0), -0), Object.is(Math.round(-0.5), -0));
