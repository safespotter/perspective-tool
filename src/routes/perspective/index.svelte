<script lang="ts">
	import { goto } from '$app/navigation';

	import { session } from '$app/stores';
	import { onMount } from 'svelte';

	const viewDim = 480;

	let view: HTMLCanvasElement;
	let handle: HTMLCanvasElement;

	let originalImage = null;
	let rotationAngle = 0;
	let cachedTransform = null;

	$: transform = [
		[Math.cos(rotationAngle), -Math.sin(rotationAngle), 0],
		[Math.sin(rotationAngle), Math.cos(rotationAngle), 0],
		[0, 0, 1]
	];

	function computeOffsetAndDimensions(
		view: { width: number; height: number },
		image: { width: number; height: number }
	) {
		const ratio = image.width / image.height;
		let viewWidth = view.width;
		let viewHeight = view.width / ratio;

		if (image.width < image.height) {
			viewWidth *= ratio;
			viewHeight *= ratio;
		}

		const offset = [(view.width - viewWidth) / 2, (view.height - viewHeight) / 2];
		return {
			offset: {
				u: offset[0],
				v: offset[1]
			},
			dimensions: {
				width: viewWidth,
				height: viewHeight
			}
		};
	}

	/**
	 * get [r, g, b, a] from the image
	 *
	 * @param img original image
	 * @param u range 0:1
	 * @param v range 0:1
	 */
	function getPixelFromUV(img: ImageData, u: number, v: number) {
		if (u >= 1 || v >= 1 || u < 0 || v < 0) return [0, 0, 0, 0];

		const imgU = Math.floor(u * img.width);
		const imgV = Math.floor(v * img.height);

		const i = (img.width * imgV + imgU) * 4;

		const pixel = [img.data[i + 0], img.data[i + 1], img.data[i + 2], img.data[i + 3]];

		return pixel;
	}

	function applyTransform(point: number[], transform: number[][]) {
		const p = [...point, 1];
		if (p.length !== transform.length) {
			console.error('applyTransform: point and transform have different dimensions');
			return;
		}
		const tP = transform.map((row) => row.reduce((acc, _, i) => acc + row[i] * p[i], 0));

		const transformedPoint = tP.map((n) => n / tP[tP.length - 1]).slice(0, -1);
		return transformedPoint;
	}

	function drawLoop() {
		if (transform === cachedTransform) {
			setTimeout(drawLoop);
			return;
		}

		let img = view.getContext('2d').createImageData(view.width, view.height);
		for (let i = 0; i < img.width * img.height; i++) {
			const index = i * 4;
			const u = (i % img.width) / img.width;
			const v = Math.floor(i / img.width) / img.height;

			const [tU, tV] = applyTransform([u, v], transform);

			const [r, g, b, a] = getPixelFromUV(originalImage, tU, tV);

			img.data[index + 0] = r;
			img.data[index + 1] = g;
			img.data[index + 2] = b;
			img.data[index + 3] = a;
		}
		view.getContext('2d').putImageData(img, 0, 0);

		cachedTransform = transform;
		setTimeout(drawLoop);
	}

	onMount(() => {
		try {
			const imageData: ImageData = $session.imageData;
			const handleCtx = handle.getContext('2d');

			const handleDim = Math.max(imageData.width, imageData.height);
			handle.width = handleDim;
			handle.height = handleDim;

			const { offset, dimensions } = computeOffsetAndDimensions(handle, imageData);
			handleCtx.putImageData(imageData, offset.u, offset.v);

			originalImage = handleCtx.getImageData(0, 0, handle.width, handle.height);
		} catch (e) {
			return goto('/');
		}

		setTimeout(drawLoop);
	});
</script>

<main>
	<canvas class="viewer" bind:this={view} width={viewDim} height={viewDim}>
		This webapp requires javascript
	</canvas>
	<input type="range" bind:value={rotationAngle} min="-3.15" max="3.15" step=".05" />
</main>

<canvas hidden bind:this={handle} />

<style>
	.viewer {
		border: 1px solid black;
	}
</style>
