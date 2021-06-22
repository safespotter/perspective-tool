let worker = null;

export function applyTransform(point: [u: number, v: number], transform: number[][]) {
	const p = [...point, 1];
	const tP = transform.map((row) => row.reduce((acc, _, i) => acc + row[i] * p[i], 0));
	return tP;
}

export async function mapTransform(uvmap: [u: number, v: number][], transform: number[][]) {
	if (!window.Worker || true) {
		return new Promise((resolve: (data: number[][]) => void) => {
			let res = uvmap.map((p) => applyTransform(p, transform));
			res = res.map((arr) => {
				const a = arr.map((n) => n / arr[3]);
				return [a[0], a[1]];
				// return a;
			});
			resolve(res);
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

export function rotationXAxis(radians: number) {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	return [
		[1, 0, 0, 0],
		[0, c, -s, 0],
		[0, s, c, 0],
		[0, 0, 0, 1],
	];
}

export function rotationYAxis(radians: number) {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	return [
		[c, 0, s, 0],
		[0, 1, 0, 0],
		[-s, 0, c, 0],
		[0, 0, 0, 1],
	];
}

export function rotationZAxis(radians: number) {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	return [
		[c, -s, 0, 0],
		[s, c, 0, 0],
		[0, 0, 1, 0],
		[0, 0, 0, 1],
	];
}

export function translate(x: number, y: number, z: number) {
	return [
		[1, 0, 0, x],
		[0, 1, 0, y],
		[0, 0, 1, z],
		[0, 0, 0, 1],
	];
}

export function scale(x: number, y: number, z: number) {
	return [
		[x, 0, 0, 0],
		[0, y, 0, 0],
		[0, 0, z, 0],
		[0, 0, 0, 1],
	];
}

export function restoreProjection(
	plane: [a: number, b: number, c: number, d: number],
	focusDistance: number
) {
	const [a, b, c, d] = plane;
	const f = focusDistance;
	const cf = c * f;
	const cfd = cf - d;

	/* prettier formats the matrix in a weird way, so here's a better version
	 *
	 *	[   cfd,      0,                0],
	 *	[     0,    cfd,                0],
	 *	[-f * a, -f * b, cf * f * (d + 1)],
	 *	[     a,      b,               cf],
	 */
	return [
		[cfd, 0, 0],
		[0, cfd, 0],
		[-f * a, -f * b, f * cfd],
		[a, b, cf],
	];
}
