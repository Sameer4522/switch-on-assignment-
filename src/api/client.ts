import type { Asset, AssetPage, AssetQuery, BulkResult } from "@/lib/types";

export type ApiError = Error & {
	status: number;
	code: string;
	retryAfterMs?: number;
};

function toSearchParams(query: AssetQuery): string {
	const params = new URLSearchParams();
	if (query.q) params.set("q", query.q);
	if (query.status?.length) params.set("status", query.status.join(","));
	if (query.kind?.length) params.set("kind", query.kind.join(","));
	if (query.tag?.length) params.set("tag", query.tag.join(","));
	if (query.collectionId) params.set("collectionId", query.collectionId);
	if (query.owner) params.set("owner", query.owner);
	if (query.sort) params.set("sort", query.sort);
	if (query.limit) params.set("limit", String(query.limit));
	if (query.cursor) params.set("cursor", query.cursor);
	return params.toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(path, {
		...init,
		headers: { "content-type": "application/json", ...init?.headers },
	});

	if (!res.ok) {
		const body = await res.json().catch(() => null);
		const retryAfter = res.headers.get("retry-after");
		throw Object.assign(new Error(body?.error?.message ?? res.statusText), {
			status: res.status,
			code: body?.error?.code ?? "unknown",
			retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : undefined,
		});
	}

	return res.json();
}

export function listAssets(
	query: AssetQuery,
	signal?: AbortSignal
): Promise<AssetPage> {
	return request<AssetPage>(`/api/assets?${toSearchParams(query)}`, { signal });
}

export function getAsset(id: string, signal?: AbortSignal): Promise<Asset> {
	return request<Asset>(`/api/assets/${id}`, { signal });
}

export function getAssetsByIds(ids: string[], signal?: AbortSignal) {
	return request<{ items: Asset[]; missing: string[] }>(
		`/api/assets/batch?ids=${ids.join(",")}`,
		{ signal }
	);
}

export function updateAsset(
	id: string,
	version: number,
	patch: Partial<Pick<Asset, "name" | "status" | "tags">>,
	signal?: AbortSignal
): Promise<Asset> {
	return request<Asset>(`/api/assets/${id}`, {
		method: "PATCH",
		body: JSON.stringify({ version, patch }),
		signal,
	});
}

export function bulkSetStatus(
	ids: string[],
	status: Asset["status"],
	signal?: AbortSignal
): Promise<BulkResult> {
	return request<BulkResult>("/api/assets/bulk-status", {
		method: "POST",
		body: JSON.stringify({ ids, status }),
		signal,
	});
}

export const thumbnailUrl = (id: string) => `/api/thumb/${id}.svg`;
