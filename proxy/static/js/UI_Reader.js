function UI_Reader(o) {
	UI.call(this, {
		o: o,
		html: `
		<aside class="">
			<div class="hide-side" data-bind="btn_sidebar">
				<div class="hide-side-actual ico-btn"></div>
			</div>
			<header>
				<a href="/" class="ico-btn guya"></a>
				<h1 data-bind='title'><a href="/read/manga/{{ slug }}/">{{ series_name }}</a></h1>
				<button class="ico-btn"></button>
			</header>
			<div class="rdr-aside-buffer" data-bind="aside_buffer"></div>
			<div class="rdr-aside-content" data-bind="aside_content">
				<section class="rdr-selector">
					<div data-bind="selector" class="rdr-selector-mid"></div>
					<div class="rdr-selector-bot">
						<div data-bind="groups" class="groups-dropdown Dropdown">
							<span class="Dropdown-selection">Zaibatsu</span>
							<div class="Dropdown-options">
								<i>Whenever</i>
								<i>Noice Scanlations Limited Test</i>
								<i>What the Scan</i>
							</div>
						</div>
						<div class="flex-spacer"></div>
						<button data-bind="btn_download" class="ico-btn download"></button>
						<div class="download-anchor">
							<div class="download-wrapper hidden" data-bind="download_wrapper">
								<button data-bind="downloading_chapter" class="ico-btn downloading" disabled></button>
								<button data-bind="download_cancel" class="ico-btn download-cancel"></button>
							</div>
						</div>
						<a data-bind='btn_share' data-tip="Short link to current page" class="rdr-share ico-btn "></a>
						<button data-bind='btn_search' class="ico-btn search"></button>
					</div>
				</section>
				<section data-bind="qs" class="rdr-qs-host">
					<button data-bind='fit_button' data-lyt.fit="width" class="ico-btn"></button>
					<button data-bind='layout_button' data-lyt.direction="ltr" class="ico-btn"></button>
					<button data-bind='spread_button' data-lyt.spread="1" class="ico-btn"></button>
					<button data-bind='preload_button' data-bhv.preload="2" class="ico-btn"></button>
					<div class="flex-spacer"></div>
					<button data-bind='settings_button' class="text-btn">Settings</button>
				</section>
				<section class="rdr-description">
					<div data-bind="image_description"></div>
				</section>
				<section class="rdr-previews">
					<div class="header" data-bind="btn_previews">
						<span>Previews</span>
						<div class="ico-btn expander"></div>
					</div>
					<div data-bind='previews' class="rdr-previews-gallery">
					</div>
				</section>
			</div>
		</aside>
		<div class="rdr-page-selector vis" data-bind="page_selector">
			<div class="rdr-page-selector-counter" data-bind="page_keys_count">

			</div>
			<div class="rdr-page-selector-keys" data-bind="page_keys">
			</div>
		</div>
		<content data-bind='viewer' class="rdr-area">
		</content>
		<div class="zoom-level vis" data-bind="zoom_level">
			<div class="ico-btn" data-bind="zoom_level_plus"></div>
			<div class="ico-btn" data-bind="zoom_level_minus"></div>
		</div>`
	})
	Linkable.call(this);

	this.d = {
		SCP: {
			series: undefined,
			chapter: undefined,
			page: undefined,
			group: undefined
		},
		series: {}
	}

	this.selector = new UI_ReaderSelector({node: this._.selector});
	// this.groups = new UI_Dropdown({node:this._.groups});
	this.viewer = new UI_ReaderImageViewer({node: this._.viewer});


	this.queueSeriesLoad = (SCP) => {
		this.d.loadQueue = SCP;
	}

	//series: slug
	//chapter: chapter key
	//page: zero-index
	this.displaySeries = (series, chapter, page) => {
		this.d.SCP.series = series;
		this._.title.href = Path.join(Cubari.URL_PREFIX, this.getSeries().slug);
		this._.title.innerText = this.getSeries().title;
		this.selector.setGroupFunction(this.getGroupPreference)
		this.selector.render(this.getSeries());
		this.displayChapter(chapter, page)
	}

	this.getGroupPreference = (chapter) => {
		//TODO: group priority per chapter
		if(this.d.SCP.groupOverride !== undefined && this.getChapter(undefined, chapter)[this.d.SCP.groupOverride]) {
			return this.d.SCP.groupOverride;
		}else{
			return Object.keys(this.getChapter(undefined, chapter))[0];
		}
	}

	this.getSeries = (series=this.d.SCP.series) => {
		return this.d.series[series]; 
	}
	this.getChapter = (series=this.d.SCP.series, chapter=this.d.SCP.chapter) => {
		return this.getSeries(series).chapters[chapter];
	}
	this.getRelease = (series=this.d.SCP.series, chapter=this.d.SCP.chapter, group=this.d.SCP.group) => {
		return this.getChapter(series, chapter)[group];
	}
	this.getPages = (series=this.d.SCP.series, chapter=this.d.SCP.chapter, group=this.d.SCP.group) => {
		return this.getRelease(series, chapter, group).images;
	}

	this.displayChapter = (chapter, page) => {
		this.d.SCP.group = this.getGroupPreference();
		this.viewer.render(this.getRelease(undefined, chapter), page)
		this.S.out('SCP', {chapter: chapter, page: page, group: this.d.SCP.group})
	}

	this.displayPage = (page, animate) => {
		this.viewer.show(page, animate)
		this.S.out('SCP', {page: page})
	}

	this.dataHandler = (seriesData) => {
		this.d.series[seriesData.slug] = seriesData;
		if(this.d.loadQueue && this.d.loadQueue.series == seriesData.slug) {
			this.displaySeries(this.d.loadQueue.series, this.d.loadQueue.chapter, this.d.loadQueue.page)
		}
	}

	this.SCPhandler = (SCP) => {
		if(SCP.group) this.d.SCP.groupOverride = SCP.groupOverride;
		if(SCP.series != this.d.SCP.series) {
			this.displaySeries(SCP.series, SCP.chapter, SCP.page)
		}else if(SCP.chapter != this.d.SCP.chapter) {
			this.displayChapter(SCP.chapter, SCP.page)
		}else if(SCP.page != this.d.SCP.page) {
			this.displayPage(SCP.page)
		}
	}

	this.commandHandler = (command) => {
		[].concat(command).forEach(command => {
			switch(command.action) {
				default:
					console.log(command.action, command.data)
					break;
			}
		})
	}

	this.S.mapIn({
		seriesData: this.dataHandler,
		SCP: this.SCPhandler,
		command: this.commandHandler
	})

	// new KeyListener(document.body)
	// 	.attach('prevCh', ['BracketLeft'], e => this.prevChapter())
	// 	.attach('nextCh', ['BracketRight'], e => this.nextChapter())
	// 	.attach('prevVo', ['Comma'], e => this.prevVolume())
	// 	.attach('nextVo', ['Period'], e => this.nextVolume())
	// 	.attach('fit', ['KeyF'], e => Settings.cycle('lyt.fit'))
	// 	.attach('layout', ['KeyD'], e => Settings.cycle('lyt.direction'))
	// 	.attach('hide', ['KeyH'], e => this.$.classList.toggle('o'))
	// 	.attach('sidebar', ['KeyS'], s => Settings.cycle('apr.sidebar'))
	// 	.attach('pageSelector', ['KeyN'], s => Settings.cycle('apr.selPinned'))
	// 	.attach('preload', ['KeyL'], s => Settings.cycle('bhv.preload'))
	// 	.attach('spread', ['KeyQ'], s => Settings.cycle('lyt.spread'))
	// 	.attach('spreadCount', ['KeyU'], s => Settings.cycle('adv.spreadCount'))
	// 	.attach('spreadOffset', ['KeyI'], s => Settings.cycle('adv.spreadOffset'))
	// 	.attach('share', ['KeyR'], s => this.copyShortLink(s))
	// 	.attach('enter', ['Enter'], s => {
	// 		if(this.SCP.page == this.SCP.lastPage)
	// 			this.nextChapter();
	// 	})
	// 	.attach('options', ['KeyO'], e => Loda.display('settings'))
	// 	.attach('jump', ['KeyJ'], e => Loda.display('jump'))

		
	// new KeyListener(document.body)
	// 	.condition(() => ['width','width_limit'].includes(Settings.get('lyt.fit')))
	// 	.attach('minus', ['Minus'], s => Settings.prev('lyt.zoom', undefined, true))
	// 	.attach('plus', ['Equal'], s => Settings.next('lyt.zoom', undefined, true))
		
	// new KeyListener(document.body)
	// 	.condition(() => Settings.get('lyt.direction') == 'ltr')
	// 	.attach('prev', ['ArrowLeft'], e => this.prevPage())
	// 	.attach('next', ['ArrowRight'], e => this.nextPage());
		
	// new KeyListener(document.body)
	// 	.condition(() => Settings.get('lyt.direction') == 'rtl')
	// 	.attach('prev', ['ArrowRight'], e => this.prevPage())
	// 	.attach('next', ['ArrowLeft'], e => this.nextPage());

	// let refocus = (e) => {
	// 	if(this.imageView.getScrollElement()) this.imageView.getScrollElement().focus();
	// }
	// new KeyListener(document.body)
	// 	.pass()
	// 	.attach('pgdn', ['PageDown'], refocus)
	// 	.attach('pgup', ['PageUp'], refocus)
	// 	.attach('home', ['Home'], refocus)
	// 	.attach('end', ['End'], refocus)
	// 	.attach('space', ['Space'], refocus)

	// this.selector_chap = new UI_FauxDrop({node: this._.selector_chap})
	// this.selector_chap.S.linkAnonymous('value', value => {
	// 	this.initChapter(value, 0);
	// });

	// this.selector_vol = new UI_FauxDrop({node: this._.selector_vol})
	// this.selector_vol.S.linkAnonymous('value', value => this.selectVolume(value));

	// this.imageView = new UI_ReaderImageView({
	// 	node: this._.image_viewer
	// }).S.link(this);

	// this.groupList = new UI_Tabs({
	// 	node: this._.groups
	// }).S.linkAnonymous('id', id => this.drawGroup(id));

	// this.selector_page = new UI_PageSelector({
	// 	node: this._.page_selector
	// })
	// this.selector_page.S.linkAnonymous('page', id => this.displayPage(id));

	// this.messageBox = new UI_MessageBox({
	// 	node: this._.message
	// })
	// this.previews = new UI_Tabs({
	// 	node: this._.previews
	// }).S.linkAnonymous('number', id => this.displayPage(id));

	// this.updateData = function(data) {
	// 	this.current = data;
	// }

	// this.controlFeatures = function(isFirstParty) {
	// 	if (isFirstParty) {
	// 		new KeyListener(document.body)
	// 			.attach('search', ['Ctrl+KeyF'], s => {
	// 				Loda.display('search')
	// 			})
	// 			.attach('previews', ['KeyP'], s => Settings.cycle('apr.previews'))
	// 	} else {
	// 		document.querySelector("[data-bind='search']").style.display = 'none';
	// 		document.querySelector(".rdr-previews").style.display = 'none';
	// 		this.plusOne = () => {};
	// 	}
	// }

	// this.setSCP = function(SCP) {
	// 	if(SCP.series) this.SCP.series = SCP.series;
	// 	if(SCP.chapter) this.SCP.chapter = SCP.chapter;
	// 	if(SCP.page) this.SCP.page = SCP.page;
	// }
	// this.displaySCP = function(SCP) {
	// 	this.drawReader(SCP.series);
	// 	this.initChapter(SCP.chapter, SCP.page, SCP.group);
	// 	this.S.out('init');
	// }

	// this.drawReader = function(slug) {
	// 	if(slug) this.SCP.series = slug;
	// 	this.SCP.lastChapter = this.current.chaptersIndex[this.current.chaptersIndex.length - 1];
	// 	this.SCP.firstChapter = this.current.chaptersIndex[0];
	// 	let path = window.location.pathname.split("/").map(e => decodeURIComponent(e));
	// 	this._.title.innerHTML = "";
	// 	let seriesPageLink = document.createElement("a");
	// 	seriesPageLink.textContent = this.current.title || "No title";
	// 	seriesPageLink.href = `${path.splice(0, path.indexOf(decodeURIComponent(this.current.slug))).join("/")}/${this.current.slug}/`;
	// 	this._.title.appendChild(seriesPageLink);
	// 	this.$.querySelector('aside').classList.remove('unload');
	// var chapterElements = [];
	// var volElements = {};
	// 	for (var i = this.current.chaptersIndex.length - 1; i >= 0; i--) {
	// 	var chapterNumber = this.current.chaptersIndex[i];
	// 	var chapter = this.current.chapters[chapterNumber];
	// 		chapterElements.push({
	// 			text: chapterNumber + ' - ' + chapter.title,
	// 			value: chapterNumber
	// 		});

	// 	}
	// 	volElements = Object.keys(this.current.volMap).sort((a,b) => parseFloat(b) - parseFloat(a)).map(item => {
	// 		return {
	// 			value: item,
	// 		}
	// 	});

	// 	this.selector_chap.clear().add(chapterElements);
	// 	this.selector_vol.clear().add(volElements);

	// 	setTimeout(() => {
	// 		this._.page_selector.classList.remove('vis')
	// 		this._.zoom_level.classList.remove('vis')
	// 	}, 3000);
	// 	// this._.close.href = `/read/${window.location.pathname.split('/')[2]}/${this.SCP.series}`;
	// }

	// this.drawGroup = function(group) {
	// 	Settings.set('misc.groupPreference', group);	
	// 	this.initChapter();
	// }

	// this.fetchChapter = function(chapter, group) {
	// 	return new Promise((resolve, reject) => {
	// 		if (!chapter) {
	// 			reject("Chapter is a required parameter.");
	// 			return;
	// 		}
	// 		this.loadingChapter = true;
	// 		let targetChapter = this.current.chapters[chapter];
	// 		// In case group is 0.
	// 		if (group === undefined || group === null) {
	// 			group = this.getGroup(chapter);
	// 		}
	// 		// TODO there's a possible race condition here
	// 		if (!targetChapter.loaded[group]
	// 			&& targetChapter.pageRequest[group]) {
	// 			targetChapter.pageRequest[group]().then(() => {
	// 				delete targetChapter.pageRequest[group];
	// 				targetChapter.loaded[group] = true;
	// 				this.loadingChapter = false;
	// 				resolve();
	// 			});
	// 		} else {
	// 			this.loadingChapter = false;
	// 			resolve();
	// 		}
	// 	});
	// }

	// this.initChapter = function(chapter, page, group) {
	// 	if (chapter) this.SCP.chapter = chapter;
	// 	this.loadingChapter = true;
	// 	this.SCP.chapterObject = this.current.chapters[this.SCP.chapter];
	// 	this.SCP.volume = this.SCP.chapterObject.volume;
	// 	this.SCP.chapterName = this.SCP.chapterObject.title;
	// 	if(group !== undefined && group !== null && this.SCP.chapterObject.groups[group])
	// 		this.SCP.group = group;
	// 	else
	// 		this.SCP.group = this.getGroup(chapter);

	// 	if (!this.SCP.chapterObject.loaded[this.SCP.group] && this.SCP.chapterObject.images[this.SCP.group].length === 0) {
	// 		// TODO This code is now redundant, it should be part of a bigger refactor
	// 		this.SCP.chapterObject.pageRequest[this.SCP.group]().then((count) => {
	// 			delete this.SCP.chapterObject.pageRequest[this.SCP.group]; // Save some memory, :kaguyaSmug:
	// 			this.SCP.chapterObject.loaded[this.SCP.group] = true;
	// 			this.SCP.pageCount = count;
	// 			this.SCP.lastPage = count - 1;
	// 			this.loadingChapter = false;
	// 			this.bootstrapChapter(page);
	// 		});
	// 	} else if (this.SCP.chapterObject.loaded[this.SCP.group]) {
	// 		if(this.SCP.chapterObject.notice) {
	// 			this.SCP.pageCount = 1;
	// 			this.SCP.lastPage = 0;				
	// 		}else{
	// 			this.SCP.pageCount = this.SCP.chapterObject.images[this.SCP.group].length;
	// 			this.SCP.lastPage = this.SCP.pageCount - 1;
	// 		}
	// 		this.loadingChapter = false;
	// 		this.bootstrapChapter(page);
	// 	}
	// }

	// this.getGroup = function(chapter, getDefault) {
	// 	let chapterObj = this.current.chapters[chapter || this.SCP.chapter];

	// 	if(!getDefault) {
	// 		if(Settings.get('misc.groupPreference') !== undefined
	// 		&& chapterObj.groups[Settings.get('misc.groupPreference')] !== undefined)
	// 			return Settings.get('misc.groupPreference');
	// 	}

	// 	if(chapterObj.preferred_sort){
	// 		for(var i=0;i<chapterObj.preferred_sort.length;i++){
	// 		if(chapterObj.groups[chapterObj.preferred_sort[i]])
	// 			return chapterObj.preferred_sort[i]
	// 		}
	// 	}

	// 	if(this.current.preferred_sort){
	// 		for(var i=0;i<this.current.preferred_sort.length;i++){
	// 		if(chapterObj.groups[this.current.preferred_sort[i]])
	// 			return this.current.preferred_sort[i];
	// 		}
	// 	}

	// 	return Object.keys(chapterObj.groups)[0];
	// }

	// this.boostrapChapterInterface = function(page) {
	// 	if(this.SCP.chapter == this.SCP.lastChapter) {
	// 		this._.chap_next.classList.add('disabled');
	// 		this.$.classList.add('last-chapter');
	// 	}else{
	// 		this._.chap_next.classList.remove('disabled');
	// 		this.$.classList.remove('last-chapter');
	// 	}
	// 	if(this.SCP.chapter == this.SCP.firstChapter) {
	// 		this._.chap_prev.classList.add('disabled');
	// 	}else{
	// 		this._.chap_prev.classList.remove('disabled');
	// 	}
	// 	if(this.SCP.volume >= Math.max.apply(null, Object.keys(this.current.volMap))) {
	// 		this._.vol_next.classList.add('disabled');
	// 	}else{
	// 		this._.vol_next.classList.remove('disabled');
	// 	}
	// 	if(this.SCP.volume <= Math.min.apply(null, Object.keys(this.current.volMap))) {
	// 		this._.vol_prev.classList.add('disabled');
	// 	}else{
	// 		this._.vol_prev.classList.remove('disabled');
	// 	}

	// 	this._.page_selector.classList.add('vis')
	// 	setTimeout(() => this._.page_selector.classList.remove('vis'), 3000);
	// }

	// this.bootstrapChapter = function(page) {
	// 	this.shuffleRandomChapter();
	// 	if(this.SCP.chapterObject.notice) {
	// 		this.imageView.displayNotice();
	// 		this.selector_chap.set(this.SCP.chapter, true);
	// 		this.selector_vol.set(this.SCP.volume, true);
	// 		this.boostrapChapterInterface();
	// 		this.selector_page.clearPreload();
	// 		this.displayPage(0);
	// 		this.drawGroups(true);
	// 		this.drawPreviews(false);
	// 		return this;
	// 	}
	// 	this.drawGroups();
	// 	this.drawPreviews();

	// 	this.imageView.drawImages(this.SCP.chapterObject.images[this.SCP.group], this.SCP.chapterObject.wides[this.SCP.group]);

	// 	this.selector_chap.set(this.SCP.chapter, true);
	// 	this.selector_vol.set(this.SCP.volume, true);

	// 	this.boostrapChapterInterface();

	// 	this.selector_page.clearPreload();
	// 	this.imageView.updateScrollPosition();
	// 	this.displayPage(page);
	// 	// this._.comment_button.href = '/reader/series/' + this.SCP.series + '/' + this.SCP.chapter + '/comments'
	// 	this.plusOne();
	// 	return this;
	// }

	// this.drawGroups = (clear) => {
	// 	this.groupList.clear();
	// 	if(clear) return; 
	// let groupElements = {};
	// 	for(let grp in this.SCP.chapterObject.groups) {
	// 		groupElements[grp] = new UI_SimpleListItem({
	// 			html: '<div' + ((grp==this.SCP.group)?' class="is-active"':'') + '></div>',
	// 			text: this.current.groups[grp]
	// 		})
	// 	}
	// 	this.groupList.addMapped(groupElements);
	// }

	// this.displayPage = (page, dry) => {
	// 	if(page == 'last')
	// 		this.SCP.page = this.SCP.lastPage;
	// 	else
	// 		if(page !== undefined) this.SCP.page = page;
	// 	try {
	// 		this.SCP.page = this.imageView.imageWrappersMask[this.imageView.imageWrappersMap[this.SCP.page]][0]
	// 	} catch (e) {
	// 		this.SCP.page = this.SCP.page;
	// 	}
	// 	this.imageView.selectPage(this.SCP.page, dry);
	// 	this.SCP.visiblePages = this.imageView.visiblePages;

	// 	//if last page
	// 	if(HAS_LOCALSTORAGE
	// 	&& this.imageView.visiblePages
	// 	&& this.imageView.visiblePages.includes(this.SCP.lastPage)
	// 	&& !this.SCP.chapterObject.notice){
	// 		let source = window.location.pathname.split("/");
	// 		source = source[source.indexOf(this.SCP.series) - 1];
	// 		globalHistoryHandler.addChapter(decodeURIComponent(this.SCP.series), source, this.SCP.chapter.toString());
	// 	}
	// 	this.S.out('SCP', this.SCP);
	// }

	// this.drawPreviews = (state) => {
	// 	state = state==undefined?Settings.get('apr.previews'):state;
	// 	this.previews.clear();
	// 	if(state == true) {
	// 		this.current.chapters[this.SCP.chapter].previews[this.SCP.group].forEach(
	// 			preview => {
	// 				this.previews.add(new UI_Dummy({
	// 					html: "<img src='"+preview+"' />"
	// 				}))
	// 			}
	// 		)
	// 		this.previews.select(this.SCP.page, undefined, undefined, true);
	// 	}
	// }

	// this.selectVolume = function(vol) {
	// 	if(this.current.volMap[vol])
	// 		this.initChapter(this.current.volMap[vol]);
	// }

	// this.plusOne = function() {
	// 	clearTimeout(this.plusOneTimer);
	// 	this.plusOneTimer = setTimeout(i => {
	// 	var formData = new FormData();
	// 		formData.append("series", this.SCP.series)
	// 		formData.append("group", this.SCP.group)
	// 		formData.append("chapter", this.SCP.chapter)
	// 		fetch('/read/update_view_count/', {
	// 			method: 'POST',
	// 			body: formData
	// 		})
	// 	}, 20*1000)
	// }


	// this.nextChapter = function(){
	// 	if (this.loadingChapter) return;
	// 	if(this.SCP.chapter != this.SCP.lastChapter) {
	// 	var index = this.current.chaptersIndex.indexOf(''+this.SCP.chapter);
	// 		if(index < 0) throw new Error('Chapter advance failed: invalid base index.')
	// 		this.initChapter(
	// 			this.current.chaptersIndex[index + 1],
	// 			0
	// 		)
	// 	}
	// }
	// this.prevChapter = function(page) {
	// 	if (this.loadingChapter) return;
	// 	if(this.SCP.chapter != this.SCP.firstChapter) {
	// 	var index = this.current.chaptersIndex.indexOf(''+this.SCP.chapter);
	// 		if(index < 0) throw new Error('Chapter stepback failed: invalid base index.')
	// 		this.initChapter(
	// 			this.current.chaptersIndex[index - 1],
	// 			page || 0
	// 		)
	// 	}
	// }

	// this.nextPage = function() {
	// 	if (this.loadingChapter) return;
	// let nextWrapperIndex = this.imageView.imageWrappersMap[this.SCP.page] + 1;
		
	// 	if(nextWrapperIndex >= this.imageView.imageWrappersMask.length) {
	// 		this.nextChapter();
	// 	} else {
	// 		this.displayPage(this.imageView.imageWrappersMask[nextWrapperIndex][0])
	// 	}
	// }

	// this.prevPage = function(){
	// 	if (this.loadingChapter) return;
	// 	if(this.SCP.page > 0) 
	// 		this.displayPage(this.SCP.page - 1)
	// 	else {
	// 		this.prevChapter('last');
	// 	}
	// }
	// this.nextVolume = function(){
	// 	if (this.loadingChapter) return;
	// 	this.selectVolume(+this.SCP.volume+1);
	// }
	// this.prevVolume = function(){
	// 	if (this.loadingChapter) return;
	// 	this.selectVolume(+this.SCP.volume-1)
	// }

	// this.copyShortLink = function() { 
	// 	// TODO: hard-coded values is meh
	// 	let url = document.location.href + document.location.hash;
	// var chapter = '' + (this.SCP.chapterObject.notice? +this.SCP.chapter-1 : this.SCP.chapter);
	// 	if (document.location.pathname.includes("Kaguya-Wants-To-Be-Confessed-To/")) {
	// 		url = document.location.origin + '/' + chapter.replace('.', '-') + '/'+ (this.SCP.page+1) + document.location.hash;
	// 	}
	// 	navigator.clipboard.writeText(url)
	// 	.then(function() {
	// 		Tooltippy.set('Link copied to clipboard!');
	// 	}, function(err) {
	// 		Tooltippy.set('Link copy failed ('+url+')');
	// 	});
	// }

	// this.openComments = function() {
	// 	if(this.SCP.series && this.SCP.chapter !== undefined)
	// 		window.location.href = '/read/manga/' + this.SCP.series + '/' + this.SCP.chapter + '/comments';
	// }

	// this.setLayout = (layout, silent) => {
	// 	requestAnimationFrame(() => {
	// 		this.recalculateBuffer();
	// 		this.stickHeader();
	// 	})
	// 	document.documentElement.style.overflow = "auto";

	// 	if(!silent) {
	// 		this.imageView.drawImages(this.current.chapters[this.SCP.chapter].images[this.SCP.group], this.current.chapters[this.SCP.chapter].wides[this.SCP.group]);
	// 		this.imageView.selectPage(this.SCP.page);
	// 		if(Settings.get('bhv.swipeGestures') && Settings.get('lyt.direction') != 'ttb'){
	// 			this.imageView.setTouchHandlers(true);
	// 		}else{
	// 			this.imageView.setTouchHandlers(false);
	// 		}

	// 	}
	// }	

	// this.recalculateBuffer = () => {
	// 	if (IS_MOBILE) {
	// 		this.headerScroll = this.imageView.getScrollElement().scrollTop;
	// 		if (Settings.get('lyt.direction') === 'ttb' && Settings.get('apr.selPinned')) {
	// 		var tOH = this._.title.offsetHeight;
	// 		var sOH = this._.rdr_selector.offsetHeight;
	// 			// Order of these statements seem to matter for Chrome's scroll shifting behaviour; if height is
	// 			// set before top, the scroll bug occurs. Thus, it might break in future updates.
	// 			this._.rdr_selector.style.top = tOH + 'px';
	// 			this._.rdr_aside_buffer.style.height = tOH + sOH + 'px';
	// 			// console.log(window.scrollY); // This statement also reintroduces the scroll bug regardless of order
	// 		} else {
	// 			this._.rdr_aside_buffer.style.height = '0px';
	// 		}
	// 	}
	// }
	// this.stickHeader = () => {
	// 	if(IS_MOBILE) {
	// 		if(Settings.get('lyt.direction') == 'ttb' && Settings.get('apr.selPinned')) {
	// 			this.$.classList.add('stick');
	// 		}else{
	// 			this.$.classList.remove('stick');
	// 		}
	// 		if(this.headerScroll && this.imageView.getScrollElement().scrollTop != this.headerScroll) {
	// 			this.imageView.getScrollElement().scrollTo({top: this.headerScroll});
	// 			requestAnimationFrame(() => {
	// 				this.imageView.getScrollElement().scrollTo({top: this.headerScroll});
	// 				requestAnimationFrame(() => {
	// 					this.imageView.getScrollElement().scrollTo({top: this.headerScroll});
	// 				})
	// 			})
	// 		}
	// 	}
	// }

	// this.setZoom = function(zoom) {
	// 	Settings.setClass('lyt.zoom');
	// 	this.imageView.updateWides();
	// }

	// this.toggleSidebar = function(state) {
	// 	this.imageView.updateScrollPosition();
	// 	Settings.setClass('apr.sidebar');
	// 	this.imageView.updateWides();
	// }

	// this.enqueuePreload = images => {
	// 	images.filter(item => item !== undefined)
	// 		.slice(0,4)
	// 		.forEach((img, i) => this._.preload_entity.children[i].src = img.url);
	// }

	// this.eventRouter = function(event){
	// 	({
	// 		'nextPage': () => this.nextPage(),
	// 		'prevPage': () => this.prevPage(),
	// 		'newPageIndex': (page) => {
	// 			this._.image_description.textContent = this.current.chapters[this.SCP.chapter].descriptions[this.SCP.group][page];
	// 		}
	// 	})[event.type](event.data)
	// }

	// this.settingsRouter = function(o) {
	// 	if(o.type != 'change') return;
	// var settings = {
	// 		'lyt.fit': o => {
	// 			this.imageView.updateWides();
	// 		},
	// 		'lyt.direction': o => this.setLayout(o),
	// 		'lyt.zoom': o => this.setZoom(o),
	// 		'adv.spreadCount': o => this.bootstrapChapter(),
	// 		'adv.spreadOffset': o => this.bootstrapChapter(),
	// 		'bhv.preload': number => {
	// 			this.$.setAttribute('data-preload', number);
	// 		},
	// 		'apr.sidebar': o => this.toggleSidebar(o),
	// 		'apr.selPinned': o => this.setLayout(o, true),
	// 		'apr.previews': o => this.drawPreviews(o),
	// 		'thm.reset' : o => {
	// 			ThemeManager.themeUpdated()
	// 		},
	// 		'thm.theme' : o => ThemeManager.themeUpdated(),
	// 		'thm.primaryCol' : o => ThemeManager.themeUpdated(),
	// 		'thm.readerBg' : o => ThemeManager.themeUpdated(),
	// 		'thm.accentCol' : o => ThemeManager.themeUpdated(),
	// 		'thm.textCol' : o => ThemeManager.themeUpdated(),
	// 		'misc.groupPreference': o => {},
	// 	};
	// 	if(settings[o.setting]) settings[o.setting](o.value);
	// }

	// this.shuffleRandomChapter = function() {
	// 	if(this.SCP.chapter == '46.5' && this.SCP.series == 'Kaguya-Wants-To-Be-Confessed-To') {
	// 		this._.random_chapter.classList.remove('is-hidden');
	// 	} else {
	// 		this._.random_chapter.classList.add('is-hidden');
	// 		return;
	// 	}

	// 	if(!this.current.chapters[this.SCP.chapter].previewsBackup)
	// 		this.current.chapters[this.SCP.chapter].previewsBackup = this.current.chapters[this.SCP.chapter].previews[this.SCP.group].slice();
	// 	var previews = this.current.chapters[this.SCP.chapter].previewsBackup;
	// 	var pages = this.current.chapters[this.SCP.chapter].images[this.SCP.group];
	// 	function shuffle(array) {
	// 		var currentIndex = array.length, temporaryValue, randomIndex;
	// 		while (0 !== currentIndex) {
	// 			randomIndex = Math.floor(Math.random() * currentIndex);
	// 			currentIndex -= 1;
	// 			temporaryValue = array[currentIndex];
	// 			array[currentIndex] = array[randomIndex];
	// 			array[randomIndex] = temporaryValue;
	// 		}
	// 		return array;
	// 	}
	// var subarr = previews.slice(4,16);
	// 	subarr.unshift(subarr.pop());
	// var uarr = [];
	// 	for(var i=0; i<subarr.length; i=i+2) {
	// 		uarr.push([subarr[i], subarr[i+1]])
	// 		shuffle(uarr[uarr.length-1]);
	// 	}
	// 	uarr = shuffle(uarr);
	// 	uarr = uarr.reduce((acc, val) => acc.concat(val), []);

	// 	this.current.chapters[this.SCP.chapter].previews[this.SCP.group] = previews.slice(0, 4).concat(uarr,previews.slice(-1));
	// 	this.current.chapters[this.SCP.chapter].images[this.SCP.group] = this.current.chapters[this.SCP.chapter].previews[this.SCP.group].map(p => p.replace('_shrunk',''))
	// }

	// this._.chap_prev.onmousedown = e => this.prevChapter();
	// this._.chap_next.onmousedown = e => this.nextChapter();
	// this._.vol_prev.onmousedown = e => this.prevVolume();
	// this._.vol_next.onmousedown = e => this.nextVolume();
	// this._.settings_button.onmousedown = e => Loda.display('settings');
	// new UI_MultiStateButton({node: this._.preload_button, setting: 'bhv.preload'}).S.biLink(Settings);
	// new UI_MultiStateButton({node: this._.layout_button, setting: 'lyt.direction'}).S.biLink(Settings);
	// new UI_MultiStateButton({node: this._.fit_button, setting: 'lyt.fit'}).S.biLink(Settings);
	// new UI_MultiStateButton({node: this._.sel_pin_button, setting: 'apr.selPinned'}).S.biLink(Settings);
	// new UI_MultiStateButton({node: this._.sidebar_button, setting: 'apr.sidebar'}).S.biLink(Settings);
	// new UI_MultiStateButton({node: this._.previews_button, setting: 'apr.previews'}).S.biLink(Settings);
	// new UI_MultiStateButton({node: this._.spread_button, setting: 'lyt.spread'}).S.biLink(Settings);
	// // this._.fit_button.onmousedown = e => {
	// // 	this.asideViews.S.call('number', 0);
	// // }
	// this._.zoom_level_plus.onmousedown = e => {
	// 	this.imageView.updateScrollPosition();
	// 	Settings.next('lyt.zoom', undefined, true);
	// }
	// this._.zoom_level_minus.onmousedown = e => {
	// 	this.imageView.updateScrollPosition();
	// 	Settings.prev('lyt.zoom', undefined, true);
	// }
	// this._.share_button.onmousedown = e => this.copyShortLink(e);
	// this._.search.onclick = e => Loda.display('search');
	// this._.jump.onclick = e => Loda.display('jump');
	// this._.download_chapter.onclick = () => DownloadManagerObj.downloadChapter();
	// this._.download_cancel.onclick = () => DownloadManagerObj.cancelDownload();
	// this._.random_chapter_button.addEventListener('mousedown', e => {
	// 	e.preventDefault();
	// 	e.stopPropagation();
	// 	this.initChapter(this.SCP.chapter, 2);
	// 	return false;
	// }, false)

	// Tooltippy
	// 	.attach(this._.chap_prev, 'Previous chapter [[]')
	// 	.attach(this._.chap_next, 'Next chapter []]')
	// 	.attach(this._.vol_prev, 'Previous volume [,]')
	// 	.attach(this._.vol_next, 'Next volume [.]')
	// 	.attach(this._.preload_button, 'Change preload [L]')
	// 	.attach(this._.layout_button, 'Change layout direction [D]')
	// 	.attach(this._.fit_button, 'Change fit mode [F]')
	// 	.attach(this._.sel_pin_button, 'Pin page selector [N]')
	// 	.attach(this._.sidebar_button, 'Show/hide sidebar [S]', 'right')
	// 	.attach(this._.previews_button.querySelector('.expander'), 'Show previews [P]')
	// 	.attach(this._.share_button, 'Copy short link [R]')
	// 	.attach(this._.search, 'Search the manga... [Ctrl]+[F]')
	// 	.attach(this._.jump, 'Jump to chapter... [J]')
	// 	.attach(this._.spread_button, 'Change two-page mode [Q]')
	// 	.attach(this._.settings_button, 'Advanced settings... [O]')
	// 	.attach(this._.download_chapter, 'Download chapter in the background')
	// 	//.attach(this._.comment_button, 'Go to comments [C]')
	// 	// .attach(this._.fit_none, 'Images are displayed in natural resolution.')
	// 	// .attach(this._.fit_all, 'Images expand to width or height.')
	// 	// .attach(this._.fit_width, 'Images expand to max width.')
	// 	// .attach(this._.fit_height, 'Images expand to max height.')
	// 	// .attach(this._.fit_all_limit, 'Natural image size that does not exceed max width or height.')
	// 	// .attach(this._.fit_width_limit, 'Natural image size that does not exceed max width.')
	// 	// .attach(this._.fit_height_limit, 'Natural image size that does not exceed max height.')
	// 	// .attach(this._.zoom_level_plus, 'Increase zoom level')
	// 	// .attach(this._.zoom_level_minus, 'Decrease zoom level')

	// this.S.mapIn({
	// 	seriesUpdated: this.updateData,
	// 	isFirstParty: this.controlFeatures,
	// 	event: this.eventRouter,
	// 	settingsPacket: this.settingsRouter,
	// 	message: message => {
	// 		Tooltippy.set(message);
	// 	},
	// })

	// this.S.link(this.selector_page);
	// this.S.linkAnonymous('SCP', SCP => this.previews.select(SCP.page, undefined, undefined, true));
}
