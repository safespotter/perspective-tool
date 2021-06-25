import { GPU } from 'gpu.js';
let gpu: GPU = null;

export async function mapTransform2d(uvmap: [u: number, v: number][][], transform: number[][]) {
	if (!gpu) {
		gpu = new GPU();
	}

	const _mapTransform = gpu
		.createKernel(function (uvmap: [u: number, v: number][][], transform: number[][]) {
			const vec = [
				uvmap[this.thread.y][this.thread.x][0],
				uvmap[this.thread.y][this.thread.x][1],
				1,
			];
			const res = [0, 0, 0, 0];
			for (let i = 0; i < 3; i++) {
				for (let j = 0; j < 3; j++) {
					res[i] += vec[j] * transform[i][j];
				}
			}
			if (res[2] === 0) {
				res[2] = 0.000001;
			}
			return [res[0] / res[2], res[1] / res[2]];

			// if (res[3] === 0) {
			// 	res[3] = 0.000001;
			// }
			// return [res[0] / res[3], res[1] / res[3]];
			// return [res[0] / res[3], res[1] / res[3], res[2] / res[3]];
			// return res;
		})
		.setOutput([uvmap.length, uvmap[0].length]);

	return new Promise((resolve: (data: [u: number, v: number][][]) => void) => {
		const res = _mapTransform(uvmap, transform) as [u: number, v: number][][];
		resolve(res);
	});
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

export function translate2d(x: number, y: number) {
	return [
		[1, 0, x],
		[0, 1, y],
		[0, 0, 1],
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

export function scale2d(x: number, y: number) {
	return [
		[x, 0, 0],
		[0, y, 0],
		[0, 0, 1],
	];
}

export function zoom2d(s: number) {
	return [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, s],
	];
}

export function tr2dTo3d(zEquation: [A: number, B: number, C: number] = [0, 0, 0]) {
	return [[1, 0, 0], [0, 1, 0], [...zEquation], [0, 0, 1]];
}

export function tr3dTo2d() {
	return [
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, 0, 1],
	];
}

export function restoreProjection(
	plane: [a: number, b: number, c: number, d: number],
	focusDistance: number
) {
	const [a, b, c, d] = plane;
	const f = focusDistance;
	return [
		[-c * f - d, 0, 0],
		[0, -c * f - d, 0],
		[f * a, f * b, d * f],
		[a, b, -c * f],
	];
}
