import { formatBytes, formatDate, statusLabel } from "@/lib/format";
import type { Asset } from "@/lib/types";
import { Thumbnail } from "./Thumbnail";

interface Props {
	assets: Asset[];
	selectedIds: Set<string>;
	activeId: string | null;
	hasMore: boolean;
	loadingMore: boolean;
	onToggleSelect: (id: string) => void;
	onOpen: (id: string) => void;
	onLoadMore: () => void;
}

export function AssetGrid({
	assets,
	selectedIds,
	activeId,
	hasMore,
	loadingMore,
	onToggleSelect,
	onOpen,
	onLoadMore,
}: Props) {
	function handleScroll(event: any) {
		if (!hasMore) return;

		const grid = event.currentTarget;
		const remaining = grid.scrollHeight - grid.scrollTop - grid.clientHeight;
		if (remaining < 400) onLoadMore();
	}

	if (assets.length === 0) {
		return (
			<div className="empty">
				<p>Nothing matches these filters.</p>
				<p className="muted">
					Clear the search box or widen the status filter.
				</p>
			</div>
		);
	}

	return (
		<div className="grid" onScroll={handleScroll}>
			{assets.map(asset => (
				<div
					key={asset.id}
					className={
						"card" +
						(selectedIds.has(asset.id) ? " card--selected" : "") +
						(activeId === asset.id ? " card--active" : "")
					}
					onClick={() => onOpen(asset.id)}
				>
					<Thumbnail asset={asset} className="card__thumb" />
					<div className="card__body">
						<p className="card__name">{asset.name}</p>
						<p className="muted">
							{asset.kind} · {formatBytes(asset.sizeBytes)} ·{" "}
							{formatDate(asset.updatedAt)}
						</p>
						<span className={`pill pill--${asset.status}`}>
							{statusLabel(asset.status)}
						</span>
					</div>
					<input
						type="checkbox"
						className="card__check"
						checked={selectedIds.has(asset.id)}
						onClick={e => e.stopPropagation()}
						onChange={() => onToggleSelect(asset.id)}
					/>
				</div>
			))}

			{loadingMore && <div className="grid__end">Loading more…</div>}
		</div>
	);
}
