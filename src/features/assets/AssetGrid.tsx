import { formatBytes, formatDate, statusLabel } from "@/lib/format";
import type { Asset } from "@/lib/types";
import { Thumbnail } from "./Thumbnail";

interface Props {
	assets: Asset[];
	selectedIds: Set<string>;
	activeId: string | null;
	loading: boolean;
	failed: boolean;
	hasMore: boolean;
	loadingMore: boolean;
	onToggleSelect: (id: string) => void;
	onOpen: (id: string) => void;
	onLoadMore: () => void;
	onRetry: () => void;
}

export function AssetGrid({
	assets,
	selectedIds,
	activeId,
	loading,
	failed,
	hasMore,
	loadingMore,
	onToggleSelect,
	onOpen,
	onLoadMore,
	onRetry,
}: Props) {
	function handleScroll(event: any) {
		if (!hasMore) return;

		const grid = event.currentTarget;
		const remaining = grid.scrollHeight - grid.scrollTop - grid.clientHeight;
		if (remaining < 400) onLoadMore();
	}

	if (loading) {
		return (
			<div className="grid">
				{Array.from({ length: 12 }, (_, i) => (
					<div key={i} className="card card--loading" />
				))}
			</div>
		);
	}

	if (failed) {
		return (
			<div className="empty">
				<p>These results could not be loaded.</p>
				<p className="muted">
					MediaVault did not answer. Nothing has been lost.
				</p>
				<button onClick={onRetry}>Try again</button>
			</div>
		);
	}

	if (assets.length === 0) {
		return (
			<div className="empty">
				<p>No assets match these filters.</p>
				<p className="muted">
					Try a different search, or clear the status filters.
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
