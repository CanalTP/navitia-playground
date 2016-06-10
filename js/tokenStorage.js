/* exported localStorageAvailable apiStoragePrefix saveToken getTokenFromStorage*/
/* TODO: Complete the jshint*/

function localStorageAvailable() {
    try {
	var storage = window.localStorage,
	    x = '__storage_test__';
	storage.setItem(x, x);
	storage.removeItem(x);
	return true;
    }
    catch(e) {
	return false;
    }
}

var apiStoragePrefix = 'navitiaPlayground.';

function saveToken(api, token) {
    if (! localStorageAvailable()) { return; }
    if (! token) { return; }
    window.localStorage.setItem(apiStoragePrefix + api, token);
}

function getTokenFromStorage(api) {
    if (! localStorageAvailable()) { return; }
    return window.localStorage.getItem(apiStoragePrefix + api);
}

function saveCustomParamsKey(request){
    var feature = $('#featureInput').val();
    var api = $("#api input.api").val();
    if (! feature || ! autocomplete.autocompleteTree.paramKey[feature]) { return; }
    var currentSavedKeys = getCustomParamsKey()
    for (var key in request.query) {
        if (autocomplete.autocompleteTree.paramKey[feature].indexOf(key) == -1 &&
            currentSavedKeys.indexOf(key) == -1) {
            currentSavedKeys.push(key);
        }
    }
    window.localStorage.setItem(apiStoragePrefix + api + '.' + feature, currentSavedKeys);
}

function getCustomParamsKey(){
    if (! localStorageAvailable()) { return; }
    var feature = $('#featureInput').val();
    var api = $("#api input.api").val();
    var keys = window.localStorage.getItem(apiStoragePrefix + api + '.' + feature);
    return keys ? keys.split(',') : [];
}
