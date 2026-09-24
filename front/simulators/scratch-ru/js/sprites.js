// js/sprites.js - Векторные спрайты и фоны для Скретч
window.SCRATCH_ASSETS = {
  sprites: {
    cat: {
      name: "Котик",
      costumes: [
        {
          name: "костюм 1",
          svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(10, 5)">
              <!-- Хвост -->
              <path d="M 15 65 Q -5 45 10 35 Q 16 33 14 42 Q 8 50 20 62 Z" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <!-- Задние лапы -->
              <ellipse cx="25" cy="72" rx="10" ry="6" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <ellipse cx="55" cy="72" rx="10" ry="6" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <!-- Тело -->
              <path d="M 22 55 Q 22 40 40 40 Q 58 40 58 55 Q 58 70 40 70 Q 22 70 22 55 Z" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <!-- Белый животик -->
              <ellipse cx="40" cy="56" rx="11" ry="8" fill="#FFFFFF"/>
              <!-- Передние лапы -->
              <path d="M 33 60 L 33 73 Q 33 77 38 77 Q 43 77 43 73 L 43 60 Z" fill="#F49A24" stroke="#4C2D0E" stroke-width="1.8"/>
              <path d="M 47 60 L 47 73 Q 47 77 52 77 Q 57 77 57 73 L 57 60 Z" fill="#F49A24" stroke="#4C2D0E" stroke-width="1.8"/>
              <!-- Голова -->
              <ellipse cx="50" cy="30" rx="24" ry="18" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <!-- Ушки -->
              <polygon points="32,20 28,3 44,14" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <polygon points="33,18 31,7 41,15" fill="#E88090"/>
              <polygon points="56,14 72,3 68,20" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <polygon points="59,15 69,7 67,18" fill="#E88090"/>
              <!-- Белые щёчки -->
              <ellipse cx="42" cy="33" rx="7" ry="5" fill="#FFFFFF"/>
              <ellipse cx="58" cy="33" rx="7" ry="5" fill="#FFFFFF"/>
              <!-- Глазки -->
              <ellipse cx="43" cy="26" rx="5" ry="6" fill="#FFFFFF" stroke="#4C2D0E" stroke-width="1.5"/>
              <circle cx="44" cy="26" r="2.8" fill="#111111"/>
              <circle cx="45" cy="24" r="1" fill="#FFFFFF"/>
              <ellipse cx="57" cy="26" rx="5" ry="6" fill="#FFFFFF" stroke="#4C2D0E" stroke-width="1.5"/>
              <circle cx="58" cy="26" r="2.8" fill="#111111"/>
              <circle cx="59" cy="24" r="1" fill="#FFFFFF"/>
              <!-- Носик -->
              <polygon points="49,30 51,30 50,32" fill="#D34B59"/>
              <!-- Ротик -->
              <path d="M 46 33 Q 50 36 50 33 Q 50 36 54 33" fill="none" stroke="#4C2D0E" stroke-width="1.5"/>
              <!-- Усики -->
              <line x1="28" y1="28" x2="38" y2="30" stroke="#4C2D0E" stroke-width="1.5"/>
              <line x1="28" y1="34" x2="38" y2="33" stroke="#4C2D0E" stroke-width="1.5"/>
              <line x1="62" y1="30" x2="72" y2="28" stroke="#4C2D0E" stroke-width="1.5"/>
              <line x1="62" y1="33" x2="72" y2="34" stroke="#4C2D0E" stroke-width="1.5"/>
            </g>
          </svg>`
        },
        {
          name: "костюм 2",
          svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(10, 5)">
              <!-- Хвост приподнятый -->
              <path d="M 15 63 Q -8 40 5 28 Q 12 28 11 36 Q 6 46 18 59 Z" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <!-- Лапы в шаге (раздвинуты) -->
              <ellipse cx="20" cy="74" rx="10" ry="5" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <ellipse cx="60" cy="70" rx="9" ry="5.5" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <!-- Тело -->
              <path d="M 22 55 Q 22 40 40 40 Q 58 40 58 55 Q 58 70 40 70 Q 22 70 22 55 Z" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <!-- Белый животик -->
              <ellipse cx="40" cy="56" rx="11" ry="8" fill="#FFFFFF"/>
              <!-- Передние лапы в динамике -->
              <path d="M 30 60 L 26 71 Q 25 75 30 76 Q 35 77 36 72 L 38 60 Z" fill="#F49A24" stroke="#4C2D0E" stroke-width="1.8"/>
              <path d="M 50 60 L 58 70 Q 61 73 65 71 Q 68 68 64 64 L 56 58 Z" fill="#F49A24" stroke="#4C2D0E" stroke-width="1.8"/>
              <!-- Голова -->
              <ellipse cx="50" cy="30" rx="24" ry="18" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <!-- Ушки -->
              <polygon points="32,20 28,3 44,14" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <polygon points="33,18 31,7 41,15" fill="#E88090"/>
              <polygon points="56,14 72,3 68,20" fill="#F49A24" stroke="#4C2D0E" stroke-width="2"/>
              <polygon points="59,15 69,7 67,18" fill="#E88090"/>
              <!-- Белые щёчки -->
              <ellipse cx="42" cy="33" rx="7" ry="5" fill="#FFFFFF"/>
              <ellipse cx="58" cy="33" rx="7" ry="5" fill="#FFFFFF"/>
              <!-- Глазки -->
              <ellipse cx="43" cy="26" rx="5" ry="6" fill="#FFFFFF" stroke="#4C2D0E" stroke-width="1.5"/>
              <circle cx="44" cy="26" r="2.8" fill="#111111"/>
              <circle cx="45" cy="24" r="1" fill="#FFFFFF"/>
              <ellipse cx="57" cy="26" rx="5" ry="6" fill="#FFFFFF" stroke="#4C2D0E" stroke-width="1.5"/>
              <circle cx="58" cy="26" r="2.8" fill="#111111"/>
              <circle cx="59" cy="24" r="1" fill="#FFFFFF"/>
              <!-- Носик -->
              <polygon points="49,30 51,30 50,32" fill="#D34B59"/>
              <!-- Ротик -->
              <path d="M 46 33 Q 50 36 50 33 Q 50 36 54 33" fill="none" stroke="#4C2D0E" stroke-width="1.5"/>
              <!-- Усики -->
              <line x1="28" y1="28" x2="38" y2="30" stroke="#4C2D0E" stroke-width="1.5"/>
              <line x1="28" y1="34" x2="38" y2="33" stroke="#4C2D0E" stroke-width="1.5"/>
              <line x1="62" y1="30" x2="72" y2="28" stroke="#4C2D0E" stroke-width="1.5"/>
              <line x1="62" y1="33" x2="72" y2="34" stroke="#4C2D0E" stroke-width="1.5"/>
            </g>
          </svg>`
        }
      ]
    },
    rocket: {
      name: "Ракета",
      costumes: [
        {
          name: "ракета 1",
          svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(10, 5)">
              <!-- Пламя -->
              <polygon points="35,70 40,88 45,70" fill="#FF4500"/>
              <polygon points="37,70 40,82 43,70" fill="#FFD700"/>
              <!-- Крылья -->
              <polygon points="20,68 35,50 35,68" fill="#E74C3C" stroke="#2C3E50" stroke-width="2"/>
              <polygon points="60,68 45,50 45,68" fill="#E74C3C" stroke="#2C3E50" stroke-width="2"/>
              <!-- Корпус -->
              <path d="M 30 70 Q 30 25 40 10 Q 50 25 50 70 Z" fill="#ECF0F1" stroke="#2C3E50" stroke-width="2"/>
              <!-- Носовой конус -->
              <path d="M 34 22 Q 40 10 40 10 Q 40 10 46 22 Z" fill="#E74C3C"/>
              <!-- Иллюминатор -->
              <circle cx="40" cy="38" r="7" fill="#3498DB" stroke="#2C3E50" stroke-width="2"/>
              <circle cx="38" cy="36" r="2.5" fill="#FFFFFF"/>
            </g>
          </svg>`
        }
      ]
    },
    star: {
      name: "Звёздочка",
      costumes: [
        {
          name: "звезда 1",
          svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,10 62,35 90,38 68,58 74,86 50,72 26,86 32,58 10,38 38,35" 
              fill="#FFD700" stroke="#E67E22" stroke-width="3" stroke-linejoin="round"/>
            <circle cx="42" cy="48" r="3" fill="#333333"/>
            <circle cx="58" cy="48" r="3" fill="#333333"/>
            <path d="M 45 56 Q 50 62 55 56" fill="none" stroke="#333333" stroke-width="2" stroke-linecap="round"/>
          </svg>`
        }
      ]
    },
    apple: {
      name: "Яблоко",
      costumes: [{
        name: "красное яблоко",
        svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 27 C32 16 16 30 18 55 C20 77 33 91 49 85 C65 91 80 77 82 55 C84 30 68 16 50 27Z" fill="#e44d4d" stroke="#9c2828" stroke-width="3"/>
          <path d="M49 28 Q48 13 55 9" fill="none" stroke="#765025" stroke-width="5" stroke-linecap="round"/>
          <path d="M52 20 Q68 8 75 18 Q67 29 52 20Z" fill="#59a754" stroke="#397238" stroke-width="2"/>
          <ellipse cx="34" cy="44" rx="6" ry="11" fill="#fff" opacity=".22"/>
        </svg>`
      }]
    },
    basket: {
      name: "Корзина",
      costumes: [{
        name: "корзина",
        svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 38 H90 L80 83 Q50 94 20 83Z" fill="#bd8647" stroke="#6f4825" stroke-width="4"/>
          <path d="M17 54 H83 M22 71 H78 M31 42 L36 83 M50 42 V87 M69 42 L64 83" stroke="#e0b173" stroke-width="4" fill="none"/>
          <path d="M10 38 H90" stroke="#6f4825" stroke-width="8" stroke-linecap="round"/>
        </svg>`
      }]
    },
    ball: {
      name: "Мячик",
      costumes: [
        {
          name: "мяч 1",
          svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="ballGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#FF6B81"/>
                <stop offset="60%" stop-color="#E84118"/>
                <stop offset="100%" stop-color="#7C1100"/>
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="36" fill="url(#ballGrad)" stroke="#4A0000" stroke-width="2"/>
            <ellipse cx="40" cy="35" rx="10" ry="6" fill="#FFFFFF" opacity="0.6"/>
          </svg>`
        }
      ]
    }
  },

  backdrops: {
    blank: {
      name: "Белый фон",
      render: (ctx, w, h) => {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
      }
    },
    grid: {
      name: "Сетка координат XY",
      render: (ctx, w, h) => {
        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(0, 0, w, h);
        
        // Линии сетки каждые 40px
        ctx.strokeStyle = "#E2E8F0";
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y <= h; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        const cx = w / 2;
        const cy = h / 2;

        // Главные оси X и Y
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();

        ctx.strokeStyle = "#EF4444";
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();

        // Подписи
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("(0, 0)", cx + 5, cy - 6);
        ctx.fillText("X: -240", 8, cy - 6);
        ctx.fillText("X: 240", w - 46, cy - 6);
        ctx.fillText("Y: 180", cx + 6, 16);
        ctx.fillText("Y: -180", cx + 6, h - 8);
      }
    },
    space: {
      name: "Космос",
      render: (ctx, w, h) => {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#0B0C1E");
        grad.addColorStop(0.5, "#1B1B3A");
        grad.addColorStop(1, "#0A0915");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Звёзды
        ctx.fillStyle = "#FFFFFF";
        const stars = [
          [30, 40, 1.5], [80, 120, 2], [140, 50, 1], [220, 90, 2.5],
          [320, 40, 1.5], [420, 100, 2], [460, 40, 1], [70, 280, 2],
          [160, 310, 1.5], [250, 260, 2.5], [360, 330, 1.5], [440, 270, 2]
        ];
        stars.forEach(([x, y, r]) => {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Туманность
        const radGrad = ctx.createRadialGradient(380, 70, 10, 380, 70, 140);
        radGrad.addColorStop(0, "rgba(168, 85, 247, 0.35)");
        radGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
      }
    },
    nature: {
      name: "Поляна и небо",
      render: (ctx, w, h) => {
        // Небо
        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
        sky.addColorStop(0, "#38BDF8");
        sky.addColorStop(1, "#BAE6FD");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Солнце
        ctx.fillStyle = "#FDE047";
        ctx.beginPath();
        ctx.arc(60, 60, 30, 0, Math.PI * 2);
        ctx.fill();

        // Облака
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(180, 70, 22, 0, Math.PI * 2);
        ctx.arc(205, 65, 26, 0, Math.PI * 2);
        ctx.arc(230, 70, 22, 0, Math.PI * 2);
        ctx.fill();

        // Холмы / Трава
        ctx.fillStyle = "#22C55E";
        ctx.beginPath();
        ctx.arc(140, 450, 250, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#16A34A";
        ctx.beginPath();
        ctx.arc(380, 480, 280, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
};
