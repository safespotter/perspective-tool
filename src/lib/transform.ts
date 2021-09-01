import { GPU, KernelFunction, KernelOutput } from 'gpu.js';
import { multiply, inv } from 'mathjs';
import type { Vec3, Mat3, Mat4, Vec4, Mat4x3, Mat3x4, Camera, Navigation } from '$lib/shared';

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
	apply: (transform: Mat3) => KernelOutput;
};

export function createTransformHandle(dimension: number, image: HTMLImageElement): TransformHandle {
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

export function rotationXAxis(radians: number): Mat4 {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	return [
		[1, 0, 0, 0],
		[0, c, -s, 0],
		[0, s, c, 0],
		[0, 0, 0, 1],
	];
}

export function rotationYAxis(radians: number): Mat4 {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	return [
		[c, 0, s, 0],
		[0, 1, 0, 0],
		[-s, 0, c, 0],
		[0, 0, 0, 1],
	];
}

export function rotationZAxis(radians: number): Mat4 {
	const c = Math.cos(radians);
	const s = Math.sin(radians);
	return [
		[c, -s, 0, 0],
		[s, c, 0, 0],
		[0, 0, 1, 0],
		[0, 0, 0, 1],
	];
}

export function translate(x: number, y: number, z: number): Mat4 {
	return [
		[1, 0, 0, x],
		[0, 1, 0, y],
		[0, 0, 1, z],
		[0, 0, 0, 1],
	];
}

export function translatePlane(x: number, y: number, z: number): Mat4 {
	return [
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, 1, 0],
		[-x, -y, -z, 1],
	];
}

export function translate2d(x: number, y: number): Mat3 {
	return [
		[1, 0, x],
		[0, 1, y],
		[0, 0, 1],
	];
}

export function scale(x: number, y: number, z: number): Mat4 {
	return [
		[x, 0, 0, 0],
		[0, y, 0, 0],
		[0, 0, z, 0],
		[0, 0, 0, 1],
	];
}

export function scale2d(x: number, y: number): Mat3 {
	return [
		[x, 0, 0],
		[0, y, 0],
		[0, 0, 1],
	];
}

export function zoom2d(s: number): Mat3 {
	return [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, s],
	];
}

export function rotate2d(rad: number): Mat3 {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return [
		[c, -s, 0],
		[s, c, 0],
		[0, 0, 1],
	];
}

export function tr2dTo3d(zEquation: Vec3 = [0, 0, 0]): Mat4x3 {
	return [[1, 0, 0], [0, 1, 0], [...zEquation], [0, 0, 1]];
}

export function tr3dTo2d(): Mat3x4 {
	return [
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, 0, 1],
	];
}

export function restoreProjection(plane: Vec4, focalLength: number): Mat4x3 {
	const [a, b, c, d] = plane;
	const f = focalLength;
	return [
		[-c * f - d, 0, 0],
		[0, -c * f - d, 0],
		[f * a, f * b, d * f],
		[a, b, -c * f],
	];
}

export function invProjScale(plane: Vec4, focalLength: number): Vec3 {
	const [a, b, c, d] = plane;
	const f = focalLength;

	const lambda = d + c * f;
	return [a / lambda, b / lambda, (c * f) / lambda];
}

export function computeTransform(camera: Camera, navigation: Navigation) {
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

	const projMat = restoreProjection(plane as Vec4, +camera.focal);
	const projTransform: Mat3 = (multiply(
		tr3dTo2d(),
		multiply(imageTransform, projMat)
	) as unknown) as Mat3;

	let translatedPointer = multiply(projTransform, [-navigation.x, +navigation.y, 1]).flat();
	translatedPointer = translatedPointer.map((x) => x / translatedPointer[2]);
	const translation = translate2d(-translatedPointer[0], -translatedPointer[1]);

	let transform = multiply(translation, projTransform);
	transform = multiply(zoom2d(1 / +navigation.zoom), transform);

	return transform;
}
