function zeroPad(num, len = 2){
	return ( Array(len).join('0') + num ).slice( -len );
}

function getprm(key, url) {
	if (!url) url = window.location.href;
	key = key.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + key + "(=([^&#]*)|&|#|$)"),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}