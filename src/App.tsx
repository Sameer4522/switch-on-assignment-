import { ErrorBoundary } from "@/ErrorBoundary";
import { AssetDetail } from "@/features/assets/AssetDetail";
import { AssetGrid } from "@/features/assets/AssetGrid";
import { useAssets } from "@/features/assets/useAssets";
import { canRetry, useBulkStatus } from "@/features/assets/useBulkStatus";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useOnline } from "@/hooks/useOnline";
import { statusLabel } from "@/lib/format";
import type { AssetQuery, AssetStatus } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

const STATUSES: AssetStatus[] = ["draft", "in_review", "approved", "archived"];
const SORTS: Array<{ value: NonNullable<AssetQuery["sort"]>; label: string }> =
	[
		{ value: "updatedAt:desc", label: "Recently updated" },
		{ value: "name:asc", label: "Name A–Z" },
		{ value: "sizeBytes:desc", label: "Largest first" },
		{ value: "createdAt:desc", label: "Newest" },
	];

const FAILURE_REASONS: Record<string, string> = {
	legal_hold: "on legal hold",
	not_found: "no longer exists",
	conflict: "was edited by someone else",
};

export function App() {
	const { filters, apply } = useUrlFilters();
	const [q, setQ] = useState(filters.q);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [activeId, setActiveId] = useState<string | null>(null);

	const search = useDebouncedValue(q);
	const {
		data,
		isPending,
		error,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		refetch,
	} = useAssets({ ...filters, limit: 50 });

	const bulk = useBulkStatus();
	const online = useOnline();

	const items = data?.pages.flatMap(page => page.items) ?? [];
	const total = data?.pages[0]?.total ?? 0;

	const itemsRef = useRef(items);
	itemsRef.current = items;
	const anchorRef = useRef<number | null>(null);

	useEffect(() => {
		const current = new URLSearchParams(window.location.search).get("q") ?? "";
		if (search.trim() !== current) apply({ q: search.trim() }, true);
	}, [search, apply]);

	useEffect(() => {
		setQ(prev => (prev.trim() === filters.q ? prev : filters.q));
	}, [filters.q]);

	useEffect(() => {
		setSelectedIds(new Set());
		bulk.reset();
	}, [filters]);

	const toggleSelect = useCallback((id: string, index: number) => {
		anchorRef.current = index;
		setSelectedIds(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const extendSelect = useCallback((index: number) => {
		const from = anchorRef.current ?? index;
		const start = Math.min(from, index);
		const end = Math.max(from, index);

		setSelectedIds(prev => {
			const next = new Set(prev);
			for (let i = start; i <= end; i++) {
				const asset = itemsRef.current[i];
				if (asset) next.add(asset.id);
			}
			return next;
		});
	}, []);

	const selectAllLoaded = useCallback(() => {
		setSelectedIds(new Set(itemsRef.current.map(asset => asset.id)));
	}, []);

	const openAsset = useCallback((id: string) => setActiveId(id), []);

	function applyBulkStatus(next: AssetStatus, ids: string[]) {
		if (ids.length === 0) return;

		bulk.mutate(
			{ ids, status: next },
			{
				onSuccess: ({ failures }) =>
					setSelectedIds(new Set(failures.map(f => f.id))),
			}
		);
	}

	const outcome = bulk.data;
	const lastStatus = bulk.variables?.status;
	const retryable = outcome?.failures.filter(f => canRetry(f.code)) ?? [];
	const nameOf = (id: string) => items.find(a => a.id === id)?.name ?? id;

	return (
		<div className="app">
			<header className="topbar">
				<h1>MediaVault</h1>
				<input
					className="search"
					type="search"
					placeholder="Search assets"
					value={q}
					onChange={e => setQ(e.target.value)}
				/>
				<select
					value={filters.sort}
					onChange={e => apply({ sort: e.target.value as typeof filters.sort })}
				>
					{SORTS.map(option => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</header>

			<div className="filters">
				{STATUSES.map(s => (
					<label key={s}>
						<input
							type="checkbox"
							checked={filters.status.includes(s)}
							onChange={e =>
								apply({
									status: e.target.checked
										? [...filters.status, s]
										: filters.status.filter(x => x !== s),
								})
							}
						/>
						{statusLabel(s)}
					</label>
				))}
				<span className="muted">
					{isPending
						? "Loading…"
						: `${items.length} of ${total.toLocaleString()} shown`}
				</span>
			</div>

			{selectedIds.size > 0 && (
				<div className="bulkbar">
					<span>{selectedIds.size} selected</span>
					{STATUSES.map(s => (
						<button
							key={s}
							disabled={bulk.isPending}
							onClick={() => applyBulkStatus(s, [...selectedIds])}
						>
							Set {statusLabel(s).toLowerCase()}
						</button>
					))}
					<button onClick={selectAllLoaded}>Select all {items.length}</button>
					<button onClick={() => setSelectedIds(new Set())}>
						Clear selection
					</button>
				</div>
			)}

			{!online && (
				<p className="offline">
					You are offline. MediaVault will pick up where it left off once the
					connection is back.
				</p>
			)}

			{bulk.isPending && <p className="notice">Updating assets…</p>}

			{outcome && !bulk.isPending && (
				<div className="notice">
					<p>
						{outcome.applied.length} updated
						{outcome.failures.length > 0 &&
							`, ${outcome.failures.length} left unchanged`}
					</p>

					{outcome.failures.length > 0 && (
						<ul className="failures">
							{outcome.failures.map(failure => (
								<li key={failure.id}>
									{nameOf(failure.id)} —{" "}
									{FAILURE_REASONS[failure.code] ?? "could not be updated"}
								</li>
							))}
						</ul>
					)}

					{retryable.length > 0 && lastStatus && (
						<button
							onClick={() =>
								applyBulkStatus(
									lastStatus,
									retryable.map(f => f.id)
								)
							}
						>
							Retry {retryable.length}
						</button>
					)}
				</div>
			)}

			<main className="content">
				<ErrorBoundary>
					<AssetGrid
						assets={items}
						selectedIds={selectedIds}
						activeId={activeId}
						loading={isPending}
						failed={Boolean(error)}
						hasMore={hasNextPage && !isFetchingNextPage}
						loadingMore={isFetchingNextPage}
						onToggleSelect={toggleSelect}
						onExtendSelect={extendSelect}
						onOpen={openAsset}
						onLoadMore={fetchNextPage}
						onRetry={refetch}
					/>
				</ErrorBoundary>

				{activeId && (
					<ErrorBoundary>
						<AssetDetail id={activeId} onClose={() => setActiveId(null)} />
					</ErrorBoundary>
				)}
			</main>
		</div>
	);
}
