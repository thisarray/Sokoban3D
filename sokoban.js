/*
 * Characters used in the sokoban levels.
 */

/*
 * String character indicating a comment.
 */
const COMMENT = ';';

/*
 * String character for the starting position of the player.
 */
const PLAYER = '@';

/*
 * String character for the starting position of the player on storage.
 */
const PLAYER_ON_STORAGE = '+';

/*
 * String character for the starting position of a box.
 */
const BOX = '$';

/*
 * String character for the starting position of a box on storage.
 */
const BOX_ON_STORAGE = '*';

/*
 * String character for the position of a storage.
 */
const STORAGE = '.';

/*
 * String character for the position of a wall.
 */
const WALL = '#';

const EMPTY = ' ';

/*
 * Integer farthest visible distance in the field of view.
 */
const VIEW_LIMIT = 8;

/*
 * Array of integer horizontal and vertical offsets corresponding to each direction (top, right, bottom, left) the player faces.
 */
const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/*
 * Integer index of the starting direction the player faces.
 */
const START_DIRECTION = 0;

function assertValidLevel(level, levelCount, lineNumber) {
  let playerCount = 0,
      boxCount = 0,
      storageCount = 0;

  for (let x = 0; x < level.length; x++) {
    for (let y = 0; y < level[x].length; y++) {
      if ((level[x][y] === PLAYER) || (level[x][y] === PLAYER_ON_STORAGE)) {
        playerCount++;
      }
      if ((level[x][y] === BOX) || (level[x][y] === BOX_ON_STORAGE)) {
        boxCount++;
      }
      if ((level[x][y] === STORAGE) || (level[x][y] === BOX_ON_STORAGE) || (level[x][y] === PLAYER_ON_STORAGE)) {
        storageCount++;
      }
    }
  }

  console.assert(playerCount === 1, `Level ${ levelCount } (around line ${ lineNumber } ) is missing a starting point.`);
  console.assert(storageCount > 0, `Level ${ levelCount } (around line ${ lineNumber } ) must have at least one storage.`);
  console.assert(boxCount >= storageCount, `Level ${ levelCount } (around line ${ lineNumber } ) is impossible to solve. It has ${ storageCount } storages but only ${ boxCount } boxes.`);
}

/*
 * Parse the sokoban levels in text.
 */
function parseLevels(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string.');
  }

  let levels = [],
      lines = text.split('\n'),
      levelCount = 1,
      mapLines = [],
      line, maxLength, level;

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    line = lines[lineNumber].trimEnd();

    if (line.startsWith(COMMENT)) {
      // Ignore comment lines
      continue;
    }

    if (line.length > 0) {
      mapLines.push(line);
    }
    else if ((line.length <= 0) && (mapLines.length > 0)) {
      // A blank line ends the current map

      // Pad the lines to be the same length
      maxLength = Math.max(...mapLines.map(l => l.length));
      for (let i = 0; i < mapLines.length; i++) {
        mapLines[i] = mapLines[i].padEnd(maxLength, EMPTY);
      }

      // Convert the lines to column major
      level = [];
      for (let x = 0; x < maxLength; x++) {
        level.push([]);
      }
      for (let y = 0; y < mapLines.length; y++) {
        for (let x = 0; x < maxLength; x++) {
          level[x].push(mapLines[y][x]);
        }
      }

      assertValidLevel(level, levelCount, lineNumber);

      levels.push(level);
      levelCount++;
      mapLines = [];
    }
  }

  return levels;
}

class Game {
  constructor(level) {
    if (!Array.isArray(level)) {
      throw new TypeError('level must be an Array.');
    }

    this.playerX = 0;
    this.playerY = 0;
    this.direction = START_DIRECTION;
    this.stepCount = 0;
    this.boxes = [];
    this.storages = [];

    this.level = level;
    for (let x = 0; x < this.level.length; x++) {
      for (let y = 0; y < this.level[x].length; y++) {
        if ((this.level[x][y] === PLAYER) || (this.level[x][y] === PLAYER_ON_STORAGE)) {
          this.playerX = x;
          this.playerY = y;
        }
        if ((this.level[x][y] === BOX) || (this.level[x][y] === BOX_ON_STORAGE)) {
          this.boxes.push([x, y]);
        }
        if ((this.level[x][y] === STORAGE) || (this.level[x][y] === BOX_ON_STORAGE) || (this.level[x][y] === PLAYER_ON_STORAGE)) {
          this.storages.push([x, y]);
        }
      }
    }
  }

  isLevelComplete() {
    for (let [sx, sy] of this.storages) {
      if (!this.boxes.some(b => ((b[0] === sx) && (b[1] === sy)))) {
        // If there is a storage without a box on it
        return false;
      }
    }
    return true;
  }

  isBlocked(x, y) {
    if ((x < 0) || (this.level.length <= x) || (y < 0) || (this.level[x].length <= y)) {
      return true;
    }
    return (this.isWall(x, y) || this.isBox(x, y));
  }

  isBox(x, y) {
    if ((x < 0) || (this.level.length <= x) || (y < 0) || (this.level[x].length <= y)) {
      return false;
    }
    return this.boxes.some(b => ((b[0] === x) && (b[1] === y)));
  }

  isStorage(x, y) {
    if ((x < 0) || (this.level.length <= x) || (y < 0) || (this.level[x].length <= y)) {
      return false;
    }
    return this.storages.some(s => ((s[0] === x) && (s[1] === y)));
  }

  isWall(x, y) {
    if ((x < 0) || (this.level.length <= x) || (y < 0) || (this.level[x].length <= y)) {
      return false;
    }
    return (this.level[x][y] === WALL);
  }

  move() {
    let [dx, dy] = DIRECTIONS[this.direction],
        newX = this.playerX + dx,
        newY = this.playerY + dy,
        boxIndex = -1;

    if (this.isWall(newX, newY)) {
      return false;
    }

    boxIndex = this.boxes.findIndex(b => ((b[0] === newX) && (b[1] === newY)));
    if (boxIndex >= 0) {
      if (this.isBlocked(newX + dx, newY + dy)) {
        return false;
      }
      else {
        // Box is not blocked so move it
        this.boxes[boxIndex][0] += dx;
        this.boxes[boxIndex][1] += dy;
      }
    }

    // Move the player
    this.playerX = newX;
    this.playerY = newY;
    this.stepCount++;

    return true;
  }
}
