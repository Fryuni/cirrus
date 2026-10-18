import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * tsdown `noExternal` predicate: inline every `@atproto/*` import that
 * resolves to a `0.0.0-spaces-alpha-*` build.
 *
 * Those alphas declare each other with caret ranges, which fresh installs
 * float to newer alphas and, through them, to the broken bare `0.0.0`
 * `@atproto/lex*` builds that still carry `workspace:*` specifiers. Bundling
 * them keeps every alpha range out of the published manifests, so consumers
 * never resolve them. See docs/fork-adr/0004-inline-spaces-alpha-deps.md.
 *
 * The check reads the version of the package `importer` would load, so a
 * stable release of the same package (e.g. `@atproto/crypto@0.4.x` imported
 * by our own source) stays external.
 */
export function isSpacesAlpha(id: string, importer: string | undefined) {
	if (!importer || !id.startsWith("@atproto/")) return false;
	const name = id.split("/", 2).join("/");
	for (let dir = dirname(importer); ; dir = dirname(dir)) {
		const manifest = join(dir, "node_modules", name, "package.json");
		if (existsSync(manifest)) {
			const { version } = JSON.parse(readFileSync(manifest, "utf8"));
			return String(version).includes("-spaces-alpha-");
		}
		if (dirname(dir) === dir) return false;
	}
}
