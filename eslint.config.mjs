// eslint-config-next 16 ships flat config directly (a Linter.Config[]), so it is
// spread as-is — no FlatCompat bridge, which chokes on it.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default [{ ignores: [".next/**", "node_modules/**", "next-env.d.ts"] }, ...nextCoreWebVitals];
