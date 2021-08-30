import { GPU, KernelFunction, KernelOutput } from 'gpu.js';
import { multiply, inv, transpose, number, sum, subtract } from 'mathjs';

export type Vec4D = [a: number, b: number, c: number, d: number];

let gpu = new GPU();

function loadImage(image: HTMLImageElement) {
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

export function createTransformHandle(dimension, image: HTMLImageElement): TransformHandle {
	const texture = loadImage(image);

	const texH = image.height;
	const texW = image.width;
	const texTsfNormal = multiply(translate2d(-texW / texH / 2, 0.5), scale2d(1 / texH, -1 / texH));

	function newKernel(dim) {
		// the minifier breaks this kernel, so pass the function as a string
		const kernel = gpu
			.createKernel(
				(`function (texture, transform) {
				const v = [this.thread.x, this.thread.y, 1];
				const tv = [0, 0, 0];

				for (let i = 0; i < 3; i++) {
					tv[i] += transform[i][0] * v[0];
					tv[i] += transform[i][1] * v[1];
					tv[i] += transform[i][2] * v[2];
				}

				if (tv[2] === 0) {
					this.color(0, 0, 0, 0);
				} else {
					const x = Math.floor(tv[0] / tv[2]);
					const y = Math.floor(tv[1] / tv[2]);

					if (y < 0 || y > this.constants.texH || x < 0 || x > this.constants.texW) {
						this.color(0, 0, 0, 0);
					} else {
						const pixel = texture[y][x];
						this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
					}
				}
			}` as unknown) as KernelFunction
			)
			.setConstants({ texW, texH })
			.setOutput([dim, dim])
			.setGraphical(true);

		return kernel;
	}

	let kernel = newKernel(dimension);
	// no idea why but without destroying it once the dimension is wrong
	kernel.destroy(true);
	kernel = newKernel(dimension);

	const outTsfNormal = multiply(translate2d(-0.5, 0.5), scale2d(1 / dimension, -1 / dimension));

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

export function translatePlane(x: number, y: number, z: number) {
	return [
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, 1, 0],
		[-x, -y, -z, 1],
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

export function rotate2d(rad: number) {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return [
		[c, -s, 0],
		[s, c, 0],
		[0, 0, 1],
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

export function restoreProjection(plane: Vec4D, focalLength: number) {
	const [a, b, c, d] = plane;
	const f = focalLength;
	return [
		[-c * f - d, 0, 0],
		[0, -c * f - d, 0],
		[f * a, f * b, d * f],
		[a, b, -c * f],
	];
}

export function inverseScaleForVerticalProjection(plane: Vec4D, focalLength: number) {
	const [a, b, c, d] = plane;
	const f = focalLength;

	const lambda = d + c * f;
	return [a / lambda, b / lambda, (c * f) / lambda];
}

export function restoreProjectionWithNavigation(camera, navigation) {
	const cameraRotation = multiply(
		rotationZAxis(+camera.roll),
		multiply(rotationYAxis(+camera.yaw), rotationXAxis(+camera.pitch))
	);

	const imageTransform = multiply(translate(0, 0, +camera.height), cameraRotation);

	let planeOrigin = multiply(inv(imageTransform), [0, 0, 0, 1]).flat();
	planeOrigin = planeOrigin.map((x) => x / planeOrigin[3]);

	let plane = [0, 0, 1, 0];
	plane = multiply(inv(cameraRotation), plane).flat();
	plane = multiply(translatePlane(planeOrigin[0], planeOrigin[1], planeOrigin[2]), plane).flat();

	let projection = restoreProjection(plane as Vec4D, +camera.focal);
	projection = multiply(tr3dTo2d(), multiply(imageTransform, projection));

	let translated_pointer = multiply(projection, [-navigation.x, +navigation.y, 1]).flat();
	translated_pointer = translated_pointer.map((x) => x / translated_pointer[2]);
	const translation = translate2d(-translated_pointer[0], -translated_pointer[1]);

	let transform = multiply(translation, projection);
	transform = multiply(zoom2d(1 / +navigation.zoom), transform);

	return {
		fullTransform: transform,
		restoreProjectionTransform: projection,
		inverseScaleForVerticalProjection: inverseScaleForVerticalProjection(
			plane as Vec4D,
			+camera.focal
		),
	};
}
