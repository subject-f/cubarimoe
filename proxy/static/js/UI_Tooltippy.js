
function UI_Tooltippy(o) {
	o=be(o);
	UI.call(this, {
		node: o.node,
		kind: ['Tooltippy'].concat(o.kind || []),
		html: o.html || '<div></div>',
	});
	
	this.attached = false;

	this.handler = e => {
	var tip = e.target.getAttribute('data-tip');
		if(tip) {
			this.attached = true;
		var rect = e.target.getBoundingClientRect()
		var bodyRect = document.body.getBoundingClientRect();
		var align = e.target.getAttribute('data-tip-align')
		var offset = e.target._ttOffset || 2;
			this.set(tip);
			this.$.style.display = 'block';
			if(IS_MOBILE) return;
			if(align == 'right')
				this.$.style.bottom = document.body.offsetHeight - (rect.top - bodyRect.top) - rect.height + this.$.offsetHeight + 2 + 'px';
			else
				this.$.style.bottom = document.body.offsetHeight - (rect.top - bodyRect.top) + offset + 'px';
			if(e.pageX > window.innerWidth / 2) {
				this.$.style.left = 'unset';
				this.$.style.right = window.innerWidth - rect.left - rect.width + 'px';
			}else{
				this.$.style.right = 'unset';
				if(align == 'right')
					this.$.style.left = rect.left + rect.width + 4 + 'px';
				else
					this.$.style.left = rect.left + 'px';
			}
		}
	}

	this.set = function(text) {
		if(text.length < 1) return;
		text = text.replace(/\[(.|Ctrl|Shift|Meta|Alt)\]/g, '<span class="Tooltippy-key">$1</span>');
		this.$.innerHTML = text;
		if(!this.attached || IS_MOBILE) {
			this.$.style.display = 'block';
			if(IS_MOBILE) {
				this.$.style.bottom = window.innerHeight * 0.20 + 'px';
			}else{
				this.$.style.bottom = window.innerHeight * 0.90 + 'px';
			}
			this.$.style.left = 'unset';
			this.$.style.right = Reader.imageView.$.offsetWidth / 2 - this.$.offsetWidth / 2 + 'px'; // TODO: REMOVE HARDCODE
		}
		this.$.classList.remove('fadeOut');
		clearTimeout(this.fader);
		this.fader = setTimeout(() => this.$.classList.add('fadeOut'), 3000);

	}

	this.reset = function (e) { 
		this.attached = false;
		this.$.style.display = 'none';
	}

	this.attach = function(element, text, align, offset) {
		element.onmouseover = e => this.handler(e);
		element.onmouseleave = e => this.reset(e)
		element.setAttribute('data-tip', text);
		if(align) element.setAttribute('data-tip-align', align);
		element._ttOffset = offset;
		return this;
	}

}
