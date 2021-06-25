<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { session } from '$app/stores';

	let loader: HTMLCanvasElement;
	let imagePicker: HTMLInputElement;
	let videoPicker: HTMLInputElement;

	function onPickImage(files: FileList) {
		const imgBlob = files[0];

		const image = new Image();
		image.onload = (e) => loadImage(image);

		const reader = new FileReader();
		reader.onload = (e) => (image.src = e.target.result as string);
		reader.readAsDataURL(imgBlob);
	}

	function onPickVideo(files: FileList) {
		return;
	}

	function loadImage(image: HTMLImageElement) {
		loader.width = image.width;
		loader.height = image.height;

		const ctx = loader.getContext('2d');
		ctx.drawImage(image, 0, 0);
		const imageData = ctx.getImageData(0, 0, loader.width, loader.height);
		$session = { ...session, imageData: imageData };
		goto(`${base}/perspective`);
	}
</script>

<main>
	<button class="btn" on:click={() => imagePicker.click()}> apri immagine </button>
	<!-- <button class="btn" on:click={() => videoPicker.click()}> apri video </button> -->

	<input
		hidden
		type="file"
		bind:this={imagePicker}
		accept="image/*"
		on:change={() => onPickImage(imagePicker.files)}
	/>
	<input
		hidden
		type="file"
		bind:this={videoPicker}
		accept="video/*"
		on:change={() => onPickVideo(videoPicker.files)}
	/>

	<canvas hidden bind:this={loader} />
</main>
