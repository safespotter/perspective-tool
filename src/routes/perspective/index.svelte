<script lang="ts">
	import { goto } from '$app/navigation';

	import { session } from '$app/stores';
	import { onMount } from 'svelte';

	let view: HTMLCanvasElement;
	let handle: HTMLCanvasElement;

	onMount(() => {
		try {
			let imageData: ImageData = $session.imageData;
			handle.width = imageData.width;
			handle.height = imageData.height;

			const handleCtx = handle.getContext('2d');
			const viewCtx = view.getContext('2d');

			handleCtx.imageSmoothingEnabled = true;
			viewCtx.imageSmoothingEnabled = true;

			handleCtx.putImageData(imageData, 0, 0);
			viewCtx.drawImage(handle, 0, 0, view.width, view.height);
		} catch (e) {
			goto('/');
		}
	});
</script>

<main>
	<canvas class="viewer" bind:this={view}> This webapp requires javascript </canvas>
	<canvas hidden bind:this={handle} />
</main>

<style>
	.viewer {
		border: 1px solid black;
	}
</style>
