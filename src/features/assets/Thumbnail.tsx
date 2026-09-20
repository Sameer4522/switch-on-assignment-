import { thumbnailUrl } from "@/api/client";
import type { Asset } from "@/lib/types";
import { useState } from "react";

interface Props {
	asset: Asset;
	className: string;
}

export function Thumbnail({ asset, className }: Props) {
	const [failed, setFailed] = useState(false);
	const missing = !asset.hasThumbnail || failed;

	return (
		<img
			className={missing ? `${className} thumb--missing` : className}
			src={missing ? "/missing_img.png" : thumbnailUrl(asset.id)}
			alt=""
			width={320}
			height={200}
			loading="lazy"
			onError={() => setFailed(true)}
		/>
	);
}
