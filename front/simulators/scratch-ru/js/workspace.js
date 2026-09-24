// js/workspace.js - Рабочая область Скретч (Drag-and-Drop со стеками, снаппинг, зум)

class ScratchWorkspace {
  constructor(containerEl, paletteEl) {
    this.container = containerEl;
    this.palette = paletteEl;
    this.canvas = containerEl.querySelector("#workspace-canvas");
    this.scale = 1.0;
    this.panX = 20;
    this.panY = 20;
    
    this.draggedEl = null; // .scratch-stack или .scratch-block
    this.dragOffset = { x: 0, y: 0 };
    this.dragFromPalette = false;
    this.snapTarget = null; // { targetEl, slot: 'bottom' | 'c_body', container }

    this.initZoomAndPan();
    this.initDragEvents();
    this.renderPalette();
  }

  // Рендеринг палитры блоков (все категории с секциями)
  renderPalette() {
    this.palette.innerHTML = "";

    Object.values(window.BLOCK_CATEGORIES).forEach(cat => {
      const section = document.createElement("div");
      section.className = "palette-category-section";
      section.id = `cat-section-${cat.id}`;

      const header = document.createElement("div");
      header.className = "palette-category-title";
      header.style.color = cat.color;
      header.textContent = cat.name;
      section.appendChild(header);

      Object.entries(window.BLOCK_DEFS).forEach(([blockId, def]) => {
        if (def.category !== cat.id) return;
        const blockEl = window.renderBlockElement(blockId, {}, true);
        blockEl.classList.add("in-palette");
        section.appendChild(blockEl);
      });

      this.palette.appendChild(section);
    });
  }

