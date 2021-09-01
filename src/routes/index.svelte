<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { session } from '$app/stores';

	let imagePicker: HTMLInputElement;
	let videoPicker: HTMLInputElement;
	let canvas: HTMLCanvasElement;

	function onPick(files: FileList, type: string) {
		const blob = files[0];
		const reader = new FileReader();
		reader.onload = (e) => parseData(e.target.result as string, type, blob.name);
		reader.readAsDataURL(blob);
	}

	function parseData(source, type, name) {
		switch (type) {
			case 'image':
				const image = new Image();
				image.onload = (e) => {
					canvas.width = image.width;
					canvas.height = image.height;
					const ctx = canvas.getContext('2d');
					ctx.drawImage(image, 0, 0);
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					loadSource(imgData, name);
				};
				image.src = source;
				break;
			case 'video':
				const video = document.createElement('video');
				video.volume = 0;
				video.oncanplay = (e) => {
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					const ctx = canvas.getContext('2d');
					ctx.drawImage(video, 0, 0);
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					loadSource(imgData, name);
				};
				video.src = source;
				break;
			default:
				throw new ReferenceError('Input type not supported');
		}
	}

	function loadSource(imgData, name) {
		$session = { ...session, imgData: imgData, name: name };
		goto(`${base}/perspective`);
	}
</script>

<main>
	<button class="btn" on:click={() => imagePicker.click()}> apri immagine </button>
	<button class="btn" on:click={() => videoPicker.click()}> apri video </button>

	<input
		hidden
		type="file"
		bind:this={imagePicker}
		accept="image/*"
		on:change={() => onPick(imagePicker.files, 'image')}
	/>
	<input
		hidden
		type="file"
		bind:this={videoPicker}
		accept="video/*"
		on:change={() => onPick(videoPicker.files, 'video')}
	/>
</main>

<canvas hidden bind:this={canvas}>This app requires JS</canvas>

<style>
	.btn {
		margin-bottom: 0.3rem;
	}
</style>
