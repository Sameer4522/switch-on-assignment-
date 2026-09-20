import { listAssets } from "@/api/client";
import { useFetchQuery } from "@/hooks/useFetchQuery";
import type { AssetPage, AssetQuery } from "@/lib/types";

export function useAssets(query: AssetQuery) {
	return useFetchQuery<AssetPage>({
		queryKey: ["assets", query],
		queryFn: ({ signal }) => listAssets(query, signal),
	});
}
