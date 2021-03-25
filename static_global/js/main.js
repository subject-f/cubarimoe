function parse(e) {
let search = document.getElementById('search');
let sbox = document.querySelector('.search-box');
let text = search.value;
let result = '';
let error = '';
	message('')
	switch(true) {
		case /imgur/.test(text):
			result = /(\/)([A-Z0-9a-z]{7})/.exec(text);
			if(!result || !result[2]) return message('Reader could not understand the url.', 1)
			result = '/read/imgur/' + result[2] + '/1/1';
			break;
		case /git\.io/.test(text):
			result = /(git.io\/)(.*)/.exec(text);
			if(!result || !result[2]) return message('Reader could not understand the url.', 1)
			result = '/read/gist/' + result[2];
			break;
		case (/nhentai/.test(text) || /\b[0-9]{6}\b/.test(text)):
			result = /(\b[0-9]{6}\b)/.exec(text);
			if(!result || !result[0]) return message('Reader could not understand the url.', 1)
			result = '/read/nhentai/' + result[0];
			break;
		default:
			return message('Reader could not understand the given link.', 1)
			break;
	}
	if(result) {
		sbox.classList.add('spin');
		fetch(location.origin + result)
		.then(response => {
			if(response.status != 200) {
				setTimeout(() => {
				let spin = getComputedStyle(sbox.children[0]).transform;
					sbox.classList.remove('spin');
					setTimeout(() => {
						sbox.children[0].style.transform = spin;
						setTimeout(() => {
							sbox.children[0].style.transform = '';
						}, 1);
					}, 1);
				}, 1);
				return message('Failed loading the proxy for the given URL.', 1);
			}
			location.href = location.origin + result;
		})
	}
}

function message(message, type) {
	document.getElementById('status').innerText = message;
	if(type === 0) {
		document.getElementById('status').classList.add('green');
		document.getElementById('status').classList.remove('red');
	}else if (type === 1){
		document.getElementById('status').classList.add('red');
		document.getElementById('status').classList.remove('green');
	}else{
		document.getElementById('status').classList.remove('green');
		document.getElementById('status').classList.remove('red');
	}
}

document.getElementById('search').addEventListener('keyup', e => {
	if(e.key == "Enter") {
		parse();
	}
});
document.getElementById('search-button').addEventListener('click', parse);