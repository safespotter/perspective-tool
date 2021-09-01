<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { session } from '$app/stores';
	import { Ruler } from '$lib/Ruler';
	import NumberInput from '$lib/NumberInput.svelte';
	import ToggleButton from '$lib/ToggleButton.svelte';

	import { createTransformHandle, computeTransform } from '$lib/transform';

	import type { TransformHandle } from '$lib/transform';

	import { onMount } from 'svelte';
	import { multiply, pi, inv } from 'mathjs';
	import type { Camera, Mat3, Navigation, Vec2, Vec3 } from '$lib/shared';

	const fileExtension = '_view.json';

	const resolution = 1080;
	let view: HTMLCanvasElement;
	let transformHandle: TransformHandle;
	let downloader: HTMLAnchorElement;

	let showOriginal = false;
	let editRulers = false;
	let cachedTransform: number[][] = null;

	let camera: Camera = {
		height: 0,
		focal: 1,
		pitch: 0,
		yaw: 0,
		roll: 0,
	};

	let navigation: Navigation = {
		x: 0,
		y: 0,
		zoom: 0.5,
	};

	$: viewTransform = showOriginal
		? ([
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 2],
		  ] as Mat3)
		: computeTransform({ ...camera, height: 0 }, navigation);

	$: realTransform = computeTransform(camera, { x: 0, y: 0, zoom: 1 });

	let rulers: Ruler[] = [];
	let activeRuler: Ruler = null;

	$: {
		rulers.forEach((r) => r.setViewTransform(viewTransform));
		activeRuler?.setViewTransform(viewTransform);
	}

	$: rulers.forEach((r) => r.setRealTransform(realTransform));

	async function transformerLoop() {
		if (viewTransform === null) {
			transformHandle.canvas
				.getContext('2d')
				.clearRect(0, 0, transformHandle.canvas.width, transformHandle.canvas.height);
			setTimeout(transformerLoop);
			return;
		}

		if (viewTransform === cachedTransform) {
			setTimeout(transformerLoop);
			return;
		}

		cachedTransform = viewTransform;
		transformHandle.apply(viewTransform);
		setTimeout(transformerLoop);
	}

	function download() {
		let name: string = $session.name;
		name = name.replace(/\.\w*$/, fileExtension);

		const data = {
			camera: camera,
			projection: realTransform,
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
		ctx.strokeStyle = '#0f0';
		ctx.fillStyle = '#0f0';
		ctx.font = '24px Arial';
		rulers.forEach((ruler) => {
			let points = ruler.get2d();
			points = points.map((p) => p.map((x) => (x + 0.5) * view.height)) as [Vec2, Vec2];
			points.forEach((p) => drawPoint(ctx, p));
			ctx.beginPath();
			ctx.moveTo(points[0][0], points[0][1]);
			ctx.lineTo(points[1][0], points[1][1]);
			ctx.stroke();
			const midPoint = ruler.getMidPoint().map((x) => (x + 0.5) * view.height);
			ctx.fillText(`${ruler.getLength().toFixed(2)}m`, midPoint[0] - 24, midPoint[1]);
		});
		activeRuler
			? drawPoint(ctx, activeRuler.get2d()[0].map((x) => (x + 0.5) * view.height) as Vec2)
			: null;

		requestAnimationFrame(drawLoop);
	}

	function drawPoint(ctx: CanvasRenderingContext2D, point: Vec2) {
		ctx.beginPath();
		ctx.arc(point[0], point[1], 3, 0, 2 * 3.15);
		ctx.stroke();
		ctx.fill();
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
				if (editRulers) {
					let xpos = (mousePos.x - bcr.left) / view.height - 0.5;
					let ypos = (mousePos.y - bcr.top) / view.height - 0.5;
					pointRuler(xpos, ypos);
				}
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
		if (editRulers || mouseButton != MouseButton.left) {
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

	function pointRuler(xpos, ypos) {
		const point: Vec3 = [xpos, ypos, 1];
		if (activeRuler != null) {
			activeRuler.add(point);
			activeRuler.setRealTransform(realTransform);
			rulers.push(activeRuler);
			activeRuler = null;
		} else {
			activeRuler = new Ruler();
			activeRuler.setViewTransform(viewTransform);
			activeRuler.add(point);
		}
	}

	function clearRulers() {
		rulers = [];
		activeRuler = null;
	}

	onMount(() => {
		try {
			const imgData: ImageData = $session.imgData;
			if (!imgData) {
				throw new ReferenceError('No image found in session');
			}

			function start(image: HTMLImageElement) {
				transformHandle = createTransformHandle(resolution, image);
				setTimeout(transformerLoop);
				requestAnimationFrame(drawLoop);
			}

			const loader = document.createElement('canvas');
			loader.width = imgData.width;
			loader.height = imgData.height;
			loader.getContext('2d').putImageData(imgData, 0, 0);

			const img = new Image();
			img.onload = (e) => {
				start(img);
				img.remove();
				loader.remove();
			};
			img.src = loader.toDataURL();
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
					min={0}
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
					max={15}
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

			<ToggleButton bind:flag={showOriginal}>Show original</ToggleButton>
			<div class="row">
				<ToggleButton bind:flag={editRulers}>Rulers</ToggleButton>
				<button class="btn" on:click={clearRulers}>Clear</button>
			</div>
		</div>
	</div>

	<button class="btn" on:click={download}>Save transform</button>
	<a href="{base}/" class="btn" draggable="false" on:selectstart|preventDefault>Back</a>
</main>

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

	.row {
		display: flex;
		flex-direction: row;
	}
</style>
