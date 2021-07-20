<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { session } from '$app/stores';

	let imagePicker: HTMLInputElement;
	let videoPicker: HTMLInputElement;

	function onPick(files: FileList, type: string) {
		const imgBlob = files[0];
		const reader = new FileReader();
		reader.onload = (e) => loadSource(e.target.result as string, type, imgBlob.name);
		reader.readAsDataURL(imgBlob);
	}

	function loadSource(source, type, name) {
		$session = { ...session, source: source, type: type, name: name };
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

<style>
	.btn {
		margin-bottom: 0.3rem;
	}
</style>
