var express     = require('express');
var app         = express();
var net         = require('net');
var JsonSocket  = require('json-socket');
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var password = require('password-hash-and-salt');
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file
var User   = require('./models/user'); // get our mongoose model
var OTP1    = require('./models/otp');
var PythonShell = require('python-shell');
// =======================
// configuration =========
// =======================
var port = process.env.PORT || 8080; // used to create, sign, and verify tokens
mongoose.connect(config.database); // connect to database
app.set('superSecret', config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// =======================
// routes ================
// =======================
// basic route


/*app.get('/', function(req, res) {
  //for(var i=0;i<1000000000;i++);
  var port1 = 9838;
  var host = 'localhost';
  var socket = new JsonSocket(new net.Socket());
  socket.connect(port1,host);
  socket.on('connect',function(){
    socket.sendMessage({a:'hi'});
    socket.on('message',function(message){
      res.send(message['b']+' serverA');
    })
  })
    
});*/


function validateUserName(uName){
  return true;
}

function validatePwd(pwd){
  return true;
}

//for registration..... the post request for it.
var setupRoute = express.Router();

setupRoute.use(function(req,res,next){
  if(!validateUserName(req.body.name)){
    res.json({success: false,message: 'Setup Failed. Enter Valid Username'});
  }
  else if(!validatePwd(req.body.password)){
    res.json({succes:false,message: 'Setup Failed. Enter a password'});
  }
  else
  {
    next();
  }
});

setupRoute.post('/signup', function(req, res) {
            if(validateUserName(req.body.name)){

              //if(validatePwd(req.body.password)){
              //  password(req.body.password).hash(function(error,hash){
                //console.log(req.body.password);
               /* if(error)
                  throw new Error("Something went wrong");*/
               /* else
                {*/
                //  myuser = hash;

                  var nick = new User({ 
                  name: req.body.name, 
                //  password: myuser,
                  admin: true 
                });
                  var options = {
                        args: [req.body.name]
                      };
                       
                      PythonShell.run('./something.py',options, function (err, results) {
                        if (err) throw err;
                        // results is an array consisting of messages collected during execution 

                        OTP1.findOne({name:req.body.name},function(err,otp3){
                              if(!otp3){
                                console.log('results: %j', results);
                                var otp1 = new OTP1({
                                  name: req.body.name,
                                  otp: results,
                                  time:Date.now()
                                });
                               console.log(otp1.otp);
                                otp1.save(function(err){
                                  if(err) throw err;
                                  console.log("otp saved");
                                });
                              }
                              else{
                                console.log('results: %j', results);
                                otp3['otp']=results;
                                otp3['time']=Date.now();
                                console.log(otp3.otp);
                                otp3.save(function(err){
                                  if(err) throw err;
                                  console.log("otp saved");
                                });
                              }
                        })
                        
                        
                      });
               // console.log('User ')
                // save the sample user
                nick.save(function(err) {
                  if (err) throw err;

                  console.log('User saved successfully');
                  res.json({ success: true });
                  });

                  //console.log("here"+myuser);
                  //}
               // });
              //console.log(myuser);
                // create a sample user

              /*}
              else{
                res.json({ password:"False"});
              }*/
            }
            else{
              res.json({username:"False"});
            }

 
});


app.use('/',setupRoute);
// API ROUTES -------------------
// we'll get to these in a second
var apiRoutes = express.Router(); 

// TODO: route to authenticate a user (POST http://localhost:8080/api/authenticate)

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res) { //console.log(req,res);

  // find the user
   User.findOne({
                name: req.body.name
                }, function(err, user) {

                    if (err) throw err;

                    if (!user) {
                        res.json({ success: false, message: 'Authentication failed. User not found.' });
                    } else if (user) {

                      // check if OTP matches
                      OTP1.findOne({name:req.body.name},function(err,otp2){
                        var x = new Date();
                        if(err) throw err;
                        
                        if(!otp2){
                          res.json({success:false,message:"You are not Authenticated"});
                        }
                        else if(x - otp2.time > 300000)
                        {
                          res.json({success:false,message:'OTP Expired', date:typeof Date.now(), exp:typeof otp2.time,res:x-otp2.time});
                        }

                        else if(req.body.otp == otp2.otp)
                        {
                          var token = jwt.sign(user, app.get('superSecret'), {
                                          expiresInMinutes: 1440 // expires in 24 hours
                                        });

                                      // return the information including token as JSON
                                      res.json({
                                        success: true,
                                        message: 'Enjoy your token!',
                                        user: req.body.name,
                                        token: token
                                      });
                        }

                        else{
                          res.json({success:false, message:"otp not matching", a:req.body.otp, b:otp2.otp});
                        }

                      });
                        
       
                  } 

          });
});
// TODO: route middleware to verify a token
apiRoutes.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;    
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });
    
  }   
});

//route to send OTP



// route to return all users (GET http://localhost:8080/users)
apiRoutes.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});   

// apply the routes to our application with the prefix /api
app.use('/', apiRoutes);


// =======================
// start the server ======
// =======================
app.listen(port);
console.log('Magic happens at http://localhost:' + port);