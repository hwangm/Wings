function initMap() {
  //not using var tag indicates these variables are available globally, not just in the scope of initMap
  autocomplete = new google.maps.places.Autocomplete(document.getElementById('location'));
  directionsService = new google.maps.DirectionsService;
}

// s is format yyyy-mm-dd
// Returns the Unix time for a given date. Specify "s" to get start date (at midnight by default), or 'e' for end date at 2359.
function parseDate(s, startOrEnd) {
  var b = s.split('-');
  var cDate = new Date(); //get today's date to compare against start date
  if (startOrEnd == 's') { //get Start Date.
    var d = new Date(b[0], --b[1], b[2], 0, 0, 0);
    console.log(d);
    if (cDate.toDateString() == d.toDateString()) { //If date is today, then use current timestamp. Otherwise, default to midnight.
      return Math.floor(cDate.valueOf() / 1000);
    }
    else {
      return d.valueOf() / 1000;
    }
  }
  else {                  //get End Date at 23:59:59 hours
    var d = new Date(b[0], --b[1], b[2], 23, 59, 59);
    return d.valueOf() / 1000;
  }
}

//input example is 'DL2011'
//Returns either the letters alone or numbers alone depending on w parameter
function parseFlight(s, w) {
  if (w == 1) {
    return s.split(/[a-zA-Z]+/g)[1];
  }
  else {
    return s.split(/[0-9]+/g)[0];
  }
}

//given an epoch time, this function returns the local time in a human readable format
function epochToLocalTime(t) {
  var d = new Date(t * 1000);
  var options = { timeZoneName: "short" }
  return d.toLocaleString('en-US', options);
}

//show the loading icon when calculating results
function showLoadingIcon() {
  $('#loadingRow').removeClass('hidden');
  $('#loadingRow').show(200);
}

//given the number of bags to check, this function returns a string telling the user how much extra time to account for when checking bags
function calculateBagTime(num) {
  switch (num) {
    case 0:
      return 'You have no bags!';
      break;
    case 1:
      return 'Checking in your one bag will take about 20 minutes';
      break;
    case '2+':
      return 'Checking in your multiple bags will take about 25 minutes';
      break;
    default:
      return 'You have no bags!';
  }
}

//this function clears the modal popup and time results of previous flight results if user searches more than one time in a session
function resetPage() {
  $('#insertFlightChoicesHere').empty();
  $('#timeToAirport').empty();
  $('#timeToLeave').empty();
  $('#flightInformation').empty();
  $('#flightInformationDetails').empty();
  $('#timeToAirportDetails').empty();
  $('#arriveAtGate').empty();
  $('#arriveAtGateDetails').empty();
  $('#timeToAirportWrapper').hide();
  $('#arriveAtGateWrapper').hide();
  $('#flightInformationWrapper').hide();
  $('#errorWrapper').empty();
}

//given the AirlineFlightSchedulesResult from flightXML, this function determines if all the returned flights are codeshares for the same flight
function areFlightsAllSameCodeShares(data, length) {
  var result = true;
  console.log(data);
  // console.log(actualIdentifierArray);
  // console.log(identifierArray);
  if(length > 1){
    for (var j = 1; j < length; j++) {
      console.log(data[j].ident + ' departure time at ' + data[j].departuretime);
      if (data[j].departuretime  != data[0].departuretime) {
        //console.log(actualIdentifierArray[j] + "compared to " + actualIdentifierArray[0] + " is not equal")
        result = false;
      }
    }
  }
``
  //console.log(result);
  return result;

}

function inputFieldsAreNotEmpty(){
  return ($('#location').val() != "") && ($('#flight').val() != "") && ($('#departureDate').val() != "");
}

