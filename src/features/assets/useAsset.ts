import { type ApiError, getAsset, updateAsset } from "@/api/client";
import { useFetchMutation, useFetchQuery } from "@/hooks/useFetchQuery";
import type { Asset, AssetStatus } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { updateList } from "./cache";

export function useAsset(id: string) {
	return useFetchQuery<Asset>({
		queryKey: ["asset", id],
		queryFn: ({ signal }) => getAsset(id, signal),
	});
}

export function useSetAssetStatus(id: string) {
	const client = useQueryClient();

	return useFetchMutation<Asset, { version: number; status: AssetStatus }>({
		mutationFn: ({ version, status }) => updateAsset(id, version, { status }),

		onSuccess: saved => {
			client.setQueryData(["asset", id], saved);
			updateList(client, asset => (asset.id === saved.id ? saved : asset));
		},

		onError: error => {
			if ((error as ApiError).code === "version_conflict") {
				client.invalidateQueries({ queryKey: ["asset", id] });
			}
		},
	});
}
