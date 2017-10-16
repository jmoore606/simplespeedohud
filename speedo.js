// Jeff Moore, 1/19/2016
// Speedometer.

//"use strict";

// Configuration variables
var config_mirrorHud = 0;  // show mirror-image
var config_fps = 100;
var config_posRefreshRate = 100; // ms
var config_geocodeRefreshRate = 15000; // ms
var config_textSizeA = 0.20; // percent of screen space
var config_textSizeB = 0.13;
var config_textSizeC = 0.08;
var config_textFontA = "Josefin Sans";
var config_textFontB = "Josefin Sans";
var config_textFontC = "Josefin Sans";
var config_speedocircx = 0.50; //percents of screen space
var config_speedocircy = 0.40;
var config_speedocircr = 0.6;
var config_speedocircaa = 0.35; // beginangle
var config_speedocircab = 0.15;// endangle
var config_speedocircthickness = 0.1;  // percent of circle radius
var config_speedoinnercirc = 0.8; // info circle inside the speedo
var config_speedoneedlelength = 0.40; // length of the needle, in percent-of-radius. \|/
var config_speedoneedlewidtha = 0.00025; // width of the inner needle, in percent-of-radius. \|/
var config_speedoneedlewidthb = 0.00005; // width of the outer needle, in percent-of-radius. \|/
var config_speedoneedleroffset = -0.300; // offset from center, in percent-of-radius. pos-outward, neg-inward.
var config_speedomax = 120; // mph
var config_subInfoAx = 0.50; // can be street name, city name, etc
var config_subInfoAy = 0.85;
var config_subInfoAFont = "Josefin Sans";
var config_subInfoASize = 0.08;
var config_subInfoLineHeight = 0.09;
var config_hudCompass = {
  "radius": 0.8,  // percent of speedo circle radius
  "arcSize": 0.04, // size of marker arc in percent-of-circle
  "arcThickness": 4,
  "centerSize": 0.003,  // size of marker center in percent-of-speedo-radius
  "centerThickness": 15,
  "letterSize": 0.10  // size of marker "N"
};
var config_colorScheme = [
  "#000000", // background color
  "#FF5500", // main color 1 - shapes, lights
  "#661100", // main color 2 - speed arc
  "#CC1100", // sub color 1
  "#992211", // sub color 2
  "#993300", // edge color
];

/*var config_colorScheme = [
  "#FFFFFF", // background color
  "#000000", // main color 1 - shapes, lights
  "#555555", // main color 2 - needle(s)
  "#777777", // sub color 1
  "#992211", // sub color 2
];*/

var config_posOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
  desiredAccuracy: 1, 
  frequency: config_posRefreshRate
};

// Other global variables
var viewWidth, viewHeight, w, h;
var textSizeA, textSizeB, textSizeC;
var scx, scy, scr, scaa, scab;
var subInfoASize;
var logStr = "";
var prevTouchTime = -1;

// Prepare the elements and variables
// HTML
var speedoDiv = document.getElementById("speedoCanvasContainer");
speedoDiv.innerHTML += "<canvas id=\"canvas1\" width=\"" + screen.width + "px\" height=\"" + screen.height + "px\">ns =(</canvas>";
//speedoDiv.innerHTML += "<canvas id=\"canvas2\" width=\"" + screen.width + "px\" height=\"" + screen.height + "px\">ns =(</canvas>";
var c1 = document.getElementById("canvas1"); // for HUD info display
//var c2 = document.getElementById("canvas2"); // for HUD controls display
var ctx1 = c1.getContext("2d");
//var ctx2 = c2.getContext("2d");
var viewWidth = window.innerWidth;
var viewHeight = window.innerHeight;
// GPS
var gpsInfo = document.getElementById("demo");
var geocoderObj = new google.maps.Geocoder;
var geocoderStatus = -1;
var geoWatchPos, geocoderResultsObj, randomSetOfGeocoderResultsObj, randomSetOfGeocoderStatusObj;
var posObj;
var priorLat = -1;
var priorLon = -1;
var priorHeading = -1;
var tripMilesA = 0; // learn to save data then make more relevant trips
var posLat, posLon, posSpeed, posHeading, posAccuracy, posAltitude, posAltitudeAccuracy, posTimeStamp;
posLat = posLon = posSpeed = posHeading = posAccuracy = posAltitude = posAltitudeAccuracy = posTimeStamp = -1;
var geoStreetName, geoNeighborhoodName, geoCityName, geoCountyName, geoStateAbbrev, geoZipCode;
geoStreetName = geoNeighborhoodName = geoCityName = geoCountyName = geoStateAbbrev = geoZipCode = "";
var speedStr, posDirection, sub1Str, sub2Str;
speedStr = posDirection = sub1Str = sub2Str = "---";


