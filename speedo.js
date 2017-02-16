// make the canvas
var sw = screen.width;
var sh = screen.height;
var speedoDiv = document.getElementById("speedoCanvasContainer");
speedoDiv.innerHTML = "<canvas id=\"canvas1\" width=\"" + sw + "px\" height=\"" + sh + "px\">ns =(</canvas>"

// set up the vars
var gpsInfo = document.getElementById("demo");
var geocoderObj = new google.maps.Geocoder;
var geocoderStatus = -1;
var errorLog = document.getElementById("errorLog");
var c1 = document.getElementById("canvas1");
var ctx = c1.getContext("2d");
var logStr = "";
var w = c1.width;
var h = c1.height;
var posObj;  // make it global by declaring it here
var viewWidth = window.innerWidth;
var viewHeight = window.innerHeight;

// Config vars
var colorScheme = [
  "#000000", // background color
  "#FF3300", // main color 1 - shapes, lights
  "#FF0000", // main color 2 - needle(s)
  "#BB1100", // sub color 1
  "#992211", // sub color 2
];
/* Linear gradient
var grd=ctx.createLinearGradient(0,0,170,0);
grd.addColorStop(0,"black");
grd.addColorStop(1,"white");
ctx.fillStyle=grd;
ctx.fillRect(20,20,150,100);

// Radial gradient
var grd=ctx.createRadialGradient(75,50,5,90,60,100);
grd.addColorStop(0,"red");
grd.addColorStop(1,"white");
ctx.fillStyle=grd;
ctx.fillRect(10,10,150,100);

var speedo = [ {
    "face": [ {
       "text": [ {
          "color": colorScheme["text"],
          "font-face": "Josefin Sans"
       } ]
    } ]
} ];
*/

// Speedometer
// note: ctx.arc() angle=0 is at 3 o'clock and goes clockwise from there.
var mirrorHud = 0;  // show mirror-image
var drawRefreshRate = 100;
var textSizeA = 0.25; // percent of screen space
var textSizeB = 0.15;
var textSizeC = 0.10;
var speedocircx = 0.50; //percents of screen space
var speedocircy = 0.50;
var speedocircr = 0.8;
var speedocircaa = 0.35; // beginangle
var speedocircab = 0.15;// endangle
var speedocircthickness = 0.1;  // percent of circle radius
var speedoinnercirc = 0.8; // info circle inside the speedo
var speedoneedlelength = 0.15; // length of the needle, in percent-of-radius. \|/
var speedomax = 120; // mph
var hudCompass = {
  "radius": 0.8,  // percent of speedo circle radius
  "arcSize": 0.04, // size of marker arc in percent-of-circle
  "arcThickness": 4,
  "centerSize": 0.003,  // size of marker center in percent-of-speedo-radius
  "centerThickness": 15,
  "letterSize": 0.10  // size of marker "N"
};
var color = [
  "#ff5500",
  "#B80005",
  "#ff0000",
  "#331100",
  "#000000"
];
var posOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
  desiredAccuracy: 1, 
  frequency: 500
};

// calc values
var textSizeA = Math.round( textSizeA*Math.min(w,h) );
var textSizeB = Math.round( textSizeB*Math.min(w,h) );
var textSizeC = Math.round( textSizeC*Math.min(w,h) );
var scx = Math.floor(w*speedocircx);
var scy = Math.floor(h*speedocircy);
var scr = Math.floor(Math.min(w,h)*speedocircr*0.5);
var scaa = Math.PI*2*speedocircaa;
var scab = Math.PI*2*speedocircab + Math.PI*2;
var priorLat = -1;
var priorLon = -1;
var priorHeading = -1;
var tripMilesA = 0; // learn to save data then make more relevant trips

