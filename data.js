const LOCATIONS = [
  { id: 'river',  name: 'Яуза',   icon: 'fa-water', bg: 'assets/river.png',x: 5, y: 45, music: 'river' },
  { id: 'pond',   name: 'Измайлово',     icon: 'fa-tree', bg: 'assets/pond.png',x: 70, y: 20, music: 'pond' },
  { id: 'marina', name: 'Лужа на районе', icon: 'fa-shoe-prints',     bg: 'assets/marina.png',x: 76, y: 68, music: 'marina' },
  { id: 'pool', name: 'Бассейн СК', icon: 'fa-person-swimming', bg: 'assets/pool.png', x: 20, y: 20, music: 'pool' },
];

const PREDICTIONS = {
  common: [
    'Сегодня тебя ждёт неожиданная пятёрка',
    'Кто-то из группы вспомнит о тебе добрым словом',
    'Кофе в автомате сегодня будет вкуснее обычного',
    'Найдёшь забытую наличку в кармане куртки',
    'Лекция закончится раньше, чем ты думаешь',
    'Тебе улыбнётся незнакомец — это знак',
    'Найдешь вот такуая хуйня собачка',
  ],
  rare: [
    'На этой неделе тебя ждёт приятный сюрприз от друга',
    'Твой проект выстрелит лучше, чем ты ожидаешь',
    'Ты наконец-то выспишься. Правда-правда',
    'Встретишь человека, который изменит твои планы',
  ],
  epic: [
    'Этим летом случится то, о чём ты будешь рассказывать годами',
    'Ты найдёшь своё призвание там, где совсем не искал',
    'Судьба уже готовит тебе большую встречу',
    'Твоя идея изменит что-то вокруг. Не откладывай её',
    'тебя найдет серега павлов',
  ],
};

const RARITY_CONFIG = {
  common: { hits: 2, zoneSize: 18, cursorSpeed: 1.1, followRadius: 45, followSpeed: 2, label: 'Обычное',   fishIcon: 'fa-star' },
  rare:   { hits: 3, zoneSize: 16, cursorSpeed: 1.2, followRadius: 40, followSpeed: 2.3, label: 'Редкое',    fishIcon: 'fa-gem' },
  epic:   { hits: 4, zoneSize: 14, cursorSpeed: 1.3, followRadius: 35, followSpeed: 2.6, label: 'Эпическое', fishIcon: 'fa-crown' },
};

const RARITY_CHANCES = { common: 0.6, rare: 0.3, epic: 0.1 };

const GAME_DURATION_SEC = 90;