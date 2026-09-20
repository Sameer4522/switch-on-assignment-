import { formatBytes, formatDate, statusLabel } from "@/lib/format";
import type { Asset } from "@/lib/types";
import { memo } from "react";
import { Thumbnail } from "./Thumbnail";

interface Props {
	asset: Asset;
	index: number;
	selected: boolean;
	active: boolean;
	onOpen: (id: string) => void;
	onToggle: (id: string, index: number) => void;
	onExtend: (index: number) => void;
}

export const AssetCard = memo(function AssetCard({
	asset,
	index,
	selected,
	active,
	onOpen,
	onToggle,
	onExtend,
}: Props) {
	return (
		<div
			className={
				"card" +
				(selected ? " card--selected" : "") +
				(active ? " card--active" : "")
			}
			onClick={event => {
				if (event.shiftKey) onExtend(index);
				else onOpen(asset.id);
			}}
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
				checked={selected}
				onClick={event => event.stopPropagation()}
				onChange={() => onToggle(asset.id, index)}
			/>
		</div>
	);
});
