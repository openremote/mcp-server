import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  clean: true,
  dts: true,
  noExternal: ["@openremote/rest", "@openremote/model"],
  external: ["axios", "qs"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
