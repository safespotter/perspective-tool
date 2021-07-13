<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { session } from '$app/stores';

	import { multiply, inv, transpose } from 'mathjs';

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
		tr3dTo2d,
		inverseScaleForVerticalProjection,
	} from '$lib/image/transform';
	import { onMount } from 'svelte';

	let resolution = 360;
	let transformer: HTMLCanvasElement;
	let view: HTMLCanvasElement;
	let grid: HTMLCanvasElement;
	let downloader: HTMLAnchorElement;

	let showGrid = true;
	let originalImage: ImageData = null;
	let cachedTransform: number[][] = null;
	let image: ImageData = null;
	let uvmap: [u: number, v: number][][];

	$: {
		if (transformer) {
			transformer.width = resolution;
			transformer.height = resolution;
			image = transformer.getContext('2d').createImageData(transformer.width, transformer.height);
			uvmap = uvMapFromDimensions(transformer.width, transformer.height);
			cachedTransform = null;
		}
	}

	$: {
		if (grid) {
			grid.width = resolution;
			grid.height = resolution;
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
	$: projectionTransformNotTranslated = multiply(tr3dTo2d(), multiply(imageTransform, projection));
	let projectionTransform;
	$: {
		const translated_pointer: number[] = multiply(
			projectionTransformNotTranslated,
			transpose([navigation.x, -navigation.y, 1])
		);
		const translation = translate2d(
			translated_pointer[0] / translated_pointer[2],
			translated_pointer[1] / translated_pointer[2]
		);
		projectionTransform = multiply(inv(translation), projectionTransformNotTranslated);
	}

	let transform = null;
	$: {
		try {
			transform = multiply(inv(projectionTransform), zoom2d(navigation.zoom * navigation.zoom));
		} catch {
			transform = null;
		}
	}

	let transformedUvMap;

	$: drawGrid(grid?.getContext('2d'), resolution, resolution, navigation.zoom * navigation.zoom);

	async function drawGrid(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		zoom: number
	) {
		if (!ctx) {
			return;
		}

		ctx.strokeStyle = '#fff';
		ctx.lineWidth = 1;
		const centerX = width / 2;
		const centerY = height / 2;

		ctx.clearRect(0, 0, width, height);

		ctx.beginPath();
		for (let i = 0; i * 2 < width / zoom; i++) {
			const x = i * width * zoom;
			ctx.moveTo(centerX + x, 0);
			ctx.lineTo(centerX + x, height);

			ctx.moveTo(centerX - x, 0);
			ctx.lineTo(centerX - x, height);
		}
		for (let i = 0; i * 2 < height / zoom; i++) {
			const y = i * height * zoom;
			ctx.moveTo(0, centerY + y);
			ctx.lineTo(width, centerY + y);

			ctx.moveTo(0, centerY - y);
			ctx.lineTo(width, centerY - y);
		}
		ctx.stroke();
	}

	async function transformerLoop() {
		if (transform === null) {
			transformer.getContext('2d').clearRect(0, 0, resolution, resolution);
			setTimeout(transformerLoop);
			return;
		}

		if (transform === cachedTransform) {
			setTimeout(transformerLoop);
			return;
		}

		cachedTransform = transform;
		transformedUvMap = await mapTransform2d(uvmap, transform);
		const pixels = await getPixelsFromUVMap(originalImage, transformedUvMap);

		for (let i = 0; i < image.width * image.height; i++) {
			image.data[i * 4 + 0] = pixels[i][0];
			image.data[i * 4 + 1] = pixels[i][1];
			image.data[i * 4 + 2] = pixels[i][2];
			image.data[i * 4 + 3] = pixels[i][3];
		}
		transformer.getContext('2d').putImageData(image, 0, 0);
		setTimeout(transformerLoop);
	}

	function download() {
		const data = {
			projection: projectionTransform,
			inverseScale: inverseScaleForVerticalProjection(plane, camera.focal),
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application.json' });
		const url = URL.createObjectURL(blob);

		downloader.href = url;
		downloader.download = `${+Date.now()}.json`;
		downloader.click();

		URL.revokeObjectURL(url);
	}

	function drawLoop() {
		if (!view) {
			requestAnimationFrame(drawLoop);
			return;
		}

		view.width = view.clientWidth;
		view.height = view.clientWidth;

		const ctx = view.getContext('2d');
		ctx.clearRect(0, 0, view.width, view.height);
		ctx.drawImage(transformer, 0, 0, view.width, view.height);
		if (showGrid) ctx.drawImage(grid, 0, 0, view.width, view.height);
		requestAnimationFrame(drawLoop);
	}

	onMount(() => {
		try {
			originalImage = $session.imageData;
		} catch (e) {
			return goto(`${base}/`);
		}

		setTimeout(transformerLoop);
		requestAnimationFrame(drawLoop);
	});
</script>

<main>
	<canvas class="viewer" bind:this={view}> This webapp requires javascript </canvas>

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
			bind:value={resolution}
		/>

		<label for="toggle-grid">Toggle grid</label>
		<input type="checkbox" bind:checked={showGrid} />
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
	<button class="btn" on:click={download}>Save transform</button>
	<a href="{base}/" class="btn">Back</a>
</main>

<canvas hidden bind:this={transformer} width={resolution} height={resolution} />
<canvas hidden bind:this={grid} />
<a hidden href="." download="" bind:this={downloader}>hidden</a>

<style>
	.viewer {
		border: 1px solid black;
		width: 100%;
	}
	.btn {
		margin: 1em auto;
	}

	label + * + label {
		margin-left: 1.5ch;
	}
</style>
