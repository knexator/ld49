var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
/*var image0 = new Image();
image0.src = "s0.png";*/

let debug_keys = '0123456789abcdefghijklmnopqrstuvwxyz'

let TILE = 50
let ACTION_TIME = 100
let N_TILES = 10
let DEBUG_PUSH_OFF_BORDER = false
let DEBUG_MOVE_RESPECTFULLY = false
let DEBUG_WALK_OUTOFBONDS = false

let action_queue_pos = null

function drawgrid() {
  //ctx.lineWidth = 3;
  for (let i = 0; i < N_TILES; i++) {
    ctx.moveTo(0, TILE * (i + 1))
    ctx.lineTo(500, TILE * (i + 1))
    ctx.moveTo(TILE * (i + 1), 0)
    ctx.lineTo(TILE * (i + 1), 500)
  }
  ctx.stroke()
}

function drawgridelements() {
  for (const [key, value] of Object.entries(grid)) {
    ctx.drawImage(value.sprite, 50 * value.coords.x, 50 * value.coords.y);
  }
}

function drawaction() {
  ctx.beginPath()
  ctx.moveTo(0, canvas.height - 50);
  ctx.lineTo(50 * actions.length, canvas.height - 50);
  for (let i = 0; i < actions.length; i++) {
    ctx.drawImage(actions[i].sprite, 50 * i, canvas.height - 50);
    ctx.moveTo(50 * (i + 1), canvas.height - 50);
    ctx.lineTo(50 * (i + 1), canvas.height);
  }
  ctx.stroke();
}

window.addEventListener("load", _e => {
  // window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let k = 0; k < 14; k++) {
    if (wasKeyPressed(debug_keys[k])) {
      let coords = new Coords(Math.floor(mouse.x / TILE), Math.floor(mouse.y / TILE))
      placesymbolat(coords, symbol_types[k])
    }
  }
  if (wasKeyPressed(' ')) doturn()

  drawgridelements();

  drawgrid();

  drawaction();
  //something goes here

  // engine stuff
  mouse_prev = Object.assign({}, mouse);
  mouse.wheel = 0;
  keyboard_prev = Object.assign({}, keyboard);
  window.requestAnimationFrame(draw);
}

class Coords {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(c2) {
    return new Coords(this.x + c2.x, this.y + c2.y);
  }

  scalar(m) {
    return new Coords(this.x * m, this.y * m);
  }

  str() {
    return this.x.toString() + "," + this.y.toString();
  }

  clone() {
    return new Coords(this.x, this.y)
  }
}

var offsets = [new Coords(0, 1), new Coords(1, 0), new Coords(0, -1), new Coords(-1, 0)];

var threebythreeoffsets = [new Coords(-1, -1), new Coords(0, -1), new Coords(1, -1),
new Coords(1, 0),
new Coords(1, 1), new Coords(0, 1), new Coords(-1, 1),
new Coords(-1, 0)]; //rotational order
var grid = {};

var actions = [];

var pendingactions = [];

function taxiCabDist(coor1, coor2) {
  return Math.abs(coor1.x - coor2.x) + Math.abs(coor1.y - coor2.y)
}

function checkforblocker(symbol) {
  if (symbol.constructor.name == "Blocker") return false // easier to handle the special case here
  for (const offset of offsets) {
    let target = grid[symbol.coords.add(offset).str()];
    if (typeof target !== 'undefined') {
      if (target.constructor.name == "Blocker") {
        return true;
      }
    }
  }
  return false;
}

class Symbol {
  constructor(coords, placefunc, actfunc, delfunc, sprite) {
    this.coords = coords;
    this.placefunc = placefunc;
    this.actfunc = (() => (checkforblocker(this) ? {} : actfunc()));
    this.delfunc = (() => {
      let deleted = grid[this.coords.str()]
      delete grid[this.coords.str()];
      actions = actions.filter(x => x !== deleted)
      pendingactions = pendingactions.filter(x => x !== deleted)
      delfunc()
    });
    this.sprite = sprite;
  }

