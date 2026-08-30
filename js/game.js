(() => {
  "use strict";

  const NIGHT_LENGTH_MS = 5 * 60 * 1000;
  const HOUR_LENGTH_MS = NIGHT_LENGTH_MS / 6;
  const AI_TICK_MS = 4500;
  const ATTACK_DELAY_MS = 3000;

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
  window.gameState = state;

  let leftAttackTimer = null;
  let rightAttackTimer = null;

  // Camera hover must be left once before another toggle is allowed.
  let cameraHoverArmed = true;

  const $ = (id) => document.getElementById(id);

  const leftDoorButton = $("left-door");
  const rightDoorButton = $("right-door");
  const cameraPanel = $("camera-panel");
  const cameraHoverZone = $("camera-hover-zone");
  const cameraIndicator = $("camera-indicator");
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

  function setCameraOpen(open) {
    if (state.over || state.power <= 0) return;

    state.cameraOpen = open;
    cameraPanel.classList.toggle("hidden", !open);
    cameraIndicator.classList.toggle("camera-open", open);
    updateCamera();
  }

  function clearAttackTimer(side) {
    if (side === "left") {
      if (leftAttackTimer !== null) {
        clearTimeout(leftAttackTimer);
        leftAttackTimer = null;
      }
      return;
    }

    if (rightAttackTimer !== null) {
      clearTimeout(rightAttackTimer);
      rightAttackTimer = null;
    }
  }

  function endGame(title, text) {
    if (state.over) return;

    state.over = true;
    clearAttackTimer("left");
    clearAttackTimer("right");

    $("overlay-title").textContent = title;
    $("overlay-text").textContent = text;
    $("overlay").classList.remove("hidden");
  }

  function attack(side) {
    clearAttackTimer(side);

    if (state.over) return;

    if (side === "left") {
      if (state.leftEnemy !== 3) return;

      if (state.leftDoor) {
        state.leftEnemy = 0;
        officeMessage.textContent =
          "Something struck the LEFT door and retreated.";
      } else {
        endGame("CAUGHT", "Something entered through the left doorway.");
      }
    } else {
      if (state.rightEnemy !== 3) return;

      if (state.rightDoor) {
        state.rightEnemy = 0;
        officeMessage.textContent =
          "Something struck the RIGHT door and retreated.";
      } else {
        endGame("CAUGHT", "Something entered through the right doorway.");
      }
    }

    updateThreatLights();
    updateCamera();
  }

  function scheduleAttack(side) {
    if (side === "left") {
      if (leftAttackTimer !== null) return;

      leftAttackTimer = setTimeout(() => {
        leftAttackTimer = null;

        if (!state.over && state.leftEnemy === 3) {
          attack("left");
        }
      }, ATTACK_DELAY_MS);

      return;
    }

    if (rightAttackTimer !== null) return;

    rightAttackTimer = setTimeout(() => {
      rightAttackTimer = null;

      if (!state.over && state.rightEnemy === 3) {
        attack("right");
      }
    }, ATTACK_DELAY_MS);
  }

  function moveLeftEnemy() {
    if (state.over) return;

    if (state.leftEnemy < 3 && Math.random() < 0.48) {
      state.leftEnemy += 1;
    }

    if (state.leftEnemy === 3) {
      scheduleAttack("left");
    }
  }

  function moveRightEnemy() {
    if (state.over) return;

    const location = enemyCameraLocation(state.rightEnemy, "right");
    const beingWatched =
      state.cameraOpen &&
      location !== null &&
      state.camera === location;

    if (
      !beingWatched &&
      state.rightEnemy < 3 &&
      Math.random() < 0.42
    ) {
      state.rightEnemy += 1;
    }

    if (state.rightEnemy === 3) {
      scheduleAttack("right");
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

  // FNAF-style bottom-edge camera control.
  // Enter once -> toggle. It cannot toggle again until the cursor leaves.
  cameraHoverZone.addEventListener("mouseenter", () => {
    if (!cameraHoverArmed || state.over || state.power <= 0) return;

    cameraHoverArmed = false;
    setCameraOpen(!state.cameraOpen);
  });

  cameraHoverZone.addEventListener("mouseleave", () => {
    cameraHoverArmed = true;
  });

  document.querySelectorAll("[data-camera]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.over || state.power <= 0) return;

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
      cameraIndicator.classList.remove("camera-open");

      leftDoorButton.disabled = true;
      rightDoorButton.disabled = true;

      officeMessage.textContent =
        "POWER FAILURE — all security systems offline.";
    }

    requestAnimationFrame(frame);
  }

  updateButtons();
  updateCamera();
  updateThreatLights();
  requestAnimationFrame(frame);
})();
