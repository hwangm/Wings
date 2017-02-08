var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var dotenv = require('dotenv').config();
var restclient = require('restler');
var fxml_schedule_url = "http://flightxml.flightaware.com/json/FlightXML2/AirlineFlightSchedules";
var fxml_airport_url = "http://flightxml.flightaware.com/json/FlightXML2/AirportInfo";

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

//init moment for time support in jade
app.locals.moment = require('moment');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

//flightxml api request handler to hide the api key
app.get('/api/flightxml', function(req, res){
    restclient.get(fxml_schedule_url, {
        username: "hwangm",
        password: process.env.FLIGHTXML_API_KEY,
        query: {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            airline: req.query.airline,
            flightno: req.query.flightno,
            howMany: req.query.howMany,
            offset: req.query.offset
        }
    }).on('success', function(result, response){
        res.json(result);
    }).on('error', function(result, response){
        res.json(result);
    });
});

app.get('/api/fxmlairport', function(req, res){
    restclient.get(fxml_airport_url, {
        username: "hwangm",
        password: process.env.FLIGHTXML_API_KEY,
        query: {
          airportCode: req.query.airportCode  
        }
    }).on('success', function(result, response){
        res.json(result);
    }).on('error', function(result, response){
        res.json(result);
    });
});

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});



module.exports = app;
