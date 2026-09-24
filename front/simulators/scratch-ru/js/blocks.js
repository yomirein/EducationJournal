// js/blocks.js - Определения и шаблоны блоков Скретч на русском языке

window.BLOCK_CATEGORIES = {
  motion: { id: "motion", name: "Движение", color: "#4C97FF", darkColor: "#3373CC" },
  looks: { id: "looks", name: "Внешний вид", color: "#9966FF", darkColor: "#774DCB" },
  sound: { id: "sound", name: "Звук", color: "#CF63CF", darkColor: "#BD42BD" },
  events: { id: "events", name: "События", color: "#FFBF00", darkColor: "#CC9900" },
  control: { id: "control", name: "Управление", color: "#FFAB19", darkColor: "#CF8B17" },
  sensing: { id: "sensing", name: "Сенсоры", color: "#5CB1D6", darkColor: "#2E8EB8" },
  operators: { id: "operators", name: "Операторы", color: "#59C059", darkColor: "#389438" },
  variables: { id: "variables", name: "Переменные", color: "#FF8C1A", darkColor: "#DB6E00" },
  pen: { id: "pen", name: "Перо", color: "#0FBD8C", darkColor: "#0B8E69" }
};

window.BLOCK_DEFS = {
  // === ДВИЖЕНИЕ ===
  motion_movesteps: {
    category: "motion",
    type: "command",
    text: "идти {STEPS} шагов",
    args: { STEPS: { type: "number", default: 10 } }
  },
  motion_turnright: {
    category: "motion",
    type: "command",
    text: "повернуть вправо на {DEGREES} градусов",
    args: { DEGREES: { type: "number", default: 15 } }
  },
  motion_turnleft: {
    category: "motion",
    type: "command",
    text: "повернуть влево на {DEGREES} градусов",
    args: { DEGREES: { type: "number", default: 15 } }
  },
  motion_gotoxy: {
    category: "motion",
    type: "command",
    text: "перейти в x: {X} y: {Y}",
    args: { X: { type: "number", default: 0 }, Y: { type: "number", default: 0 } }
  },
  motion_glideto: {
    category: "motion",
    type: "command",
    text: "плыть {SECS} сек в точку x: {X} y: {Y}",
    args: { SECS: { type: "number", default: 1 }, X: { type: "number", default: 0 }, Y: { type: "number", default: 0 } }
  },
  motion_changexby: {
    category: "motion",
    type: "command",
    text: "изменить x на {DX}",
    args: { DX: { type: "number", default: 10 } }
  },
  motion_setx: {
    category: "motion",
    type: "command",
    text: "установить x в {X}",
    args: { X: { type: "number", default: 0 } }
  },
  motion_changeyby: {
    category: "motion",
    type: "command",
    text: "изменить y на {DY}",
    args: { DY: { type: "number", default: 10 } }
  },
  motion_sety: {
    category: "motion",
    type: "command",
    text: "установить y в {Y}",
    args: { Y: { type: "number", default: 0 } }
  },
  motion_ifonedgebounce: {
    category: "motion",
    type: "command",
    text: "если касается края, оттолкнуться",
    args: {}
  },
  motion_setrotationstyle: {
    category: "motion",
    type: "command",
    text: "стиль вращения {STYLE}",
    args: {
      STYLE: {
        type: "select",
        options: [
          { value: "all", label: "кругом" },
          { value: "left-right", label: "влево-вправо" },
          { value: "none", label: "не вращать" }
        ],
        default: "left-right"
      }
    }
  },

  // === ВНЕШНИЙ ВИД ===
  looks_sayforsecs: {
    category: "looks",
    type: "command",
    text: "сказать {MESSAGE} {SECS} сек",
    args: { MESSAGE: { type: "text", default: "Привет!" }, SECS: { type: "number", default: 2 } }
  },
  looks_say: {
    category: "looks",
    type: "command",
    text: "сказать {MESSAGE}",
    args: { MESSAGE: { type: "text", default: "Привет!" } }
  },
  looks_thinkforsecs: {
    category: "looks",
    type: "command",
    text: "думать {MESSAGE} {SECS} сек",
    args: { MESSAGE: { type: "text", default: "Ммм..." }, SECS: { type: "number", default: 2 } }
  },
  looks_nextcostume: {
    category: "looks",
    type: "command",
    text: "следующий костюм",
    args: {}
  },
  looks_changesizeby: {
    category: "looks",
    type: "command",
    text: "изменить размер на {CHANGE}",
    args: { CHANGE: { type: "number", default: 10 } }
  },
  looks_setsizeto: {
    category: "looks",
    type: "command",
    text: "установить размер {SIZE} %",
    args: { SIZE: { type: "number", default: 100 } }
  },
  looks_show: {
    category: "looks",
    type: "command",
    text: "показаться",
    args: {}
  },
  looks_hide: {
    category: "looks",
    type: "command",
    text: "спрятаться",
    args: {}
  },

  // === ЗВУК ===
  sound_playmeow: {
    category: "sound",
    type: "command",
    text: "включить звук {SOUND}",
    args: {
      SOUND: {
        type: "select",
        options: [
          { value: "meow", label: "Мяу" },
          { value: "pop", label: "Щелчок" },
          { value: "jump", label: "Прыжок" },
          { value: "coin", label: "Монетка" },
          { value: "laser", label: "Лазер" }
        ],
        default: "meow"
      }
    }
  },
  sound_playnote: {
    category: "sound",
    type: "command",
    text: "играть ноту {NOTE} {SECS} сек",
    args: { NOTE: { type: "number", default: 60 }, SECS: { type: "number", default: 0.5 } }
  },

  // === СОБЫТИЯ (ШАПОЧКИ) ===
  event_whenflagclicked: {
    category: "events",
    type: "hat",
    text: "когда зеленый флаг нажат",
    args: {}
  },
  event_whenkeypressed: {
    category: "events",
    type: "hat",
    text: "когда клавиша {KEY} нажата",
    args: {
      KEY: {
        type: "select",
        options: [
          { value: "Space", label: "пробел" },
          { value: "ArrowUp", label: "стрелка вверх" },
          { value: "ArrowDown", label: "стрелка вниз" },
          { value: "ArrowRight", label: "стрелка вправо" },
          { value: "ArrowLeft", label: "стрелка влево" },
          { value: "KeyW", label: "W" },
          { value: "KeyS", label: "S" },
          { value: "KeyA", label: "A" },
          { value: "KeyD", label: "D" }
        ],
        default: "Space"
      }
    }
  },
  event_whenthisspriteclicked: {
    category: "events",
    type: "hat",
    text: "когда спрайт нажат",
    args: {}
  },
  event_broadcast: {
    category: "events",
    type: "command",
    text: "передать {MSG}",
    args: { MSG: { type: "text", default: "сообщение1" } }
  },
  event_whenbroadcastreceived: {
    category: "events",
    type: "hat",
    text: "когда я получу {MSG}",
    args: { MSG: { type: "text", default: "сообщение1" } }
  },

  // === УПРАВЛЕНИЕ ===
  control_wait: {
    category: "control",
    type: "command",
    text: "ждать {DURATION} секунд",
    args: { DURATION: { type: "number", default: 1 } }
  },
  control_repeat: {
    category: "control",
    type: "c_block",
    text: "повторить {TIMES} раз",
    args: { TIMES: { type: "number", default: 10 } }
  },
  control_forever: {
    category: "control",
    type: "c_block",
    text: "всегда",
    args: {}
  },
  control_if: {
    category: "control",
    type: "c_block",
    text: "если {CONDITION} то",
    args: {
      CONDITION: {
        type: "select",
        options: [
          { value: "touching_edge", label: "касается края?" },
          { value: "touching_mouse", label: "касается мыши?" },
          { value: "touching_sprite:basket", label: "касается корзины?" },
          { value: "mouse_down", label: "мышь нажата?" },
          { value: "key_space", label: "клавиша пробел нажата?" }
        ],
        default: "touching_edge"
      }
    }
  },
  control_stop: {
    category: "control",
    type: "command",
    text: "стоп всё",
    args: {}
  },

  // === СЕНСОРЫ ===
  sensing_resettimer: {
    category: "sensing",
    type: "command",
    text: "перезапустить таймер",
    args: {}
  },
  sensing_touching: {
    category: "sensing",
    type: "command",
    text: "проверить касание {TARGET}",
    args: {
      TARGET: {
        type: "select",
        options: [
          { value: "edge", label: "края" },
          { value: "mouse", label: "указателя мыши" }
        ],
        default: "edge"
      }
    }
  },

  // === ОПЕРАТОРЫ ===
  operators_add: {
    category: "operators",
    type: "command",
    text: "сложить {NUM1} + {NUM2}",
    args: { NUM1: { type: "number", default: 2 }, NUM2: { type: "number", default: 3 } }
  },
  operators_random: {
    category: "operators",
    type: "command",
    text: "случайное от {FROM} до {TO}",
    args: { FROM: { type: "number", default: 1 }, TO: { type: "number", default: 10 } }
  },
  operators_join: {
    category: "operators",
    type: "command",
    text: "объединить {STR1} и {STR2}",
    args: { STR1: { type: "text", default: "Привет, " }, STR2: { type: "text", default: "мир!" } }
  },

  // === ПЕРЕМЕННЫЕ ===
  data_setvariableto: {
    category: "variables",
    type: "command",
    text: "установить {VAR} в {VALUE}",
    args: { VAR: { type: "var_select", default: "счёт" }, VALUE: { type: "number", default: 0 } }
  },
  data_changevariableby: {
    category: "variables",
    type: "command",
    text: "изменить {VAR} на {VALUE}",
    args: { VAR: { type: "var_select", default: "счёт" }, VALUE: { type: "number", default: 1 } }
  },

  // === ПЕРО ===
  pen_clear: {
    category: "pen",
    type: "command",
    text: "стереть всё",
    args: {}
  },
  pen_pendown: {
    category: "pen",
    type: "command",
    text: "опустить перо",
    args: {}
  },
  pen_penup: {
    category: "pen",
    type: "command",
    text: "поднять перо",
    args: {}
  },
  pen_setcolor: {
    category: "pen",
    type: "command",
    text: "установить цвет пера {COLOR}",
    args: {
      COLOR: {
        type: "color",
        default: "#4C97FF"
      }
    }
  },
  pen_setsize: {
    category: "pen",
    type: "command",
    text: "установить размер пера {SIZE}",
    args: { SIZE: { type: "number", default: 3 } }
  }
};

