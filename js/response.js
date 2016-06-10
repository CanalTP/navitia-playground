function setStatus(xhr, start_time) {
    var status = sprintf('Status: %s (%s)', xhr.statusText, xhr.status);
    if (typeof start_time === 'number') {
        var duration = new Date().getTime() - start_time;
        status += sprintf(', duration of the request: %sms', duration);
    }
    $('#status').html(status);
}

function responseCollectionName(json) {
    var key = null;
    var notCollectionKeys = ['disruptions', 'links', 'feed_publishers', 'exceptions', 'notes'];
    for (var k in json) {
        if ($.isArray(json[k]) &&
            $.inArray(k, notCollectionKeys) === -1) {
            key = k;
        }
    }
    // disruptions may be an object list only if there is no other object list
    if (key === null && 'disruptions' in json) {
        key = 'disruptions';
    }
    return key;
}

function makeObjectButton(name, handle) {
    // TODO call handle on toggle
    return $('<label>')
        .addClass('objectButton')
        .append($('<input type="checkbox">').change(handle))
        .append($('<span>').html(name));
}

function makeObjectButtonHandle(selector, renderHandle) {
    return function() {
        var div = $(this).closest('div.object').children('div.data').children(selector);
        if ($(this).is(':checked')) {
            div.removeClass('not_filled');
            div.html(renderHandle());
        } else {
            div.addClass('not_filled');
            div.empty();
        }
    };
}

function render(context, json, type, key, idx) {
    var name = key;
    if (typeof idx === 'number') { name += sprintf('[%s]', idx); }
    name = context.makeLink(key, json, name);

    var head = $('<div class="head">');
    head.append($('<div class="name">').html(name));
    head.append($('<div class="summary">').html(summary.run(context, type, json)));
    var button = $('<div class="button">');
    if (extended.hasExtended(context, type, json)) {
        button.append(makeObjectButton('Ext', makeObjectButtonHandle('div.extended', function() {
                    return extended.run(context, type, json);
                })))
    }
    if (map.hasMap(context, type, json)) {
        button.append(makeObjectButton('Map', makeObjectButtonHandle('div.map', function() {
                    return map.run(context, type, json);
                })))
    }
    button.append(makeObjectButton('{ }', makeObjectButtonHandle('div.code', function() {
        return renderjson(json);
    })));
    head.append(button);

    var data = $('<div class="data">')
        .append($('<div class="extended not_filled">'))
        .append($('<div class="map not_filled">'))
        .append($('<div class="code not_filled">'));

    var result = $('<div class="object">');
    result.append(head);
    result.append(data);
    return result;
}

function Context(data) {
    // the token, used to create links
    var token = URI(window.location).search(true).token;

    // the regex corresponding to the thing that should be replacced
    // in a templated link
    var templateRegex = /\{.*\.id\}/;

    // the link map: type -> template
    this.links = {};
    if (data instanceof Object && 'links' in data && $.isArray(data.links)) {
        var self = this;
        data.links.forEach(function(link) {
            if (! link.templated) { return; }
            if (link.type === 'related') { return; }
            if (! link.href.match(templateRegex)) { return; }
            self.links[getType(link.type)] = link.href;
        });
    }

    this.makeHref = function(href) {
        var res = sprintf('?request=%s', encodeURIComponent(href));
        if (token) {
            res += sprintf('&token=%s', encodeURIComponent(token));
        }
        return res;
    };

    this.makeLink = function(k, obj, name) {
        var key = getType(k);
        if (! (key in this.links) || ! ('id' in obj)) {
            return $('<span/>').html(name);
        }
        var href = this.links[key].replace(templateRegex, obj.id);
        return $('<a>').attr('href', this.makeHref(href)).html(name);
    };
}

$(document).ready(function() {
    var request = parseUrl();
    if (request === null) {
        $('#data').html('No request');
        return;
    }
    renderjson.set_show_to_level(3);
    renderjson.set_max_string_length(60);
    renderjson.set_sort_objects(true);
    var start_time = new Date().getTime();
    $.ajax({
        headers: isUndefined(request.token) ? {} : { Authorization: 'Basic ' + btoa(request.token) },
        url: request.request,
        dataType: 'json',
    }).then(
        function(data, status, xhr) {
            setStatus(xhr, start_time);
            $('#data').html(render(new Context(data), data, 'response', 'response'));
            $('#data input').first().click();
            saveToken(request.api, request.token);
            // update the drop list of autocompletion for API
            autocomplete.apiAutocomplete();
            saveCustomParamsKey(request);
        },
        function(xhr, status, error) {
            setStatus(xhr, start_time);
            $('#data').html(render(new Context(), xhr.responseJSON, 'error', 'response'));
            $('#data input').last().click();
            notifyOnError(xhr, 'Response');
        }
    );
});
