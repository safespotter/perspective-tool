import { scale2d, translate2d } from './transform';
import { multiply } from 'mathjs';

const range = 1;

/**
 * @param img original image that we want to get the pixels from
 * @param uvmap list of uv coordinates (with range 0:1) that we want to get pixels from
 * @returns list of [r,g,b,a] (0:255) pixels on the coordinates provided
 */
export async function getPixelsFromUVMap(img: ImageData, uvmap: [u: number, v: number][][]) {
	return new Promise((resolve: (data: [r: number, g: number, b: number, a: number][]) => void) =>
		resolve(_getPixelsFromUVMap(img, uvmap))
	);
}

/**
 * get [r, g, b, a] from the image
 *
 * @param img original image
 * @param u range 0:1
 * @param v range 0:1
 */
function _getPixelFromUV(img, u, v): [r: number, g: number, b: number, a: number] {
	if (u < 0 || v < 0 || u > img.width || v > img.height) return [0, 0, 0, 0];

	const imgU = Math.floor(u);
	const imgV = Math.floor(v);

	const i = (img.width * imgV + imgU) * 4;

	const pixel = [img.data[i + 0], img.data[i + 1], img.data[i + 2], img.data[i + 3]];

	return pixel as [r: number, g: number, b: number, a: number];
}

/**
 * @param img original image that we want to get the pixels from
 * @param uvmap list of uv coordinates (with range 0:1) that we want to get pixels from
 * @returns list of [r,g,b,a] (0:255) pixels on the coordinates provided
 */
function _getPixelsFromUVMap(img, uvmap: [u: number, v: number][][]) {
	const halfW = img.width / 2;
	const halfH = img.height / 2;
	const transform = multiply(translate2d(halfW, halfH), scale2d(img.height, img.height));

	return uvmap
		.map((row) =>
			row.map(([u, v]) => {
				const tuv = multiply(transform, [u, v, 1]);
				return _getPixelFromUV(img, tuv[0], tuv[1]);
			})
		)
		.flat();
}

export function uvMapFromDimensions(width, height) {
	const uvmap = [];

	const scale = scale2d(1 / height, 1 / height);
	const halfW = width / height / 2;
	const translation = translate2d(-halfW, -0.5);
	const transform = multiply(translation, scale);

	for (let v = 0; v < height; v++) {
		let row = [];
		for (let u = 0; u < width; u++) {
			const coords = [u, v, 1];
			const tcoords = multiply(transform, coords);
			row.push([tcoords[0], tcoords[1]]);
		}
		uvmap.push(row);
	}
	return uvmap as [u: number, v: number][][];
}
