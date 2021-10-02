var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
/*var image0 = new Image();
image0.src = "s0.png";*/

/*known edge cases

Preservers wont properly preserve other Preservers
rotators wont properly animate the destruction of border stuff
*/

let debug_keys = '0123456789abcdefghijklmnopqrstuvwxyz'

let TILE = 50
let ACTION_TIME = 100
let N_TILES = 10
let DEBUG_PUSH_OFF_BORDER = false
let DEBUG_MOVE_RESPECTFULLY = false
let DEBUG_WALK_OUTOFBONDS = false

let action_queue_pos = null

let extra_draw_code = []

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
  for (const [_key, value] of Object.entries(grid)) {
    ctx.drawImage(value.sprite, 50 * value.coords.x, 50 * value.coords.y);
  }
}

function drawactionqueue() {
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

  if (extra_draw_code.length > 0) extra_draw_code[extra_draw_code.length - 1]()

  drawgridelements();

  drawgrid();

  drawactionqueue();
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

function _quietDelete(symbol) {
  if (symbol === undefined) return;
  symbol.deleted = true // idk if this will be used elsewhere
  delete grid[symbol.coords.str()];
  actions = actions.filter(x => x !== symbol)
  pendingactions = pendingactions.filter(x => x !== symbol)
}

// DESIGN DECISIONS
// if we use these helper functions consistently, we can quickly adjust the game's behaviour
// (it will also help with graphics)
// These should be understood as commands; they will return true if the action is succesful

// Called by Bomb, TaxiCab, ???; explicitly kill the symbol
async function kill_at(coords) {
  let symbol = grid[coords.str()]
  if (symbol === undefined) {
    // this will be used for graphics
    return true;
  } else {
    // kill triggers the del action
    await symbol.delfunc();

    _quietDelete(symbol);
    return true;
  }
}

async function move_to(from_coords, to_coords) {
  console.log("called move_to")
  extra_draw_code.push(() => {
    ctx.fillStyle = "red"
    ctx.fillRect(from_coords.x * TILE, from_coords.y * TILE, TILE, TILE)
    ctx.fillRect(to_coords.x * TILE, to_coords.y * TILE, TILE, TILE)
  })
  if (!inBounds(from_coords)) return true
  let symbol = grid[from_coords.str()]
  if (symbol === undefined) {
    // this will be used for graphics
    await sleep(200)
    extra_draw_code.pop()
    return true;
  }
  if (!inBounds(to_coords)) {
    _quietDelete(symbol);
    return true

    // Another option:
    //return false

    // Another option:
    //symbol.delfunc() // tigger special effects when falling out of the border
    //return true
  }
  let occupying_symbol = grid[to_coords.str()]
  if (occupying_symbol) {
    await kill_at(to_coords)

    // Another option:
    //return false // don't step on other symbols

    // Another option:
    //_quietDelete(occupying_symbol) // delete without triggering special effects
  }

  delete grid[from_coords.str()];
  symbol.coords = to_coords
  grid[to_coords.str()] = symbol
  await sleep(200)
  extra_draw_code.pop()

  return true
}

// activate the stuff
async function activate_at(coords) {
  let symbol = grid[coords.str()]
  if (symbol === undefined) {
    // this will be used for graphics
    return true;
  }
  if (checkforblocker(symbol)) return false
  await symbol.actfunc()
  return true
}

async function clone_tile(from_coords, to_coords) {
  if (!inBounds(to_coords)) return true // nothing to be done
  await kill_at(to_coords)
  // Another option:
  //_quietDelete(...) etc

  let symbol = grid[from_coords.str()]
  if (symbol === undefined) {
    return true
  }

  let new_symbol = new symbol.constructor(to_coords)
  grid[to_coords.str()] = new_symbol
  pendingactions.push(new_symbol);

  // extremely hacky, oops
  if (new_symbol.constructor.name === "Preserver") {
    new_symbol.recordedTypes = symbol.recordedTypes
  }
}


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
  sprite = null // static property, doesn't need to be in constructor
  constructor(coords) {
    this.coords = coords;
    /*this.placefunc = placefunc;
    this.actfunc = (() => (checkforblocker(this) ? {} : actfunc()));
    this.delfunc = (() => {
      let deleted = grid[this.coords.str()]
      delete grid[this.coords.str()];
      actions = actions.filter(x => x !== deleted)
      pendingactions = pendingactions.filter(x => x !== deleted)
      delfunc()
    });*/
    // this.sprite = sprite;

    /*this.WALK_OUTOFBONDS = false
    this.MOVE_RESPECTFULLY = true*/
    this.deleted = false
  }

  /*async placefunc() {

  }*/

  async actfunc() {
    await sleep(20)
  }

  async delfunc() {

  }

  /*forceMove(new_coors) {
    delete grid[this.coords.str()];
    this.coords = new_coors;
    if (!inBounds(new_coors)) {
      console.error("calling forceMove with coors outside bounds, oops")
    }
    grid[new_coors.str()] = this;
  }*/

  // helper function: really delete stuff
  /*_delete() {
    let deleted = grid[this.coords.str()]
    delete grid[this.coords.str()];
    actions = actions.filter(x => x !== deleted)
    pendingactions = pendingactions.filter(x => x !== deleted)
  }*/

  // Tries to move by own will; returns true if move was succesful
  /*selfMove(new_coors) {
    if (!inBounds(new_coors)) {
      if (this.WALK_OUTOFBONDS) {
        delete grid[this.coords.str()];
        return true // a bit arbitrary
      } else {
        return false
      }
    }
    let occupying_thing = grid[this.coords.str()]
    if (occupying_thing) {
      if (this.MOVE_RESPECTFULLY) {
        return false // doesn't move
      } else {
        if (occupying_thing.getOverwritten()) {
          delete grid[this.coords.str()];
          this.coords = new_coors;
          grid[new_coors.str()] = this;
        }
      }
    } else {
      delete grid[this.coords.str()];
      this.coords = new_coors;
      grid[new_coors.str()] = this;
    }
  }*/

  // Get overwritten by someone else. Returns true if allowed, returns false if not
  /*getStepped() {
    // Design decision: stuff is happy to be overwritten, but doesn't call delfunc
    this._delete()
    return true
  }*/

  // Get explicitely killed by bomb, TaxiCab, ???. Should return true
  /*getKilled() {
    this.delfunc()
    this._delete()
    return true
  }*/


}

