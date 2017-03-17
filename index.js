var panorama = null;
var partition = 22.5;
var pov = {
    heading: 270,
    pitch: 0
}
var routes = {
    N: null,
    NE: null,
    NW: null,
    S: null,
    SE: null,
    SW: null,
    E: null,
    W: null,
}

// WebRTC (SkyWay)
var id;
var peer = new Peer({ key: "XXXXXX-XXXXXXXXXXXX-XXXXXXX" });

var connection = null;
var type = null;
var count = 0;
var interval = Date.now();

peer.on('open', function (id) {
    var dom = document.getElementById('id');
    dom.innerHTML = id;
});

peer.on('connection', function (conn) {
    connection = conn;

    var row = 'not a number';
    var dom = document.getElementById('id');
    dom.innerHTML = dom.innerHTML + '<- connect ->' + conn.peer;

    conn.on('data', function (data) {
        console.log('recive', data);

        if(data === 'M'){
            goM();
        }else if(data === 'G'){
            goG();
        }else if(data === 'H'){
            goH();
        }

        // Array = view mode
        if (Array.isArray(data)) {

            var x = data[0];
            var y = data[1];
            var z = data[2];
            var x_view = 0;
            var y_view = 0;

            if (x > 0) {
                x_view = -1;
            } else if (x > 5) {
                x_view = -3;
            } else if (x < -5) {
                x_view = 3;
            } else {
                x_view = 1;
            }

            if (y > 3) {
                y_view = 3;
            } else if (y < -2) {
                y_view = -3;
            }

            view(x_view, y_view);

        } else {
            // move
            console.log(data);
            if (type === data) {
                count++;
            } else {
                type = data;
            }

            if (type < 10) {
                type = null;
                return;
            }

            if ((Date.now() - interval) < 1000) {
                return;
            } else {
                move(routes[type], type);
                interval = Date.now();
            }
        }
    });

    conn.on('close', function () {
        connection = null;
    })

    conn.on('error', function () {
        connection = null;
    });
});

function move(pano_info) {
    console.log('move', pano_info);
    if (!pano_info) {
        return;
    }

    var pano_id = pano_info[0];
    var x = Math.floor(pano_info[1]) -  pov.heading;
    // pov.heading = Math.floor(pano_info[1]);

    // console.log(pov.heading);

    panorama.setPano(pano_id);

    view(x, 0);


    console.log('panorama', panorama.getPov().heading);
}

function view(x, y) {
    pov.heading = pov.heading + x;
    pov.pitch = pov.pitch + y;

    if (pov.heading < 0) {
        pov.heading = 360;
    } else if (pov.heading > 360) {
        pov.heading = 0;
    }

    if (pov.pitch > 90) {
        pov.pitch = 90;
    } else if (pov.pitch < -90) {
        pov.pitch = -90;
    }

    panorama.setPov({
        heading: pov.heading,
        pitch: pov.pitch
    });

    routine();
}

var latlng;

// Google Maps API v3
function initPano() {

    if(!latlng){
        panorama = new google.maps.StreetViewPanorama(
            document.getElementById('pano'), {
                position: { lat: 45.4634984, lng: 9.1885056 },
                pov: {
                    heading: pov.heading,
                    pitch: pov.pitch
                },
                visible: true
            });
    }else{
        panorama = new google.maps.StreetViewPanorama(
            document.getElementById('pano'), {
                position: latlng,
                pov: {
                    heading: pov.heading,
                    pitch: pov.pitch
                },
                visible: true
            });
            latlng = null;
    }


    // パノラマ画像変更イベント
    panorama.addListener('pano_changed', function () {
        // var panoCell = document.getElementById('pano-cell');
        // panoCell.innerHTML = panorama.getPano();
        routine();
    });

    // リンク変更イベント
    panorama.addListener('links_changed', function () {
        // main
        routine();

        for (key in routes) {
            if (routes[key])
                console.log(key, ' : ', routes[key]);
        }
    });

    // 座標変更イベント
    panorama.addListener('position_changed', function () {
        var dom = document.getElementById('place_name');
        console.log(panorama);
        dom.innerHTML = panorama.location.description;
    });

    // 視点情報変更イベント
    panorama.addListener('pov_changed', function () {
        // 視点情報格納
        pov.heading = panorama.getPov().heading;
        pov.pitch = panorama.getPov().pitch;

        console.log('chheck', panorama.getPov().heading);
        console.log('cahnge', pov.heading);

        routine();
    });
}

