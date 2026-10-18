/**
 * Tests for the PDS client used by the CLI
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PDSClient } from "../../src/cli/utils/pds-client.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
	mockFetch.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * Create a mock Response that matches what @atcute/client expects
 */
function mockXrpcResponse(body: unknown, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		headers: new Headers({ "content-type": "application/json" }),
		json: () => Promise.resolve(body),
		text: () => Promise.resolve(JSON.stringify(body)),
	};
}

describe("PDSClient", () => {
	describe("getProfile", () => {
		it("returns null when the PDS answers 400 RecordNotFound", async () => {
			// What Cirrus and the reference PDS return for a missing record
			mockFetch.mockResolvedValueOnce(
				mockXrpcResponse(
					{ error: "RecordNotFound", message: "Could not locate record" },
					400,
				),
			);

			const client = new PDSClient("https://pds.example.com", "token");
			expect(await client.getProfile("did:web:pds.example.com")).toBeNull();
		});

		it("returns null when the PDS answers 404", async () => {
			mockFetch.mockResolvedValueOnce(
				mockXrpcResponse({ error: "NotFound", message: "Not found" }, 404),
			);

			const client = new PDSClient("https://pds.example.com", "token");
			expect(await client.getProfile("did:web:pds.example.com")).toBeNull();
		});

		it("still throws other errors", async () => {
			mockFetch.mockResolvedValueOnce(
				mockXrpcResponse({ error: "InvalidRequest", message: "Bad repo" }, 400),
			);

			const client = new PDSClient("https://pds.example.com", "token");
			await expect(
				client.getProfile("did:web:pds.example.com"),
			).rejects.toThrow("InvalidRequest");
		});
	});
});
