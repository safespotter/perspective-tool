<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { session } from '$app/stores';
	import NumberInput from '$lib/NumberInput.svelte';

	import { createTransformHandle, restoreProjectionWithNavigation } from '$lib/image/transform';

	import type { TransformHandle } from '$lib/image/transform';

	import { onMount } from 'svelte';
	import { pi } from 'mathjs';

	const fileExtension = '_view.json';

	const resolution = 1080;
	let view: HTMLCanvasElement;
	let grid: HTMLCanvasElement;
	let transformHandle: TransformHandle;
	let downloader: HTMLAnchorElement;

	let showGrid = true;
	let cachedTransform: number[][] = null;

	let camera = {
		height: 0,
		focal: 1,
		pitch: 0,
		yaw: 0,
		roll: 0,
	};

	let navigation = {
		x: 0,
		y: 0,
		zoom: 0.5,
	};

	$: transform = restoreProjectionWithNavigation(camera, navigation);

	$: drawGrid(grid, view?.width, view?.height, navigation.zoom);

	async function drawGrid(grid: HTMLCanvasElement, width: number, height: number, zoom: number) {
		if (!grid || !width || !height || +zoom == 0 || +zoom == NaN) {
			return;
		}

		grid.width = width;
		grid.height = height;

		const ctx = grid.getContext('2d');
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
		if (transform.fullTranform === null) {
			transformHandle.canvas
				.getContext('2d')
				.clearRect(0, 0, transformHandle.canvas.width, transformHandle.canvas.height);
			setTimeout(transformerLoop);
			return;
		}

		if (transform.fullTranform === cachedTransform) {
			setTimeout(transformerLoop);
			return;
		}

		cachedTransform = transform.fullTranform;
		transformHandle.apply(transform.fullTranform);
		setTimeout(transformerLoop);
	}

	function download() {
		let name: string = $session.name;
		name = name.replace(/\.\w*$/, fileExtension);

		const data = {
			projection: transform.restoreProjectionTransform,
			inverseScale: transform.inverseScaleForVerticalProjection,
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application.json' });
		const url = URL.createObjectURL(blob);

		downloader.href = url;
		downloader.download = name;
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
		ctx.drawImage(transformHandle.canvas, 0, 0, view.width, view.height);
		if (showGrid) ctx.drawImage(grid, 0, 0, view.width, view.height);
		requestAnimationFrame(drawLoop);
	}

	enum MouseButton {
		left,
		right,
	}

	const movementMultiplier = 0.001;
	const wheelMultiplier = 0.0005;
	let mouseButton: MouseButton = null;
	let mousePos = { x: 0, y: 0 };

	function pointerdown(e: PointerEvent) {
		if (!view) {
			return;
		}

		const bcr = view.getBoundingClientRect();
		mousePos.x = e.clientX;
		mousePos.y = e.clientY;
		if (
			mousePos.x < bcr.left ||
			mousePos.x > bcr.right ||
			mousePos.y < bcr.top ||
			mousePos.y > bcr.bottom
		) {
			return;
		}

		switch (e.button) {
			case 0:
				mouseButton = MouseButton.left;
				break;
			case 2:
				mouseButton = MouseButton.right;
				break;
			default:
				mouseButton = null;
		}
	}
	function pointerup(e: PointerEvent) {
		mouseButton = null;
	}
	function pointermove(e: PointerEvent) {
		if (mouseButton != MouseButton.left) {
			return;
		}

		camera.pitch += (e.clientY - mousePos.y) * movementMultiplier;
		camera.yaw -= (e.clientX - mousePos.x) * movementMultiplier;

		mousePos.x = e.clientX;
		mousePos.y = e.clientY;
	}

	function wheel(e: WheelEvent) {
		let focalSqrt = Math.sqrt(Math.abs(camera.focal)) * Math.sign(camera.focal);
		focalSqrt -= e.deltaY * wheelMultiplier;
		camera.focal = focalSqrt * focalSqrt * Math.sign(focalSqrt);
	}

	onMount(() => {
		try {
			const type = $session.type;
			const source = $session.source;
			if (!type || !source) {
				throw new ReferenceError('No image found in session');
			}

			function start(image: HTMLImageElement) {
				transformHandle = createTransformHandle(resolution, image);
				setTimeout(transformerLoop);
				requestAnimationFrame(drawLoop);
			}

			switch (type) {
				case 'image':
					const image = new Image();
					image.onload = (e) => start(image);
					image.src = source;
					break;
				case 'video':
					const video = document.createElement('video');
					video.volume = 0;

					const videoCanvas = document.createElement('canvas');
					video.oncanplay = (e) => {
						videoCanvas.width = video.videoWidth;
						videoCanvas.height = video.videoHeight;
						videoCanvas.getContext('2d').drawImage(video, 0, 0);

						const image = new Image();
						image.onload = (e) => {
							start(image);
							video.remove();
							videoCanvas.remove();
						};
						image.src = videoCanvas.toDataURL();
					};

					video.src = source;
					break;
				default:
					throw new ReferenceError('Input type not supported');
			}
		} catch (e) {
			return goto(`${base}/`);
		}
	});
</script>

<svelte:window on:pointerdown={pointerdown} on:pointerup={pointerup} on:pointermove={pointermove} />

<main>
	<div class="with-drawer">
		<canvas class="viewer" bind:this={view} on:wheel|preventDefault={wheel}>
			This webapp requires javascript
		</canvas>
		<div class="drawer">
			<fieldset>
				<legend>Navigation</legend>
				<NumberInput
					label="Zoom"
					name="navigation-zoom"
					min={0.1}
					max={10}
					step={0.1}
					initialvalue={1}
					quadratic={true}
					bind:value={navigation.zoom}
				/>

				<NumberInput
					label="X"
					name="navigation-x"
					min={-1}
					max={1}
					step={0.01}
					bind:value={navigation.x}
				/>

				<NumberInput
					label="Y"
					name="navigation-y"
					min={-1}
					max={1}
					step={0.01}
					bind:value={navigation.y}
				/>
			</fieldset>
			<fieldset>
				<legend>Camera</legend>
				<NumberInput
					label="Focal length"
					name="focal"
					min={0}
					max={10}
					step={0.01}
					initialvalue={1}
					quadratic={true}
					bind:value={camera.focal}
				/>

				<NumberInput
					label="Height"
					name="height"
					min={0}
					max={10}
					step={0.02}
					quadratic={true}
					bind:value={camera.height}
				/>
				<NumberInput
					label="Pitch"
					name="pitch"
					min={-2 * pi}
					max={2 * pi}
					step={0.01}
					bind:value={camera.pitch}
				/>

				<NumberInput
					label="Yaw"
					name="yaw"
					min={-2 * pi}
					max={2 * pi}
					step={0.01}
					bind:value={camera.yaw}
				/>
			</fieldset>
			<div>
				<label for="toggle-grid">Grid</label>
				<input type="checkbox" bind:checked={showGrid} />
			</div>
		</div>
	</div>

	<button class="btn" on:click={download}>Save transform</button>
	<a href="{base}/" class="btn" draggable="false" on:selectstart|preventDefault>Back</a>
</main>

<canvas hidden bind:this={grid} />
<a hidden href="." download="" bind:this={downloader}>hidden</a>

<style>
	.with-drawer {
		display: flex;
		align-items: center;
		justify-items: center;
	}
	.viewer {
		border: 1px solid black;
		width: 100%;
	}
	.btn {
		margin: 1em auto;
	}

	.drawer {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.drawer > fieldset {
		width: max-content;
		margin: 0.3rem;
		padding: 0.3rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.drawer > fieldset > legend {
		margin: 0 auto;
	}

	.drawer input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		margin-left: 0.5ch;
	}
</style>
