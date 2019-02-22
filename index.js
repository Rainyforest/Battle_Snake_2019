
const bodyParser = require('body-parser')
const express = require('express')
const logger = require('morgan')
const app = express()
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require('./handlers.js')

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 9001))

app.enable('verbose errors')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(poweredByHandler)

// --- SNAKE LOGIC GOES BELOW THIS LINE ---

// Handle POST request to '/start'
app.post('/start', (request, response) => {
  // NOTE: Do something here to start the game
  // Response data
  const data = {
    color: '#000000',
  }
  return response.json(data)
})




/*********************************************
* If about to hit the wall, turn right.
*********************************************/

function nextGrid(move_dir,head){
  var next;
  switch (move_dir) {
    case 0:
      next = {
        x:head.x,
        y:head.y-1
      }
      break;
    case 1:
      next = {
        x:head.x+1,
        y:head.y
      }
      break;
    case 2:
      next = {
        x:head.x,
        y:head.y+1
      }
      break;
    case 3:
      next = {
        x:head.x-1,
        y:head.y
      }
      break;
    default:
  }
  return next;
}
function getDistance(a,b){
  return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
}

function rightGrid(move_dir,head){
  return nextGrid((move_dir+1)%4,head);
}


/*********************************************
* Determine if a node is out of the map (which is a wall).
*********************************************/
function isObstacle(a,mysnake,grid){
  var ifObstacle = (a.x<0||a.x>grid.length-1||a.y<0||a.y>grid.length-1)?true:false;  //if wall
  /* if snake */
  for (var i=0;i<mysnake.length;i++){
    if(mysnake[i].x==a.x&&mysnake[i].y==a.y)ifObstacle=true;
  }
  return ifObstacle;
}

function avoidObstacle(move_dir,head,mysnake,grid){
  if(isObstacle(nextGrid(move_dir,head),mysnake,grid)) {
    if (isObstacle(rightGrid(move_dir,head),mysnake,grid)){
      return (move_dir+3)%4;
    }else{
      return (move_dir+1)%4;
    }
  }else{
    return move_dir;
  }
}


/*********************************************
* Convert number 0 - 3 to direction [up, right, down, left] respectively
*********************************************/
function updateMoveDirection(move_dir){
  var move = {move:"up"};
  switch(move_dir) {
    case 0:
      move = {move:"up"};
      break;
    case 1:
      move = {move:"right"};
      break;
    case 2:
      move = {move:"down"};
      break;
    case 3:
      move = {move:"left"};
      break;
    default:
      move = {move:"up"};
  }
  return move;
}

/*********************************************
* From a food list find the nearest food from head.
*********************************************/
function findNearestFood(food_list,head){
  var the_food = head;
  var food_dist= Infinity;
  for(var i=0;i<food_list.length;i++){
    if(getDistance(food_list[i],head)<food_dist){
      the_food = food_list[i];
      food_dist = getDistance(food_list[i],head);
    }
  }
  return the_food;
}


/*********************************************
* Initial the map as two-demensional node array grid.
*********************************************/
function initGrid(map_width,map_height) {
  var grid=[];
  for(var x = 0 ; x < map_width; x++) {
    grid[x] = [];
  }
  for(var x = 0 ; x < map_width; x++) {
      for(var y = 0; y < map_height; y++) {
          grid[x][y]={
                      x:x,
                      y:y,
                      g:Infinity,
                      h:Infinity,
                      f:Infinity,
                      cost:1,
                      state:-1, //-1 unvisited, 0 closed, 1 open
                      parent:null
                    };
      }
  }
  return grid;
}


/*********************************************
* Get a direction from node a->b, range 0 - 3.
*********************************************/
function getDirection(a,b){
  if (getDistance(a,b)==1){
    if(a.x==b.x){
      return a.y>b.y?0:2;
    }
    if(a.y==b.y){
      return a.x>b.x?3:1;
    }
  }else {
    console.log("Error in finding direction.");
    return -1;
  }
}


/*********************************************
* Determine if two nodes represent the same position.
*********************************************/
function samePosition(a,b){
  return(a.x==b.x && a.y==b.y);
}


// function isWall(a,grid){
//   return (a.x < 0 || a.x > grid.length-1|| a.y < 0 || a.y > grid.length-1);
// }



function printNeighbors(neighbors){
  for(var i = 0; i<neighbors.length-1; i++ ){
    console.log("neighbor: "+ i + "\t{x: "+neighbors[i].x +"\ty: "+neighbors[i].y+"}");
  }
}

