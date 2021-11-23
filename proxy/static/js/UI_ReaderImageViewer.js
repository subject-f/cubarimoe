function UI_ReaderImageViewer(o) {
	UI.call(this, {
		o: o,
		html: `
		<div class="preload-entity" data-bind="preload_entity">
			<img /><img /><img /><img />
		</div>
		<div class="rdr-image-wrap" data-bind='container' tabindex="-1">
		</div>
		<div class="zoom-level refresh-chapter is-hidden" data-bind="random_chapter">
			<div class="refresh-chapter-note">This is the Blu-ray extras "random chapter".<br>Click this button to
			reshuffle the chapter.</div>
			<div class="ico-btn" data-bind="random_chapter_button">↻</div>
		</div>
		<div class="hover-prev" data-bind="hover_prev">
			<div class="hover-wrap">
				<div class="hover-arrow"></div>
				<div class="hover-sub"></div>
			</div>
		</div>
		<div class="hover-next" data-bind="hover_next">
			<div class="hover-wrap">
				<div class="hover-arrow"></div>
				<div class="hover-sub"></div>
			</div>
		</div>`
	});
	Linkable.call(this);
	this.firstDraw = true;
	this.imagePool = new Map();
	this.wrapperTriad = [
		new UI_ReaderImageWrapper(),
		new UI_ReaderImageWrapper(),
		new UI_ReaderImageWrapper()
	];

	this.render = (chapter, page=0) => {
		this.imagePool.clear();
		chapter.images.forEach((imageName, index) => {
			this.imagePool.set(
				index,
				new UI_ReaderImage({
					src: chapter.base + imageName //TODO: unsafe
				})
			)
		})
		this.wrapperTriad.forEach(wrapper => this._.container.appendChild(wrapper.$))
		this.show(page)
	}

	this.show = (page) => {
		if(this.d.page == page) return;

		this.wrapperTriad.forEach((wrapper, index) => {
			wrapper.clear();
		let offset = page + index - 1;
			if(offset < 0) return;
			this.imagePool.get(offset).load();
			wrapper.add(this.imagePool.get(offset))
		})
		this.d.page = page;
		this._.container.style.transform = 'translateX(-100%)'
	}
// 	this.imageContainer = new UI_Tabs({
// 		node: this._.image_container,
// 		held: true
// 	})
// 	this.wrappers = {};
	
// 	this.getScrollElement = function() {
// 		if(Loda.open) return {
// 			focus: () => {},
// 			scroll: () => {}
// 		};
// 		if(Settings.get('lyt.direction') == 'ttb') {
// 			if(IS_MOBILE) {
// 				return document.documentElement;
// 			}else{
// 				return this._.image_container;
// 			}
// 		}else{
// 			return this.wrappers.current.$;
// 		}
// 	}

// 	new KeyListener(document.body, 'hold')
// 		.attach('slideDown', ['ArrowDown'], (e, frame) => {
// 		var scr = this.getScrollElement();
// 			scroll(scr, scr.scrollLeft,scr.scrollTop + Settings.get('bhv.scrollYDelta')*Math.min((frame+1)*2/20,1), true)
// 		})
// 		.attach('slideUp', ['ArrowUp'], (e, frame) => {
// 		var scr = this.getScrollElement();
// 			scroll(scr, scr.scrollLeft,scr.scrollTop - Settings.get('bhv.scrollYDelta')*Math.min((frame+1)*2/20,1), true)
// 		});

// 	this.scroll = {
// 		prevY: 0,
// 		direction: null,
// 		anchorObject: null,
// 		anchorOffset: 0,
// 		anchorRAF: 0,
// 		anchorTimeout: 0
// 	}

// 	document.onscroll = this._.image_container.onscroll = e => {
// 		if(PROGRAMMATIC_SCROLL) return true;
// 		if(!this.imageList) return true;
// 		if(Settings.get('lyt.direction') != 'ttb') return true;

// 		// Reader.stickHeader();
// 	var scrollTop = (e.target.scrollingElement)?
// 				e.target.scrollingElement.scrollTop:
// 				undefined
// 			|| e.target.scrollTop;
// 		// console.log('wideUpdate fire')
// 		if(!this.scroll.anchorRAF) {
// 			this.updateScrollPosition();
// 		}
// 	this.scroll.direction = scrollTop > this.scroll.prevY?1:-1;
// 	var st = scrollTop + document.documentElement.clientHeight * (this.scroll.direction > 0?0.70:0.30);
// 	if(window.test_element) window.test_element.style.top = st + 'px'; 
// 	this.scroll.prevY = scrollTop;
// 	var offsets = this.imageList.map(item => item.$.offsetTop + item.$.parentNode.offsetTop);
// 		offsets.push(st);
// 		offsets = offsets.sort((a, b) => a - b);
// 	var index = offsets.indexOf(st) - 1;
// 		if(index + 1 == offsets.length) return true;
// 		if(Reader.SCP.page == index) return true;
// 		for(var i=0; i<index; i++) {
// 			this.imageList[i].load();
// 		}
// 		setTimeout(() => Reader.displayPage(index, true), 1);
// 		return true;
// 	}

// 	this.$.onscroll = () => {
// 		scroll(this.$, 0, 0, true);
// 	}

// 	this.scrollAnchor = () => {
// 		this.scroll.anchorRAF = requestAnimationFrame(this.scrollAnchor);
// 		scroll(this.imageContainer.$, 0, this.scroll.anchorObject.offsetTop + (this.scroll.anchorOffset>0?this.scroll.anchorOffset*-1:this.scroll.anchorObject.offsetHeight * this.scroll.anchorPoint))
// 	}

// 	this.updateScrollPosition = () => {
// 		if(!this.wrappers.current) return;
// 		this.scroll.anchorObject = this.wrappers.current.$;
// 		this.scroll.anchorOffset = this.wrappers.current.$.getBoundingClientRect().top;
// 		this.scroll.anchorPoint = (this.imageContainer.$.scrollTop - this.wrappers.current.$.offsetTop) / this.wrappers.current.$.offsetHeight;
// 	}

// 	this.updateWides = () => {
// 		if(Settings.get('lyt.direction') == 'ttb' && this.wrappers.current ) {
// 			// console.log('wideUpdate fire')
// 			if(!this.scroll.anchorRAF && this.scroll.anchorObject) {
// 				this.scrollAnchor();
// 			}

// 			if(this.scroll.anchorTimeout) clearTimeout(this.scroll.anchorTimeout);
// 			this.scroll.anchorTimeout = setTimeout(() => {
// 				cancelAnimationFrame(this.scroll.anchorRAF);
// 				this.scroll.anchorRAF = 0;
// 				this.updateScrollPosition();
// 			}, 60)
// 		}
// 		if(!this.imageWrappers) return;
// 		for(var i=0; i < this.imageWrappers.length; i++) {
// 			if(this.imageWrappers[i].$.scrollWidth > this.imageWrappers[i].$.clientWidth) {
// 				this.imageWrappers[i].$.classList.add('too-wide');
// 			}else{
// 				this.imageWrappers[i].$.classList.remove('too-wide');
// 			}
// 		}
// 	}

// 	this.drawImages = function(images, wides) {
// 		this.imageContainer.clear();
// 		this.imageWrappers = [];
// 		this.imageWrappersMask = [];
// 		this.imageWrappersMap = {};
// 	var spreadCount = Settings.get('adv.spreadCount');
// 	var	spreadOffset = Settings.get('adv.spreadOffset');
// 	var imageIndices = [];
// 		for(var i=0; i < images.length; i++) {
// 			imageIndices.push(i);
// 			this.imageWrappersMap[i] = this.imageWrappersMask.length;
// 			if(wides.indexOf(i) > -1 || wides.indexOf(i+1) > -1){
// 				spreadOffset++;

// 			}
// 			if(spreadOffset >= spreadCount - 1 || i >= images.length - 1) {
// 				if(wides.indexOf(i) > -1)
// 					spreadOffset = Settings.get('adv.spreadOffset');
// 				else
// 					spreadOffset = 0;
// 				this.imageWrappersMask.push(imageIndices);
// 				imageIndices = [];
// 			}else{
// 				spreadOffset++;
// 			}
// 		}

// 		this.imageWrappers = this.imageWrappersMask.map(wrapper => 
// 			new UI_ReaderImageWrapper({
// 				imageObjects: wrapper.map(index => ({
// 					url: images[index],
// 					index: index,
// 				}))
// 			}).S.link(this)
// 		);

// 		this.imageList = [];

// 		this.imageWrappers.forEach(wrapper => {
// 			wrapper.S.link(Reader.selector_page);
// 			this.imageList = this.imageList.concat(wrapper.get());
// 		})
// 		if(Settings.get('lyt.direction') == 'rtl') {
// 			this.imageWrappers.reverse();
// 			this.imageWrappers.forEach(i => i.reverse());
// 		}
// 		this.imageContainer.add(this.imageWrappers);

// 		scroll(this.imageContainer.$, 0,0);
		
		
// 		if(Settings.get('lyt.direction') == 'ttb') {
// 		var butt = new UI_Dummy();
// 			butt.$.classList.add('nextCha');
// 			butt.$.onmousedown = e => {
// 				e.preventDefault();
// 				Reader.nextChapter(0);
// 			}
// 			this.imageContainer.add(butt);
// 		}
// 	}

// 	this.selectPage = function(index, dry) {
// 		if(index < 0 || index >= this.imageList.length)
// 			return;

// 		this.selectedPage = this.imageList[index];
// 		this.wrappers.current = this.selectedPage.parentWrapper;
// 	var wrapperIndex = this.imageWrappers.indexOf(this.wrappers.current);
// 		this.wrappers.left = this.imageWrappers[wrapperIndex - 1] || null;
// 		this.wrappers.right = this.imageWrappers[wrapperIndex + 1] || null;
// 		this.visiblePages = this.wrappers.current.getIndices();
// 		if(Settings.get('lyt.direction') == 'ttb') {
// 			if (!dry){	
// 				setTimeout(this.getScrollElement().focus(), 1);
// 				if(IS_MOBILE) {
// 					scroll(this.getScrollElement(), 0, this.wrappers.current.$.getBoundingClientRect().top + this.getScrollElement().scrollTop);
// 				}else{
// 					scroll(this.getScrollElement(), 0,this.wrappers.current.$.offsetTop);
// 				}
// 			}
// 		}else{
// 			if(this.touch.transitionTimer) {
// 				this.touch.transitionTimer.then(() => {
// 					this.moveContainer(wrapperIndex);
// 				})
// 			}else{
// 				this.moveContainer(wrapperIndex);
// 			}
// 			//this.getScrollElement().focus();
// 			if(Settings.get('bhv.resetScroll')) scroll(this.getScrollElement(), 0, 0);
// 		}
// 	var spreadCount = Settings.get('adv.spreadCount');
// 	var toPreload = Settings.get('bhv.preload');
// 		if(toPreload == 100) {
// 			toPreload = this.imageList.length;
// 		}
// 		toPreload = toPreload * spreadCount;
// 		for (var i = index - 3; i < index + Math.max(toPreload, Settings.get('adv.spreadCount')); i++) {
// 			if(this.imageList[i]) {
// 				this.imageList[i].load();
// 			}else if(this.imageList.length < i)
// 				break;
// 		}
// 		if(spreadCount == 2) {
// 			Reader.enqueuePreload([
// 				this.imageList[index-2],
// 				this.imageList[index-1],
// 				this.imageList[index+2],
// 				this.imageList[index+3]
// 			]);
// 		}else{
// 			Reader.enqueuePreload([
// 				this.imageList[index-1],
// 				this.imageList[index+1]
// 			]);
// 		}
// 		this.S.out('event', {type: 'newPageIndex', data: index})
// 	}

// 	this.prev = () => {
// 		this.S.out('event', {type: 'prevPage'});

// 	}
// 	this.next = () => {
// 		this.S.out('event', {type: 'nextPage'})
// 	}

// 	this.moveContainer = (index) => {
// 		this.containerOffset = ( -100 * index);
// 		// this.imageContainer.$.style.transform = 'translateX(' + this.containerOffset + '%)';
// 		this.imageContainer.$.style.marginLeft = this.containerOffset + '%';
// 	}

// 	this.moveWrappers = (offset, snap) => {
// 		if(!this.touch.affectedWrappers) {
// 			this.touch.affectedWrappers = [];
// 			if(this.wrappers.left) this.touch.affectedWrappers.push(this.wrappers.left);
// 			this.touch.affectedWrappers.push(this.wrappers.current);
// 			if(this.wrappers.right) this.touch.affectedWrappers.push(this.wrappers.right);
// 		}
// 		if(snap) {
// 			this.touch.affectedWrappers.forEach(wrapper => wrapper.$.style.transition = `opacity 0.3s ease, transform ${this.touch.transitionTime}s cubic-bezier(${this.touch.transitionTime},.55,.4,1)`);
// 			this.touch.transitionTimer = promiseTimeout(Math.round(this.touch.transitionTime*1000), true);
// 			this.touch.transitionTimer.then(() => {
// 					this.touch.affectedWrappers.forEach(wrapper => wrapper.$.style = '');
// 					this.touch.affectedWrappers = null;
// 					delete this.touch.transitionTimer;
// 				}).catch(() => {delete this.touch.transitionTimer;})	
// 		}else{
// 			//for regrab
// 			if(this.touch.transitionTimer) {
// 				this.touch.transitionTimer.cancel();
// 				this.touch.transitionTimer = false;
// 				this.touch.affectedWrappers = null;
// 			}
// 		}
// 		if(this.wrappers.left) this.wrappers.left.$.style.transform = `translateX(${offset * 100}%)`;
// 		this.wrappers.current.$.style.transform = `translateX(${offset * 100}%)`;
// 		if(this.wrappers.right) this.wrappers.right.$.style.transform = `translateX(${offset * 100}%)`;
// 	}

// const SCROLL = 1;
// const SWIPE = 2;
// const SCROLL_X = 3;

// 	this.setTouchHandlers = (state) => {
// 		if(state) {
// 			this._.image_container.ontouchstart = this.touch.startHandler;
// 			this._.image_container.addEventListener('touchmove', this.touch.moveHandler, {passive: false});
// 			this._.image_container.ontouchend = this.touch.endHandler;
// 			this._.image_container.ontouchcancel = this.touch.endHandler;
// 		}else{
// 			this._.image_container.ontouchstart = undefined;
//             this._.image_container.removeEventListener('touchmove', this.touch.moveHandler);
//             this._.image_container.ontouchend = undefined;
// 			this._.image_container.ontouchcancel = undefined;
// 		}
// 	}

// 	this.touch = {
// 		start: 0,
// 		startY: 0,
// 		initialX: 0,
// 		scrollY: 0,
// 		transitionTimer: null,
// 		delta: 0,
// 		deltaY: 0,
// 		em: parseFloat(getComputedStyle(document.body).fontSize),
// 		gesture: null,
// 		time: null,
// 		escapeVelocity: 0.07,
// 		escapeDelta: 0.40,
// 		imagePosition: 0,
// 		a: null
// 	};
	
// 	this.touch.startHandler = e => {
// 		if(this.touch.transitionTimer) return;
// 		if(e.touches.length > 1) return;
// 		this.touch.initialX = 0;
// 		this.touch.x = e.touches[0].pageX;
// 		this.touch.y = e.touches[0].pageY;
// 		this.touch.containerWidth = this._.image_container.offsetWidth;
// 		this.touch.startX = this.touch.x;
// 		this.touch.startY = this.touch.y;
// 		this._.image_container.style.transition = '';
// 		this.touch.gesture = null;
// 		this.touch.delta = 0;
// 		this.touch.deltaY = 0;
// 		this.touch.scrollY = window.scrollY;
// 		this.touch.measures = [];
// 		this.touch.times = [];
// 		if(this.touch.affectedWrappers) this.touch.affectedWrappers.forEach(wrapper => wrapper.$.style = '');
// 		this.touch.affectedWrappers = null;
// 	var maxScroll = this.wrappers.current.get().map(img => img.$.offsetWidth).reduce((i, k) => i + k) - this.wrappers.current.$.offsetWidth;
// 		if(maxScroll <= 0){
// 			this.touch.imagePosition = null;
// 		}else if(Math.abs(this.wrappers.current.$.scrollLeft) >= maxScroll-2) {
// 			this.touch.imagePosition = 1;
// 		}else if(Math.abs(this.wrappers.current.$.scrollLeft) == 0) {
// 			this.touch.imagePosition = -1;
// 		}else{
// 			this.touch.imagePosition = 0;
// 		}
// 	}
	
// 	this.touch.moveHandler = e => {
// 		if(this.touch.transitionTimer) return;
// 		this.touch.x = e.touches[0].pageX;
// 		this.touch.y = e.touches[0].pageY;
// 		// this.touch.a = requestAnimationFrame(this.touch.anim);
// 		if(this.touch.gesture == SCROLL) return;
// 		if(Settings.get('lyt.direction') == 'ttb') return;

// 		this.touch.delta = (this.touch.x - this.touch.startX) / this.touch.containerWidth;
// 		if(this.touch.imagePosition == 0
// 		|| this.touch.imagePosition == 1 && this.touch.delta > 0
// 		|| this.touch.imagePosition == -1 && this.touch.delta < 0) {
// 			this.touch.gesture = SCROLL_X;
// 			return;
// 		}
// 		this.touch.deltaY = this.touch.y - this.touch.startY;

// 		if(Settings.get('lyt.direction') == 'rtl'){
// 			if((Reader.SCP.page == Reader.SCP.lastPage && this.touch.delta > 0)
// 			|| (Reader.SCP.page == 0 && this.touch.delta < 0)) {
// 				this.wrappers.current.$.style.opacity = (0.6-Math.abs(this.touch.delta))/0.6;
// 			}
// 		}else{
// 			if((Reader.SCP.page == Reader.SCP.lastPage && this.touch.delta < 0)
// 			|| (Reader.SCP.page == 0 && this.touch.delta > 0)) {
// 				this.wrappers.current.$.style.opacity = (0.6-Math.abs(this.touch.delta))/0.6;
// 			}
// 		}

// 		this.touch.measures.push(this.touch.x);
// 		this.touch.times.push(Date.now());
// 		this.moveWrappers(this.touch.delta);


// 		if(Math.abs(this.touch.delta) > 0.030 || this.touch.gesture == SWIPE) {
// 			this.touch.gesture = SWIPE;
// 			e.preventDefault();
// 			if(this.touch.scrollLocked == true) return;
// 			document.documentElement.style.overflow = "hidden";
// 			this.touch.scrollLocked = true;
// 			return;
// 		}
// 		if(Math.abs(this.touch.deltaY) > this.touch.em) {
// 			this.touch.gesture = SCROLL;
// 			this.moveWrappers(0);
// 			if(this.touch.scrollLocked == false) return;
// 			document.documentElement.style.overflow = "auto";
// 			this.touch.scrollLocked = false;
// 			return;
// 		}
// 	}

// 	this.touch.endHandler = e => {
// 		if(this.touch.gesture == SCROLL_X || this.touch.gesture == SCROLL) return;
// 		if(this.touch.transitionTimer) return;
// 		//cancelAnimationFrame(this.touch.a);
// 		//this._.image_container.style.touchAction = 'unset';
// 	var times = this.touch.times.slice(-4);
// 	var measures = this.touch.measures.slice(-4);
// 	var ms = times[times.length-1] - times[0];
// 	var delta = measures[measures.length-1] - measures[0];
// 	var velocity = (delta / ms) * this.touch.em / 100;
// 		this.touch.times = [];
// 		this.touch.measures = [];
// 		this.touch.transitionTime = Math.max(0, 0.30 - Math.abs(velocity)/2.5);
// 		if(isNaN(this.touch.transitionTime)) this.touch.transitionTime = 0;
// 		if((velocity < this.touch.escapeVelocity * -1
// 		|| this.touch.delta < this.touch.escapeDelta * -1)
// 		&& !(Reader.SCP.chapter == Reader.SCP.lastChapter
// 			&& Reader.SCP.page == Reader.SCP.lastPage
// 			&& Settings.get('lyt.direction') == 'rtl')) {
// 			this.moveWrappers(-1, true);
// 			switch(Settings.get('lyt.direction')){
// 				case 'ltr':
// 					if(this.touch.transitionTimer)
// 						this.touch.transitionTimer.then(this.next)
// 					else
// 						this.next();
// 					break; 
// 				case 'rtl': 
// 					if(this.touch.transitionTimer)
// 						this.touch.transitionTimer.then(this.prev)
// 					else
// 						this.prev();
// 					break;
// 			}
// 		}else
// 		if((velocity > this.touch.escapeVelocity
// 		|| this.touch.delta > this.touch.escapeDelta)
// 		&& !(Reader.SCP.chapter == Reader.SCP.firstChapter
// 			&& Reader.SCP.page == 0
// 			&& Settings.get('lyt.direction') == 'ltr')) {
// 			this.moveWrappers(1, true);
// 			switch(Settings.get('lyt.direction')){
// 				case 'ltr':
// 					if(this.touch.transitionTimer)
// 						this.touch.transitionTimer.then(this.prev)
// 					else
// 						this.prev();
// 					break; 
// 				case 'rtl': 
// 					if(this.touch.transitionTimer)
// 						this.touch.transitionTimer.then(this.next)
// 					else
// 						this.next();
// 					break;
// 			}
// 		}else{
// 			this.moveWrappers(0, true);
// 		}
// 	}

// 	this.mouseHandler = function(e) {
// 		if(e.type == 'mousedown') {
// 			this.mouseHandler.dead = false;
// 			this.mouseHandler.active = true;
// 			this.mouseHandler.initPos = {x: e.pageX, y: e.pageY};
// 			return;
// 		}
// 		if(e.type == 'mousemove') {
// 			if(this.mouseHandler.dead || !this.mouseHandler.active) {
// 				this.mouseHandler.justHover = true;
// 			}else{
// 				if(Math.abs(this.mouseHandler.initPos.x - e.pageX) > 20 ||
// 				Math.abs(this.mouseHandler.initPos.y - e.pageY) > 20) {
// 					this.mouseHandler.dead = true;
// 				}
// 				return;
// 			}
// 		}
// 		if(e.type == 'click') {
// 			this.mouseHandler.active = false;
// 			if(this.mouseHandler.dead) {
// 				return;
// 			}
// 		}
// 		if(e.type == 'mouseleave') {
// 			this._.hover_prev.classList.add('nodelay');
// 			this._.hover_next.classList.add('nodelay');
// 			this._.hover_prev.classList.remove('viz');
// 			this._.hover_next.classList.remove('viz');
// 			setTimeout(t => {
// 				this._.hover_prev.classList.remove('nodelay');
// 				this._.hover_next.classList.remove('nodelay');
// 			}, 1)
// 			this.mouseHandler.previousArea = null;
// 			clearTimeout(this.mouseHandler.arrowTimeout);
// 			return;
// 		}
// 		if(e.button != 0) return;
// 		if(Settings.get('bhv.clickTurnPage') === false) return;
// 	var box = this.$.getBoundingClientRect();
// 	var areas = [
// 			0,
// 			box.width * 0.35 + box.left,
// 			box.width * 0.5 + box.left,
// 			box.width * 0.65 + box.left,
// 			box.width + box.left
// 		];
// 		areas.push(e.pageX);
// 		areas.sort((a,b) => a - b);
// 		if(e.type == 'click') {
// 			switch (areas.indexOf(e.pageX)) {
// 				case 1:
// 					if(Settings.get('lyt.direction') == 'ttb') break;
// 					(Settings.get('lyt.direction') == 'rtl')?
// 						this.next(e):
// 						this.prev(e);
// 					break;
// 				case 2:
// 				case 3:
// 					if(IS_MOBILE)
// 						Settings.cycle('apr.selPinned', undefined, undefined, true); //RMD: notip
// 					break;
// 				case 4:
// 					if(Settings.get('lyt.direction') == 'ttb') break;
// 					(Settings.get('lyt.direction') == 'rtl')?
// 						this.prev(e):
// 						this.next(e);
// 					break;
// 				default:
// 					break;
// 			}
// 		}else{
// 			if(this.mouseHandler.previousArea == areas.indexOf(e.pageX))
// 				return;
// 			this.mouseHandler.previousArea = areas.indexOf(e.pageX);
// 			clearTimeout(this.mouseHandler.arrowTimeout);
// 			switch (this.mouseHandler.previousArea) {
// 				case 1:
// 					if(!IS_MOBILE) {
// 						this._.hover_prev.classList.add('viz');
// 						this._.hover_next.classList.remove('viz');
// 						this.mouseHandler.arrowTimeout = setTimeout(t => {
// 							this._.hover_prev.classList.remove('viz');
// 							this.mouseHandler.previousArea = null;
// 						}, 1000) //MAGICNUM
// 					}
// 					break;
// 				case 2:
// 				case 3:
// 						this._.hover_prev.classList.remove('viz');
// 						this._.hover_next.classList.remove('viz');
// 					break;
// 				case 4:
// 					if(!IS_MOBILE) {
// 						this._.hover_next.classList.add('viz');
// 						this._.hover_prev.classList.remove('viz');
// 						this.mouseHandler.arrowTimeout = setTimeout(t => {
// 							this._.hover_next.classList.remove('viz');
// 							this.mouseHandler.previousArea = null;
// 						}, 1000) //MAGICNUM
// 					}
// 					break;
// 				default:
// 					break;
// 			}
// 		}
// 	}

// 	this.displayNotice = function() {
// 		this.imageContainer.clear();
// 		this.imageWrappersMask = [[0]];
// 		this.imageWrappersMap = {0: 0};

// 	var notice = new UI_ReaderNoticeWrapper({});
// 		this.wrappers = []
// 		this.imageWrappers = [notice];
// 		this.imageList = notice.get();
// 		this.imageContainer.add(this.imageWrappers);
// 	}

// 	this.$.onmousedown = e => this.mouseHandler(e);
// 	this.$.onmousemove = e => this.mouseHandler(e);
// 	this.$.onclick = e => this.mouseHandler(e);
// 	this.$.onmouseleave = e => this.mouseHandler(e);

// 	this.resizeSensor = new ResizeSensor(this.$, this.updateWides);

// 	this.S.mapIn({
// 	 	'imageDimensions': (a,b) => {
// 	 		if(a.h/a.w > 3 && !this.webtoonPrompt) {
// 	 			this.webtoonPrompt = true;
// 	 			if(Settings.get('lyt.direction') == 'ttb') return;
// 	 			Loda.display('webtoon');
// 	 		}
// 	 	}
// 	 })
}
