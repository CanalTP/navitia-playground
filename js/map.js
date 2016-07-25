// Copyright (c) 2016 CanalTP
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var map = {
    DrawSectionOption: {
        DRAWSTART: 2, // 10
        DRAWEND: 1, // 01
        DRAWBOTH: 3, // 11
        DRAWNEITHER: 0 // 00
    },
    _should_draw_section_start: function(option) {
        return option & 2;
    },
    _should_draw_section_end: function(option) {
        return option & 1;
    },
    STARTTEXT : 'Start',
    ENDTEXT : 'End',
    makeFeatures: {
        region: function(context, json) {
            if (json.shape) {
                var geoJsonShape = wkt2geojson(json.shape);
                return map._makePolygon(context, 'region', geoJsonShape, json, {color : '008ACA'});
            }
            return [];
        },
        section: function(context, json, draw_section_option) {
            var color = json.display_informations;
            switch (json.type) {
            case 'street_network':
                switch (json.mode) {
                case 'bike': color = map.bikeColor; break;
                case 'car': color = map.carColor; break;
                case 'walking': color = map.walkingColor; break;
                }
                break;
            case 'transfer':
                switch (json.transfer_type) {
                case 'guaranteed': color = map.carColor; break;
                case 'extension': color = map.bikeColor; break;
                case 'walking': color = map.walkingColor; break;
                }
                break;
            }
            if (draw_section_option === undefined) {
                draw_section_option = map.DrawSectionOption.DRAWBOTH;
            }
            return map._makeString(context, 'section', json, color)
                .concat(map._makeStopTimesMarker(context, json, color, draw_section_option));
        },
        line: function(context, json) {
            return map._makeString(context, 'line', json, json);
        },
        journey: function(context, json) {
            if (! ('sections' in json)) { return []; }
            var bind = function(s, i, array) {
                var draw_section_option = map.DrawSectionOption.DRAWNEITHER;
                if ( i === 0) { draw_section_option |= map.DrawSectionOption.DRAWSTART; }
                if ( i === (array.length -1) ) { draw_section_option |= map.DrawSectionOption.DRAWEND; }
                return map.makeFeatures.section(context, s, draw_section_option);
            };
            return flatMap(json.sections, bind);
        },
        isochrone: function(context, json) {
            if (! ('geojson' in json)) { return []; }
            var color = context.min_duration_color[json.min_duration];
            return map._makePolygon(context, 'isochrone', json.geojson, json, color);
        },
        address: function(context, json) {
            return map._makeMarker(context, 'address', json);
        },
        administrative_region: function(context, json) {
            return map._makeMarker('administrative_region', json);
        },
        stop_area: function(context, json) {
            return map._makeMarker(context, 'stop_area', json);
        },
        stop_point: function(context, json) {
            return map._makeMarker(context, 'stop_point', json);
        },
        place: function(context, json) {
            return map._makeMarker(context, 'place', json);
        },
        poi: function(context, json) {
            return map._makeMarker(context, 'poi', json);
        },
        response: function(context, json) {
            var key = responseCollectionName(json);
            if (key === null) {
                return [];
            }
            var type = getType(key);
            if (!(type in map.makeFeatures)) {
                return [];
            }
            var bind = function(s) {
                return map.makeFeatures[type](context, s);
            };
            return flatMap(json[key], bind);
        }
    },

    hasMap: function(context, type, json) {
        return map.getFeatures(context, type, json).length !== 0;
    },

    getFeatures: function(context, type, json) {
        if (! (map.makeFeatures[type] instanceof Function)) { return []; }
        try {
            return map.makeFeatures[type](context, json);
        } catch (e) {
            console.log(sprintf('map.makeFeatures[%s] thows an exception:', type));
            console.log(e);
            return [];
        }
    },

    run: function(context, type, json) {
        var div = $('<div/>');
        // setting for default path of images used by leaflet
        L.Icon.Default.imagePath='lib/img/leaflet/dist/images';
        var features = [];
        if ((features = map.getFeatures(context, type, json)).length) {
            div.addClass('leaflet');
            var m = L.map(div.get(0)).setView([48.843693, 2.373303], 13);
            L.tileLayer('//stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png', {
	        attribution: 'Map tiles by ' +
                    '<a href="http://stamen.com">Stamen Design</a>, under ' +
                    '<a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ' +
                    'Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under ' +
                    '<a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.',
                maxZoom: 18
            }).addTo(m);
            var overlay = L.featureGroup(features).addTo(m);
            setTimeout(function() {
                m.invalidateSize();
                m.fitBounds(overlay.getBounds());
            }, 100);
        } else {
            div.addClass('noMap');
            div.append('No map');
        }
        return div;
    },

    _makeMarker: function(context, type, json, colorJson, useCustomMarker, label) {
        var lat, lon;
        var obj = json;
        switch (type){
            case 'stop_date_time':
                obj = json.stop_point;
                lat = obj.coord.lat;
                lon = obj.coord.lon;
                break;
            case 'place':
                lat = json[json.embedded_type].coord.lat;
                lon = json[json.embedded_type].coord.lon;
                break;
            default:
                lat = json.coord.lat;
                lon = json.coord.lon;
        }
        var sum = summary.run(context, type, json);
        var t = type === 'place' ? json.embedded_type : type;
        var marker;
        if (! useCustomMarker) {
            marker = L.marker([lat, lon]);
        } else {
            var color = '#000000';
            if (colorJson  && colorJson instanceof Object && colorJson.color) {
                color = '#' + colorJson.color;
            }
            marker = L.circleMarker([lat, lon], {color: color, opacity: 1, fillColor: 'white', fillOpacity: 1});
            marker.setRadius(5);
        }
        if (label) {
            marker.bindLabel(label, {noHide: true, className: 'map-marker-label'});
        }
        return [marker.bindPopup(map._makeLink(context, t, obj, sum)[0])];
    },

    bikeColor: { color: 'CED480' },
    carColor: { color: 'EFBF8F' },
    walkingColor: { color: '89C6E5' },

    _makeString: function(context, type, json, colorJson) {
        if (! ( "geojson" in json) || ! json.geojson.coordinates.length) {
            return [];
        }
        if (! (colorJson instanceof Object) || ! (colorJson.color)) {
            colorJson = { color: '000000' };
        }
        var sum = summary.run(context, type, json);
        return [
            L.geoJson(json.geojson, {
                style: {
                    color: getTextColor(colorJson),
                    weight: 6,
                    opacity: 1
                }
            }),
            L.geoJson(json.geojson, {
                style: {
                    color: "#" + colorJson.color,
                    weight: 5,
                    opacity: 1
                }
            }).bindPopup(sum)
        ];
    },
    _makeStopTimesMarker: function(context, json, color, draw_section_option) {
        var stopTimes = json['stop_date_times'];
        var markers = [];

        if (stopTimes) {
            // when section is PT
            stopTimes.forEach(function(st, i) {
                var label = null;
                if (i === 0 &&
                    map._should_draw_section_start(draw_section_option)) {
                    label = map.STARTTEXT;
                }else if (i === (stopTimes.length -1 ) &&
                          map._should_draw_section_end(draw_section_option)) {
                    label = map.ENDTEXT;
                }
                markers = markers.concat(map._makeMarker(context, 'stop_date_time', st, color, true, label));
            });
        } else {
            // when section is Walking
            var from = json.from;
            var to = json.to;
            if (! from || ! to) { return markers; }
            var label_from = null;
            var label_to = null;
            if (map._should_draw_section_start(draw_section_option)) {
                label_from = map.STARTTEXT;
            }
            if (map._should_draw_section_end(draw_section_option)) {
                label_to = map.ENDTEXT;
            }
            markers = markers.concat(map._makeMarker(context, 'place', from, color, true, label_from))
                             .concat(map._makeMarker(context, 'place', to, color, true, label_to));
        }
        return markers;
    },
    _makePolygon: function(context, type, geoJsonCoords, json, colorJson) {
        var sum = summary.run(context, type, json);
        // TODO use link when navitia has debugged the ticket NAVITIAII-2133
        var link = map._makeLink(context, type, json, sum)[0];
        return [
            L.geoJson(geoJsonCoords, {
                color:  '#555555',
                opacity: 1,
                weight: 0.5,
                fillColor:  '#' + colorJson.color,
                fillOpacity: 0.25
            }).bindPopup(link)
        ];
    },
    _makeLink: function(context, type, obj, name) {
        return context.makeLink(type, obj, name);
    }
};
