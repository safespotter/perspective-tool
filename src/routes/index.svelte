<script lang="ts">
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
		// const numOfChunks = Math.floor(imageData.data.length / 4);
		// const chunks: Uint8ClampedArray[] = [];
		// for (let i = 0; i < numOfChunks; i++) {
		// 	if (i % 4 !== 0) continue;

		// 	const index = i / 4;
		// 	const chunk = imageData.data.slice(index, index + 4);
		// 	chunks.push(i);
		// }

		// session.set({ imgPixels: chunks });
		// session.set({ imageData });
		$session = { ...session, imageData: imageData };
		goto('/perspective');
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
