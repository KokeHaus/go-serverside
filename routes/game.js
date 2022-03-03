const debug = require('debug');
const debugLogPlay = debug('game-play');
const debugLogScore = debug('game-score');
var GRID_SIZE = 19;
const intersection_size=20;

const board_values = {
  EMPTY:0,
  BLACK:1,
  WHITE:2,
  BLACKSCORE:3,
  WHITESCORE:4,
  NEUTRAL:5,
  WHITEINBLACK:6,
  BLACKINWHITE:7,
}

// Incorporate boardstate properties into django db
//add users into db


function addCount(count,key){
    if (!count[key[0]]) {
      count[key[0]] = {};
   }
   count[key[0]][key[1]] = true
   return count;
  }
  
  function addCountUp(count) {
       const columns = Object.keys(count);
       let totalSpaces = 0;
       columns.forEach(columnIdx => {
           const rowValues = count[columnIdx];
           totalSpaces += Object.keys(rowValues).length
       });
        return totalSpaces;
   }
  function equals (boardState, otherBoardState){
    if(!boardState || !otherBoardState ) {
      // console.log('skipping equals cause one board is null');
      return false;
    }
    let isMatch = true;
    boardState.forEach((row, rowIdx) => {
      row.forEach((columnValue, columnIdx) => {
        const otherBoardValue = otherBoardState[rowIdx][columnIdx];
        if (columnValue !== otherBoardValue) {
          isMatch = false;
        }
      });
    })
    return isMatch;
  }

class Go_Game {
  
    constructor(size){
      this.state={
        current_color:board_values.BLACK,
        size:size,
        last_move_pass:false,
        in_atari:false,
        attempted_suicide:false,
        is_ko:false,
        boardstate:this.create_board(size),
        lastState: null,
        scoringMode: false,
      }
      this.onPlay = this.onPlay.bind(this);
      this.onScore = this.onScore.bind(this);
      this.pass = this.pass.bind(this);
      this.switchPlayer = this.switchPlayer.bind(this);
      this.end_game = this.end_game.bind(this);
      this.newGame = this.newGame.bind(this);
      this.create_board = this.create_board.bind(this);
      this.capturedbyblack=0;
      this.capturedbywhite=0;
      this.blackpoints=0;
      this.whitepoints=0;
    }

  
    copyState(boardstate) {
      const copyBoard = this.create_board(this.state.size);
      boardstate.forEach((row, rowIdx) => {
        row.forEach((columnValue, columnIdx) => {
          copyBoard[rowIdx][columnIdx] = columnValue
        })
      });
      return copyBoard
    }
    create_board(size)
    {
      var m = [];
      for (let i = 0; i < size; i++) {
          m[i] = [];
          for (let j = 0; j < size; j++)
              m[i][j] = board_values.EMPTY;
      }
      return m;
    }
    switchScorer() {
      var  newCurrentColor;
          if(this.state.current_color === board_values.BLACKSCORE)
            newCurrentColor = board_values.WHITESCORE 
          else if(this.state.current_color === board_values.WHITESCORE)
            newCurrentColor = board_values.NEUTRAL
          else if(this.state.current_color === board_values.NEUTRAL)
            newCurrentColor = board_values.BLACKSCORE
  
       return newCurrentColor;
     }
    onScore(row, col) {
  
      this.countPoints();
      var group = this.getGroup(row,col)
      if(this.state.boardstate[row][col]=== board_values.WHITE || this.state.boardstate[row][col] === board_values.BLACK)
      {
          if(this.state.boardstate[row][col]=== board_values.WHITE)
          {
            group.forEach(key => {
              this.state.boardstate[key[0]][key[1]] = board_values.WHITEINBLACK
            })
          }
          else{
            group.forEach(key => {
              this.state.boardstate[key[0]][key[1]] = board_values.BLACKINWHITE
            })
          }
      }
      else if(this.state.boardstate[row][col] === board_values.WHITEINBLACK || this.state.boardstate[row][col] === board_values.BLACKINWHITE){
        if(this.state.boardstate[row][col] === board_values.WHITEINBLACK){
          group.forEach(key => {
            this.state.boardstate[key[0]][key[1]] = board_values.WHITE
        })
      }
        if(this.state.boardstate[row][col] === board_values.BLACKINWHITE){
          group.forEach(key => {
            this.state.boardstate[key[0]][key[1]] = board_values.BLACK
        })
      }
    }
      else{
      group.forEach(key => {
        this.state.boardstate[key[0]][key[1]]= this.state.current_color;
      })
    }
      const newCurrentColor = this.switchScorer();
      this.state={
        ...this.state,
        current_color: newCurrentColor,
      }
  
      this.countPoints();
    }
  
