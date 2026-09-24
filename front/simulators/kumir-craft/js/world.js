// js/world.js - Изометрический 2.5D воксельный движок Minecraft Dungeons для «БЛОК КУБА»

class MinecraftWorld {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");

    // Изометрические параметры
    this.tileW = 46;       // ширина ромба
    this.tileH = 24;       // высота ромба
    this.blockH = 22;      // 3D-высота блока вверх
    this.gridWidth = 7;
    this.gridHeight = 7;
    this.grid = [];

    // Позиция Стива с плавной интерполяцией
    this.steve = {
      x: 1,
      y: 3,
      renderX: 1,
      renderY: 3,
      targetX: 1,
      targetY: 3,
      dir: "right",
      isMoving: false,
      moveProgress: 0,
      isHitting: false,
      hitAngle: 0
    };

    // Состояние игрока
    this.health = 10;      // 10 сердечек Minecraft
    this.screenShake = 0;  // тряска камеры при ударе
    this.particles = [];   // частицы руды / лавы / шагов
    this.fireworks = [];   // праздничный салют при победе
    this.animTimer = 0;

    this.startLoop();
  }

  loadMap(gridData, steveStart) {
    this.grid = JSON.parse(JSON.stringify(gridData));
    this.gridHeight = this.grid.length;
    this.gridWidth = this.grid[0].length;
    this.health = 10;
    this.screenShake = 0;
    this.particles = [];
    this.fireworks = [];

    if (steveStart) {
      this.steve.x = steveStart.x;
      this.steve.y = steveStart.y;
      this.steve.renderX = steveStart.x;
      this.steve.renderY = steveStart.y;
      this.steve.targetX = steveStart.x;
      this.steve.targetY = steveStart.y;
      this.steve.dir = steveStart.dir || "right";
      this.steve.isMoving = false;
      this.steve.moveProgress = 0;
      this.steve.isHitting = false;
      this.steve.hitAngle = 0;
    }
  }

  // Запуск плавной анимации шага
  animateMoveTo(targetX, targetY, dir) {
    this.steve.dir = dir;
    this.steve.targetX = targetX;
    this.steve.targetY = targetY;
    this.steve.isMoving = true;
    this.steve.moveProgress = 0;
  }

  // Анимация удара киркой
  animateHit() {
    this.steve.isHitting = true;
    this.steve.hitAngle = -Math.PI / 3;
    setTimeout(() => {
      this.steve.isHitting = false;
      this.steve.hitAngle = 0;
    }, 200);
  }

  damageSteve() {
    this.screenShake = 12;
    this.health = Math.max(0, this.health - 2);
  }

  // Проекция координат сетки (x, y) в экранные изометрические координаты
  toScreen(gx, gy) {
    const originX = this.canvas.width / 2;
    const originY = 64;
    const sx = originX + (gx - gy) * (this.tileW / 2);
    const sy = originY + (gx + gy) * (this.tileH / 2);
    return { sx, sy };
  }

  startLoop() {
    const loop = () => {
      this.animTimer++;
      this.updateState();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updateState() {
    // 1. Интерполяция движения Стива
    if (this.steve.isMoving) {
      this.steve.moveProgress += 0.12;
      if (this.steve.moveProgress >= 1.0) {
        this.steve.moveProgress = 1.0;
        this.steve.isMoving = false;
        this.steve.x = this.steve.targetX;
        this.steve.y = this.steve.targetY;
        this.steve.renderX = this.steve.targetX;
        this.steve.renderY = this.steve.targetY;
      } else {
        const t = this.steve.moveProgress;
        this.steve.renderX = this.steve.x + (this.steve.targetX - this.steve.x) * t;
        this.steve.renderY = this.steve.y + (this.steve.targetY - this.steve.y) * t;
      }
    } else {
      this.steve.renderX = this.steve.x;
      this.steve.renderY = this.steve.y;
    }

    // 2. Затухание тряски экрана
    if (this.screenShake > 0) {
      this.screenShake *= 0.85;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    // 3. Обновление частиц мира
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity || 0.15;
      p.life -= p.decay || 0.03;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 4. Обновление салютов победы
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const f = this.fireworks[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.08;
      f.life -= 0.02;
      if (f.life <= 0) {
        this.fireworks.splice(i, 1);
      }
    }

    // 5. Периодические искры лавы
    if (this.animTimer % 8 === 0 && this.grid.length > 0) {
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          if (this.grid[y][x] === "lava" && Math.random() < 0.25) {
            const { sx, sy } = this.toScreen(x, y);
            this.particles.push({
              x: sx + (Math.random() - 0.5) * 20,
              y: sy - this.blockH + (Math.random() - 0.5) * 10,
              vx: (Math.random() - 0.5) * 0.8,
              vy: -Math.random() * 1.5 - 0.5,
              gravity: -0.02,
              size: Math.random() * 3 + 2,
              color: Math.random() > 0.5 ? "#FFCA28" : "#FF5722",
              life: 1.0,
              decay: 0.04
            });
          }
        }
      }
    }
  }

  addBlockParticles(gx, gy, color) {
    const { sx, sy } = this.toScreen(gx, gy);
    const cy = sy - this.blockH / 2;
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: sx + (Math.random() - 0.5) * 24,
        y: cy + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 4.5,
        vy: (Math.random() - 0.8) * 5,
        gravity: 0.22,
        size: Math.random() * 4 + 2,
        color: color,
        life: 1.0,
        decay: 0.035
      });
    }
  }

  triggerVictoryFireworks() {
    const colors = ["#2DEDDA", "#55FF55", "#FFCA28", "#E040FB", "#FF5252"];
    for (let i = 0; i < 60; i++) {
      this.fireworks.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 120,
        y: this.canvas.height / 2 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.7) * 7,
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0
      });
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    // Применяем тряску экрана при уроне
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Отрисовка мягкого фонового свечения лавы
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y] && this.grid[y][x] === "lava") {
          const { sx, sy } = this.toScreen(x, y);
          const radGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 55);
          radGrad.addColorStop(0, "rgba(255, 110, 0, 0.35)");
          radGrad.addColorStop(1, "rgba(255, 60, 0, 0)");
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(sx, sy, 55, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 2. Изометрическая отрисовка мира (Depth Sort: от дальнего y,x к ближнему)
    // Рисуем Стива точно в момент прохода его клетки для идеального перекрытия Z-index
    const steveCellX = Math.round(this.steve.renderX);
    const steveCellY = Math.round(this.steve.renderY);

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const type = this.grid[y][x];
        this.drawIsoBlock(x, y, type);

        // Если это клетка Стива — рисуем его поверх верхнего ромба
        if (x === steveCellX && y === steveCellY) {
          this.drawIsoSteve();
        }
      }
    }

    // 3. Частицы мира
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    // 4. Салют победы
    this.fireworks.forEach(f => {
      ctx.fillStyle = f.color;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillRect(f.x, f.y, f.size, f.size);
    });

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  // Отрисовка 3D воксельного изометрического блока
  drawIsoBlock(gx, gy, type) {
    const ctx = this.ctx;
    const { sx, sy } = this.toScreen(gx, gy);
    const hw = this.tileW / 2;
    const hh = this.tileH / 2;
    const bh = this.blockH;

    // Цветовая палитра блока (Top, Left, Right)
    const pal = this.getBlockPalette(type);

    // 1. Левая грань (Left Face)
    ctx.fillStyle = pal.left;
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy - bh + hh);
    ctx.lineTo(sx, sy - bh + hh * 2);
    ctx.lineTo(sx, sy + hh * 2);
    ctx.lineTo(sx - hw, sy + hh);
    ctx.closePath();
    ctx.fill();

    // 2. Правая грань (Right Face)
    ctx.fillStyle = pal.right;
    ctx.beginPath();
    ctx.moveTo(sx, sy - bh + hh * 2);
    ctx.lineTo(sx + hw, sy - bh + hh);
    ctx.lineTo(sx + hw, sy + hh);
    ctx.lineTo(sx, sy + hh * 2);
    ctx.closePath();
    ctx.fill();

    // 3. Верхняя грань (Top Face - ромб)
    ctx.fillStyle = pal.top;
    ctx.beginPath();
    ctx.moveTo(sx, sy - bh);
    ctx.lineTo(sx + hw, sy - bh + hh);
    ctx.lineTo(sx, sy - bh + hh * 2);
    ctx.lineTo(sx - hw, sy - bh + hh);
    ctx.closePath();
    ctx.fill();

    // Тонкие пиксельные грани
    ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Декоративные пиксели и эффекты конкретного блока
    this.drawBlockDetails(type, sx, sy - bh, hw, hh);
  }

  getBlockPalette(type) {
    switch (type) {
      case "grass":
        return { top: "#5B8E32", left: "#6A4C2E", right: "#4A321B" };
      case "stone":
        return { top: "#787878", left: "#585858", right: "#3C3C3C" };
      case "cobblestone":
      case "bridge":
        return { top: "#8A7968", left: "#6B5A4B", right: "#4B3E32" };
      case "diamond":
      case "diamond_ore":
        return { top: "#727278", left: "#54545A", right: "#36363C" };
      case "lava": {
        const pulse = Math.sin(this.animTimer * 0.1) * 15;
        const r = Math.min(255, Math.floor(235 + pulse));
        return {
          top: `rgb(${r}, 95, 0)`,
          left: `rgb(${r - 40}, 65, 0)`,
          right: `rgb(${r - 80}, 45, 0)`
        };
      }
      case "chest":
        return { top: "#9C632A", left: "#7A4A1C", right: "#543110" };
      case "marked":
        return { top: "#E65100", left: "#BF360C", right: "#870000" };
      default:
        // path (песочная дорожка)
        return { top: "#CDB07B", left: "#A88D5E", right: "#7E663F" };
    }
  }

  drawBlockDetails(type, sx, sy, hw, hh) {
    const ctx = this.ctx;

    if (type === "diamond" || type === "diamond_ore") {
      // Светящиеся кристаллы алмаза с бликом
      const shimmer = Math.sin(this.animTimer * 0.08) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(45, 237, 218, ${shimmer})`;
      ctx.fillRect(sx - 5, sy + hh - 3, 5, 4);
      ctx.fillRect(sx + 3, sy + hh - 6, 6, 5);
      ctx.fillRect(sx - 2, sy + hh + 2, 4, 3);

      ctx.fillStyle = "#E0F7FA";
      ctx.fillRect(sx - 4, sy + hh - 2, 2, 2);
      ctx.fillRect(sx + 4, sy + hh - 5, 2, 2);
    } else if (type === "chest") {
      // Золотой замочек сундука
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(sx - 3, sy + hh + 2, 6, 6);
      ctx.fillStyle = "#222222";
      ctx.fillRect(sx - 1, sy + hh + 4, 2, 3);
    } else if (type === "lava") {
      // Лавовые пузыри
      ctx.fillStyle = "#FFEB3B";
      const b1 = (this.animTimer % 30) / 10;
      ctx.fillRect(sx - 4, sy + hh - 2, 4, 3);
      ctx.fillRect(sx + 4, sy + hh + 1, 3, 2);
    } else if (type === "grass") {
      // Свисающие пиксели травы на левую грань
      ctx.fillStyle = "#467425";
      ctx.fillRect(sx - hw + 6, sy + hh + 2, 4, 4);
      ctx.fillRect(sx - hw + 14, sy + hh + 5, 5, 6);
    }
  }

  // Отрисовка 3D воксельного Стива
  drawIsoSteve() {
    const ctx = this.ctx;
    const { sx, sy } = this.toScreen(this.steve.renderX, this.steve.renderY);
    const bh = this.blockH;

    // Плавная синусоида прыжка при шаге
    const jumpOffset = this.steve.isMoving
      ? Math.sin(this.steve.moveProgress * Math.PI) * 12
      : 0;

    const steveBaseX = sx;
    const steveBaseY = sy - bh + this.tileH / 2 - jumpOffset;

    // 1. Мягкая тень под Стивом на блоке
    ctx.save();
    ctx.translate(sx, sy - bh + this.tileH / 2);
    ctx.scale(1, 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();
    ctx.restore();

    // 2. Тело Стива
    ctx.save();
    ctx.translate(steveBaseX, steveBaseY);

    // Ноги (синие брюки)
    ctx.fillStyle = "#2B358F";
    const legSwing = this.steve.isMoving ? Math.sin(this.steve.moveProgress * Math.PI * 2) * 3 : 0;
    ctx.fillRect(-6, -10 + legSwing, 5, 10);
    ctx.fillRect(1, -10 - legSwing, 5, 10);

    // Туловище (бирюзовая рубашка Стива)
    ctx.fillStyle = "#00A8A8";
    ctx.fillRect(-8, -24, 16, 14);

    // Руки
    ctx.fillStyle = "#C68966";
    ctx.fillRect(-12, -24, 4, 12);
    ctx.fillRect(8, -24, 4, 12);

    // Голова
    ctx.fillStyle = "#C68966"; // кожа
    ctx.fillRect(-8, -39, 16, 15);

    // Волосы
    ctx.fillStyle = "#4A3222";
    ctx.fillRect(-8, -39, 16, 5);
    ctx.fillRect(-8, -34, 3, 4);
    ctx.fillRect(5, -34, 3, 4);

    // Глаза в зависимости от направления взгляда
    ctx.fillStyle = "#FFFFFF";
    if (this.steve.dir === "left") {
      ctx.fillRect(-7, -31, 3, 3);
      ctx.fillStyle = "#334CB2";
      ctx.fillRect(-7, -31, 2, 3);
    } else if (this.steve.dir === "right") {
      ctx.fillRect(4, -31, 3, 3);
      ctx.fillStyle = "#334CB2";
      ctx.fillRect(5, -31, 2, 3);
    } else {
      ctx.fillRect(-5, -31, 3, 3);
      ctx.fillRect(2, -31, 3, 3);
      ctx.fillStyle = "#334CB2";
      ctx.fillRect(-4, -31, 2, 3);
      ctx.fillRect(3, -31, 2, 3);
    }

    // 3. Алмазная кирка в руке с анимацией удара
    ctx.save();
    ctx.translate(10, -18);
    const hitRot = this.steve.isHitting ? this.steve.hitAngle : 0;
    ctx.rotate(hitRot);

    // Рукоять кирки
    ctx.strokeStyle = "#8D5B28";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8, -8);
    ctx.stroke();

    // Алмазное навершие кирки
    ctx.fillStyle = "#2DEDDA";
    ctx.fillRect(6, -13, 8, 4);
    ctx.fillRect(10, -15, 3, 7);

    ctx.restore();
    ctx.restore();
  }
}

window.MinecraftWorld = MinecraftWorld;
