// Rewrites the version of every publishable workspace package to
// `<version>-fork.<N>` (docs/fork-adr/0003-forgejo-package-releases.md).
// Run it before building: the PDS embeds its package version in the build.
//
// Usage: node .forgejo/ci/set-fork-versions.mjs <N>

import { writeFileSync } from "node:fs";
import { publicPackages } from "./workspace.mjs";

const n = process.argv[2] ?? "";
if (!/^(0|[1-9][0-9]*)$/.test(n)) {
	console.error(
		`error: fork build number must be a non-negative integer, got "${n}"`,
	);
	process.exit(1);
}

for (const { file, manifest } of publicPackages()) {
	// Build metadata after the suffix would be ignored by semver, and a version
	// that already carries the suffix means the script ran twice.
	if (
		!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(manifest.version) ||
		manifest.version.includes("-fork.")
	) {
		console.error(
			`error: ${manifest.name} has unexpected version "${manifest.version}"`,
		);
		process.exit(1);
	}
	manifest.version = `${manifest.version}-fork.${n}`;
	writeFileSync(file, `${JSON.stringify(manifest, null, "\t")}\n`);
	console.log(`${manifest.name}@${manifest.version}`);
}
