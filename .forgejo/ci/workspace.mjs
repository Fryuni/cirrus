import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The manifests of every non-private workspace package, with their paths. */
export function publicPackages() {
	const workspace = JSON.parse(
		execFileSync("pnpm", ["ls", "--recursive", "--depth", "-1", "--json"], {
			encoding: "utf8",
		}),
	);
	return workspace
		.map(({ path }) => {
			const file = join(path, "package.json");
			return { file, manifest: JSON.parse(readFileSync(file, "utf8")) };
		})
		.filter(({ manifest }) => !manifest.private);
}