class Nooper extends Symbol {
  sprite = images[0]
  /*constructor(coords, sprite) {
    //super(coords, () => { }, () => { }, () => { }, images[0]);
    super(coords, images[0]);
  }*/
}

class Bomb extends Symbol {
  sprite = images[1]
  /*constructor(coords, sprite) {
    super(coords, () => { }, () => this.explode(), () => { }, images[1]);
  }*/

  async actfunc() {
    let k = 0;

    for (const offset of threebythreeoffsets) {
      let offset_coor = this.coords.add(offset)
      await kill_at(offset_coor)
      await sleep(20)
      // grid[offset_coor.str()]?.getKilled()
    }
  }
}

class PusherRight extends Symbol {
  sprite = images[2]
  /*constructor(coords) {
    super(coords, () => { }, () => {
      this.pushColumn();
      return () => this.moveRight();
    }, () => { }, images[2]);
  }*/

  async actfunc() {
    // if (checkforblocker(this)) return
    for (let k = N_TILES; k > 0; k--) {
      for (let d = -1; d < 2; d += 2) { // d = -1, 1
        let target_coor = this.coords.add(new Coords(0, k * d))
        let pushTo_coor = this.coords.add(new Coords(0, (k + 1) * d))
        await move_to(target_coor, pushTo_coor)
        // await sleep(20)
        /*if (inBounds(target_coor) && occupied(target_coor)) {
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
        }*/
      }
    }
    await sleep(50)
    await move_to(this.coords, this.coords.add(new Coords(1, 0)))
  }

  /*
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
    // extra_draw_code = null
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
  */
}

class PullerUp extends Symbol {
  sprite = images[3]

  async actfunc() {
    // if (checkforblocker(this)) return
    for (let k = 1; k < N_TILES; k++) {
      for (let d = -1; d < 2; d += 2) { // d = -1, 1
        if (k == 1) {
          // special case: adjacent tiles are killed
          await kill_at(this.coords.add(new Coords(k * d, 0)))

          // Another option:
          //_quietDelete(grid[this.coords.add(new Coords(k * d, 0))?.str()])
          // destroys the thing without triggering special effect
        } else {
          let target_coor = this.coords.add(new Coords(k * d, 0))
          let pullTo_coor = this.coords.add(new Coords((k - 1) * d, 0))
          await move_to(target_coor, pullTo_coor)
          await sleep(20)
        }
      }
    }
    await move_to(this.coords, this.coords.add(new Coords(0, -1)))
    await sleep(40)
  }
}

