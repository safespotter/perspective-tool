<script lang="ts">
	import { goto } from '$app/navigation';

	import { session } from '$app/stores';
	import { getPixelsFromUVMap } from '$lib/image/manipulation';
	import { onMount } from 'svelte';

	const viewDim = 480;

	let view: HTMLCanvasElement;
	let handle: HTMLCanvasElement;

	let originalImage: ImageData = null;
	let rotationAngle = 0;
	let cachedTransform: number[][] = null;
	let image: ImageData = null;

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

	function applyTransform(
		point: [u: number, v: number],
		transform: number[][]
	): [u: number, v: number] {
		const p = [...point, 1];
		if (p.length !== transform.length) {
			console.error('applyTransform: point and transform have different dimensions');
			return;
		}
		const tP = transform.map((row) => row.reduce((acc, _, i) => acc + row[i] * p[i], 0));

		const transformedPoint = tP.map((n) => n / tP[tP.length - 1]).slice(0, -1);
		return transformedPoint as [u: number, v: number];
	}

	async function drawLoop() {
		if (transform === cachedTransform) {
			setTimeout(drawLoop);
			return;
		}

		const uvmap = Array(view.width * view.height)
			.fill(0)
			.map((_, i) => {
				const u = (i % view.width) / view.width;
				const v = Math.floor(i / view.width) / view.height;
				return applyTransform([u, v], transform);
			});
		const pixels = await getPixelsFromUVMap(originalImage, uvmap);
		for (let i = 0; i < image.width * image.height; i++) {
			image.data[i * 4 + 0] = pixels[i][0];
			image.data[i * 4 + 1] = pixels[i][1];
			image.data[i * 4 + 2] = pixels[i][2];
			image.data[i * 4 + 3] = pixels[i][3];
		}
		view.getContext('2d').putImageData(image, 0, 0);

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
			image = view.getContext('2d').createImageData(view.width, view.height);
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
