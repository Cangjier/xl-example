// xl:title trim / trimStart / trimEnd
// xl:round 692
// xl:judge stdout
// xl:end

console.log(JSON.stringify("  a b  ".trim()), JSON.stringify("  a  ".trimStart()), JSON.stringify("  a  ".trimEnd()));
