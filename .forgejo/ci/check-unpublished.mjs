// Fails unless no version of any publishable workspace package is in the
// registry yet (docs/fork-adr/0003-forgejo-package-releases.md). A release is
// every package from one commit; publishing only the missing ones would pair
// them with dependencies built from another commit.
//
// Only a definite answer counts: a 404 for the package, or package metadata
// without the version. Any other response or network error fails the check,
// because pnpm's own lookup treats errors as "not published".
//
// Usage: REGISTRY=<url ending in /> TOKEN=<token> node .forgejo/ci/check-unpublished.mjs

import { publicPackages } from "./workspace.mjs";

const { REGISTRY: registry, TOKEN: token } = process.env;
if (!registry?.endsWith("/") || !token) {
	console.error("error: REGISTRY (ending in /) and TOKEN must be set");
	process.exit(1);
}

let existing = 0;
for (const { manifest } of publicPackages()) {
	const { name, version } = manifest;
	const response = await fetch(`${registry}${name.replace("/", "%2f")}`, {
		headers: { authorization: `Bearer ${token}`, accept: "application/json" },
		signal: AbortSignal.timeout(30_000),
	});
	if (response.status === 404) {
		console.log(`${name}@${version}: new package`);
		continue;
	}
	if (!response.ok) {
		console.error(`error: looking up ${name} returned HTTP ${response.status}`);
		process.exit(1);
	}
	const { versions } = await response.json();
	if (versions?.[version]) {
		console.error(`error: ${name}@${version} is already published`);
		existing++;
	} else {
		console.log(`${name}@${version}: new version`);
	}
}
if (existing > 0) process.exit(1);
