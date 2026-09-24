// js/levels.js - Каталог уровней игры «БЛОК КУБА» с прогрессивными подсказками и чистыми шаблонами

window.KUMIR_LEVELS = [
  {
    id: "level_1",
    title: "Уровень 1: Первые шаги к сундуку",
    subtitle: "Линейные алгоритмы",
    description: "Стив оказался в шахте. Помогите ему дойти до сундука с золотом. Напишите команды для движения вправо.",
    goalText: "Доберитесь до сундука",
    maxSteps: 10,
    maxHints: 3, // Для первых раундов 3 подсказки
    hints: [
      "Посчитайте расстояние: сколько шагов нужно сделать Стиву до сундука?",
      "Для движения вправо используйте команду move_right() в Python или move_right(); в C++.",
      "Решение: напишите команду move_right() ровно 4 раза подряд."
    ],
    steve: { x: 1, y: 3, dir: "right" },
    target: { x: 5, y: 3, type: "reach_cell" },
    map: [
      ["stone", "stone", "stone", "stone", "stone", "stone", "stone"],
      ["stone", "grass", "grass", "grass", "grass", "grass", "stone"],
      ["stone", "grass", "stone", "stone", "stone", "grass", "stone"],
      ["stone", "path",  "path",  "path",  "path",  "chest", "stone"],
      ["stone", "grass", "stone", "stone", "stone", "grass", "stone"],
      ["stone", "grass", "grass", "grass", "grass", "grass", "stone"],
      ["stone", "stone", "stone", "stone", "stone", "stone", "stone"]
    ],
    initialCodePython: `# Уровень 1: Первые шаги
# Составьте алгоритм движения Стива к сундуку

`,
    initialCodeCpp: `// Уровень 1: Первые шаги
#include <steve.h>

int main() {
    // Составьте алгоритм движения Стива к сундуку
    
    return 0;
}
`
  },

  {
    id: "level_2",
    title: "Уровень 2: Добыча алмазов",
    subtitle: "Сбор ресурсов и функции",
    description: "В шахте обнаружены 2 ценные алмазные жилы! Дойдите до каждой из них и добудьте киркой с помощью функции destroy().",
    goalText: "Добудьте 2 алмазные руды",
    requiredDiamonds: 2,
    maxSteps: 16,
    maxHints: 3, // Для 2 раунда также 3 подсказки
    hints: [
      "Обратите внимание на координаты: сначала Стиву нужно подняться вверх командой move_up().",
      "Чтобы добыть руду, встаньте перед ней лицом к блоку и вызовите функцию destroy().",
      "После первого алмаза вернитесь в тоннель и дойдите до второй жилы справа."
    ],
    steve: { x: 1, y: 4, dir: "up" },
    map: [
      ["stone", "stone", "stone", "stone", "stone", "stone", "stone"],
      ["stone", "stone", "diamond_ore", "stone", "diamond_ore", "stone", "stone"],
      ["stone", "stone", "path",  "stone", "path",  "stone", "stone"],
      ["stone", "path",  "path",  "path",  "path",  "path",  "stone"],
      ["stone", "path",  "stone", "stone", "stone", "stone", "stone"],
      ["stone", "stone", "stone", "stone", "stone", "stone", "stone"],
      ["stone", "stone", "stone", "stone", "stone", "stone", "stone"]
    ],
    initialCodePython: `# Уровень 2: Добыча алмазов
# Добудьте 2 алмаза с помощью move_up(), move_right() и destroy()

`,
    initialCodeCpp: `// Уровень 2: Добыча алмазов
#include <steve.h>

int main() {
    // Добудьте 2 алмаза с помощью move_up(), move_right() и destroy()
    
    return 0;
}
`
  },

  {
    id: "level_3",
    title: "Уровень 3: Мост через лаву",
    subtitle: "Циклы со счётчиком",
    description: "Впереди озеро раскалённой лавы! Постройте безопасный каменный мост и дойдите до сундука, используя цикл со счётчиком.",
    goalText: "Постройте мост и дойдите до сундука",
    maxSteps: 18,
    maxHints: 1, // Начиная с 3 раунда - только 1 подсказка на раунд!
    hints: [
      "Используйте цикл: for i in range(3): внутри которого ставьте блок place(), а затем делайте шаг move_right(). После моста сделайте финальный шаг к сундуку."
    ],
    steve: { x: 1, y: 3, dir: "right" },
    target: { x: 5, y: 3, type: "reach_cell" },
    map: [
      ["stone", "stone", "stone", "stone", "stone", "stone", "stone"],
      ["stone", "stone", "lava",  "lava",  "lava",  "stone", "stone"],
      ["stone", "stone", "lava",  "lava",  "lava",  "stone", "stone"],
      ["stone", "grass", "lava",  "lava",  "lava",  "chest", "stone"],
      ["stone", "stone", "lava",  "lava",  "lava",  "stone", "stone"],
      ["stone", "stone", "lava",  "lava",  "lava",  "stone", "stone"],
      ["stone", "stone", "stone", "stone", "stone", "stone", "stone"]
    ],
    initialCodePython: `# Уровень 3: Мост через лаву
# Используйте цикл со счётчиком: for i in range(3):

`,
    initialCodeCpp: `// Уровень 3: Мост через лаву
#include <steve.h>

int main() {
    // Используйте цикл for (int i = 0; i < 3; i++) { ... }
    
    return 0;
}
`
  },

  {
    id: "level_4",
    title: "Уровень 4: Лабиринт шахты",
    subtitle: "Циклы с условием while",
    description: "Тоннель петляет во тьме! Напишите умный алгоритм с циклом while is_clear_forward(): чтобы Стив сам прошёл коридоры.",
    goalText: "Пройдите лабиринт к выходу",
    maxSteps: 25,
    maxHints: 1, // 1 подсказка на раунд
    hints: [
      "Цикл while is_clear_forward(): позволяет Стиву идти вперёд, пока он не упрётся в стену. После цикла измените направление шагом вниз."
    ],
    steve: { x: 1, y: 1, dir: "right" },
    target: { x: 5, y: 5, type: "reach_cell" },
    map: [
      ["stone", "stone", "stone", "stone", "stone", "stone", "stone"],
      ["stone", "path",  "path",  "path",  "path",  "stone", "stone"],
      ["stone", "stone", "stone", "stone", "path",  "stone", "stone"],
      ["stone", "stone", "path",  "path",  "path",  "stone", "stone"],
      ["stone", "stone", "path",  "stone", "stone", "stone", "stone"],
      ["stone", "stone", "path",  "path",  "path",  "chest", "stone"],
      ["stone", "stone", "stone", "stone", "stone", "stone", "stone"]
    ],
    initialCodePython: `# Уровень 4: Лабиринт шахты
# Используйте цикл с условием: while is_clear_forward():

`,
    initialCodeCpp: `// Уровень 4: Лабиринт шахты
#include <steve.h>

int main() {
    // Используйте цикл while (is_clear_forward()) { ... }
    
    return 0;
}
`
  }
];
