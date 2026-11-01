/**
 * Trifecta boot loader.
 *
 * Intro (audio + lockup) plays on mount. The bar tracks real preload and
 * completes when the game is ready.
 *
 * Events on window:
 *   monkey-mayhem:preload-progress  detail: { done, total }  — also trifecta:preload-progress
 *   monkey-mayhem:ready             — also trifecta:ready; fade out and remove
 */
(() => {
	const root = document.getElementById("trifecta-site-loader");
	if (!root) return;

	const progress = root.querySelector(".site-loader-progress");
	const scriptSrc = document.currentScript && document.currentScript.src;
	const assetUrl = (file) => (scriptSrc ? new URL(file, scriptSrc).href : file);
	const startCue = new Audio(assetUrl("assets/wave-start.wav"));
	const logoCue = new Audio(assetUrl("assets/wave-logo.wav"));
	const timers = new Set();
	const ac = new AbortController();
	const { signal } = ac;
	let run = 0;
	let measured = false;
	let dismissed = false;
	let startedAt = 0;

	startCue.preload = "auto";
	logoCue.preload = "auto";

	function clearTimers() {
		timers.forEach(window.clearTimeout);
		timers.clear();
	}

	function later(callback, delay) {
		const id = window.setTimeout(() => {
			timers.delete(id);
			callback();
		}, delay);
		timers.add(id);
	}

	function stopAudio() {
		[startCue, logoCue].forEach((audio) => {
			try {
				audio.pause();
				audio.currentTime = 0;
			} catch {
				/* ignore locked / unloaded media */
			}
		});
	}

	function playCue(audio) {
		try {
			audio.currentTime = 0;
			const play = audio.play();
			if (play) play.catch(() => {});
		} catch {
			/* autoplay can be blocked */
		}
	}

	function setProgress(value) {
		const amount = Math.max(0, Math.min(1, Number(value) || 0));
		root.style.setProperty("--loader-progress", amount.toFixed(4));
		progress?.setAttribute("aria-valuenow", String(Math.round(amount * 100)));
	}

	function guessProgress(id) {
		const start = performance.now();
		const duration = 4200;

		function tick(now) {
			if (id !== run || measured || dismissed) return;
			const time = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - time, 2.6);
			setProgress(eased * 0.89);
			if (time < 1) requestAnimationFrame(tick);
		}

		requestAnimationFrame(tick);
	}

	function rewindMotion() {
		const nodes = [root, ...root.querySelectorAll(".site-loader-lockup, .site-loader-progress")];
		root.classList.remove("is-playing", "is-complete");
		nodes.forEach((node) => {
			node.style.animation = "none";
		});
		void root.offsetHeight;
		nodes.forEach((node) => {
			node.style.animation = "";
		});
		root.classList.add("is-playing");
	}

	function play() {
		run += 1;
		const id = run;
		clearTimers();
		stopAudio();
		measured = false;
		dismissed = false;
		startedAt = performance.now();
		setProgress(0);
		rewindMotion();
		playCue(startCue);

		later(() => {
			if (id !== run) return;
			playCue(logoCue);
		}, 1850);

		later(() => {
			if (id !== run || measured) return;
			guessProgress(id);
		}, 3000);
	}

	function removeRoot() {
		if (!root.isConnected) return;
		root.remove();
		window.dispatchEvent(new CustomEvent("monkey-mayhem:loader-done"));
	}

	function finishDismiss() {
		if (dismissed) return;
		dismissed = true;
		run += 1;
		ac.abort();
		clearTimers();
		stopAudio();
		setProgress(1);
		root.classList.add("is-complete");
		window.TrifectaWaves?.freeze();
		root.addEventListener(
			"animationend",
			(event) => {
				if (event.target !== root) return;
				removeRoot();
			},
			{ once: true },
		);
		window.setTimeout(removeRoot, 900);
	}

	function dismiss() {
		const wait = Math.max(0, 3400 - (performance.now() - startedAt));
		if (wait === 0) finishDismiss();
		else later(finishDismiss, wait);
	}

	function onProgress(event) {
		const done = Number(event.detail?.done) || 0;
		const total = Number(event.detail?.total) || 0;
		if (total <= 0 || dismissed) return;
		measured = true;
		setProgress(Math.min(0.89, done / total));
	}

	window.addEventListener("monkey-mayhem:preload-progress", onProgress, { signal });
	window.addEventListener("trifecta:preload-progress", onProgress, { signal });
	window.addEventListener("monkey-mayhem:ready", dismiss, { signal });
	window.addEventListener("trifecta:ready", dismiss, { signal });
	window.addEventListener(
		"pagehide",
		() => {
			run += 1;
			clearTimers();
			stopAudio();
		},
		{ signal },
	);

	window.TrifectaSiteLoader = { play, setProgress, dismiss };
	if (!new URLSearchParams(window.location.search).has("export")) void play();
})();
