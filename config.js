/* 행사 설정: 시간 단위는 ms. 좌표는 원본 배경 1103 × 1426 기준입니다. */
const CONFIG = {
  duration: 30000, target: 20, capacity: 5, shelvePerBook: 200,
  spawnUntil: 29000, cleanupGrace: 2000,
  fallStart: 650, fallEnd: 300, spawnStart: 1200, spawnEnd: 700,
  dropDuration: 600, floorLifetime: 2200, floorLimit: 6,
  nextPuzzleUrl: '',
  layout: { width: 1103, height: 1426, columns: [125, 326, 528, 735],
    rows: [475, 670, 865, 1060], floor: 1320, shelfTop: 365,
    librarianScale: .78, librarianDropOffset: 218 }
};
if (typeof module !== 'undefined') module.exports = CONFIG;
