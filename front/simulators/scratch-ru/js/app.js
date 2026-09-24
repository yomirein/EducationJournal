// js/app.js - Главный контроллер приложения Скретч 3.0 на русском языке

document.addEventListener("DOMContentLoaded", () => {
  // Инициализация холстов сцены
  const stageCanvas = document.getElementById("stage-canvas");
  const penCanvas = document.getElementById("pen-canvas");
  const stage = new ScratchStage(stageCanvas, penCanvas);
  window.scratchStage = stage;

  // Инициализация воркспейса
  const workspaceContainer = document.getElementById("workspace-container");
  const paletteEl = document.getElementById("blocks-palette");
  const workspace = new ScratchWorkspace(workspaceContainer, paletteEl);
  window.scratchWorkspace = workspace;

  // Инициализация движка исполнения
  const engine = new ScratchEngine(stage, workspace);
  window.scratchEngine = engine;

  // Глобальное состояние текущего проекта
  window.currentProject = {
    title: "Мой первый проект",
    backdrop: "nature",
    variables: ["счёт"],
    sprites: []
  };

  // 1. Привязка кнопок запуска и остановки
  const btnFlag = document.getElementById("btn-green-flag");
  const btnStop = document.getElementById("btn-stop");

  if (btnFlag) {
    btnFlag.addEventListener("click", () => {
      // Сохраняем текущие блоки из воркспейса в активный спрайт перед запуском
      saveActiveSpriteWorkspace();
      engine.greenFlag();
    });
  }

  if (btnStop) {
    btnStop.addEventListener("click", () => {
      engine.stopAll();
    });
  }

  // 2. Зум воркспейса
  document.getElementById("btn-zoom-in")?.addEventListener("click", () => workspace.setZoom(workspace.scale + 0.15));
  document.getElementById("btn-zoom-out")?.addEventListener("click", () => workspace.setZoom(workspace.scale - 0.15));
  document.getElementById("btn-zoom-reset")?.addEventListener("click", () => workspace.setZoom(1.0));

  // 3. Категории блоков в левом сайдбаре: плавная прокрутка к категории
  const paletteContainer = document.getElementById("blocks-palette");
  document.querySelectorAll(".category-btn[data-category]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const catId = btn.dataset.category;
      const sec = document.getElementById(`cat-section-${catId}`);
      if (sec && paletteContainer) {
        paletteContainer.scrollTo({
          top: sec.offsetTop - 12,
          behavior: "smooth"
        });
      }
    });
  });

  // Кнопка «Все» — прокрутка наверх
  document.getElementById("btn-show-all-cats")?.addEventListener("click", () => {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("btn-show-all-cats")?.classList.add("active");
    paletteContainer?.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Отслеживание прокрутки палитры для авто-подсветки категории
  if (paletteContainer) {
    paletteContainer.addEventListener("scroll", () => {
      const sections = paletteContainer.querySelectorAll(".palette-category-section");
      const scrollPos = paletteContainer.scrollTop + 60;
      sections.forEach(sec => {
        if (scrollPos >= sec.offsetTop && scrollPos < sec.offsetTop + sec.offsetHeight) {
          const catId = sec.id.replace("cat-section-", "");
          document.querySelectorAll(".category-btn").forEach(b => {
            if (b.dataset.category === catId) b.classList.add("active");
            else b.classList.remove("active");
          });
        }
      });
    }, { passive: true });
  }

  // 4. Вкладки верхней панели: «Код», «Костюмы», «Звуки»
  const tabs = document.querySelectorAll(".tab-item");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const view = tab.dataset.tab;
      document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));
      const targetPanel = document.getElementById(`panel-${view}`);
      if (targetPanel) targetPanel.classList.add("active");

      if (view === "costumes") renderCostumesTab();
      if (view === "sounds") renderSoundsTab();
    });
  });

  // 5. Синхронизация свойств активного спрайта (панель под сценой)
  const propName = document.getElementById("prop-sprite-name");
  const propX = document.getElementById("prop-x");
  const propY = document.getElementById("prop-y");
  const propSize = document.getElementById("prop-size");
  const propDir = document.getElementById("prop-dir");
  const btnShow = document.getElementById("btn-show-sprite");
  const btnHide = document.getElementById("btn-hide-sprite");

  window.updateSpritePropertiesUI = function(sprite) {
    if (!sprite || sprite.id !== stage.activeSpriteId) return;
    if (propName) propName.value = sprite.name;
    if (propX && document.activeElement !== propX) propX.value = sprite.x;
    if (propY && document.activeElement !== propY) propY.value = sprite.y;
    if (propSize && document.activeElement !== propSize) propSize.value = sprite.size;
    if (propDir && document.activeElement !== propDir) propDir.value = sprite.direction;

    if (btnShow && btnHide) {
      if (sprite.visible) {
        btnShow.classList.add("active");
        btnHide.classList.remove("active");
      } else {
        btnShow.classList.remove("active");
        btnHide.classList.add("active");
      }
    }
  };

  // Редактирование свойств из инпутов
  propName?.addEventListener("input", (e) => {
    const s = getActiveSprite();
    if (s) {
      s.name = e.target.value;
      renderSpritesList();
    }
  });

  propX?.addEventListener("change", (e) => {
    const s = getActiveSprite();
    if (s) s.x = Number(e.target.value) || 0;
  });

  propY?.addEventListener("change", (e) => {
    const s = getActiveSprite();
    if (s) s.y = Number(e.target.value) || 0;
  });

  propSize?.addEventListener("change", (e) => {
    const s = getActiveSprite();
    if (s) s.size = Math.max(10, Math.min(300, Number(e.target.value) || 100));
  });

  propDir?.addEventListener("change", (e) => {
    const s = getActiveSprite();
    if (s) s.direction = Number(e.target.value) || 90;
  });

  btnShow?.addEventListener("click", () => {
    const s = getActiveSprite();
    if (s) {
      s.visible = true;
      window.updateSpritePropertiesUI(s);
    }
  });

  btnHide?.addEventListener("click", () => {
    const s = getActiveSprite();
    if (s) {
      s.visible = false;
      window.updateSpritePropertiesUI(s);
    }
  });

  function getActiveSprite() {
    return stage.sprites.find(s => s.id === stage.activeSpriteId);
  }

  function saveActiveSpriteWorkspace() {
    const s = getActiveSprite();
    if (!s) return;
    const projectSprite = window.currentProject.sprites.find(ps => ps.id === s.id);
    if (projectSprite) {
      projectSprite.scripts = workspace.serialize();
      projectSprite.x = s.x;
      projectSprite.y = s.y;
      projectSprite.direction = s.direction;
      projectSprite.size = s.size;
      projectSprite.visible = s.visible;
      projectSprite.costumeIndex = s.costumeIndex;
    }
  }

  // 6. Переключение и выбор спрайтов
  function selectSprite(spriteId) {
    if (stage.activeSpriteId === spriteId) return;

    // Сохраняем блоки предыдущего спрайта
    saveActiveSpriteWorkspace();

    stage.activeSpriteId = spriteId;
    const s = getActiveSprite();
    if (s) {
      window.updateSpritePropertiesUI(s);
      // Загружаем блоки нового спрайта в воркспейс
      const projectSprite = window.currentProject.sprites.find(ps => ps.id === s.id);
      if (projectSprite && projectSprite.scripts) {
        workspace.deserialize(projectSprite.scripts);
      } else {
        workspace.clear();
      }
    }
    renderSpritesList();
  }

  function renderSpritesList() {
    const container = document.getElementById("sprites-list-container");
    if (!container) return;
    container.innerHTML = "";

    stage.sprites.forEach(sprite => {
      const card = document.createElement("div");
      card.className = `sprite-card ${sprite.id === stage.activeSpriteId ? "active" : ""}`;
      
      const thumb = document.createElement("div");
      thumb.className = "sprite-thumb";
      const costume = sprite.costumes[sprite.costumeIndex || 0];
      if (costume) {
        thumb.innerHTML = costume.svg;
      }

      const name = document.createElement("div");
      name.className = "sprite-name";
      name.textContent = sprite.name;

      card.appendChild(thumb);
      card.appendChild(name);

      card.addEventListener("click", () => selectSprite(sprite.id));
      container.appendChild(card);
    });
  }

  // 7. Вкладка «Костюмы»
  function renderCostumesTab() {
    const container = document.getElementById("costumes-list");
    if (!container) return;
    container.innerHTML = "";

    const s = getActiveSprite();
    if (!s || !s.costumes) {
      container.innerHTML = `<div class="empty-state">Выберите спрайт для просмотра костюмов</div>`;
      return;
    }

    s.costumes.forEach((costume, idx) => {
      const item = document.createElement("div");
      item.className = `costume-item ${idx === (s.costumeIndex || 0) ? "active" : ""}`;

      const num = document.createElement("div");
      num.className = "costume-num";
      num.textContent = idx + 1;

      const preview = document.createElement("div");
      preview.className = "costume-preview";
      preview.innerHTML = costume.svg;

      const name = document.createElement("div");
      name.className = "costume-name";
      name.textContent = costume.name;

      item.appendChild(num);
      item.appendChild(preview);
      item.appendChild(name);

      item.addEventListener("click", () => {
        s.costumeIndex = idx;
        renderCostumesTab();
      });

      container.appendChild(item);
    });

    const activePreview = document.getElementById("costume-active-canvas");
    if (activePreview && s.costumes[s.costumeIndex || 0]) {
      activePreview.innerHTML = s.costumes[s.costumeIndex || 0].svg;
    }
  }

  // 8. Вкладка «Звуки»
  function renderSoundsTab() {
    const sounds = [
      { id: "meow", name: "Мяу (Meow)", desc: "Классическое мяуканье котика Scratch" },
      { id: "pop", name: "Щелчок (Pop)", desc: "Короткий звук щелчка / клика" },
      { id: "jump", name: "Прыжок (Jump)", desc: "8-битный звук прыжка" },
      { id: "coin", name: "Монетка (Coin)", desc: "Двухтоновый звон победы" },
      { id: "laser", name: "Лазер (Laser)", desc: "Космический лазерный выстрел" }
    ];

    const list = document.getElementById("sounds-list");
    if (!list) return;
    list.innerHTML = "";

    sounds.forEach(snd => {
      const item = document.createElement("div");
      item.className = "sound-item";

      const info = document.createElement("div");
      info.innerHTML = `<strong>${snd.name}</strong><br><small>${snd.desc}</small>`;

      const playBtn = document.createElement("button");
      playBtn.className = "btn-secondary btn-sm";
      playBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px; margin-right:4px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>Воспроизвести';
      playBtn.addEventListener("click", () => {
        window.scratchAudio.playSound(snd.id);
      });

      item.appendChild(info);
      item.appendChild(playBtn);
      list.appendChild(item);
    });
  }

  // 9. Модальные окна: Создание переменной, Добавление спрайта, Добавление фона, Демо-проекты
  const modalOverlay = document.getElementById("modal-overlay");
  function showModal(contentHtml) {
    if (!modalOverlay) return;
    const body = modalOverlay.querySelector(".modal-body");
    body.innerHTML = contentHtml;
    modalOverlay.classList.remove("hidden");
  }
  function closeModal() {
    if (modalOverlay) modalOverlay.classList.add("hidden");
  }
  document.getElementById("btn-modal-close")?.addEventListener("click", closeModal);
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Кнопка создания переменной
  document.getElementById("btn-new-variable")?.addEventListener("click", () => {
    showModal(`
      <div class="modal-dialog-content">
        <h3>Новая переменная</h3>
        <p>Имя переменной:</p>
        <input type="text" id="input-new-var-name" class="modal-input" placeholder="например: жизни, счёт" autofocus />
        <div class="modal-actions">
          <button class="btn-secondary" id="btn-cancel-var">Отмена</button>
          <button class="btn-primary" id="btn-confirm-var">Создать</button>
        </div>
      </div>
    `);

    document.getElementById("btn-cancel-var")?.addEventListener("click", closeModal);
    document.getElementById("btn-confirm-var")?.addEventListener("click", () => {
      const name = document.getElementById("input-new-var-name")?.value.trim();
      if (name) {
        if (!window.currentProject.variables.includes(name)) {
          window.currentProject.variables.push(name);
          engine.setVariable(name, 0);
          workspace.renderPalette(); // обновляем список переменных в блоках
        }
        closeModal();
      }
    });
  });

  // Кнопка выбора спрайта
  document.getElementById("btn-add-sprite")?.addEventListener("click", () => {
    let itemsHtml = "";
    Object.entries(window.SCRATCH_ASSETS.sprites).forEach(([key, spr]) => {
      itemsHtml += `
        <div class="library-card" data-sprite-type="${key}">
          <div class="library-card-thumb">${spr.costumes[0].svg}</div>
          <div class="library-card-name">${spr.name}</div>
        </div>
      `;
    });

    showModal(`
      <div class="modal-dialog-content">
        <h3>Библиотека спрайтов</h3>
        <div class="library-grid">${itemsHtml}</div>
      </div>
    `);

    document.querySelectorAll(".library-card[data-sprite-type]").forEach(card => {
      card.addEventListener("click", () => {
        const type = card.dataset.spriteType;
        const asset = window.SCRATCH_ASSETS.sprites[type];
        if (asset) {
          const newId = `sprite_${Date.now()}`;
          const newSprite = {
            id: newId,
            name: `${asset.name} ${stage.sprites.length + 1}`,
            x: 0,
            y: 0,
            direction: 90,
            size: 100,
            visible: true,
            rotationStyle: "all",
            costumeIndex: 0,
            costumes: asset.costumes,
            scripts: []
          };
          window.currentProject.sprites.push(newSprite);
          stage.sprites.push({ ...newSprite });
          selectSprite(newId);
          closeModal();
        }
      });
    });
  });

  // Кнопка выбора фона сцены
  document.getElementById("btn-add-backdrop")?.addEventListener("click", () => {
    let itemsHtml = "";
    Object.entries(window.SCRATCH_ASSETS.backdrops).forEach(([key, bd]) => {
      itemsHtml += `
        <div class="library-card" data-backdrop-key="${key}">
          <div class="library-card-thumb" style="display:flex;align-items:center;justify-content:center;color:#64748B;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div class="library-card-name">${bd.name}</div>
        </div>
      `;
    });

    showModal(`
      <div class="modal-dialog-content">
        <h3>Библиотека фонов</h3>
        <div class="library-grid">${itemsHtml}</div>
      </div>
    `);

    document.querySelectorAll(".library-card[data-backdrop-key]").forEach(card => {
      card.addEventListener("click", () => {
        const key = card.dataset.backdropKey;
        stage.setBackdrop(key);
        window.currentProject.backdrop = key;
        const nameEl = document.getElementById("current-backdrop-name");
        if (nameEl) nameEl.textContent = window.SCRATCH_ASSETS.backdrops[key].name;
        closeModal();
      });
    });
  });

  // 10. Меню готовых примеров
  document.getElementById("btn-open-demos")?.addEventListener("click", () => {
    let demoCards = "";
    Object.entries(window.SCRATCH_DEMOS).forEach(([key, demo]) => {
      demoCards += `
        <div class="demo-card" data-demo-key="${key}">
          <div class="demo-card-title">${demo.title}</div>
          <div class="demo-card-desc">${demo.description}</div>
          <button class="btn-primary btn-sm" style="margin-top:8px;">Загрузить проект</button>
        </div>
      `;
    });

    showModal(`
      <div class="modal-dialog-content">
        <h3>Готовые примеры проектов Скретч</h3>
        <p>Выберите любой готовый проект, чтобы изучить его код и запустить по зелёному флагу:</p>
        <div class="demos-grid">${demoCards}</div>
      </div>
    `);

    document.querySelectorAll(".demo-card").forEach(card => {
      card.addEventListener("click", () => {
        const key = card.dataset.demoKey;
        loadDemoProject(key);
        closeModal();
      });
    });
  });

  // Загрузка демо-проекта
  function loadDemoProject(key) {
    const demo = window.SCRATCH_DEMOS[key];
    if (!demo) return;

    engine.stopAll();
    stage.clearPen();

    window.currentProject = JSON.parse(JSON.stringify(demo));
    
    // Заголовок
    const titleInp = document.getElementById("project-title-input");
    if (titleInp) titleInp.value = demo.title.replace(/^[^\s]+\s*/, "");

    // Фон
    stage.setBackdrop(demo.backdrop || "blank");
    const nameEl = document.getElementById("current-backdrop-name");
    if (nameEl && window.SCRATCH_ASSETS.backdrops[demo.backdrop]) {
      nameEl.textContent = window.SCRATCH_ASSETS.backdrops[demo.backdrop].name;
    }

    // Переменные
    engine.variables.clear();
    (demo.variables || []).forEach(v => engine.setVariable(v, 0));

    // Спрайты
    stage.sprites = demo.sprites.map(s => ({ ...s }));
    renderSpritesList();

    if (stage.sprites.length > 0) {
      stage.activeSpriteId = null;
      selectSprite(stage.sprites[0].id);
    }
  }

  // 11. Сохранение и загрузка файла .json
  document.getElementById("btn-save-project")?.addEventListener("click", () => {
    saveActiveSpriteWorkspace();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.currentProject, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `${window.currentProject.title || "scratch-project"}.json`);
    dlAnchor.click();
  });

  document.getElementById("btn-load-project")?.addEventListener("click", () => {
    const fileInp = document.getElementById("input-file-load");
    fileInp?.click();
  });

  document.getElementById("input-file-load")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loaded = JSON.parse(event.target.result);
        if (loaded && loaded.sprites) {
          engine.stopAll();
          stage.clearPen();
          window.currentProject = loaded;
          stage.setBackdrop(loaded.backdrop || "blank");
          stage.sprites = loaded.sprites.map(s => ({ ...s }));
          renderSpritesList();
          if (stage.sprites.length > 0) {
            stage.activeSpriteId = null;
            selectSprite(stage.sprites[0].id);
          }
        }
      } catch (err) {
        alert("Ошибка чтения файла проекта: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // Open the example that belongs to the current course step when available.
  const params = new URLSearchParams(window.location.search);
  const requestedDemo = params.get("demo") || ({ "1.1.3": "ball_to_center", "1.2.3": "triangle_from_square", "1.2.4": "cat_circle", "1.3.3": "apple_catch" })[params.get("task")];
  loadDemoProject(requestedDemo && window.SCRATCH_DEMOS[requestedDemo] ? requestedDemo : "cat_walk");
});
