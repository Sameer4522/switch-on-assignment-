import type { Asset, AssetPage } from "@/lib/types";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

export function updateList(
	client: QueryClient,
	update: (asset: Asset) => Asset
) {
	client.setQueriesData<InfiniteData<AssetPage>>(
		{ queryKey: ["assets"] },
		data =>
			data && {
				...data,
				pages: data.pages.map(page => ({
					...page,
					items: page.items.map(update),
				})),
			}
	);
}

export function readList(client: QueryClient) {
	return client
		.getQueriesData<InfiniteData<AssetPage>>({ queryKey: ["assets"] })
		.flatMap(([, data]) => data?.pages.flatMap(page => page.items) ?? []);
}
