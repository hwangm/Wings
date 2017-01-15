function initMap(){
      //not using var tag indicates these variables are available globally, not just in the scope of initMap
      autocomplete = new google.maps.places.Autocomplete(document.getElementById('location'));
      directionsService = new google.maps.DirectionsService;

      //initializing the flightAware FlightXML URL
      fxml_url = 'http://hwangm:60a99937aef4e1b28d9e7887511480ea66be5a0e@flightxml.flightaware.com/json/FlightXML2/';
    }

    // s is format y-m-d
    // Returns the Unix time for a given date. Specify "s" to get start date (at midnight by default), or 'e' for end date at 2359.
    function parseDate(s, startOrEnd) {
      var b = s.split('-');
      var cDate = new Date(); //get today's date to compare against start date
      if(startOrEnd == 's'){ //get Start Date. If date is today, then use current timestamp. Otherwise, default to midnight.
        var d = new Date(b[0], --b[1], b[2], 0, 0, 0);
        if(cDate.toDateString() == d.toDateString()){
          return Math.floor(cDate.valueOf()/1000);
        }
        else{
          return d.valueOf()/1000;
        }
      }
      else{                  //get End Date at 23:59:59 hours
        var d = new Date(b[0], --b[1], b[2], 23, 59, 59);
        return d.valueOf()/1000;
      }
    }

    //input example is 'DL2011'
    //Returns either the letters alone or numbers alone depending on w parameter
    function parseFlight(s, w) {
      if(w == 1){
        return s.split(/[a-zA-Z]+/g)[1];
      }
      else {
        return s.split(/[0-9]+/g)[0];
      }
    }

    //given an epoch time, this function returns the local time in a human readable format 
    function epochToLocalTime(t){
      var d = new Date(t*1000);
      var options = { timeZoneName: "short" }
      return d.toLocaleString('en-US', options);
    }

    //show the loading icon when calculating results
    function showLoadingIcon(){
      //Step 1 show loading icon
      $('#loadingRow').removeClass('hidden');
      $('#loadingRow').show(200);
    }

    //given the number of bags to check, this function returns a string telling the user how much extra time to account for when checking bags
    function calculateBagTime(num){
      switch(num){
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

    //given the AirlineFlightSchedulesResult from flightXML, this function determines if all the returned flights are codeshares for the same flight
    function areFlightsAllSameCodeShares(data, length){
      var actualIdentifierArray = [];
      var result = true;

      for(var i=0;i<length;i++ ){
        if(data[i].actual_ident != ""){
          actualIdentifierArray.push(data[i].actual_ident);
        }
      }
      console.log(actualIdentifierArray);

      for(var j=1;j<actualIdentifierArray.length;j++){
        if(actualIdentifierArray[j] != actualIdentifierArray[0]){
          console.log(actualIdentifierArray[j] + "compared to "+actualIdentifierArray[0] +" is not equal")
          result = false;
        }
      }
      console.log(result);
      return result;

    }

    $(document).ready(function() {
      var fullDate = new Date();
      var currentDate = fullDate.getFullYear() + '-' + ("0" + (fullDate.getMonth()+1)).slice(-2) + '-' + ("0" + fullDate.getDate()).slice(-2);
      $('#departureDate').prop('value',currentDate);

      $('#calculateButton').click(function() {

        showLoadingIcon();

        //Step 2 retrieve all variables required to get data
        sDate = parseDate($('#departureDate').val(), 's'); //start date
        eDate = parseDate($('#departureDate').val(), 'e'); //end date
        console.log(sDate + ' ' + eDate);
        address = $('#location').val(); //start address
        flight = $('#flight').val(); //flight number
        if(flight == ""){
          flight = "UAL1892";
        }
        airlineCode = parseFlight(flight, 0); //break up flight number into airline code and number individually
        switch(airlineCode.toUpperCase()){ //converting common US IATA codes to ICAO 
          case "WN":
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
        console.log(airlineCode +' '+flightNum);
        modeTravel = $('#modeTravel').val();
        bags = $('#bags').val();
        TSAPre = $('#hasTSAPre').val();
        airport = "SFO";
        if(address == ""){ //setting default address if nothing entered
          address = "3145 Manchester Court, Palo Alto, CA"
        }
        console.log(address + " " + flight + " " + modeTravel + " " + bags + " " + TSAPre);


        // Comment out this section to avoid using the flightstats API, which costs $$$
        $.ajax({
          type: 'GET',
          url: fxml_url + 'AirlineFlightSchedules',
          data: {'startDate':sDate, 'endDate':eDate, 'airline':airlineCode, 'flightno':flightNum, 'howMany':5, 'offset':0},
          success: function(result) {
            console.log(result);
            //information stored in the result
            //departure time (in UTC epoch time/seconds) - need to convert to local timestamp
            //origin airport code
            var resultLength = result.AirlineFlightSchedulesResult.data.length;
            var allCodeShares = areFlightsAllSameCodeShares(result.AirlineFlightSchedulesResult.data, resultLength);

            if(resultLength == 0){
              $('#loadingRow').hide(200, function(){
                  $('#timeToAirport').css('color','white').text('No flights found with the flight number and date. Please try again.');
              });
            }
            else{
              //Get data for a popup to ask user which flight is correct
              //For each flight:
              //- departure time (in local time based on user location)
              //- departure airport (and maybe arrival airport)
              //- var departureTimeArray =  []; //init new departure time array
              //- var departureAirportArray = [];
              //- var actualIdentifierArray = [];
              //- var identifierArray = [];

              
              if((resultLength > 1) && (allCodeShares == false)){
                for(var i=0;i<resultLength;i++){
                  var element = result.AirlineFlightSchedulesResult.data[i];
                  //- departureTimeArray.push(epochToLocalTime(element.departuretime));
                  //- departureAirportArray.push(element.origin);
                  //- identifierArray.push(element.ident); //actual_ident is only populated if ident is different (for codeshares)
                  //- actualIdentifierArray.push(element.actual_ident);
                  if(element.actual_ident == ""){ //filter repeat flights from codeshares
                    var row = "<tr class='clickable-row' id='"+i+"' data-origin='"+element.origin+"' data-departuretime="+element.departuretime+"><td>"+element.origin+" to "+element.destination+"</td><td>"+epochToLocalTime(element.departuretime)+"</td></tr>";
                    $('#insertFlightChoicesHere').prepend(row);
                  }
                  
                }
                $('#loadingRow').hide(200, function(){
                    
                    $('#chooseFlightModal').modal();
                    $('.clickable-row').click(function(){
                      departuretime = $(this).data('departuretime');
                      origin = $(this).data('origin');
                      $('#chooseFlightModal').modal('hide');
                      $('#timeToAirport').css('color','white').text('You selected the flight departing from '+origin+' on '+epochToLocalTime(departuretime)+". ");
                      calculateAddress(address, origin.slice(1), modeTravel);
                    });
                  }); 
              }
              else{
                departuretime = result.AirlineFlightSchedulesResult.data[0].departuretime;
                localTime = epochToLocalTime(departuretime);
                originAirport = result.AirlineFlightSchedulesResult.data[0].origin;
                $('#timeToAirport').css('color','white').text('One flight found departing from '+originAirport+' on '+localTime+". ");
                calculateAddress(address, originAirport.slice(1), modeTravel);
              }
            } 
          },
            error: function(data, text){
              $('#loadingRow').hide(200, function(){
                  $('#timeToAirport').css('color','white').text('There was a problem getting the flight information. Please try again.');
              });
            },
            dataType: 'jsonp',
            jsonp: 'jsonp_callback',
            xhrFields: {withCredentials: true}
        });
        //End of section to comment out

        //- $('#loadingRow').hide(200, function(){
        //-   $('#timeToAirport').css('color','white').text('It will take approximately 24 minutes to get to SFO airport from 3145 Manchester Court, Palo Alto CA');
        //- });

      });
      function calculateAddress(address, originAirport, modeTravel){
        directionsService.route({
          origin: address,
          destination: originAirport,
          travelMode: modeTravel
        }, function(response, status) {
          if(status == "OK"){
            console.log('success, time incoming: ');
            //console.log(response);
            var time = response.routes[0].legs[0].duration.text;
            console.log(time);
            $('#loadingRow').hide(200, function(){
              $('#timeToAirport').css('color','white').append('It will take approximately '+time+' to get to '+originAirport+' airport from '+address+'.');
            });
          }
          else {
            console.log('failure, response: ');
            console.log(response);
            $('#loadingRow').hide(200, function(){
              $('#timeToAirport').css('color','white').text('There was a problem getting directions to the origin airport. Please try again.');
            });
          }
        });
      }    
    });