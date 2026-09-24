// js/demos.js - Готовые демо-проекты на русском языке

window.SCRATCH_DEMOS = {
  cat_walk: {
    title: "Прогулка котика",
    description: "Котик ходит по сцене, перебирает лапками, мяукает и отскакивает от стенок.",
    backdrop: "nature",
    variables: ["шаги"],
    sprites: [
      {
        id: "sprite_cat",
        name: "Котик",
        type: "cat",
        x: -120,
        y: -30,
        direction: 90,
        size: 100,
        visible: true,
        rotationStyle: "left-right",
        costumeIndex: 0,
        costumes: window.SCRATCH_ASSETS.sprites.cat.costumes,
        scripts: [
          {
            blockId: "event_whenflagclicked",
            type: "hat",
            x: 40,
            y: 30,
            next: {
              blockId: "motion_setrotationstyle",
              type: "command",
              args: { STYLE: "left-right" },
              next: {
                blockId: "looks_sayforsecs",
                type: "command",
                args: { MESSAGE: "Пойдём гулять!", SECS: 1.5 },
                next: {
                  blockId: "control_forever",
                  type: "c_block",
                  args: {},
                  substack: [
                    {
                      blockId: "motion_movesteps",
                      type: "command",
                      args: { STEPS: 12 },
                      next: {
                        blockId: "looks_nextcostume",
                        type: "command",
                        args: {},
                        next: {
                          blockId: "motion_ifonedgebounce",
                          type: "command",
                          args: {},
                          next: {
                            blockId: "control_if",
                            type: "c_block",
                            args: { CONDITION: "touching_edge" },
                            substack: [
                              {
                                blockId: "sound_playmeow",
                                type: "command",
                                args: { SOUND: "meow" },
                                next: {
                                  blockId: "looks_sayforsecs",
                                  type: "command",
                                  args: { MESSAGE: "Мяу! Ой, край!", SECS: 0.8 }
                                }
                              }
                            ],
                            next: {
                              blockId: "control_wait",
                              type: "command",
                              args: { DURATION: 0.1 }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    ]
  },

  star_pattern: {
    title: "Радужный узор (Перо)",
    description: "Котик опускает перо и рисует завораживающий геометрический цветок с помощью цикла.",
    backdrop: "grid",
    variables: ["лепестки"],
    sprites: [
      {
        id: "sprite_cat",
        name: "Котик-художник",
        type: "cat",
        x: 0,
        y: 0,
        direction: 90,
        size: 70,
        visible: true,
        rotationStyle: "all",
        costumeIndex: 0,
        costumes: window.SCRATCH_ASSETS.sprites.cat.costumes,
        scripts: [
          {
            blockId: "event_whenflagclicked",
            type: "hat",
            x: 40,
            y: 30,
            next: {
              blockId: "pen_clear",
              type: "command",
              args: {},
              next: {
                blockId: "motion_gotoxy",
                type: "command",
                args: { X: 0, Y: 0 },
                next: {
                  blockId: "pen_setsize",
                  type: "command",
                  args: { SIZE: 3 },
                  next: {
                    blockId: "pen_setcolor",
                    type: "command",
                    args: { COLOR: "#9966FF" },
                    next: {
                      blockId: "pen_pendown",
                      type: "command",
                      args: {},
                      next: {
                        blockId: "looks_sayforsecs",
                        type: "command",
                        args: { MESSAGE: "Смотри, как я рисую!", SECS: 1.5 },
                        next: {
                          blockId: "control_repeat",
                          type: "c_block",
                          args: { TIMES: 24 },
                          substack: [
                            {
                              blockId: "motion_movesteps",
                              type: "command",
                              args: { STEPS: 70 },
                              next: {
                                blockId: "motion_turnright",
                                type: "command",
                                args: { DEGREES: 145 },
                                next: {
                                  blockId: "sound_playmeow",
                                  type: "command",
                                  args: { SOUND: "pop" },
                                  next: {
                                    blockId: "control_wait",
                                    type: "command",
                                    args: { DURATION: 0.06 }
                                  }
                                }
                              }
                            }
                          ],
                          next: {
                            blockId: "pen_penup",
                            type: "command",
                            args: {},
                            next: {
                              blockId: "sound_playmeow",
                              type: "command",
                              args: { SOUND: "jump" },
                              next: {
                                blockId: "looks_sayforsecs",
                                type: "command",
                                args: { MESSAGE: "Шедевр готов!", SECS: 2 }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    ]
  },

  rocket_space: {
    title: "Космический полёт",
    description: "Управление ракетой с клавиатуры: стрелки влево/вправо поворачивают, стрелка вверх включает двигатель со звуком.",
    backdrop: "space",
    variables: ["топливо"],
    sprites: [
      {
        id: "sprite_rocket",
        name: "Ракета",
        type: "rocket",
        x: 0,
        y: -60,
        direction: 0,
        size: 90,
        visible: true,
        rotationStyle: "all",
        costumeIndex: 0,
        costumes: window.SCRATCH_ASSETS.sprites.rocket.costumes,
        scripts: [
          {
            blockId: "event_whenflagclicked",
            type: "hat",
            x: 30,
            y: 20,
            next: {
              blockId: "motion_gotoxy",
              type: "command",
              args: { X: 0, Y: -60 },
              next: {
                blockId: "looks_sayforsecs",
                type: "command",
                args: { MESSAGE: "Стрелка вверх — лететь, влево/вправо — поворот!", SECS: 3 }
              }
            }
          },
          {
            blockId: "event_whenkeypressed",
            type: "hat",
            args: { KEY: "ArrowUp" },
            x: 30,
            y: 160,
            next: {
              blockId: "motion_movesteps",
              type: "command",
              args: { STEPS: 20 },
              next: {
                blockId: "sound_playmeow",
                type: "command",
                args: { SOUND: "laser" },
                next: {
                  blockId: "motion_ifonedgebounce",
                  type: "command",
                  args: {}
                }
              }
            }
          },
          {
            blockId: "event_whenkeypressed",
            type: "hat",
            args: { KEY: "ArrowLeft" },
            x: 320,
            y: 20,
            next: {
              blockId: "motion_turnleft",
              type: "command",
              args: { DEGREES: 15 }
            }
          },
          {
            blockId: "event_whenkeypressed",
            type: "hat",
            args: { KEY: "ArrowRight" },
            x: 320,
            y: 160,
            next: {
              blockId: "motion_turnright",
              type: "command",
              args: { DEGREES: 15 }
            }
          }
        ]
      }
    ]
  },

  star_clicker: {
    title: "Игра: Поймай звёздочку",
    description: "Мини-игра: кликай по звездочке пока она летает по экрану, чтобы набрать очки со звуком монетки!",
    backdrop: "space",
    variables: ["счёт"],
    sprites: [
      {
        id: "sprite_star",
        name: "Звёздочка",
        type: "star",
        x: 0,
        y: 60,
        direction: 90,
        size: 90,
        visible: true,
        rotationStyle: "none",
        costumeIndex: 0,
        costumes: window.SCRATCH_ASSETS.sprites.star.costumes,
        scripts: [
          {
            blockId: "event_whenflagclicked",
            type: "hat",
            x: 30,
            y: 20,
            next: {
              blockId: "data_setvariableto",
              type: "command",
              args: { VAR: "счёт", VALUE: 0 },
              next: {
                blockId: "looks_sayforsecs",
                type: "command",
                args: { MESSAGE: "Кликай на меня быстрее!", SECS: 2 },
                next: {
                  blockId: "control_forever",
                  type: "c_block",
                  args: {},
                  substack: [
                    {
                      blockId: "motion_glideto",
                      type: "command",
                      args: { SECS: 0.8, X: 120, Y: 80 },
                      next: {
                        blockId: "motion_glideto",
                        type: "command",
                        args: { SECS: 0.8, X: -100, Y: -50 },
                        next: {
                          blockId: "motion_glideto",
                          type: "command",
                          args: { SECS: 0.8, X: -80, Y: 90 },
                          next: {
                            blockId: "motion_glideto",
                            type: "command",
                            args: { SECS: 0.8, X: 110, Y: -80 }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          {
            blockId: "event_whenthisspriteclicked",
            type: "hat",
            x: 360,
            y: 20,
            next: {
              blockId: "data_changevariableby",
              type: "command",
              args: { VAR: "счёт", VALUE: 1 },
              next: {
                blockId: "sound_playmeow",
                type: "command",
                args: { SOUND: "coin" },
                next: {
                  blockId: "looks_sayforsecs",
                  type: "command",
                  args: { MESSAGE: "+1 Очко!", SECS: 0.5 }
                }
              }
            }
          }
        ]
      }
    ]
  }
};
