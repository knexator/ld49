var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
/*var image0 = new Image();
image0.src = "s0.png";*/

/*known issues

rotators wont properly tirgger the destruction of border stuff
*/


class Symbol {
  sprite = null // static property, doesn't need to be in constructor
  constructor(coords) {
    this.coords = coords;
    this.deleted = false
  }

  async placefunc() {

  }

  async actfunc() {
    await sleep(20)
  }

  async delfunc() {
	_quietDelete(this);
  }

}

class Nooper extends Symbol {
  sprite = images[0]
  /*constructor(coords, sprite) {
    //super(coords, () => { }, () => { }, () => { }, images[0]);
    super(coords, images[0]);
  }*/
}

class Nooper2 extends Symbol {
  sprite = images[14]
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
      // L.grid[offset_coor.str()]?.getKilled()
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
              L.grid[target_coor.str()].delfunc();
            } else {
              L.grid[target_coor.str()].forceMove(pushTo_coor);
            }
          } else {
            // option 2: stuff at border isn't pushed
            if (inBounds(pushTo_coor) && !occupied(pushTo_coor)) {
              L.grid[target_coor.str()].forceMove(pushTo_coor);
            }
          }
        }*/
      }
    }
    await sleep(50)
    await move_to(this.coords, this.coords.add(new Coords(1, 0)))
  }
}

class PullerUp extends Symbol {
  sprite = images[3]

