var express = require('express');
var router = express.Router();
const Go_Game = require('./game');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/about',(req,res,next)=>{
  res.send('<h1> hello my namme ist koki</h1>'
  )
})
const activeGame = new Go_Game(19)


router.post('/playMove', function(req, res, next) {

  const {
    row,
    col,
    gameid,
  } = req.body;
  activeGame.onPlay(row, col);
  // fire an api call to django
  // fireUpdateGameCall();

  fetch('/sri/UpdateGame', {
    method: 'post', 
    body: JSON.stringify({
      row : row,
      col : col,
      gameid : gameid 
    }),
    headers: {
      'content-type': 'application/json',
    }
  }).then(resp => {
    if (resp.ok) {
      resp.json().then(jsonData => {
        newBoardState: activeGame.getState(),
        blackcaptures: activeGame.capturedbyblack,
        whitecaptures:activeGame.capturedbywhite,
      });
    }
  

  res.send({
    newBoardState: activeGame.getState(),
    blackcaptures: activeGame.capturedbyblack,
    whitecaptures:activeGame.capturedbywhite});
});
});
router.post('/scoreMove', function(req, res, next) {

  const {
    row,
    col
  } = req.body;
  activeGame.onScore(row, col);
  res.send({newBoardState: activeGame.getState(),
  blackpoints: activeGame.blackpoints,
whitepoints:activeGame.whitepoints});
  
});


router.post('/newGame', function(req, res, next) {
  activeGame.newGame();
  res.send({newBoardState: activeGame.getState()});
  
});

router.post('/pass', function(req, res, next) {


  activeGame.pass();
  res.send({newBoardState: activeGame.getState()});
  
});
router.get('/getBoardState', function(req, res, next) {
  res.send({newBoardState: activeGame.getState()});
});

module.exports = router;