  forceMove(new_coors) {
    delete grid[this.coords.str()];
    this.coords = new_coors;
    if (!inBounds(new_coors)) {
      console.error("calling forceMove with coors outside bounds, oops")
    }
    grid[new_coors.str()] = this;
  }
}


class Nooper extends Symbol {
  symbol_type = Nooper
  constructor(coords) {
    super(coords, () => { }, () => { }, () => { }, images[0]);
  }
}

class Bomb extends Symbol {
  symbol_type = Bomb
  constructor(coords) {
    super(coords, () => { }, () => this.explode(), () => { }, images[1]);
  }
  explode() {
    for (const offset of threebythreeoffsets) {
      let offset_coor = this.coords.add(offset)
      if (inBounds(offset_coor) && occupied(offset_coor)) {
        grid[offset_coor.str()].delfunc();
      }
    }
  }
}

class PusherRight extends Symbol {
  symbol_type = PusherRight
  constructor(coords) {
    super(coords, () => { }, () => {
      this.pushColumn();
      this.moveRight();
    }, () => { }, images[2]);
  }
  pushColumn() {
    for (let k = N_TILES; k > 0; k--) {
      for (let d = -1; d < 2; d += 2) { // d = -1, 1
        let target_coor = this.coords.add(new Coords(0, k * d))
        let pushTo_coor = this.coords.add(new Coords(0, (k + 1) * d))
        if (inBounds(target_coor) && occupied(target_coor)) {
          // there is something to be pushed
          if (DEBUG_PUSH_OFF_BORDER) {
            // option 1: stuff at border dissapears
            if (!inBounds(pushTo_coor)) {
              grid[target_coor.str()].delfunc();
            } else {
              grid[target_coor.str()].forceMove(pushTo_coor);
            }
          } else {
            // option 2: stuff at border isn't pushed
            if (inBounds(pushTo_coor) && !occupied(pushTo_coor)) {
              grid[target_coor.str()].forceMove(pushTo_coor);
            }
          }
        }
      }
    }
  }
  moveRight() {
    let target_coor = this.coords.add(new Coords(1, 0))
    if (DEBUG_PUSH_OFF_BORDER) {
      // option 1: trying to move off border deletes the object
      if (!inBounds(target_coor)) this.delfunc();
      if (occupied(target_coor)) grid[target_coor.str()].delfunc(); // should never happen
      this.forceMove(target_coor)
    } else {
      // option 2: the object doesn't move off border
      if (!inBounds(target_coor)) return
      if (occupied(target_coor)) grid[target_coor.str()].delfunc();
      this.forceMove(target_coor)
    }
  }
}

class PullerUp extends Symbol {
  symbol_type = PullerUp
  constructor(coords) {
    super(coords, () => { }, () => {
      this.pullRow();
      this.moveUp();
    }, () => { }, images[3]);
  }
  pullRow() {
    for (let k = 1; k < N_TILES; k++) {
      for (let d = -1; d < 2; d += 2) { // d = -1, 1
        let target_coor = this.coords.add(new Coords(k * d, 0))
        let pullTo_coor = this.coords.add(new Coords((k - 1) * d, 0))
        if (inBounds(target_coor) && occupied(target_coor)) {
          // there is something to be pulled

          if (pullTo_coor.str() === this.coords.str()) {
            // special case: delete adjacent stuff
            grid[target_coor.str()].delfunc()
          } else if (inBounds(pullTo_coor)) {
            grid[target_coor.str()].forceMove(pullTo_coor);
          }
        }
      }
    }
  }
  moveUp() {
    let target_coor = this.coords.add(new Coords(0, -1))
    if (DEBUG_PUSH_OFF_BORDER) {
      // option 1: trying to move off border deletes the object
      if (!inBounds(target_coor)) this.delfunc();
      if (occupied(target_coor)) grid[target_coor.str()].delfunc();
      this.forceMove(target_coor)
    } else {
      // option 2: the object doesn't move off border
      if (!inBounds(target_coor)) return
      if (occupied(target_coor)) grid[target_coor.str()].delfunc();
      this.forceMove(target_coor)
    }
  }
}