function routine() {
    console.log('routine');
    var command = document.getElementById("command");
    command.innerHTML = '行き先方向：';

    var links = panorama.getLinks();

    console.log(links);

    for (var key in routes) {
        routes[key] = null;
    }

    for (var i in links) {
        var pano_id = links[i].pano;
        var heading = links[i].heading;

        var pov_tune = heading + (360 - pov.heading);

        if (pov_tune < 0) {
            pov_tune = 360 + pov_tune;
        }

        var direction = pov_tune / partition;

        if (16 < direction || direction < 2) {
            // console.log('北');
            routes.N = [pano_id, pov_tune];
            command.innerHTML = command.innerHTML + '　↑';
        } else if (2 <= direction && direction <= 4) {
            // console.log('北東');
            routes.NE = [pano_id, pov_tune];
            command.innerHTML = command.innerHTML + '　↗';
        } else if (4 < direction && direction < 6) {
            // console.log('東');
            routes.E = [pano_id, pov_tune];
            command.innerHTML = command.innerHTML + '　→';
        } else if (6 <= direction && direction <= 8) {
            // console.log('南東');
            routes.SE = [pano_id, pov_tune];
            command.innerHTML = command.innerHTML + '　↘';
        } else if (8 < direction && direction < 10) {
            // console.log('南');
            routes.S = [pano_id, pov_tune];
            command.innerHTML = command.innerHTML + '　↓';
        } else if (10 <= direction && direction <= 12) {
            // console.log('南西');
            routes.SW = [pano_id, pov_tune];
            command.innerHTML = command.innerHTML + '　↙';
        } else if (12 < direction && direction < 14) {
            // console.log('西');
            routes.W = [pano_id, pov_tune];
            command.innerHTML = command.innerHTML + '　←';
        } else if (14 <= direction && direction <= 16) {
            // console.log('北西');
            routes.NW = [pano_id, pov_tune];
            command.innerHTML = command.innerHTML + '　↖';
        } else {
            throw new URIError('異常入力');
        }
    }

    for(var i in routes){
        console.log(routes[i]);
    }
}
function goH(){
        latlng = {lat: 35.6691201, lng: 139.7058862},
        initPano();
}
$('#H').click(goH);

function goG(){
    latlng = {lat: 37.8283483, lng: -122.4795538},
    initPano();
}
$('#G').click(goG);

function goM(){
    latlng = { lat: 45.4634984, lng: 9.1885056 },
    initPano();
}

// $("form#move").submit(function (e) {
//     e.preventDefault();

//     var place = $(this).find("input[name=place]").val();
//     var geocoder = new google.maps.Geocoder();

//     geocoder.geocode({
//         address: place
//     }, function (results, status) {
//         if (status == google.maps.GeocoderStatus.OK) {

//             // 結果の表示範囲。結果が１つとは限らないので、LatLngBoundsで用意。
//             var bounds = new google.maps.LatLngBounds();

//             for (var i in results) {
//                 if (results[i].geometry) {

//                     // 緯度経度を取得
//                     var latlng = results[i].geometry.location;
//                     panorama = new google.maps.StreetViewPanorama(
//                         document.getElementById('pano'), {
//                             position: latlng,
//                             pov: {
//                                 heading: pov.heading,
//                                 pitch: pov.pitch
//                             },
//                             visible: true
//                         });

//                     routine();
//                     return;
//                 }
//             }
//         }
//     });
// });
