<script lang="ts">
	import { add, multiply, inv, transpose } from 'mathjs';

	import { goto } from '$app/navigation';

	import { session } from '$app/stores';
	import { uvMapFromDimensions, getPixelsFromUVMap } from '$lib/image/manipulation';
	import {
		mapTransform,
		rotationZAxis,
		rotationYAxis,
		rotationXAxis,
		translate,
		restoreProjection,
	} from '$lib/image/transform';
	import { onMount } from 'svelte';

	const viewDim = 640;

	let view: HTMLCanvasElement;
	let handle: HTMLCanvasElement;

	let originalImage: ImageData = null;
	let cachedTransform: number[][] = null;
	let image: ImageData = null;
	let uvmap: [u: number, v: number][][];

	let rotation = {
		pitch: 0,
		yaw: 0,
		roll: 0,
	};

	let translation = {
		x: 0,
		y: 0,
		z: 10,
	};

	let focusLength = 1;

	$: cameraRotation = multiply(
		rotationZAxis(Number(rotation.roll)),
		multiply(rotationYAxis(Number(rotation.yaw)), rotationXAxis(Number(rotation.pitch)))
	);

	$: imageTransform = multiply(
		translate(Number(translation.x), Number(translation.y), Number(translation.z)),
		multiply(cameraRotation, translate(0, 0, Number(focusLength)))
	);

	$: inverseImageTransform = inv(imageTransform);

	$: planeOrigin = multiply(inverseImageTransform, transpose([0, 0, 0, 1])).flat();

	$: planeNormal = multiply(inv(cameraRotation), transpose([0, 0, -1, 1])).flat();

	$: plane = [
		planeNormal[0],
		planeNormal[1],
		planeNormal[2],
		planeNormal[0] * planeOrigin[0] +
			planeNormal[1] * planeOrigin[1] +
			planeNormal[2] * planeOrigin[2],
	];

	$: projection = restoreProjection(plane, focusLength);

	$: transform = multiply(inverseImageTransform, projection);

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
				v: offset[1],
			},
			dimensions: {
				width: viewWidth,
				height: viewHeight,
			},
		};
	}

	async function drawLoop() {
		if (transform === cachedTransform) {
			setTimeout(drawLoop);
			return;
		}

		cachedTransform = transform;
		const transformedUvMap = await mapTransform(uvmap, transform);
		const pixels = await getPixelsFromUVMap(originalImage, transformedUvMap);

		for (let i = 0; i < image.width * image.height; i++) {
			image.data[i * 4 + 0] = pixels[i][0];
			image.data[i * 4 + 1] = pixels[i][1];
			image.data[i * 4 + 2] = pixels[i][2];
			image.data[i * 4 + 3] = pixels[i][3];
		}
		view.getContext('2d').putImageData(image, 0, 0);

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
			uvmap = uvMapFromDimensions(view.width, view.height);
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

	<label for="focus">Focus length</label>
	<input
		type="number"
		name="focus"
		id="focus"
		min=".1"
		max="10"
		step=".1"
		bind:value={focusLength}
	/>
	<fieldset>
		<legend>Camera Position</legend>
		<label for="x">X</label>
		<input
			type="number"
			name="x"
			id="x"
			min="-100"
			max="100"
			step=".1"
			bind:value={translation.x}
		/>
		<label for="y">Y</label>
		<input
			type="number"
			name="y"
			id="y"
			min="-100"
			max="100"
			step=".1"
			bind:value={translation.y}
		/>
		<label for="z">Z</label>
		<input
			type="number"
			name="z"
			id="x"
			min="-100"
			max="100"
			step=".1"
			bind:value={translation.z}
		/>
	</fieldset>
	<fieldset>
		<legend>Camera Rotation</legend>
		<label for="x">X</label>
		<input
			type="number"
			name="x"
			id="x"
			min="-100"
			max="100"
			step=".1"
			bind:value={rotation.pitch}
		/>
		<label for="y">Y</label>
		<input type="number" name="y" id="y" min="-100" max="100" step=".1" bind:value={rotation.yaw} />
		<label for="z">Z</label>
		<input
			type="number"
			name="z"
			id="x"
			min="-100"
			max="100"
			step=".1"
			bind:value={rotation.roll}
		/>
	</fieldset>
</main>

<canvas hidden bind:this={handle} />

<style>
	.viewer {
		border: 1px solid black;
	}
</style>