    onPlay(row,col)
    {
      debugLogPlay('A play was made!');
      const previousState = this.copyState(this.state.boardstate);
       var color = this.state.boardstate[row][col] = this.state.current_color;
       var captured = [];
       var neighbours = this.getNeighbours(row,col);
       var atari = false;
      neighbours.forEach(key => {
        var state = this.state.boardstate[key[0]][key[1]];
        if(state !== board_values.EMPTY && state !==color ){
          var group = this.getLiberties(key[0],key[1]);
          if(group["liberties"]===0)
            captured.push(group);
          else if (group["liberties"]===1)
            atari=true;
        }
      });
      
  
      //detect attempted_suicide
      if((captured.length === 0 || captured === undefined) && this.getLiberties(row,col)["liberties"]===0){
        this.state.boardstate[row][col] = board_values.EMPTY;
        this.attempted_suicide=true;
        console.log("Attempted Suicide")
        //return false;
      }
  
      //detect ko
      if(equals(this.state.boardstate,this.state.lastState)){
        this.state.boardstate = previousState;
        console.log("Attempted Ko");
        this.is_ko=true;
        //return false;
      }
  
      
      // put some logic around rejecting the change if in ko
  
        if(this.attempted_suicide || this.is_ko){
          this.attempted_suicide=false;
          this.is_ko=false;  
          return false;
        }
        debugLogPlay('is this getting here')
      //capture
      // console.log(captured)
      captured.forEach(group => {
        group["stones"].forEach(stone => {
          this.state.boardstate[stone[0]][stone[1]] = board_values.EMPTY;
        });
        if(color===board_values.BLACK)
          this.capturedbyblack+= group["stones"].length;
        if(color === board_values.WHITE)
          this.capturedbywhite+=group["stones"].length;
      });    
       this.state.last_move_pass = false;
       const newBoardState = this.state.boardstate.reduce((acc, boardrow) => {
         const newRow = [...boardrow];
         acc.push(newRow);
         return acc;
       }, []);
       debugLogPlay('what about here')
       newBoardState[row][col] = this.state.current_color;
       const newCurrentColor = this.switchPlayer();
       debugLogPlay(newCurrentColor)
       this.state={
         ...this.state,
         boardstate: newBoardState,
         lastState: previousState,
         current_color: newCurrentColor,
       }
       debugLogPlay('certainly here')
      return true;
    }
    switchPlayer() {
      const  newCurrentColor =
          this.state.current_color === board_values.BLACK ? board_values.WHITE : board_values.BLACK;
       return newCurrentColor;
     }
     pass() {
       const newLastMovePass = this.state.last_move_pass;
       const newCurrentColor = this.switchPlayer();
       this.state = {
         ...this.state,
         current_color: newCurrentColor,
         last_move_pass: newLastMovePass,
       }
  
       this.state.last_move_pass = true;
       
      if (newLastMovePass===true)
        return this.end_game();
  
        return {
          newCurrentColor,
          newLastMovePass,
        }
  }
  
      end_game(){
        console.log('game is over')
        this.state.current_color = board_values.BLACKSCORE;
        this.state.scoringMode = true;
      }
  
      newGame(){
        console.log('New Game')
        for(let i=0;i<GRID_SIZE;i++){
          for(let j=0;j<GRID_SIZE;j++){
            this.state.boardstate[i][j]=board_values.EMPTY;
          }
        }
        this.state.current_color=board_values.BLACK;
        this.state.lastState=null;
        this.state.last_move_pass=false;
        this.state.scoringMode=false;
        this.capturedbywhite=0;this.capturedbyblack=0;
      }
  
      getNeighbours(i,j) {
        var neighbours = [];
        if(i>0)
          neighbours.push([i-1,j])
        if(i<GRID_SIZE-1)
            neighbours.push([i+1,j])
        if(j>0)
          neighbours.push([i,j-1])
        if(j<GRID_SIZE-1)
          neighbours.push([i,j+1])
  
        return neighbours;
      }
  
      getLiberties(i,j) {
        var color = this.state.boardstate[i][j];
        if( color === board_values.EMPTY )
          return null;
        var visited = {};
        var visited_list=[];
        var queue = [[i, j]];
        var count = {};
        while (queue.length > 0) {
            var stone = queue.pop();
            if (visited[stone])
                continue;
        var neighbours = this.getNeighbours(stone[0],stone[1]);
        neighbours.forEach(key => {
          var state = this.state.boardstate[key[0]][key[1]]
          if(state===board_values.EMPTY){
              count = addCount(count,key);
          }
          if(state===color)
            queue.push([key[0],key[1]])
        });
        visited[stone] = true;
        visited_list.push(stone);
      }
  
        return{
            "liberties": addCountUp(count),
            "stones" : visited_list,
        }
  }
      getGroup(i,j){
        var color = this.state.boardstate[i][j];
        var visited = {};
        var visited_list =[];
        var queue = [[i,j]];
        while (queue.length > 0){
          var stone = queue.pop();
          if(visited[stone])
            continue;
        var neighbours = this.getNeighbours(stone[0],stone[1]);
        neighbours.forEach(key => {
          var state = this.state.boardstate[key[0]][key[1]]
          if(state === color)
            queue.push([key[0],key[1]])
          });
          visited[stone]=true;
          visited_list.push(stone);
        }
        return visited_list;
      }
  
      countPoints(){
        var state = this.state.boardstate;
        this.blackpoints =0;
        this.whitepoints =0;
        for(let i=0;i<state.length;i++){
          for(let j=0;j<state[i].length;j++){
            if(state[i][j]=== board_values.BLACKSCORE)
              this.blackpoints++;
            if(state[i][j] === board_values.WHITESCORE)
              this.whitepoints++;
            if(state[i][j] === board_values.BLACKINWHITE)
              this.whitepoints += 2;
            if(state[i][j] === board_values.WHITEINBLACK)
              this.blackpoints +=2;
          }
        }
      }
  
    getState() {
        return this.state;
    }
  }

module.exports = Go_Game;
