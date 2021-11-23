function UI_LodaManager(o) {
	UI.call(this, {
		o: o,
		html: ''
	});
	Linkable.call(this);

	this.library = {}

	this.scrollTop = 0;

	this.register = function(loda, name) {
		this.library[name || loda.me.kind[0].replace('Loda_','')] = loda;
		loda.S.link(this)
	}

	this.display = function(loda) {
		this.open = true;
		this.$.classList.remove('hidden');
		this.$.innerHTML = '';
		this.$.appendChild(this.library[loda].$);

		this.$.focus();
		this.keyListener.noPropagation(!!this.library[loda].noPropagation);
		if(this.currentLoda == loda && this.scrollTop > 0)
			scroll(this.$, 0, this.scrollTop)
		else
			setTimeout(() => this.library[loda].focus(), 100);
		this.currentLoda = loda;
	}

	this.close = function() {
		this.$.classList.add('hidden');
		this.$.innerHTML = '';
		Reader.$.focus();
		this.open = false;
	}

	this.keyListener = new KeyListener(this.$)
		.noPropagation(true)
		.attach('close', ['Escape'], this.close.bind(this))

	this.$.onmousedown = (e) => {
		if(e.target == this.$) {
			this.close();
		}
	}

	this.$.onscroll = (e) => {
		this.scrollTop = this.$.scrollTop; 
	}
	
	this.S.mapIn({
		'close': this.close
	})
}

function UI_Loda(o) {
	UI.call(this, {
		o: o,
		html: '<div class="Loda-window" tabindex="-1"><header data-bind="header"></header><button class="ico-btn close" data-bind="close"></button><content data-bind="content"></content></div>'
	});
	Linkable.call(this);
	// this.manager = o.manager;
	if(o.name) this._.header.innerHTML = o.name;

	this.close = function() {
		this.S.out('close');
	}

	this.focus = function() {
		this.focusElement.focus();
		if(this.focusElement.select) this.focusElement.select();
	}

	this._.close.onclick = this.close.bind(this)
}

function UI_Loda_Notice(o) {
	UI.inherit(UI_Loda, this, {
		o: o,
		html: `<div class="Loda-window" tabindex="-1"><header data-bind="header">Notice</header><button class="ico-btn close" data-bind="close"></button><content data-bind="content">
				You have been redirected to cubari.moe. This is where the image proxy lives now. Happy reading!
			</content><button data-bind="button"></button></div>`
	});
	this.name = 'Notice';
	this.focusElement = this.$;
	this.noPropagation = true;
	this._.button.onclick = this.close.bind(this);

}

function UI_Loda_Chapters(o) {
	UI.inherit(UI_Loda, this, {
		o: o,
		html: `

		`
	});
}

function UI_Loda_Webtoon(o) {
	UI.inherit(UI_Loda, this, {
		o: o,
		html: `<div class="Loda-window" tabindex="-1"><header data-bind="header"></header><button class="ico-btn close" data-bind="close"></button><content data-bind="content">
				Switch to webtoon mode? You can use the options menu to switch reading direction later.
			</content>
			<div class="buttons">
			<button data-bind="yes" class="yes"></button><button data-bind="no" class="no"></button>
			</div></div>`
	});
	this.name = 'Webtoon';
	this.focusElement = this.$;
	this.noPropagation = true;
	this._.no.onclick = this.close.bind(this);
	this._.yes.onclick = () => {
		Settings.set('lyt.direction', 'ttb');
		Settings.set('lyt.gap', true);
		this.close();
	}

}	

function UI_Loda_Search(o) {
	UI.inherit(UI_Loda, this, {
		o: o,
		html: `<div class="Loda-window" tabindex="-1"><header data-bind="header"></header><button class="ico-btn close" data-bind="close"></button><content data-bind="content">
				<input type="text" data-bind="input" placeholder="⌕" />
				<div class="search-tabs" data-bind="tabs">
				</div>
				<div class="list-container" data-bind="container">
					<div class="list" data-bind="lookup"></div>
					<div class="list is-hidden" data-bind="indexer"></div>
				</div>
			</content></div>`
	});
	this.name = 'Indexer';
	this.noPropagation = true;
	this.focusElement = this._.input;
	this.isIndexed = typeof(IS_INDEXED) !== "undefined" ? IS_INDEXED : false;
	this.container = new UI_ContainerList({
		node: this._.container
	});

	this.lookup = new UI_MangaSearch({
		node: this._.lookup
	})

	this.tabs = new UI_Tabs({
			node: this._.tabs
		})
		.add(new UI_Tab({
			text: 'Title search'
		}))
		.S.link(this.container)
		.S.linkAnonymous('number', num => {
			this._.input.focus();
		});

	this.tabs.select(0);

	this.lookup.S.link(this.tabs.get(0));
	this.input = new UI_Input({
		node: this._.input
		})
		.S.link(this.lookup)

	if (this.isIndexed) {
		this.indexer = new UI_IndexSearch({
			node: this._.indexer
		});

		this.tabs.add(new UI_Tab({
			text: 'Text search',
			counterText: 'Press <span class="inline-icon">⮠</span>'
		}))

		this.tabs.get(1).$.onmousedown = e => {
			this.input.handler(e);
		}

		this.indexer.S.link(this.tabs.get(1));


		this.input.S.link(this.indexer)
		.S.linkAnonymous('text', text => {
			this.tabs.select(1);
			this.tabs.get(1).update('Loading...');
		})
	}

}

