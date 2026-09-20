import type { Asset } from "@/lib/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useState } from "react";
import { AssetCard } from "./AssetCard";

const CARD_HEIGHT = 250;
const GAP = 12;
const PADDING = 16;
const MIN_CARD_WIDTH = 220;

interface Props {
	assets: Asset[];
	selectedIds: Set<string>;
	activeId: string | null;
	loading: boolean;
	failed: boolean;
	hasMore: boolean;
	loadingMore: boolean;
	onToggleSelect: (id: string, index: number) => void;
	onExtendSelect: (index: number) => void;
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
	onExtendSelect,
	onOpen,
	onLoadMore,
	onRetry,
}: Props) {
	const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
	const [columns, setColumns] = useState(1);

	useEffect(() => {
		if (!scrollEl) return;

		const measure = () => {
			const width = scrollEl.clientWidth - PADDING * 2;
			setColumns(
				Math.max(1, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP)))
			);
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(scrollEl);
		return () => observer.disconnect();
	}, [scrollEl]);

	const rows = useVirtualizer({
		count: Math.ceil(assets.length / columns),
		getScrollElement: () => scrollEl,
		estimateSize: () => CARD_HEIGHT + GAP,
		overscan: 2,
	});

	function handleScroll() {
		if (!hasMore || !scrollEl) return;

		const remaining =
			scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
		if (remaining < 400) onLoadMore();
	}

	if (loading) {
		return (
			<div className="grid">
				<div className="grid__row" style={{ position: "static" }}>
					{Array.from({ length: 12 }, (_, i) => (
						<div key={i} className="card card--loading" />
					))}
				</div>
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
		<div className="grid" ref={setScrollEl} onScroll={handleScroll}>
			<div className="grid__canvas" style={{ height: rows.getTotalSize() }}>
				{rows.getVirtualItems().map(row => {
					const first = row.index * columns;

					return (
						<div
							key={row.key}
							className="grid__row"
							style={{
								transform: `translateY(${row.start}px)`,
								gridTemplateColumns: `repeat(${columns}, 1fr)`,
							}}
						>
							{assets.slice(first, first + columns).map((asset, offset) => (
								<AssetCard
									key={asset.id}
									asset={asset}
									index={first + offset}
									selected={selectedIds.has(asset.id)}
									active={activeId === asset.id}
									onOpen={onOpen}
									onToggle={onToggleSelect}
									onExtend={onExtendSelect}
								/>
							))}
						</div>
					);
				})}
			</div>

			{loadingMore && <p className="grid__end">Loading more…</p>}
		</div>
	);
}
