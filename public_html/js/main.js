$(document).ready(function () {
    var landingVideo = document.querySelector('#landing-video');
    var pageSection = document.querySelector('.page-section');
    var heading = document.querySelector('.main__heading');
    console.log(heading);
    if (typeof landingVideo.addTextTrack === 'undefined') {
        $(pageSection).addClass('hide');       
    }
});

var runs = [
    ['Major A', 'Longboarding', -43.57649, 172.65280, 1],
    ['Morgans', 'Longboarding', -43.58184, 172.71618, 2],
    ['Mt P', 'Longboarding', -43.58495, 172.72801, 3]
];
var activeInfoWindow;
var activePolyline;
var marker;
function initMap() {
    //Set map container and initialise map parameters
    var map = new google.maps.Map(document.getElementById('runSelector'), {
        center: {lat: -43.531056, lng: 172.632036},
        zoom: 6,
        mapTypeId: 'terrain'
    });
    //Create an info window object and specify the map it belongs to
    setRunMarkers(map);
    // Try HTML5 geolocation. Check if browser supports geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(pos);
            map.setZoom(11);
        }, function () {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }
    google.maps.event.addDomListener(window, "resize", function () {
        var center = map.getCenter();
        google.maps.event.trigger(map, "resize");
        map.setCenter(center);
    });
    return map;
}

function setRunMarkers(map) {
// Adds markers to the map.
// Marker sizes are expressed as a Size of X,Y where the origin of the image
// (0,0) is located in the top left of the image.
// Origins, anchor positions and coordinates of the marker increase in the X
// direction to the right and in the Y direction down.
    var image = {
        url: 'http://i.imgur.com/diXzcgS.png',
        // This marker is 20 pixels wide by 32 pixels high.
        size: new google.maps.Size(20, 32),
        // The origin for this image is (0, 0).
        origin: new google.maps.Point(0, 0),
        // The anchor for this image is the base of the flagpole at (0, 32).
        anchor: new google.maps.Point(12, 30)
    };
    // Shapes define the clickable region of the icon. The type defines an HTML
    // <area> element 'poly' which traces out a polygon as a series of X,Y points.
    // The final coordinate closes the poly by connecting to the first coordinate.
    var shape = {
        coords: [1, 1, 1, 20, 18, 20, 18, 1],
        type: 'poly'
    };
    for (var i = 0; i < runs.length; i++) {
        var run = runs[i];
        var runMarker = new google.maps.Marker({
            position: {lat: run[2], lng: run[3]},
            map: map,
            icon: image,
            shape: shape,
            title: run[0],
            zIndex: run[4]
        });
//        marker.addListener('click', getGPX);
        createInfoWindow(map, runMarker, run);
    }
}

function createInfoWindow(map, runMarker, run) {
    var contentString =
            '<div id="content">' +
            '<div id="siteNotice">' +
            '</div>' +
            '<h2 id="firstHeading" class="firstHeading">Run Name: ' + run[0] + '</h2>' +
            '<h3 id="firstHeading" class="firstHeading">Sport: ' + run[1] + '</h3>' +
            '<div id="bodyContent">' +
            '<button id="play-button-' + run[0] + '">Play Run</button>' +
            '</div>' +
            '</div>';
    var infowindow = new google.maps.InfoWindow({
        content: contentString
    });
    runMarker.addListener('click', function () {
        stopRun();
        activeInfoWindow = infowindow;
        infowindow.open(map, runMarker);
        map.setCenter(runMarker.getPosition());
        map.setZoom(17);
        var activePolyLine = initRunPlayback(map, run, activeInfoWindow);
    });
}

function stopRun() {
    var video = document.querySelector("#video");
    if (video) {
        video.pause();
        var source = document.getElementById('source');
        source.setAttribute('src', '');
        video.load();
    }
    if (activeInfoWindow) {
        activeInfoWindow.close();
    }
    clearMap();
}

function initRunPlayback(map, run, activeInfoWindow) {
    var points = [];
    var url = 'data/' + run[0] + '.gpx';
    $.ajax({
        type: "GET",
        url: url,
        dataType: "xml",
        success: function (xml) {
            var bounds = new google.maps.LatLngBounds();
            $(xml).find("trkpt").each(function () {
                var lat = $(this).attr("lat");
                var lon = $(this).attr("lon");
                var children = ($(this).children());
                var time = children[1].childNodes[0].nodeValue;
                var elevation = children[0].childNodes[0].nodeValue;
                var p = new google.maps.LatLng(lat, lon, time, elevation);
                points.push(p);
                bounds.extend(p);
            });
            activePolyline = plotRun(map, points, bounds);
            var button = document.getElementById('play-button-' + run[0]);
            $(button).click(function () {
                activeInfoWindow.close();
                if ($('#video')) {
                    removeVideo();
                }
                ;
                initVideo(map, run, points, activePolyline);
            });
        }
    });
    return activePolyline;
}

function plotRun(map, points, bounds) {
    var lineSymbol = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        strokeColor: '#e20613'
    };
    var path = new google.maps.Polyline({
        // use your own style here
        path: points,
        strokeColor: "#e20613",
        strokeOpacity: .7,
        strokeWeight: 4
    });
    marker = new google.maps.Marker({
        position: new google.maps.LatLng(points[0].lat, points[0].lng),
        map: map,
        title: 'marker!'
    });
    path.setMap(map);
    // fit bounds to track
    map.fitBounds(bounds);
    return path;
}

function clearMap() {
    if (marker) {
        marker.setMap(null);
    }
    if (activePolyline) {
        activePolyline.setMap(null);
    }
}

function initVideo(map, run, points, activePolyline) {
    $('#playerContainer').append('<video id="video" controls="" poster="img/placeholder/videoplachold.png"><source id="source" src="" type="video/webm"></video>');
    var video = document.getElementById('video');
    var source = document.getElementById('source');
    var path = 'video/' + run[0] + '.MP4';
    source.setAttribute('src', path);
    video.load();
    createVTT(map, points);
    video.play();
}

function removeVideo() {
    $('#video').remove();
}

function createVTT(map, points) {//Only works properly if the points are recorded 1 second apart. 
    //TODO: make it so it calculates it off the tracks timestamp
    var video = document.getElementById('video');
    var track;
//    track = $(video).append('<track kind="metadata" label="gps" srclang="en">');
    track = video.addTextTrack('metadata', 'gps', 'en');
    track.mode = 'hidden';
    //loop through points array
    //Create VTT track with GPS coordinates VS time
    for (var i = 0; i <= points.length; ++i) {
        var point = points[i];
        var cueStartTime = i;
        var cueEndTime = i + 1;
        track.addCue(new (window.VTTCue || window.TextTrackCue)(cueStartTime, cueEndTime, JSON.stringify(point)));
    }
    moveMarker(map, video);
}

function moveMarker(map, video) {
    var textTrack = video.textTracks[0];
    textTrack.oncuechange = function (event) {
        var cue = this.activeCues[0];
        if (typeof cue === 'undefined') {// escape function if cue isnt defined & wait for the next cue
            return;
        }
        //Parse the cue into a JSON object if defined
        var point = JSON.parse(cue.text);
        //use the object created from the cue to create a google maps latlng object
        var newLatLng = new google.maps.LatLng(point.lat, point.lng);
//        if (!map.getBounds().contains(newLatLng)) {
//            map.setCenter(newLatLng);
//        }
        //get old marker position
        var oldLatLng = marker.getPosition();
        //set new marker position
        marker.setPosition(newLatLng);
    };
}