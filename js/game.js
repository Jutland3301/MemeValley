(() => {
  "use strict";

  // Prototype tuning: one full night lasts 5 minutes.
  const NIGHT_LENGTH_MS = 5 * 60 * 1000;
  const HOUR_LENGTH_MS = NIGHT_LENGTH_MS / 6;
  const AI_TICK_MS = 4500;

  const state = {
    startedAt: performance.now(),
    power: 100,
    leftDoor: false,
    rightDoor: false,
    cameraOpen: false,
    camera: 0,
    over: false,

    // 0=start, 1=mid route, 2=hall, 3=door
    leftEnemy: 0,
    rightEnemy: 0
  };

  const $ = (id) => document.getElementById(id);

  const leftDoorButton = $("left-door");
  const rightDoorButton = $("right-door");
  const cameraToggle = $("camera-toggle");
  const cameraPanel = $("camera-panel");
  const cameraName = $("camera-name");
  const cameraDescription = $("camera-description");
  const timeDisplay = $("time");
  const powerDisplay = $("power");
  const usageDisplay = $("usage");
  const leftThreat = $("left-threat");
  const rightThreat = $("right-threat");
  const officeMessage = $("office-message");

  const cameraNames = [
    "CAM 1 — STORAGE",
    "CAM 2 — WEST CORRIDOR",
    "CAM 3 — EAST CORRIDOR",
    "CAM 4 — SERVICE ROOM"
  ];

  function usage() {
    return 1
      + Number(state.cameraOpen)
      + Number(state.leftDoor)
      + Number(state.rightDoor);
  }

  function updateButtons() {
    leftDoorButton.textContent =
      `LEFT DOOR: ${state.leftDoor ? "CLOSED" : "OPEN"}`;
    rightDoorButton.textContent =
      `RIGHT DOOR: ${state.rightDoor ? "CLOSED" : "OPEN"}`;

    leftDoorButton.classList.toggle("active", state.leftDoor);
    rightDoorButton.classList.toggle("active", state.rightDoor);
  }

  function enemyCameraLocation(enemy, side) {
    if (side === "left") {
      return [0, 0, 1, null][enemy];
    }
    return [3, 3, 2, null][enemy];
  }

  function updateCamera() {
    cameraName.textContent = cameraNames[state.camera];

    const occupants = [];

    if (enemyCameraLocation(state.leftEnemy, "left") === state.camera) {
      occupants.push("A tall shape is standing in the frame.");
    }

    if (enemyCameraLocation(state.rightEnemy, "right") === state.camera) {
      occupants.push("Something is facing away from the camera.");
    }

    cameraDescription.textContent =
      occupants.length ? occupants.join(" ") : "Nothing unusual.";
  }

  function updateThreatLights() {
    leftThreat.classList.toggle("hidden", state.leftEnemy !== 3);
    rightThreat.classList.toggle("hidden", state.rightEnemy !== 3);
  }

  function endGame(title, text) {
    if (state.over) return;
    state.over = true;

    $("overlay-title").textContent = title;
    $("overlay-text").textContent = text;
    $("overlay").classList.remove("hidden");
  }

  function attack(side) {
    if (side === "left") {
      if (state.leftDoor) {
        state.leftEnemy = 1;
        officeMessage.textContent =
          "Something struck the LEFT door and retreated.";
      } else {
        endGame("CAUGHT", "Something entered through the left doorway.");
      }
    } else {
      if (state.rightDoor) {
        state.rightEnemy = 1;
        officeMessage.textContent =
          "Something struck the RIGHT door and retreated.";
      } else {
        endGame("CAUGHT", "Something entered through the right doorway.");
      }
    }

    updateThreatLights();
    updateCamera();
  }

  function moveLeftEnemy() {
    if (state.over) return;

    // Simple fixed route with probabilistic movement timing.
    if (Math.random() < 0.48) {
      state.leftEnemy = Math.min(3, state.leftEnemy + 1);
    }

    if (state.leftEnemy === 3) {
      setTimeout(() => {
        if (!state.over && state.leftEnemy === 3) attack("left");
      }, 3000);
    }
  }

  function moveRightEnemy() {
    if (state.over) return;

    // Enemy B freezes if the player is watching its current camera.
    const location = enemyCameraLocation(state.rightEnemy, "right");
    const beingWatched =
      state.cameraOpen && location !== null && state.camera === location;

    if (!beingWatched && Math.random() < 0.42) {
      state.rightEnemy = Math.min(3, state.rightEnemy + 1);
    }

    if (state.rightEnemy === 3) {
      setTimeout(() => {
        if (!state.over && state.rightEnemy === 3) attack("right");
      }, 3000);
    }
  }

  leftDoorButton.addEventListener("click", () => {
    if (state.over || state.power <= 0) return;
    state.leftDoor = !state.leftDoor;
    updateButtons();
  });

  rightDoorButton.addEventListener("click", () => {
    if (state.over || state.power <= 0) return;
    state.rightDoor = !state.rightDoor;
    updateButtons();
  });

  cameraToggle.addEventListener("click", () => {
    if (state.over || state.power <= 0) return;

    state.cameraOpen = !state.cameraOpen;
    cameraPanel.classList.toggle("hidden", !state.cameraOpen);
    cameraToggle.textContent =
      state.cameraOpen ? "CLOSE CAMERAS" : "OPEN CAMERAS";

    updateCamera();
  });

  document.querySelectorAll("[data-camera]").forEach((button) => {
    button.addEventListener("click", () => {
      state.camera = Number(button.dataset.camera);
      updateCamera();
    });
  });

  $("restart").addEventListener("click", () => location.reload());

  setInterval(() => {
    moveLeftEnemy();
    moveRightEnemy();
    updateThreatLights();
    updateCamera();
  }, AI_TICK_MS);

  let previous = performance.now();

  function frame(now) {
    if (state.over) return;

    const dt = (now - previous) / 1000;
    previous = now;

    const elapsed = now - state.startedAt;
    const hour = Math.floor(elapsed / HOUR_LENGTH_MS);

    if (hour >= 6) {
      endGame("6 AM", "Night 1 complete.");
      return;
    }

    timeDisplay.textContent = `${hour === 0 ? 12 : hour} AM`;

    // Base drain + extra drain for each active system.
    const drainPerSecond = 0.075 * usage();
    state.power = Math.max(0, state.power - drainPerSecond * dt);

    powerDisplay.textContent = `POWER ${Math.ceil(state.power)}%`;
    usageDisplay.textContent = `USAGE ${"▮".repeat(usage())}`;

    if (state.power <= 0) {
      state.leftDoor = false;
      state.rightDoor = false;
      state.cameraOpen = false;

      updateButtons();
      cameraPanel.classList.add("hidden");
      cameraToggle.textContent = "CAMERAS OFFLINE";

      leftDoorButton.disabled = true;
      rightDoorButton.disabled = true;
      cameraToggle.disabled = true;

      officeMessage.textContent =
        "POWER FAILURE — all security systems offline.";
    }

    requestAnimationFrame(frame);
  }

  updateButtons();
  updateCamera();
  requestAnimationFrame(frame);
})();
