import { GPU, KernelOutput } from 'gpu.js';
import { multiply, inv, e } from 'mathjs';

let gpu = new GPU();

function loadImage(image: HTMLImageElement | HTMLVideoElement) {
	const load = gpu
		.createKernel(function (input) {
			return input[this.thread.y][this.thread.x];
		})
		.setOutput([image.width, image.height])
		.setPipeline(true);

	return load(image);
}

export type TransformHandle = {
	canvas: HTMLCanvasElement;
	apply: (transform: any) => KernelOutput;
};

export function createTransformHandle(
	dimension,
	originalImage: HTMLImageElement | HTMLVideoElement
): TransformHandle {
	const texture = loadImage(originalImage);

	const texH = originalImage.height;
	const texW = originalImage.width;
	const texTsfNormal = multiply(translate2d(-texW / texH / 2, -0.5), scale2d(1 / texH, 1 / texH));

	function newKernel(dim) {
		const kernel = gpu
			.createKernel(function (texture, transform) {
				const v = [this.thread.x, this.thread.y, 1];
				const tv = [0, 0, 0];

				for (let i = 0; i < 3; i++) {
					tv[i] += transform[i][0] * v[0];
					tv[i] += transform[i][1] * v[1];
					tv[i] += transform[i][2] * v[2];
				}

				if (tv[2] == 0) {
					this.color(0, 0, 0, 0);
				} else {
					const p = [Math.floor(tv[0] / tv[2]), Math.floor(tv[1] / tv[2])];

					if (p[0] < 0 || p[0] > this.constants.texW || p[1] < 0 || p[1] > this.constants.texH) {
						this.color(0, 0, 0, 0);
					} else {
						const pixel = texture[p[1]][p[0]];
						this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
					}
				}
			})
			.setConstants({ texW, texH })
			.setDynamicOutput(true)
			.setOutput([dim, dim])
			.setGraphical(true);

		return kernel;
	}

	let kernel = newKernel(dimension);
	// no idea why but without this the dimension is wrong
	kernel.destroy(true);
	kernel = newKernel(dimension);

	const outTsfNormal = multiply(translate2d(-0.5, -0.5), scale2d(1 / dimension, 1 / dimension));

	return {
		canvas: kernel.canvas as HTMLCanvasElement,
		apply: (transform) => {
			try {
				let t = multiply(inv(multiply(transform, texTsfNormal)), outTsfNormal);
				return kernel(texture, t);
			} catch {
				kernel.canvas?.getContext('2d')?.clearRect(0, 0, dimension, dimension);
			}
		},
	};
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
	focalLength: number
) {
	const [a, b, c, d] = plane;
	const f = focalLength;
	return [
		[-c * f - d, 0, 0],
		[0, -c * f - d, 0],
		[f * a, f * b, d * f],
		[a, b, -c * f],
	];
}

export function inverseScaleForVerticalProjection(
	plane: [a: number, b: number, c: number, d: number],
	focalLength: number
) {
	const [a, b, c, d] = plane;
	const f = focalLength;

	const lambda = d + c * f;
	return [a / lambda, b / lambda, (c * f) / lambda];
}
