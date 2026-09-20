import { ErrorBoundary } from "@/ErrorBoundary";
import { AssetDetail } from "@/features/assets/AssetDetail";
import { AssetGrid } from "@/features/assets/AssetGrid";
import { useAssets } from "@/features/assets/useAssets";
import { canRetry, useBulkStatus } from "@/features/assets/useBulkStatus";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOnline } from "@/hooks/useOnline";
import { statusLabel } from "@/lib/format";
import type { AssetQuery, AssetStatus } from "@/lib/types";
import { useEffect, useState } from "react";

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
	const [q, setQ] = useState("");
	const [status, setStatus] = useState<AssetStatus[]>([]);
	const [sort, setSort] =
		useState<NonNullable<AssetQuery["sort"]>>("updatedAt:desc");
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
	} = useAssets({
		q: search,
		status,
		sort,
		limit: 50,
	});

	const bulk = useBulkStatus();
	const online = useOnline();

	const items = data?.pages.flatMap(page => page.items) ?? [];
	const total = data?.pages[0]?.total ?? 0;

	useEffect(() => {
		setSelectedIds(new Set());
		bulk.reset();
	}, [search, status, sort]);

	function toggleSelect(id: string) {
		setSelectedIds(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

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
					value={sort}
					onChange={e => setSort(e.target.value as typeof sort)}
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
							checked={status.includes(s)}
							onChange={e =>
								setStatus(prev =>
									e.target.checked ? [...prev, s] : prev.filter(x => x !== s)
								)
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
						onOpen={setActiveId}
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