function UI_Loda_Jump(o) {
	UI.inherit(UI_Loda, this, {
		o: o,
		html: `<div class="Loda-window" tabindex="-1"><header data-bind="header"></header><button class="ico-btn close" data-bind="close"></button><content data-bind="content">
				<div class="Jump-Wrapper">
					<input type="tel" data-bind="input_chap" class="UI Input" placeholder="Chapter">
					<input type="tel" data-bind="input_page" placeholder="Page" class="UI Input">
					<button data-bind="btn" class="Jump-Btn UI Button ico-btn"></button>
				</div>
			</content></div>`
	});
	this.manager = o.manager;
	this.name = 'Jumper';
	this.noPropagation = true;
	this.focusElement = this._.input_chap;

	this.btn = new UI_Button({
		node: this._.btn,
		text: 'Go'
	});

	this.input_chap = new UI_Input({
		node: this._.input_chap
		})

	this.input_page = new UI_Input({
		node: this._.input_page
		})


	this.jump = async () => {
		let chap = this._.input_chap.value || Reader.SCP.chapter, page = parseInt(this._.input_page.value) || 1;
		try {
			await Reader.fetchChapter(chap);
			if (page > Reader.current.chapters[chap].images[Reader.getGroup(chap)].length) throw "Invalid Chapter or Page!"
			this._.input_chap.value = this._.input_page.value = "";
			Loda.close();
			Reader.initChapter(chap, page-1);
		}
		catch (err) {
			Tooltippy.set('Please enter valid chapter and page!');
		}
	}

	this.chapPrev = "", this.pagePrev = "", this.cursorPrev = "";

	this.prejump = (el) => {

		if(isNaN(this._.input_chap.value)) {
			this._.input_chap.value = this.chapPrev;
			this._.input_chap.setSelectionRange(this.cursorPrev,this.cursorPrev); 
		}

		if(this._.input_page.value.includes(".") || isNaN(this._.input_page.value)) {
			this._.input_page.value = this.pagePrev;
			this._.input_page.setSelectionRange(this.cursorPrev,this.cursorPrev); 
		}

		if(parseInt(el.value) > parseInt(Reader.SCP.lastChapter) && this.chapPrev.length <= Reader.SCP.lastChapter.length && el.selectionStart === el.value.length && !el.value.substring(el.selectionStart, el.selectionEnd) && this._.input_chap === document.activeElement && el.value.length > this.chapPrev.length && !el.value.endsWith(".")) {
			this._.input_page.value = el.value.charAt(el.value.length-1);
			el.value = el.value.substring(0, el.value.length-1);
			this._.input_page.focus();
		}

		this.chapPrev = this._.input_chap.value;
		this.pagePrev = this._.input_page.value;
	}

	this._.btn.onclick = this.jump;
	[this._.input_chap, this._.input_page].forEach(el => { 
		el.oninput = e => {
		 this.prejump(el); 
		}
	});

	[this._.input_chap, this._.input_page].forEach(el => { 
		el.onkeydown = e => {
			this.cursorPrev = el.selectionEnd;		  
		}
	}); 

	[this._.input_chap, this._.input_page].forEach(el => { new KeyListener(el)
		.attach('Jump', ['Enter'], e => this.jump())
	});

}