try {

    // Utility functions
    // Distance btw 2 points
    function getDistance(lat1,lon1,lat2,lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2-lat1);  // deg2rad below
      var dLon = deg2rad(lon2-lon1); 
      var a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ; 
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      var d = R * c; // Distance in km
      d *= 0.62137119;  // to mi
      return d;
    }
    function deg2rad(deg) {
      return deg * (Math.PI/180)
    }

    // Detect orientation change
    function getDeviceOrientation() {
      //alert(window.orientation);
      var viewWidth = window.innerWidth;
      var viewHeight = window.innerHeight;
      ctx.canvas.width = viewWidth;
      ctx.canvas.height = viewHeight;
      var w = c1.width;
      var h = c1.height;

      var scx = Math.floor(w*speedocircx);
      var scy = Math.floor(h*speedocircy);
      var scr = Math.floor(Math.min(w,h)*speedocircr*0.5);
    }
    window.addEventListener("orientationchange", getDeviceOrientation);

    // Request fullscreen
    var prevTouchTime = -1;
    function toggleFullscreen(event) {
      //var touchTime = new Date();
      //var touchMs = touchTime.getTime();
      //var touchInterval = touchTime - prevTouchTime;
      //if (touchInterval < 500) {
        // if fullscreen not active, activate it
        if (!document.fullscreenElement &&    // alternative standard method
            !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) { 
          c1.style.visibility = "visible";
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
          c1.style.visibility = "hidden";
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
    function init() {
        try {

            // Set position watch function
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition(
                    updatePosition,
                    handlePosError,
                    posOptions
                );
            } else { gpsInfo.innerHTML = "Geolocation is not supported by this browser." }

            // flip context horizontally
            if (mirrorHud) { 
              ctx.scale(-1, 1);
              ctx.translate(-w, 0);
            };

            updateGeocode();

            // Set animation function
            drawHud();

        } catch(ex) {
            logStr = logStr + ex + "<br />";
            errorLog.innerHTML = logStr;
        };
    };

    // position.coords:
    //  .latitude .longitude
    //  .accuracy .altitude .altitudeAccuracy
    //  .heading
    //  .speed
    // position.timestamp
    function updatePosition(position) { 
        posObj = position;
    };

    function updateGeocode() {
        try {
          var latlng = {lat: posObj.coords.latitude, lng: posObj.coords.longitude};
          geocoderObj.geocode({'location': latlng}, function(results, status) {
            geocoderObj = results;
            geocoderStatus = status;
          });
          setTimeout(updateGeocode(), 5000);
        } catch(ex) {
            logStr = logStr + "Geocoder Error " + ex.code  + ": " + ex.message + "<br />";
            errorLog.innerHTML = logStr;
        }
    }

    function handlePosError(ex) {
        logStr = logStr + "Position Error " + ex.code  + ": " + ex.message + "<br />";
        errorLog.innerHTML = logStr;
    };
        
    // DEV
    //posSpeed = 1;
    //posHeading = 0;

    function drawHud() {
        try {
            // Get the values from Position object
            if( posObj === undefined ) {
              var posLat = -1;
              var posLon = -1;
              var posSpeed = -1;
              var posHeading = -1;
              var posAccuracy = -1;
              var posAltitude = -1;
              var posAltitudeAccuracy = -1;
              var posTimestamp = -1;
            } else {
              var posLat = posObj.coords.latitude;
              var posLon = posObj.coords.longitude;
              var posSpeed = posObj.coords.speed * 2.236936292; // m/s to m/h
              var posHeading = posObj.coords.heading
              var posAccuracy = posObj.coords.accuracy;
              var posAltitude = posObj.coords.altitude;
              var posAltitudeAccuracy = posObj.coords.altitudeAccuracy;
              var posTimestamp = posObj.timestamp;
            };
            if (posSpeed <= 2) {posHeading = priorHeading} else {priorHeading = posHeading};
            // calc values
            // trip meter
            if( priorLat !== -1 ) {
              var distIncrement = getDistance( priorLat, priorLon, posLat, posLon );
              tripMilesA += distIncrement;
            }
            priorLat = posLat;
            priorLon = posLon;


            // DEV
            //posSpeed = 110;
            //posSpeed = Math.sin(posHeading/(Math.PI*2))*45;
            //posHeading += 0.5;
            //posSpeed %= speedomax;
            //posHeading = 12;


            gpsInfo.innerHTML = "<br>Speed: " + posSpeed + "<br>Heading: " + posHeading + "<br>Accuracy: " + posAccuracy + "<br>Trip: " + tripMilesA;
        
            // Draw hud
            //ctx.clearRect(0,0,w,h);
            ctx.fillStyle = color[4];
            ctx.fillRect(0,0,w,h);

            // Speedo outer-circle
            var needleAngle = scaa + ((scab-scaa)*(posSpeed/speedomax));
            ctx.strokeStyle = color[1];
            ctx.lineWidth = 20;
            ctx.beginPath();
            ctx.arc(scx, scy, scr, scaa, needleAngle);
            ctx.stroke();
            ctx.closePath();

            /* dev - endAngle is not dependent on beginAngle.
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(scx, scy, scr-20, scaa, needleAngle);
            ctx.stroke();
            ctx.closePath();
            */

            // speedo needles \|/
            ctx.strokeStyle = color[0];
            ctx.lineWidth = 2;
            ctx.beginPath();
            // center
            ctx.moveTo(
              scx + ( -Math.sin( needleAngle-(Math.PI/2) ) * (scr-(scr*speedoneedlelength) ) ),
              scy + ( Math.cos( needleAngle-(Math.PI/2) ) * (scr-(scr*speedoneedlelength) ) )
            );
            ctx.lineTo(
              scx + ( -Math.sin( needleAngle-(Math.PI/2) ) * (scr+(scr*speedoneedlelength) ) ),
              scy + ( Math.cos( needleAngle-(Math.PI/2) ) * (scr+(scr*speedoneedlelength) ) )
            );
            /* right
            ctx.moveTo(
              scx + ( -Math.sin( needleAngle-(Math.PI/2)+(5/speedomax) ) * (scr-(scr*speedoneedlelength*0.5) ) ),
              scy + ( Math.cos( needleAngle-(Math.PI/2)+(5/speedomax) ) * (scr-(scr*speedoneedlelength*0.5) ) )
            );
            ctx.lineTo(
              scx + ( -Math.sin( needleAngle-(Math.PI/2)+(5/speedomax) ) * (scr+(scr*speedoneedlelength*0.5) ) ),
              scy + ( Math.cos( needleAngle-(Math.PI/2)+(5/speedomax) ) * (scr+(scr*speedoneedlelength*0.5) ) )
            );
            // left
            ctx.moveTo(
              scx + ( -Math.sin( needleAngle-(Math.PI/2)-(5/speedomax) ) * (scr-(scr*speedoneedlelength*0.5) ) ),
              scy + ( Math.cos( needleAngle-(Math.PI/2)-(5/speedomax) ) * (scr-(scr*speedoneedlelength*0.5) ) )
            );
            ctx.lineTo(
              scx + ( -Math.sin( needleAngle-(Math.PI/2)-(5/speedomax) ) * (scr+(scr*speedoneedlelength*0.5) ) ),
              scy + ( Math.cos( needleAngle-(Math.PI/2)-(5/speedomax) ) * (scr+(scr*speedoneedlelength*0.5) ) )
            );*/
            ctx.stroke();
            ctx.closePath();
            
            // compass ring
            compassAngle = (posHeading*(Math.PI/180));
            // marker arc
              ctx.strokeStyle = color[1];
              ctx.lineWidth = hudCompass.arcThickness;
              ctx.beginPath();
              ctx.arc( scx, scy, scr*hudCompass.radius, -compassAngle-(Math.PI/2)-(Math.PI*2*hudCompass.arcSize), -compassAngle-(Math.PI/2)+(Math.PI*2*hudCompass.arcSize) );
              ctx.stroke();
              ctx.closePath();
            // marker center
              ctx.strokeStyle = color[0];
              ctx.lineWidth = hudCompass.centerThickness;
              ctx.beginPath();
              ctx.arc( scx, scy, scr*hudCompass.radius, -compassAngle-(Math.PI/2)-(Math.PI*2*hudCompass.centerSize), -compassAngle-(Math.PI/2)+(Math.PI*2*hudCompass.centerSize) );
              ctx.stroke();
              ctx.closePath();
            
            // Top Info - digital speed
            ctx.fillStyle = color[0];
            ctx.font = textSizeA.toString() + "px Josefin Sans";
            spdWidth = ctx.measureText(Math.round(posSpeed)).width;
            ctx.beginPath();
            ctx.fillText(Math.round(posSpeed).toString(), scx-(spdWidth*0.90), scy);
            ctx.font = textSizeC.toString() + "px Josefin Sans";
            ctx.fillText(" mph", scx+(scr*0.10), scy);
            ctx.closePath();

            // Bottom info - simple compass
            var posDirection = "---";
            /*
            N   348.75 -  11.25
            NNE  11.25 -  33.75
            NE   33.75 -  56.25
            ENE  56.25 -  78.75
            E    78.75 - 101.25
            ESE 101.25 - 123.75
            SE  123.75 - 146.25
            SSE 146.25 - 168.75
            S   168.75 - 191.25
            SSW 191.25 - 213.75
            SW  213.75 - 236.25
            WSW 236.25 - 258.75
            W   258.75 - 281.25
            WNW 281.25 - 303.75
            NW  303.75 - 326.25
            NNW 326.25 - 348.75
            */
            if (posHeading > 348.75 || posHeading <=  11.25) {posDirection = "N"  }
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
            ctx.fillStyle = color[0];
            ctx.font = textSizeB.toString() + "px Josefin Sans";
            infoBwidth = ctx.measureText(posDirection).width;
            infoBheight = ctx.measureText(posDirection).height;
            ctx.beginPath();
            ctx.fillText(posDirection, scx-(infoBwidth*0.5), scy+textSizeB+(h*0.025));
            ctx.closePath();

            // Show geocoder info
            if (geocoderStatus === google.maps.GeocoderStatus.OK) {
              if (geocoderObj[1]) {
                logStr += geocoderObj[1];
                errorLog.innerHTML = logStr;
              }/* else {
                logStr += "No result";
                errorLog.innerHTML = logStr;
              }
            } else {
              logStr += "Geocoder failed: " + geocoderStatus;
              errorLog.innerHTML = logStr;*/
            }
        
            // DEV: Draw border around canvas
            /*ctx.strokeStyle = color[0];
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.strokeRect(0,0,w,h);
            //ctx.strokePath();
            ctx.closePath();*/

            //window.requestAnimationFrame(drawHud);
fTimeout = setTimeout(drawHud, drawRefreshRate);

      } catch(ex) {
        logStr = logStr + " " + ex;
        errorLog.innerHTML = logStr;
      }
    };

    function handlePosError(ex) {
        logStr = logStr + "Position Error " + ex.code  + ": " + ex.message + "<br />";
        errorLog.innerHTML = logStr;
    };

    init();

} catch(ex) {
    logStr = logStr + ex + "<br />";
    errorLog.innerHTML = logStr;
}
