// js/app.js - Контроллер игры «БЛОК КУБА» 2.0 (WOW Edition)

document.addEventListener("DOMContentLoaded", () => {
  // 1. Инициализация компонентов
  const canvas = document.getElementById("worldCanvas");
  const audio = window.mcAudio;
  const world = new MinecraftWorld(canvas);
  const engine = new KumirEngine(world, audio);

  // DOM элементы
  const prevLevelBtn = document.getElementById("prevLevelBtn");
  const nextLevelBtn = document.getElementById("nextLevelBtn");
  const levelIndicator = document.getElementById("levelIndicator");
  const levelSubtitle = document.getElementById("levelSubtitle");
  const diamondCounter = document.getElementById("diamondCounter");
  const stepCounter = document.getElementById("stepCounter");
  const soundToggleBtn = document.getElementById("soundToggleBtn");
  const soundOnIcon = document.getElementById("soundOnIcon");
  const soundOffIcon = document.getElementById("soundOffIcon");

  const goalMaxSteps = document.getElementById("goalMaxSteps");
  const goalDescription = document.getElementById("goalDescription");
  const statusToast = document.getElementById("statusToast");
  const heartsContainer = document.getElementById("heartsContainer");

  // Подсказки
  const getHintBtn = document.getElementById("getHintBtn");
  const hintBtnText = document.getElementById("hintBtnText");
  const hintModal = document.getElementById("hintModal");
  const hintStepBadge = document.getElementById("hintStepBadge");
  const hintModalText = document.getElementById("hintModalText");
  const closeHintModalBtn = document.getElementById("closeHintModalBtn");

  // Достижения
  const achievementToast = document.getElementById("achievementToast");
  const achSubtitle = document.getElementById("achSubtitle");

  // Управление
  const runBtn = document.getElementById("runBtn");
  const stepBtn = document.getElementById("stepBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const speedSelect = document.getElementById("speedSelect");

  // Язык
  const langPyBtn = document.getElementById("langPyBtn");
  const langCppBtn = document.getElementById("langCppBtn");
  const editorTabTitle = document.getElementById("editorTabTitle");
  const pySyntaxGuide = document.getElementById("pySyntaxGuide");
  const cppSyntaxGuide = document.getElementById("cppSyntaxGuide");

  // Хотбар
  const lblRight = document.getElementById("lblRight");
  const lblLeft = document.getElementById("lblLeft");
  const lblUp = document.getElementById("lblUp");
  const lblDown = document.getElementById("lblDown");
  const lblBreak = document.getElementById("lblBreak");
  const lblPlace = document.getElementById("lblPlace");
  const lblLoop = document.getElementById("lblLoop");
  const lblWhile = document.getElementById("lblWhile");

  // Редактор и подсветка синтаксиса
  const codeTextarea = document.getElementById("codeTextarea");
  const codePre = document.getElementById("codePre");
  const codeHighlight = document.getElementById("codeHighlight");
  const lineNumbers = document.getElementById("lineNumbers");
  const clearCodeBtn = document.getElementById("clearCodeBtn");
  const restoreCodeBtn = document.getElementById("restoreCodeBtn");
  const consoleOutput = document.getElementById("consoleOutput");

  const xpProgress = document.getElementById("xpProgress");
  const xpLevel = document.getElementById("xpLevel");

  // Модалка победы
  const victoryModal = document.getElementById("victoryModal");
  const retryLevelBtn = document.getElementById("retryLevelBtn");
  const submitResultBtn = document.getElementById("submitResultBtn");
  const modalNextLevelBtn = document.getElementById("modalNextLevelBtn");
  const resSteps = document.getElementById("resSteps");
  const resDiamonds = document.getElementById("resDiamonds");
  const resXp = document.getElementById("resXp");
  const star2 = document.getElementById("star2");
  const star3 = document.getElementById("star3");

  // Состояние
  let currentLanguage = "python";
  let currentLevelIdx = 0;
  let currentLevelData = null;
  let startTime = 0;
  let hintsUsedOnLevel = 0;

  // 2. Рендер 10 сердечек Minecraft
  function updateHearts(hp = 10) {
    let html = "";
    for (let i = 1; i <= 10; i++) {
      const isFilled = i <= hp;
      html += `
        <svg class="heart-svg ${isFilled ? "filled" : "empty"}" viewBox="0 0 16 16">
          <path d="M2 3h4v2H2zm8 0h4v2h-4zM1 5h6v2H1zm8 0h6v2H9zM1 7h14v2H1zm1 2h12v2H2zm2 2h8v2H4zm2 2h4v2H6z" />
        </svg>
      `;
    }
    heartsContainer.innerHTML = html;
  }

  // 3. Подсветка синтаксиса Python и C++ в реальном времени
  function updateSyntaxHighlight() {
    const rawCode = codeTextarea.value;
    codeHighlight.innerHTML = highlightCode(rawCode, currentLanguage);
    updateLineNumbers();
  }

  function highlightCode(src, lang) {
    const lines = src.split("\n");
    return lines.map(line => {
      let l = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
      const commentIdx = lang === "python" ? l.indexOf("#") : l.indexOf("//");
      let codePart = l;
      let commentPart = "";
      
      if (commentIdx !== -1) {
        codePart = l.substring(0, commentIdx);
        commentPart = `<span class="tok-comm">${l.substring(commentIdx)}</span>`;
      }

      if (lang === "python") {
        codePart = codePart
          .replace(/\b(def|for|while|in|range|if|else|elif|return|pass)\b/g, '<span class="tok-kw">$1</span>')
          .replace(/\b(move_right|move_left|move_up|move_down|destroy|place|mark)\b/g, '<span class="tok-fn">$1</span>')
          .replace(/\b(is_clear_forward|free_forward|is_lava_ahead|is_diamond_ahead|is_clear_right|is_wall_right)\b/g, '<span class="tok-cond">$1</span>')
          .replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
      } else {
        codePart = codePart
          .replace(/\b(int|void|return|for|while|if|else|include|using|namespace)\b/g, '<span class="tok-kw">$1</span>')
          .replace(/\b(move_right|move_left|move_up|move_down|destroy|place|mark)\b/g, '<span class="tok-fn">$1</span>')
          .replace(/\b(is_clear_forward|free_forward|is_lava_ahead|is_diamond_ahead|is_clear_right|is_wall_right)\b/g, '<span class="tok-cond">$1</span>')
          .replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
      }

      return codePart + commentPart;
    }).join("\n");
  }

  // Синхронизация скролла редактора и подсветки
  codeTextarea.addEventListener("scroll", () => {
    codePre.scrollTop = codeTextarea.scrollTop;
    codePre.scrollLeft = codeTextarea.scrollLeft;
  });

  // 4. Переключатель языка Python / C++
  function setLanguage(lang) {
    currentLanguage = lang;

    if (lang === "python") {
      langPyBtn.classList.add("active");
      langCppBtn.classList.remove("active");
      editorTabTitle.textContent = "main.py";
      pySyntaxGuide.classList.remove("hidden");
      cppSyntaxGuide.classList.add("hidden");

      lblRight.textContent = "move_right()";
      lblLeft.textContent = "move_left()";
      lblUp.textContent = "move_up()";
      lblDown.textContent = "move_down()";
      lblBreak.textContent = "destroy()";
      lblPlace.textContent = "place()";
      lblLoop.textContent = "for in range";
      lblWhile.textContent = "while";

      if (currentLevelData) {
        codeTextarea.value = currentLevelData.initialCodePython || "";
      }
    } else {
      langCppBtn.classList.add("active");
      langPyBtn.classList.remove("active");
      editorTabTitle.textContent = "main.cpp";
      cppSyntaxGuide.classList.remove("hidden");
      pySyntaxGuide.classList.add("hidden");

      lblRight.textContent = "move_right();";
      lblLeft.textContent = "move_left();";
      lblUp.textContent = "move_up();";
      lblDown.textContent = "move_down();";
      lblBreak.textContent = "destroy();";
      lblPlace.textContent = "place();";
      lblLoop.textContent = "for (int i=0;..";
      lblWhile.textContent = "while (...)";

      if (currentLevelData) {
        codeTextarea.value = currentLevelData.initialCodeCpp || "";
      }
    }

    updateSyntaxHighlight();
  }

  langPyBtn.addEventListener("click", () => setLanguage("python"));
  langCppBtn.addEventListener("click", () => setLanguage("cpp"));

  // 5. Загрузка уровня и сброс подсказок
  function loadLevel(idx, customLevelConfig = null) {
    if (customLevelConfig) {
      currentLevelData = customLevelConfig;
    } else {
      if (idx < 0) idx = 0;
      if (idx >= window.KUMIR_LEVELS.length) idx = window.KUMIR_LEVELS.length - 1;
      currentLevelIdx = idx;
      currentLevelData = window.KUMIR_LEVELS[currentLevelIdx];
    }

    engine.setLevel(currentLevelData);

    levelIndicator.textContent = `УРОВЕНЬ ${currentLevelIdx + 1}`;
    levelSubtitle.textContent = currentLevelData.subtitle || "";
    goalDescription.textContent = currentLevelData.description || "";
    goalMaxSteps.textContent = `Лимит: ${currentLevelData.maxSteps || 20} шагов`;

    xpLevel.textContent = (currentLevelIdx + 1).toString();
    xpProgress.style.width = `${((currentLevelIdx + 1) / window.KUMIR_LEVELS.length) * 100}%`;

    // Сброс подсказок для нового уровня
    hintsUsedOnLevel = 0;
    updateHintButtonState();

    // Загрузка стартового шаблона без авто-решения
    if (currentLanguage === "python") {
      codeTextarea.value = currentLevelData.initialCodePython || "";
    } else {
      codeTextarea.value = currentLevelData.initialCodeCpp || "";
    }

    updateHearts(10);
    updateSyntaxHighlight();
    resetExecution();
  }

  function resetExecution() {
    engine.reset(currentLevelData.map, currentLevelData.steve);
    stepCounter.textContent = "0";
    const reqDia = currentLevelData.requiredDiamonds || 0;
    diamondCounter.textContent = `0 / ${reqDia}`;
    updateHearts(10);

    runBtn.classList.remove("hidden");
    pauseBtn.classList.add("hidden");
    hideToast();
    clearLineHighlight();
    logConsole("Готов к выполнению алгоритма. Составьте программу и нажмите «Пуск».", "normal");
  }

  // 6. Прогрессивная система подсказок
  function updateHintButtonState() {
    const maxH = currentLevelData.maxHints || 1;
    const remaining = Math.max(0, maxH - hintsUsedOnLevel);

    if (remaining > 0) {
      hintBtnText.textContent = `Подсказка (осталось ${remaining})`;
      getHintBtn.classList.remove("disabled");
    } else {
      hintBtnText.textContent = "Подсказок не осталось";
      getHintBtn.classList.add("disabled");
    }
  }

  getHintBtn.addEventListener("click", () => {
    const maxH = currentLevelData.maxHints || 1;
    const remaining = maxH - hintsUsedOnLevel;

    if (remaining <= 0) {
      showToast("Лимит подсказок на этот раунд исчерпан! Попробуйте сами.", "error");
      return;
    }

    const hintText = currentLevelData.hints[hintsUsedOnLevel] || "Внимательно изучите карту шахты и препятствия.";
    hintsUsedOnLevel++;

    hintStepBadge.textContent = `Подсказка ${hintsUsedOnLevel} из ${maxH}`;
    hintModalText.textContent = hintText;
    hintModal.classList.remove("hidden");
    audio.playDiamond();

    updateHintButtonState();
  });

  closeHintModalBtn.addEventListener("click", () => {
    hintModal.classList.add("hidden");
  });

  // 7. Плашка достижения Minecraft
  function triggerAchievement(title) {
    achSubtitle.textContent = title;
    achievementToast.classList.remove("hidden");
    audio.playVictory();
    setTimeout(() => {
      achievementToast.classList.add("hidden");
    }, 4500);
  }

  // Нумерация строк
  function updateLineNumbers() {
    const lines = codeTextarea.value.split("\n");
    let html = "";
    for (let i = 1; i <= lines.length; i++) {
      html += `<div data-line="${i}">${i}</div>`;
    }
    lineNumbers.innerHTML = html;
  }

  function highlightLine(lineNum) {
    clearLineHighlight();
    const el = lineNumbers.querySelector(`[data-line="${lineNum}"]`);
    if (el) {
      el.classList.add("active-line");
    }
  }

  function clearLineHighlight() {
    const active = lineNumbers.querySelectorAll(".active-line");
    active.forEach(el => el.classList.remove("active-line"));
  }

  function logConsole(msg, type = "normal") {
    consoleOutput.textContent = msg;
    consoleOutput.className = "console-text " + (type === "error" ? "error" : type === "success" ? "success" : "");
  }

  function showToast(msg, type = "error") {
    statusToast.textContent = msg;
    statusToast.className = "status-toast " + (type === "success" ? "success" : "");
    setTimeout(() => {
      hideToast();
    }, 4000);
  }

  function hideToast() {
    statusToast.classList.add("hidden");
  }

  // 8. Хотбар команд
  document.querySelectorAll(".hotbar-slot").forEach(slot => {
    slot.addEventListener("click", () => {
      const cmd = slot.dataset.cmd;
      insertCommandAtCursor(cmd);
      audio.playStep();
    });
  });

  function insertCommandAtCursor(cmd) {
    let snippet = "";
    const isPy = currentLanguage === "python";

    if (cmd === "right") {
      snippet = isPy ? "move_right()\n" : "move_right();\n";
    } else if (cmd === "left") {
      snippet = isPy ? "move_left()\n" : "move_left();\n";
    } else if (cmd === "up") {
      snippet = isPy ? "move_up()\n" : "move_up();\n";
    } else if (cmd === "down") {
      snippet = isPy ? "move_down()\n" : "move_down();\n";
    } else if (cmd === "break") {
      snippet = isPy ? "destroy()\n" : "destroy();\n";
    } else if (cmd === "place") {
      snippet = isPy ? "place()\n" : "place();\n";
    } else if (cmd === "loop") {
      snippet = isPy 
        ? "for i in range(3):\n    place()\n    move_right()\n" 
        : "for (int i = 0; i < 3; i++) {\n    place();\n    move_right();\n}\n";
    } else if (cmd === "while") {
      snippet = isPy 
        ? "while is_clear_forward():\n    move_right()\n" 
        : "while (is_clear_forward()) {\n    move_right();\n}\n";
    }

    const val = codeTextarea.value;
    const start = codeTextarea.selectionStart;
    const end = codeTextarea.selectionEnd;

    if (start === end && (start === 0 || start === val.length)) {
      if (val.endsWith("\n") || val.length === 0) {
        codeTextarea.value = val + snippet;
      } else {
        codeTextarea.value = val + "\n" + snippet;
      }
    } else {
      codeTextarea.value = val.slice(0, start) + snippet + val.slice(end);
    }

    updateSyntaxHighlight();
    codeTextarea.focus();
  }

  // 9. Обработчики запуска
  runBtn.addEventListener("click", () => {
    startTime = Date.now();
    runBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
    logConsole(`Исполнение алгоритма Стива (${currentLanguage.toUpperCase()})...`, "normal");
    engine.speedDelay = parseInt(speedSelect.value, 10);
    engine.runAll(codeTextarea.value);
  });

  pauseBtn.addEventListener("click", () => {
    engine.pause();
    pauseBtn.classList.add("hidden");
    runBtn.classList.remove("hidden");
    logConsole("Алгоритм приостановлен.", "normal");
  });

  stepBtn.addEventListener("click", () => {
    if (engine.status === "IDLE") {
      startTime = Date.now();
      engine.parse(codeTextarea.value);
    }
    const ok = engine.step();
    if (!ok && engine.status === "IDLE") {
      logConsole("Все команды завершены.", "normal");
    }
  });

  resetBtn.addEventListener("click", () => {
    resetExecution();
  });

  speedSelect.addEventListener("change", () => {
    engine.speedDelay = parseInt(speedSelect.value, 10);
  });

  soundToggleBtn.addEventListener("click", () => {
    audio.enabled = !audio.enabled;
    soundOnIcon.classList.toggle("hidden", !audio.enabled);
    soundOffIcon.classList.toggle("hidden", audio.enabled);
    soundToggleBtn.title = audio.enabled ? "Звук включен" : "Звук выключен";
  });

  clearCodeBtn.addEventListener("click", () => {
    codeTextarea.value = currentLanguage === "python" ? "# Напишите код здесь\n" : "// Напишите код здесь\n";
    updateSyntaxHighlight();
  });

  restoreCodeBtn.addEventListener("click", () => {
    if (currentLanguage === "python") {
      codeTextarea.value = currentLevelData.initialCodePython || "";
    } else {
      codeTextarea.value = currentLevelData.initialCodeCpp || "";
    }
    updateSyntaxHighlight();
  });

  codeTextarea.addEventListener("input", updateSyntaxHighlight);
  codeTextarea.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = codeTextarea.selectionStart;
      const end = codeTextarea.selectionEnd;
      codeTextarea.value = codeTextarea.value.substring(0, start) + "    " + codeTextarea.value.substring(end);
      codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 4;
      updateSyntaxHighlight();
    }
  });

  // 10. Колбеки движка
  engine.onStepCallback = (data) => {
    stepCounter.textContent = engine.stepsTaken.toString();
    const reqDia = currentLevelData.requiredDiamonds || 0;
    diamondCounter.textContent = `${engine.diamondsCollected} / ${reqDia}`;
    updateHearts(world.health);
    highlightLine(data.lineNum);
  };

  engine.onFinishCallback = (res) => {
    runBtn.classList.remove("hidden");
    pauseBtn.classList.add("hidden");
    clearLineHighlight();
    updateHearts(world.health);

    const executionTimeMs = Date.now() - (startTime || Date.now());

    if (res.status === "FAILED") {
      const err = res.error || "Ошибка алгоритма!";
      logConsole(`Ошибка: ${err}`, "error");
      showToast(err, "error");
    } else if (res.status === "SUCCESS") {
      logConsole(`Успех: Миссия завершена за ${res.steps} шагов!`, "success");
      showToast("Уровень пройден!", "success");

      // Всплывающее достижение
      const achNames = [
        "Первые шаги программиста",
        "Алмазный добытчик",
        "Инженер мостов",
        "Мастер лабиринтов"
      ];
      triggerAchievement(achNames[currentLevelIdx] || "Мастер алгоритмов");

      let stars = 3;
      const maxAllowed = currentLevelData.maxSteps || 15;
      if (res.steps > maxAllowed) stars = 2;
      if (res.steps > maxAllowed * 1.5) stars = 1;

      resSteps.textContent = res.steps;
      resDiamonds.textContent = res.diamonds;
      resXp.textContent = `+${stars * 35}`;

      star2.classList.toggle("filled", stars >= 2);
      star3.classList.toggle("filled", stars >= 3);

      setTimeout(() => {
        victoryModal.classList.remove("hidden");
      }, 700);

      emitSubmission({
        status: "SUCCESS",
        levelId: currentLevelData.id,
        language: currentLanguage,
        code: codeTextarea.value,
        stepsTaken: res.steps,
        maxSteps: currentLevelData.maxSteps,
        diamondsCollected: res.diamonds,
        stars: stars,
        score: stars * 35,
        executionTimeMs
      });
    }
  };

  function emitSubmission(payload) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "KUMIR_SUBMISSION",
        payload: payload
      }, "*");
    }
    console.log("[KUMIR_SUBMISSION]", payload);
  }

  submitResultBtn.addEventListener("click", () => {
    emitSubmission({
      status: engine.status,
      levelId: currentLevelData.id,
      language: currentLanguage,
      code: codeTextarea.value,
      stepsTaken: engine.stepsTaken,
      diamondsCollected: engine.diamondsCollected,
      stars: 3,
      submittedByUser: true
    });
    victoryModal.classList.add("hidden");
    showToast("Результат успешно отправлен на платформу!", "success");
  });

  retryLevelBtn.addEventListener("click", () => {
    victoryModal.classList.add("hidden");
    resetExecution();
  });

  modalNextLevelBtn.addEventListener("click", () => {
    victoryModal.classList.add("hidden");
    if (currentLevelIdx < window.KUMIR_LEVELS.length - 1) {
      loadLevel(currentLevelIdx + 1);
    } else {
      showToast("Все уровни пройдены! Вы освоили основы программирования!", "success");
    }
  });

  prevLevelBtn.addEventListener("click", () => {
    if (currentLevelIdx > 0) loadLevel(currentLevelIdx - 1);
  });

  nextLevelBtn.addEventListener("click", () => {
    if (currentLevelIdx < window.KUMIR_LEVELS.length - 1) {
      loadLevel(currentLevelIdx + 1);
    }
  });

  // 11. Iframe API
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "KUMIR_INIT_LEVEL" && data.config) {
      console.log("[KUMIR_INIT_LEVEL received]", data.config);
      if (data.config.language) {
        setLanguage(data.config.language);
      }
      loadLevel(0, data.config);
    } else if (data.type === "KUMIR_SET_CODE" && data.code) {
      codeTextarea.value = data.code;
      updateSyntaxHighlight();
    } else if (data.type === "KUMIR_RUN") {
      runBtn.click();
    } else if (data.type === "KUMIR_RESET") {
      resetBtn.click();
    }
  });

  // 12. Старт игры и проверка параметров тестирования
  const urlParams = new URLSearchParams(window.location.search);
  const testParam = urlParams.get("test");
  const langParam = urlParams.get("lang");

  if (langParam === "cpp") {
    setLanguage("cpp");
  } else {
    setLanguage("python");
  }

  const levelParam = urlParams.get("level");

  if (levelParam) {
    const lIdx = parseInt(levelParam, 10) - 1;
    if (lIdx >= 0 && lIdx < window.KUMIR_LEVELS.length) {
      loadLevel(lIdx);
    } else {
      loadLevel(0);
    }
  } else if (testParam === "victory") {
    loadLevel(0);
    codeTextarea.value = "move_right()\nmove_right()\nmove_right()\nmove_right()\n";
    updateSyntaxHighlight();
    engine.speedDelay = 20;
    setTimeout(() => {
      runBtn.click();
    }, 200);
  } else if (testParam === "hint") {
    loadLevel(0);
    setTimeout(() => {
      getHintBtn.click();
    }, 150);
  } else if (testParam === "level2") {
    loadLevel(1);
  } else if (testParam === "level3") {
    loadLevel(2);
  } else if (testParam === "level4") {
    loadLevel(3);
  } else {
    loadLevel(0);
  }
});
