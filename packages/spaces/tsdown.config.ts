import { defineConfig } from "tsdown";
import { isSpacesAlpha } from "../../build/inline-spaces-alpha.ts";

export default defineConfig([
	{
		entry: { index: "src/index.ts" },
		format: ["esm"],
		fixedExtension: false,
		dts: { resolve: ["@atproto/space"] },
		external: [/^cloudflare:/],
		noExternal: isSpacesAlpha,
	},
]);
