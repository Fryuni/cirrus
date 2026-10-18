import { readFileSync } from "fs";
import { isBuiltin } from "node:module";
import { defineConfig, type UserConfig } from "tsdown";

// Every runtime dependency is a devDependency, so tsdown bundles the whole
// graph and the published package has no dependencies of its own (see
// docs/fork-adr/0006-self-contained-pds-package.md). The consumer's Worker
// build used to resolve these packages; resolve them here the way it did.

type Plugin = NonNullable<UserConfig["plugins"]>;

/**
 * Fail the build if an output chunk imports anything `allowed` rejects, e.g.
 * a package that an upstream merge added to `dependencies`.
 */
function selfContained(allowed: (id: string) => boolean): Plugin {
	return {
		name: "self-contained",
		generateBundle(_options, bundle) {
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== "chunk" || chunk.fileName.endsWith(".d.ts")) {
					continue;
				}
				const stray = [...chunk.imports, ...chunk.dynamicImports].filter(
					(id) => !(id in bundle) && !allowed(id),
				);
				if (stray.length > 0) {
					this.error(
						`${chunk.fileName} imports ${stray.join(", ")}; bundle it instead (move it to devDependencies)`,
					);
				}
			}
		},
	};
}

export default defineConfig([
	{
		entry: { index: "src/index.ts" },
		format: ["esm"],
		fixedExtension: false,
		platform: "neutral",
		// Inline the bundled packages' types too. emitJs: the root tsconfig sets
		// allowJs, which would emit declarations for every bundled .js module.
		// multiformats@9 and uint8arrays@3 stay as imports: their export maps
		// have no types, so consumers could never resolve them anyway.
		dts: { resolve: true, emitJs: false },
		external: [/^cloudflare:/],
		inputOptions: {
			resolve: {
				// @cloudflare/vite-plugin's Worker conditions and Vite's
				// server-side main fields.
				conditionNames: [
					"workerd",
					"worker",
					"module",
					"browser",
					"production",
					"import",
					"default",
				],
				mainFields: ["module", "jsnext:main", "jsnext", "main"],
			},
		},
		plugins: [
			selfContained((id) => id.startsWith("cloudflare:") || isBuiltin(id)),
			{
				name: "html-loader",
				load(id) {
					if (id.endsWith(".html")) {
						const content = readFileSync(id, "utf-8");
						return `export default ${JSON.stringify(content)};`;
					}
				},
			},
			{
				// Node builtins stay external (workerd provides them under
				// nodejs_compat). Bundled CommonJS (e.g. @atproto/common) require()s
				// them at load time, and Rolldown would emit a `require` shim that
				// throws in workerd. Hand it an ESM re-export instead, as the
				// consumer's Vite build did with these requires.
				name: "node-builtins",
				resolveId(id, _importer, { kind }) {
					if (!isBuiltin(id)) return;
					if (kind === "require-call") return `\0builtin-esm:${id}`;
					return { id, external: true };
				},
				load(id) {
					if (id.startsWith("\0builtin-esm:")) {
						const builtin = id.slice("\0builtin-esm:".length);
						return `export * from ${JSON.stringify(builtin)};`;
					}
				},
			},
			{
				// pino (via @atproto) must use its browser build in Workers.
				// Instances used to alias this in their own vite.config.ts.
				name: "pino-browser",
				resolveId(id, importer) {
					if (id === "pino") {
						return this.resolve("pino/browser.js", importer, {
							skipSelf: true,
						});
					}
				},
			},
		],
	},
	{
		entry: { cli: "src/cli/index.ts" },
		format: ["esm"],
		fixedExtension: false,
		outDir: "dist",
		// wrangler stays external: it is a peer dependency, the instance's own.
		plugins: [selfContained((id) => id === "wrangler" || isBuiltin(id))],
	},
]);
