import type { AssetKind, AssetQuery, AssetStatus } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export interface Filters {
	q: string;
	status: AssetStatus[];
	kind: AssetKind[];
	tag: string[];
	sort: NonNullable<AssetQuery["sort"]>;
}

const STATUSES: AssetStatus[] = ["draft", "in_review", "approved", "archived"];
const KINDS: AssetKind[] = ["image", "video", "document"];
const DEFAULT_SORT = "updatedAt:desc";

const SORTS = [
	"updatedAt:desc",
	"createdAt:desc",
	"name:asc",
	"name:desc",
	"sizeBytes:desc",
];

function readList<T extends string>(value: string | null, allowed: T[]): T[] {
	if (!value) return [];
	const chosen = value.split(",");
	return allowed.filter(item => chosen.includes(item));
}

function read(): Filters {
	const params = new URLSearchParams(window.location.search);
	const sort = params.get("sort") ?? "";

	return {
		q: params.get("q") ?? "",
		status: readList(params.get("status"), STATUSES),
		kind: readList(params.get("kind"), KINDS),
		tag: params.get("tag")?.split(",").filter(Boolean) ?? [],
		sort: (SORTS.includes(sort) ? sort : DEFAULT_SORT) as Filters["sort"],
	};
}

function write(filters: Filters) {
	const params = new URLSearchParams();
	if (filters.q) params.set("q", filters.q);
	if (filters.status.length) params.set("status", filters.status.join(","));
	if (filters.kind.length) params.set("kind", filters.kind.join(","));
	if (filters.tag.length) params.set("tag", filters.tag.join(","));
	if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);

	const search = params.toString();
	return search
		? `${window.location.pathname}?${search}`
		: window.location.pathname;
}

export function useUrlFilters() {
	const [filters, setFilters] = useState(read);

	useEffect(() => {
		const sync = () => setFilters(read());
		window.addEventListener("popstate", sync);
		return () => window.removeEventListener("popstate", sync);
	}, []);

	const apply = useCallback((changes: Partial<Filters>, replace = false) => {
		const next = { ...read(), ...changes };
		const url = write(next);

		if (replace) window.history.replaceState(null, "", url);
		else window.history.pushState(null, "", url);

		setFilters(read());
	}, []);

	return { filters, apply };
}
