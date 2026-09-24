// js/engine.js - Виртуальная машина рантайма Скретч (интерпретатор блоков и событий)

class ScratchEngine {
  constructor(stage, workspace) {
    this.stage = stage;
    this.workspace = workspace;
    this.runningThreads = new Set();
    this.isRunning = false;
    this.variables = new Map([["счёт", 0]]);
    this.timerStart = Date.now();
    this.pressedKeys = new Set();

    this.initKeyboardEvents();
  }

  initKeyboardEvents() {
    window.addEventListener("keydown", (e) => {
      // Игнорируем ввод внутри полей ввода
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

      this.pressedKeys.add(e.code);
      this.triggerEvent("whenkeypressed", null, e.code);
    });

    window.addEventListener("keyup", (e) => {
      this.pressedKeys.delete(e.code);
    });
  }

  getVariable(name) {
    return this.variables.get(name) || 0;
  }

  setVariable(name, val) {
    this.variables.set(name, val);
  }

  changeVariable(name, delta) {
    const curr = Number(this.getVariable(name)) || 0;
    this.setVariable(name, curr + Number(delta));
  }

  // Запуск по зеленому флагу
  greenFlag() {
    this.stopAll();
    this.isRunning = true;
    this.timerStart = Date.now();

    const flagBtn = document.getElementById("btn-green-flag");
    if (flagBtn) flagBtn.classList.add("active");

    // Инициализируем звук
    if (window.scratchAudio) window.scratchAudio.init();

    // Запускаем все шапочные блоки "когда нажат зеленый флаг"
    this.triggerEvent("whenflagclicked");
  }

  // Остановка всего выполнения
  stopAll() {
    this.isRunning = false;
    this.runningThreads.forEach(th => th.cancelled = true);
    this.runningThreads.clear();

    const flagBtn = document.getElementById("btn-green-flag");
    if (flagBtn) flagBtn.classList.remove("active");

    // Снимаем подсветку со всех блоков
    document.querySelectorAll(".scratch-block.running-glow").forEach(b => {
      b.classList.remove("running-glow");
    });

    // Снимаем баблы со спрайтов
    this.stage.sprites.forEach(s => {
      s.bubble = null;
    });
  }

  // Триггер событий (зеленый флаг, клавиша, клик по спрайту, broadcast)
  triggerEvent(eventType, targetSpriteId = null, extraParam = null) {
    // Сканируем сохраненные скрипты спрайтов проекта и воркспейс
    if (!window.currentProject) return;

    window.currentProject.sprites.forEach(spriteData => {
      if (targetSpriteId && spriteData.id !== targetSpriteId) return;

      const spriteObj = this.stage.sprites.find(s => s.id === spriteData.id);
      if (!spriteObj) return;

      // Если спрайт сейчас открыт в воркспейсе, берем актуальные блоки из DOM
      let scriptsToRun = [];
      if (this.stage.activeSpriteId === spriteData.id) {
        // Ищем шапочные блоки в вершинах всех стеков воркспейса
        const stacks = Array.from(this.workspace.canvas.querySelectorAll(".scratch-stack"));
        stacks.forEach(stackEl => {
          const rootBlock = stackEl.firstElementChild;
          if (rootBlock && this.matchesEvent(rootBlock, eventType, extraParam)) {
            this.startThread(rootBlock, spriteObj);
          }
        });
      } else if (spriteData.scripts) {
        // Для неактивных спрайтов запускаем из сохраненного JSON
        spriteData.scripts.forEach(scriptData => {
          if (this.matchesEventData(scriptData, eventType, extraParam)) {
            this.startThreadFromData(scriptData, spriteObj);
          }
        });
      }
    });
  }

