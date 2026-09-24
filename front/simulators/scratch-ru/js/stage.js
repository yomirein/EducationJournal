// js/stage.js - Рендерер сцены Скретч (480x360, спрайты, костюмы, слой пера, баблы речи)

class ScratchStage {
  constructor(canvasEl, penCanvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.penCanvas = penCanvasEl;
    this.penCtx = penCanvasEl.getContext("2d");

    this.width = 480;
    this.height = 360;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.penCanvas.width = this.width;
    this.penCanvas.height = this.height;

    this.currentBackdrop = "blank";
    this.sprites = [];
    this.activeSpriteId = null;

    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseDown = false;
    this.draggedSprite = null;

    // Кеш для отрендеренных SVG изображений костюмов
    this.costumeImageCache = new Map();

    this.initEvents();
    this.startRenderLoop();
  }

  // Преобразование координат Скретч (центр 0,0) в координаты Canvas (0,0 в левом верхнем углу)
  toCanvasCoords(x, y) {
    return {
      cx: this.width / 2 + x,
      cy: this.height / 2 - y
    };
  }

  // Преобразование координат Canvas в координаты Скретч
  toScratchCoords(cx, cy) {
    return {
      x: Math.round(cx - this.width / 2),
      y: Math.round(this.height / 2 - cy)
    };
  }

  initEvents() {
    const getStagePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      return {
        cx: (e.clientX - rect.left) * scaleX,
        cy: (e.clientY - rect.top) * scaleY
      };
    };

    this.canvas.addEventListener("mousemove", (e) => {
      const { cx, cy } = getStagePos(e);
      const scratch = this.toScratchCoords(cx, cy);
      this.mouseX = scratch.x;
      this.mouseY = scratch.y;

      const mousePosEl = document.getElementById("stage-mouse-pos");
      if (mousePosEl) {
        mousePosEl.textContent = `x: ${this.mouseX} y: ${this.mouseY}`;
      }

      // Перетаскивание спрайта мышью по сцене
      if (this.draggedSprite) {
        this.draggedSprite.x = scratch.x;
        this.draggedSprite.y = scratch.y;
        this.notifySpriteChanged(this.draggedSprite);
      }
    });

    this.canvas.addEventListener("mousedown", (e) => {
      this.isMouseDown = true;
      const { cx, cy } = getStagePos(e);
      const scratch = this.toScratchCoords(cx, cy);

      // Проверка клика по спрайту (сверху вниз по z-индексу)
      for (let i = this.sprites.length - 1; i >= 0; i--) {
        const s = this.sprites[i];
        if (!s.visible) continue;
        const dist = Math.hypot(s.x - scratch.x, s.y - scratch.y);
        const radius = (s.size / 100) * 35;
        if (dist <= radius) {
          this.draggedSprite = s;
          this.activeSpriteId = s.id;
          if (window.scratchEngine) {
            window.scratchEngine.triggerEvent("whenthisspriteclicked", s.id);
          }
          break;
        }
      }
    });