class Rotator extends Symbol {
  sprite = images[4]
  /*constructor(coords) {
    super(coords, () => { }, () => this.rotateStuff(), () => { }, images[4]);
  }*/

  async actfunc() {
    // special case, don't use move_to since the moves are simultaneous
    let rotatingPieces = []
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
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
          //piece.delfunc() // TODO: THIS DOESN'T AWAIT
          _quietDelete(piece)
        }
      } else {
        if (inBounds(offset_coor)) {
          // (this is just a movement)
          delete grid[offset_coor.str()];
          // _quietDelete(grid[offset_coor.str()]);
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
    await sleep(100)
  }
}

class RunAway extends Symbol {
  sprite = images[5]
  /*constructor(coords) {
    super(coords, () => { }, () => this.runAway(), () => { }, images[5]);
  }*/
  async actfunc() {
    let n_closePieces = 0
    let closePiece = null
    let valid_k = 0
    for (var k = 0; k < 4; k++) {
      let offset_coor = this.coords.add(offsets[k])
      if (grid[offset_coor.str()] !== undefined) {
        n_closePieces += 1
        valid_k = k
        closePiece = grid[offset_coor.str()]
      }
    }
    if (n_closePieces === 1) {
      let clonable_coor = this.coords.add(offsets[valid_k % 4])
      let old_coor = this.coords.clone()
      let moveTo_coor = this.coords.add(offsets[(valid_k + 2) % 4])
      await move_to(old_coor, moveTo_coor)
      /*if (DEBUG_WALK_OUTOFBONDS) {
        // option 1: stuff keeps moving even if it means suicide
        if (!inBounds(moveTo_coor)) {
          this.delfunc()
          return;
        }
      } else {
        // option 2: stuff stops at the border
        if (!inBounds(moveTo_coor)) return
      }*/
      /*if (DEBUG_MOVE_RESPECTFULLY) {
        // option 1: don't override stuff
        if (occupied(moveTo_coor)) return
      } else {
        // option 2: don't override stuff
        if (occupied(moveTo_coor)) grid[moveTo_coor.str()].delfunc()
      }*/
      //this.forceMove(moveTo_coor)
      await clone_tile(clonable_coor, old_coor)
      await sleep(100)
      //makesymbolat(old_coor, closePiece.constructor)
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
  sprite = images[6]
  /*constructor(coords) {
    super(coords, () => { }, () => this.taxiCabStuff(), () => { }, images[6]);
  }*/
  async actfunc() {
    let dists = Object.entries(grid).map(([_coor, thingy]) => {
      if (thingy === this) return Infinity
      return taxiCabDist(thingy.coords, this.coords)
    })
    let min_dist = Math.min(...dists)
    if (min_dist < Infinity) {
      // warning: Object.entries(grid).foreach doesn't work well with animation
      let level_objects = Object.entries(grid)
      for (var k = 0; k < level_objects.length; k++) {
        let [_coor, thingy] = level_objects[k]
        if (taxiCabDist(thingy.coords, this.coords) !== min_dist) continue;
        await kill_at(thingy.coords)
        await sleep(50)
      }
      await sleep(50)
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
  sprite = images[7]

  /*constructor(coords) {
    super(coords, () => { }, () => this.fall(), () => { }, images[7]);
  }*/
  async actfunc() {
    // a bit of a special case, don't directly use move_to since that would fall off the border
    let new_coors = this.coords.add(new Coords(0, 1))
    if (inBounds(new_coors) && !occupied(new_coors)) {
      await move_to(this.coords, new_coors)
      await sleep(100)
    }
  }

  /*fall() {
    let new_coors = this.coords.add(new Coords(0, 1))
    if (inBounds(new_coors) && !occupied(new_coors)) {
      delete grid[this.coords.str()];
      this.coords = new_coors;
      grid[new_coors.str()] = this;
    }
  }*/
}

class Blocker extends Symbol {
  sprite = images[8]
  /*constructor(coords) {
    super(coords, () => { }, () => this.extend(), () => { }, images[8]);
  }*/
  async actfunc() {
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      /*if (inBounds(offset_coor) && !occupied(offset_coor)) {
        makesymbolat(offset_coor, Blocker)
      }*/
      await clone_tile(this.coords, offset_coor)
      await sleep(10)
    }
  }

  /*extend() {
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      if (inBounds(offset_coor) && !occupied(offset_coor)) {
        makesymbolat(offset_coor, Blocker)
      }
    }
  }*/
}

class Preserver extends Symbol {
  sprite = images[9]
  /*constructor(coords) {
    super(coords, () => this.recordStuff(), () => this.recreateStuff(), () => { }, images[9]);
  }*/

  constructor(coords) {
    super(coords)
    // TODO: this wont record hidden state of symbols!
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

  async actfunc() {
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      //clone_tile()
      if (inBounds(offset_coor)) {
        await kill_at(offset_coor);
        makesymbolat(offset_coor, this.recordedTypes[k])
        await sleep(30)
        /*let overlapping = grid[offset_coor.str()]
        if (overlapping === undefined) {
          makesymbolat(offset_coor, this.recordedTypes[k])
        } else {
          if (!DEBUG_MOVE_RESPECTFULLY) {
            grid[offset_coor.str()].delfunc()
            makesymbolat(offset_coor, this.recordedTypes[k])
          }
        }*/
      }
    }
  }
}

class OrthoCopier extends Symbol {
  sprite = images[10]
  /*constructor(coords) {
    super(coords, () => { }, () => this.extend(), () => { }, );
  }*/
  async actfunc() {
    for (var k = 0; k < 4; k++) {
      let offset_coor = this.coords.add(offsets[k])
      if (inBounds(offset_coor) && occupied(offset_coor)) {
        // makesymbolat(offset_coor, OrthoCopier)
        await clone_tile(this.coords, offset_coor)
        await sleep(20)
      }
    }
  }
}

class Kamikaze extends Symbol {
  sprite = images[11]
  /*constructor(coords) {
    super(coords, () => { }, () => { }, () => this.kamikaze(), images[11]);
  }*/
  async delfunc() {
    for (var k = 0; k < 4; k++) {
      let offset_coor = this.coords.add(offsets[k])
      let thingy = grid[offset_coor.str()]
      if (!thingy) continue
      if (thingy.constructor.name == "Kamikaze") {
        await kill_at(offset_coor)
        await sleep(20)
        // thingy.delfunc() // somehow it doesn't enter in an endless loop, lol
      }
    }
  }
}

class AboveBelow extends Symbol {
  sprite = images[13]
  /*constructor(coords) {
    super(coords, () => { }, () => this.aboveBelow(), () => { }, images[13]);
  }*/
  async actfunc() {
    let obj_above_type = grid[this.coords.add(new Coords(0, -1)).str()]?.constructor // possibly undefined
    let obj_below_type = grid[this.coords.add(new Coords(0, 1)).str()]?.constructor // possibly undefined

    if (obj_above_type === undefined || obj_below_type === undefined) {
      await sleep(20)
      return
    }

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
    await sleep(100)
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
  // s.placefunc();
  actions.push(s);
  doturn();
}

let doing_stuff = false
async function doturn() {
  if (doing_stuff) {
    throw new Error("called do turn while another turn was in progress")
  }
  /*actions.forEach(s => {
    s.actfunc()
  })*/
  /*action_queue_pos = 0
  do_cur_action()*/
  let i = 0;
  doing_stuff = true
  while (i < actions.length) {
    // await actions[i].actfunc()
    await activate_at(actions[i].coords)
    // await sleep(100) // TODO: this should be in the things actfuncs, not here
    i += 1
  }
  doing_stuff = false
  actions = actions.concat(pendingactions)
  pendingactions = []
  console.log("finished all actions")
}

/*function do_cur_action() {
  if (action_queue_pos >= actions.length) {
    action_queue_pos = null;
    actions = actions.concat(pendingactions)
    pendingactions = []
    console.log("finished all actions")
    return;
  } else {
    console.log("doing action: ", actions[action_queue_pos])
    let next_step = actions[action_queue_pos].actfunc()
    setTimeout(() => do_cur_ministep(next_step), ACTION_TIME)
    // action_queue_pos += 1
    // setTimeout(do_cur_action, ACTION_TIME)
  }
}*/

/*function do_cur_ministep(step) {
  if (step === undefined) {
    // finished
    action_queue_pos += 1
    setTimeout(do_cur_action, ACTION_TIME)
  } else {
    let next_step = step()
    setTimeout(() => do_cur_ministep(next_step), ACTION_TIME)
  }
}*/

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