  matchesEvent(blockEl, eventType, extraParam) {
    const id = blockEl.dataset.blockId;
    if (eventType === "whenflagclicked" && id === "event_whenflagclicked") return true;
    if (eventType === "whenthisspriteclicked" && id === "event_whenthisspriteclicked") return true;
    if (eventType === "whenkeypressed" && id === "event_whenkeypressed") {
      const select = blockEl.querySelector("select[data-arg='KEY']");
      return select && select.value === extraParam;
    }
    if (eventType === "broadcast" && id === "event_whenbroadcastreceived") {
      const inp = blockEl.querySelector("[data-arg='MSG']");
      return inp && inp.value === extraParam;
    }
    return false;
  }

  matchesEventData(data, eventType, extraParam) {
    if (eventType === "whenflagclicked" && data.blockId === "event_whenflagclicked") return true;
    if (eventType === "whenthisspriteclicked" && data.blockId === "event_whenthisspriteclicked") return true;
    if (eventType === "whenkeypressed" && data.blockId === "event_whenkeypressed") {
      return data.args && data.args.KEY === extraParam;
    }
    if (eventType === "broadcast" && data.blockId === "event_whenbroadcastreceived") {
      return data.args && data.args.MSG === extraParam;
    }
    return false;
  }

  // Запуск выполнения стека блоков из DOM
  startThread(startBlockEl, sprite) {
    const thread = { cancelled: false };
    this.runningThreads.add(thread);

    (async () => {
      try {
        let curr = startBlockEl.nextElementSibling;
        while (curr && curr.classList.contains("scratch-block") && curr.style.position !== "absolute" && !thread.cancelled && this.isRunning) {
          await this.executeBlock(curr, sprite, thread);
          curr = curr.nextElementSibling;
        }
      } finally {
        this.runningThreads.delete(thread);
      }
    })();
  }

  // Запуск стека из сохраненных данных (для фоновых спрайтов)
  startThreadFromData(startData, sprite) {
    const thread = { cancelled: false };
    this.runningThreads.add(thread);

    (async () => {
      try {
        let curr = startData.next;
        while (curr && !thread.cancelled && this.isRunning) {
          await this.executeBlockData(curr, sprite, thread);
          curr = curr.next;
        }
      } finally {
        this.runningThreads.delete(thread);
      }
    })();
  }

  // Выполнение одного DOM-блока
  async executeBlock(blockEl, sprite, thread) {
    if (thread.cancelled || !this.isRunning) return;

    blockEl.classList.add("running-glow");
    const blockId = blockEl.dataset.blockId;
    const args = this.workspace.extractArgs(blockEl);

    try {
      await this.runCommand(blockId, args, sprite, blockEl, thread);
    } finally {
      blockEl.classList.remove("running-glow");
    }
  }

  // Выполнение блока из JSON данных
  async executeBlockData(data, sprite, thread) {
    if (thread.cancelled || !this.isRunning) return;
    await this.runCommand(data.blockId, data.args || {}, sprite, null, thread, data);
  }

