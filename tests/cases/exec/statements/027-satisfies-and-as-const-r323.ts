// xl:title satisfies 与 as const：值本身照原样留下
// xl:round 323
// xl:judge stdout
// xl:end

const cfg = { mode: "fast", retries: 3 } satisfies { mode: string; retries: number };
const modes = ["a", "b"] as const;
console.log(cfg.mode, cfg.retries, modes.length, modes[0]);