class Rotator extends Symbol {
  symbol_type = Rotator
  constructor(coords) {
    super(coords, () => { }, () => this.rotateStuff(), () => { }, images[4]);
  }
  rotateStuff() {
    let rotatingPieces = []
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      /*if (inBounds(offset_coor)) {
        grid[offset_coor.str()].delfunc();
      }*/
      rotatingPieces.push(grid[offset_coor.str()]) // possibly undefined, but no problem
    }
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      let piece = rotatingPieces[(k + 1) % 8]
      if (piece !== undefined) {
        if (inBounds(offset_coor)) {
          piece.coords = offset_coor;
          grid[offset_coor.str()] = piece;
        } else {
          piece.delfunc()
        }
      } else {
        if (inBounds(offset_coor)) {
          delete grid[offset_coor.str()];
        }
      }

      /*if (inBounds(offset_coor)) {
        grid[offset_coor.str()].delfunc();
      }*/
      // rotatingPieces.push(grid[offset_coor.str()]) // possibly undefined, but no problem
    }
    /*for (const offset of threebythreeoffsets) {
      let offset_coor = this.coords.add(offset)
      if (inBounds(offset_coor) && occupied(offset_coor)) {
        grid[offset_coor.str()].delfunc();
      }
    }*/
    /*let new_coors = this.coords.add(new Coords(0, 1))
    if (inBounds(new_coors) && !occupied(new_coors)) {
      delete grid[this.coords.str()];
      this.coords = new_coors;
      grid[new_coors.str()] = this;
    }*/
  }
}

class RunAway extends Symbol {
  constructor(coords) {
    super(coords, () => { }, () => this.runAway(), () => { }, images[5]);
  }
  runAway() {
    let n_closePieces = 0
    let closePiece = null
    let valid_k = 0
    for (var k = 1; k < 8; k += 2) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      if (grid[offset_coor.str()] !== undefined) {
        n_closePieces += 1
        valid_k = k
        closePiece = grid[offset_coor.str()]
      }
    }
    if (n_closePieces === 1) {
      let moveTo_coor = this.coords.add(threebythreeoffsets[(valid_k + 4) % 8])
      if (DEBUG_WALK_OUTOFBONDS) {
        // option 1: stuff keeps moving even if it means suicide
        if (!inBounds(moveTo_coor)) {
          this.delfunc()
          return;
        }
      } else {
        // option 2: stuff stops at the border
        if (!inBounds(moveTo_coor)) return
      }
      if (DEBUG_MOVE_RESPECTFULLY) {
        // option 1: don't override stuff
        if (occupied(moveTo_coor)) return
      } else {
        // option 2: don't override stuff
        if (occupied(moveTo_coor)) grid[moveTo_coor.str()].delfunc()
      }
      let old_coor = this.coords.clone()
      this.forceMove(moveTo_coor)
      makesymbolat(old_coor, closePiece.constructor)
    }
    /*for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      let piece = closePieces[(k + 1) % 8]
      if (piece !== undefined) {
        if (inBounds(offset_coor)) {
          piece.coords = offset_coor;
          grid[offset_coor.str()] = piece;
        } else {
          piece.delfunc()
        }
      } else {
        if (inBounds(offset_coor)) {
          delete grid[offset_coor.str()];
        }
      }
    }*/
  }
}

class TaxiCab extends Symbol {
  constructor(coords) {
    super(coords, () => { }, () => this.taxiCabStuff(), () => { }, images[6]);
  }
  taxiCabStuff() {
    let dists = Object.entries(grid).map(([_coor, thingy]) => {
      if (thingy === this) return Infinity
      return taxiCabDist(thingy.coords, this.coords)
    })
    let min_dist = Math.min(...dists)
    if (min_dist < Infinity) {
      Object.entries(grid).forEach(([_coor, thingy]) => {
        if (taxiCabDist(thingy.coords, this.coords) !== min_dist) return;
        thingy.delfunc();
      })
    }
    /*let new_coors = this.coords.add(new Coords(0, 1))
    if (inBounds(new_coors) && !occupied(new_coors)) {
      delete grid[this.coords.str()];
      this.coords = new_coors;
      grid[new_coors.str()] = this;
    }*/
  }
}

