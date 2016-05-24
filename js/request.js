function makeDeleteButton() {
    return $('<button/>')
        .addClass('delete')
        .click(function() { $(this).closest('.toDelete').remove(); updateUrl(this); })
        .text('x');
}

function insertRoute(val) {
    var currentRoute = $('.route', $(val).parent());
    var posRoute = getRouteInputPos(val);
    var currentRouteValue = currentRoute.val();
    $(val).parent().after(makeRoute('', currentRouteValue, posRoute));
}

function makeTemplatePath(val, currentRouteValue, input) {
    input.addClass('templateInput')
         .blur(function() { this.value = (this.value=='')? val:this.value;})
         .keyup(function(){ updateUrl(this); })
         .focusout(function() { if (isTemplate($(this).val()) || (!$(this).val())) { $(this).addClass('templateInput'); } else { $(this).removeClass('templateInput'); } })
    if (currentRouteValue == 'coverage') {
        input.focus(function(){ routeValOnFocus(this); this.value=''; })
             .val(val);
    } else { input.focus(function(){ updateUrl(this); this.value=''; } )}
}

function makeRoute(val, currentRouteValue, pos) {
    var input = $('<input/>').focus(function(){ routeValOnFocus(this); })
                             .keyup(function(){ updateUrl(this); })
                             .attr('type', 'text')
                             .addClass('route')
                             .val(val);
    if (isTemplate(val)) { makeTemplatePath(val, currentRouteValue, input); }
    var res = $('<span/>')
        .addClass('toDelete')
        .addClass('routeElt')
        .append(' ')
        .append($('<span/>')
                .addClass('pathElt')
                .append(input)
                .append(makeDeleteButton()))
        .append('<button class="add" onclick="insertRoute(this)">+</button>');
    var isObjectId = pos % 2;
    makeRouteAutocomplete(currentRouteValue, input, isObjectId);
    return res;
}

function routeValOnFocus(valInput) {
    var prevVal = $('.route', $(valInput).closest('.toDelete.routeElt').prev()).val();
    var posRoute = getRouteInputPos(valInput);
    var isObjectId = posRoute % 2;
    makeRouteAutocomplete(prevVal, $(valInput), isObjectId);
    updateUrl(valInput);
}

function makeParam(key, val) {
    var res = $('<span/>')
        .addClass('param')
        .addClass('toDelete')
        .append(' ');

    res.append($('<input/>')
        .attr('type', 'text')
        .addClass('key')
        .val(key)
        .focus(function(){ updateUrl(this); })
        .keyup(function(){ updateUrl(this); }));

    var valueElt = $('<input/>')
         .attr('type', 'text')
        .addClass('value')
        .val(val)
        .focus(function(){ paramsValOnFocus(this); })
        .keyup(function(){ updateUrl(this); });

    if (isPlaceType(key)) {
        makeAutocomplete(valueElt);
    }else if (isDatetimeType(key)) {
        makeDatetime(valueElt);
    }
    res.append(valueElt);
    res.append(makeDeleteButton());
    return res;
}

function paramsValOnFocus(valInput){
    var key = $(valInput).prev().val();

    if (isPlaceType(key)) {
        makeAutocomplete(valInput);
    }else if (isDatetimeType(key)) {
        makeDatetime(valInput);
    } else if (isAutoCompleteInput($(valInput)) ||
               isDatePicker($(valInput))) {

        var newElt = $('<input/>')
            .addClass('value')
            .attr('type', 'text')
            .val($(valInput).val())
            .keyup(function(){ updateUrl(this); })
            .focus(function(){ paramsValOnFocus(this); });
        $(valInput).replaceWith(newElt);
        newElt.focus();
        valInput = newElt;
    }
    updateUrl(valInput);
}
function insertParam() {
    $("#parameterList").append(makeParam('', ''));
}

function getFocusedElemValue(elemToTest, focusedElem, noEncoding) {
    if (focusedElem == elemToTest) {
        return '<span class="focus_params" style="color:red">{0}</span>'
            .format(noEncoding ? elemToTest.value : elemToTest.value.encodeURI());
    }
    return noEncoding ? elemToTest.value : elemToTest.value.encodeURI();
}

