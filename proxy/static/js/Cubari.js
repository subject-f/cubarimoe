function Cubari(o) {
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
		this.API.requestSeries(SCP.series, true);
		this.Reader.queueSeriesLoad(SCP);
	}


	let mediaMatcher = window.matchMedia("(max-width: 700px)");
	this.IS_MOBILE = mediaMatcher.matches;
	window.addEventListener('resize', () =>{
		this.IS_MOBILE = mediaMatcher.matches;
	});

	this.HAS_LOCALSTORAGE = localStorage !== undefined;
	this.BASE_API_PATH = o.BASE_API_PATH
	this.IS_FIRST_PARTY = o.IS_FIRST_PARTY
	this.IS_INDEXED = o.IS_INDEXED
	this.IMAGE_PROXY_URL = o.IMAGE_PROXY_URL
	this.URL_PREFIX = '/read/imgur/'
	this.MEDIA_PREFIX = '/media/manga/'

	this.API = new ReaderAPI();
	// this.Settings = new SettingsHandler();
	// this.Tooltippy = new UI_Tooltippy();
	this.Loda = new UI_LodaManager({node: document.querySelector('.LodaManager')});
	// this.URLChanger = new URLChanger();
	this.Reader = new UI_Reader({node: document.getElementById('rdr-main')});
	this.Theme = new themeHandler();

	// this.Loda.register(UI_Loda_Settings)
	this.Loda.register(new UI_Loda_Search())
	this.Loda.register(new UI_Loda_Notice())
	this.Loda.register(new UI_Loda_Webtoon())
	// this.Loda.register(new UI_Loda_Jump())

	// this.$.appendChild(this.Reader.$)
	// this.$.appendChild(this.Tooltippy.$)
	// this.$.appendChild(this.Loda.$)
	this.Theme.setTheme('#28292B', '#000000', '#B73636','#EEEEEE')

	this.API.S.link(this.Reader)

	document.addEventListener("DOMContentLoaded", e => this.onload());
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

}

DEBUG = true
alg.createBin();
Cubari = new Cubari({
	BASE_API_PATH: BASE_API_PATH,
	IS_FIRST_PARTY: IS_FIRST_PARTY,
	IS_INDEXED: IS_INDEXED,
	IMAGE_PROXY_URL: IMAGE_PROXY_URL
});