try {

    // Utility functions
    // Distance btw 2 points
    function getDistance(lat1,lon1,lat2,lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = degToRad(lat2-lat1);  // degToRad below
      var dLon = degToRad(lon2-lon1); 
      var a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ; 
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      var d = R * c; // Distance in km
      d *= 0.62137119;  // to mi
      return d;
    }

    function degToRad(deg) { return deg * (Math.PI/180) };


    // Initialize and size the canvas
    function initDisplay() {
      //alert(window.orientation);
      viewWidth = window.innerWidth;
      viewHeight = window.innerHeight;
      c1.width = viewWidth;
      c1.height = viewHeight;
      ctx1.width = viewWidth;
      ctx1.height = viewHeight;

      // calc values
      w = c1.width;
      h = c1.height;
      textSizeA = Math.round( config_textSizeA*Math.min(w,h) );
      textSizeB = Math.round( config_textSizeB*Math.min(w,h) );
      textSizeC = Math.round( config_textSizeC*Math.min(w,h) );
      subInfoASize = Math.round( config_subInfoASize*Math.min(w,h) );
      scx = Math.floor(w*config_speedocircx);
      scy = Math.floor(h*config_speedocircy);
      scr = Math.floor(Math.min(w,h)*config_speedocircr*0.5);
      scaa = Math.PI*2*config_speedocircaa;
      scab = Math.PI*2*config_speedocircab + Math.PI*2;

      // flip context horizontally
      if (config_mirrorHud) { 
        ctx1.scale(-1, 1);
        ctx1.translate(-w, 0);
      };

      // Log the values
      logStr = logStr + "window.innerWidth = " + window.innerWidth + "<br>window.innerHeight = " + window.innerHeight
                      + "<br>window.outerWidth = " + window.outerWidth + "<br>window.outerHeight = " + window.outerHeight
                      + "<br>screen.width = " + screen.width + "<br>screen.height = " + screen.height + "<br><br>";
      errorLog.innerHTML = logStr;
    }
    

    // Request fullscreen
    function toggleFullscreen(event) {
      //var touchTime = new Date();
      //var touchMs = touchTime.getTime();
      //var touchInterval = touchTime - prevTouchTime;
      //if (touchInterval < 500) {
        // if fullscreen not active, activate it
        if (!document.fullscreenElement &&    // alternative standard method
            !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) { 
          //c1.style.visibility = "visible";
          if (c1.requestFullscreen) {
            c1.requestFullscreen();
          } else if (c1.msRequestFullscreen) {
            c1.msRequestFullscreen();
          } else if (c1.mozRequestFullScreen) {
            c1.mozRequestFullScreen();
          } else if (c1.webkitRequestFullscreen) {
            c1.webkitRequestFullscreen();
          }
        } else {
          //c1.style.visibility = "hidden";
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
        }
      //}
      //prevTouchTime = touchTime;
      //logStr = logStr + "Touch at " + touchTime  + "<br />";
      //errorLog.innerHTML = logStr;
    }
    //c1.addEventListener("touchstart", toggleFullscreen);
    //c1.addEventListener("mousedown", toggleFullscreen);


    // Initialization function.
    // - set position watch function
    // - set animation function
    function initGeo() {
        try {

            // Set position watch function
            if (navigator.geolocation) {
                geoWatchPos = navigator.geolocation.watchPosition(
                    //updateGeocode,  // don't update geocode this rapidly! call update() elsewhere
                    updatePosition,
                    handlePosError,
                    config_posOptions
                );
            } else { gpsInfo.innerHTML = "Geolocation is not supported by this browser." }
            //updateGeocode();

        } catch(ex) {
            logStr = logStr + ex + "<br />";
            errorLog.innerHTML = logStr;
        };
    };

    // updatePosition(posiiton) - get GPS data.
    // Put the updated position info into a global variable, update vars
    // position.coords:
    //  .latitude .longitude
    //  .accuracy .altitude .altitudeAccuracy
    //  .heading
    //  .speed
    // position.timestamp
    function updatePosition(position) {
      try {
        // Make position value global
        posObj = position;

        // Get the values from Position object
        if( posObj === undefined ) {
          posLat = -1;
          posLon = -1;
          posSpeed = -1;
          posHeading = -1;
          posAccuracy = -1;
          posAltitude = -1;
          posAltitudeAccuracy = -1;
          posTimestamp = -1;
        } else {
          posLat = posObj.coords.latitude;
          posLon = posObj.coords.longitude;
          posSpeed = posObj.coords.speed * 2.236936292; // m/s to m/h
          posHeading = posObj.coords.heading
          posAccuracy = posObj.coords.accuracy;
          posAltitude = posObj.coords.altitude;
          posAltitudeAccuracy = posObj.coords.altitudeAccuracy;
          posTimestamp = posObj.timestamp;
        };

        // Make formatted strings
            // Speed
            if (posSpeed.toString() == "NaN") {speedStr = "---"} else {speedStr = Math.round(posSpeed).toString()};
            // Direction
            if ( posHeading === undefined ) {posDirection = "---" }
              else if (posHeading < 0) {posDirection = ""}
              else if (posHeading > 348.75 || posHeading <=  11.25) {posDirection = "N"  }
              else if (posHeading >  11.25 && posHeading <=  33.75) {posDirection = "NNE"}
              else if (posHeading >  33.75 && posHeading <=  56.25) {posDirection = "NE" }
              else if (posHeading >  56.25 && posHeading <=  78.75) {posDirection = "ENE"}
              else if (posHeading >  78.75 && posHeading <= 101.25) {posDirection = "E"  }
              else if (posHeading > 101.25 && posHeading <= 123.75) {posDirection = "ESE"}
              else if (posHeading > 123.75 && posHeading <= 146.25) {posDirection = "SE" }
              else if (posHeading > 146.25 && posHeading <= 168.75) {posDirection = "SSE"}
              else if (posHeading > 168.75 && posHeading <= 191.25) {posDirection = "S"  }
              else if (posHeading > 191.25 && posHeading <= 213.75) {posDirection = "SSW"}
              else if (posHeading > 213.75 && posHeading <= 236.25) {posDirection = "SW" }
              else if (posHeading > 236.25 && posHeading <= 258.75) {posDirection = "WSW"}
              else if (posHeading > 258.75 && posHeading <= 281.25) {posDirection = "W"  }
              else if (posHeading > 281.25 && posHeading <= 303.75) {posDirection = "WNW"}
              else if (posHeading > 303.75 && posHeading <= 326.25) {posDirection = "NW" }
              else if (posHeading > 326.25 && posHeading <= 348.75) {posDirection = "NNW"}
            ;
            if (posSpeed <= 2) {posHeading = priorHeading} else {priorHeading = posHeading};


      } catch(ex) {
        logStr = logStr + "Position Error " + ex.code  + ": " + ex.message + "<br />";
        errorLog.innerHTML = logStr;
      }
    }

    // updateGeocode() - send latLng pair, get place objects (place, street, city, state, etc)
    // &&& Update to put all resultsObjects in formatted, easily readable object, then pull the needed strings from that.
    function updateGeocode() {
        try {
          var i;
          var j;

          var latlng = {lat: posObj.coords.latitude, lng: posObj.coords.longitude};
          geocoderObj.geocode({'location': latlng}, function(results, status) {
            // Set results to global vars
            geocoderResultsObj = results;
            geocoderStatus = status;

            // Get the values from geocoder object
            geoStreetName = "";
            geoNeighborhoodName = "";
            geoCityName = "";
            geoCountyName = "";
            geoStateAbbrev = "";
            geoZipCode = "";
            sub1Str = "---";
            sub2Str = "---";
            if( geocoderResultsObj !== undefined && geocoderResultsObj !== null ) {
              for (i=0; i<geocoderResultsObj.length; i++) {

                // Get street name, neighborhood name, city name from street_address obj
                if ( geocoderResultsObj[i].types[0] == "street_address"  || geocoderResultsObj[i].types[0] == "route" ) {
                  for( j=0; j<geocoderResultsObj[i].address_components.length; j++ ) {
                    // Street name
                    if( geocoderResultsObj[i].address_components[j].types[0] == "route" ) {
                      geoStreetName = geocoderResultsObj[i].address_components[j].long_name;
                    }
                    // Neighborhood name
                    if( geoNeighborhoodName == "" && ( geocoderResultsObj[i].address_components[j].types[0] == "neighborhood" || geocoderResultsObj[i].address_components[j].types[0] == "administrative_area_level_3" ) ) {
                      geoNeighborhoodName = geocoderResultsObj[i].address_components[j].long_name;
                    }
                    // City name
                    if( geocoderResultsObj[i].address_components[j].types[0] == "locality" ) {
                      geoCityName = geocoderResultsObj[i].address_components[j].long_name;
                    }
                  }
                } // end of Get street name
              }
              
              sub1Str = geoStreetName;
              if ( geoNeighborhoodName != "" && geoCityName != "" ) {
                sub2Str = geoNeighborhoodName + ", " + geoCityName;

              } else {
                sub2Str = geoNeighborhoodName + geoCityName;
              }
            };
          });

        } catch(ex) {
            logStr = logStr + "Geocoder Error " + ex.code  + ": " + ex.message + "<br />i=" + i + " j=" + j + "<br />";
            errorLog.innerHTML = logStr;
        }
    }

    function handlePosError(ex) {
        logStr = logStr + "Position Error " + ex.code  + ": " + ex.message + "<br />";
        errorLog.innerHTML = logStr;
    };
    

    // Get info on n random positions (&&&Update updateGeocode() first.)
    function getRandomPositions(nPos) {
      /*Top-Right (NE):    41.749636,  -71.006678
        Bottom-Right (SE): 30.556941,  -81.737882
        Bottom-Left (SW):  32.701951, -117.150259
        Top-Left (NW):     48.979818, -123.071243*/
      var i, j;
      var lng, lat;
      var latlng;
      var lngMax =   48.979818;
      var lngMin =   30.556941;
      var latMax =  -71.006678;
      var latMin = -123.071243;
      var randomGeocoderResultsObj;
      var randomGeocoderStatusObj;
      randomSetOfGeocoderResultsObj = [];
      randomSetOfGeocoderStatusObj = [];

      for (i=0; i<nPos; i++) {
        lng = lngMin + ( Math.random() * (lngMax-lngMin) );
        lat = latMin + ( Math.random() * (latMax-latMin) );

        logStr += "lng: " + lng + "  lat: " + lat + "<br />";
        errorLog.innerHTML = logStr;

        latlng = {lat: lat, lng: lng};
        geocoderObj.geocode({'location': latlng}, function(results, status) {
          randomSetOfGeocoderResultsObj[i] = results;
          randomSetOfGeocoderStatusObj[i] = status;
        });
      }
    }


    function draw() {
      try {

        // *** Moved getting the obj values to updateGeocode() ***

        // calc values
        // trip meter
        if( priorLat !== -1 ) {
          var distIncrement = getDistance( priorLat, priorLon, posLat, posLon );
          tripMilesA += distIncrement;
        }
        priorLat = posLat;
        priorLon = posLon;

        // DEV
        //posSpeed = 45;
        //posSpeed = Math.sin(posHeading/(Math.PI*2))*45;
        //posHeading += 0.5;
        //posSpeed %= config_speedomax;
        //posHeading = 12;

        gpsInfo.innerHTML = "<br>Speed: " + posSpeed + "<br>Heading: " + posHeading + "<br>Accuracy: " + posAccuracy + "<br>Trip: " + tripMilesA;
    
        // Draw hud
        //ctx1.clearRect(0,0,w,h);
        ctx1.fillStyle = config_colorScheme[0];
        ctx1.fillRect(0,0,w,h);

        // Speedo outer-circle (current speed)
        if (posSpeed >= 0) {var needleAngle = scaa + ((scab-scaa)*(posSpeed/config_speedomax))} else {var needleAngle = scaa};
        ctx1.strokeStyle = config_colorScheme[2];
        ctx1.lineWidth = scr*config_speedocircthickness;
        ctx1.beginPath();
        ctx1.arc(scx, scy, scr, scaa, needleAngle);
        ctx1.stroke();
        ctx1.closePath();

        // Speedo outer-circle range
        ctx1.strokeStyle = config_colorScheme[5];
        ctx1.lineWidth = 1;
        ctx1.beginPath();
        ctx1.arc(scx, scy, scr-(scr*config_speedocircthickness*0.5), scaa, scab);
        ctx1.stroke();
        ctx1.closePath();        

        /* speedo needle |
        ctx1.strokeStyle = config_colorScheme[1];
        ctx1.lineWidth = 2;
        ctx1.beginPath();
        // center
        ctx1.moveTo(
          scx + ( -Math.sin( needleAngle-(Math.PI/2) ) * (scr-(scr*config_speedoneedlelength) ) ),
          scy + ( Math.cos( needleAngle-(Math.PI/2) ) * (scr-(scr*config_speedoneedlelength) ) )
        );
        ctx1.lineTo(
          scx + ( -Math.sin( needleAngle-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength) ) ),
          scy + ( Math.cos( needleAngle-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength) ) )
        );
        ctx1.stroke();
        ctx1.closePath();
        */

        // speedo needle
        ctx1.fillStyle = config_colorScheme[0];
        ctx1.strokeStyle = config_colorScheme[1];
        ctx1.lineWidth = 0.5;
        ctx1.beginPath();
        // draw the polygon clockwise from top-right (when pointing up)
        ctx1.moveTo(
          scx + ( -Math.sin( needleAngle+(scr*config_speedoneedlewidthb)-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) ),
          scy + ( Math.cos( needleAngle+(scr*config_speedoneedlewidthb)-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) )
        );
        ctx1.lineTo(
          scx + ( -Math.sin( needleAngle+(scr*config_speedoneedlewidtha)-(Math.PI/2) ) * (scr-(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) ),
          scy + ( Math.cos( needleAngle+(scr*config_speedoneedlewidtha)-(Math.PI/2) ) * (scr-(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) )
        );
        ctx1.lineTo(
          scx + ( -Math.sin( needleAngle-(scr*config_speedoneedlewidtha)-(Math.PI/2) ) * (scr-(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) ),
          scy + ( Math.cos( needleAngle-(scr*config_speedoneedlewidtha)-(Math.PI/2) ) * (scr-(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) )
        );
        ctx1.lineTo(
          scx + ( -Math.sin( needleAngle-(scr*config_speedoneedlewidthb)-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) ),
          scy + ( Math.cos( needleAngle-(scr*config_speedoneedlewidthb)-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) )
        );
        ctx1.lineTo(
          scx + ( -Math.sin( needleAngle+(scr*config_speedoneedlewidthb)-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) ),
          scy + ( Math.cos( needleAngle+(scr*config_speedoneedlewidthb)-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) )
        );

        // make gradient. (x0, y0, x1, y1)
        var grd = ctx1.createLinearGradient(
          scx + ( -Math.sin( needleAngle-(Math.PI/2) ) * (scr-(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) ),
          scy + ( Math.cos( needleAngle-(Math.PI/2) ) * (scr-(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) ),
          scx + ( -Math.sin( needleAngle-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) ),
          scy + ( Math.cos( needleAngle-(Math.PI/2) ) * (scr+(scr*config_speedoneedlelength)+(scr*config_speedoneedleroffset) ) ),
        );
        grd.addColorStop(0.00, config_colorScheme[0]);
        grd.addColorStop(0.80, config_colorScheme[1]);
        grd.addColorStop(1.00, config_colorScheme[1]);
        ctx1.fillStyle = grd;
        ctx1.fill();
        //ctx1.stroke();
        ctx1.closePath();
        
        // compass ring
        compassAngle = (posHeading*(Math.PI/180));
        // marker arc
          ctx1.strokeStyle = config_colorScheme[3];
          ctx1.lineWidth = config_hudCompass.arcThickness;
          ctx1.beginPath();
          ctx1.arc( scx, scy, scr*config_hudCompass.radius, -compassAngle-(Math.PI/2)-(Math.PI*2*config_hudCompass.arcSize), -compassAngle-(Math.PI/2)+(Math.PI*2*config_hudCompass.arcSize) );
          ctx1.stroke();
          ctx1.closePath();
        // marker center
          ctx1.strokeStyle = config_colorScheme[1];
          ctx1.lineWidth = config_hudCompass.centerThickness;
          ctx1.beginPath();
          ctx1.arc( scx, scy, scr*config_hudCompass.radius, -compassAngle-(Math.PI/2)-(Math.PI*2*config_hudCompass.centerSize), -compassAngle-(Math.PI/2)+(Math.PI*2*config_hudCompass.centerSize) );
          ctx1.stroke();
          ctx1.closePath();
        
        // Top Info - digital speed
        ctx1.fillStyle = config_colorScheme[1];
        ctx1.font = textSizeA.toString() + "px " + config_textFontA;
        var spdWidth = ctx1.measureText(speedStr).width;
        ctx1.beginPath();
        ctx1.fillText(speedStr, scx-(spdWidth*0.90), scy);
        ctx1.font = textSizeC.toString() + "px " + config_textFontC;
        ctx1.fillText(" mph", scx+(scr*0.10), scy);
        ctx1.closePath();

        // Bottom info - simple compass
        ctx1.fillStyle = config_colorScheme[1];
        ctx1.font = textSizeB.toString() + "px " + config_textFontB;
        infoBwidth = ctx1.measureText(posDirection).width;
        infoBheight = ctx1.measureText(posDirection).height;
        ctx1.beginPath();
        ctx1.fillText(posDirection, scx-(infoBwidth*0.5), scy+textSizeB+(h*0.025));
        ctx1.closePath();

        // Sub Info: divider
        var divX = w*0.25;
        var divW = w*0.50;
        var grd = ctx1.createLinearGradient(divX, 0, divX+divW, 0);
        grd.addColorStop(0, config_colorScheme[0]);
        grd.addColorStop(0.5, config_colorScheme[3]);
        grd.addColorStop(1, config_colorScheme[0]);
        ctx1.fillStyle = grd;
        ctx1.fillRect(divX, (h*config_subInfoAy)-(h*config_subInfoLineHeight), divW, h*0.005);

        // Sub Info: street name; neighborhood, city
        ctx1.beginPath();
        ctx1.fillStyle = config_colorScheme[1];
        ctx1.font = subInfoASize.toString() + "px " + config_subInfoAFont;
        var l1Width = ctx1.measureText(sub1Str).width;
        var l1Height = ctx1.measureText(sub1Str).height;
        ctx1.fillText(sub1Str, (w*config_subInfoAx)-(l1Width*0.5), (h*config_subInfoAy));
        ctx1.closePath();

        ctx1.beginPath();
        ctx1.fillStyle = config_colorScheme[3];
        var l2Width = ctx1.measureText(sub2Str).width;
        var l2Height = ctx1.measureText(sub2Str).height;
        ctx1.fillText(
          sub2Str, 
          (w*config_subInfoAx)-(l2Width*0.5), 
          (h*config_subInfoAy)+(h*config_subInfoLineHeight)
        );
        //logStr = logStr + subInfoASize + ", " + textSizeA + "<br />";
        //errorLog.innerHTML = logStr;
        ctx1.closePath();

      } catch(ex) {
        logStr = logStr + " " + ex;
        errorLog.innerHTML = logStr;
      }
    };


    // Iterator function.  Run the repeating functions at their respective run rates.
    var t;  // current time
    var t0 = Date.now(); // initial time ("t naught")
    var tStamp_updateGeocode;
    var nRuns_updateGeocode;
    var tStamp_draw;
    var nRuns_draw;
    
    function tickScheduler() {
      t = Date.now();

      // schedule updateGeocode()

      requestAnimationFrame(tickScheduler);
    }


    // Main function
    var interval_updateGeocode;
    var interval_draw;
    function main() {
      // Initialize
      initDisplay();
      initGeo();

      interval_updateGeocode = setInterval(
        function() {updateGeocode()},
        config_geocodeRefreshRate
      );

      interval_draw = setInterval( 
        function() {draw()},
        config_fps
      );

      window.addEventListener("orientationchange", initDisplay);
      window.onresize = initDisplay;
      //fTimeout = setTimeout(draw, config_fps);
    };
    main();
    

} catch(ex) {
    logStr = logStr + ex + "<br />";
    errorLog.innerHTML = logStr;
}
