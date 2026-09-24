// js/engine.js - Парсер и интерпретатор команд Python и C++ для игры «БЛОК КУБА»

class KumirEngine {
  constructor(world, audio) {
    this.world = world;
    this.audio = audio;
    this.instructions = [];
    this.currentPc = 0;
    this.isRunning = false;
    this.speedDelay = 350; // задержка в мс
    this.diamondsCollected = 0;
    this.stepsTaken = 0;
    this.blocksPlaced = 0;
    this.status = "IDLE"; // IDLE, RUNNING, PAUSED, SUCCESS, FAILED
    this.errorMessage = null;
    this.currentLevel = null;

    this.onStepCallback = null;
    this.onFinishCallback = null;
    this.onConsoleLog = null;
  }

  logConsole(msg, type = "info") {
    if (this.onConsoleLog) {
      this.onConsoleLog(msg, type);
    }
  }

  setLevel(levelData) {
    this.currentLevel = levelData;
  }

  // Парсинг кода на Python или C++ (а также обратная совместимость с Кумиром)
  parse(codeText) {
    const rawLines = codeText.split("\n");
    const tokens = [];

    // Стек отступов для Python: [{ indent: number, type: 'LOOP' | 'IF' }]
    const indentStack = [];

    rawLines.forEach((rawLine, lineIndex) => {
      const lineNum = lineIndex + 1;
      const trimmed = rawLine.trim();

      // Пропускаем пустые строки и комментарии
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
        return;
      }

      // Игнорируем заголовки C++ и Python boilerplate
      if (
        trimmed.startsWith("#include") ||
        trimmed.startsWith("using namespace") ||
        trimmed === "int main() {" ||
        trimmed === "int main()" ||
        trimmed === "{" ||
        trimmed === "return 0;" ||
        trimmed === "pass" ||
        trimmed.startsWith("def main():") ||
        trimmed === "main()" ||
        trimmed === "использовать робот" ||
        trimmed === "алг" ||
        trimmed === "нач" ||
        trimmed === "кон"
      ) {
        return;
      }

      // 1. Проверка закрытия блоков Python по отступам
      const currentIndent = rawLine.search(/\S/);
      while (indentStack.length > 0 && currentIndent <= indentStack[indentStack.length - 1].indent) {
        const closed = indentStack.pop();
        if (closed.type === "LOOP") {
          tokens.push({ type: "LOOP_END", lineNum });
        } else if (closed.type === "IF") {
          tokens.push({ type: "IF_END", lineNum });
        }
      }

      // 2. Закрытие блока C++ фигурной скобкой
      if (trimmed === "}" || trimmed === "};") {
        if (indentStack.length > 0) {
          const closed = indentStack.pop();
          if (closed.type === "LOOP") {
            tokens.push({ type: "LOOP_END", lineNum });
          } else if (closed.type === "IF") {
            tokens.push({ type: "IF_END", lineNum });
          }
        }
        return;
      }

      // Нормализуем строку для распознавания команд
      let clean = trimmed.replace(/;$/, ""); // убираем точку с запятой в C++
      clean = clean.replace(/^(player|steve|agent)\./i, ""); // поддержка объектного Python API: player.move_right()

      // Движение: move_right(), move_left(), move_up(), move_down(), forward(), turn_right(), turn_left()
      if (clean === "move_right()" || clean === "step_right()" || clean === "right()" || clean === "вправо" || clean === "вправо()") {
        tokens.push({ type: "COMMAND", cmd: "right", raw: trimmed, lineNum });
      } else if (clean === "move_left()" || clean === "step_left()" || clean === "left()" || clean === "влево" || clean === "влево()") {
        tokens.push({ type: "COMMAND", cmd: "left", raw: trimmed, lineNum });
      } else if (clean === "move_up()" || clean === "step_up()" || clean === "up()" || clean === "вверх" || clean === "вверх()") {
        tokens.push({ type: "COMMAND", cmd: "up", raw: trimmed, lineNum });
      } else if (clean === "move_down()" || clean === "step_down()" || clean === "down()" || clean === "вниз" || clean === "вниз()") {
        tokens.push({ type: "COMMAND", cmd: "down", raw: trimmed, lineNum });
      } else if (clean === "forward()" || clean === "move_forward()" || clean === "step()" || clean === "вперед" || clean === "вперед()") {
        tokens.push({ type: "COMMAND", cmd: "forward", raw: trimmed, lineNum });
      } else if (clean === "turn_right()" || clean === "повернуть_вправо()" || clean === "направо" || clean === "направо()") {
        tokens.push({ type: "COMMAND", cmd: "turn_right", raw: trimmed, lineNum });
      } else if (clean === "turn_left()" || clean === "повернуть_влево()" || clean === "налево" || clean === "налево()") {
        tokens.push({ type: "COMMAND", cmd: "turn_left", raw: trimmed, lineNum });
      } 
      // Действия
      else if (clean === "destroy()" || clean === "break_block()" || clean === "mine()" || clean === "сломать" || clean === "сломать()") {
        tokens.push({ type: "COMMAND", cmd: "break", raw: trimmed, lineNum });
      } else if (clean === "place()" || clean === "place_block()" || clean === "build()" || clean === "поставить" || clean === "поставить()") {
        tokens.push({ type: "COMMAND", cmd: "place", raw: trimmed, lineNum });
      } else if (clean === "collect()" || clean === "collect_diamond()" || clean === "take()" || clean === "взять" || clean === "взять()") {
        tokens.push({ type: "COMMAND", cmd: "collect", raw: trimmed, lineNum });
      } else if (clean === "mark()" || clean === "light()" || clean === "закрасить" || clean === "закрасить()") {
        tokens.push({ type: "COMMAND", cmd: "mark", raw: trimmed, lineNum });
      }

      // Цикл со счётчиком: Python "for i in range(N):" или C++ "for (int i=0; i<N; i++)"
      else if (clean.startsWith("for ") || clean.startsWith("for(")) {
        let count = 2;
        const pyRangeMatch = clean.match(/range\((\d+)\)/);
        const cppRangeMatch = clean.match(/<\s*(\d+)/);
        const kumirMatch = clean.match(/нц\s+(\d+)\s+раз/);

        if (pyRangeMatch) {
          count = parseInt(pyRangeMatch[1], 10);
        } else if (cppRangeMatch) {
          count = parseInt(cppRangeMatch[1], 10);
        } else if (kumirMatch) {
          count = parseInt(kumirMatch[1], 10);
        }

        tokens.push({ type: "LOOP_START", count, lineNum });
        indentStack.push({ indent: currentIndent, type: "LOOP" });
      }

      // Цикл с условием: Python "while <cond>:" или C++ "while (<cond>)"
      else if (clean.startsWith("while ") || clean.startsWith("while(")) {
        let condStr = clean.replace(/^while\s*\(?/, "").replace(/\)?\s*\{?:?$/, "").trim();
        tokens.push({ type: "WHILE_START", cond: condStr, lineNum });
        indentStack.push({ indent: currentIndent, type: "LOOP" });
      }

      // Ветвление: Python "if <cond>:" или C++ "if (<cond>)"
      else if (clean.startsWith("if ") || clean.startsWith("if(")) {
        let condStr = clean.replace(/^if\s*\(?/, "").replace(/\)?\s*\{?:?$/, "").trim();
        tokens.push({ type: "IF_START", cond: condStr, lineNum });
        indentStack.push({ indent: currentIndent, type: "IF" });
      }

      // Закрытие цикла в Кумире
      else if (clean === "кц") {
        tokens.push({ type: "LOOP_END", lineNum });
        if (indentStack.length > 0) indentStack.pop();
      } else if (clean === "все" || clean === "всё") {
        tokens.push({ type: "IF_END", lineNum });
        if (indentStack.length > 0) indentStack.pop();
      }
    });

    // Закрываем оставшиеся открытые блоки в конце файла
    while (indentStack.length > 0) {
      const closed = indentStack.pop();
      if (closed.type === "LOOP") {
        tokens.push({ type: "LOOP_END", lineNum: rawLines.length });
      } else if (closed.type === "IF") {
        tokens.push({ type: "IF_END", lineNum: rawLines.length });
      }
    }

    this.instructions = this.compileAST(tokens);
    this.currentPc = 0;
    this.status = "IDLE";
    this.errorMessage = null;
    return this.instructions;
  }

  // Компиляция AST в список инструкций с прыжками
  compileAST(tokens) {
    const instrs = [];
    const loopStack = [];
    const ifStack = [];

    tokens.forEach((tok) => {
      if (tok.type === "COMMAND") {
        instrs.push({ ...tok });
      } else if (tok.type === "LOOP_START") {
        const idx = instrs.length;
        instrs.push({ type: "LOOP_HEAD", count: tok.count, remaining: tok.count, lineNum: tok.lineNum, jumpEnd: -1 });
        loopStack.push(idx);
      } else if (tok.type === "WHILE_START") {
        const idx = instrs.length;
        instrs.push({ type: "WHILE_HEAD", cond: tok.cond, lineNum: tok.lineNum, jumpEnd: -1 });
        loopStack.push(idx);
      } else if (tok.type === "LOOP_END") {
        const headIdx = loopStack.pop();
        if (headIdx !== undefined) {
          const endIdx = instrs.length;
          instrs[headIdx].jumpEnd = endIdx + 1;
          instrs.push({ type: "LOOP_BACK", headIdx, lineNum: tok.lineNum });
        }
      } else if (tok.type === "IF_START") {
        const idx = instrs.length;
        instrs.push({ type: "IF_HEAD", cond: tok.cond, lineNum: tok.lineNum, jumpEnd: -1 });
        ifStack.push(idx);
      } else if (tok.type === "IF_END") {
        const headIdx = ifStack.pop();
        if (headIdx !== undefined) {
          instrs[headIdx].jumpEnd = instrs.length;
        }
      }
    });

    return instrs;
  }

  // Проверка условий Стива на Python и C++
  checkCondition(rawCond) {
    const s = this.world.steve;
    const grid = this.world.grid;
    const w = this.world.gridWidth;
    const h = this.world.gridHeight;

    const isFree = (x, y) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return false;
      const b = grid[y][x];
      return b !== "stone" && b !== "cobblestone";
    };

    // Нормализация условия
    const cond = rawCond.replace(/[()]/g, "").trim().toLowerCase();

    if (cond === "is_clear_forward" || cond === "free_forward" || cond === "впереди свободно") {
      if (s.dir === "right") return isFree(s.x + 1, s.y);
      if (s.dir === "left") return isFree(s.x - 1, s.y);
      if (s.dir === "up") return isFree(s.x, s.y - 1);
      if (s.dir === "down") return isFree(s.x, s.y + 1);
      return false;
    }

    if (cond === "is_lava_ahead" || cond === "впереди лава") {
      const nx = s.x + (s.dir === "right" ? 1 : s.dir === "left" ? -1 : 0);
      const ny = s.y + (s.dir === "down" ? 1 : s.dir === "up" ? -1 : 0);
      return grid[ny] && grid[ny][nx] === "lava";
    }

    if (cond === "is_diamond_ahead" || cond === "впереди алмаз") {
      const nx = s.x + (s.dir === "right" ? 1 : s.dir === "left" ? -1 : 0);
      const ny = s.y + (s.dir === "down" ? 1 : s.dir === "up" ? -1 : 0);
      return grid[ny] && (grid[ny][nx] === "diamond" || grid[ny][nx] === "diamond_ore");
    }

    if (cond === "is_clear_right" || cond === "справа свободно") {
      return isFree(s.x + 1, s.y);
    }
    if (cond === "is_wall_right" || cond === "справа стена") {
      return !isFree(s.x + 1, s.y);
    }
    if (cond === "is_clear_left" || cond === "слева свободно") {
      return isFree(s.x - 1, s.y);
    }
    if (cond === "is_wall_left" || cond === "слева стена") {
      return !isFree(s.x - 1, s.y);
    }
    if (cond === "is_clear_up" || cond === "вверху свободно") {
      return isFree(s.x, s.y - 1);
    }
    if (cond === "is_clear_down" || cond === "внизу свободно") {
      return isFree(s.x, s.y + 1);
    }

    return false;
  }