  // Логика исполнения команд
  async runCommand(blockId, args, sprite, blockEl = null, thread, blockData = null) {
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    const prevX = sprite.x;
    const prevY = sprite.y;

    switch (blockId) {
      // --- ДВИЖЕНИЕ ---
      case "motion_movesteps": {
        const steps = Number(args.STEPS) || 0;
        // В Scratch 0° = вверх, 90° = вправо
        const rad = (sprite.direction * Math.PI) / 180;
        sprite.x += Math.round(steps * Math.sin(rad));
        sprite.y += Math.round(steps * Math.cos(rad));
        this.stage.drawPenLine(sprite, prevX, prevY, sprite.x, sprite.y);
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "motion_turnright": {
        const deg = Number(args.DEGREES) || 0;
        sprite.direction = (sprite.direction + deg) % 360;
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "motion_turnleft": {
        const deg = Number(args.DEGREES) || 0;
        sprite.direction = (sprite.direction - deg + 360) % 360;
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "motion_gotoxy": {
        sprite.x = Number(args.X) || 0;
        sprite.y = Number(args.Y) || 0;
        this.stage.drawPenLine(sprite, prevX, prevY, sprite.x, sprite.y);
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "motion_glideto": {
        const secs = Math.max(0.05, Number(args.SECS) || 1);
        const targetX = Number(args.X) || 0;
        const targetY = Number(args.Y) || 0;
        const startX = sprite.x;
        const startY = sprite.y;
        const frames = secs * 30;
        for (let i = 1; i <= frames && !thread.cancelled && this.isRunning; i++) {
          const t = i / frames;
          const oldX = sprite.x;
          const oldY = sprite.y;
          sprite.x = Math.round(startX + (targetX - startX) * t);
          sprite.y = Math.round(startY + (targetY - startY) * t);
          this.stage.drawPenLine(sprite, oldX, oldY, sprite.x, sprite.y);
          this.stage.notifySpriteChanged(sprite);
          await sleep(33);
        }
        break;
      }
      case "motion_changexby": {
        sprite.x += Number(args.DX) || 0;
        this.stage.drawPenLine(sprite, prevX, prevY, sprite.x, sprite.y);
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "motion_setx": {
        sprite.x = Number(args.X) || 0;
        this.stage.drawPenLine(sprite, prevX, prevY, sprite.x, sprite.y);
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "motion_changeyby": {
        sprite.y += Number(args.DY) || 0;
        this.stage.drawPenLine(sprite, prevX, prevY, sprite.x, sprite.y);
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "motion_sety": {
        sprite.y = Number(args.Y) || 0;
        this.stage.drawPenLine(sprite, prevX, prevY, sprite.x, sprite.y);
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "motion_ifonedgebounce": {
        const maxX = 210;
        const maxY = 150;
        let bounced = false;

        if (sprite.x > maxX) {
          sprite.x = maxX;
          sprite.direction = -sprite.direction;
          bounced = true;
        } else if (sprite.x < -maxX) {
          sprite.x = -maxX;
          sprite.direction = -sprite.direction;
          bounced = true;
        }

        if (sprite.y > maxY) {
          sprite.y = maxY;
          sprite.direction = 180 - sprite.direction;
          bounced = true;
        } else if (sprite.y < -maxY) {
          sprite.y = -maxY;
          sprite.direction = 180 - sprite.direction;
          bounced = true;
        }

        if (bounced) {
          sprite.direction = (sprite.direction + 360) % 360;
          this.stage.notifySpriteChanged(sprite);
        }
        await sleep(10);
        break;
      }
      case "motion_setrotationstyle": {
        sprite.rotationStyle = args.STYLE || "left-right";
        break;
      }

      // --- ВНЕШНИЙ ВИД ---
      case "looks_sayforsecs": {
        const text = String(args.MESSAGE || "");
        const secs = Math.max(0.1, Number(args.SECS) || 2);
        sprite.bubble = { text, type: "say", expireTime: Date.now() + secs * 1000 };
        await sleep(secs * 1000);
        if (sprite.bubble && sprite.bubble.text === text) sprite.bubble = null;
        break;
      }
      case "looks_say": {
        const text = String(args.MESSAGE || "");
        sprite.bubble = text ? { text, type: "say", expireTime: null } : null;
        await sleep(20);
        break;
      }
      case "looks_thinkforsecs": {
        const text = String(args.MESSAGE || "");
        const secs = Math.max(0.1, Number(args.SECS) || 2);
        sprite.bubble = { text, type: "think", expireTime: Date.now() + secs * 1000 };
        await sleep(secs * 1000);
        if (sprite.bubble && sprite.bubble.text === text) sprite.bubble = null;
        break;
      }
      case "looks_nextcostume": {
        if (sprite.costumes && sprite.costumes.length > 1) {
          sprite.costumeIndex = (sprite.costumeIndex + 1) % sprite.costumes.length;
        }
        await sleep(20);
        break;
      }
      case "looks_changesizeby": {
        sprite.size = Math.max(10, Math.min(300, sprite.size + (Number(args.CHANGE) || 0)));
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "looks_setsizeto": {
        sprite.size = Math.max(10, Math.min(300, Number(args.SIZE) || 100));
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "looks_show": {
        sprite.visible = true;
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }
      case "looks_hide": {
        sprite.visible = false;
        this.stage.notifySpriteChanged(sprite);
        await sleep(20);
        break;
      }

      // --- ЗВУК ---
      case "sound_playmeow": {
        if (window.scratchAudio) {
          window.scratchAudio.playSound(args.SOUND || "meow");
        }
        await sleep(100);
        break;
      }
      case "sound_playnote": {
        if (window.scratchAudio) {
          const note = Number(args.NOTE) || 60;
          const secs = Number(args.SECS) || 0.5;
          window.scratchAudio.playNote(note, secs);
          await sleep(secs * 1000);
        }
        break;
      }

      // --- УПРАВЛЕНИЕ ---
      case "control_wait": {
        const secs = Math.max(0.01, Number(args.DURATION) || 1);
        await sleep(secs * 1000);
        break;
      }
      case "control_repeat": {
        const times = Math.max(0, Math.round(Number(args.TIMES) || 10));
        for (let i = 0; i < times && !thread.cancelled && this.isRunning; i++) {
          await this.runSubstack(blockEl, blockData, sprite, thread);
          await sleep(10);
        }
        break;
      }
      case "control_forever": {
        while (!thread.cancelled && this.isRunning) {
          await this.runSubstack(blockEl, blockData, sprite, thread);
          await sleep(15);
        }
        break;
      }
      case "control_if": {
        const cond = this.checkCondition(args.CONDITION, sprite);
        if (cond) {
          await this.runSubstack(blockEl, blockData, sprite, thread);
        }
        break;
      }
      case "control_stop": {
        this.stopAll();
        break;
      }

      // --- ПЕРЕМЕННЫЕ ---
      case "data_setvariableto": {
        const varName = args.VAR || "счёт";
        const val = Number(args.VALUE) || 0;
        this.setVariable(varName, val);
        break;
      }
      case "data_changevariableby": {
        const varName = args.VAR || "счёт";
        const val = Number(args.VALUE) || 1;
        this.changeVariable(varName, val);
        break;
      }

      // --- ПЕРО ---
      case "pen_clear": {
        this.stage.clearPen();
        break;
      }
      case "pen_pendown": {
        sprite.penDown = true;
        break;
      }
      case "pen_penup": {
        sprite.penDown = false;
        break;
      }
      case "pen_setcolor": {
        sprite.penColor = args.COLOR || "#4C97FF";
        break;
      }
      case "pen_setsize": {
        sprite.penSize = Math.max(1, Number(args.SIZE) || 3);
        break;
      }

      // --- СООБЩЕНИЯ ---
      case "event_broadcast": {
        this.triggerEvent("broadcast", null, args.MSG || "сообщение1");
        break;
      }
    }
  }

  // Выполнение вложенного стека (внутри C-блоков)
  async runSubstack(blockEl, blockData, sprite, thread) {
    if (blockEl) {
      const cBody = blockEl.querySelector(".c-body");
      if (cBody) {
        let child = cBody.firstElementChild;
        while (child && !thread.cancelled && this.isRunning) {
          if (child.classList.contains("scratch-block")) {
            await this.executeBlock(child, sprite, thread);
          }
          child = child.nextElementSibling;
        }
      }
    } else if (blockData && blockData.substack) {
      for (const item of blockData.substack) {
        if (thread.cancelled || !this.isRunning) break;
        await this.executeBlockData(item, sprite, thread);
      }
    }
  }

  // Проверка условий
  checkCondition(condName, sprite) {
    switch (condName) {
      case "touching_edge":
        return Math.abs(sprite.x) >= 200 || Math.abs(sprite.y) >= 140;
      case "touching_mouse": {
        const dist = Math.hypot(sprite.x - this.stage.mouseX, sprite.y - this.stage.mouseY);
        return dist < (sprite.size / 100) * 35;
      }
      case "mouse_down":
        return this.stage.isMouseDown;
      case "key_space":
        return this.pressedKeys.has("Space");
      default:
        return false;
    }
  }
}

window.ScratchEngine = ScratchEngine;
