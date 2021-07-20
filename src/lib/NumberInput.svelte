<script lang="ts">
	export let initialvalue = 0;
	export let name = 'name';
	export let label = '';
	export let value = 0;
	export let min = -100;
	export let max = 100;
	export let step = 1;
	export let quadratic = false;

	const timeDelay = 0.3;
	const timestep = 0.1;
	const multiplierTimestep = 1;
	let stepMultiplier = 0.8;

	$: hiddenValue = quadratic ? Math.sqrt(Math.abs(value)) * Math.sign(value) : value;

	let functionExecutor = null;
	let multiplierExecutor = null;

	function increase() {
		hiddenValue = hiddenValue + step * stepMultiplier;
		value = quadratic ? hiddenValue * hiddenValue * Math.sign(hiddenValue) : hiddenValue;
		value = Math.min(value, max);
	}

	function decrease() {
		hiddenValue = hiddenValue - step * stepMultiplier;
		value = quadratic ? hiddenValue * hiddenValue * Math.sign(hiddenValue) : hiddenValue;
		value = Math.max(value, min);
	}

	function mouseDown(foo) {
		function _functionExecutor() {
			foo();
			functionExecutor = setTimeout(_functionExecutor, timestep * 1000);
		}

		function _multiplierExecutor() {
			stepMultiplier *= 2;
			multiplierExecutor = setTimeout(_multiplierExecutor, multiplierTimestep * 1000);
		}

		foo();

		functionExecutor = setTimeout(_functionExecutor, timeDelay * 1000);
		multiplierExecutor = setTimeout(_multiplierExecutor, multiplierTimestep * 1000);
	}

	function mouseUp() {
		stepMultiplier = 1;
		clearTimeout(functionExecutor);
		clearTimeout(multiplierExecutor);
	}

	function clickInput(e: PointerEvent) {
		// middle button
		if (e.button == 1) {
			e.preventDefault();
			value = initialvalue;
		}
	}
</script>

{#if label}
	<label class="label" for={name}>
		{label}
	</label>
{/if}
<div class="number-input">
	<button
		class="btn decrease"
		on:pointerdown={() => mouseDown(decrease)}
		on:pointerup={mouseUp}
		on:pointerleave={mouseUp}
	>
		&minus;
	</button>
	<input
		class="input"
		type="text"
		{name}
		bind:value
		on:change={() => (value = +value || 0)}
		on:pointerdown={clickInput}
	/>
	<button
		class="btn increase"
		on:pointerdown={() => mouseDown(increase)}
		on:pointerup={mouseUp}
		on:pointerleave={mouseUp}
	>
		&plus;
	</button>
</div>

<style>
	.number-input {
		font-size: 1em;
		display: flex;
		align-items: center;
		justify-content: space-evenly;
	}

	.label {
		width: 100%;
		text-align: center;
	}

	.increase {
		background-color: #4e7;
	}

	.decrease {
		background-color: #e47;
	}

	.increase,
	.decrease {
		font-size: 1em;
		padding: 0;
		width: 2em;
		height: 2em;
	}

	.input {
		font-size: 1em;
		margin: 0 0.3em;
		height: 2em;
		width: 6ch;
		text-align: center;
	}
</style>
