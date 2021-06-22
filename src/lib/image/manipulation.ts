let worker: Worker = null;

const range = 2;

/**
 * @param img original image that we want to get the pixels from
 * @param uvmap list of uv coordinates (with range 0:1) that we want to get pixels from
 * @returns list of [r,g,b,a] (0:255) pixels on the coordinates provided
 */
export async function getPixelsFromUVMap(img: ImageData, uvmap: [u: number, v: number][]) {
	if (!window.Worker || true) {
		return new Promise((resolve: (data: [r: number, g: number, b: number, a: number][]) => void) =>
			resolve(_getPixelsFromUVMap(img, uvmap))
		);
	} else {
		if (!worker) {
			worker = new Worker('src/lib/image/webworkers/manipulation.js');
		}

		return new Promise(
			(resolve: (data: [r: number, g: number, b: number, a: number][]) => void) => {
				worker.onmessage = (e) => resolve(e.data);
				worker.postMessage([img, uvmap]);
			}
		);
	}
}

/**
 * get [r, g, b, a] from the image
 *
 * @param img original image
 * @param u range 0:1
 * @param v range 0:1
 */
function _getPixelFromUV(img, u, v) {
	const vWeight = img.height / range;
	const uWeight = img.width / range;
	const half = range / 2;

	if (u >= half || v >= half || u < -half || v < -half) return [0, 0, 0, 0];

	const imgU = Math.floor((u + half) * uWeight);
	const imgV = Math.floor((v + half) * vWeight);

	const i = (img.width * imgV + imgU) * 4;

	const pixel = [img.data[i + 0], img.data[i + 1], img.data[i + 2], img.data[i + 3]];

	return pixel;
}

/**
 * @param img original image that we want to get the pixels from
 * @param uvmap list of uv coordinates (with range 0:1) that we want to get pixels from
 * @returns list of [r,g,b,a] (0:255) pixels on the coordinates provided
 */
function _getPixelsFromUVMap(img, uvmap) {
	return uvmap.map(([u, v]) => _getPixelFromUV(img, u, v));
}

export function uvMapFromDimensions(width, height) {
	const uvmap = Array(width * height);

	const vWeight = range / height;
	const uWeight = range / width;
	const half = range / 2;

	for (let v = 0; v < height; v++) {
		const cursor = v * width;
		for (let u = 0; u < height; u++) {
			uvmap[cursor + u] = [u * uWeight - half, v * vWeight - half];
		}
	}
	return uvmap;
}
