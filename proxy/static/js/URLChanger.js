function URLChanger(o) {
	o=be(o);
	Linkable.call(this);
	this.hostname = location.hostname[0].toUpperCase() + location.hostname.slice(1);
	this.recentState = {};

	this.updateURL = function (SCP) {
		if(Reader.SCP.chapterObject.notice)
			return;
		if(this.recentState.chapter == SCP.chapter && this.recentState.page == SCP.page)
			return;
	var pathSplit = location.pathname.split("/");
		pathSplit = pathSplit.slice(0, pathSplit.indexOf(SCP.series));
	var pathName = pathSplit
			.concat([SCP.series, SCP.chapter.replace('.', '-'), SCP.page + 1, ''])
			.join('/');

		switch(Settings.get('bhv.historyUpdate')) {
			case 'none':
			var	title = `${Reader.current.title} | ${this.hostname}`;
				window.history.replaceState(null, title, pathName);
				document.title = title;
				break;
			case 'replace':
				title = `${SCP.chapter} - ${SCP.chapterName}, Page ${SCP.page + 1} - ${Reader.current.title} | ${this.hostname}`
				setTimeout(() => window.history.replaceState(null, title, pathName), 300);
				// document.title = title;
				break;
			case 'chap':
				title = `${SCP.chapter} - ${SCP.chapterName}, Page ${SCP.page + 1} - ${Reader.current.title} | ${this.hostname}`
				window.history.replaceState(null, title, pathName);
				document.title = title;
				if(SCP.chapter == this.chapter) return;
				window.history.pushState({chapter: SCP.chapter, page: SCP.page}, title, pathName);
				break;
			case 'jump':
				title = `${SCP.chapter} - ${SCP.chapterName}, Page ${SCP.page + 1} - ${Reader.current.title} | ${this.hostname}`
				if(Math.abs(this.page - SCP.page) > 2 || SCP.chapter != this.chapter) {
					window.history.pushState({chapter: SCP.chapter, page: SCP.page}, title, pathName);
				}else{
					window.history.replaceState(null, title, pathName);
				}
				document.title = title;
				break;
			case 'all':
				if(this.page != SCP.page || SCP.chapter != this.chapter) {
					title = `${SCP.chapter} - ${SCP.chapterName}, Page ${SCP.page + 1} - ${Reader.current.title} | ${this.hostname}`
					window.history.pushState({chapter: SCP.chapter, page: SCP.page}, title, pathName);
					document.title = title;
				}
				break;
		}
		if(Reader.getGroup(undefined, true) !== Reader.SCP.group)
			location.hash = '#' + Reader.SCP.group;
		this.page = SCP.page;
		this.chapter = SCP.chapter;
	}

	this.onHistory = (e) => {
		if(!e.state) return;
		this.recentState = e.state;
		if(Reader.SCP.chapter != e.state.chapter)
			Reader.initChapter(e.state.chapter, e.state.page);
		else
			Reader.displayPage(e.state.page);
	}
	window.addEventListener('popstate', this.onHistory);

	this.scrollDefer = (fn) => {
		this.deferFn = fn;
		if(this.deferScrolling) clearTimeout(this.deferScrolling);
		var scroller = () => {
			if(fallbackDefer) clearTimeout(fallbackDefer);
			fallbackDefer = undefined;
			clearTimeout(this.deferScrolling);
			this.deferScrolling = setTimeout(() => {
				window.removeEventListener('scroll', scroller);
				this.deferFn();
			}, 100);
		}
		window.addEventListener('scroll', scroller, false);
		let fallbackDefer = setTimeout(() => {
			this.deferFn();
		}, 20);
	};

	this.S.mapIn({
		SCP: (SCP) => {this.scrollDefer(() => this.updateURL(SCP))}
	})
}