function calculateTime() {
  if(!inputFieldsAreNotEmpty()){
    return;
  }
  resetPage();
  showLoadingIcon();

  //Step 2 retrieve all variables required to get data
  sDate = parseDate(picker.toString('YYYY-MM-DD'), 's'); //start date
  eDate = parseDate(picker.toString('YYYY-MM-DD'), 'e'); //end date
  //console.log(sDate + ' ' + eDate);
  address = $('#location').val(); //start address
  flight = $('#flight').val(); //flight number
  if (flight == "") {
    flight = "UAL1892";
  }
  airlineCode = parseFlight(flight, 0); //break up flight number into airline code and number individually
  switch (airlineCode.toUpperCase()) { //converting common US IATA codes to ICAO
    case "WN":
      airlineCode = "SWA";
      break;
    case "SW":
      airlineCode = "SWA";
      break;
    case "DL":
      airlineCode = "DAL";
      break;
    case "AA":
      airlineCode = "AAL";
      break;
    case "UA":
      airlineCode = "UAL";
      break;
    case "AC":
      airlineCode = "ACA";
      break;
    case "B6":
      airlineCode = "JBU";
      break;
    case "WS":
      airlineCode = "WJA";
      break;
    case "AM":
      airlineCode = "AMX";
      break;
    case "NK":
      airlineCode = "NKS";
      break;
    case "F9":
      airlineCode = "FFT";
      break;
    case "HA":
      airlineCode = "HAL";
      break;
    case "Y4":
      airlineCode = "VOI";
      break;
    default:
      airlineCode = airlineCode.toUpperCase();
  }
  flightNum = parseFlight(flight, 1);
  //console.log(airlineCode + ' ' + flightNum);
  modeTravel = $('#modeTravel').val();
  bags = $('#bags').val();
  TSAPre = $('#hasTSAPre').val();

  console.log(address + " " + flight + " " + modeTravel + " " + bags + " " + TSAPre);

  $.ajax({
    type: 'GET',
    url: '/api/flightxml',
    data: { 'startDate': sDate, 'endDate': eDate, 'airline': airlineCode, 'flightno': flightNum, 'howMany': 5, 'offset': 0 },
    success: function (result) {
      console.log(result);
      //information stored in the result
      //departure time (in UTC epoch time/seconds) - need to convert to local timestamp
      //origin airport code
      var resultLength = result.AirlineFlightSchedulesResult.data.length;
      //var allCodeShares = areFlightsAllSameCodeShares(result.AirlineFlightSchedulesResult.data, resultLength);

      if (resultLength == 0) {
        $('#loadingRow').hide(200, function () {
          $('#errorWrapper').text('No flights found with the flight number and date. Please try again.');
        });
      }
      else {
        //Get data for a popup to ask user which flight is correct
        //For each flight:
        //- departure time (in local time based on user location)
        //- departure airport (and maybe arrival airport)

        if ((resultLength > 1) && !areFlightsAllSameCodeShares(result.AirlineFlightSchedulesResult.data, resultLength)) {
          for (var i = 0; i < resultLength; i++) {
            var element = result.AirlineFlightSchedulesResult.data[i];
            //- departureTimeArray.push(epochToLocalTime(element.departuretime));
            //- departureAirportArray.push(element.origin);
            //- identifierArray.push(element.ident); //actual_ident is only populated if ident is different (for codeshares)
            //- actualIdentifierArray.push(element.actual_ident);
            if (element.actual_ident == "") { //filter repeat flights from codeshares
              var row = "<tr class='clickable-row' id='" + i + "' data-origin='" + element.origin + "' data-departuretime=" + element.departuretime + "><td>" + element.ident + "</td><td>" + element.origin + " to " + element.destination + "</td><td>" + epochToLocalTime(element.departuretime) + "</td></tr>";
              $('#insertFlightChoicesHere').prepend(row);
            }
            // else {
            //   var row = "<tr class='clickable-row' id='" + i + "' data-origin='" + element.origin + "' data-departuretime=" + element.departuretime + "><td>" + element.ident + " (codeshare with " + element.actual_ident + ")</td><td>" + element.origin + " to " + element.destination + "</td><td>" + epochToLocalTime(element.departuretime) + "</td></tr>";
            //   $('#insertFlightChoicesHere').prepend(row);
            // }

          }
          $('#loadingRow').hide(200, function () {

            $('#chooseFlightModal').modal();
            $('.clickable-row').click(function () {
              departuretime = $(this).data('departuretime');
              origin = $(this).data('origin');
              $('#chooseFlightModal').modal('hide');
              $('#flightInformation').text('Arrive at ' + origin.slice(1) + '.');
              calculateAddress(address, origin.slice(1), modeTravel);
            });
          });
        }
        else {
          departuretime = result.AirlineFlightSchedulesResult.data[0].departuretime;
          localTime = epochToLocalTime(departuretime);
          originAirport = result.AirlineFlightSchedulesResult.data[0].origin;
          $('#flightInformation').text('Arrive at ' + originAirport.slice(1) + ".");
          calculateAddress(address, originAirport.slice(1), modeTravel);
        }
      }
    },
    error: function (data, text) {
      $('#loadingRow').hide(200, function () {
        $('#errorWrapper').text('There was a problem getting the flight information. Please try again.');
      });
    },
    dataType: 'json',
    //jsonp: 'jsonp_callback',
    xhrFields: { withCredentials: true }
  });
}