class Faller extends Symbol {
  constructor(coords) {
    super(coords, () => { }, () => this.fall(), () => { }, images[7]);
  }
  fall() {
    let new_coors = this.coords.add(new Coords(0, 1))
    if (inBounds(new_coors) && !occupied(new_coors)) {
      delete grid[this.coords.str()];
      this.coords = new_coors;
      grid[new_coors.str()] = this;
    }
  }
}

class Blocker extends Symbol {
  constructor(coords) {
    super(coords, () => { }, () => this.extend(), () => { }, images[8]);
  }
  extend() {
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      if (inBounds(offset_coor) && !occupied(offset_coor)) {
        makesymbolat(offset_coor, Blocker)
      }
    }
  }
}

class Preserver extends Symbol {
  constructor(coords) {
    super(coords, () => this.recordStuff(), () => this.recreateStuff(), () => { }, images[9]);
  }
  recordStuff() {
    this.recordedTypes = []
    for (var k = 0; k < 8; k++) {
      let thingy = grid[this.coords.add(threebythreeoffsets[k]).str()]
      if (thingy !== undefined) {
        this.recordedTypes.push(thingy.constructor)
      } else {
        this.recordedTypes.push(undefined)
      }
    }
  }
  recreateStuff() {
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      if (inBounds(offset_coor)) {
        let overlapping = grid[offset_coor.str()]
        if (overlapping === undefined) {
          makesymbolat(offset_coor, this.recordedTypes[k])
        } else {
          if (!DEBUG_MOVE_RESPECTFULLY) {
            grid[offset_coor.str()].delfunc()
            makesymbolat(offset_coor, this.recordedTypes[k])
          }
        }
      }
    }
  }
}

class OrthoCopier extends Symbol {
  constructor(coords) {
    super(coords, () => { }, () => this.extend(), () => { }, images[10]);
  }
  extend() {
    for (var k = 0; k < 4; k++) {
      let offset_coor = this.coords.add(offsets[k])
      if (inBounds(offset_coor) && !occupied(offset_coor)) {
        makesymbolat(offset_coor, OrthoCopier)
      }
    }
  }
}

class Kamikaze extends Symbol {
  constructor(coords) {
    super(coords, () => { }, () => {}, () => this.kamikaze(), images[11]);
  }
  kamikaze() {
    for (var k = 0; k < 4; k++) {
      let offset_coor = this.coords.add(offsets[k])
      let thingy = grid[offset_coor.str()]
      if (!thingy) continue
      if (thingy.constructor.name == "Kamikaze") {
        thingy.delfunc() // somehow it doesn't enter in an endless loop, lol
      }
    }
  }
}

class AboveBelow extends Symbol {
  constructor(coords) {
    super(coords, () => { }, () => this.aboveBelow(), () => {}, images[13]);
  }
  aboveBelow() {
    let obj_above_type = grid[this.coords.add(new Coords(0, -1)).str()]?.constructor // possibly undefined
    let obj_below_type = grid[this.coords.add(new Coords(0,  1)).str()]?.constructor // possibly undefined

    // if only one is undefined, should we erase the other?
    if (obj_above_type===undefined || obj_below_type===undefined) return

    // should this call the delete function?
    // should this alter the action order?
    Object.entries(grid).forEach(([coor, thingy]) => {
      if (thingy.constructor.name == obj_above_type.name) {
        grid[coor] = new obj_below_type(thingy.coords);
        // keep action order
        actions = actions.map(action => {
          if (action !== thingy) return action
          return grid[coor]
        })
        pendingactions = pendingactions.map(action => {
          if (action !== thingy) return action
          return grid[coor]
        })
      } else if (thingy.constructor.name == obj_below_type.name) {
        grid[coor] = new obj_above_type(thingy.coords);
        // keep action order
        actions = actions.map(action => {
          if (action !== thingy) return action
          return grid[coor]
        })
        pendingactions = pendingactions.map(action => {
          if (action !== thingy) return action
          return grid[coor]
        })
      }
    })
  }
}