/*********************************************
* Main function to implement A* algorithm
*********************************************/
function search(start,end,mysnake,grid) {
  var openList = [];
  grid[start.x][start.y] = {
              x:start.x,
              y:start.y,
              g:0,
              h:getDistance(start,end),
              f:getDistance(start,end),
              cost:1,
              state:1, //-1 unvisited, 0 closed, 1 open
              parent:null
            };
  openList.push(grid[start.x][start.y]);
  //console.log("$$$$$$$$$$$$$$$");
  while(openList.length > 0) {
      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      var low_index = 0;
      for(var i=0; i<openList.length; i++) {
        if(openList[i].f <= openList[low_index].f) { low_index = i; }
      }
      var currentNode = openList[low_index];
      openList.splice(low_index, 1); // remove current node from openList.
      //End case -- result has been found, return the traced path.
      if(samePosition(currentNode,end)) {
          console.log("FINISHHHHHHHHH");
          var curr = currentNode;
          var path = [];
          while(curr.parent) {
              path.push(curr);
              curr = curr.parent;
          }
          return path.reverse();
      }
      console.log('*****************');
      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.state = 0;
      // Find all neighbors for the current node.
      var neighbors = getNeighbors(currentNode,grid);
      console.log("neighbors:");
      printNeighbors(neighbors);
      for(var i=0; i < neighbors.length; i++) {
          var neighbor = neighbors[i];

          if(neighbor.state==0||isObstacle(neighbor,mysnake,grid)) {//
              neighbor.state==0;
              // Not a valid node to process, skip to next neighbor.
              continue;
          }
          // The g score is the shortest distance from start to current node.
          // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
          var gScore = currentNode.g + neighbor.cost;
          var better_gScore = false;
          if(neighbor.state==-1) {
          // This the the first time we have arrived at this node, it must be the best
          // Also, we need to take the h (heuristic) score since we haven't done so yet
            neighbor.state = 1;
            better_gScore = true;
            neighbor.h = getDistance(neighbor,end);
            openList.push(neighbor);
          }
          else if(gScore < neighbor.g) {
            // We have already seen the node, but last time it had a worse g (distance from start)
            better_gScore = true;
          }
          if(better_gScore) {
            // Found an optimal (so far) path to this node.   Store info on how we got here and
            //  just how good it really is...
            neighbor.parent = currentNode;
            neighbor.g = gScore;
            neighbor.f = neighbor.g + neighbor.h;
          }
      }//end for
  }//end while
  // No result was found - empty array signifies failure to find path.
  return [];
}
function pathToVector(path,head){
  var vector_list = [];
  path.unshift(head);
  for(var i = 0; i<path.length-1; i++ ){
    vector_list.push(getDirection(path[i],path[i+1]));
  }
  return vector_list;
}
/*********************************************
* get four neighbors of a node. (could be simplified later.)
*********************************************/
function getNeighbors(node,grid) {
    var neighbor_list = [];
    var x = node.x;
    var y = node.y;
    // Left
    if(x>0){
      if(grid[x-1][y].state!=0 ) {
          neighbor_list.push(grid[x-1][y]);
      }
    }

    // Right
    if(x<grid.length-1){
      if(grid[x+1][y].state!=0 ) {
          neighbor_list.push(grid[x+1][y]);
      }
    }

    // Up
    if(y>0){
      if(grid[x][y-1].state!=0 ) {
          neighbor_list.push(grid[x][y-1]);
      }
    }

    // Down
    if(y<grid.length-1){
      if(grid[x][y+1].state!=0 ) {
          neighbor_list.push(grid[x][y+1]);
      }
    }

    return neighbor_list;
}
var move_dir = 0; //initialize move direction
// Handle POST request to '/move'
app.post('/move', (request, response) => {


  var mysnake = request.body.you.body;
  var head = mysnake[0];
  var map_width = request.body.board.width;
  var map_height = request.body.board.height;
  var food_list = request.body.board.food;
  var enemy_list = request.body.board.snakes;
  var turn_num = request.body.turn;

  // Response data
  console.log("head:");
  console.log(head);

  var the_food = findNearestFood(food_list,head);
  console.log("food:");
  console.log(the_food);

  var grid = initGrid(map_width,map_height);

  var path = search(head,the_food,mysnake,grid);
  var new_dir = move_dir;
  if(path.length>0){
    new_dir = getDirection(head,path[0]);
  }
    console.log("path:");
    console.log(pathToVector(path,head));
    console.log("=========================================")
  move_dir = avoidObstacle(new_dir,head,mysnake,grid);
  return response.json(updateMoveDirection(move_dir));
})

app.post('/end', (request, response) => {
  // NOTE: Any cleanup when a game is complete.

  //console.log("################################################################");
  return response.json({})
})

app.post('/ping', (request, response) => {
  // Used for checking if this snake is still alive.
  return response.json({});
})

// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler)
app.use(notFoundHandler)
app.use(genericErrorHandler)
app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'))
})
/*******************************************************
Reference:
  Astar algorithm in javascript: https://briangrinstead.com/blog/astar-search-algorithm-in-javascript/
*******************************************************/
