
function UI_ReaderImageWrapper(o) {
	o=be(o);
	UI_List.call(this, {
		node: o.node,
		kind: ['ReaderImageWrapper'].concat(o.kind || []),
		html: o.html || '<div tabindex="-1"></div>'
	});
	Linkable.call(this);

	/*this.imageInstances = [];
	this.totalWidth = 0;
	//imageObject = {url, index}
	if(o.imageObjects) {
		o.imageObjects.forEach(img => {
		let image = new UI_ReaderImage({
				url: img.url,
				index: img.index,
				parentWrapper: this
			})
			image.S.link(this);
			this.imageInstances.push(image);
		})
	}else{
		console.error(this, 'No images supplied!')
	}
	this.add(this.imageInstances);

	if(this.imageInstances.length > 1) {
		this.$.classList.add('two-page');
	}*/

	this.load = function() {
		this.imageInstances.forEach(img => img.load());
	}
	this.getIndices = function() {
		return this.get().map(img => img.index)
	}
	this.checkTooWide = width => {
		this.totalWidth += width;
		if(this.totalWidth > this.$.clientWidth) {
			this.$.classList.add('too-wide');
		}
		if(Settings.get('lyt.direction') == 'rtl') {
			scroll(this.$, this.totalWidth,0)
		}
	}

	this.destroy = () => {
		var children = this.$.children.slice()
		for(var i=0; i<children.length; i++) {
			if(children[i]._struct) children[i]._struct.destroy();
		}
		alg.discardElement(this.$);
		if(this.S) this.S.destroy();
	}

	this.S.mapIn({
		'imageWidth': this.checkTooWide
	})
	this.S.proxyOut('loaded');
	this.S.proxyOut('imageDimensions');
}


function UI_ReaderNoticeWrapper(o) {
	o=be(o);
	UI_List.call(this, {
		node: o.node,
		kind: ['ReaderImageWrapper'].concat(o.kind || []),
		html: o.html || '<div tabindex="-1"></div>'
	});
	Linkable.call(this);

	this.imageInstances = [];
	this.totalWidth = 0;

	function countdown(time) {
		time = new Date(time * 1000);
		var t = time.getTime() - Date.now()
		var times = [
			Math.floor( t/(1000*60*60*24) ) + ' days',
			Math.floor( (t/(1000*60*60)) % 24 ) + ' hours',
			Math.floor( (t/1000/60) % 60 ) + ' minutes'
		].slice(0,-1);
		for(var i=0; i<times.length; i++) {
			if(times[i][0] == 0) {
				times.shift();
				i--;
				continue;
			}
			break;
		}
		times = times.slice(0,2);
		times = times.map(item => {
			if(parseInt(item) == 1) return item.replace(/s$/, '');
			else
			return item;
		});
		if(t < 0) return 'Should be soon!';
		return times.join(' ');
	}
	let release;
		if(Reader.current.next_release_time)
			release = Reader.current.next_release_time;
		else
			release = Reader.SCP.chapterObject.release_date[Object.keys(Reader.SCP.chapterObject.release_date)[0]] + 7 * 24 * 60 * 60;
var notice = new UI_Dummy({
		html: ('<div class="ReaderNotice">' +
			(Reader.current.next_release_html || `<h2>You're caught up!</h2>
			<p>Next chapter should come out in about:</p>
			<div class="timer">$countdown</div>
			<a href="https://discord.gg/BDpCRUJ" target="_blank">Discuss the chapter in the Kaguya Discord</a>
			<a href="https://twitter.com/GuyaMoe" target="_blank">Follow our Twitter for updates</a>
			<a href="https://www.viz.com/read/manga/kaguya-sama-love-is-war/all" target="_blank">Buy the official volumes</a>`
		) + '</div>').replace('$countdown', countdown(release))
	});
	notice.parentWrapper = this;
	notice.load = () => {};
	this.imageInstances.push(notice);
	this.add(notice);

	this.load = function() {};
	this.getIndices = function() {return [1]}
	this.checkTooWide = width => {}

	this.destroy = () => {
		var children = this.$.children.slice()
		for(var i=0; i<children.length; i++) {
			if(children[i]._struct) children[i]._struct.destroy();
		}
		alg.discardElement(this.$);
		if(this.S) this.S.destroy();
	}
	this.S.proxyOut('loaded');
}
