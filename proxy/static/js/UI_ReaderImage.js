
function UI_ReaderImage(o) {
	o=be(o);
	UI.call(this, {
		node: o.node,
		kind: ['ReaderImage'].concat(o.kind || []),
		html: o.html || '<img src="" />'
	});
	Linkable.call(this);

	this.index = o.index;
	this.src = o.src;
	this.parentWrapper = o.parentWrapper;

	this.onloadHandler = function(e) {
		if(e.type == 'load') {
			this.S.out('loaded', this.index);
			cancelAnimationFrame(this.RAF);
			return;
		}
		//if(!IS_MOBILE) dragscroll.reset([this.$])
		//if(this.fore) this._.image.style.background = 'url('+this.fore+') no-repeat scroll 0% 0% / 0%';
	}

	this.watchImageDimensions = () => {
		this.RAF = requestAnimationFrame(this.watchImageDimensions);
		if(this.$.naturalWidth > 0) {
			this.S.out('imageWidth', this.$.offsetWidth);
			this.S.out('imageDimensions', {h: this.$.offsetHeight, w: this.$.offsetWidth});
			cancelAnimationFrame(this.RAF);
			this.RAF = null;
			return;
		}
	}

	this.load = function() {
		if(this.loaded) return;
		this.RAF = requestAnimationFrame(this.watchImageDimensions);
		this.$.loading = 'eager';
		this.$.src = this.src;
		this.$.onload = e => this.onloadHandler(e);
		this.loaded = true;
	}

	this.destroy = () => {
		this.$.src = 'data:image/gif;base64, R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAI=';
		if(this.RAF) cancelAnimationFrame(this.RAF);
		alg.discardElement(this.$);
		if(this.S) this.S.destroy();
		this.load = () => {}
	}

}
