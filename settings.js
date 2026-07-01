// ─── State ───────────────────────────────────────────────────────────────────
let vrm = null;
let isSpeaking = false;
let currentText = "";
let visemeQueue = [];
let visemeIdx = 0;
let visemeTimer = 0;
let colors = ["cyan", "purple", "pink"];
let colorIdx = 0;

// ─── Viseme map: letter → VRM expression ─────────────────────────────────────
// Maps characters in transcription text to mouth shapes
const VISEME_MAP = {
	a: "aa",
	e: "ee",
	i: "ih",
	o: "oh",
	u: "ou",
	b: "aa",
	p: "aa",
	m: "aa",
	f: "ih",
	v: "ih",
	s: "ih",
	z: "ih",
	th: "ee",
	n: "ee",
	t: "ee",
	d: "ee",
	l: "ee",
	k: "oh",
	g: "oh",
	r: "oh",
	w: "ou",
	q: "ou",
	" ": null, // silence on space
};

const ALL_VISEMES = ["aa", "ih", "ou", "ee", "oh"];

// Build a viseme queue from transcription text
function buildVisemeQueue(text) {
	const queue = [];
	const lower = text.toLowerCase();
	for (let i = 0; i < lower.length; i++) {
		// check digraphs first
		const digraph = lower.slice(i, i + 2);
		if (VISEME_MAP[digraph]) {
			queue.push(VISEME_MAP[digraph]);
			i++; // skip next char
		} else {
			const v = VISEME_MAP[lower[i]];
			queue.push(v || null); // null = close mouth
		}
	}
	return queue;
}

// ─── Three.js setup ──────────────────────────────────────────────────────────
const canvas = document.getElementById("canvas");
const section = document.getElementById("avatar-section");

