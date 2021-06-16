<script lang="ts">
	import { goto } from '$app/navigation';

	import { session } from '$app/stores';
	import { onMount } from 'svelte';

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
		const imgU = Math.floor(u * img.width);
		const imgV = Math.floor(v * img.height);

		const i = (img.width * imgV + imgU) * 4;

		const pixel = [img.data[i + 0], img.data[i + 1], img.data[i + 2], img.data[i + 3]];

		return pixel;
	}

	function drawLoop() {
		if (transform === cachedTransform) {
			requestAnimationFrame(drawLoop);
			return;
		}

		let img = view.getContext('2d').createImageData(view.width, view.height);
		for (let i = 0; i < img.width * img.height; i++) {
			const index = i * 4;
			const u = i % img.width;
			const v = Math.floor(i / img.width);
			const [r, g, b, a] = getPixelFromUV(originalImage, u / img.width, v / img.height);

			img.data[index + 0] = r;
			img.data[index + 1] = g;
			img.data[index + 2] = b;
			img.data[index + 3] = a;
		}
		view.getContext('2d').putImageData(img, 0, 0);

		requestAnimationFrame(drawLoop);
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

		requestAnimationFrame(drawLoop);
	});
</script>

<main>
	<canvas class="viewer" bind:this={view} width="1000" height="1000">
		This webapp requires javascript
	</canvas>
	<canvas hidden bind:this={handle} />
</main>

<style>
	.viewer {
		border: 1px solid black;
	}
</style>
