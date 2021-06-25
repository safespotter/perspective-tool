let worker: Worker = null;
const range = 2;

/**
 * @param img original image that we want to get the pixels from
 * @param uvmap list of uv coordinates (with range 0:1) that we want to get pixels from
 * @returns list of [r,g,b,a] (0:255) pixels on the coordinates provided
 */
export async function getPixelsFromUVMap(img: ImageData, uvmap: [u: number, v: number][][]) {
	if (!window.Worker || true) {
		return new Promise((resolve: (data: [r: number, g: number, b: number, a: number][]) => void) =>
			resolve(_getPixelsFromUVMap(img, uvmap))
		);
	} else {
		// memory explodes here because we are copying the image on every call.
		// Gotta check on how to use transferables properly before re-enabling it.
		if (!worker) {
			worker = new Worker('src/lib/image/workers/manipulation.js');
		}

		return new Promise(
			(resolve: (data: [r: number, g: number, b: number, a: number][]) => void) => {
				worker.onmessage = (e) => resolve(e.data);
				worker.postMessage([img, uvmap, range]);
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
function _getPixelFromUV(img, u, v): [r: number, g: number, b: number, a: number] {
	const vWeight = img.height / range;
	const uWeight = img.width / range;
	const half = range / 2;

	if (u >= half || v >= half || u < -half || v < -half) return [0, 0, 0, 0];

	const imgU = Math.floor((u + half) * uWeight);
	const imgV = Math.floor((v + half) * vWeight);

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
	return uvmap.map((row) => row.map(([u, v]) => _getPixelFromUV(img, u, v))).flat();
}

export function uvMapFromDimensions(width, height) {
	const uvmap = [];

	const vWeight = range / height;
	const uWeight = range / width;
	const half = range / 2;

	for (let v = 0; v < height; v++) {
		let row = [];
		for (let u = 0; u < width; u++) {
			row.push([u * uWeight - half, v * vWeight - half]);
		}
		uvmap.push(row);
	}
	return uvmap as [u: number, v: number][][];
}