const renderer = new THREE.WebGLRenderer({
	canvas,
	alpha: true,
	antialias: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = 3001;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
camera.position.set(0, 0.8, 1.5);

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0x00f5ff, 0.2);
dirLight.position.set(1, 2, 3);
scene.add(dirLight);
const backLight = new THREE.DirectionalLight(0xb44fff, 0.8);
backLight.position.set(-2, 1, -2);
scene.add(backLight);

function resize() {
	const w = section.clientWidth;
	const h = section.clientHeight;
	renderer.setSize(w, h);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);

// ─── Natural pose ────────────────────────────────────────────────────────────
function getBone(vrm, name) {
	return vrm.humanoid?.getNormalizedBoneNode(name);
}

function applyNaturalPose(vrm) {
	// Formal standing pose: hands clasped at waist, upright posture
	const leftShoulder = getBone(vrm, "leftShoulder");
	const rightShoulder = getBone(vrm, "rightShoulder");
	const leftUpperArm = getBone(vrm, "leftUpperArm");
	const rightUpperArm = getBone(vrm, "rightUpperArm");
	const leftLowerArm = getBone(vrm, "leftLowerArm");
	const rightLowerArm = getBone(vrm, "rightLowerArm");
	const leftHand = getBone(vrm, "leftHand");
	const rightHand = getBone(vrm, "rightHand");
	const spine = getBone(vrm, "spine");
	const chest = getBone(vrm, "chest");
	const neck = getBone(vrm, "neck");
	const head = getBone(vrm, "head");
	const hips = getBone(vrm, "hips");
	const leftThigh = getBone(vrm, "leftUpperLeg");
	const rightThigh = getBone(vrm, "rightUpperLeg");

	// Hips neutral
	if (hips) hips.rotation.set(0, 0, 0);

	// Spine straight and upright
	if (spine) spine.rotation.set(0, 0, 0);
	if (chest) chest.rotation.set(0, 0, 0);

	// Shoulders level
	if (leftShoulder) leftShoulder.rotation.set(0, 0, 0);
	if (rightShoulder) rightShoulder.rotation.set(0, 0, 0);

	// Arms spread wide open at shoulder height
	if (leftUpperArm) {
		leftUpperArm.rotation.set(1, -1.8, 0); // extended left
	}
	if (leftLowerArm) {
		leftLowerArm.rotation.set(0, 0, -0.2); // slight bend, palm back
	}
	if (leftHand) {
		leftHand.rotation.set(0, -0.2, 0);
	}

	// Right arm: mirror
	if (rightUpperArm) {
		rightUpperArm.rotation.set(1, 1.8, 0); // extended right
	}
	if (rightLowerArm) {
		rightLowerArm.rotation.set(0, 0, 0);
	}
	if (rightHand) {
		rightHand.rotation.set(0, 0.2, 0);
	}

	// Head: neutral, slight forward tilt for attentiveness
	if (neck) neck.rotation.set(0.05, 0, 0);
	if (head) head.rotation.set(-0.02, 0, 0);

	// Legs straight, slightly apart
	if (leftThigh) leftThigh.rotation.set(0, 0, 0.05);
	if (rightThigh) rightThigh.rotation.set(0, 0, -0.05);
}

// ─── VRM loader ───────────────────────────────────────────────────────────────
function loadVRM() {
	const loader = new THREE.GLTFLoader();
	loader.register((parser) => new THREE_VRM.VRMLoaderPlugin(parser));

	loader.load(
		"./avatar/Suyo.vrm",
		(gltf) => {
			vrm = gltf.userData.vrm;
			scene.add(vrm.scene);
			THREE_VRM.VRMUtils.rotateVRM0(vrm);
			vrm.scene.position.set(0, -0.8, 0);
			applyNaturalPose(vrm);
			console.log("VRM loaded!");
			hideLoading();
		},
		(progress) => {
			console.log(
				"VRM loading...",
				((progress.loaded / progress.total) * 100).toFixed(1) + "%",
			);
		},
		(error) => {
			console.warn("VRM failed, using fallback:", error);
			useFallback();
		},
	);
}

function useFallback() {
	document.getElementById("canvas").style.display = "none";
	document.getElementById("fallback").style.display = "flex";
	hideLoading();
}

function hideLoading() {
	const el = document.getElementById("loading");
	el.classList.add("hidden");
	setTimeout(() => el.remove(), 700);
}

// ─── Animation loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let lastBlink = 0;
let blinkVal = 0;
let eyeLookX = 0,
	eyeLookY = 0;
let happyVal = 0;

function setExpr(name, val) {
	try {
		vrm?.expressionManager?.setValue(name, Math.max(0, Math.min(1, val)));
	} catch (_) {}
}

function clearAllVisemes() {
	ALL_VISEMES.forEach((v) => setExpr(v, 0));
}

function animate() {
	requestAnimationFrame(animate);
	const delta = clock.getDelta();
	const t = clock.getElapsedTime();

	if (vrm) {
		// ── Idle sway ──
		vrm.scene.rotation.y = Math.sin(t * 0.4) * 0.06;
		vrm.scene.position.y = -0.8 + Math.sin(t * 0.6) * 0.01;

		// ── Blinking ──
		const blinkInterval = 3.5 + Math.sin(t * 0.1) * 1.5;
		if (t - lastBlink > blinkInterval) {
			blinkVal = 1;
			lastBlink = t;
		}
		if (blinkVal > 0) {
			setExpr("blink", blinkVal);
			blinkVal = Math.max(0, blinkVal - delta * 8);
		} else {
			setExpr("blink", 0);
		}

		// ── Eye wander (idle) ──
		if (!isSpeaking) {
			eyeLookX += (Math.sin(t * 0.3) * 0.2 - eyeLookX) * 0.02;
			eyeLookY += (Math.sin(t * 0.2) * 0.1 - eyeLookY) * 0.02;
			setExpr("lookLeft", Math.max(0, eyeLookX));
			setExpr("lookRight", Math.max(0, -eyeLookX));
			setExpr("lookUp", Math.max(0, eyeLookY));
			setExpr("lookDown", Math.max(0, -eyeLookY));
		}

		// ── Emotion: happy while speaking, relaxed when idle ──
		const happyTarget = isSpeaking ? 0.2 : 0;
		happyVal += (happyTarget - happyVal) * 0.09;
		setExpr("happy", happyVal);
		setExpr("relaxed", isSpeaking ? 0 : 0.3);

		// ── Viseme sync from text ──
		if (isSpeaking && visemeQueue.length > 0) {
			visemeTimer += delta;
			const visemeSpeed = 0.07; // seconds per viseme
			if (visemeTimer >= visemeSpeed) {
				visemeTimer = 0;
				clearAllVisemes();
				const currentViseme =
					visemeQueue[visemeIdx % visemeQueue.length];
				if (currentViseme) {
					setExpr(currentViseme, 0.7 + Math.sin(t * 8) * 0.2);
				}
				visemeIdx++;
				// loop queue until speaking stops
				if (visemeIdx >= visemeQueue.length) visemeIdx = 0;
			}
		} else if (!isSpeaking) {
			clearAllVisemes();
			visemeIdx = 0;
			visemeTimer = 0;
		}

		vrm.update(delta);
	}

	renderer.render(scene, camera);
}

animate();
loadVRM();

// ─── WebSocket ───────────────────────────────────────────────────────────────
const wsDot = document.getElementById("ws-dot");
const wsLabel = document.getElementById("ws-label");

function connectWS() {
	const ws = new WebSocket("ws://localhost:8765");

	ws.onopen = () => {
		wsDot.classList.add("active");
		wsLabel.textContent = "CONNECTED";
	};

	ws.onclose = () => {
		wsDot.classList.remove("active");
		wsLabel.textContent = "DISCONNECTED";
		setTimeout(connectWS, 2000); // auto-reconnect
	};

	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
		handleMessage(data);
	};
}