  async actfunc() {
    // more special cases, yay
    // if (checkforblocker(this)) return
    for (let k = 2; k < N_TILES; k++) {
      for (let d = -1; d < 2; d += 2) { // d = -1, 1
        if (k == 1) {
          // special case: adjacent tiles are killed
          await kill_at(this.coords.add(new Coords(k * d, 0)))

          // Another option:
          //_quietDelete(L.grid[this.coords.add(new Coords(k * d, 0))?.str()])
          // destroys the thing without triggering special effect
        } else {
          let target_coor = this.coords.add(new Coords(k * d, 0))
          let pullTo_coor = this.coords.add(new Coords((k - 1) * d, 0))
        // symbol.coords = to_coords
        // L.grid[to_coords.str()] = symbol
        // await move_to(target_coor, pullTo_coor)
          await move_to(target_coor, pullTo_coor)
          // await sleep(20)
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
      rotatingPieces.push(L.grid[offset_coor.str()]) // possibly undefined, but no problem
    }
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      let piece = rotatingPieces[(k + 1) % 8]
      if (piece !== undefined) {
        if (inBounds(offset_coor)) {
          piece.coords = offset_coor;
          L.grid[offset_coor.str()] = piece;
        } else {
          //piece.delfunc() // TODO: THIS DOESN'T AWAIT
          _quietDelete(piece)
        }
      } else {
        if (inBounds(offset_coor)) {
          // (this is just a movement)
          delete L.grid[offset_coor.str()];
          // _quietDelete(L.grid[offset_coor.str()]);
        }
      }

      /*if (inBounds(offset_coor)) {
        L.grid[offset_coor.str()].delfunc();
      }*/
      // rotatingPieces.push(L.grid[offset_coor.str()]) // possibly undefined, but no problem
    }
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
      if (L.grid[offset_coor.str()] !== undefined) {
        n_closePieces += 1
        valid_k = k
        closePiece = L.grid[offset_coor.str()]
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
        if (occupied(moveTo_coor)) L.grid[moveTo_coor.str()].delfunc()
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
          L.grid[offset_coor.str()] = piece;
        } else {
          piece.delfunc()
        }
      } else {
        if (inBounds(offset_coor)) {
          delete L.grid[offset_coor.str()];
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
    let dists = Object.entries(L.grid).map(([_coor, thingy]) => {
      if (thingy === this) return Infinity
      return taxiCabDist(thingy.coords, this.coords)
    })
    let min_dist = Math.min(...dists)
    if (min_dist < Infinity) {
      // warning: Object.entries(L.grid).foreach doesn't work well with animation
      let level_objects = Object.entries(L.grid)
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
      delete L.grid[this.coords.str()];
      this.coords = new_coors;
      L.grid[new_coors.str()] = this;
    }*/
  }
}

class Faller extends Symbol {
  sprite = images[7]

  async actfunc() {
    // a bit of a special case, don't directly use move_to since that would fall off the border
    let new_coors = this.coords.add(new Coords(0, 1))
    if (inBounds(new_coors) && !occupied(new_coors)) {
      await move_to(this.coords, new_coors)
      // await sleep(100)
    }
  }
}

class Blocker extends Symbol {
  sprite = images[8]
  /*constructor(coords) {
    super(coords, () => { }, () => this.extend(), () => { }, images[8]);
  }*/
  async actfunc() {
    for (var k = 0; k < 4; k++) {
      let offset_coor = this.coords.add(offsets[k])
      if (inBounds(offset_coor) && !occupied(offset_coor)) {
        await clone_tile(this.coords, offset_coor) //changed this, shouldn't be cloning onto existing stuff
		await sleep(10)
      }
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
	/*
  constructor(coords) {
    super(coords)
    // TODO: this wont record hidden state of symbols!
    this.recordedTypes = []
    for (var k = 0; k < 8; k++) {
      let thingy = L.grid[this.coords.add(threebythreeoffsets[k]).str()]
      if (thingy !== undefined) {
        this.recordedTypes.push(thingy.constructor)
      } else {
        this.recordedTypes.push(undefined)
      }
    }
  }
	*/
	async actfunc() {

		for (const offset of threebythreeoffsets) {
			let offset_coor = this.coords.add(offset)
			await kill_at(offset_coor)
			//await sleep(20)
      // L.grid[offset_coor.str()]?.getKilled()
		}

		for (const pair of L.recordedSymbols) {
			let offset_coor = this.coords.add(threebythreeoffsets[pair[0]])
      //clone_tile()
			if (inBounds(offset_coor)) {
				await kill_at(offset_coor);
				makesymbolat(offset_coor, pair[1])
				await sleep(30)
        /*let overlapping = L.grid[offset_coor.str()]
        if (overlapping === undefined) {
          makesymbolat(offset_coor, this.recordedTypes[k])
        } else {
          if (!DEBUG_MOVE_RESPECTFULLY) {
            L.grid[offset_coor.str()].delfunc()
            makesymbolat(offset_coor, this.recordedTypes[k])
          }
        }*/
			}
		}
	}

	async placefunc() {
		L.recordedSymbols = [];
		for (const asymbol of L.actions) { //so order among copied symbols stays the same
			for (var k = 0; k < 8; k++) {
				if (this.coords.add(threebythreeoffsets[k]).equals(asymbol.coords)) {
					L.recordedSymbols.push([k,asymbol.constructor]);
				}
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
		  if (L.grid[offset_coor.str()].constructor.name !== "OrthoCopier"){
			// makesymbolat(offset_coor, OrthoCopier)
			await clone_tile(this.coords, offset_coor)
			await sleep(20)
		  }
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
	super.delfunc();
    for (var k = 0; k < 4; k++) {
      let offset_coor = this.coords.add(offsets[k])
      let thingy = L.grid[offset_coor.str()]
      if (!thingy) continue
      if (thingy.constructor.name == "Kamikaze") {
        await kill_at(offset_coor)
        await sleep(20)
        // thingy.delfunc() // somehow it doesn't enter in an endless loop, lol
      }
    }
  }
}

class LeftSpreader extends Symbol {
	sprite = images[12]

	async actfunc() {
		let offset_coor = this.coords.add(new Coords(-1,0));
		if (inBounds(offset_coor) && !occupied(offset_coor)) {
			await clone_tile(this.coords, offset_coor)
			await sleep(20)
			await kill_at(this.coords.add(new Coords(-1,-1)))
			await kill_at(this.coords.add(new Coords(-1,1)))
		}
	}

}

class AboveBelow extends Symbol {
  sprite = images[13]
  /*constructor(coords) {
    super(coords, () => { }, () => this.aboveBelow(), () => { }, images[13]);
  }*/
  async actfunc() {
    let obj_above_type = L.grid[this.coords.add(new Coords(0, -1)).str()]?.constructor // possibly undefined
    let obj_below_type = L.grid[this.coords.add(new Coords(0, 1)).str()]?.constructor // possibly undefined

    if (obj_above_type === undefined || obj_below_type === undefined) {
      await sleep(20)
      return
    }

    Object.entries(L.grid).forEach(([coor, thingy]) => {
      if (thingy.constructor.name == obj_above_type.name) {
        L.grid[coor] = new obj_below_type(thingy.coords);
        // keep action order
        L.actions = L.actions.map(action => {
          if (action !== thingy) return action
          return L.grid[coor]
        })
		/*
        pendingactions = pendingactions.map(action => {
          if (action !== thingy) return action
          return L.grid[coor]
        })
		*/
      } else if (thingy.constructor.name == obj_below_type.name) {
        L.grid[coor] = new obj_above_type(thingy.coords);
        // keep action order
        L.actions = L.actions.map(action => {
          if (action !== thingy) return action
          return L.grid[coor]
        })
		/*
        pendingactions = pendingactions.map(action => {
          if (action !== thingy) return action
          return L.grid[coor]
        })
		*/
      }
    })
    await sleep(100)
  }
}

class Survivor extends Symbol {
  sprite = images[12]
  /*constructor(coords) {
    super(coords, () => { }, () => { }, () => this.kamikaze(), images[11]);
  }*/
  async delfunc() {
	super.delfunc();
    for (var k = 0; k < 4; k++) {
      let offset_coor = this.coords.add(offsets[k])
      let thingy = L.grid[offset_coor.str()]
      if (!thingy) continue
      if (thingy.constructor.name == "Kamikaze") {
        await kill_at(offset_coor)
        await sleep(20)
        // thingy.delfunc() // somehow it doesn't enter in an endless loop, lol
      }
    }
  }
}

let debug_keys = '0123456789abcdefghijklmnopqrstuvwxyz'

let symbol_types = [
  Nooper, // 0
  Nooper2,
  Bomb,
  PusherRight,
  PullerUp,
  Rotator,	// 5
  RunAway,
  TaxiCab,
  Faller,
  Blocker,
  Preserver,	// 10 (a)
  OrthoCopier,
  Kamikaze,
  LeftSpreader,
  AboveBelow,
/*Nooper, // 15
  Nooper,
  Nooper,*/
]

let level_goals = [
  [
    [-1, -1, -1],
    [-1,  8, -1],
    [-1,  2, -1],
    [-1, -1, -1],
  ],
  [
    [-1,  8, -1],
    [ 3,  2, 13],
    [-1,  4, -1],
  ],
]

function preload_level(goal, n) {
  return {
    symbols_used: Array(symbol_types.length).fill(false),
    grid: {},
    actions: [],
    recordedSymbols: [],
    goal: level_goals[n],
    n: n,

    grid_undos: [],
    actions_undos: [],
    symbols_used_undos: [],
  }
}

function reset_level(level) {
  levels[level.n] = preload_level(level_goals[level.n], level.n)
  /*level.symbols_used = Array(symbol_types.length).fill(false)
  level.grid = {}
  level.actions = []
  level.recordedSymbols = []

  grid_undos: [],
  actions_undos: [],
  symbols_used_undos: [],*/
}



let levels = level_goals.map(preload_level)
let L = levels[0]

// let symbols_used = Array(symbol_types.length).fill(false)

let SKIP_ANIMS = false

let TILE = 50
let ACTION_TIME = 100
let N_TILES = 10

let X_GRID = 30 //these values should be able to be messed with and not cause problems
let Y_GRID = 20
let X_TABLEAU = 600
let Y_TABLEAU = 20
let TAB_COLS = 3
let TAB_ROWS = Math.ceil(symbol_types.length/TAB_COLS)
let X_GOAL = 600
let Y_GOAL = (TAB_ROWS + 1) * TILE

let DEBUG_PUSH_OFF_BORDER = false
let DEBUG_MOVE_RESPECTFULLY = false
let DEBUG_WALK_OUTOFBONDS = false
let DEBUG_HIDE_NUMBERS = false
let DEBUG_ALLOW_KEYPLACEMENT = true
let DEBUG_ALLOW_PASS_WITH_SPACE = true

//let action_queue_pos = null

let held_tile = null;

let extra_draw_code = []

function drawgrid() {
  //ctx.lineWidth = 3;
  ctx.beginPath()
  for (let i = 0; i <= N_TILES; i++) {
    ctx.moveTo(X_GRID, Y_GRID + TILE * i)
    ctx.lineTo(X_GRID + N_TILES * TILE, Y_GRID + TILE * i)
    ctx.moveTo(X_GRID + TILE * i, Y_GRID)
    ctx.lineTo(X_GRID + TILE * i, Y_GRID + N_TILES * TILE)
  }
  ctx.stroke()
}

function drawgridelements() {
  for (const [_key, value] of Object.entries(L.grid)) {
    ctx.drawImage(value.sprite, X_GRID + TILE * value.coords.x, Y_GRID + TILE * value.coords.y);
  }
}

function drawactionqueue() { //don't think we need this anymore
  ctx.beginPath()
  ctx.moveTo(0, canvas.height - TILE);
  ctx.lineTo(TILE * L.actions.length, canvas.height - TILE);
  for (let i = 0; i < L.actions.length; i++) {
    ctx.drawImage(L.actions[i].sprite, TILE * i, canvas.height - TILE);
    ctx.moveTo(TILE * (i + 1), canvas.height - TILE);
    ctx.lineTo(TILE * (i + 1), canvas.height);
  }
  ctx.stroke();
}

function drawactionnumbers() {
	if (DEBUG_HIDE_NUMBERS) { return }
	ctx.font = '20px sans-serrif'
	for (let i = 0; i < L.actions.length; i++) {
		ctx.strokeText(i.toString().padStart(2,'0'),X_GRID + TILE * L.actions[i].coords.x,Y_GRID + TILE * L.actions[i].coords.y + 20) //TODO make this not awful (20)
	}
}

function drawtableau() {
  ctx.beginPath()
	for (let i = 0; i <= TAB_COLS; i++) {
		ctx.moveTo(X_TABLEAU + TILE * i, Y_TABLEAU)
		ctx.lineTo(X_TABLEAU + TILE * i, Y_TABLEAU + TAB_ROWS * TILE)
	}
	for (let i = 0; i <= TAB_ROWS; i++) {
		ctx.moveTo(X_TABLEAU, Y_TABLEAU + TILE * i)
		ctx.lineTo(X_TABLEAU + TAB_COLS * TILE, Y_TABLEAU + TILE * i)
	}
	ctx.stroke()
}

function drawtableauelements() {
	for (let i = 0; i < symbol_types.length; i++){
		if(!L.symbols_used[i]){
			ctx.drawImage((new symbol_types[i]()).sprite, X_TABLEAU + (i % TAB_COLS)*TILE, Y_TABLEAU + Math.floor(i/TAB_COLS)*TILE)
		}
	}

}

function drawheldtile() {
	if( held_tile !== null) {
		ctx.drawImage((new symbol_types[held_tile]()).sprite,mouse.x - TILE/2,mouse.y - TILE/2);
	}
}

function drawgoalarea() {
  let h = L.goal.length;
  let w = L.goal[0].length;

  ctx.beginPath()
  for (let i = 0; i <= w; i++) {
		ctx.moveTo(X_GOAL + TILE * i, Y_GOAL)
		ctx.lineTo(X_GOAL + TILE * i, Y_GOAL + h * TILE)
	}
	for (let i = 0; i <= h; i++) {
		ctx.moveTo(X_GOAL, Y_GOAL + TILE * i)
		ctx.lineTo(X_GOAL + w * TILE, Y_GOAL + TILE * i)
	}
	ctx.stroke()

  for (let i = 0; i < w; i++){
    for (let j = 0; j<h; j++) {
      if (L.goal[j][i] !== -1) {
        ctx.drawImage((new symbol_types[L.goal[j][i]]()).sprite, X_GOAL + TILE * i, Y_GOAL + j * TILE);
      }
    }
	}
}

window.addEventListener("load", _e => {
  // window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if(DEBUG_ALLOW_KEYPLACEMENT) {
    for (let k = 0; k < 14; k++) {
  		if (wasKeyPressed(debug_keys[k])) {
  			let coords = new Coords(Math.floor((mouse.x - X_GRID) / TILE), Math.floor((mouse.y - Y_GRID) / TILE))
  			if(inBounds(coords) && !doing_stuff && !occupied(coords)){ //maybe if doing stuff, anim should be hurried somehow (even if occupied)?
  				placesymbolat(coords, symbol_types[k])
  			}
  		}
  	}
  }
	if(wasButtonPressed('left') && held_tile == null) { //held_tile should always be null, just hedging
		let coords = new Coords(Math.floor((mouse.x - X_TABLEAU) / TILE), Math.floor((mouse.y - Y_TABLEAU) / TILE))
		if( coords.x >= 0 && coords.x < TAB_COLS && coords.y >= 0 && coords.y < TAB_ROWS) {
			let index = coords.x + TAB_COLS * coords.y;
			if ( !L.symbols_used[index] ) {
				L.symbols_used[index] = true;
				held_tile = index;
			}
		}
	}

	if(wasButtonReleased('left') && held_tile !== null) {
		let coords = new Coords(Math.floor((mouse.x - X_GRID) / TILE), Math.floor((mouse.y - Y_GRID) / TILE))
		if(inBounds(coords) && !doing_stuff && !occupied(coords)){ //maybe if doing stuff, anim should be hurried somehow (even if occupied maybe)?
			placesymbolat(coords, symbol_types[held_tile]);
			held_tile = null;
		}
		else {
			L.symbols_used[held_tile] = false;
			held_tile = null;
		}
  }

  if (wasKeyPressed(' ') && DEBUG_ALLOW_PASS_WITH_SPACE) doturn()

  if (wasKeyPressed('r')) reset_level(L)
  if (wasKeyPressed('z')) undo()

  if (wasKeyPressed('m')) {
    L = levels[L.n + 1]
  }
  if (wasKeyPressed('n')) {
    L = levels[L.n - 1]
  }

  // if (extra_draw_code.length > 0) extra_draw_code[extra_draw_code.length - 1]()
  extra_draw_code.forEach(f => f());


  drawgridelements();

  drawgrid();

  //drawactionqueue();

  drawactionnumbers();

  drawtableauelements();

  drawtableau();

  drawgoalarea();

  drawheldtile();
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

  equals(c2) {
	  return ((this.x == c2.x) && (this.y == c2.y));
  }
}

var offsets = [new Coords(0, 1), new Coords(1, 0), new Coords(0, -1), new Coords(-1, 0)];

var threebythreeoffsets = [new Coords(-1, -1), new Coords(0, -1), new Coords(1, -1),
new Coords(1, 0),
new Coords(1, 1), new Coords(0, 1), new Coords(-1, 1),
new Coords(-1, 0)]; //rotational order


//var pendingactions = [];

function _quietDelete(symbol) {
  if (symbol === undefined) return;
  symbol.deleted = true // idk if this will be used elsewhere
  delete L.grid[symbol.coords.str()];
  //actions = actions.filter(x => x !== symbol) //replaced by below function call
  removefromactionsandmaybemovebackwards(symbol);
  //pendingactions = pendingactions.filter(x => x !== symbol)
}

// Warning: doesn't call the delfunc!!
/*function _quietMove(from_coords, to_coords) {
  if (!inBounds(from_coords)) {
    return
  }
  let symbol = L.grid[from_coords.str()]
  if (symbol === undefined) {
    return;
  }
  if (!inBounds(to_coords)) {
    _quietDelete(symbol);
    return true
  }
  let occupying_symbol = L.grid[to_coords.str()]
  if (occupying_symbol) {
    _quietDelete(occupying_symbol);
  }
  delete L.grid[from_coords.str()];
  symbol.coords = to_coords
  L.grid[to_coords.str()] = symbol
}*/

// DESIGN DECISIONS
// if we use these helper functions consistently, we can quickly adjust the game's behaviour
// (it will also help with graphics)
// These should be understood as commands; they will return true if the action is succesful

// Called by Bomb, TaxiCab, ???; explicitly kill the symbol
async function kill_at(coords) {
  let symbol = L.grid[coords.str()]
  if (symbol === undefined) {
    // this will be used for graphics
    return true;
  } else {
    // kill triggers the del action
    await symbol.delfunc();

    //_quietDelete(symbol); //delfuncs must do this themself (but may do it at any point in their execution)
    return true;
  }
}

async function move_to(from_coords, to_coords) {
  // console.log("called move_to")
  extra_draw_code.push(() => {
    ctx.fillStyle = "red"
    if (inBounds(from_coords)) ctx.fillRect(from_coords.x * TILE + X_GRID, from_coords.y * TILE + Y_GRID, TILE, TILE)
    if (inBounds(to_coords)) ctx.fillRect(to_coords.x * TILE + X_GRID, to_coords.y * TILE + Y_GRID, TILE, TILE)
  })
  if (!inBounds(from_coords)) {
    extra_draw_code.pop()
    return true
  }
  let symbol = L.grid[from_coords.str()]
  if (symbol === undefined) {
    // this will be used for graphics
    await sleep(50)
    extra_draw_code.pop()
    return true;
  }
  if (!inBounds(to_coords)) {
    _quietDelete(symbol);
    extra_draw_code.pop()
    return true

    // Another option:
    //return false

    // Another option:
    //symbol.delfunc() // tigger special effects when falling out of the border
    //return true
  }
  let occupying_symbol = L.grid[to_coords.str()]
  if (occupying_symbol) {
    await kill_at(to_coords)

    // Another option:
    //return false // don't step on other symbols

    // Another option:
    //_quietDelete(occupying_symbol) // delete without triggering special effects
  }

  delete L.grid[from_coords.str()];
  symbol.coords = to_coords
  L.grid[to_coords.str()] = symbol
  await sleep(100)
  extra_draw_code.pop()

  return true
}

// activate the stuff
async function activate_at(coords) {
  extra_draw_code.push(() => {
    ctx.fillStyle = "red"
    ctx.fillRect(coords.x * TILE - TILE*.1 + X_GRID, coords.y * TILE - TILE*.1 + Y_GRID, TILE * 1.2, TILE  * 1.2)
  })
  let symbol = L.grid[coords.str()]
  if (symbol === undefined) {
    // this will be used for graphics
    extra_draw_code.pop()
    return true;
  }
  if (checkforblocker(symbol)) {
    extra_draw_code.pop()
    return false
  }
  await symbol.actfunc()
  extra_draw_code.pop()
  return true
}

async function clone_tile(from_coords, to_coords) {
  if (!inBounds(to_coords)) return true // nothing to be done
  await kill_at(to_coords)
  // Another option:
  //_quietDelete(...) etc

  let symbol = L.grid[from_coords.str()]
  if (symbol === undefined) {
    return true
  }

  let new_symbol = new symbol.constructor(to_coords)
  L.grid[to_coords.str()] = new_symbol
  insertbeforecurrentaction(new_symbol);

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
    let target = L.grid[symbol.coords.add(offset).str()];
    if (typeof target !== 'undefined') {
      if (target.constructor.name == "Blocker") {
        return true;
      }
    }
  }
  return false;
}

let images = []

for (k = 0; k < 19; k++) {
  let cur_img = new Image();
  cur_img.src = "s" + k.toString() + ".png";
  images.push(cur_img)
}

function inBounds(coords) {
  return coords.x >= 0 && coords.x < N_TILES && coords.y >= 0 && coords.y < N_TILES
}

function occupied(coords) {
  let target = L.grid[coords.str()];
  return (typeof target !== 'undefined');
}

function makesymbolat(coords, symboltype) { //called when a symbol makes a symbol
  if (symboltype === undefined) {
    // extremely hacky special case
    if (L.grid[coords.str()]) L.grid[coords.str()].delfunc()
  } else {
    s = new symboltype(coords);
    L.grid[coords.str()] = s;
    insertbeforecurrentaction(s);
    return s;
  }
}

async function placesymbolat(coords, symboltype) { //called when the player places a symbol, should potentially remove it from bank too
  // undo: store how the world was
  L.symbols_used[held_tile] = false; // hacky thing for undo
  L.grid_undos.push(grid2blob(L.grid))
  L.actions_undos.push(grid2blob(L.actions))
  L.symbols_used_undos.push([...L.symbols_used])

  L.symbols_used[held_tile] = true; // hacky thing for undo

  s = new symboltype(coords);
  L.grid[coords.str()] = s;
  await s.placefunc();
  L.actions.push(s);
  doturn();
}

var insertbeforecurrentaction = null; //this is probably a bad idea but it works

var removefromactionsandmaybemovebackwards = null; //this is needed even if insertion behavior is reverted, since otherwise deleting something from actions that you've already acted will make you skip some other action

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
  insertbeforecurrentaction = (symbol) => {
	  L.actions.splice(i + 1, 0, symbol);
	  i += 1
  }
  removefromactionsandmaybemovebackwards = (symbol) => {
	  if( L.actions.findIndex(x => x === symbol) <= i){
		  i -= 1;
	  }
	  L.actions = L.actions.filter(x => x !== symbol)
  }
  while (i < L.actions.length) {
    // await L.actions[i].actfunc()
    await activate_at(L.actions[i].coords)
    // await sleep(100) // TODO: this should be in the things actfuncs, not here
    i += 1

  }
  insertbeforecurrentaction = null; // want to be warned if this is called when it shouldn't be
  removefromactionsandmaybemovebackwards = null; // as above


  doing_stuff = false
  //actions = actions.concat(pendingactions)
  //pendingactions = []
  console.log("finished all actions")
}

function check_won(level) {
  let h = level.goal.length;
  let w = level.goal[0].length;

  for (let x=0; x<N_TILES - w; x++) {
    for (let y=0; y<N_TILES - h; y++) {
      // check if the rect at x,y has won the level
      let skip = false
      for (let i=0; i<w; i++) {
        if (skip) continue
        for (let j=0; j<h; j++) {
          if (skip) continue

          let real_tile = level.grid[new Coords(i+x,j+y).str()]?.constructor
          let goal_tile_n = level.goal[j][i]
          if (goal_tile_n === -1) {
            if (real_tile !== undefined) skip = true
          } else {
            let goal_tile = symbol_types[goal_tile_n]
            if (real_tile !== goal_tile) {
              skip = true
            }
          }
        }
      }
      if (!skip) {
        return true
      }
    }
  }
  return false
}

function grid2blob(grid) {
  return Object.entries(grid).map(([_coor, symbol]) => {
    return [symbol.coords.x, symbol.coords.y, symbol.constructor]
  })
}

function blob2grid(blob) {
  let grid = {}
  blob.forEach(([x, y, f]) => {
    let coords = new Coords(x, y)
    grid[coords.str()] = new f(coords)
  });
  return grid
}

function actions2blob(actions) {
  return actions.map(action => {
    return [action.coords.x, actions.coords.y]
  })
}

function blob2actions(blob, grid) {
  return blob.map(([x, y]) => {
    return grid[new Coords(x, y).str()]
  })
}

function undo() {
  L.grid = blob2grid(L.grid_undos.pop())
  L.actions = blob2actions(L.actions_undos.pop(), L.grid)
  L.symbols_used = L.symbols_used_undos.pop()
}


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