    window.addEventListener("mouseup", () => {
      this.isMouseDown = false;
      this.draggedSprite = null;
    });
  }

  // Очистка слоя пера
  clearPen() {
    this.penCtx.clearRect(0, 0, this.width, this.height);
  }

  // Рисование линии пером между старыми и новыми координатами
  drawPenLine(sprite, prevX, prevY, newX, newY) {
    if (!sprite.penDown) return;
    const p1 = this.toCanvasCoords(prevX, prevY);
    const p2 = this.toCanvasCoords(newX, newY);

    this.penCtx.save();
    this.penCtx.strokeStyle = sprite.penColor || "#4C97FF";
    this.penCtx.lineWidth = sprite.penSize || 3;
    this.penCtx.lineCap = "round";
    this.penCtx.beginPath();
    this.penCtx.moveTo(p1.cx, p1.cy);
    this.penCtx.lineTo(p2.cx, p2.cy);
    this.penCtx.stroke();
    this.penCtx.restore();
  }

  // Основной цикл отрисовки 60 FPS
  startRenderLoop() {
    const render = () => {
      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  draw() {
    // 1. Отрисовка фона
    const backdropDef = window.SCRATCH_ASSETS.backdrops[this.currentBackdrop];
    if (backdropDef) {
      backdropDef.render(this.ctx, this.width, this.height);
    } else {
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Отрисовка слоя пера поверх фона
    this.ctx.drawImage(this.penCanvas, 0, 0);

    // 3. Отрисовка спрайтов
    const now = Date.now();
    this.sprites.forEach(sprite => {
      if (!sprite.visible) return;
      this.drawSprite(sprite);
      // Отрисовка облачка речи/мыслей
      if (sprite.bubble && (!sprite.bubble.expireTime || sprite.bubble.expireTime > now)) {
        this.drawSpeechBubble(sprite);
      }
    });

    // 4. Отрисовка мониторов переменных в углу сцены
    this.drawVariableMonitors();
  }

  drawSprite(sprite) {
    const { cx, cy } = this.toCanvasCoords(sprite.x, sprite.y);
    const costume = sprite.costumes[sprite.costumeIndex || 0];
    if (!costume) return;

    let img = this.costumeImageCache.get(costume.svg);
    if (!img) {
      img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(costume.svg);
      this.costumeImageCache.set(costume.svg, img);
    }

    if (!img.complete || img.naturalWidth === 0) return;

    this.ctx.save();
    this.ctx.translate(cx, cy);

    // Вращение и масштаб
    const scale = sprite.size / 100;
    const dir = sprite.direction;

    if (sprite.rotationStyle === "all") {
      // Вращение кругом (в Scratch 90° - это вправо, 0° - вверх)
      const rad = (dir - 90) * (Math.PI / 180);
      this.ctx.rotate(rad);
      this.ctx.scale(scale, scale);
    } else if (sprite.rotationStyle === "left-right") {
      // Отражение влево/вправо
      const isLeft = dir < 0 || dir > 180;
      this.ctx.scale(isLeft ? -scale : scale, scale);
    } else {
      // Без вращения
      this.ctx.scale(scale, scale);
    }

    // Рисуем спрайт так, чтобы его центр совпадал с точкой (cx, cy)
    const w = 80;
    const h = 80;
    this.ctx.drawImage(img, -w / 2, -h / 2, w, h);
    this.ctx.restore();
  }

  drawSpeechBubble(sprite) {
    const { cx, cy } = this.toCanvasCoords(sprite.x, sprite.y);
    const text = sprite.bubble.text;
    const isThink = sprite.bubble.type === "think";

    this.ctx.save();
    this.ctx.font = "bold 13px sans-serif";
    const metrics = this.ctx.measureText(text);
    const padding = 10;
    const bW = Math.max(60, metrics.width + padding * 2);
    const bH = 32;

    const bX = Math.min(this.width - bW - 10, Math.max(10, cx - bW / 2));
    const bY = Math.max(10, cy - 55 - bH);

    // Фон бабла
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.strokeStyle = "#575E75";
    this.ctx.lineWidth = 2;

    // Скругленный прямоугольник
    this.ctx.beginPath();
    this.ctx.roundRect(bX, bY, bW, bH, 12);
    this.ctx.fill();
    this.ctx.stroke();

    // Хвостик облачка
    this.ctx.beginPath();
    if (!isThink) {
      // Треугольный хвостик речи
      this.ctx.moveTo(bX + bW / 2 - 6, bY + bH);
      this.ctx.lineTo(cx, cy - 35);
      this.ctx.lineTo(bX + bW / 2 + 6, bY + bH);
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      // Кружочки мыслей
      this.ctx.beginPath();
      this.ctx.arc(cx, cy - 42, 4, 0, Math.PI * 2);
      this.ctx.arc(cx, cy - 34, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Текст
    this.ctx.fillStyle = "#2D3748";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(text, bX + bW / 2, bY + bH / 2);

    this.ctx.restore();
  }

  drawVariableMonitors() {
    if (!window.currentProject || !window.currentProject.variables) return;
    let y = 10;
    this.ctx.save();
    window.currentProject.variables.forEach(varName => {
      const val = window.scratchEngine ? window.scratchEngine.getVariable(varName) : 0;
      const text = `${varName}: ${val}`;
      this.ctx.font = "bold 12px sans-serif";
      const w = this.ctx.measureText(text).width + 16;
      
      this.ctx.fillStyle = "#FF8C1A";
      this.ctx.beginPath();
      this.ctx.roundRect(10, y, w, 24, 6);
      this.ctx.fill();
      
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(text, 18, y + 12);
      y += 30;
    });
    this.ctx.restore();
  }

  notifySpriteChanged(sprite) {
    if (window.updateSpritePropertiesUI) {
      window.updateSpritePropertiesUI(sprite);
    }
  }

  setBackdrop(name) {
    if (window.SCRATCH_ASSETS.backdrops[name]) {
      this.currentBackdrop = name;
    }
  }
}

window.ScratchStage = ScratchStage;