connectWS();

// ─── Message handler ──────────────────────────────────────────────────────────
function handleMessage({ keywords, transcription }) {
	// Update transcription
	const tBox = document.getElementById("transcription-box");
	const tText = document.getElementById("transcription-text");
	tText.style.color = "";
	tText.style.fontStyle = "";
	tText.textContent = transcription;
	tBox.classList.add("active");
	setTimeout(() => tBox.classList.remove("active"), 2000);

	// Animate mouth
	setSpeaking(true);
	const words = transcription.split(" ").length;
	setTimeout(() => setSpeaking(false), Math.min(words * 350, 4000));

	// Show keywords
	showKeywords(keywords);

	// Add to history
	addHistory(transcription, keywords);
}

function setSpeaking(val) {
	isSpeaking = val;
	document.getElementById("waveform").classList.toggle("speaking", val);
	const mouth = document.getElementById("fallback-mouth");
	if (mouth) mouth.classList.toggle("speaking", val);
}

// ─── Keywords display ─────────────────────────────────────────────────────────
const existingTags = [];

function showKeywords(keywords) {
	const container = document.getElementById("keywords-container");

	// Fade out old ones
	existingTags.forEach((el) => {
		el.classList.add("fade-out");
		setTimeout(() => el.remove(), 500);
	});
	existingTags.length = 0;

	keywords.forEach((kw, i) => {
		setTimeout(() => {
			const tag = document.createElement("div");
			const color = colors[colorIdx % colors.length];
			colorIdx++;
			tag.className = `keyword-tag ${color}`;
			tag.innerHTML = `<span class="dot"></span>${kw}`;
			container.appendChild(tag);
			existingTags.push(tag);
		}, i * 120);
	});
}

// ─── History log ─────────────────────────────────────────────────────────────
function addHistory(transcription, keywords) {
	const log = document.getElementById("history-log");
	const item = document.createElement("div");
	item.className = "history-item";
	const now = new Date().toLocaleTimeString("en-US", {
		hour12: false,
	});
	item.innerHTML = `<div class="time">${now}</div>${transcription}`;
	log.prepend(item);

	// Keep last 20 entries
	while (log.children.length > 20) log.lastChild.remove();
}