  // Пошаговое выполнение
  step() {
    if (this.currentPc >= this.instructions.length) {
      this.finishExecution();
      return false;
    }

    const instr = this.instructions[this.currentPc];
    const s = this.world.steve;

    if (this.onStepCallback) {
      this.onStepCallback({
        lineNum: instr.lineNum,
        pc: this.currentPc,
        steve: { ...s }
      });
    }

    switch (instr.type) {
      case "COMMAND": {
        this.executeCommand(instr.cmd);
        this.currentPc++;
        break;
      }

      case "LOOP_HEAD": {
        if (instr.remaining > 0) {
          instr.remaining--;
          this.currentPc++;
        } else {
          instr.remaining = instr.count;
          this.currentPc = instr.jumpEnd;
        }
        break;
      }

      case "WHILE_HEAD": {
        if (this.checkCondition(instr.cond)) {
          this.currentPc++;
        } else {
          this.currentPc = instr.jumpEnd;
        }
        break;
      }

      case "LOOP_BACK": {
        this.currentPc = instr.headIdx;
        break;
      }

      case "IF_HEAD": {
        if (this.checkCondition(instr.cond)) {
          this.currentPc++;
        } else {
          this.currentPc = instr.jumpEnd;
        }
        break;
      }
    }

    if (this.status === "FAILED") {
      this.finishExecution();
      return false;
    }

    return true;
  }

