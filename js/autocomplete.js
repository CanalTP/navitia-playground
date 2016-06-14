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

var _paramValueEverywhere = ['depth', 'count', 'forbidden_uris[]', 'filter'];
var _collections = ['addresses', 'commercial_modes', 'companies', 'coord', 'coverage', 'disruptions', 'lines', 'networks', 'places',
               'poi_types', 'pois', 'physical_modes', 'routes', 'stop_areas', 'stop_points', 'vehicle_journeys'].sort();
var _additionalFeatures = ['departures', 'journeys', 'places_nearby', 'pt_objects', 'route_schedules', 'stop_schedules',
                            'arrivals', 'places'];

// ParamKey
var _depArrParams = ['from_datetime', 'duration', 'data_freshness'].concat(_paramValueEverywhere).sort();
var _schedulesParams = ['from_datetime', 'duration', 'items_per_schedule', 'data_freshness'].concat(_paramValueEverywhere).sort();
var _placesParams = ['q', 'type[]', 'admin_uri[]'].concat(_paramValueEverywhere).sort();

// ParamValue
var _fallbackMode = ['walking', 'car', 'bike', 'bss'].sort();

var autocomplete = {
    autocompleteTree: {
        pathKey: {
            empty : ['coverage', 'places', 'coord'],
            all : _collections,
        },
        features: {
            all: _collections.concat(_additionalFeatures).sort(),
        },
        paramKey: {
            arrivals: _depArrParams,
            coord: _paramValueEverywhere,
            coverage: _paramValueEverywhere,
            departures: _depArrParams,
            journeys: ['from', 'to', 'datetime', 'datetime_represents', 'traveler_type', 'data_freshness',
            'first_section_mode[]', 'last_section_mode[]'].concat(_paramValueEverywhere).sort(),
            lines: _paramValueEverywhere,
            places_nearby: _placesParams.sort(),
            places: _placesParams,
            pois: ['distance'].concat(_paramValueEverywhere).sort(),
            pt_objects: ['q', 'type[]'].concat(_paramValueEverywhere),
            stop_areas: _paramValueEverywhere,
            stop_points: _paramValueEverywhere,
            routes: _paramValueEverywhere,
            route_schedules: _schedulesParams,
            stop_schedules: _schedulesParams,
            empty: _paramValueEverywhere,
        },
        paramValue : {
            traveler_type : ['cyclist', 'luggage', 'wheelchair', 'standard', 'motorist', 'fast_walker', 'slow_walker'].sort(),
            datetime_represents : ['arrival', 'departure'].sort(),
            'first_section_mode[]': _fallbackMode,
            'last_section_mode[]': _fallbackMode,
        }
    },
    apiAutocomplete: function() {
        var input = $("#api input.api");
        var apis = [];
        for (var elt in window.localStorage) {
            if (elt.indexOf(apiStoragePrefix) === 0 ) {
                apis.push({value: elt.slice(apiStoragePrefix.length), desc: elt} );
            }
        }
        autocomplete._customAutocompleteHelper(input, apis,
            {
                select: function (event, ui) {
                    $(input).val(ui.item.value);
                    $("#token input.token").val(window.localStorage.getItem(ui.item.desc));
                }
            });
    },
    valueAutoComplete: function (input, key) {
        if (isDatetimeType(key)) {
            makeDatetime(input);
        } else if (key in this.autocompleteTree.paramValue){
            autocomplete._customAutocompleteHelper(input, this.autocompleteTree.paramValue[key]);
        } else if (this.staticAutocompleteTypes.indexOf(key) > -1) {
            this.staticAutocomplete(input, key);
        } else if (this.dynamicAutocompleteTypes.indexOf(key) > -1) {
            this.dynamicAutocomplete(input, key);
        }
    },
    addKeyAutocomplete: function(input, type) {
        var source;
        if (type === 'pathKey' && ! $('#pathFrame').find('.value').length) {
            source = this.autocompleteTree[type].empty;
        } else if (type === 'paramKey'){
            var feature = $('#featureInput').val();
            source = (this.autocompleteTree[type][feature] || this.autocompleteTree[type].empty).concat(getCustomParamsKey());
        } else {
            source = this.autocompleteTree[type].all;
        }
        source = source || [];
        autocomplete._customAutocompleteHelper(input, source,
            {
                select: function(event, ui) { $(input).val(ui.item.value).change(); }
            });
    },
    staticAutocompleteTypes: ['coverage',
        'physical_modes',
        'poi_types',
    ],
    staticAutocomplete : function (input, staticType){
        var api = $('#api input.api').attr('value');
        var token = $('#token input.token').val();
        var cov = getCoverage();
        var request = '';
        if (staticType === 'coverage') {
            request =  api +  '/coverage/';
        } else {
            request =  api +  '/coverage/' + cov + '/' + staticType;
        }
        $.ajax({
            headers: isUndefined(token) ? {} : { Authorization: 'Basic ' + btoa(token) },
            dataType: 'json',
            url: request,
            success: function(data) {
                var res = [];
                staticType = (staticType==='coverage') ? 'regions' :  staticType;
                data[staticType].forEach(function(elt) {
                    var s = summary.run(new Context(), getType(staticType), elt);
                    res.push({ value: elt.id, label: s.textContent, desc: s });
                });
                res = res.sort(function(a, b) {
                    if (a.label < b.label) { return -1; }
                    if (a.label > b.label) { return 1; }
                    return 0;
                });
                $(input).autocomplete({source: res,
                    minLength: 0,
                    scroll: true,
                    delay: 500
                }).focus(function() {
                    $(input).autocomplete('search', '');
                }).autocomplete('instance')._renderItem = function(ul, item) {
                    return $('<li>').append(item.desc).appendTo(ul);
                };
                if ($(input).is(':focus')) {
                    $(input).autocomplete('search', '');
                }
            },
            error: function(data, status, xhr) {
                notifyOnError(data, 'Autocomplete');
            }
        });
    },
    dynamicAutocompleteTypes: [
        'addresses',
        'administrative_regions',
        'commercial_modes',
        'coord',
        'lines',
        'networks',
        'places',
        'pois',
        'routes',
        'stop_areas',
        'stop_points',
        'from',
        'to',
    ],
    dynamicAutocomplete: function (elt, dynamicType) {
        var formatPtReq = function (v){
            return sprintf('pt_objects/?type[]=%s&q=', v);
        };
        var formatPlacesReq = function (v){
            return sprintf('places/?type[]=%s&q=', v);
        };
        var dynamicTypeRequest = {
            addresses: formatPlacesReq('address'),
            administrative_regions: formatPlacesReq('administrative_region'),
            commercial_modes: formatPtReq('commercial_mode'),
            coord: formatPlacesReq('address'),
            lines: formatPtReq('line'),
            networks: formatPtReq('network'),
            places: 'places/?&q=',
            pois: formatPlacesReq('poi'),
            routes: formatPtReq('route'),
            stop_areas: formatPtReq('stop_area'),
            stop_points: formatPlacesReq('stop_point'),
            from: 'places/?&q=',
            to: 'places/?&q=',
        };
        var httpReq = dynamicTypeRequest[dynamicType];
        if (! httpReq) {
            return;
        }
        $(elt).autocomplete({
            delay: 200,
            source: function (request, response) {
                var token = $('#token input.token').val();
                var url = $('#api input.api').val();
                var cov = getCoverage();
                // cov can be null in case where coverage is not specifeid
                cov = cov ? ('coverage/' + cov) : '';
                $.ajax({
                    url: sprintf('%s/%s/%s%s', url, cov, httpReq, encodeURIComponent(request.term)),
                    headers: isUndefined(token) ? {} : { Authorization: 'Basic ' + btoa(token) },
                    success: function (data) {
                        var res = [];
                        // TODO: use summary
                        var search = null;
                        var type = null;
                        if ('places' in data) {
                            search = data.places;
                            type = 'place';
                        } else if ('pt_objects' in data) {
                            search = data.pt_objects;
                            type = 'pt_object';
                        }
                        if (search) {
                            search.forEach(function(s) {
                                var sum = summary.run(new Context(), type, s);
                                res.push({ value: s.id, label: sum });
                            });
                        }
                        response(res);
                    },
                    error: function(data, status, xhr) {
                        response([]);
                        notifyOnError(data, 'Autocomplete');
                    }
                });
            }
        }).autocomplete('instance')._renderItem = function(ul, item) {
            return $('<li>').append(item.label).appendTo(ul);
        };
    },
    _customAutocompleteHelper: function(input, source, customOptions) {
        var options = {
            source: source,
            minLength: 0,
            scroll: true,
            delay: 500
        };
        if (customOptions) { $.extend(true, options, customOptions); }
        $(input).autocomplete(options).focus(function() {
            $(this).autocomplete('search', '');
        });
    },
}
