import type { ApiError } from "@/api/client";
import {
	formatBytes,
	formatDate,
	formatDuration,
	statusLabel,
} from "@/lib/format";
import type { AssetStatus } from "@/lib/types";
import { useState } from "react";
import { Thumbnail } from "./Thumbnail";
import { useAsset, useSetAssetStatus } from "./useAsset";

const STATUSES: AssetStatus[] = ["draft", "in_review", "approved", "archived"];

interface Props {
	id: string;
	onClose: () => void;
}

export function AssetDetail({ id, onClose }: Props) {
	const { data: asset, isPending, error } = useAsset(id);
	const save = useSetAssetStatus(id);
	const [wanted, setWanted] = useState<AssetStatus | null>(null);

	const conflict = (save.error as ApiError | null)?.code === "version_conflict";

	function setStatus(status: AssetStatus) {
		if (!asset) return;
		setWanted(status);
		save.mutate({ version: asset.version, status });
	}

	function keepTheirs() {
		setWanted(null);
		save.reset();
	}

	return (
		<aside className="panel">
			<div className="panel__head">
				<h2>Asset detail</h2>
				<button onClick={onClose}>Close</button>
			</div>

			{isPending && <p className="muted">Loading…</p>}
			{error && <p className="error">This asset could not be loaded.</p>}

			{asset && (
				<div className="panel__body">
					<Thumbnail asset={asset} className="panel__thumb" />
					<h3>{asset.name}</h3>
					<dl className="facts">
						<dt>Id</dt>
						<dd>{asset.id}</dd>
						<dt>Kind</dt>
						<dd>{asset.kind}</dd>
						<dt>Size</dt>
						<dd>{formatBytes(asset.sizeBytes)}</dd>
						{asset.width && (
							<>
								<dt>Dimensions</dt>
								<dd>
									{asset.width}×{asset.height}
								</dd>
							</>
						)}
						{asset.durationSec && (
							<>
								<dt>Duration</dt>
								<dd>{formatDuration(asset.durationSec)}</dd>
							</>
						)}
						<dt>Owner</dt>
						<dd>{asset.owner.name}</dd>
						<dt>Updated</dt>
						<dd>{formatDate(asset.updatedAt)}</dd>
						<dt>Version</dt>
						<dd>{asset.version}</dd>
					</dl>

					{asset.tags.length > 0 && (
						<ul className="tags">
							{asset.tags.map(tag => (
								<li key={tag}>{tag}</li>
							))}
						</ul>
					)}

					{conflict && wanted && (
						<div className="conflict">
							<p>
								Someone else changed this asset while you had it open. It is now{" "}
								<strong>{statusLabel(asset.status)}</strong>.
							</p>
							<div className="row">
								<button onClick={() => setStatus(wanted)}>
									Still set {statusLabel(wanted).toLowerCase()}
								</button>
								<button onClick={keepTheirs}>Keep their change</button>
							</div>
						</div>
					)}

					{save.isError && !conflict && (
						<p className="error">That change did not save. Try again.</p>
					)}

					<p className="muted">Status</p>
					<div className="row">
						{STATUSES.map(status => (
							<button
								key={status}
								disabled={save.isPending || status === asset.status}
								onClick={() => setStatus(status)}
							>
								{statusLabel(status)}
							</button>
						))}
					</div>
				</div>
			)}
		</aside>
	);
}
