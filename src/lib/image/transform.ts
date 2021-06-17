let worker = null;

export function uvMapFromDimensions(width, height) {
	const uvmap = Array(width * height);
	for (let v = 0; v < height; v++) {
		const offset = v * width;
		for (let u = 0; u < height; u++) {
			uvmap[offset + u] = [u / width, v / height];
		}
	}
	return uvmap;
}

export function applyTransform(
	point: [u: number, v: number],
	transform: number[][]
): [u: number, v: number] {
	const p = [...point, 1];
	const tP = transform.map((row) => row.reduce((acc, _, i) => acc + row[i] * p[i], 0));

	const transformedPoint = tP.map((n) => n / tP[tP.length - 1]).slice(0, -1);
	return transformedPoint as [u: number, v: number];
}

export async function mapTransform(uvmap: [u: number, v: number][], transform: number[][]) {
	if (!window.Worker) {
		console.log('ew');
		return new Promise((resolve: (data: [u: number, v: number][]) => void) => {
			uvmap.map((p) => applyTransform(p, transform));
			resolve(uvmap);
		});
	} else {
		if (!worker) {
			worker = new Worker('src/lib/image/webworkers/transform.js');
		}

		return new Promise((resolve: (data: [u: number, v: number][]) => void) => {
			worker.onmessage = (e) => resolve(e.data);
			worker.postMessage([uvmap, transform]);
		});
	}
}