function calculateTimeToLeave(departuretime, traveltime, bags, tsaPre, airport){
  console.log(epochToLocalTime(departuretime));
  var timezone = epochToLocalTime(departuretime).slice(-3);
  timeToLeave = moment(epochToLocalTime(departuretime).slice(0, -4), 'M-DD-YYYY h:mm:ss A').subtract(60, 'm'); //use local time but remove the timezone. boarding time is departuretime - 60 minutes
  console.log('boardingtime' + timeToLeave.format('h:mm A'));
  $('#arriveAtGate').prepend('<b>' + timeToLeave.format('h:mm A') + '</b> Arrive at your gate.');
  $('#arriveAtGateDetails').text('You will have 30 minutes to spare before boarding your flight.');
  var bagsAndSecurityTime = 0;
  if(bags >= 1){
    timeToLeave = timeToLeave.subtract(20, 'm'); //add 20 minutes for bag check
    bagsAndSecurityTime = bagsAndSecurityTime + 20;
  }
  console.log('bags' + timeToLeave.format('h:mm A'));
  if(tsaPre == 1){
    timeToLeave = timeToLeave.subtract(15, 'm'); //add 15 minutes if you have TSA Pre
    bagsAndSecurityTime = bagsAndSecurityTime + 15;
  }
  else{
    timeToLeave = timeToLeave.subtract(45, 'm'); //add 45 minutes if you do not have TSA Pre
    bagsAndSecurityTime = bagsAndSecurityTime + 45;
  }
  console.log('tsaPre' + timeToLeave.format('h:mm A'));
  $('#flightInformation').prepend('<b>' + timeToLeave.format('h:mm A ') + '</b>');
  $('#flightInformationDetails').append('Check-in and security take on average ' + bagsAndSecurityTime + ' minutes at ' + airport + '.');
  timeToLeave = timeToLeave.subtract(traveltime, 's'); //add the travel time in seconds, calculated by google maps
  console.log('travelTime' + timeToLeave.format('h:mm A'));

  $('#timeToLeave').text('You should leave for the airport by ' + timeToLeave.format('h:mm A ') + timezone +'.');
  $('#flightInformationWrapper').show(200);
  $('#timeToAirportWrapper').show(200);
  $('#arriveAtGateWrapper').show(200);
  $('#timeToAirport').prepend('<b>' + timeToLeave.format('h:mm A ') + '</b>');
}

function calculateAddress(address, originAirport, modeTravel) {
  directionsService.route({
    origin: address,
    destination: originAirport,
    travelMode: modeTravel
  }, function (response, status) {
    if (status == "OK") {
      //console.log('success, time incoming: ');
      console.log(response);
      var time = response.routes[0].legs[0].duration.text;
      value = response.routes[0].legs[0].duration.value; //response.routes.legs.duration.value is the duration in seconds

      //console.log(time);
      $('#loadingRow').hide(200, function () {
        $('#timeToAirport').append('Leave ' + address);
        $('#timeToAirportDetails').append('It takes approximately ' + time + ' to get to ' + originAirport + '.');
        calculateTimeToLeave(departuretime, value, bags, TSAPre, originAirport);
      });
    }
    else {
      //console.log('failure, response: ');
      //console.log(response);
      $('#loadingRow').hide(200, function () {
        $('#errorWrapper').text('There was a problem getting directions to the origin airport. Please try again.');
      });
    }
  });
}

$(document).ready(function () {
  picker = new Pikaday({ //initializes datepicker that works universally cross-browser. HTML5 Date input only works in Chrome and Opera
    field: document.getElementById('departureDate'),
    format: 'MM/DD/YYYY',
    minDate: moment().toDate(),
    maxDate: moment().add(2,'w').toDate()
  });
  picker.setDate(moment().format('YYYY-MM-DD'));

  $('#calculateButton').click(function () {
    calculateTime();
    $('#purpose').hide("slow");
    $('.nested-group input').css({
      "background-color":"rgba(255,255,255,0)",
      "color":"white"
    });
    $('.nested-group div').css({
      "background-color":"rgba(255,255,255,0)",
      "border":"1px solid rgba(255,255,255,.25)",
      "border-right":"none"
    });
    $('.nested-group label').css("color","rgba(255,255,255,.5)");
    $('.nested-group .inline-button').css({
      "border-left":"none",
      "border-right":"1px solid rgba(255,255,255,.25)"
    });
  });

  $('#mobileCalculateButton').click(function () {
    calculateTime();
    $('#purpose').hide("slow");
  });

  $('#showMoreOptions').click(function () {
    $('#mobileGettingToAirport').css("display", "block");
    $('#extraDetails').css("display","block");
    $(this).css("display","none");
  })

  $('#form1').submit(function(){
    return false;
  })
});