function makeRouteAutocomplete(currentRouteValue, input, isObjectId) {
    if (isUndefined(currentRouteValue)) {
        // first route input
        $(input).autocomplete({source: autocompleteTree.routeTree.undefined,
            minLength: 0,
            scroll: true,
            delay: 500}).focus(function() {
                $(this).autocomplete("search", '');
            });
    } else if (! isObjectId) {
        // TODO: better way to do this?
        var prevType = $('.route', $(input).closest('.toDelete.routeElt').prev().prev()).val();
        var source = autocompleteTree.routeTree[prevType];
        source  = (! isUndefined(source)) ? source :  autocompleteTree.routeTree.all;
        $(input).autocomplete({source: source,
            minLength: 0,
            scroll: true,
            delay: 500}).focus(function() {
                $(this).autocomplete("search", '');
            });
    }else if (isObjectId) {
        if (staticAutocompleteTypes.indexOf(currentRouteValue) > -1){
            staticAutocomplete(input, currentRouteValue);
        } else if(dynamicAutocompleteTypes.indexOf(currentRouteValue) > -1){
            dynamicAutocomplete(input, currentRouteValue);
        }
    }
}

function finalUrl(focusedElem) {
    var finalUrl = getFocusedElemValue($('#api input.api')[0], focusedElem, true);
    $("#Meppath input.route").each(function(){
        finalUrl += '/' + getFocusedElemValue(this, focusedElem);
    });

    finalUrl += '?';

    $('#parameters input.key, #parameters input.value').each(function(){
        finalUrl += getFocusedElemValue(this, focusedElem);
        if ($(this).hasClass('key')) {
            finalUrl += '=';
        }
        if ($(this).hasClass('value')) {
            finalUrl += '&';
        }
    });
    return finalUrl;
}

function submit() {
    var token = $('#token input.token').val();
    var f = finalUrl(); // finalUrl can be called without any args
    window.location = '?request={0}&token={1}'.format(f.encodeURI(), token.encodeURI());
}

function updateUrl(focusedElem) {
    var f = finalUrl(focusedElem);
    $('#urlDynamic span').html(f);
}

function getCoverage() {
    var prevIsCoverage = false;
    var coverage = null;
    var covElt = $("#Meppath input.route").each(function() {
        if (prevIsCoverage) {
            coverage = $(this).val();
        }
        prevIsCoverage = $(this).val() == 'coverage';
    });
    return coverage;
}

function makeAutocomplete(elt) {
    $(elt).autocomplete({
        source: function(request, response) {

            var token = $('#token input.token').val();
            var url = $('#api input.api').val();
            var cov = getCoverage();
            if (cov !== null) {
                url = '{0}/coverage/{1}'.format(url, cov);
            }
            $.ajax({
                url: '{0}/places?q={1}'.format(url, request.term.encodeURI()),
                headers: isUndefined(token) ? {} : { Authorization: "Basic " + btoa(token) },
                success: function(data) {
                    var res = [];
                    if ('places' in data) {
                        data['places'].forEach(function(place) {
                            res.push({ value: place.id, label: place.name });
                        });
                    }
                    response(res);
                },
                error: function() {
                    response([]);
                }
            });
        },
    });
}

function makeDatetime(elt) {
    $(elt).datetimepicker({
        dateFormat: 'yymmdd',
        timeFormat: 'HHmmss',
        timeInput: true,
        separator: 'T',
        controlType: 'select',
        oneLine: true,
    });
}

function parseUrl() {
    var search = new URI(window.location).search(true);
    var request = search['request'];
    if (isUndefined(request)) { return null; }

    var req_uri = new URI(request);
    var api = req_uri.origin();
    var paths = req_uri.path().split('/');
    paths = paths.length == 1 ? [] : paths.slice(1);
    var api_path = [];

    var vxxFound = false;
    paths.forEach(function(r) {
        if (!r) { return; }
        if (vxxFound) {
            api_path.push(r.decodeURI());
        } else {
            api += '/' + r.decodeURI();
            vxxFound = /^v\d+$/.test(r);
        }
    });

    var params = req_uri.search(true);

    var token = search['token'];
    if (isUndefined(token)) { token = getTokenFromStorage(api); }

    return {
        token: token,
        request: request,
        api: api,
        path: api_path,
        query: isUndefined(params) ? {} : params
    };
}

$(document).ready(function() {
    var request = parseUrl();
    if (request === null) { return; }
    if (isUndefined(request.token)) { request.token = ''; }
    $("#token input.token").attr('value', request.token);
    $("#urlFormToken").attr('value', request.token);
    $("#api input.api").attr('value', request.api);
    var pos = 0;
    request.path.forEach(function(r) {
        var currentRouteValue = $('#route span .route').last().val();
        $("#route").append(makeRoute(r, currentRouteValue, pos));
        ++pos;
    });

    var param_elt = $("#parameterList");
    for (var key in request.query) {
        var value = request.query[key];
        // a list of params, ex.: forbidded_uris[]
        if (Array.isArray(value)) {
            value.forEach(function(v){
                param_elt.append(makeParam(key.decodeURI(), v.decodeURI()));
            });
        } else {
            param_elt.append(makeParam(key.decodeURI(), value));
        }
    }
    $('#urlDynamic span').html(request.request);
});
