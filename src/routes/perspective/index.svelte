<script lang="ts">
	import { add, multiply, inv, transpose } from 'mathjs';

	import { goto } from '$app/navigation';

	import { session } from '$app/stores';
	import { uvMapFromDimensions, getPixelsFromUVMap } from '$lib/image/manipulation';
	import {
		mapTransform2d,
		rotationZAxis,
		rotationYAxis,
		rotationXAxis,
		translate,
		restoreProjection,
		translate2d,
		zoom2d,
		tr2dTo3d,
		tr3dTo2d,
	} from '$lib/image/transform';
	import { onMount } from 'svelte';

	let viewDim = 360;
	let view: HTMLCanvasElement;
	let handle: HTMLCanvasElement;

	let originalImage: ImageData = null;
	let cachedTransform: number[][] = null;
	let image: ImageData = null;
	let uvmap: [u: number, v: number][][];

	$: {
		if (view) {
			view.width = viewDim;
			view.height = viewDim;
			image = view.getContext('2d').createImageData(view.width, view.height);
			uvmap = uvMapFromDimensions(view.width, view.height);
			cachedTransform = null;
		}
	}

	let camera = {
		height: 1,
		focal: 1,
		pitch: 0,
		yaw: 0,
		roll: 0,
	};

	let navigation = {
		x: 0,
		y: 0,
		zoom: 0.75,
	};

	$: cameraRotation = multiply(
		rotationZAxis(Number(camera.roll)),
		multiply(rotationYAxis(Number(camera.yaw)), rotationXAxis(Number(camera.pitch)))
	);

	$: imageTransform = multiply(translate(0, 0, Number(camera.height)), cameraRotation);

	$: planeOrigin = multiply(inv(imageTransform), transpose([0, 0, 0, 1])).flat();
	$: planeNormal = multiply(inv(cameraRotation), transpose([0, 0, 1, 1])).flat();

	$: plane = [
		planeNormal[0],
		planeNormal[1],
		planeNormal[2],
		-(
			planeNormal[0] * planeOrigin[0] +
			planeNormal[1] * planeOrigin[1] +
			planeNormal[2] * planeOrigin[2]
		),
	] as [a: number, b: number, c: number, d: number];

	$: projection = restoreProjection(plane, camera.focal);
	$: projectionTransform = multiply(tr3dTo2d(), multiply(imageTransform, projection));

	$: navigationTransform = multiply(
		zoom2d(navigation.zoom * navigation.zoom),
		translate2d(Number(navigation.x), Number(-navigation.y))
	);

	let transform = null;
	$: {
		try {
			transform = multiply(inv(projectionTransform), navigationTransform);
		} catch {
			transform = null;
		}
	}

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
		if (transform === null || transform === cachedTransform) {
			setTimeout(drawLoop);
			return;
		}

		cachedTransform = transform;
		const transformedUvMap = await mapTransform2d(uvmap, transform);
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

	<fieldset>
		<legend>Navigation</legend>
		<label for="navigation-zoom">Zoom</label>
		<input
			type="number"
			name="navigation-zoom"
			id="navigation-zoom"
			min=".1"
			max="10"
			step=".1"
			bind:value={navigation.zoom}
		/>

		<label for="navigation-x">X</label>
		<input
			type="number"
			name="navigation-x"
			id="navigation-x"
			min="-100"
			max="100"
			step=".1"
			bind:value={navigation.x}
		/>

		<label for="navigation-y">Y</label>
		<input
			type="number"
			name="navigation-y"
			id="navigation-y"
			min="-100"
			max="100"
			step=".1"
			bind:value={navigation.y}
		/>
		<label for="resolution">Resolution</label>
		<input
			type="number"
			name="resolution"
			id="resolution"
			min="120"
			max="600"
			step="120"
			bind:value={viewDim}
		/>
	</fieldset>
	<fieldset>
		<legend>Camera</legend>
		<label for="focal">Focal length</label>
		<input
			type="number"
			name="focal"
			id="focal"
			min=".1"
			max="10"
			step=".1"
			bind:value={camera.focal}
		/>

		<label for="height">Height</label>
		<input
			type="number"
			name="height"
			id="height"
			min="-100"
			max="100"
			step=".1"
			bind:value={camera.height}
		/>
		<hr />
		<label for="pitch">Pitch</label>
		<input
			type="number"
			name="pitch"
			id="pitch"
			min="-100"
			max="100"
			step=".1"
			bind:value={camera.pitch}
		/>

		<label for="yaw">Yaw</label>
		<input
			type="number"
			name="yaw"
			id="yaw"
			min="-100"
			max="100"
			step=".1"
			bind:value={camera.yaw}
		/>

		<label for="roll">Roll</label>
		<input
			type="number"
			name="roll"
			id="roll"
			min="-100"
			max="100"
			step=".1"
			bind:value={camera.roll}
		/>
	</fieldset>
	<a href="/" class="btn">Back</a>
</main>

<canvas hidden bind:this={handle} />

<style>
	.viewer {
		border: 1px solid black;
	}
	.btn {
		margin: 1em auto;
	}

	label + * + label {
		margin-left: 1.5ch;
	}
</style>
