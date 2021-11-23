function ReaderAPI(o) {
	o=be(o);
	Linkable.call(this);
	
	this.url = o.url || '/api/';
	
	this.firstParty = IS_FIRST_PARTY;

	this.seriesUrl = BASE_API_PATH;

	this.mediaURL = o.mediaURL || '/media/manga/';

	this.data = {};
	this.indexData = {};

	this.infuseSeriesData = function(data) {
		for(var num in data.chapters) {
		let chapter = data.chapters[num];
			chapter.images = {};
			chapter.descriptions = {};
			chapter.loaded = {};
			chapter.blurs = {};
			chapter.previews = {};
			chapter.hasWide = {};
			chapter.wides = {};

			chapter.id = num;
			for(let group in chapter.groups) {
				chapter.images[group] = [];
				chapter.descriptions[group] = [];
				chapter.blurs[group] = [];
				chapter.previews[group] = [];
				chapter.wides[group] = [];
				if (this.firstParty) {
					firstPartySeriesHandler(this.mediaURL, chapter, group, data.slug);
				} else {
					thirdPartySeriesHandler(this.seriesUrl, chapter, group);
				}
			}
		}
		
		if(data.next_release_page) {
			data.countdown = true;
			var lastChapter = Object.keys(data.chapters).sort((a,b) => b - a)[0];

			data.chapters[+lastChapter+1] = Object.assign({}, data.chapters[lastChapter]);
			data.chapters[+lastChapter+1].notice = true;
			data.chapters[+lastChapter+1].title = '[Not yet released]';
		}
		return data;
	}

	this.requestSeries = function(slug) {
		this.seriesRequest = fetch(this.seriesUrl + slug + '/')
			.then(response => response.json())
			.then(seriesData => {
				seriesData = this.infuseSeriesData(seriesData);
				seriesData.chaptersIndex =
					Object.keys(
						seriesData.chapters
					).sort((a,b) => parseFloat(a) - parseFloat(b));
				seriesData.volMap = {};
				for (var i = 0; i < seriesData.chaptersIndex.length; i++) {
					if(!seriesData.volMap[seriesData.chapters[seriesData.chaptersIndex[i]].volume])
						seriesData.volMap[seriesData.chapters[seriesData.chaptersIndex[i]].volume] = seriesData.chaptersIndex[i];
				}
				this.data[slug] = seriesData;
				this.S.out('seriesData', this.data[slug]);
				this.S.out('isFirstParty', this.firstParty);
			})
		return this.seriesRequest;
	}

	this.requestIndex = function(o){
		var formData = new FormData();
		formData.append("searchQuery", o.query)
		//formData.append("csrfmiddlewaretoken", CSRF_TOKEN)
		return fetch('/api/search_index/'+ o.slug + '/', {
				method: 'POST',
				body: formData
			})
			.then(response => response.json())
			.then(searchData => {
				this.S.out('indexUpdated', searchData);
				return {result:searchData, query: o.query};
			})
	}

	this.S.mapIn({
		'loadSeries': this.requestSeries,
		'loadIndex': this.requestIndex
	})
}


// NH API response returns an array, whereas others returns a chapter ID
function thirdPartySeriesHandler(url, chapter, group) {
	if (Array.isArray(chapter.groups[group])) {
		// TODO page handling is pretty ugly here. I'd recommend a refactor someday.
		for (let i = 0; i < chapter.groups[group].length; i++) {
			let image = chapter.groups[group][i];
			if (typeof image === 'string' || image instanceof String) {
				chapter.images[group].push(image);
				if (image.includes(WIDE_FLAG)) {
					chapter.wides[group].push(i);
				}
			} else {
				chapter.descriptions[group].push(image.description);
				chapter.images[group].push(image.src);
				if (image.src.includes(WIDE_FLAG)) {
					chapter.wides[group].push(i);
				}
			}
		}
		chapter.loaded[group] = true;
	} else {
		if (!chapter.pageRequest) chapter.pageRequest = {};
		chapter.loaded[group] = false;
		chapter.pageRequest[group] = async () => {
			let images = chapter.images[group];
			let wides = chapter.wides[group];
			let descriptions = chapter.descriptions[group];
			try {
				// Each group/chapter pair has a unique ID, returned by API
				let pages = await fetch(`${chapter.groups[group]}`)
								.then(r => r.json());
				pages.forEach((p, i) => {
					if (typeof p === 'string' || p instanceof String) {
						images.push(p);
						if (p.includes(WIDE_FLAG)) {
							wides.push(i);
						}
					} else {
						descriptions.push(p.description);
						images.push(p.src);
						if (p.src.includes(WIDE_FLAG)) {
							wides.push(i);
						}

					}
				});
				return pages.length;
			} catch (e) {
				console.log(e);
				return 0;
			}
		}
	}
}
