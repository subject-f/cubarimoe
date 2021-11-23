let mediaMatcher = window.matchMedia("(max-width: 700px)");
let IS_MOBILE = mediaMatcher.matches;
let HAS_LOCALSTORAGE = localStorage !== undefined;

window.addEventListener('resize', () =>{
	IS_MOBILE = mediaMatcher.matches;
});

function LoadHandler(o) {
	o=be(o);
	Linkable.call(this);

	this.parseSCP = function() {
	let url = document.location.pathname.split('/');
	let group = (document.location.hash.match(/#(\d+)/) || [null, null])[1];
		return {
			series: url[url.length - 4],
			chapter: url[url.length - 3].replace('-','.'),
			page: parseInt(url[url.length - 2] - 1),
			group: group
		}
	}

	this.onload = () => {
	var SCP = this.parseSCP();
		API.requestSeries(SCP.series)
			.then(data => {
				Reader.setSCP(SCP);
				Reader.displaySCP(SCP);
			})
	}

	document.addEventListener("DOMContentLoaded", e => this.onload());

}


// function UI_MessageBox(o) {
// 	o=be(o);
// 	UI.call(this, {
// 		node: o.node,
// 		kind: ['MessageBox'].concat(o.kind || []),
// 	});
// 	Linkable.call(this);

// 	this.allowedStyles = ['flash', 'fade', 'slide', 'none']
// 	this.fadeTime = 500;

// 	this.timers = [];

// 	this.displayMessage = function(text, style, time) {
// 		time = time || 2000;
// 		style = style || 'flash';
// 		this.timers.forEach(timer => window.clearTimeout(timer));
// 		if(this.allowedStyles.indexOf(style) > -1) {
// 			this.allowedStyles.forEach(style => this.$.classList.remove(style));
// 			setTimeout(() => {
// 				this.$.classList.add(style);
// 				this.$.classList.remove('fadeOut');
// 			}, 1)
// 		}
// 		this.$.innerHTML = text;
// 		this.timers.push(setTimeout(() => this.$.classList.add('fadeOut'), time));
// 		this.timers.push(setTimeout(() => {
// 			this.$.innerHTML = '';
// 			this.allowedStyles.forEach(style => this.$.classList.remove(style));
// 		}, time + this.fadeTime));
// 	}

// 	this.S.mapIn({
// 		text: this.displayMessage
// 	});
// }


// function UI_FauxDrop(o) {
// 	o=be(o);
// 	UI.call(this, {
// 		node: o.node,
// 		kind: ['FauxDrop'].concat(o.kind || []),
// 	});
// 	Linkable.call(this);

// 	this._.label = this.$.querySelector('label');
// 	this._.drop = this.$.querySelector('select');

// 	this.drop = new UI_SimpleList({
// 		node: this._.drop
// 	})

// 	this.handler = e => {
// 		this._.label.textContent = this._.drop.options[this._.drop.selectedIndex].text;
// 	}

// 	this.add = this.drop.add.bind(this.drop);
// 	this.clear = this.drop.clear.bind(this.drop);
// 	this.get = this.drop.get.bind(this.drop);
// 	this.set = function (value, dry) {
// 		this.drop.set(value, dry);
// 		this.handler();
// 	}


// 	this._.drop.addEventListener('change', e => this.handler(e));

// 	this.S.proxyOut('value', this.drop)
// }

// function UI_SimpleList(o) {
// 	o=be(o);
// 	UI_List.call(this, {
// 		node: o.node,
// 		kind: ['SimpleList'].concat(o.kind || []),
// 	});
// 	Linkable.call(this);

// 	this.handler = e => {
// 		this.S.out('value', this.$.value);
// 		this.$.blur();
// 	}

// 	this.set = function (value, dry) {
// 		this.$.value = value;
// 		if(!dry)
// 			this.S.out('value', this.$.value);
// 	}

// 	this.add = function(pairs) {
// 		this.lastAdded = [];
// 		pairs.forEach(pair => {
// 		var item = new UI_SimpleListItem(pair);
// 			this.$.appendChild(item.$);
// 			this.lastAdded.push(item);
// 		});
// 		return this;
// 	}

// 	this.$.onchange = this.handler;


// }

// function UI_SimpleListItem(o) {
// 	o=be(o);
// 	UI.call(this, {
// 		node: o.node,
// 		kind: ['SimpleListItem'].concat(o.kind || []),
// 		html: o.html || '<option></option>'
// 	});
// 	this.value = o.value;
// 	this.$.value = o.value;
// 	if(this.$.innerHTML.length < 1)
// 		this.$.textContent = (o.text || o.value || '1');
// }


// function UI_LodaManager(o) {
// 	o=be(o);
// 	UI.call(this, {
// 		node: o.node,
// 		kind: ['LodaManager'].concat(o.kind || []),
// 		html: o.html || '<div></div>'
// 	});
// 	Linkable.call(this);

// 	this.library = {
// 		test: new UI_Loda().S.link(this),
// 		search: new UI_Loda_Search().S.link(this),
// 		settings: new UI_Loda_Settings().S.link(this),
// 		jump: new UI_Loda_Jump().S.link(this),
// 		notice: new UI_Loda_Notice().S.link(this),
// 		webtoon: new UI_Loda_Webtoon().S.link(this),
// 	}

// 	this.scrollTop = 0;

// 	this.display = function(loda) {
// 		this.open = true;
// 		this.$.classList.remove('hidden');
// 		this.$.innerHTML = '';
// 		this.$.appendChild(this.library[loda].$);

// 		this.$.focus();
// 		this.keyListener.noPropagation(!!this.library[loda].noPropagation);
// 		if(this.currentLoda == loda && this.scrollTop > 0)
// 			scroll(this.$, 0, this.scrollTop)
// 		else
// 			setTimeout(() => this.library[loda].focus(), 100);
// 		this.currentLoda = loda;
// 	}

// 	this.close = function() {
// 		this.$.classList.add('hidden');
// 		this.$.innerHTML = '';
// 		Reader.$.focus();
// 		this.open = false;
// 	}

// 	this.keyListener = new KeyListener(this.$)
// 		.noPropagation(true)
// 		.attach('close', ['Escape'], this.close.bind(this))

// 	this.$.onmousedown = (e) => {
// 		if(e.target == this.$) {
// 			this.close();
// 		}
// 	}

// 	this.$.onscroll = (e) => {
// 		this.scrollTop = this.$.scrollTop; 
// 	}
	
// 	this.S.mapIn({
// 		'close': this.close
// 	})
// }



// const WIDE_FLAG = "_w.";

// function firstPartySeriesHandler(mediaURL, chapter, group, slug) {
// 	for (let i = 0; i < chapter.groups[group].length; i++) {
// 		chapter.images[group].push(
// 			mediaURL
// 				+ slug 
// 				+ '/chapters/' 
// 				+ chapter.folder 
// 				+ '/' 
// 				+ group 
// 				+ '/' 
// 				+ chapter.groups[group][i]
// 		)
// 		chapter.blurs[group].push(
// 			mediaURL
// 				+ slug 
// 				+ '/chapters/' 
// 				+ chapter.folder 
// 				+ '/' 
// 				// + "shrunk_blur_"+ group
// 				+ group+"_shrunk_blur" 
// 				+ '/' 
// 				+ chapter.groups[group][i]
// 		)
// 		chapter.previews[group].push(
// 			mediaURL
// 				+ slug 
// 				+ '/chapters/' 
// 				+ chapter.folder 
// 				+ '/' 
// 				// + "shrunk_"+ group
// 				+ group+"_shrunk" 
// 				+ '/' 
// 				+ chapter.groups[group][i]
// 		)
// 		if (chapter.groups[group][i].includes(WIDE_FLAG)) {
// 			chapter.wides[group].push(i);
// 		}
// 	}
// 	chapter.loaded[group] = true;
// }

// // NH API response returns an array, whereas others returns a chapter ID
// function thirdPartySeriesHandler(url, chapter, group) {
// 	if (Array.isArray(chapter.groups[group])) {
// 		// TODO page handling is pretty ugly here. I'd recommend a refactor someday.
// 		for (let i = 0; i < chapter.groups[group].length; i++) {
// 			let image = chapter.groups[group][i];
// 			if (typeof image === 'string' || image instanceof String) {
// 				chapter.images[group].push(image);
// 				if (image.includes(WIDE_FLAG)) {
// 					chapter.wides[group].push(i);
// 				}
// 			} else {
// 				chapter.descriptions[group].push(image.description);
// 				chapter.images[group].push(image.src);
// 				if (image.src.includes(WIDE_FLAG)) {
// 					chapter.wides[group].push(i);
// 				}
// 			}
// 		}
// 		chapter.loaded[group] = true;
// 	} else {
// 		if (!chapter.pageRequest) chapter.pageRequest = {};
// 		chapter.loaded[group] = false;
// 		chapter.pageRequest[group] = async () => {
// 			let images = chapter.images[group];
// 			let wides = chapter.wides[group];
// 			let descriptions = chapter.descriptions[group];
// 			try {
// 				// Each group/chapter pair has a unique ID, returned by API
// 				let pages = await fetch(`${chapter.groups[group]}`)
// 								.then(r => r.json());
// 				pages.forEach((p, i) => {
// 					if (typeof p === 'string' || p instanceof String) {
// 						images.push(p);
// 						if (p.includes(WIDE_FLAG)) {
// 							wides.push(i);
// 						}
// 					} else {
// 						descriptions.push(p.description);
// 						images.push(p.src);
// 						if (p.src.includes(WIDE_FLAG)) {
// 							wides.push(i);
// 						}

// 					}
// 				});
// 				return pages.length;
// 			} catch (e) {
// 				console.log(e);
// 				return 0;
// 			}
// 		}
// 	}
// }

// function DownloadManager() {
// 	this.chapterDownloadURL = "";
// 	continueDownload = false;
// 	this.downloadChapter = async function() {
// 		if(this.chapterDownloadURL) {
// 			URL.revokeObjectURL(this.chapterDownloadURL)
// 		}
// 		Reader._.download_chapter.classList.add("hidden");
// 		Reader._.downloading_chapter.textContent = `Ch.${Reader.SCP.chapter} : 0%`;
// 		Reader._.download_wrapper.classList.remove("hidden");
// 		let mimeMap = {
// 			'image/gif': '.gif',
// 			'image/jpeg': '.jpg',
// 			'image/png': '.png',
// 			'image/webp': '.webp',
// 		}
// 		await Reader.fetchChapter(Reader.SCP.chapter)
// 		let chapURLArray = Reader.SCP.chapterObject.images[Reader.getGroup(Reader.SCP.chapter)];
// 		if (await shouldUseProxy(chapURLArray[0])) {
// 			chapURLArray = chapURLArray.map((url) => `${IMAGE_PROXY_URL}/${url}`);
// 		}
// 		continueDownload = true;
// 		try {
// 			let parallelDownloads = Settings.get("adv.parallelDownloads");
// 			let zip = new JSZip();
// 			let progress = 0;
// 			for (let i = 0; i < chapURLArray.length; i += parallelDownloads) {
// 				if (!continueDownload) return;
// 				let imageBlobs = await Promise.all(
// 					chapURLArray
// 					.slice(i, i + parallelDownloads)
// 					.map((url, subIndex) => {
// 						return (async () => {
// 							let contents = await downloadHandler(url);
// 							progress++;
// 							Reader._.downloading_chapter.textContent = `Ch.${Reader.SCP.chapter} : ${Math.round(progress / chapURLArray.length * 98)}%`;
// 							return {
// 								contents,
// 								"fileIndex": String(i + subIndex + 1).padStart(String(chapURLArray.length).length, "0"),
// 							};
// 						})();
// 					})
// 				);
// 				imageBlobs.forEach((data) => {
// 					zip.file(data.fileIndex + mimeMap[data.contents.type], data.contents, { binary: true });
// 				});
// 			}

// 			let zipBlob = await zip.generateAsync({type:"blob"});
// 			if(!continueDownload) return;
// 			this.chapterDownloadURL = URL.createObjectURL(zipBlob);
// 			initiateDownload(this.chapterDownloadURL);
// 		} catch (err) {
// 			TooltippyError.set("An error occured while downloading: " + err.message);
// 		} finally {
// 			wrapUp()
// 		}
// 	}

// 	async function shouldUseProxy(testUrl) {
// 		// We don't know the actual error so we'll play it
// 		// safe and assume this error is due to CORS
// 		try {
// 			await fetch(testUrl);
// 			return false;
// 		} catch (err) {
// 			return true;
// 		}
// 	}

// 	async function downloadHandler(url) {
// 		const TRIES = 3;
// 		for (let attempt = 1; attempt <= TRIES; attempt++) {
// 			try {
// 				return (await fetch(url)).blob();
// 			} catch (e) {
// 				await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
// 			}
// 		}
// 		throw new Error(`Failed to download after exhausting all ${TRIES} tries.`);
// 	}

// 	function wrapUp() {
// 		Reader._.download_wrapper.classList.add("hidden");
// 		Reader._.download_chapter.classList.remove("hidden");
// 		continueDownload = false;
// 	}

// 	this.cancelDownload = function() {
// 		wrapUp();
// 	}

// 	function initiateDownload(url) {
// 		let elem = window.document.createElement('a');
// 		elem.href = url;
// 		elem.download = Reader.SCP.chapter + ".zip";        
// 		document.body.appendChild(elem);
// 		elem.click();        
// 		document.body.removeChild(elem);
// 	}
// }

// function UI_About(o) {
// 	o=be(o);
// 	UI.call(this, Object.assign(o, {
// 		kind: ['About'].concat(o.kind || []),
// 		html: `<div>
// 			<p class="muted"> </p>
// 			<p class="muted"> </p>
// 			<p class="muted">Powered by</p>
// 			<div class="cubari" data-bind="cubari"><div></div></div>
// 			<hr>
// 			<p>Design, UX: Algoinde</p>
// 			<p>Reader code: Algoinde, funkyhippo, Einlion</p>
// 			<p>Backend: appu</p>
// 			<hr>
// 			<a href="https://ko-fi.com/cubari" target="_blank">Send coffee :P</a>
// 			<hr>
// 			<p style="max-width: 15em; text-align: center; line-height: 1.5">Cubari does not host any of the content you are viewing. Just like your computer does not store or own all the images you see on the internet, Cubari is doing the same thing. We are simply a service that lets you view other data on the internet using our custom UI.</p>
// 		</div>`
// 	}));

// 	this.cubariMove = (e) => {
// 		var x = e.pageX;
// 		var y = e.pageY;
// 		var	cCR = this._.cubari.getBoundingClientRect();	
// 		var cX = cCR.left + cCR.width / 2;
// 		var cY = cCR.top + cCR.height / 2;
// 		var	xDist = (cX - x) / (cX - x<0?document.documentElement.clientWidth - cX:cX) * -16;
// 		var yDist = (cY - y) / (cY - y<0?document.documentElement.clientHeight - cY:cY) * -12;
// 			this._.cubari.children[0].style.transform = `translate3d(${xDist}%, ${yDist}%, 0)`
// 		}
// 	this._.cubari.onmouseover = () => {
// 		if(this.listener) return;
// 		this.listener = true;
// 		document.addEventListener('mousemove', this.cubariMove);
// 		this._.cubari.children[0].style.transition = '';
// 		setTimeout(() => {
// 			document.removeEventListener('mousemove', this.cubariMove);
// 			this._.cubari.children[0].style.transform = '';
// 			this._.cubari.children[0].style.transition = 'transform 0.3s ease';
// 			this.listener = false;
// 		}, 5000);
// 	}

// 	return this;
// }

alg.createBin();

API = new ReaderAPI();

Theme = new themeHandler();
Theme.setTheme('#28292B', '#000000', '#B73636','#EEEEEE')
// Settings = new SettingsHandler();

// Tooltippy = new UI_Tooltippy({
// 	node: document.querySelector('.Tooltippy'),
// });

// TooltippyError = new UI_Tooltippy({
// 	node: document.querySelector('.Tooltippy.Error'),
// 	kind: 'Error'
// })

Reader = new UI_Reader();
document.body.appendChild(Reader.$)
// Loader = new LoadHandler();
// URLC = new URLChanger();
// Loda = new UI_LodaManager({
// 	node: document.querySelector('.LodaManager'),
// });
// ThemeManager = new themeHandler();
// DownloadManagerObj = new DownloadManager()

// Loda.library.settings.createCategory('About', new UI_About());

// API.S.link(Reader);
// Settings.S.link(Reader);
// Reader.S.link(URLC);
// Reader.S.link(Settings);
// Reader.$.focus();
// ThemeManager.S.link(Settings);
// //Settings.sendInit();
// ThemeManager.themeUpdated();

// function _redirects (){
// 	if(window.location.hash == '#s') Loda.display('search');
// 	if(window.location.hash == '#redirect') {
// 		if(localStorage) {
// 			if(localStorage.getItem('redirected')) return window.location.hash = '';
// 			localStorage.setItem('redirected', 1);
// 		}
// 		window.location.hash = '';
// 		Loda.display('notice');
// 	}
// }

// _redirects();

// function debug() {
// 	var el = document.createElement('div');
// 	el.id = 'test_element';
// 	document.getElementsByClassName('rdr-image-wrap')[0].appendChild(el)
// }