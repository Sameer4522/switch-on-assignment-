import { bulkSetStatus } from "@/api/client";
import type { AssetStatus } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { readList, updateList } from "./cache";

export interface BulkFailure {
	id: string;
	code: string;
}

export function canRetry(code: string) {
	return code !== "legal_hold" && code !== "not_found";
}

export function useBulkStatus() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: async ({
			ids,
			status,
		}: {
			ids: string[];
			status: AssetStatus;
		}) => {
			const previous = new Map<string, AssetStatus>();
			for (const asset of readList(client)) {
				if (ids.includes(asset.id)) previous.set(asset.id, asset.status);
			}

			function putBack(targets: string[]) {
				updateList(client, asset => {
					const old = previous.get(asset.id);
					if (!old || !targets.includes(asset.id)) return asset;
					return { ...asset, status: old };
				});
			}

			updateList(client, asset =>
				ids.includes(asset.id) ? { ...asset, status } : asset
			);

			const applied: string[] = [];
			const failures: BulkFailure[] = [];

			try {
				for (let i = 0; i < ids.length; i += 50) {
					const chunk = ids.slice(i, i + 50);
					const result = await bulkSetStatus(chunk, status);

					for (const row of result.results) {
						if (row.ok) applied.push(row.id);
						else failures.push({ id: row.id, code: row.code });
					}
				}
			} catch (error) {
				putBack(ids);
				throw error;
			}

			putBack(failures.map(failure => failure.id));

			return { applied, failures };
		},
	});
}
