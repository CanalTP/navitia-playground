function getTextColor(json) {
    if ('text_color' in json) {
        return '#' + json['text_color'];
    }
    if ('color' in json) {
        var c = json.color;
        function toNum(i) { return +('0x' + c.slice(i, i + 2)); }
        var grey = 0.21 * toNum(0) + 0.72 * toNum(2) + 0.07 * toNum(4)
        if (grey < 128) {
            return 'white';
        }
    }
    return 'black';
}

function setColors(elt, json) {
    if ('color' in json) {
        elt.css('background-color', '#' + json.color);
        elt.css('color', getTextColor(json));
    }
}

function defaultSummary(json) {
    var result = $('<span/>');
    if ('label' in json) {
        result.text(json['label']);
    } else if ('code' in json) {
        result.text(json['code']);
    }else if ('name' in json) {
        result.text(json['name']);
    } else if ('id' in json) {
        result.text(json['id']);
    }
    setColors(result, json);
    return result;
}

function responseSummary(json) {
    if (! json) {
        return 'Error: response is not JSon';
    }
    if ('message' in json) {
        return 'Message: {0}'.format(htmlEncode(json.message));
    }
    if ('error' in json && json.error && 'message' in json.error) {
        return 'Error: {0}'.format(htmlEncode(json.error.message));
    }
    var result = '';
    var key = responseCollectionName(json);
    if (key) {
        result = result + ' {0}&nbsp;{1} '.format(json[key].length, key);
    }
    if ('pagination' in json) {
        var p = json.pagination;
        var first_number = p.start_page * p.items_per_page + 1;
        result = result + '({0}-{1} of {2}&nbsp;results)'.format(
            first_number,
            first_number + p.items_on_page - 1,
            p.total_result);
    }
    return result;
}

function formatDatetime(datetime) {
    var formated = datetime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
                                    '$1-$2-$3 $4:$5:$6');
    if (formated.slice(-2) == '00') {
        return formated.slice(0, -3);
    } else {
        return formated;
    }
}

function formatTime(datetime) {
    return formatDatetime(datetime).split(' ')[1];
}

function makeLineCode(display_informations) {
    var elt = $('<span>')
        .addClass('line_code')
        .append(display_informations.code);
    setColors(elt, display_informations);
    return elt;
}

function journeySummary(json) {
    var res = $('<span>').append(formatTime(json.departure_date_time));
    function add(s) {
        res.append(' > ');
        res.append(s);
    }

    if ('sections' in json) {
        json.sections.forEach(function(s) {
            switch (s.type) {
            case "transfer":
            case "waiting":
            case "crow_fly":
                break;
            case "street_network": add(s.mode); break;
            case "public_transport":
                add(makeLineCode(s.display_informations));
                break;
            default: add(s.type); break;
            }
        });
    } else {
        // isochron
        add(summary('place', json.from));
        add('{0} transfer(s)'.format(json.nb_transfers));
        add(summary('place', json.to));
    }

    add(formatTime(json.arrival_date_time));
    res.append(', duration: ' + durationToString(json.duration));
    return res;
}

function linksSummary(json) {
    var token = URI(window.location).search(true)["token"];
    var res = $('<span>');
    function makeHref(href) {
        var res = '?request={0}'.format(href.encodeURI());
        if (token) {
            res += '&token={0}'.format(token.encodeURI());
        }
        return res;
    }
    function makeData(link) {
        var res = link.type;
        if (link.templated) {
            res = '{{0}}'.format(res);
        }
        return res;
    }
    if ($.isArray(json)) {
        json.forEach(function(link) {
            res.append(' ')
                .append($('<a>').attr('href', makeHref(link.href)).html(makeData(link)));
        });
    } else {
        res.append('Links is not an array!');
    }
    return res;
}

function embeddedSummary(json) {
    return $('<span>')
        .text(json.embedded_type)
        .append(': ')
        .append(summary(json.embedded_type, json[json.embedded_type]));
}

function sectionSummary(section) {
    var res = $('<span>');
    var pt = false;

    switch (section.type) {
    case 'street_network': res.append(section.mode); break;
    case 'transfer': res.append(section.transfer_type); break;
    case 'public_transport':
        pt = true;
        res.append(makeLineCode(section.display_informations));
        break;
    default: res.append(section.type); break;
    }

    if ('from' in section) {
        res.append(' from {0}'.format(htmlEncode(section.from.name)));
    }
    if (pt) {
        res.append(' at {0}'.format(formatTime(section.departure_date_time)));
    }
    if ('to' in section) {
        res.append(' to {0}'.format(htmlEncode(section.to.name)));
    }
    if (pt) {
        res.append(' at {0}'.format(formatTime(section.arrival_date_time)));
    }
    if ('duration' in section) {
        res.append(' during {0}'.format(durationToString(section.duration)));
    }
    return res;
}

function regionSummary(json) {
    var summary = {regions: []};
    json.regions.forEach(function (r){
        var name = r.name ? r.id + " ({0})".format(r.name) : r.id;
        summary.regions.push({name: name, id: r.id});
    });
    return summary;
}

function summary(type, json) {
    switch (type) {
    case 'response': return responseSummary(json);
    case 'journey': return journeySummary(json);
    case 'links': return linksSummary(json);
    case 'pt_object':
    case 'place':
        return embeddedSummary(json);
    case 'section': return sectionSummary(json);
    case 'coverage' : return regionSummary(json);
        // insert here your custom summary
    default: return defaultSummary(json);
    }
}