let images = []

for (k = 0; k < 14; k++) {
  let cur_img = new Image();
  cur_img.src = "s" + k.toString() + ".png";
  images.push(cur_img)
}

function inBounds(coords) {
  return coords.x >= 0 && coords.x < N_TILES && coords.y >= 0 && coords.y < N_TILES
}

function occupied(coords) {
  let target = grid[coords.str()];
  return (typeof target !== 'undefined');
}

function makesymbolat(coords, symboltype) { //called when a symbol makes a symbol
  if (symboltype === undefined) {
    // extremely hacky special case
    if (grid[coords.str()]) grid[coords.str()].delfunc()
  } else {
    s = new symboltype(coords);
    grid[coords.str()] = s;
    pendingactions.push(s);
    return s;
  }
}

function placesymbolat(coords, symboltype) { //called when the player places a symbol, should potentially remove it from bank too
  s = new symboltype(coords);
  grid[coords.str()] = s;
  s.placefunc();
  actions.push(s);
  doturn();
}

function doturn() {
  /*actions.forEach(s => {
    s.actfunc()
  })*/
  action_queue_pos = 0
  do_cur_action()
}

function do_cur_action() {
  if (action_queue_pos >= actions.length) {
    action_queue_pos = null;
    actions = actions.concat(pendingactions)
    console.log("finished all actions")
    return;
  } else {
    console.log("doing action: ", actions[action_queue_pos])
    actions[action_queue_pos].actfunc()
    action_queue_pos += 1
    setTimeout(do_cur_action, ACTION_TIME)
  }
}

let symbol_types = [
  Nooper, // 0
  Bomb,
  PusherRight,
  PullerUp,
  Rotator,
  RunAway, // 5
  TaxiCab,
  Faller,
  Blocker,
  Preserver,
  OrthoCopier, // 10
  Kamikaze,
  Nooper,
  AboveBelow,
  Nooper,
  Nooper, // 15
  Nooper,
]








// engine stuff

window.addEventListener('mousemove', e => _mouseEvent(e));
window.addEventListener('mousedown', e => _mouseEvent(e));
window.addEventListener('mouseup', e => _mouseEvent(e));

function _mouseEvent(e) {
  let rectThingy = canvas.getBoundingClientRect()
  mouse.x = e.clientX - rectThingy.x;
  mouse.y = e.clientY - rectThingy.y;
  mouse.buttons = e.buttons;
  return false;
}

window.addEventListener('wheel', e => {
  let d = e.deltaY > 0 ? 1 : -1;
  return mouse.wheel = d;
});

let mouse = { x: 0, y: 0, buttons: 0, wheel: 0 };
let mouse_prev = Object.assign({}, mouse);

function isButtonDown(b) {
  let i = b == "left" ? 0 : b == "right" ? 1 : 2;
  return (mouse.buttons & (1 << i)) != 0;
}

function wasButtonPressed(b) {
  let i = b == "left" ? 0 : b == "right" ? 1 : 2;
  return ((mouse.buttons & (1 << i)) !== 0) && ((mouse_prev.buttons & (1 << i)) === 0);
}

function wasButtonReleased(b) {
  let i = b == "left" ? 0 : b == "right" ? 1 : 2;
  return ((mouse.buttons & (1 << i)) === 0) && ((mouse_prev.buttons & (1 << i)) !== 0);
}

let keyboard = {};
let keyboard_prev = {};

function keyMap(e) {
  // use key.code if key location is important
  return e.key.toLowerCase();
}

window.addEventListener('keydown', e => {
  let k = keyMap(e);
  keyboard[k] = true;
});

window.addEventListener('keyup', e => {
  let k = keyMap(e);
  keyboard[k] = false;
});

function isKeyDown(k) {
  return keyboard[k] || false;
}

function wasKeyPressed(k) {
  return (keyboard[k] || false) && (!keyboard_prev[k] || false);
}

function wasKeyReleased(k) {
  return (!keyboard[k] || false) && (keyboard_prev[k] || false);
}