// Функция сборки DOM-элемента блока
window.renderBlockElement = function(blockId, userArgs = {}, isPalette = false) {
  const def = window.BLOCK_DEFS[blockId];
  if (!def) return null;
  const cat = window.BLOCK_CATEGORIES[def.category];

  const el = document.createElement("div");
  el.className = `scratch-block block-${def.type} cat-${def.category}`;
  el.dataset.blockId = blockId;
  el.dataset.type = def.type;
  el.style.backgroundColor = cat.color;
  el.style.borderColor = cat.darkColor;

  // Заголовок / текст блока
  const labelDiv = document.createElement("div");
  labelDiv.className = "block-label";

  // Парсим плейсхолдеры из текста шаблона: "идти {STEPS} шагов"
  const parts = def.text.split(/(\{.*?\})/g);
  parts.forEach(part => {
    if (part.startsWith("{") && part.endsWith("}")) {
      const argKey = part.slice(1, -1);
      const argDef = def.args[argKey];
      if (argDef) {
        const val = userArgs[argKey] !== undefined ? userArgs[argKey] : argDef.default;
        
        if (argDef.type === "select") {
          const select = document.createElement("select");
          select.className = "block-input block-select";
          argDef.options.forEach(opt => {
            const opEl = document.createElement("option");
            opEl.value = opt.value;
            opEl.textContent = opt.label;
            if (opt.value === val) opEl.selected = true;
            select.appendChild(opEl);
          });
          select.dataset.arg = argKey;
          labelDiv.appendChild(select);
        } else if (argDef.type === "var_select") {
          const select = document.createElement("select");
          select.className = "block-input block-select block-var-select";
          select.dataset.arg = argKey;
          const vars = window.currentProject ? window.currentProject.variables : ["счёт"];
          vars.forEach(v => {
            const opEl = document.createElement("option");
            opEl.value = v;
            opEl.textContent = v;
            if (v === val) opEl.selected = true;
            select.appendChild(opEl);
          });
          labelDiv.appendChild(select);
        } else if (argDef.type === "color") {
          const input = document.createElement("input");
          input.type = "color";
          input.className = "block-input block-color";
          input.value = val;
          input.dataset.arg = argKey;
          labelDiv.appendChild(input);
        } else {
          const input = document.createElement("input");
          input.type = argDef.type === "number" ? "number" : "text";
          input.className = `block-input ${argDef.type === "number" ? "input-number" : "input-text"}`;
          input.value = val;
          input.dataset.arg = argKey;
          // Авто-ресайз инпута по содержимому
          const updateWidth = () => {
            const len = Math.max(1, (input.value || "").length);
            input.style.width = (len * 8 + 18) + "px";
          };
          input.addEventListener("input", updateWidth);
          setTimeout(updateWidth, 0);
          labelDiv.appendChild(input);
        }
      }
    } else if (part.length > 0) {
      const textSpan = document.createElement("span");
      textSpan.textContent = part;
      labelDiv.appendChild(textSpan);
    }
  });

  el.appendChild(labelDiv);

  // Для C-блоков (циклы/условия) добавляем внутренний слот для блоков и нижнюю планку
  if (def.type === "c_block") {
    const body = document.createElement("div");
    body.className = "block-body c-body";
    body.dataset.slot = "substack";
    el.appendChild(body);

    const footer = document.createElement("div");
    footer.className = "c-footer";
    footer.style.backgroundColor = cat.color;
    footer.style.borderColor = cat.darkColor;
    el.appendChild(footer);
  }

  return el;
};
