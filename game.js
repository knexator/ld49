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
    await sleep(100)
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
  sprite = images[1]
  /*constructor(coords, sprite) {
    //super(coords, () => { }, () => { }, () => { }, images[0]);
    super(coords, images[0]);
  }*/
}

class Bomb extends Symbol {
  sprite = images[2]
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
  sprite = images[3]
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
  sprite = images[4]

  async actfunc() {
    // more special cases, yay
    // if (checkforblocker(this)) return
    for (let k = 1; k < N_TILES; k++) {
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
  sprite = images[5]
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
    let pending_kill = null
    console.log("hoasdf")
    extra_draw_code.push(() => {
      console.log("asdfklñjasdflñ")
	  /*
      ctx.fillStyle = "red"
      ctx.fillRect(
        X_GRID + TILE * this.coords.x - TILE * 1.1,
        Y_GRID + TILE * this.coords.y - TILE * 1.1,
        TILE * 3.2, TILE * 3.2)
		*/
		for (const offset of threebythreeoffsets){
			drawactedtile(this.coords.add(offset));
		}
    })
    for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      let piece = rotatingPieces[(k + 1) % 8]
      if (piece !== undefined) {
        if (inBounds(offset_coor)) {
          piece.coords = offset_coor;
          L.grid[offset_coor.str()] = piece;
        } else {
          pending_kill = piece
          //piece.delfunc() // TODO: THIS DOESN'T AWAIT
          // _quietDelete(piece)
          // await
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
    if (pending_kill) {
      await kill_at
    }
    await sleep(200)
    extra_draw_code.pop()
  }
}

class RunAway extends Symbol {
  sprite = images[6]
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
      extra_draw_code.pop()
      pushactivatingtile(moveTo_coor)
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
    } else {
      await sleep(100)
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
  sprite = images[7]
  /*constructor(coords) {
    super(coords, () => { }, () => this.taxiCabStuff(), () => { }, images[6]);
  }*/
  async actfunc() {
    let dists = Object.entries(L.grid).map(([_coor, thingy]) => {
      if (thingy === this) return Infinity
      return taxiCabDist(thingy.coords, this.coords)
    })
    let min_dist = Math.min(...dists)

    let drawn = 0;
    for (var d = 1; d <= min_dist; d++) {
      drawn = 0;
      for (let c = 0; c < 4; c++) {
        for (let n = 0; n < d; n++) {
          let coor = this.coords.add(
            threebythreeoffsets[c*2+1].scalar(d)
          ).add(
            threebythreeoffsets[(c*2+4)%8].scalar(n)
          )
          if (inBounds(coor)) {
            extra_draw_code.push(() => drawactedtile(coor))
            drawn += 1
          }
        }
      }
      if (drawn === 0) break
      await sleep(100)
      if (d < min_dist) {
        for (let k=0; k<drawn; k++) {
          extra_draw_code.pop()
        }
      }
    }
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
      for (let k=0; k<drawn; k++) {
        extra_draw_code.pop()
      }
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
  sprite = images[8]

  async actfunc() {
    // a bit of a special case, don't directly use move_to since that would fall off the border
    let new_coors = this.coords.add(new Coords(0, 1))
    if (inBounds(new_coors) && !occupied(new_coors)) {
      await move_to(this.coords, new_coors)
      // await sleep(100)
    } else {
      extra_draw_code.push(() => {
        if (inBounds(this.coords)) { drawactedtile(this.coords) }
      })
      await sleep(50)
      extra_draw_code.pop()
    }
  }
}

class Blocker extends Symbol {
  sprite = images[9]
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

/*
// old behaviour
class Preserver extends Symbol {
  sprite = images[10]
	async actfunc() {
		for (const pair of L.recordedSymbols) {
			let offset_coor = this.coords.add(threebythreeoffsets[pair[0]])
			if (inBounds(offset_coor)) {
        await clone_tile_from_type(pair[1], offset_coor)
				await sleep(50)
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
*/

// "empty Preserver should behave like a bomb"
class Preserver extends Symbol {
  sprite = images[10]
	async actfunc() {
		for (var k = 0; k < 8; k++) {
			let offset_coor = this.coords.add(threebythreeoffsets[k])
			if (inBounds(offset_coor)) {
        await clone_tile_from_type(L.recordedSymbols[k], offset_coor)
				await sleep(50)
			}
		}
	}

	async placefunc() {
		L.recordedSymbols = [];
		for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      let asymbol = L.grid[offset_coor.str()]
			L.recordedSymbols.push(asymbol?.constructor); // possibly undefined
		}
	}
}

/*
// "add to the back of action queue, s9 not overwrite existing tiles that match the tile it wants to place"
class Preserver extends Symbol {
  sprite = images[10]
	async actfunc() {
		for (var k = 0; k < 8; k++) {
			let offset_coor = this.coords.add(threebythreeoffsets[k])
			if (inBounds(offset_coor)) {
        await clone_tile_from_type(L.recordedSymbols[k], offset_coor, true, true)
				await sleep(50)
			}
		}
	}

	async placefunc() {
		L.recordedSymbols = [];
		for (var k = 0; k < 8; k++) {
      let offset_coor = this.coords.add(threebythreeoffsets[k])
      let asymbol = L.grid[offset_coor.str()]
			L.recordedSymbols.push(asymbol?.constructor); // possibly undefined
		}
	}
}
*/

class OrthoCopier extends Symbol {
  sprite = images[11]
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
			await sleep(100)
		  }
      }
    }
  }
}

