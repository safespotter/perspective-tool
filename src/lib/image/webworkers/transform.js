function applyTransform(point, transform) {
	const p = [...point, 1];
	const tP = transform.map((row) => row.reduce((acc, _, i) => acc + row[i] * p[i], 0));
	return tP;
}

function mapTransform(uvmap, transform) {
	return uvmap.map((p) => applyTransform(p, transform));
}

onmessage = (e) => {
	const [uvmap, transform] = e.data;
	postMessage(mapTransform(uvmap, transform));
};
