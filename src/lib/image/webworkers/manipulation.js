/**
 * get [r, g, b, a] from the image
 *
 * @param img original image
 * @param u range 0:1
 * @param v range 0:1
 */
function _getPixelFromUV(img, u, v) {
	if (u >= 1 || v >= 1 || u < 0 || v < 0) return [0, 0, 0, 0];

	const imgU = Math.floor(u * img.width);
	const imgV = Math.floor(v * img.height);

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

onmessage = (e) => {
	const [img, uvmap] = e.data;
	postMessage(_getPixelsFromUVMap(img, uvmap));
};