  // Исполнение конкретной команды
  executeCommand(cmd) {
    const s = this.world.steve;
    let targetX = s.x;
    let targetY = s.y;

    if (cmd === "right") {
      targetX++;
      s.dir = "right";
    } else if (cmd === "left") {
      targetX--;
      s.dir = "left";
    } else if (cmd === "up") {
      targetY--;
      s.dir = "up";
    } else if (cmd === "down") {
      targetY++;
      s.dir = "down";
    } else if (cmd === "mark") {
      this.world.grid[s.y][s.x] = "marked";
      this.audio.playBreak();
      return;
    } else if (cmd === "break") {
      this.world.animateHit();
      const fx = s.x + (s.dir === "right" ? 1 : s.dir === "left" ? -1 : 0);
      const fy = s.y + (s.dir === "down" ? 1 : s.dir === "up" ? -1 : 0);
      if (this.world.grid[fy] && this.world.grid[fy][fx]) {
        const block = this.world.grid[fy][fx];
        if (block === "diamond" || block === "diamond_ore") {
          this.diamondsCollected++;
          this.audio.playDiamond();
          this.world.addBlockParticles(fx, fy, "#2DEDDA");
        } else {
          this.audio.playBreak();
          this.world.addBlockParticles(fx, fy, "#737373");
        }
        this.world.grid[fy][fx] = "air";
      }
      return;
    } else if (cmd === "place") {
      this.world.animateHit();
      const fx = s.x + (s.dir === "right" ? 1 : s.dir === "left" ? -1 : 0);
      const fy = s.y + (s.dir === "down" ? 1 : s.dir === "up" ? -1 : 0);
      if (this.world.grid[fy] && this.world.grid[fy][fx] !== undefined) {
        if (this.world.grid[fy][fx] === "lava") {
          this.audio.playSizzle();
          this.world.addBlockParticles(fx, fy, "#F57D00");
        } else {
          this.audio.playBreak();
        }
        this.world.grid[fy][fx] = "bridge";
        this.blocksPlaced++;
      }
      return;
    }

    // Проверка границ поля
    if (targetX < 0 || targetX >= this.world.gridWidth || targetY < 0 || targetY >= this.world.gridHeight) {
      this.status = "FAILED";
      this.errorMessage = "Стив разбился о край мира!";
      this.world.damageSteve();
      return;
    }

    // Проверка каменной стены
    const nextBlock = this.world.grid[targetY][targetX];
    if (nextBlock === "stone" || nextBlock === "cobblestone") {
      this.status = "FAILED";
      this.errorMessage = "Стив врезался в каменную стену!";
      this.world.damageSteve();
      return;
    }

    // Проверка лавы
    if (nextBlock === "lava") {
      this.status = "FAILED";
      this.errorMessage = "Стив упал в лаву! Используйте place() для постройки моста.";
      this.world.damageSteve();
      this.audio.playSizzle();
      return;
    }

    // Успешный плавный шаг с прыжком в 2.5D
    this.world.animateMoveTo(targetX, targetY, s.dir);
    s.x = targetX;
    s.y = targetY;
    this.stepsTaken++;
    this.audio.playStep();

    if (nextBlock === "diamond" || nextBlock === "diamond_ore") {
      this.diamondsCollected++;
      this.world.grid[targetY][targetX] = "air";
      this.audio.playDiamond();
      this.world.addBlockParticles(targetX, targetY, "#2DEDDA");
    }
  }

