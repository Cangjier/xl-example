// xl:title satisfies + as const：值不变、类型收窄
// xl:round 371
// xl:judge stdout
// xl:end
const routes = {
  home: { path: "/", auth: false },
  admin: { path: "/admin", auth: true },
} as const satisfies Record<string, { path: string; auth: boolean }>;
function navigate(name: keyof typeof routes): string { return routes[name].path; }
console.log(navigate("home"), navigate("admin"), routes.admin.auth);
console.log(Object.keys(routes).join(","), routes.home.path.length);
