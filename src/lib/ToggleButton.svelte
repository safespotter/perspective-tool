<script lang="ts">
	export let flag = false;
</script>

<button class="btn {flag ? 'active' : 'passive'}" on:click={() => (flag = !flag)}>
	<slot />
</button>

<style>
	.active {
		background-color: #47e;
	}
	.active:hover {
		/* style later */
	}
	.active:active {
		/* style later */
	}
	.passive {
		background-color: #ccc;
	}
	.passive:hover {
		/* style later */
	}
	.passive:active {
		/* style later */
	}
</style>