  // Запуск выполнения
  async runAll(codeText) {
    if (this.status === "IDLE") {
      this.parse(codeText);
    }
    this.isRunning = true;
    this.status = "RUNNING";

    while (this.isRunning && this.currentPc < this.instructions.length) {
      const ok = this.step();
      if (!ok) break;
      await new Promise((r) => setTimeout(r, this.speedDelay));
    }

    if (this.isRunning && this.status !== "FAILED") {
      this.finishExecution();
    }
  }

  pause() {
    this.isRunning = false;
    this.status = "PAUSED";
  }

  reset(originalMap, originalSteve) {
    this.isRunning = false;
    this.status = "IDLE";
    this.currentPc = 0;
    this.diamondsCollected = 0;
    this.stepsTaken = 0;
    this.blocksPlaced = 0;
    this.errorMessage = null;
    this.world.loadMap(originalMap, originalSteve);
  }

  finishExecution() {
    this.isRunning = false;
    const s = this.world.steve;

    if (this.status !== "FAILED") {
      if (this.currentLevel) {
        if (this.currentLevel.requiredDiamonds && this.diamondsCollected < this.currentLevel.requiredDiamonds) {
          this.status = "FAILED";
          this.errorMessage = `Собрано ${this.diamondsCollected} из ${this.currentLevel.requiredDiamonds} алмазов! Добавьте больше команд.`;
        } else if (this.currentLevel.target && this.currentLevel.target.type === "reach_cell") {
          if (s.x !== this.currentLevel.target.x || s.y !== this.currentLevel.target.y) {
            this.status = "FAILED";
            this.errorMessage = "Стив остановился, но не дошёл до сундука!";
          }
        }
      }
    }

    if (this.status !== "FAILED") {
      this.status = "SUCCESS";
      this.world.triggerVictoryFireworks();
      this.audio.playVictory();
    }

    if (this.onFinishCallback) {
      this.onFinishCallback({
        status: this.status,
        steps: this.stepsTaken,
        diamonds: this.diamondsCollected,
        blocksPlaced: this.blocksPlaced,
        error: this.errorMessage
      });
    }
  }
}

window.KumirEngine = KumirEngine;