class Kamikaze extends Symbol {
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
        await sleep(50)
        // thingy.delfunc() // somehow it doesn't enter in an endless loop, lol
      }
    }
  }
}

class LeftSpreader extends Symbol {
	sprite = images[13]

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
  sprite = images[14]
  /*constructor(coords) {
    super(coords, () => { }, () => this.aboveBelow(), () => { }, images[13]);
  }*/
  async actfunc() {
    let obj_above_type = L.grid[this.coords.add(new Coords(0, -1)).str()]?.constructor // possibly undefined
    let obj_below_type = L.grid[this.coords.add(new Coords(0, 1)).str()]?.constructor // possibly undefined

    if (obj_above_type === undefined || obj_below_type === undefined) {
      await sleep(100)
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
  sprite = images[15]

  async delfunc() {
    // super.delfunc();
    for (var k = 0; k < 4; k++) {
      let offset_coor = this.coords.add(offsets[k])
      if (inBounds(offset_coor) && !occupied(offset_coor)) {
        await clone_tile(this.coords, offset_coor)
      }
    }
    _quietDelete(this)
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
  //Survivor, // 15
  /*Nooper,
  Nooper,*/
]

let level_goals = [
  [ //some tutorial-y levels that force you to have at least a little understanding of what all the symbols do - first one is particularly trivial
    [ 0,  1], //hopefully they place them in order 0-1-13-12, so they're suprised when 13 does something
    [13, 12],
  ],
  [
	[14,  8],
    [ 6,  5],
  ],
  [
	[ 2,  3],
    [ 4,  9],
  ],
  [
	[ 7, -1],
    [10, 11],
  ],
  [
    [-1, -1, -1],
    [-1,  8, -1],
    [-1,  2, -1],
    [-1, -1, -1],
  ],
  [
	[ 9,  9,  9,  9,  9],
    [ 9, -1, -1, -1,  9],
    [ 9, -1,  2, -1,  9],
    [ 9, -1, -1, -1,  9],
	[ 9,  9,  9,  9,  9],
  ],
  [
	[-1, -1, -1, -1, -1],  //WINCON CHECKING SEEMS TO SCREW UP ON THIS ONE
	[-1, 10, 10, 10, -1],
	[-1, -1, -1, -1, -1],
  ],
  [
	[-1, -1, -1, -1, -1],
    [-1, -1,  8, -1, -1],
    [-1,  3,  2, 13, -1],
    [-1, -1,  4, -1, -1],
	[-1, -1, -1, -1, -1],
  ],
  [
	[-1, -1, -1, -1],
    [-1,  1,  1, -1],
    [-1,  1,  1, -1],
    [-1, -1, -1, -1],
  ],
  [
	[-1, -1, -1, -1,  0],
    [-1, -1, -1,  0, -1],
    [-1, -1,  0, -1, -1],
    [-1,  0, -1, -1, -1],
	[ 0, -1, -1, -1, -1],
  ],
  [
	[-1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1],
    [-1, -1,  9, -1, -1],
    [-1, -1, -1, -1, -1],
	[-1, -1, -1, -1, -1],
  ],
  [
    [14, 14, 14], //no idea if this is possible with the center tile being empty instead of noop - feels like it'd be quite hard, if it is possible.
    [14,  1, 14],
    [14, 14, 14],
  ],
  [
	[ 0,  0,  0,  0,  0],
    [ 0, -1, -1, -1,  0],
    [ 0, -1,  0, -1,  0],
    [ 0, -1, -1, -1,  0],
	[ 0,  0,  0,  0,  0],
  ],
  [
	[-1, -1, -1, -1, -1],
    [-1,  7,  7,  7, -1],
    [-1,  7,  7,  7, -1],
    [-1,  7,  7,  7, -1],
	[-1, -1, -1, -1, -1],
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
    victory_rectangle: null,

    undo_head: 0, // position in the undo queue (usually last, except right after undos)
    grid_undos: [grid2blob({})],
    actions_undos: [actions2blob([])],
    symbols_used_undos: [Array(symbol_types.length).fill(false)],
  }
}

function reset() {
  sound_reset.play()
  L.grid = {}
  L.actions = []
  L.symbols_used = Array(symbol_types.length).fill(false)

  // undo: store how the world is after the action
  L.grid_undos.push(grid2blob(L.grid))
  L.actions_undos.push(actions2blob(L.actions))
  L.symbols_used_undos.push([...L.symbols_used])
  L.undo_head += 1
  L.victory_rectangle = check_won()
}



let levels = level_goals.map(preload_level)
let L = levels[0]

// let symbols_used = Array(symbol_types.length).fill(false)

let SKIP_ANIMS = false

let TILE = 75
let ACTION_TIME = 100
let N_TILES = 10

let X_GRID = 135 //these values should be able to be messed with and not cause problems
let Y_GRID = 12
let X_TABLEAU = 932
let Y_TABLEAU = 135
let TAB_COLS = 5
let TAB_ROWS = Math.ceil(symbol_types.length/TAB_COLS) // I think this line should stay as this
let X_GOAL = X_TABLEAU
let Y_GOAL = 515
let X_BUTTON_BAR = X_GRID
let Y_BUTTON_BAR = 807
let X_PASS = 1222
let Y_PASS = 374
let X_STAMP = 1110
let Y_STAMP = 750

let DEBUG_PUSH_OFF_BORDER = false
let DEBUG_MOVE_RESPECTFULLY = false
let DEBUG_WALK_OUTOFBONDS = false
let DEBUG_HIDE_NUMBERS = false
let DEBUG_ALLOW_KEYPLACEMENT = true
let DEBUG_ALLOW_PASS_WITH_SPACE = true

//let action_queue_pos = null

let held_tile = null;

let extra_draw_code = []

let prevLevel_img = new Image(); //this is an awkward way to do it, but I think it's okay
prevLevel_img.src = "prev75.png";
prevLevel_img.active = new Image();
prevLevel_img.active.src = 'active arrow.png';

let nextLevel_img = new Image();
nextLevel_img.src = "next75.png";
nextLevel_img.active = new Image();
nextLevel_img.active.src = 'active arrow right.png';

let reset_img = new Image();
reset_img.src = "reset75.png";
reset_img.active = new Image();
reset_img.active.src = 'reset active.png';

let undo_img = new Image();
undo_img.src = "undo75.png";
undo_img.active = new Image();
undo_img.active.src = 'undo active.png';

let redo_img = new Image();
redo_img.src = "redo75.png";
redo_img.active = new Image();
redo_img.active.src = 'active undo right.png';

let passTurn_img = new Image();
passTurn_img.src = "pass turn.png";
passTurn_img.active = new Image();
passTurn_img.active.src = 'pass turn pressed.png';

let activatingtile_image = new Image();
activatingtile_image.src = "activation_2.png";

let actedtile_image = new Image();
actedtile_image.src = "activation.png";

let activation_blocked_image = new Image();
activation_blocked_image.src = "activation_blocked.png";

let level_clear_stamp_image = new Image();
level_clear_stamp_image.src = "level_clear_stamp.png";

let sound_place = new Howl({
    src: ['sounds/place.wav']
});

let sound_undo = new Howl({
    src: ['sounds/undo.wav']
});

let sound_redo = new Howl({
    src: ['sounds/redo.wav']
});

let sound_reset = new Howl({
    src: ['sounds/reset.wav']
});

let changeLevel_sound = new Howl({
    src: ['sounds/idk.wav']
});

// idk if this a bit much
let activate_sound = new Howl({
    src: ['sounds/activate.wav'],
    volume: 0.5
});

let win_sound = new Howl({
    src: ['sounds/win.wav'],
});

let wind_sounds = [
  new Howl({
      src: ['ambience/Wind.m4a', 'ambience/Wind.ogg'],
  }),
  new Howl({
      src: ['ambience/Wind2.m4a', 'ambience/Wind2.ogg'],
  }),
  new Howl({
      src: ['ambience/Wind3.m4a', 'ambience/Wind3.ogg'],
  }),
]

function makeWindSound() {
  let sound = wind_sounds[Math.floor(Math.random() * wind_sounds.length)]
  sound.play()
  // wait between 3 & 8 seconds
  setTimeout(makeWindSound, Math.floor(Math.random()*5 + 3) * 1000);
}

makeWindSound()

winbgs = {}; //this should be a multidimensional array but I can't be bothered
for (let i = 1; i <= 5; i++){
	for (let j = 1; j <= 5; j++){
		winbgs[i.toString() + "," + j.toString()] = new Image();
		winbgs[i.toString() + "," + j.toString()].src = "winbgs/" + i.toString() + "x" + j.toString() + ".png";
	}
}

let buttons = [
  [X_BUTTON_BAR, Y_BUTTON_BAR, TILE*2, TILE, prevLevel, prevLevel_img],
  [X_BUTTON_BAR + TILE*2, Y_BUTTON_BAR, TILE*2, TILE, undo, undo_img],
  [X_BUTTON_BAR + TILE*4, Y_BUTTON_BAR, TILE*2, TILE, reset, reset_img],
  [X_BUTTON_BAR + TILE*6, Y_BUTTON_BAR, TILE*2, TILE, redo, redo_img],
  [X_BUTTON_BAR + TILE*8, Y_BUTTON_BAR, TILE*2, TILE, nextLevel, nextLevel_img],
  [X_PASS, Y_PASS, TILE*5, TILE*5, passTurn, passTurn_img],
]

function drawgrid() {
  //ctx.lineWidth = 3;
  // ctx.strokeStyle = "#1e1e1e"
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
    ctx.drawImage(value.sprite, X_GRID + TILE * value.coords.x, Y_GRID + TILE * value.coords.y, TILE, TILE);
  }
}

/*
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
*/

let TEXT_X = 6
let TEXT_Y = 3
let TEXT_SX = 26
let TEXT_SY = 22
function drawactionnumbers() {
	if (DEBUG_HIDE_NUMBERS) { return }

  ctx.textBaseline = "top"
  ctx.textAlign = "left"
	ctx.font = 'bold ' + Math.floor(TILE / 3).toString() + 'px Times New Roman'

	for (let i = 0; i < L.actions.length; i++) {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#D3B983"
    ctx.fillRect(
      X_GRID + TILE * L.actions[i].coords.x + TEXT_X * TILE / 75,
      Y_GRID + TILE * L.actions[i].coords.y + TEXT_Y * TILE / 75,
      TEXT_SX * TILE / 75, TEXT_SY * TILE / 75
    )
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#b52012" // c22b71 973B34 9D5637 CB6A36 7A622F 983C35 d12a1d b52012
		ctx.fillText(
      i.toString().padStart(2,'0'),
      X_GRID + TILE * L.actions[i].coords.x + TEXT_X * TILE / 75,
      Y_GRID + TILE * L.actions[i].coords.y + TEXT_Y * TILE / 75
    )
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
			ctx.drawImage(
			images[i], X_TABLEAU + (i % TAB_COLS)*TILE,
			Y_TABLEAU + Math.floor(i/TAB_COLS)*TILE, TILE, TILE)
		}
	}

}

function drawheldtile() {
	if( held_tile !== null) {
		ctx.drawImage(images[held_tile], Math.floor(mouse.x - TILE/2), Math.floor(mouse.y - TILE/2), TILE, TILE);
		// ctx.drawImage((new symbol_types[held_tile]()).sprite,mouse.x - TILE/2,mouse.y - TILE/2, TILE, TILE);
	}
}

function drawgoalarea() {
  let h = L.goal.length;
  let w = L.goal[0].length;

  //ctx.strokeRect(X_GOAL, Y_GOAL, TILE * 5, TILE * 5)

  let off_x = Math.floor(TILE * (5 - w) / 2) //if these aren't integers, it looks blurry
  let off_y = Math.floor(TILE * (5 - h) / 2)

  for (let i = 0; i < w; i++){
    for (let j = 0; j<h; j++) {
      if (L.goal[j][i] !== -1) {
        ctx.drawImage(images[L.goal[j][i]], off_x + X_GOAL + TILE * i, off_y + Y_GOAL + j * TILE, TILE, TILE);
      }
    }
	}


	//ctx.drawImage(winbgs[(new Coords(w,h)).str()],X_GOAL + off_x, Y_GOAL + off_y);


  ctx.beginPath()
  for (let i = 0; i <= w; i++) {
		ctx.moveTo(X_GOAL + TILE * i + off_x, Y_GOAL + off_y)
		ctx.lineTo(X_GOAL + TILE * i + off_x, Y_GOAL + h * TILE + off_y)
	}
	for (let i = 0; i <= h; i++) {
		ctx.moveTo(X_GOAL + off_x, Y_GOAL + TILE * i + off_y)
		ctx.lineTo(X_GOAL + w * TILE + off_x, Y_GOAL + TILE * i + off_y)
	}
	ctx.stroke()

  if (L.victory_rectangle) {
    let spr_w = level_clear_stamp_image.width * TILE / 75
    let spr_h = level_clear_stamp_image.height * TILE / 75
    ctx.drawImage(level_clear_stamp_image, X_STAMP, Y_STAMP, spr_w, spr_h)
  }
}

function draw_victory_area() {
  if (L.victory_rectangle) {
	 /*
    ctx.fillStyle = "green"
    let [x,y,w,h] = L.victory_rectangle
    ctx.fillRect(X_GRID + TILE * x, Y_GRID + TILE * y, TILE*w, TILE*h)
	*/
	let [x,y,w,h] = L.victory_rectangle
	let spr = winbgs[(new Coords(w,h)).str()]
	let spr_w = spr.width * TILE / 75
	let spr_h = spr.height * TILE / 75
	ctx.drawImage(spr, X_GRID + TILE * x, Y_GRID + TILE * y, spr_w, spr_h);
  }
}

function draw_button(button) {
  let [x,y,w,h,f,spr] = button
  let pressed = isButtonDown('left') && (mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + h)
  let spr_w = spr.width * TILE / 75
  let spr_h = spr.height * TILE / 75
  if (pressed) {
	/*
    ctx.fillStyle = "#5278A5"
    ctx.fillRect(x,y,w,h);
	*/
	ctx.drawImage(spr.active, Math.floor(x + (w - spr_w)/2), Math.floor(y + (h - spr_h)/2), spr_w, spr_h)
  }
  else{
  //ctx.drawImage(spr, x, y, w, h)
	ctx.drawImage(spr, Math.floor(x + (w - spr_w)/2),Math.floor(y + (h - spr_h)/2), spr_w, spr_h)
  //ctx.strokeRect(x,y,w,h);
  }
}

window.addEventListener("resize", _e => {
	console.log("resizing")
	if (innerWidth < 1500 || innerHeight < 900) {
		// player has a small screen

		if (innerWidth / innerHeight > 1500 / 900) {
			// use all avaliable height
			canvas.height = Math.floor(innerHeight)
			canvas.width = Math.floor(canvas.height * 1500 / 900)
		} else {
			// use all avaliable width
			canvas.width = Math.floor(innerWidth)
			canvas.height = Math.floor(canvas.width * 900 / 1500)
		}
	} else {
		canvas.width = 1500
		canvas.height = 900
	}

	/*
	TILE = Math.floor(canvas.width / 20)
	X_GRID = Math.floor(135 * TILE / 75)
	Y_GRID = Math.floor(12 * TILE / 75)
	X_TABLEAU = Math.floor(932 * TILE / 75)
	Y_TABLEAU = Math.floor(135 * TILE / 75)
	X_GOAL = X_TABLEAU
	Y_GOAL = Math.floor(515 * TILE / 75)
	X_BUTTON_BAR = X_GRID
	Y_BUTTON_BAR = Math.floor(807 * TILE / 75)*/

	TILE = (canvas.width / 20)
	X_GRID = (135 * TILE / 75)
	Y_GRID = (12 * TILE / 75)
	X_TABLEAU = (932 * TILE / 75)
	Y_TABLEAU = (135 * TILE / 75)
	X_GOAL = X_TABLEAU
	Y_GOAL = (515 * TILE / 75)
	X_BUTTON_BAR = X_GRID
	Y_BUTTON_BAR = (807 * TILE / 75)
  X_PASS = 1222 * TILE / 75
  Y_PASS = 374 * TILE / 75
  X_STAMP = 1110 * TILE / 75
  Y_STAMP = 750 * TILE / 75

	buttons = [
	  [X_BUTTON_BAR, Y_BUTTON_BAR, TILE*2, TILE, prevLevel, prevLevel_img],
	  [X_BUTTON_BAR + TILE*2, Y_BUTTON_BAR, TILE*2, TILE, undo, undo_img],
	  [X_BUTTON_BAR + TILE*4, Y_BUTTON_BAR, TILE*2, TILE, reset, reset_img],
	  [X_BUTTON_BAR + TILE*6, Y_BUTTON_BAR, TILE*2, TILE, redo, redo_img],
	  [X_BUTTON_BAR + TILE*8, Y_BUTTON_BAR, TILE*2, TILE, nextLevel, nextLevel_img],
    [X_PASS, Y_PASS, TILE*5, TILE*5, passTurn, passTurn_img],
	]

	/*
	let TILE = 75

	let X_GRID = 135 //these values should be able to be messed with and not cause problems
	let Y_GRID = 12
	let X_TABLEAU = 932
	let Y_TABLEAU = 135
	let TAB_COLS = 5
	let TAB_ROWS = Math.ceil(symbol_types.length/TAB_COLS) // I think this line should stay as this
	let X_GOAL = X_TABLEAU
	let Y_GOAL = 515
	let X_BUTTON_BAR = X_GRID
	let Y_BUTTON_BAR = 807
	*/
});

window.addEventListener("load", _e => {
  window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  SKIP_ANIMS = isButtonDown("left") // so hacky it hurts

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
  } else if (wasButtonReleased('left') && held_tile === null) {
    buttons.forEach(([x,y,w,h,f,spr]) => {
      if (mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + h) {
        f();
      }
    })
  }

  // warning: messes up undo
  /*if (wasKeyPressed(' ') && DEBUG_ALLOW_PASS_WITH_SPACE) doturn()

  if (wasKeyPressed('r')) reset_level(L)
  if (wasKeyPressed('z')) undo()

  if (wasKeyPressed('m')) {
    L = levels[L.n + 1] //DOESN'T RESPECT BOUNDARIES TODO
  }
  if (wasKeyPressed('n')) {
    L = levels[L.n - 1] //DOESN'T RESPECT BOUNDARIES
  }*/


 ctx.drawImage(ui_img, 0, 0, canvas.width, canvas.height);

  // if (extra_draw_code.length > 0) extra_draw_code[extra_draw_code.length - 1]()
  extra_draw_code.forEach(f => f());

  draw_victory_area();

  drawgridelements();

  //drawgrid();

  //drawactionqueue();

  drawactionnumbers();

  drawtableauelements();

  //drawtableau();

  drawgoalarea();

  drawheldtile();

  buttons.forEach(draw_button)

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

// Action highlights and such

function pushactivatingtile(coords) {
	/*
	extra_draw_code.push(() => {
		ctx.fillStyle = "red"
		ctx.fillRect(coords.x * TILE - TILE*.1 + X_GRID, coords.y * TILE - TILE*.1 + Y_GRID, TILE * 1.2, TILE  * 1.2)
	})
	*/
	extra_draw_code.push(() => {
		spr_w = activatingtile_image.width * TILE / 75
		spr_h = activatingtile_image.height * TILE / 75
		ctx.drawImage(
			activatingtile_image,
			Math.floor(X_GRID + coords.x * TILE + (TILE - spr_w)/2),
			Math.floor(Y_GRID + coords.y * TILE + (TILE - spr_h)/2),
			spr_w, spr_h
		)
	})
}


function drawactedtile(coords) {
	spr_w = activatingtile_image.width * TILE / 75
	spr_h = activatingtile_image.height * TILE / 75
	ctx.drawImage(
		actedtile_image,
		Math.floor(X_GRID + coords.x * TILE + (TILE - spr_w)/2),
		Math.floor(Y_GRID + coords.y * TILE + (TILE - spr_h)/2),
		spr_w,  spr_h
	)
}

// DESIGN DECISIONS
// if we use these helper functions consistently, we can quickly adjust the game's behaviour
// (it will also help with graphics)
// These should be understood as commands; they will return true if the action is succesful

async function kill_at(coords, explicit_kill=true) {
  if (explicit_kill) {
    extra_draw_code.push(() => {
      // ctx.fillStyle = "red"
      if (inBounds(coords)) { drawactedtile(coords) }
    })
  }


  let symbol = L.grid[coords.str()]
  if (symbol === undefined) {
    // this will be used for graphics
    await sleep(50)
    if (explicit_kill) extra_draw_code.pop()
    return true;
  } else {
    // kill triggers the del action
    await symbol.delfunc();
    await sleep(50)
    if (explicit_kill) extra_draw_code.pop()
    //_quietDelete(symbol); //delfuncs must do this themself (but may do it at any point in their execution)
    return true;
  }
}

async function move_to(from_coords, to_coords) {
  // console.log("called move_to")
  extra_draw_code.push(() => {
    // ctx.fillStyle = "red"
    if (inBounds(from_coords)) { drawactedtile(from_coords) }
    if (inBounds(to_coords)) { drawactedtile(to_coords) }
  })
  if (!inBounds(from_coords)) {
    extra_draw_code.pop()
    return true
  }
  let symbol = L.grid[from_coords.str()]
  let occupying_symbol = L.grid[to_coords.str()]
  /*if (symbol === undefined && occupying_symbol === undefined) {
    extra_draw_code.pop() // don't wait
    return true;
  }*/
  if (symbol === undefined) {
    // this will be used for graphics
    await sleep(50)
    extra_draw_code.pop()
    return true;
  }
  if (!inBounds(to_coords)) {
    // _quietDelete(symbol);
    await kill_at(from_coords)
    extra_draw_code.pop()
    return true

    // Another option:
    //return false

    // Another option:
    //symbol.delfunc() // tigger special effects when falling out of the border
    //return true
  }
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
  pushactivatingtile(coords)
  let symbol = L.grid[coords.str()]
  if (symbol === undefined) {
    // this will be used for graphics
    extra_draw_code.pop()
    return true;
  }
  if (checkforblocker(symbol)) {
    extra_draw_code.pop()
    extra_draw_code.push(() => {
  		spr_w = activation_blocked_image.width * TILE / 75
  		spr_h = activation_blocked_image.height * TILE / 75
  		ctx.drawImage(
  			activation_blocked_image,
  			Math.floor(X_GRID + coords.x * TILE + (TILE - spr_w)/2),
  			Math.floor(Y_GRID + coords.y * TILE + (TILE - spr_h)/2),
  			spr_w, spr_h
  		)
  	})
    await sleep(50);
    extra_draw_code.pop()
    return false
  } else {
    activate_sound.play()
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
  /*if (new_symbol.constructor.name === "Preserver") {
    new_symbol.recordedTypes = symbol.recordedTypes
  }*/
}

async function clone_tile_from_type(tile_type, to_coords, add_to_end=false, ignore_if_equal=false) {
  if (!inBounds(to_coords)) return true // nothing to be done

  if (ignore_if_equal) {
    let placed_symbol = L.grid[to_coords.str()]?.constructor
    if (tile_type === undefined && placed_symbol === undefined) return true
    if (tile_type === placed_symbol) return true
  }
  await kill_at(to_coords)
  // Another option:
  //_quietDelete(...) etc

  if (tile_type === undefined) {
    return true
  }

  let new_symbol = new tile_type(to_coords)
  L.grid[to_coords.str()] = new_symbol
  if (add_to_end) {
    L.actions.push(new_symbol);
  } else {
    insertbeforecurrentaction(new_symbol);
  }
  // extremely hacky, oops
  /*if (new_symbol.constructor.name === "Preserver") {
    new_symbol.recordedTypes = symbol.recordedTypes
  }*/
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

for (k = 1; k < 17; k++) { //setting this too high will cause errors that are supressed locally, but make the game not work when uploaded to itch
  let cur_img = new Image();
  cur_img.src = "icons/super" + k.toString() + ".png";
  images.push(cur_img)
}

let ui_img = new Image();
ui_img.src = "ui.png";

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
  /*L.symbols_used[held_tile] = false; // hacky thing for undo
  L.grid_undos.push(grid2blob(L.grid))
  L.actions_undos.push(actions2blob(L.actions))
  L.symbols_used_undos.push([...L.symbols_used])
  L.undo_head += 1
  L.symbols_used[held_tile] = true;*/ // hacky thing for undo
  let used_tile = held_tile
  // L.symbols_used[used_tile] = false; // hacky thing for undo

  sound_place.play()

  s = new symboltype(coords);
  L.grid[coords.str()] = s;
  await s.placefunc();
  L.actions.push(s);
  await doturn();

  L.grid_undos = L.grid_undos.slice(0, L.undo_head + 1)
  L.actions_undos = L.actions_undos.slice(0, L.undo_head + 1)
  L.symbols_used_undos = L.symbols_used_undos.slice(0, L.undo_head + 1)

  // L.symbols_used[used_tile] = true  // hacky thing for undo
  // undo: store how the world is after the action
  L.grid_undos.push(grid2blob(L.grid))
  L.actions_undos.push(actions2blob(L.actions))
  L.symbols_used_undos.push([...L.symbols_used])
  L.undo_head += 1

  // assertion: L.grid === L.grid_undos[L.undo_head]

  L.victory_rectangle = check_won()
}

var insertbeforecurrentaction = null; //this is probably a bad idea but it works

var removefromactionsandmaybemovebackwards = null; //this is needed even if insertion behavior is reverted, since otherwise deleting something from actions that you've already acted will make you skip some other action

let doing_stuff = false
async function doturn() {
  if (doing_stuff) {
    throw new Error("called do turn while another turn was in progress")
  }
  L.victory_rectangle = null
  /*actions.forEach(s => {
    s.actfunc()
  })*/
  /*action_queue_pos = 0
  do_cur_action()*/

  let i = 0;
  doing_stuff = true
  insertbeforecurrentaction = (symbol) => {
	  L.actions.splice(i, 0, symbol);
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
    // L.victory_rectangle = check_won()
    // await sleep(100) // TODO: this should be in the things actfuncs, not here
    i += 1

  }
  insertbeforecurrentaction = null; // want to be warned if this is called when it shouldn't be
  removefromactionsandmaybemovebackwards = null; // as above


  doing_stuff = false
  //actions = actions.concat(pendingactions)
  //pendingactions = []
  console.log("finished all actions")

  L.victory_rectangle = check_won()
}

function check_won() {
  let h = L.goal.length;
  let w = L.goal[0].length;

  for (let x=0; x<=N_TILES - w; x++) {
    for (let y=0; y<=N_TILES - h; y++) {
      // check if the rect at x,y has won the level
      let skip = false
      for (let i=0; i<w; i++) {
        if (skip) continue
        for (let j=0; j<h; j++) {
          if (skip) continue

          let real_tile = L.grid[new Coords(i+x,j+y).str()]?.constructor
          let goal_tile_n = L.goal[j][i]
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
        win_sound.play()
        return [x,y,w,h]
      }
    }
  }
  return null
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
    return [action.coords.x, action.coords.y]
  })
}

function blob2actions(blob, grid) {
  return blob.map(([x, y]) => {
    return grid[new Coords(x, y).str()]
  })
}

async function passTurn() {
  await doturn()

  L.grid_undos = L.grid_undos.slice(0, L.undo_head + 1)
  L.actions_undos = L.actions_undos.slice(0, L.undo_head + 1)
  L.symbols_used_undos = L.symbols_used_undos.slice(0, L.undo_head + 1)

  // L.symbols_used[used_tile] = true  // hacky thing for undo
  // undo: store how the world is after the action
  L.grid_undos.push(grid2blob(L.grid))
  L.actions_undos.push(actions2blob(L.actions))
  L.symbols_used_undos.push([...L.symbols_used])
  L.undo_head += 1

  // assertion: L.grid === L.grid_undos[L.undo_head]

  L.victory_rectangle = check_won()
}

function undo() {
  if (L.undo_head === 0) return
  sound_undo.play()
  /*
  L.grid = blob2grid(L.grid_undos.pop())
  L.actions = blob2actions(L.actions_undos.pop(), L.grid)
  L.symbols_used = L.symbols_used_undos.pop()
  L.victory_rectangle = check_won(L)
  */
  L.undo_head -= 1
  L.grid = blob2grid(L.grid_undos[L.undo_head])
  L.actions = blob2actions(L.actions_undos[L.undo_head], L.grid)
  L.symbols_used = [...L.symbols_used_undos[L.undo_head]]
  L.victory_rectangle = check_won(L)
}

function redo() {
  if (L.undo_head + 1 < L.grid_undos.length) {
    sound_redo.play()
    L.undo_head += 1
    L.grid = blob2grid(L.grid_undos[L.undo_head])
    L.actions = blob2actions(L.actions_undos[L.undo_head], L.grid)
    L.symbols_used = [...L.symbols_used_undos[L.undo_head]]
    L.victory_rectangle = check_won(L)
  }
}

function prevLevel() {
  if (L.n > 0) {
    changeLevel_sound.play()
    L = levels[L.n - 1]
  }
}

function nextLevel() {
  if (L.n + 1 < levels.length) {
    changeLevel_sound.play()
    L = levels[L.n + 1]
  }
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

DEBUG_TIME_MULTI = 1 // useful for slow mo analysis
function sleep(ms) {
  if (SKIP_ANIMS) {
    return new Promise(resolve => setTimeout(resolve, 10));
  } else {
    return new Promise(resolve => setTimeout(resolve, DEBUG_TIME_MULTI * ms));
  }
}
