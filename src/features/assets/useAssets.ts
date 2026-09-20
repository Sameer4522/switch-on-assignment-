import { listAssets } from "@/api/client";
import { useFetchInfiniteQuery } from "@/hooks/useFetchQuery";
import type { AssetPage, AssetQuery } from "@/lib/types";

export function useAssets(query: AssetQuery) {
	return useFetchInfiniteQuery<AssetPage>({
		queryKey: ["assets", query],
		queryFn: ({ pageParam, signal }) =>
			listAssets({ ...query, cursor: pageParam }, signal),
		initialPageParam: undefined,
		getNextPageParam: page => page.nextCursor ?? undefined,
	});
}