function UI_IndexSearch(o) {
	UI_Tabs.call(this, {
		o: o,
		html: `<div></div>`
	});
	Loadable.call(this);

	this.search = function(query) {
		if(query.length < 3) {
			return this.clear();
		}
		API.requestIndex({
			query: query,
			slug: Reader.SCP.series
		}).then(data => {
			for(var searchWord in data.result) {
			var searchResult = data.result[searchWord];
				if(!searchResult._merged) searchResult._merged = {};
				for(var wordVariant in searchResult) {
				var chapters = searchResult[wordVariant];
					if(wordVariant[0] == '_') continue;
					for(var chapter in chapters) {
					var pageList = chapters[chapter];
						if(!searchResult._merged[chapter])
							searchResult._merged[chapter] = pageList || [];
						else {
							pageList.forEach(page => {
								if(searchResult._merged[chapter].indexOf(page) < 0)
									searchResult._merged[chapter].push(page);
							})
						}
					}
				}
			}

		var wordAddrMap = {};
			if(Object.keys(data.result).length > 1) {
				for(var word in data.result) {
				var chapters = data.result[word]._merged;
					for(var chapter in chapters) {
					var pageArray = chapters[chapter];
						pageArray.forEach(page => {
						var id = '' + chapter + '/' + page;
							if(!wordAddrMap[id]) wordAddrMap[id] = 0;
							wordAddrMap[id] += 1;
						})
					}
				}
			var wordAddrMap = Object.filter(wordAddrMap, id => {
					return id == Object.keys(data.result).length;
				})
			var chapters = {};
				for(var key in wordAddrMap) {
				var id = key.split('/')
					if(!chapters[id[0]]) chapters[id[0]] = [];
					chapters[id[0]].push(id[1]);
				}
			}else{
				chapters = data.result[Object.keys(data.result)[0]]._merged;
			}


			// if(Object.keys(data.result).length > 1) {
			// var chapters = Object.keys(data.result[firstWord]._merged).filter((item, key) => {
			// 		for(var word in data.result) {
			// 			if(word == firstWord) continue;
			// 		var chapters = Object.keys(data.result[word]._merged);
			// 			if(chapters.indexOf(item) < 0)
			// 				return false;
			// 		}
			// 		return true;
			// 	})	
			// }else{
			// 	var chapters = Object.keys(data.result[firstWord]._merged);
			// }

		var chapterElements = [];
		var chapKeys = Object.keys(chapters).sort((a,b) => parseFloat(a) - parseFloat(b));
			for(var i=0;i<chapKeys.length;i++) {
			var key = chapKeys[i];
			var item = chapters[key];
				try{
				chapterElements.push(new UI_ChapterUnit({
					chapter: Reader.current.chapters[key.replace('-', '.')],
				//	substring: Object.keys(data.result)[0],
					pages: item.sort((a,b) => a-b)
				}))	
				}catch(e){
					console.warn('Chapter', key, 'wasn\'t found?')
				}	
			};

			this.clear().add(chapterElements);

		}).catch(err => {throw new Error(err)})

	}

	this.S.mapIn({
		'text': this.search,
		// 'quickText': this.clear
	})
}

function UI_MangaSearch(o) {
	UI_Tabs.call(this, {
		o: o,
		html: `<div></div>`
	});

	this.search = function(query, force) {
	this.query = query;
		if(query.length < 1) {
			this.clear(); return;
		}
		if(this.debounce) {
			clearTimeout(this.debouncer);
			this.debouncer = setTimeout(e => {
				this.debounce = false;
				this.search(this.query, true);
			}, 200);
			return;
		}
		if(!force) this.debounce = true;

	var chapters = {};
		if(isNaN(this.query) == false) {
			Reader.current.chaptersIndex.filter(id => {
				return (''+id).indexOf(this.query) > -1;
			}).map(id => {
				return Reader.current.chapters[id];
			}).forEach(chapter => {
				chapters[chapter.id] = chapter;
			})
		}else{
			if(this.query.length < 3) return;
		}
		for(var id in Reader.current.chapters) {
		var chapter = Reader.current.chapters[id];
			if(chapter.title.toLowerCase().indexOf(this.query.toLowerCase()) > -1) {
				chapters[id] = chapter;
			}
		}
	var chapterElements = [];
		for(var id in chapters) {
		var chapter = chapters[id];
			chapterElements.push(new UI_ChapterUnit({
				chapter: chapter,
				substring: query
			}))
		}
		
		this.clear().add(chapterElements);
	}

	this.S.mapIn({
		'text': this.search,
		'quickText': this.search
	})
}


function UI_ChapterUnit(o) {
	UI.call(this, {
		o: o,
		html: `<div><figure data-bind="figure"></figure><content><h2 data-bind="title"></h2><blockquote data-bind="text"></blockquote><div class="pages" data-bind="pages"></div></content></div>`
	});

	this.chapter = o.chapter;
	this.pages = o.pages;
	this.substring = o.substring
	this.pageList = new UI_Tabs({
		node: this._.pages,
		held: true
	})
	// TODO should this innerHTML exist?
	this._.title.innerHTML = (o.chapter.id + ' - ' + o.chapter.title).replace(new RegExp('('+o.substring+')', 'gi'), '<i>$1</i>');
	for(var group in o.chapter.images) {
		this._.figure.style.backgroundImage = 'url('+(this.pages?o.chapter.previews[group][+this.pages[0]-1]:o.chapter.previews[group][0])+')';
		break;
	}
	if(this.pages) {
		this.pages.forEach(page => {
		var pageButton = new UI_Dummy({text: page});
			pageButton.$.onclick = e => {
				e.stopPropagation();
				e.preventDefault();
			var pg = +e.target.innerHTML-1;
				Loda.close();
				Reader.initChapter(this.chapter.id, pg);
				return false;
			}
			this.pageList.add(pageButton);
		})
	}

	this.$.onclick = e => {
		Reader.initChapter(this.chapter.id, 0);
		Loda.close();
	}
}