  initZoomAndPan() {
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    this.container.addEventListener("mousedown", (e) => {
      if (e.target === this.container || e.target === this.canvas) {
        isPanning = true;
        startX = e.clientX - this.panX;
        startY = e.clientY - this.panY;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (isPanning) {
        this.panX = e.clientX - startX;
        this.panY = e.clientY - startY;
        this.updateTransform();
      }
    });

    window.addEventListener("mouseup", () => {
      isPanning = false;
    });

    this.container.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        this.setZoom(this.scale + delta);
      } else {
        this.panX -= e.deltaX * 0.8;
        this.panY -= e.deltaY * 0.8;
        this.updateTransform();
      }
    }, { passive: false });
  }

  setZoom(val) {
    this.scale = Math.max(0.5, Math.min(1.8, val));
    this.updateTransform();
    const zoomText = document.getElementById("zoom-val");
    if (zoomText) zoomText.textContent = Math.round(this.scale * 100) + "%";
  }

  updateTransform() {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  // Drag and Drop
  initDragEvents() {
    document.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

      const blockEl = e.target.closest(".scratch-block");
      if (!blockEl) return;

      e.preventDefault();

      if (blockEl.classList.contains("in-palette")) {
        // Перетаскивание нового блока из палитры
        const blockId = blockEl.dataset.blockId;
        const newBlock = window.renderBlockElement(blockId, this.extractArgs(blockEl));
        
        // Оборачиваем в стек
        const dragStack = document.createElement("div");
        dragStack.className = "scratch-stack dragging";
        dragStack.appendChild(newBlock);
        document.body.appendChild(dragStack);

        const rect = blockEl.getBoundingClientRect();
        this.dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        this.draggedEl = dragStack;
        this.dragFromPalette = true;
        this.updateDragPosition(e.clientX, e.clientY);
      } else if (this.canvas.contains(blockEl)) {
        // Перетаскивание существующего блока / подстека
        const parentStack = blockEl.closest(".scratch-stack");
        const parentCBody = blockEl.parentElement.closest(".c-body");

        // Создаем стек для перетаскивания
        const dragStack = document.createElement("div");
        dragStack.className = "scratch-stack dragging";

        // Собираем текущий блок и все последующие блоки на том же уровне
        const blocksToMove = [blockEl];
        let next = blockEl.nextElementSibling;
        while (next && next.classList.contains("scratch-block")) {
          blocksToMove.push(next);
          next = next.nextElementSibling;
        }

        blocksToMove.forEach(b => dragStack.appendChild(b));
        document.body.appendChild(dragStack);

        // Если стек-родитель опустел, удаляем его
        if (parentStack && parentStack.children.length === 0) {
          parentStack.remove();
        }

        const rect = blockEl.getBoundingClientRect();
        this.dragOffset = { x: (e.clientX - rect.left) / this.scale, y: (e.clientY - rect.top) / this.scale };
        this.draggedEl = dragStack;
        this.dragFromPalette = false;
        this.updateDragPosition(e.clientX, e.clientY);
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.draggedEl) return;
      this.updateDragPosition(e.clientX, e.clientY);
      this.detectSnap(e.clientX, e.clientY);
    });

    window.addEventListener("mouseup", (e) => {
      if (!this.draggedEl) return;
      this.finishDrag(e);
    });
  }

  updateDragPosition(clientX, clientY) {
    if (!this.draggedEl) return;
    this.draggedEl.style.position = "fixed";
    this.draggedEl.style.left = `${clientX - this.dragOffset.x}px`;
    this.draggedEl.style.top = `${clientY - this.dragOffset.y}px`;
    this.draggedEl.style.zIndex = "9999";
  }

  // Обнаружение магнитных точек стыковки
  detectSnap(clientX, clientY) {
    this.clearSnapIndicator();
    this.snapTarget = null;
    if (!this.draggedEl) return;

    const firstBlock = this.draggedEl.firstElementChild;
    if (!firstBlock) return;
    const dragType = firstBlock.dataset.type;

    // Шапочки не могут цепляться снизу или внутрь блоков
    if (dragType === "hat") return;

    const candidateBlocks = this.canvas.querySelectorAll(".scratch-block");
    let closestDist = 32;

    candidateBlocks.forEach(target => {
      if (this.draggedEl.contains(target)) return;

      // Слот C-блока (c_body)
      const cBody = target.querySelector(".c-body");
      if (cBody) {
        const bodyRect = cBody.getBoundingClientRect();
        const dist = Math.hypot(clientX - bodyRect.left, clientY - bodyRect.top);
        if (dist < closestDist) {
          closestDist = dist;
          this.snapTarget = { targetEl: target, slot: "c_body", container: cBody };
          return;
        }
      }

      // Слот под блоком
      const targetRect = target.getBoundingClientRect();
      const bottomX = targetRect.left + 20;
      const bottomY = targetRect.bottom;
      const dist = Math.hypot(clientX - bottomX, clientY - bottomY);

      if (dist < closestDist) {
        closestDist = dist;
        this.snapTarget = { targetEl: target, slot: "bottom" };
      }
    });

    if (this.snapTarget) {
      this.showSnapIndicator(this.snapTarget);
    }
  }

  showSnapIndicator(snap) {
    let ind = document.getElementById("scratch-snap-indicator");
    if (!ind) {
      ind = document.createElement("div");
      ind.id = "scratch-snap-indicator";
      ind.className = "snap-indicator";
      document.body.appendChild(ind);
    }

    if (snap.slot === "bottom") {
      const rect = snap.targetEl.getBoundingClientRect();
      ind.style.display = "block";
      ind.style.left = `${rect.left}px`;
      ind.style.top = `${rect.bottom - 4}px`;
      ind.style.width = `${rect.width}px`;
      ind.style.height = "6px";
    } else if (snap.slot === "c_body") {
      const rect = snap.container.getBoundingClientRect();
      ind.style.display = "block";
      ind.style.left = `${rect.left + 8}px`;
      ind.style.top = `${rect.top}px`;
      ind.style.width = "140px";
      ind.style.height = "6px";
    }
  }

  clearSnapIndicator() {
    const ind = document.getElementById("scratch-snap-indicator");
    if (ind) ind.style.display = "none";
  }

  finishDrag(e) {
    const stack = this.draggedEl;
    this.draggedEl = null;
    this.clearSnapIndicator();

    stack.classList.remove("dragging");

    // Удаление при сбросе в палитру
    const paletteRect = this.palette.getBoundingClientRect();
    if (e.clientX >= paletteRect.left && e.clientX <= paletteRect.right &&
        e.clientY >= paletteRect.top && e.clientY <= paletteRect.bottom) {
      stack.remove();
      return;
    }

    // Примагничивание
    if (this.snapTarget) {
      const blocks = Array.from(stack.children);
      if (this.snapTarget.slot === "bottom") {
        let last = this.snapTarget.targetEl;
        blocks.forEach(b => {
          last.insertAdjacentElement("afterend", b);
          last = b;
        });
      } else if (this.snapTarget.slot === "c_body") {
        blocks.forEach(b => this.snapTarget.container.appendChild(b));
      }
      stack.remove();
      this.snapTarget = null;
      return;
    }

    // Размещение как нового независимого стека
    const canvasRect = this.canvas.getBoundingClientRect();
    const localX = (e.clientX - canvasRect.left - this.dragOffset.x) / this.scale;
    const localY = (e.clientY - canvasRect.top - this.dragOffset.y) / this.scale;

    stack.style.position = "absolute";
    stack.style.left = `${Math.max(10, Math.round(localX))}px`;
    stack.style.top = `${Math.max(10, Math.round(localY))}px`;
    stack.style.zIndex = "5";

    this.canvas.appendChild(stack);
  }

  extractArgs(blockEl) {
    const args = {};
    blockEl.querySelectorAll("[data-arg]").forEach(inp => {
      args[inp.dataset.arg] = inp.value;
    });
    return args;
  }

  clear() {
    this.canvas.innerHTML = "";
  }

  // Сериализация стеков текущего спрайта в JSON
  serialize() {
    const stacks = Array.from(this.canvas.querySelectorAll(".scratch-stack"));
    return stacks.map(st => {
      const firstBlock = st.firstElementChild;
      if (!firstBlock || !firstBlock.classList.contains("scratch-block")) return null;
      const data = this.serializeBlock(firstBlock);
      data.x = parseFloat(st.style.left) || 20;
      data.y = parseFloat(st.style.top) || 20;
      return data;
    }).filter(Boolean);
  }

  serializeBlock(el) {
    const blockId = el.dataset.blockId;
    const type = el.dataset.type;
    const args = this.extractArgs(el);

    const data = { blockId, type, args };

    // Если это C-блок, сериализуем вложенные блоки
    if (type === "c_block") {
      const cBody = el.querySelector(".c-body");
      if (cBody && cBody.firstElementChild) {
        const children = Array.from(cBody.children).filter(c => c.classList.contains("scratch-block"));
        if (children.length > 0) {
          data.substack = [this.serializeBlock(children[0])];
        }
      }
    }

    // Следующий соединенный блок в стеке
    const nextEl = el.nextElementSibling;
    if (nextEl && nextEl.classList.contains("scratch-block")) {
      data.next = this.serializeBlock(nextEl);
    }

    return data;
  }

  // Десериализация и создание .scratch-stack
  deserialize(blocksData) {
    this.clear();
    if (!Array.isArray(blocksData)) return;

    blocksData.forEach(item => {
      const stackEl = document.createElement("div");
      stackEl.className = "scratch-stack";
      stackEl.style.left = `${item.x || 30}px`;
      stackEl.style.top = `${item.y || 30}px`;

      let currData = item;
      while (currData) {
        const blockEl = this.buildBlockElement(currData);
        if (blockEl) stackEl.appendChild(blockEl);
        currData = currData.next;
      }

      this.canvas.appendChild(stackEl);
    });
  }

  buildBlockElement(data) {
    const el = window.renderBlockElement(data.blockId, data.args);
    if (!el) return null;

    if (data.type === "c_block" && Array.isArray(data.substack)) {
      const cBody = el.querySelector(".c-body");
      if (cBody && data.substack.length > 0) {
        data.substack.forEach(subItem => {
          let currSub = subItem;
          while (currSub) {
            const subEl = this.buildBlockElement(currSub);
            if (subEl) cBody.appendChild(subEl);
            currSub = currSub.next;
          }
        });
      }
    }

    return el;
  }
}

window.ScratchWorkspace = ScratchWorkspace;
